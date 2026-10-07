-- Run after smoke.sql on the isolated database using stub_auth.sql.
begin;
insert into auth.users values
  ('00000000-0000-0000-0000-000000000101', ' BICHTramnbk63@gmail.com ', now(), '{}'),
  ('00000000-0000-0000-0000-000000000102', 'quandeptraixuhue@gmail.com', now(), '{}'),
  ('00000000-0000-0000-0000-000000000103', 'bichtramnbk63@gmail.com', null, '{}'),
  ('00000000-0000-0000-0000-000000000104', null, now(), '{}');
do $$
declare uid uuid; r jsonb; sid uuid; q questions; n int; protected_count int;
begin
  select count(*) into protected_count from game_sessions;
  perform set_config('test.uid', '', true);
  assert replay_session()->>'code' = 'UNAUTHENTICATED';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', true);
  assert replay_session()->>'code' = 'FORBIDDEN';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000103', true);
  assert replay_session()->>'code' = 'FORBIDDEN';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000104', true);
  assert replay_session()->>'code' = 'FORBIDDEN';
  foreach uid in array array['00000000-0000-0000-0000-000000000101'::uuid, '00000000-0000-0000-0000-000000000102'::uuid] loop
    perform set_config('test.uid', uid::text, true);
    for n in 1..3 loop
      r := start_session();
      assert r->>'ok' = 'true', r::text;
      sid := (r->'data'->>'session_id')::uuid;
      select questions.* into q from questions join game_sessions s on s.question_set_version = questions.set_version
        where s.id = sid and questions.id = r->'data'->'question'->>'question_id';
      r := submit_answer(sid, q.id, q.correct_option_id, 'replay-test-' || n);
      assert r->>'ok' = 'true', r::text;
      assert replay_session()->>'code' = 'OK';
      assert not exists (select 1 from game_sessions where player_id = uid);
      assert not exists (select 1 from answers where session_id = sid);
      assert get_current_session()->>'code' = 'NONE';
    end loop;
  end loop;
  assert (select count(*) from game_sessions) = protected_count;
  assert not has_function_privilege('anon', 'public.replay_session()', 'EXECUTE');
  assert has_function_privilege('authenticated', 'public.replay_session()', 'EXECUTE');
  raise notice 'REPLAY PASS';
end $$;
rollback;
