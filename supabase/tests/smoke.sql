-- Chạy: createdb rj_test && psql rj_test -v ON_ERROR_STOP=1 -f supabase/tests/stub_auth.sql $(printf -- '-f %s ' supabase/migrations/*.sql) -f supabase/tests/smoke.sql
insert into auth.users values ('00000000-0000-0000-0000-000000000001','P1@Mail.com',now(),'{}'),
                              ('00000000-0000-0000-0000-000000000002','admin@x.com',now(),'{}');
insert into admin_roles (user_id,email_normalized,role) values ('00000000-0000-0000-0000-000000000002','admin@x.com','admin');
insert into question_sets values ('v1', true);
insert into questions select 'v1','q'||i,i,'Câu '||i,'[{"id":"a","text":"A"},{"id":"b","text":"B"}]','a','giải thích' from generate_series(1,12) i;

do $$
declare r jsonb; sid uuid;
begin
  perform set_config('test.uid','00000000-0000-0000-0000-000000000001',false);
  r := start_session(); assert r->>'ok' = 'true', r::text;
  sid := (r->'data'->>'session_id')::uuid;
  assert start_session()->>'code' = 'SESSION_ALREADY_EXISTS';
  assert submit_answer(sid,'q2','a','key-00002')->>'code' = 'QUESTION_OUT_OF_ORDER';

  r := submit_answer(sid,'q1','a','key-00001'); assert r->'data'->>'chisel_event_id' is null;
  r := submit_answer(sid,'q2','b','key-00002'); assert r->'data'->>'chisel_event_id' is not null, r::text;
  assert r->'data'->>'mascot_stage' = 'CARVED_1';
  -- retry cùng key: không cộng, cùng event id
  assert submit_answer(sid,'q2','a','key-00002')->'data'->>'answered_count' = '2';
  assert submit_answer(sid,'q2','a','key-00002')->'data'->>'chisel_event_id' = r->'data'->>'chisel_event_id';
  assert submit_answer(sid,'q2','a','key-other')->>'code' = 'QUESTION_ALREADY_ANSWERED';

  -- q3..q12: sai q3 → tổng 10/12
  perform submit_answer(sid,'q'||i, case when i=3 then 'b' else 'a' end, 'key-000'||lpad(i::text,2,'0')) from generate_series(3,12) i;
  r := get_result(sid);
  assert r->'data'->>'correct_count' = '10' and r->'data'->>'title' = 'MAM_NGHE' and r->'data'->>'mascot_stage' = 'FINISHED', r::text;
  assert admin_claim_reward(sid,'req-1')->>'code' = 'FORBIDDEN';  -- player không phải admin
  assert admin_search_players('p1')->>'code' = 'FORBIDDEN';

  perform set_config('test.uid','00000000-0000-0000-0000-000000000002',false);
  assert jsonb_array_length(admin_search_players('p1')->'data') = 1;
  assert admin_claim_reward(sid,'req-1')->>'code' = 'OK';
  assert (select count(*) from audit_logs where action = 'reward_claimed' and target_id = sid::text) = 1;
  -- lần trao thứ hai (tuần tự; đồng thời dựa vào khóa for update, chưa test): không thêm audit
  assert admin_claim_reward(sid,'req-2')->>'code' = 'ALREADY_CLAIMED';
  assert admin_claim_reward(sid,'req-1')->>'code' = 'ALREADY_CLAIMED';
  assert (select count(*) from audit_logs where action = 'reward_claimed' and target_id = sid::text) = 1;
  assert admin_get_dashboard()->>'code' = 'OK';
  raise notice 'ALL PASS';
end $$;
