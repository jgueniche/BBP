-- RLS and behaviour tests for 202609301000_import_v2 (local bench only).
--   scripts/local/setup-db.sh copine_rls
--   su postgres -c "psql -v ON_ERROR_STOP=1 -X -q -d copine_rls" < scripts/local/rls/202609301000_import_v2.test.sql
-- Every block raises on the first broken expectation; the last line says OK.

\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-00000000000a', 'a@test.local'),
  ('b0000000-0000-4000-8000-00000000000b', 'b@test.local'),
  ('c0000000-0000-4000-8000-00000000000c', 'c@test.local')
on conflict do nothing;

create or replace function pg_temp.act_as(uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
end;
$$;

-- 1. Enqueue, read own only, no direct writes.
do $$
declare
  a uuid := 'a0000000-0000-4000-8000-00000000000a';
  b uuid := 'b0000000-0000-4000-8000-00000000000b';
  r jsonb; job uuid; n int;
begin
  set local role authenticated;
  perform pg_temp.act_as(a);
  r := public.enqueue_import('url', 'https://www.marmiton.org/recettes/recette_gratin_1.aspx?utm_source=x', null, null, null);
  assert r ? 'id' and (r ->> 'reused')::boolean = false, 'enqueue: ' || r::text;
  job := (r ->> 'id')::uuid;
  select count(*) into n from import_jobs where id = job and source_key = 'web:marmiton.org/recettes/recette_gratin_1.aspx' and source_host = 'marmiton.org';
  assert n = 1, 'job stored with its key and host';

  -- Same post, other tracking: the same job, not counted twice.
  r := public.enqueue_import('url', 'https://marmiton.org/recettes/recette_gratin_1.aspx', null, null, null);
  assert (r ->> 'id')::uuid = job and (r ->> 'reused')::boolean, 'reused: ' || r::text;
  assert (public.import_quota() ->> 'used')::int = 1, 'counted once';

  -- No direct writes.
  begin
    insert into import_jobs (user_id, kind, source_url) values (a, 'url', 'https://x.fr/a');
    raise exception 'direct insert allowed';
  exception when insufficient_privilege then null;
  end;
  update import_jobs set status = 'ready' where id = job;
  get diagnostics n = row_count;
  assert n = 0, 'direct update allowed';
  delete from import_jobs where id = job;
  get diagnostics n = row_count;
  assert n = 0, 'direct delete allowed';

  perform pg_temp.act_as(b);
  select count(*) into n from import_jobs where id = job;
  assert n = 0, 'B reads A''s job';
  assert not exists (select 1 from public.claim_import_job(job)), 'B claims A''s job';
  assert public.dismiss_import_job(job) is null, 'B dismisses A''s job';

  r := public.enqueue_import('url', 'ftp://x.fr/a', null, null, null);
  assert r ->> 'error' = 'invalid', 'bad url: ' || r::text;
  r := public.enqueue_import('text', null, 'trop court', null, null);
  assert r ->> 'error' = 'invalid', 'short text: ' || r::text;
  r := public.enqueue_import('captures', null, null, null, array[a::text || '/11111111-1111-4111-8111-111111111111.jpg']);
  assert r ->> 'error' = 'invalid', 'captures in another folder: ' || r::text;
end;
$$;

-- 2. Claim, lease, finish, requeue, retries.
do $$
declare
  a uuid := 'a0000000-0000-4000-8000-00000000000a';
  job uuid; j import_jobs; ok boolean;
begin
  set local role authenticated;
  perform pg_temp.act_as(a);
  select id into job from import_jobs where user_id = a limit 1;
  select * into j from public.claim_import_job(job);
  assert j.status = 'running' and j.attempts = 1 and j.locked_until > now(), 'claimed';
  assert not exists (select 1 from public.claim_import_job(job)), 'claimed twice while leased';

  assert public.requeue_import_job(job), 'requeued';
  select * into j from import_jobs where id = job;
  assert j.status = 'queued' and j.not_before > now(), 'requeued waits a little';
  assert not exists (select 1 from public.claim_import_job(job)), 'claimed before not_before';

  reset role;
  update import_jobs set not_before = now() where id = job;
  set local role authenticated;
  select * into j from public.claim_import_job(job);
  assert j.attempts = 2, 'second try';

  ok := public.finish_import_job(job, 'saved', null, null, null, null, null);
  assert not ok, 'finish with a forbidden status';
  ok := public.finish_import_job(job, 'ready', '{"draft": {"title": "Gratin"}}', null,
    'https://www.marmiton.org/recettes/recette_gratin_1.aspx', 'gemini-3.7-flash', '2.0.0');
  assert ok, 'finished';
  select * into j from import_jobs where id = job;
  assert j.status = 'ready' and j.input_text is null and j.finished_at is not null
    and j.prompt_version = '2.0.0' and j.locked_until is null, 'finished row';
  assert not public.finish_import_job(job, 'failed', null, 'x', null, null, null), 'finished twice';

  -- A job whose tries ran out fails instead of looping.
  reset role;
  insert into import_jobs (user_id, kind, source_url, status, attempts, locked_until)
  values (a, 'url', 'https://blog.fr/lent', 'running', 3, now() - interval '1 minute')
  returning id into job;
  set local role authenticated;
  assert not exists (select 1 from public.claim_import_job(job)), 'claimed after 3 tries';
  select * into j from import_jobs where id = job;
  assert j.status = 'failed' and j.error = 'timeout', 'timed out: ' || j.status;
end;
$$;

-- 3. Quotas: daily, captures, busy; answered jobs are free.
do $$
declare
  c uuid := 'c0000000-0000-4000-8000-00000000000c';
  r jsonb; i int; job uuid;
begin
  set local role authenticated;
  perform pg_temp.act_as(c);
  for i in 1..3 loop
    r := public.enqueue_import('url', 'https://blog-' || i || '.fr/recette', null, null, null);
    assert r ? 'id', 'enqueue ' || i || ': ' || r::text;
  end loop;
  r := public.enqueue_import('url', 'https://blog-4.fr/recette', null, null, null);
  assert r ->> 'error' = 'busy', 'busy: ' || r::text;

  -- Finish them (answered = stopped before any work: not counted).
  for job in select id from import_jobs where user_id = c loop
    perform public.claim_import_job(job);
    perform public.finish_import_job(job, 'answered', '{"stop": "duplicate"}', null, null, null, null);
  end loop;
  assert (public.import_quota() ->> 'used')::int = 0, 'answered jobs are free';

  for i in 1..20 loop
    r := public.enqueue_import('text', null, repeat('Recette numéro ' || i || '. ', 3), null, null);
    assert r ? 'id', 'text ' || i || ': ' || r::text;
    perform public.claim_import_job((r ->> 'id')::uuid);
    perform public.finish_import_job((r ->> 'id')::uuid, 'failed', null, 'no_recipe', null, null, null);
  end loop;
  r := public.enqueue_import('text', null, repeat('Une de trop. ', 3), null, null);
  assert r ->> 'error' = 'quota_daily', 'daily quota: ' || r::text;
end;
$$;

do $$
declare
  b uuid := 'b0000000-0000-4000-8000-00000000000b';
  r jsonb; i int;
begin
  set local role authenticated;
  perform pg_temp.act_as(b);
  for i in 1..10 loop
    r := public.enqueue_import('captures', null, null, '@maya',
      array[b::text || '/' || gen_random_uuid()::text || '.jpg']);
    assert r ? 'id', 'captures ' || i || ': ' || r::text;
    perform public.claim_import_job((r ->> 'id')::uuid);
    perform public.finish_import_job((r ->> 'id')::uuid, 'ready', '{}', null, null, null, null);
  end loop;
  r := public.enqueue_import('captures', null, null, null, array[b::text || '/' || gen_random_uuid()::text || '.jpg']);
  assert r ->> 'error' = 'quota_captures', 'captures quota: ' || r::text;
  r := public.enqueue_import('url', 'https://www.750g.com/tarte-r1.htm', null, null, null);
  assert r ? 'id', 'other imports still allowed: ' || r::text;
end;
$$;

-- 4. Politeness: a site read 20 times in a minute makes the next wait.
do $$
declare
  a uuid := 'a0000000-0000-4000-8000-00000000000a';
  r jsonb; j import_jobs;
begin
  insert into import_jobs (user_id, kind, source_url, source_host, status)
  select 'b0000000-0000-4000-8000-00000000000b', 'url', 'https://www.cuisineaz.com/r-' || g, 'cuisineaz.com', 'ready'
  from generate_series(1, 20) g;
  set local role authenticated;
  perform pg_temp.act_as(a);
  r := public.enqueue_import('url', 'https://www.cuisineaz.com/recettes/poulet-1.aspx', null, null, null);
  select * into j from import_jobs where id = (r ->> 'id')::uuid;
  assert j.not_before > now() + interval '20 seconds', 'waits: ' || j.not_before::text;
  assert not exists (select 1 from public.claim_import_job(j.id)), 'not claimable yet';
end;
$$;

-- 5. Continue a question, dismiss, saved, forget.
do $$
declare
  a uuid := 'a0000000-0000-4000-8000-00000000000a';
  b uuid := 'b0000000-0000-4000-8000-00000000000b';
  r jsonb; job uuid; j import_jobs; recipe uuid; other uuid;
begin
  set local role authenticated;
  perform pg_temp.act_as(a);
  r := public.enqueue_import('url', 'https://www.instagram.com/p/C1aBcD2eFgH/', null, null, null);
  job := (r ->> 'id')::uuid;
  r := public.continue_import_job(job, 'text', repeat('Légende collée. ', 3), '@maya', null);
  assert r ->> 'error' = 'invalid', 'continue before the question';
  perform public.claim_import_job(job);
  perform public.finish_import_job(job, 'needs_input', '{"ask": "caption"}', null, null, null, null);
  r := public.continue_import_job(job, 'text', repeat('Légende collée. ', 3), '@maya', null);
  assert (r ->> 'id')::uuid = job, 'continued: ' || r::text;
  select * into j from import_jobs where id = job;
  assert j.status = 'queued' and j.kind = 'text' and j.credit = '@maya' and j.attempts = 0
    and j.source_key = 'instagram:C1aBcD2eFgH', 'continued row';

  perform public.claim_import_job(job);
  perform public.finish_import_job(job, 'ready', '{"draft": {}}', null, null, null, null);
  insert into recipes (author_id, title, slug, source_url, visibility)
  values (a, 'Gratin', 'gratin-rls-a', 'https://www.instagram.com/p/C1aBcD2eFgH/', 'private')
  returning id into recipe;
  perform pg_temp.act_as(b);
  insert into recipes (author_id, title, slug, visibility) values (b, 'Autre', 'autre-rls-b', 'private')
  returning id into other;
  assert public.mark_import_saved(job, recipe) is null, 'B marks A''s job';
  perform pg_temp.act_as(a);
  assert public.mark_import_saved(job, other) is null, 'saved with someone else''s recipe';
  assert public.mark_import_saved(job, recipe), 'saved';
  select * into j from import_jobs where id = job;
  assert j.status = 'saved' and j.recipe_id = recipe and j.result is null, 'saved row';

  assert public.dismiss_import_job(job), 'dismissed';
  perform public.forget_import_jobs();
  assert not exists (select 1 from import_jobs), 'A forgot her jobs';
  reset role;
  assert exists (select 1 from import_jobs where user_id = b), 'B''s jobs stay';
end;
$$;

-- 6. One copy of a post per member (outside « Ma version »).
do $$
declare
  a uuid := 'a0000000-0000-4000-8000-00000000000a';
  b uuid := 'b0000000-0000-4000-8000-00000000000b';
  first uuid;
begin
  set local role authenticated;
  perform pg_temp.act_as(a);
  select id into first from recipes where slug = 'gratin-rls-a';
  begin
    insert into recipes (author_id, title, slug, source_url, visibility)
    values (a, 'Gratin bis', 'gratin-rls-a2', 'https://instagram.com/reel/C1aBcD2eFgH/?igsh=1', 'private');
    raise exception 'second copy allowed';
  exception when unique_violation then null;
  end;
  insert into recipes (author_id, title, slug, source_url, visibility, parent_recipe_id)
  values (a, 'Ma version', 'gratin-rls-a3', 'https://www.instagram.com/p/C1aBcD2eFgH/', 'private', first);
  perform pg_temp.act_as(b);
  insert into recipes (author_id, title, slug, source_url, visibility)
  values (b, 'Gratin de B', 'gratin-rls-b', 'https://www.instagram.com/p/C1aBcD2eFgH/', 'private');
end;
$$;

-- 7. Captures: own folder only.
do $$
declare
  a uuid := 'a0000000-0000-4000-8000-00000000000a';
  b uuid := 'b0000000-0000-4000-8000-00000000000b';
  n int;
begin
  set local role authenticated;
  perform pg_temp.act_as(a);
  insert into storage.objects (bucket_id, name, owner)
  values ('import-captures', a::text || '/22222222-2222-4222-8222-222222222222.jpg', a);
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('import-captures', b::text || '/33333333-3333-4333-8333-333333333333.jpg', a);
    raise exception 'capture in B''s folder';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.act_as(b);
  select count(*) into n from storage.objects where bucket_id = 'import-captures';
  assert n = 0, 'B reads A''s captures';
  delete from storage.objects where bucket_id = 'import-captures';
  get diagnostics n = row_count;
  assert n = 0, 'B deletes A''s captures';
  perform pg_temp.act_as(a);
  select count(*) into n from storage.objects where bucket_id = 'import-captures';
  assert n = 1, 'A reads her captures';
end;
$$;

-- 8. Cover photos: own folder, readable as far as the recipe is.
do $$
declare
  a uuid := 'a0000000-0000-4000-8000-00000000000a';
  b uuid := 'b0000000-0000-4000-8000-00000000000b';
  photo text := 'a0000000-0000-4000-8000-00000000000a/44444444-4444-4444-8444-444444444444.jpg';
  thumb text := 'a0000000-0000-4000-8000-00000000000a/44444444-4444-4444-8444-444444444444-thumb.jpg';
  n int;
begin
  set local role authenticated;
  perform pg_temp.act_as(a);
  insert into storage.objects (bucket_id, name, owner) values ('recipe-photos', photo, a), ('recipe-photos', thumb, a);
  begin
    insert into storage.objects (bucket_id, name, owner) values ('recipe-photos', a::text || '/not-a-uuid.jpg', a);
    raise exception 'free-form photo name';
  exception when insufficient_privilege then null;
  end;
  update recipes set photo_paths = array[photo] where slug = 'gratin-rls-a';
  begin
    update recipes set photo_paths = array[b::text || '/55555555-5555-4555-8555-555555555555.jpg'] where slug = 'gratin-rls-a';
    raise exception 'someone else''s photo as cover';
  exception when check_violation then null;
  end;
  begin
    update recipes set photo_paths = array[photo, photo] where slug = 'gratin-rls-a';
    raise exception 'two covers';
  exception when check_violation then null;
  end;

  -- Private recipe: B sees neither the photo nor its thumbnail.
  perform pg_temp.act_as(b);
  select count(*) into n from storage.objects where bucket_id = 'recipe-photos';
  assert n = 0, 'B sees a private recipe''s photo';

  perform pg_temp.act_as(a);
  update recipes set visibility = 'community' where slug = 'gratin-rls-a';
  perform pg_temp.act_as(b);
  select count(*) into n from storage.objects where bucket_id = 'recipe-photos';
  assert n = 2, 'B sees a shared recipe''s photo and thumbnail: ' || n;
  delete from storage.objects where bucket_id = 'recipe-photos';
  get diagnostics n = row_count;
  assert n = 0, 'B deletes A''s photo';

  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into n from storage.objects where bucket_id = 'recipe-photos';
  assert n = 2, 'visitors see a published community recipe''s photo: ' || n;
end;
$$;

-- 9. The withdrawal floor of session 22 still holds with the new index.
do $$
declare
  a uuid := 'a0000000-0000-4000-8000-00000000000a';
  c uuid := 'c0000000-0000-4000-8000-00000000000c';
  j record;
begin
  insert into creators (platform, handle, profile_url) values ('tiktok', 'maya', 'https://www.tiktok.com/@maya')
  on conflict do nothing;
  insert into creator_withdrawals (creator_id, source_key)
  select id, 'tiktok:7312345678901234567' from creators where platform = 'tiktok' and handle = 'maya';
  set local role authenticated;
  perform pg_temp.act_as(c);
  insert into recipes (author_id, title, slug, source_url, visibility)
  values (c, 'Copie', 'copie-rls-c', 'https://www.tiktok.com/@maya/video/7312345678901234567', 'community');
  select visibility, withdrawn_at into j from recipes where slug = 'copie-rls-c';
  assert j.visibility = 'private' and j.withdrawn_at is not null, 'withdrawn copy stays private';
end;
$$;

select 'import v2: all RLS checks passed' as result;
