// 회원 탈퇴 Edge Function (Google Play 정책: 앱 내 계정 삭제)
// Supabase는 SQL에서 storage 파일을 직접 지우는 것을 막으므로, 서버 권한으로
// 1) Storage API로 본인 사진 폴더를 비우고 2) 계정을 삭제한다.
// profiles 이하 모든 데이터는 on delete cascade로 함께 지워진다.
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'photos';
const PAGE = 1000;

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: '로그인이 필요해요.' }, 401);

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 사진은 photos/{uid}/ 아래에만 올라간다 (Storage 정책)
  for (;;) {
    const { data: files, error } = await admin.storage.from(BUCKET).list(user.id, { limit: PAGE });
    if (error) {
      console.error('list photos failed', error);
      return json({ error: '사진을 지우지 못했어요. 잠시 후 다시 시도해주세요.' }, 500);
    }
    if (!files || files.length === 0) break;
    const { error: removeError } = await admin.storage.from(BUCKET).remove(files.map((f) => `${user.id}/${f.name}`));
    if (removeError) {
      console.error('remove photos failed', removeError);
      return json({ error: '사진을 지우지 못했어요. 잠시 후 다시 시도해주세요.' }, 500);
    }
    if (files.length < PAGE) break;
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('delete user failed', deleteError);
    return json({ error: '계정을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.' }, 500);
  }

  return json({ deleted: true });
});
