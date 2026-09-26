// 어종 분석 Edge Function
// - Groq API 키는 서버 secret(GROQ_API_KEY)에만 있고 앱에는 없다.
// - 로그인한 사용자만 호출 가능하고, 사용자별 하루 횟수를 제한한다.
// - 결과는 JSON으로 받아 검증한 뒤 돌려준다.
import { createClient } from 'npm:@supabase/supabase-js@2';

const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const DAILY_LIMIT = Number(Deno.env.get('AI_DAILY_LIMIT') ?? '10');
const MAX_BASE64_LENGTH = 2_000_000; // 앱에서 1024px로 줄여 보내므로 넉넉한 상한

const PROMPT = `이 사진에 있는 물고기나 해양 생물을 분석해주세요.

특히 아래 어종들은 외형이 비슷하니 꼼꼼히 구분해주세요:
- 문어(다리가 굵고 빨판이 2줄) vs 낙지(다리가 가늘고 김) vs 주꾸미(몸이 작고 둥글며 눈 주변에 금색 테두리)
- 방어(몸이 길고 황금색 줄무늬) vs 부시리(방어보다 날씬하고 주둥이가 뾰족) vs 가다랑어(배에 줄무늬) vs 고등어(등에 물결무늬)

반드시 아래 JSON 형식으로만 답하세요. 모든 값은 한국어로 씁니다.
{
  "recognized": true,
  "species": "한국어 어종명 (예: 광어)",
  "confidence": "high | medium | low 중 하나",
  "averageSize": "일반적인 크기",
  "habitat": "주로 사는 곳",
  "fishingMethod": "효과적인 낚시 방법",
  "bait": "잘 먹히는 미끼",
  "season": "잘 잡히는 계절",
  "taste": "맛 특징과 요리법",
  "features": "외형적 특징이나 주의사항"
}

물고기·해양 생물이 아니거나 판단할 수 없으면 {"recognized": false} 만 답하세요.`;

type Identification =
  | { recognized: false }
  | {
      recognized: true;
      species: string;
      confidence: 'high' | 'medium' | 'low';
      averageSize: string;
      habitat: string;
      fishingMethod: string;
      bait: string;
      season: string;
      taste: string;
      features: string;
    };

const TEXT_FIELDS = ['averageSize', 'habitat', 'fishingMethod', 'bait', 'season', 'taste', 'features'] as const;

/** 모델 출력은 믿지 않고 형식을 검증한다. 필수값이 없으면 null. */
function parseIdentification(raw: string): Identification | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;

  if (d.recognized === false) return { recognized: false };
  if (typeof d.species !== 'string' || !d.species.trim()) return null;

  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const confidence = d.confidence === 'high' || d.confidence === 'low' ? d.confidence : 'medium';
  const result = { recognized: true as const, species: d.species.trim().slice(0, 40), confidence } as Extract<Identification, { recognized: true }>;
  for (const key of TEXT_FIELDS) result[key] = text(d[key]);
  return result;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ErrorCode = 'UNAUTHORIZED' | 'BAD_REQUEST' | 'DAILY_LIMIT' | 'AI_BUSY' | 'AI_FAILED' | 'SERVER_ERROR';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fail(status: number, code: ErrorCode, error: string) {
  return json({ code, error }, status);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail(405, 'BAD_REQUEST', 'Method not allowed');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return fail(401, 'UNAUTHORIZED', '로그인이 필요해요.');

  let imageBase64: unknown;
  try {
    ({ imageBase64 } = await req.json());
  } catch {
    return fail(400, 'BAD_REQUEST', '잘못된 요청이에요.');
  }
  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
    return fail(400, 'BAD_REQUEST', '이미지가 없어요.');
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return fail(413, 'BAD_REQUEST', '이미지가 너무 커요.');
  }

  const groqKey = Deno.env.get('GROQ_API_KEY');
  if (!groqKey) return fail(500, 'SERVER_ERROR', '서버 설정 오류예요.');

  // 사용량 기록은 service_role로만 가능하다 (사용자가 직접 조작 불가)
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: usageId, error: quotaError } = await admin.rpc('consume_ai_quota', {
    p_user_id: user.id,
    p_daily_limit: DAILY_LIMIT,
  });
  if (quotaError) {
    console.error('quota error', quotaError);
    return fail(500, 'SERVER_ERROR', '잠시 후 다시 시도해주세요.');
  }
  if (usageId === null) {
    return fail(429, 'DAILY_LIMIT', `오늘 분석 횟수(${DAILY_LIMIT}회)를 모두 사용했어요. 내일 다시 시도해주세요.`);
  }

  const refund = () => admin.rpc('refund_ai_quota', { p_usage_id: usageId });

  let res: Response;
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 1000,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        }],
      }),
    });
  } catch (e) {
    console.error('Groq network error', e);
    await refund();
    return fail(503, 'AI_BUSY', 'AI 서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.');
  }

  if (!res.ok) {
    console.error('Groq error', res.status, await res.text());
    await refund();
    // Groq 무료 한도 초과(429)는 앱 전체가 잠시 막힌 것이라 사용자 한도와 구분한다
    return res.status === 429
      ? fail(503, 'AI_BUSY', '지금 분석 요청이 많아요. 잠시 후 다시 시도해주세요.')
      : fail(502, 'AI_FAILED', 'AI 분석에 실패했어요. 잠시 후 다시 시도해주세요.');
  }

  const data = await res.json();
  const identification = parseIdentification(data?.choices?.[0]?.message?.content ?? '');
  if (!identification) {
    await refund();
    return fail(502, 'AI_FAILED', '분석 결과를 이해하지 못했어요. 다른 사진으로 시도해주세요.');
  }

  const { data: used } = await admin.rpc('ai_usage_today', { p_user_id: user.id });
  return json({
    identification,
    remainingToday: Math.max(0, DAILY_LIMIT - (used ?? DAILY_LIMIT)),
  });
});
