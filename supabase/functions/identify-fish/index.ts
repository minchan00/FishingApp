// 어종 분석 Edge Function
// Groq API 키는 서버 secret(GROQ_API_KEY)에만 있고 앱에는 없다.
// 로그인한 사용자만 호출 가능 (Supabase가 JWT를 검증한 뒤 이 함수가 실행된다).
import { createClient } from 'npm:@supabase/supabase-js@2';

const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const MAX_BASE64_LENGTH = 7_000_000; // 약 5MB 이미지

const PROMPT = `이 사진에 있는 물고기나 해양 생물을 정확하게 분석해주세요.

특히 아래 어종들은 외형이 비슷하니 꼼꼼히 구분해주세요:
- 문어(다리가 굵고 빨판이 2줄) vs 낙지(다리가 가늘고 김) vs 주꾸미(몸이 작고 둥글며 눈 주변에 금색 테두리)
- 방어(몸이 길고 황금색 줄무늬) vs 부시리(방어보다 날씬하고 주둥이가 뾰족) vs 가다랑어(배에 줄무늬) vs 고등어(등에 물결무늬)

다음 형식으로 답변해주세요:

🐟 어종명: (한국어 이름)
📏 평균 크기: (일반적인 크기)
🌊 서식지: (주로 사는 곳)
🎣 낚시 방법: (효과적인 낚시 방법)
🪱 추천 미끼: (잘 먹히는 미끼)
⏰ 제철: (잘 잡히는 계절)
🍽️ 맛과 요리: (맛 특징과 요리법)
📌 특징: (외형적 특징이나 주의사항)

만약 물고기가 아니거나 잘 모르겠다면 "어종을 인식할 수 없어요"라고 답해주세요.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: '로그인이 필요해요.' }, 401);

  let imageBase64: unknown;
  try {
    ({ imageBase64 } = await req.json());
  } catch {
    return json({ error: '잘못된 요청이에요.' }, 400);
  }
  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
    return json({ error: '이미지가 없어요.' }, 400);
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return json({ error: '이미지가 너무 커요.' }, 413);
  }

  const groqKey = Deno.env.get('GROQ_API_KEY');
  if (!groqKey) return json({ error: '서버 설정 오류예요.' }, 500);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      }],
    }),
  });

  if (!res.ok) {
    console.error('Groq error', res.status, await res.text());
    return json({ error: 'AI 분석에 실패했어요. 잠시 후 다시 시도해주세요.' }, 502);
  }

  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) return json({ error: '분석 결과를 가져올 수 없어요.' }, 502);

  return json({ result: text });
});
