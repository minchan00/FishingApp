// 연결된 Supabase 프로젝트에 대한 API 수준 E2E: 가입 → 일지 → 도감 → 커뮤니티 → 포인트 → AI → 탈퇴
// 실행: npm run test:live  (.env 필요, Supabase에서 이메일 인증이 꺼져 있어야 함)
// 테스트 계정은 마지막에 delete-account 함수로 지운다.
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const mk = () => createClient(url, key, { auth: { persistSession: false } });
const stamp = Date.now();
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? '✔' : '✘'} ${name}${extra ? ' — ' + extra : ''}`);

const a = mk();
const b = mk();
try {
  const su = await a.auth.signUp({ email: `e2e-a-${stamp}@example.com`, password: 'e2e-pass-1234', options: { data: { nickname: 'E2E낚시꾼' } } });
  ok('가입 즉시 로그인(이메일 인증 꺼짐)', !!su.data.session, su.error?.message);
  const sb = await b.auth.signUp({ email: `e2e-b-${stamp}@example.com`, password: 'e2e-pass-1234', options: { data: { name: '카카오식이름' } } });
  ok('두 번째 계정 가입', !!sb.data.session, sb.error?.message);
  const aId = su.data.user.id;

  const prof = await a.from('profiles').select('nickname').eq('id', aId).single();
  ok('프로필 자동 생성', prof.data?.nickname === 'E2E낚시꾼', JSON.stringify(prof.data ?? prof.error));
  const profB = await b.from('profiles').select('nickname').eq('id', sb.data.user.id).single();
  ok('카카오식 name → 닉네임', profB.data?.nickname === '카카오식이름', JSON.stringify(profB.data ?? profB.error));

  const log = await a.rpc('save_fishing_log', {
    p_log: { fished_on: '2026-09-26', location: '영종도', weather: '맑음 ☀️', duration: '3', memo: 'e2e', rating: '보통', image_path: null },
    p_catches: [{ species: '광어', size_cm: 45.5, count: 2 }, { species: '우럭', size_cm: null, count: 1 }],
  });
  ok('일지 + 조과 저장', typeof log.data === 'number', log.error?.message);

  const logs = await a.from('fishing_logs').select('*, catches(species, size_cm, count)');
  ok('일지 조회 (조과 포함)', logs.data?.[0]?.catches?.length === 2, logs.error?.message);
  const dogam = await a.from('my_dogam').select('*');
  ok('도감 자동 계산', dogam.data?.length === 2 && dogam.data.find((d) => d.species === '광어')?.total_count === 2, JSON.stringify(dogam.data?.map((d) => [d.species, d.total_count])));
  const memo = await a.from('dogam_notes').upsert({ species: '광어', memo: '첫 광어' }, { onConflict: 'user_id,species' });
  ok('도감 메모 저장', !memo.error, memo.error?.message);
  const logsB = await b.from('fishing_logs').select('id');
  ok('남의 일지는 안 보임', logsB.data?.length === 0);

  const post = await a.from('posts').insert({ category: '인증샷', content: 'E2E 테스트 글' }).select('id').single();
  ok('게시글 작성', !!post.data, post.error?.message);
  const like = await b.from('post_likes').insert({ post_id: post.data.id });
  const cmt = await b.from('comments').insert({ post_id: post.data.id, content: '축하해요' });
  ok('다른 사용자 좋아요·댓글', !like.error && !cmt.error, like.error?.message ?? cmt.error?.message);
  const feed = await b.from('post_feed').select('*').eq('id', post.data.id).single();
  ok('피드 집계', feed.data?.like_count === 1 && feed.data?.liked_by_me === true && feed.data?.comment_count === 1 && feed.data?.author_nickname === 'E2E낚시꾼', JSON.stringify(feed.data && { l: feed.data.like_count, m: feed.data.liked_by_me, c: feed.data.comment_count }));
  const delOther = await b.from('posts').delete().eq('id', post.data.id).select('id');
  ok('남의 글 삭제 차단', delOther.data?.length === 0);

  const pts = await a.from('fishing_points').select('*');
  ok('기본 포인트 3곳', pts.data?.filter((p) => p.user_id === null).length === 3);
  const np = await a.from('fishing_points').insert({ name: 'E2E 포인트', lat: 37.5, lng: 126.5, species: ['광어'] }).select('id').single();
  ok('포인트 추가', !!np.data, np.error?.message);
  const fav = await a.from('point_favorites').upsert({ point_id: np.data.id }, { onConflict: 'user_id,point_id', ignoreDuplicates: true });
  ok('즐겨찾기', !fav.error, fav.error?.message);

  const ai = await a.functions.invoke('identify-fish', { body: { imageBase64: 'aGVsbG8=' } });
  const aiBody = ai.error ? await ai.error.context?.json?.().catch(() => null) : ai.data;
  ok('AI 함수 응답 (Groq 키가 없으면 SERVER_ERROR)', !!aiBody, `${ai.error?.context?.status ?? 200} ${JSON.stringify(aiBody)}`);

  const upd = await a.auth.updateUser({ password: 'e2e-pass-5678' });
  ok('비밀번호 변경', !upd.error, upd.error?.message);
} catch (e) {
  results.push('✘ 예외: ' + e.message);
} finally {
  const da = await a.functions.invoke('delete-account', { method: 'POST' });
  const db = await b.functions.invoke('delete-account', { method: 'POST' });
  ok('회원 탈퇴 (테스트 계정 정리)', !da.error && !db.error, da.error?.message ?? db.error?.message);
  const again = await a.auth.signInWithPassword({ email: `e2e-a-${stamp}@example.com`, password: 'e2e-pass-5678' });
  ok('탈퇴 후 로그인 불가', !!again.error);
  console.log(results.join('\n'));
}
