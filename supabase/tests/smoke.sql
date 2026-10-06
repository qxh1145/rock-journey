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
  -- xuất báo cáo: row_count khớp game_sessions, mỗi lần gọi thêm một audit, title đã đổi tên
  assert (admin_export_report(null,'CLAIMED','x1')->'data'->>'row_count')::int = (select count(*) from game_sessions where reward_claimed);
  assert (admin_export_report(null,'QUALIFIED_UNCLAIMED','x2')->'data'->>'row_count')::int = (select count(*) from game_sessions where qualified_for_reward and not reward_claimed);
  assert (select count(*) from audit_logs where action = 'report_exported') = 2;
  assert admin_export_report(null,'CLAIMED','x3')->'data'->>'csv' like '%Mầm Nghề%';
  perform set_config('test.uid','00000000-0000-0000-0000-000000000001',false);
  assert admin_export_report(null,'CLAIMED','x4')->>'code' = 'FORBIDDEN';
  raise notice 'ALL PASS';
end $$;

-- dashboard: thêm 3 lượt bên cạnh lượt của P1 (COMPLETED 10/12, đã nhận quà)
insert into auth.users select ('00000000-0000-0000-0000-00000000000'||i)::uuid, 'p'||i||'@x.com', now(), '{}' from generate_series(3,5) i;
insert into players (id, email_normalized, email_at_play) select id, email, email from auth.users where email like 'p_@x.com';
insert into game_sessions (player_id, question_set_version, status, started_at, answered_count, correct_count) values
  ('00000000-0000-0000-0000-000000000003','v1','COMPLETED','2026-01-01',12,10),  -- đủ điều kiện, chưa nhận
  ('00000000-0000-0000-0000-000000000004','v1','COMPLETED','2026-01-01',12,5),
  ('00000000-0000-0000-0000-000000000005','v1','IN_PROGRESS',now(),3,2);

do $$
declare
  k text := 'total,in_progress,completed,resume_rate,avg_score,eligible,unclaimed,claimed';
  d jsonb;
begin
  -- P5 mở lại lượt đang chơi → resume_count = 1
  perform set_config('test.uid','00000000-0000-0000-0000-000000000005',false);
  assert get_current_session()->>'code' = 'IN_PROGRESS';
  assert (select resume_count from game_sessions where player_id = auth.uid()) = 1;
  assert admin_get_dashboard()->>'code' = 'FORBIDDEN';

  perform set_config('test.uid','00000000-0000-0000-0000-000000000002',false);
  -- giá trị theo thứ tự k
  d := admin_get_dashboard()->'data';
  assert (select string_agg(coalesce(d->>x,'-'),',') from unnest(string_to_array(k,',')) x) = '4,1,3,0.25,8.33,2,1,1', d::text;
  d := admin_get_dashboard(null, '2026-06-01')->'data';  -- kiểu gọi cũ 2 tham số
  assert (select string_agg(coalesce(d->>x,'-'),',') from unnest(string_to_array(k,',')) x) = '2,0,2,0.00,7.50,1,1,0', d::text;
  d := admin_get_dashboard('2026-06-01', null)->'data';
  assert (select string_agg(coalesce(d->>x,'-'),',') from unnest(string_to_array(k,',')) x) = '2,1,1,0.50,10.00,1,0,1', d::text;
  d := admin_get_dashboard(p_status => 'IN_PROGRESS')->'data';
  assert (select string_agg(coalesce(d->>x,'-'),',') from unnest(string_to_array(k,',')) x) = '1,1,0,1.00,-,0,0,0', d::text;
  d := admin_get_dashboard(p_score_min => 6, p_score_max => 10)->'data';
  assert (select string_agg(coalesce(d->>x,'-'),',') from unnest(string_to_array(k,',')) x) = '2,0,2,0.00,10.00,2,1,1', d::text;
  d := admin_get_dashboard(p_score_max => 5)->'data';
  assert (select string_agg(coalesce(d->>x,'-'),',') from unnest(string_to_array(k,',')) x) = '2,1,1,0.50,5.00,0,0,0', d::text;
  d := admin_get_dashboard(p_prize => 'NOT_ELIGIBLE')->'data';
  assert (select string_agg(coalesce(d->>x,'-'),',') from unnest(string_to_array(k,',')) x) = '2,1,1,0.50,5.00,0,0,0', d::text;
  d := admin_get_dashboard(p_prize => 'UNCLAIMED')->'data';
  assert (select string_agg(coalesce(d->>x,'-'),',') from unnest(string_to_array(k,',')) x) = '1,0,1,0.00,10.00,1,1,0', d::text;
  d := admin_get_dashboard(p_prize => 'CLAIMED')->'data';
  assert (select string_agg(coalesce(d->>x,'-'),',') from unnest(string_to_array(k,',')) x) = '1,0,1,0.00,10.00,1,0,1', d::text;
  d := admin_get_dashboard(p_score_min => 11)->'data';  -- rỗng
  assert (select string_agg(coalesce(d->>x,'-'),',') from unnest(string_to_array(k,',')) x) = '0,0,0,-,-,0,0,0', d::text;

  assert admin_get_dashboard(p_status => 'DONE')->>'code' = 'INVALID_INPUT';
  assert admin_get_dashboard(p_prize => 'X')->>'code' = 'INVALID_INPUT';
  assert admin_get_dashboard(p_score_min => 8, p_score_max => 3)->>'code' = 'INVALID_INPUT';
  raise notice 'DASHBOARD PASS';
end $$;

do $$
declare
  p1 uuid := '00000000-0000-0000-0000-000000000001'; p3 uuid := '00000000-0000-0000-0000-000000000003';
  d jsonb;
begin
  perform set_config('test.uid',p3::text,false);
  assert admin_search_users()->>'code' = 'FORBIDDEN';
  assert admin_get_user_detail(p1)->>'code' = 'FORBIDDEN';

  perform set_config('test.uid','00000000-0000-0000-0000-000000000002',false);
  d := admin_search_users()->'data';
  assert (d->>'total') = '4' and d->>'page_size' = '20' and (select string_agg(r->>'email',',') from jsonb_array_elements(d->'rows') r) = 'p1@mail.com,p3@x.com,p4@x.com,p5@x.com', d::text;
  assert (d->'rows'->0->>'prize') = 'CLAIMED' and (d->'rows'->3->>'status') = 'IN_PROGRESS';
  d := admin_search_users('p3')->'data';
  assert d->>'total' = '1' and d->'rows'->0->>'email' = 'p3@x.com', d::text;
  assert admin_search_users('p_')->'data'->>'total' = '0';  -- "_" được escape
  d := admin_search_users(p_status => 'IN_PROGRESS')->'data';
  assert d->>'total' = '1' and d->'rows'->0->>'email' = 'p5@x.com', d::text;
  d := admin_search_users(p_prize => 'UNCLAIMED')->'data';
  assert d->>'total' = '1' and d->'rows'->0->>'email' = 'p3@x.com', d::text;
  d := admin_search_users(p_prize => 'NOT_ELIGIBLE')->'data';
  assert d->>'total' = '2', d::text;
  d := admin_search_users(p_page => 2)->'data';
  assert d->>'total' = '4' and jsonb_array_length(d->'rows') = 0, d::text;
  assert admin_search_users(p_status => 'DONE')->>'code' = 'INVALID_INPUT';
  assert admin_search_users(p_page => 0)->>'code' = 'INVALID_INPUT';
  assert admin_search_users(p_score_min => 8, p_score_max => 3)->>'code' = 'INVALID_INPUT';

  d := admin_get_user_detail(p1)->'data';
  assert d->'profile'->>'email' = 'p1@mail.com' and d->'session'->>'status' = 'COMPLETED' and d->'session'->>'resume_count' = '0', d::text;
  assert jsonb_array_length(d->'answers') = 12 and d->'answers'->2->>'is_correct' = 'false' and d->'answers'->2->>'selected_text' = 'B', d::text;
  d := admin_get_user_detail(p3)->'data';
  assert d->'session'->>'status' = 'COMPLETED' and jsonb_array_length(d->'answers') = 0, d::text;
  insert into auth.users values ('00000000-0000-0000-0000-000000000009','p9@x.com',now(),'{}');
  insert into players (id, email_normalized, email_at_play) values ('00000000-0000-0000-0000-000000000009','p9@x.com','p9@x.com');
  d := admin_get_user_detail('00000000-0000-0000-0000-000000000009')->'data';
  assert d->'session' = 'null'::jsonb and jsonb_array_length(d->'answers') = 0, d::text;
  assert admin_search_users()->'data'->>'total' = '5' and admin_search_users(p_q => 'p9')->'data'->'rows'->0->>'status' = 'NONE';
  assert admin_search_users(p_score_min => 0)->'data'->>'total' = '4';  -- lọc phiên loại người chưa chơi
  assert admin_get_user_detail(gen_random_uuid())->>'code' = 'NOT_FOUND';
  raise notice 'USERS PASS';
end $$;

-- xuất theo bộ lọc + chọn cột, nhập/kích hoạt bộ câu hỏi, bảng tiến độ trực tiếp
insert into auth.users values ('00000000-0000-0000-0000-000000000006','p6@x.com',now(),'{}');
insert into players (id, email_normalized, email_at_play) values ('00000000-0000-0000-0000-000000000006','p6@x.com','p6@x.com');
insert into game_sessions (player_id, question_set_version, status, started_at, answered_count, correct_count)
  values ('00000000-0000-0000-0000-000000000006','v1','IN_PROGRESS',now() - interval '1 hour',1,1);
insert into answers (session_id, question_id, question_index, selected_option_id, is_correct, answered_at, idempotency_key)
  select id, 'q1', 1, 'a', true, now() + interval '1 minute', 'k6' from game_sessions where player_id = '00000000-0000-0000-0000-000000000006';

do $$
declare
  d jsonb; q jsonb; f text[] := array['email','status','correct_count'];
begin
  perform set_config('test.uid','00000000-0000-0000-0000-000000000003',false);
  assert admin_export_report(null,null,null,null,null,null,f,false,'e0')->>'code' = 'FORBIDDEN';
  assert admin_list_question_sets()->>'code' = 'FORBIDDEN';
  assert admin_import_question_set('v2','[]')->>'code' = 'FORBIDDEN';
  assert admin_activate_question_set('v1')->>'code' = 'FORBIDDEN';
  assert admin_live_progress()->>'code' = 'FORBIDDEN';

  perform set_config('test.uid','00000000-0000-0000-0000-000000000002',false);
  -- export: số dòng = dashboard, chỉ các cột chọn, không có cột câu trả lời
  d := admin_export_report('2026-06-01',null,null,6,null,null,f,false,'e1')->'data';
  assert d->>'row_count' = admin_get_dashboard('2026-06-01',null,null,6)->'data'->>'total', d::text;
  assert d->>'csv' = E'email,status,correct_count\n"p1@mail.com","COMPLETED","10"', d::text;
  assert admin_export_report(null,null,null,null,null,null,f,false,'e1') = admin_export_report(null,null,null,null,null,null,f,false,'e1');
  assert (select count(*) from audit_logs where request_id = 'e1') = 1;
  d := (select after_json from audit_logs where request_id = 'e1');
  assert d->'fields' = '["email","status","correct_count"]' and d->'filters'->>'score_min' = '6' and d->>'row_count' = '1', d::text;
  d := admin_export_report(null,null,null,null,null,'CLAIMED',array['email'],true,'e2')->'data';
  assert split_part(d->>'csv', E'\n', 1) = 'email,q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12' and d->>'csv' like '%"a (đúng)"%', d::text;
  assert admin_export_report(null,null,null,null,null,null,array['password'],false,'e3')->>'code' = 'INVALID_INPUT';
  assert admin_export_report(null,null,null,null,null,null,'{}',false,'e4')->>'code' = 'INVALID_INPUT';

  -- import
  q := (select jsonb_agg(jsonb_build_object('idx',i,'prompt','Câu mới '||i,'a','Đá','b','B','c','C','d','D','correct','c','explanation','Vì thế')) from generate_series(1,12) i);
  d := admin_import_question_set('v1', q);
  assert d->>'code' = 'INVALID_INPUT' and d->>'message' like '%đã tồn tại%', d::text;
  d := admin_import_question_set('v2', q - 11);
  assert d->>'code' = 'INVALID_INPUT' and d->>'message' like '%12 câu%', d::text;
  d := admin_import_question_set('v2', jsonb_set(q, '{4,correct}', '"e"'));
  assert d->>'code' = 'INVALID_INPUT' and d->>'message' like 'Dòng 5:%', d::text;
  assert not exists (select 1 from question_sets where version = 'v2');
  assert admin_import_question_set('v2', q)->>'code' = 'OK';
  assert (select not active from question_sets where version = 'v2') and (select count(*) from questions where set_version = 'v2') = 12;
  assert (select options->0->>'text' from questions where set_version = 'v2' and idx = 1) = 'Đá';
  d := admin_list_question_sets()->'data';
  assert jsonb_array_length(d) = 2 and d->0->>'version' = 'v2' and d->0->>'count' = '12' and d->1->>'active' = 'true', d::text;

  -- kích hoạt: bộ duy nhất active; lượt cũ giữ v1, người mới nhận v2
  assert admin_activate_question_set('nope')->>'code' = 'NOT_FOUND';
  assert admin_activate_question_set('v2')->>'code' = 'OK';
  assert (select array_agg(version) from question_sets where active) = '{v2}';
  assert (select count(*) from game_sessions where question_set_version = 'v2') = 0;
  assert (select count(*) from audit_logs where action in ('question_set_imported','question_set_activated')) = 2;
  perform set_config('test.uid','00000000-0000-0000-0000-000000000009',false);
  assert start_session()->'data'->'question'->>'prompt' = 'Câu mới 1';
  update game_sessions set started_at = now() - interval '2 hours' where player_id = auth.uid();

  -- live: 3 IN_PROGRESS (p5, p6, p9), mới hoạt động nhất trước
  perform set_config('test.uid','00000000-0000-0000-0000-000000000002',false);
  d := admin_live_progress()->'data';
  assert (select string_agg(r->>'email', ',') from jsonb_array_elements(d) r) = 'p6@x.com,p5@x.com,p9@x.com', d::text;
  assert d->0->>'answered' = '1' and d->0->>'correct' = '1' and d->0->>'current_idx' = '2', d::text;
  assert jsonb_array_length(admin_live_progress(p_status => 'COMPLETED')->'data') = 0;
  assert admin_live_progress(p_prize => 'X')->>'code' = 'INVALID_INPUT';
  raise notice 'IMPORT/EXPORT/LIVE PASS';
end $$;
