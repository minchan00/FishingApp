-- AI 어종 분석 사용량 제한
-- 무료 AI 한도를 한 사용자가 다 쓰지 못하도록 사용자별 하루 횟수를 제한한다.
-- 기록·차감은 Edge Function이 service_role로만 한다. 사용자가 직접 기록을 지우거나 조작할 수 없다.

create table public.ai_usage (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

-- 본인 사용 기록 조회만 허용 (insert/delete 정책 없음 = 불가)
create policy "ai_usage_select_own" on public.ai_usage for select to authenticated
  using (user_id = auth.uid());

-- 오늘(한국 시간 기준) 사용 횟수
create function public.ai_usage_today(p_user_id uuid)
returns integer
language sql
stable
security definer set search_path = ''
as $$
  select count(*)::integer
  from public.ai_usage
  where user_id = p_user_id
    and created_at >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul');
$$;

-- 한도 안이면 1회 차감하고 사용 기록 id를 돌려준다. 한도를 넘었으면 null.
-- 같은 사용자의 동시 요청이 한도를 넘지 않도록 사용자별 잠금을 건다.
create function public.consume_ai_quota(p_user_id uuid, p_daily_limit integer)
returns bigint
language plpgsql
security definer set search_path = ''
as $$
declare
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  if public.ai_usage_today(p_user_id) >= p_daily_limit then
    return null;
  end if;

  insert into public.ai_usage (user_id) values (p_user_id) returning id into v_id;
  return v_id;
end;
$$;

-- AI 호출이 실패하면 차감을 되돌린다
create function public.refund_ai_quota(p_usage_id bigint)
returns void
language sql
security definer set search_path = ''
as $$
  delete from public.ai_usage where id = p_usage_id;
$$;

-- 사용자가 직접 호출하지 못하게 막고 service_role(Edge Function)만 허용
revoke execute on function public.ai_usage_today(uuid) from public, anon, authenticated;
revoke execute on function public.consume_ai_quota(uuid, integer) from public, anon, authenticated;
revoke execute on function public.refund_ai_quota(bigint) from public, anon, authenticated;
grant execute on function public.ai_usage_today(uuid) to service_role;
grant execute on function public.consume_ai_quota(uuid, integer) to service_role;
grant execute on function public.refund_ai_quota(bigint) to service_role;
