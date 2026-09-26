-- 낚시 일지 초기 스키마
-- 모든 테이블은 RLS로 보호한다. 앱에서 권한을 검사하더라도 최종 판단은 DB가 한다.

-- ─────────────────────────────────────────────
-- 프로필 (auth.users 1:1)
-- ─────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 1 and 20),
  emoji       text not null default '🎣',
  created_at  timestamptz not null default now()
);

-- 회원가입 시 프로필 자동 생성 (닉네임은 signUp의 options.data.nickname)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''), '낚시꾼'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- 낚시 일지 + 조과
-- ─────────────────────────────────────────────
create table public.fishing_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  fished_on   date not null default current_date,
  location    text not null default '',
  weather     text not null default '',
  duration    text not null default '',
  memo        text not null default '',
  rating      text not null default '보통' check (rating in ('대박', '보통', '꽝')),
  image_path  text,
  created_at  timestamptz not null default now()
);
create index fishing_logs_user_idx on public.fishing_logs (user_id, fished_on desc);

create table public.catches (
  id          bigint generated always as identity primary key,
  log_id      bigint not null references public.fishing_logs (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  species     text not null check (char_length(species) between 1 and 40),
  size_cm     numeric(5, 1) check (size_cm > 0),
  count       integer not null default 1 check (count > 0),
  image_path  text
);
create index catches_log_idx on public.catches (log_id);
create index catches_user_species_idx on public.catches (user_id, species);

-- 도감 메모 (도감 자체는 catches에서 계산하고, 사용자가 쓴 메모만 따로 저장)
create table public.dogam_notes (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  species     text not null,
  memo        text not null default '',
  primary key (user_id, species)
);

-- 내 도감: 어종별 최대 크기·총 마릿수·최근 날짜
create view public.my_dogam
with (security_invoker = true)
as
select
  c.species,
  max(c.size_cm)                                         as best_size_cm,
  sum(c.count)::integer                                  as total_count,
  max(l.fished_on)                                       as last_caught_on,
  (array_agg(l.location order by c.size_cm desc nulls last, l.fished_on desc))[1]   as best_location,
  (array_agg(coalesce(c.image_path, l.image_path) order by c.size_cm desc nulls last, l.fished_on desc)
     filter (where coalesce(c.image_path, l.image_path) is not null))[1]           as image_path,
  coalesce(max(n.memo), '')                              as memo
from public.catches c
join public.fishing_logs l on l.id = c.log_id
left join public.dogam_notes n on n.user_id = c.user_id and n.species = c.species
where c.user_id = auth.uid()
group by c.species;

-- 일지 + 조과를 한 트랜잭션으로 저장 (p_log_id가 있으면 수정)
create function public.save_fishing_log(
  p_log      jsonb,
  p_catches  jsonb,
  p_log_id   bigint default null
)
returns bigint
language plpgsql
security invoker set search_path = ''
as $$
declare
  v_id bigint;
begin
  if p_log_id is null then
    insert into public.fishing_logs (fished_on, location, weather, duration, memo, rating, image_path)
    values (
      coalesce((p_log ->> 'fished_on')::date, current_date),
      coalesce(p_log ->> 'location', ''),
      coalesce(p_log ->> 'weather', ''),
      coalesce(p_log ->> 'duration', ''),
      coalesce(p_log ->> 'memo', ''),
      coalesce(p_log ->> 'rating', '보통'),
      p_log ->> 'image_path'
    )
    returning id into v_id;
  else
    update public.fishing_logs set
      fished_on  = coalesce((p_log ->> 'fished_on')::date, fished_on),
      location   = coalesce(p_log ->> 'location', location),
      weather    = coalesce(p_log ->> 'weather', weather),
      duration   = coalesce(p_log ->> 'duration', duration),
      memo       = coalesce(p_log ->> 'memo', memo),
      rating     = coalesce(p_log ->> 'rating', rating),
      image_path = case when p_log ? 'image_path' then p_log ->> 'image_path' else image_path end
    where id = p_log_id
    returning id into v_id;

    if v_id is null then
      raise exception 'log % not found', p_log_id using errcode = 'P0002';
    end if;

    delete from public.catches where log_id = v_id;
  end if;

  insert into public.catches (log_id, species, size_cm, count, image_path)
  select v_id,
         trim(c ->> 'species'),
         nullif(c ->> 'size_cm', '')::numeric,
         coalesce(nullif(c ->> 'count', '')::integer, 1),
         c ->> 'image_path'
  from jsonb_array_elements(coalesce(p_catches, '[]'::jsonb)) as c
  where coalesce(trim(c ->> 'species'), '') <> '';

  return v_id;
end;
$$;

-- ─────────────────────────────────────────────
-- 낚시 포인트
-- ─────────────────────────────────────────────
create table public.fishing_points (
  id          bigint generated always as identity primary key,
  user_id     uuid default auth.uid() references public.profiles (id) on delete cascade, -- null = 기본 포인트
  name        text not null check (char_length(name) between 1 and 50),
  address     text not null default '',
  type        text not null default '방파제',
  species     text[] not null default '{}',
  memo        text not null default '',
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  hot         boolean not null default false,
  rating      numeric(2, 1) not null default 0,
  created_at  timestamptz not null default now()
);

create table public.point_favorites (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  point_id    bigint not null references public.fishing_points (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, point_id)
);

insert into public.fishing_points (user_id, name, address, type, species, lat, lng, hot, rating) values
  (null, '영종도 씨사이드 방파제', '인천 중구',   '방파제', '{광어,우럭}',   37.495, 126.51,  true,  4.5),
  (null, '강화도 외포리 선착장',   '인천 강화군', '방파제', '{숭어,망둑어}', 37.703, 126.437, false, 4.2),
  (null, '대부도 방아머리 갯바위', '경기 안산시', '갯바위', '{감성돔,볼락}', 37.27,  126.585, false, 4.0);

-- ─────────────────────────────────────────────
-- 커뮤니티
-- ─────────────────────────────────────────────
create table public.posts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category    text not null check (category in ('조황 정보', '인증샷', '낚시 팁', '동출 모집')),
  content     text not null check (char_length(content) between 1 and 2000),
  image_path  text,
  created_at  timestamptz not null default now()
);
create index posts_created_idx on public.posts (created_at desc);

create table public.post_likes (
  post_id     bigint not null references public.posts (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  primary key (post_id, user_id)
);

create table public.comments (
  id          bigint generated always as identity primary key,
  post_id     bigint not null references public.posts (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);

-- 피드: 작성자·좋아요 수·내 좋아요 여부·댓글 수를 한 번에
create view public.post_feed
with (security_invoker = true)
as
select
  p.*,
  pr.nickname                                                       as author_nickname,
  pr.emoji                                                          as author_emoji,
  (select count(*) from public.post_likes pl where pl.post_id = p.id)::integer as like_count,
  exists (select 1 from public.post_likes pl where pl.post_id = p.id and pl.user_id = auth.uid()) as liked_by_me,
  (select count(*) from public.comments c where c.post_id = p.id)::integer    as comment_count
from public.posts p
join public.profiles pr on pr.id = p.user_id;

create view public.comment_feed
with (security_invoker = true)
as
select c.*, pr.nickname as author_nickname, pr.emoji as author_emoji
from public.comments c
join public.profiles pr on pr.id = c.user_id;

-- ─────────────────────────────────────────────
-- 계정 삭제 (Google Play 정책: 앱 내 계정 삭제 제공)
-- profiles 이하 모든 데이터는 on delete cascade로 함께 삭제된다.
-- ─────────────────────────────────────────────
create function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  delete from storage.objects where bucket_id = 'photos' and owner_id = auth.uid()::text;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.fishing_logs    enable row level security;
alter table public.catches         enable row level security;
alter table public.dogam_notes     enable row level security;
alter table public.fishing_points  enable row level security;
alter table public.point_favorites enable row level security;
alter table public.posts           enable row level security;
alter table public.post_likes      enable row level security;
alter table public.comments        enable row level security;

-- 프로필: 로그인 사용자는 모두 조회(작성자 표시용), 수정은 본인만
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- 일지·조과·도감 메모: 본인 것만
create policy "logs_own" on public.fishing_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "catches_own" on public.catches for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.fishing_logs l where l.id = log_id and l.user_id = auth.uid())
  );
create policy "dogam_notes_own" on public.dogam_notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 포인트: 모두 조회, 추가·수정·삭제는 본인 것만 (기본 포인트는 user_id가 null이라 누구도 못 건드림)
create policy "points_select" on public.fishing_points for select to authenticated using (true);
create policy "points_insert_own" on public.fishing_points for insert to authenticated
  with check (user_id = auth.uid());
create policy "points_update_own" on public.fishing_points for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "points_delete_own" on public.fishing_points for delete to authenticated
  using (user_id = auth.uid());

create policy "favorites_own" on public.point_favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 커뮤니티: 모두 조회, 작성·삭제는 본인 것만
create policy "posts_select" on public.posts for select to authenticated using (true);
create policy "posts_insert_own" on public.posts for insert to authenticated with check (user_id = auth.uid());
create policy "posts_update_own" on public.posts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "posts_delete_own" on public.posts for delete to authenticated using (user_id = auth.uid());

create policy "likes_select" on public.post_likes for select to authenticated using (true);
create policy "likes_insert_own" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy "likes_delete_own" on public.post_likes for delete to authenticated using (user_id = auth.uid());

create policy "comments_select" on public.comments for select to authenticated using (true);
create policy "comments_insert_own" on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "comments_delete_own" on public.comments for delete to authenticated using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- Storage: photos 버킷 (공개 읽기, 본인 폴더 {uid}/... 에만 쓰기)
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "photos_insert_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and owner_id = auth.uid()::text);
create policy "photos_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and owner_id = auth.uid()::text);
