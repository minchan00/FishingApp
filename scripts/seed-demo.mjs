// 디자인 확인용 데모 계정 + 샘플 데이터를 만든다.
// 실행: node --env-file=.env scripts/seed-demo.mjs
// 계정 정보는 .env.demo.local(git 제외)에 저장한다. 다시 실행하면 같은 계정에 로그인해 데이터만 보충한다.
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const FILE = '.env.demo.local';
const sb = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

let email;
let password;
if (existsSync(FILE)) {
  const kv = Object.fromEntries(readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map((l) => l.split('=')));
  ({ DEMO_EMAIL: email, DEMO_PASSWORD: password } = kv);
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error('기존 데모 계정 로그인 실패: ' + error.message);
} else {
  email = `demo-${Date.now().toString(36)}@example.com`;
  password = randomBytes(9).toString('base64url');
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { nickname: '바다낚시꾼' } } });
  if (error || !data.session) throw new Error('가입 실패: ' + (error?.message ?? '세션 없음 (이메일 인증이 켜져 있나요?)'));
  writeFileSync(FILE, `DEMO_EMAIL=${email}\nDEMO_PASSWORD=${password}\n`);
}

const { count } = await sb.from('fishing_logs').select('id', { count: 'exact', head: true });
if (!count) {
  const logs = [
    { log: { fished_on: '2026-09-26', location: '영종도 씨사이드 방파제', weather: '맑음 ☀️', duration: '4', memo: '들물 때 입질이 좋았다. 웜 채비.', rating: '대박' },
      catches: [{ species: '광어', size_cm: 52, count: 1 }, { species: '우럭', size_cm: 28, count: 3 }] },
    { log: { fished_on: '2026-09-20', location: '강화도 외포리 선착장', weather: '흐림 ☁️', duration: '3', memo: '바람이 강해서 일찍 철수', rating: '보통' },
      catches: [{ species: '망둑어', size_cm: 18, count: 2 }] },
    { log: { fished_on: '2026-09-14', location: '대부도 방아머리', weather: '비 🌧️', duration: '2', memo: '', rating: '꽝' }, catches: [] },
  ];
  for (const l of logs) {
    const { error } = await sb.rpc('save_fishing_log', { p_log: l.log, p_catches: l.catches });
    if (error) throw error;
  }
  await sb.from('dogam_notes').upsert({ species: '광어', memo: '첫 50cm 넘는 광어!' }, { onConflict: 'user_id,species' });
  const posts = [
    { category: '조황 정보', content: '영종도 방파제 오늘 광어 잘 나옵니다\n들물 2시간 전부터 입질 시작' },
    { category: '낚시 팁', content: '우럭은 바닥을 살짝 띄워서 천천히 끌어주세요' },
    { category: '동출 모집', content: '토요일 새벽 대부도 같이 가실 분 구해요' },
  ];
  for (const p of posts) await sb.from('posts').insert(p);
  await sb.from('fishing_points').insert({ name: '시화방조제 1번 게이트', address: '경기 시흥시', type: '방파제', species: ['우럭', '노래미'], lat: 37.316, lng: 126.61, memo: '주차 편함' });
}

console.log(`데모 계정 준비 완료. 로그인 정보는 ${FILE} 에 있습니다.`);
