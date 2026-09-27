-- ─────────────────────────────────────────────
-- 방류 알림: 하굿둑·방조제 배수갑문의 물 방류
-- 방류 중에는 물색·염분·물살이 바뀌고 수문 주변이 위험해져 워킹 낚시인에게 필요하다.
-- 기관마다 공개 수준이 달라 status/source로 구분한다.
--   status  active: 지금 방류 중 (실측)   window: 방류 승인 기간 (조위에 따라 여닫음)
--           notice: 방류 예정 공지        ended: 끝남
--   source  official: 기관 API·자료       notice: 기관 공지 게시판      report: 사용자·관리자 입력
-- 쓰기는 service_role(동기화 함수, 관리자)만 한다.
-- ─────────────────────────────────────────────
create table public.release_facilities (
  id          text primary key,
  name        text not null,
  kind        text not null check (kind in ('하굿둑', '방조제')),
  region      text not null,
  operator    text not null,
  lat         double precision,
  lng         double precision,
  sort_order  int not null default 0
);

create table public.release_events (
  id            bigint generated always as identity primary key,
  facility_id   text not null references public.release_facilities (id) on delete cascade,
  status        text not null check (status in ('active', 'window', 'notice', 'ended')),
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  -- 방류량 또는 승인 최대 방류량 (㎥/s = 톤/초). 공지에는 없을 수 있다
  flow_cms      numeric check (flow_cms is null or flow_cms >= 0),
  source        text not null check (source in ('official', 'notice', 'report')),
  source_url    text,
  note          text check (note is null or char_length(note) <= 300),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index release_events_facility_idx on public.release_events (facility_id, starts_at desc);
create index release_events_time_idx on public.release_events (starts_at desc);

-- 관심 시설 (알림 받을 시설)
create table public.release_subscriptions (
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  facility_id  text not null references public.release_facilities (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, facility_id)
);

alter table public.release_facilities enable row level security;
alter table public.release_events enable row level security;
alter table public.release_subscriptions enable row level security;

create policy "release_facilities: 로그인 사용자 읽기" on public.release_facilities
  for select to authenticated using (true);
create policy "release_events: 로그인 사용자 읽기" on public.release_events
  for select to authenticated using (true);

create policy "release_subscriptions: 본인 것만 읽기" on public.release_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "release_subscriptions: 본인 것만 추가" on public.release_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
create policy "release_subscriptions: 본인 것만 삭제" on public.release_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- 시설·일정은 앱에서 바꾸지 못하게 쓰기 권한 자체를 뺀다
revoke insert, update, delete on public.release_facilities, public.release_events from authenticated, anon;

-- 좌표는 거리 계산용 대략 위치 (시설 중심 부근)
insert into public.release_facilities (id, name, kind, region, operator, lat, lng, sort_order) values
  ('yeongsan', '영산강 하굿둑',   '하굿둑', '전남 목포·영암',     '한국농어촌공사', 34.7766, 126.4450, 10),
  ('geum',     '금강 하굿둑',     '하굿둑', '전북 군산·충남 서천', '한국농어촌공사', 36.0233, 126.7461, 20),
  ('nakdong',  '낙동강 하굿둑',   '하굿둑', '부산 사하',          '한국수자원공사', 35.1106, 128.9458, 30),
  ('saemangeum', '새만금 배수갑문(신시·가력)', '방조제', '전북 군산·부안', '한국농어촌공사', 35.8190, 126.5160, 40),
  ('asan',     '아산호 방조제',   '방조제', '경기 평택·충남 아산', '한국농어촌공사', 36.9063, 126.9496, 50),
  ('sapgyo',   '삽교호 방조제',   '방조제', '충남 당진·아산',     '한국농어촌공사', 36.8980, 126.8290, 60),
  ('seokmun',  '석문호 방조제',   '방조제', '충남 당진',          '한국농어촌공사', 37.0040, 126.5720, 70),
  ('namyang',  '남양호 방조제',   '방조제', '경기 화성',          '한국농어촌공사', 37.0610, 126.8330, 80),
  ('ganwol',   '간월호 방조제(서산A)', '방조제', '충남 서산',     '한국농어촌공사', 36.6180, 126.4150, 90),
  ('daeho',    '대호 방조제',     '방조제', '충남 당진·서산',     '한국농어촌공사', 37.0360, 126.4600, 100);

-- 커뮤니티에 '방류 소식' 분류 추가
alter table public.posts drop constraint posts_category_check;
alter table public.posts add constraint posts_category_check
  check (category in ('조황 정보', '인증샷', '낚시 팁', '동출 모집', '방류 소식'));
