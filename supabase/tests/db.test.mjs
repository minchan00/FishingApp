// DB 스키마·RLS 검증. 실제 Postgres(PGlite)에 마이그레이션을 적용하고 사용자별 권한을 확인한다.
// 실행: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { before, describe, it } from 'node:test';

const MIGRATIONS = join(import.meta.dirname, '..', 'migrations');
const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';

// Supabase가 기본 제공하는 auth/storage 스키마의 최소 흉내
const SUPABASE_STUB = `
create role anon; create role authenticated; create role service_role;
create schema auth; create schema storage;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public bool, file_size_limit int, allowed_mime_types text[]);
create table storage.objects (id serial, bucket_id text, name text, owner_id text);
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
alter table storage.objects enable row level security;`;

// Supabase가 역할에 기본으로 주는 권한. 함수 실행 권한은 마이그레이션의 grant/revoke를 그대로 따른다.
const SUPABASE_GRANTS = `
grant usage on schema public, auth, storage to authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;`;

let db;

async function as(role, sql, uid = A) {
  await db.exec(`set role ${role}; set request.jwt.sub='${uid}'`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec('reset role');
  }
}

async function one(role, sql, uid) {
  return (await as(role, sql, uid)).rows[0];
}

/** 에러가 나거나 영향받은 행이 없으면 "막혔다"로 본다 (RLS는 조용히 0행을 돌려준다) */
async function blocked(role, sql, uid) {
  try {
    return (await as(role, sql, uid)).rows.length === 0;
  } catch {
    return true;
  }
}

async function count(sql) {
  return Number((await db.query(sql)).rows[0].count);
}

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  }
  await db.exec(SUPABASE_GRANTS);
  await db.exec(`insert into auth.users values ('${A}', '{"nickname":"민찬"}'), ('${B}', '{"name":"카카오닉네임"}')`);
});

describe('프로필', () => {
  it('가입하면 닉네임으로 프로필이 생긴다 (카카오는 name 사용)', async () => {
    const rows = (await db.query('select nickname from public.profiles order by id')).rows.map((r) => r.nickname);
    assert.deepEqual(rows, ['민찬', '카카오닉네임']);
  });
});

describe('일지·도감', () => {
  let logId;

  it('일지와 조과를 저장하면 도감이 계산된다', async () => {
    logId = (await one('authenticated', `select public.save_fishing_log('{"location":"영종도"}', '[{"species":"광어","size_cm":"45","count":"2"},{"species":"  "}]') as id`)).id;
    await as('authenticated', `select public.save_fishing_log('{"location":"강화도"}', '[{"species":"광어","size_cm":"52"}]')`);
    const dogam = (await as('authenticated', 'select species, best_size_cm, total_count, best_location from public.my_dogam')).rows;
    assert.equal(dogam.length, 1);
    assert.equal(Number(dogam[0].best_size_cm), 52);
    assert.equal(dogam[0].total_count, 3);
    assert.equal(dogam[0].best_location, '강화도');
  });

  it('다른 사람은 내 일지·도감을 볼 수 없다', async () => {
    assert.equal((await as('authenticated', 'select * from public.fishing_logs', B)).rows.length, 0);
    assert.equal((await as('authenticated', 'select * from public.my_dogam', B)).rows.length, 0);
  });

  it('다른 사람은 내 일지를 수정할 수 없다', async () => {
    assert.ok(await blocked('authenticated', `select public.save_fishing_log('{"memo":"x"}', '[]', ${logId})`, B));
  });
});

describe('커뮤니티·포인트', () => {
  let postId;

  it('좋아요·댓글 수가 피드에 반영된다', async () => {
    postId = (await one('authenticated', `insert into public.posts (category, content) values ('인증샷', '광어') returning id`)).id;
    await as('authenticated', `insert into public.post_likes (post_id) values (${postId})`, B);
    await as('authenticated', `insert into public.comments (post_id, content) values (${postId}, '축하해요')`, B);
    const feed = await one('authenticated', `select author_nickname, like_count, liked_by_me, comment_count from public.post_feed where id = ${postId}`, B);
    assert.deepEqual(feed, { author_nickname: '민찬', like_count: 1, liked_by_me: true, comment_count: 1 });
  });

  it('남의 글은 삭제할 수 없다', async () => {
    assert.ok(await blocked('authenticated', `delete from public.posts where id = ${postId} returning id`, B));
  });

  it('다른 사람 이름으로 글을 쓸 수 없다', async () => {
    assert.ok(await blocked('authenticated', `insert into public.posts (user_id, category, content) values ('${A}', '인증샷', '사칭') returning id`, B));
  });

  it('기본 포인트는 아무도 삭제할 수 없다', async () => {
    assert.ok(await blocked('authenticated', 'delete from public.fishing_points where user_id is null returning id'));
  });
});

describe('AI 사용량 제한', () => {
  it('하루 한도를 넘으면 null, 환불하면 다시 가능', async () => {
    const ids = [];
    for (let i = 0; i < 3; i++) ids.push((await one('service_role', `select public.consume_ai_quota('${B}', 2) as id`)).id);
    assert.equal(ids[2], null);
    await as('service_role', `select public.refund_ai_quota(${ids[0]})`);
    assert.notEqual((await one('service_role', `select public.consume_ai_quota('${B}', 2) as id`)).id, null);
  });

  it('사용자는 할당량 함수를 직접 호출하거나 기록을 지울 수 없다', async () => {
    assert.ok(await blocked('authenticated', `select public.consume_ai_quota('${B}', 999)`, B));
    assert.ok(await blocked('authenticated', `select public.refund_ai_quota(1)`, B));
    assert.ok(await blocked('authenticated', 'delete from public.ai_usage returning id', B));
  });
});

describe('방류 알림', () => {
  it('로그인 사용자는 시설과 방류 일정을 읽을 수 있다', async () => {
    // 실제로는 service_role(동기화 함수)이 넣는다. 테스트 흉내 역할은 RLS 우회가 없어 관리자로 넣는다
    await db.exec(`insert into public.release_events (facility_id, status, starts_at, ends_at, flow_cms, source) values ('yeongsan', 'window', now(), now() + interval '3 day', 12070, 'official')`);
    assert.ok((await as('authenticated', 'select id from public.release_facilities')).rows.length >= 10);
    assert.equal((await as('authenticated', `select id from public.release_events where facility_id = 'yeongsan'`)).rows.length, 1);
  });

  it('사용자는 시설·방류 일정을 바꿀 수 없다', async () => {
    assert.ok(await blocked('authenticated', `insert into public.release_events (facility_id, status, starts_at, source) values ('geum', 'active', now(), 'report') returning id`));
    assert.ok(await blocked('authenticated', `update public.release_events set status = 'ended' returning id`));
    assert.ok(await blocked('authenticated', `delete from public.release_facilities returning id`));
  });

  it('관심 시설은 본인 것만 보고 추가·삭제한다', async () => {
    await as('authenticated', `insert into public.release_subscriptions (facility_id) values ('yeongsan')`);
    await as('authenticated', `insert into public.release_subscriptions (facility_id) values ('geum')`, B);
    assert.equal((await as('authenticated', 'select facility_id from public.release_subscriptions')).rows.length, 1);
    assert.ok(await blocked('authenticated', `insert into public.release_subscriptions (user_id, facility_id) values ('${B}', 'nakdong') returning facility_id`));
    assert.ok(await blocked('authenticated', `delete from public.release_subscriptions where user_id = '${B}' returning facility_id`));
  });

  it("커뮤니티에 '방류 소식' 글을 쓸 수 있다", async () => {
    const row = await one('authenticated', `insert into public.posts (category, content) values ('방류 소식', '영산강 하굿둑 방류 시작') returning id`);
    assert.ok(row.id);
  });
});

describe('회원 탈퇴', () => {
  // 실제 탈퇴는 delete-account Edge Function이 사진을 지운 뒤 auth 계정을 삭제한다.
  // 여기서는 계정 삭제가 모든 데이터로 연쇄 삭제되는지 확인한다.
  it('계정을 삭제하면 프로필·일지·글이 모두 지워진다', async () => {
    await db.exec(`delete from auth.users where id = '${A}'`);
    assert.equal(await count(`select count(*) from public.profiles where id = '${A}'`), 0);
    assert.equal(await count(`select count(*) from public.fishing_logs where user_id = '${A}'`), 0);
    assert.equal(await count(`select count(*) from public.posts where user_id = '${A}'`), 0);
  });
});
