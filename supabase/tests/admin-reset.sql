begin;
insert into auth.users values
 ('00000000-0000-0000-0000-000000000201','reset-admin@example.test',now(),'{}'),
 ('00000000-0000-0000-0000-000000000202','reset-player@example.test',now(),'{}'),
 ('00000000-0000-0000-0000-000000000203','reset-other@example.test',now(),'{}');
insert into admin_roles(user_id,email_normalized,role) values
 ('00000000-0000-0000-0000-000000000201','reset-admin@example.test','admin');
create function pg_temp.reject_reset_audit() returns trigger language plpgsql as $$
begin if new.request_id='reset-db-failure-key' then raise exception 'injected audit failure'; end if; return new; end $$;
create trigger reject_reset_audit before insert on audit_logs for each row execute function pg_temp.reject_reset_audit();
do $$
declare sid uuid; other_id uuid; replacement uuid; r jsonb; receipt jsonb; q questions; n integer; audit_count integer;
begin
 assert not has_function_privilege('anon','public.admin_reset_player_progress(uuid,text)','EXECUTE');
 assert has_function_privilege('authenticated','public.admin_reset_player_progress(uuid,text)','EXECUTE');
 perform set_config('test.uid','00000000-0000-0000-0000-000000000203',true);
 r := start_session(); other_id := (r->'data'->>'session_id')::uuid;
 perform set_config('test.uid','00000000-0000-0000-0000-000000000202',true);
 r := start_session(); sid := (r->'data'->>'session_id')::uuid;
 select * into q from questions where set_version = (select question_set_version from game_sessions where id=sid) and id=r->'data'->'question'->>'question_id';
 r := submit_answer(sid,q.id,q.correct_option_id,'reset-answer-key');
 select count(*) into audit_count from audit_logs;
 assert admin_reset_player_progress(sid,'reset-denied-key')->>'code'='FORBIDDEN';
 perform set_config('test.uid','',true);
 assert admin_reset_player_progress(sid,'reset-guest-key')->>'code'='FORBIDDEN';
 assert (select count(*) from audit_logs)=audit_count;
 perform set_config('test.uid','00000000-0000-0000-0000-000000000201',true);
 update admin_roles set active=false where user_id=auth.uid();
 assert admin_reset_player_progress(sid,'reset-revoked-key')->>'code'='FORBIDDEN';
 update admin_roles set active=true where user_id=auth.uid();
 assert admin_reset_player_progress(sid,'')->>'code'='INVALID_REQUEST';
 update players set locked=true where id='00000000-0000-0000-0000-000000000202';
 receipt := admin_reset_player_progress(sid,'reset-in-progress-key');
 assert receipt->>'ok'='true', receipt::text;
 assert receipt->'data'->>'deleted_answer_count'='1';
 assert not exists(select 1 from answers where session_id=sid);
 assert not exists(select 1 from game_sessions where id=sid);
 assert exists(select 1 from players where id='00000000-0000-0000-0000-000000000202' and locked);
 assert exists(select 1 from game_sessions where id=other_id and answered_count=0);
 assert (select count(*) from audit_logs)=audit_count+1;
 assert (select before_json->>'answered_count' from audit_logs where request_id='reset-in-progress-key')='1';
 assert admin_reset_player_progress(sid,'reset-in-progress-key')=receipt;
 assert admin_reset_player_progress(other_id,'reset-in-progress-key')->>'code'='CONFLICT';
 assert admin_reset_player_progress(sid,'reset-stale-key')->>'code'='CONFLICT';
 perform set_config('test.uid','00000000-0000-0000-0000-000000000202',true);
 assert start_session()->>'code'='FORBIDDEN';
 update players set locked=false where id=auth.uid();
 assert get_current_session()->>'code'='NONE';
 r:=start_session(); replacement:=(r->'data'->>'session_id')::uuid;
 assert replacement<>sid;
 assert r->'data'->>'answered_count'='0' and r->'data'->>'correct_count'='0';
 assert r->'data'->'question'->>'index'='1';
 for n in 1..12 loop
   select * into q from questions where set_version=(select question_set_version from game_sessions where id=replacement) and id=r->'data'->'question'->>'question_id';
   r:=submit_answer(replacement,q.id,case when n<=10 then q.correct_option_id else (select o->>'id' from jsonb_array_elements(q.options) o where o->>'id'<>q.correct_option_id limit 1) end,'reset-complete-'||n);
   assert r->>'ok'='true',r::text;
 end loop;
 assert r->'data'->>'status'='COMPLETED';
 assert submit_answer(sid,'q01','a','reset-old-session-answer')->>'code'='FORBIDDEN';
 perform set_config('test.uid','00000000-0000-0000-0000-000000000201',true);
 assert admin_reset_player_progress(sid,'reset-stale-new-key')->>'code'='CONFLICT';
 assert exists(select 1 from game_sessions where id=replacement);
 assert admin_reset_player_progress(sid,'reset-in-progress-key')=receipt;
 assert admin_claim_reward(replacement,'reset-historical-reward')->>'ok'='true';
 r:=admin_reset_player_progress(replacement,'reset-completed-key');
 assert r->'data'->>'deleted_answer_count'='12';
 assert (select before_json->>'reward_claimed' from audit_logs where request_id='reset-completed-key')='true';
 assert exists(select 1 from audit_logs where request_id='reset-historical-reward' and target_id=replacement::text);
 assert exists(select 1 from game_sessions where id=other_id);
 -- Audit insertion failure must roll back answers and session together.
 begin
   perform admin_reset_player_progress(other_id,'reset-db-failure-key');
   raise exception 'Expected injected failure';
 exception when others then
   assert sqlerrm='injected audit failure', sqlerrm;
 end;
 assert exists(select 1 from game_sessions where id=other_id);
 assert not exists(select 1 from audit_logs where request_id='reset-db-failure-key');
 begin
   create temporary table reset_failure_marker(x int);
   insert into audit_logs(action,request_id) values('report_exported','reset-collision-key');
   assert admin_reset_player_progress(other_id,'reset-collision-key')->>'code'='CONFLICT';
   assert exists(select 1 from game_sessions where id=other_id);
 end;
 raise notice 'ADMIN RESET PASS';
end $$;
rollback;
