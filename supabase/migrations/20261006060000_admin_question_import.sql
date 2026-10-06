-- Nhập bộ câu hỏi từ Excel: tạo bộ mới chưa active (không sửa bộ cũ), kích hoạt riêng. Lượt đang chơi giữ question_set_version.
create function public.admin_list_question_sets()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not _has_role('admin') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;
  return _res(true, 'OK', null, coalesce((
    select jsonb_agg(jsonb_build_object('version', s.version, 'active', s.active, 'created_at', s.created_at,
             'count', (select count(*) from questions q where q.set_version = s.version)) order by s.created_at desc, s.version)
    from question_sets s), '[]'::jsonb));
end $$;

-- p_questions: [{idx,prompt,a,b,c,d,correct,explanation}] đúng 12 phần tử
create function public.admin_import_question_set(p_version text, p_questions jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; n int := 0;
begin
  if not _has_role('admin') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;
  p_version := trim(p_version);
  if coalesce(p_version, '') = '' then return _res(false, 'INVALID_INPUT', 'Thiếu mã phiên bản'); end if;
  if exists (select 1 from question_sets where version = p_version) then
    return _res(false, 'INVALID_INPUT', 'Phiên bản ' || p_version || ' đã tồn tại');
  end if;
  if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions) <> 12 then
    return _res(false, 'INVALID_INPUT', 'Cần đúng 12 câu, nhận ' || coalesce(jsonb_array_length(case when jsonb_typeof(p_questions) = 'array' then p_questions end), 0));
  end if;
  for r in select * from jsonb_array_elements(p_questions) loop
    n := n + 1;
    if coalesce(r->>'idx', '') !~ '^\d+$' or (r->>'idx')::int <> n then
      return _res(false, 'INVALID_INPUT', 'Dòng ' || n || ': idx phải là ' || n);
    end if;
    if exists (select 1 from unnest(array['prompt','a','b','c','d','explanation']) k where coalesce(trim(r->>k), '') = '') then
      return _res(false, 'INVALID_INPUT', 'Dòng ' || n || ': thiếu nội dung');
    end if;
    if coalesce(r->>'correct', '') not in ('a', 'b', 'c', 'd') then
      return _res(false, 'INVALID_INPUT', 'Dòng ' || n || ': correct phải là a, b, c hoặc d');
    end if;
  end loop;

  insert into question_sets (version, active) values (p_version, false);
  insert into questions (set_version, id, idx, prompt, options, correct_option_id, explanation)
  select p_version, 'q' || (q->>'idx'), (q->>'idx')::int, trim(q->>'prompt'),
         jsonb_build_array(jsonb_build_object('id', 'a', 'text', trim(q->>'a')), jsonb_build_object('id', 'b', 'text', trim(q->>'b')),
                           jsonb_build_object('id', 'c', 'text', trim(q->>'c')), jsonb_build_object('id', 'd', 'text', trim(q->>'d'))),
         q->>'correct', trim(q->>'explanation')
  from jsonb_array_elements(p_questions) q;

  insert into audit_logs (actor_id, actor_email, action, target_type, target_id, after_json)
  values (auth.uid(), auth.jwt()->>'email', 'question_set_imported', 'question_set', p_version, jsonb_build_object('count', 12));
  return _res(true, 'OK', null, jsonb_build_object('version', p_version, 'count', 12));
end $$;

create function public.admin_activate_question_set(p_version text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_prev text;
begin
  if not _has_role('admin') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;
  perform 1 from question_sets where version = p_version for update;
  if not found then return _res(false, 'NOT_FOUND', 'Không tìm thấy bộ câu hỏi'); end if;
  select version into v_prev from question_sets where active for update;
  -- index unique một phần kiểm tra từng dòng → tắt bộ cũ trước rồi mới bật bộ mới
  update question_sets set active = false where active and version <> p_version;
  update question_sets set active = true where version = p_version;
  insert into audit_logs (actor_id, actor_email, action, target_type, target_id, before_json, after_json)
  values (auth.uid(), auth.jwt()->>'email', 'question_set_activated', 'question_set', p_version,
          jsonb_build_object('active', v_prev), jsonb_build_object('active', p_version));
  return _res(true, 'OK', null, jsonb_build_object('version', p_version));
end $$;

revoke execute on function public.admin_list_question_sets() from public, anon;
grant execute on function public.admin_list_question_sets() to authenticated;
revoke execute on function public.admin_import_question_set(text, jsonb) from public, anon;
grant execute on function public.admin_import_question_set(text, jsonb) to authenticated;
revoke execute on function public.admin_activate_question_set(text) from public, anon;
grant execute on function public.admin_activate_question_set(text) to authenticated;
