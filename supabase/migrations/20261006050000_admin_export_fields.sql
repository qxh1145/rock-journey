-- Xuất theo bộ lọc dashboard + chọn cột (CSV, mọi ô đặt trong "…"). Bản (p_status,p_reward,p_request_id) giữ cho bàn trao quà.
-- p_fields không có default để PostgREST/psql không nhầm với bản cũ.
create function public.admin_export_report(
  p_from timestamptz, p_to timestamptz, p_status text, p_score_min int, p_score_max int, p_prize text,
  p_fields text[], p_include_answers boolean default false, p_request_id text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_all text[] := array['email','session_id','status','started_at','completed_at','answered_count','correct_count',
                        'title','qualified','reward_claimed','reward_claimed_at','reward_claimed_by'];
  v_cols text[]; v_csv text; v_rows int; v_filters jsonb;
begin
  if not _has_role('admin') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;
  if p_status is not null and p_status not in ('IN_PROGRESS', 'COMPLETED')
     or p_prize is not null and p_prize not in ('NOT_ELIGIBLE', 'UNCLAIMED', 'CLAIMED')
     or p_score_min > p_score_max
     or coalesce(cardinality(p_fields), 0) = 0 or not p_fields <@ v_all then
    return _res(false, 'INVALID_INPUT', 'Bộ lọc hoặc cột không hợp lệ');
  end if;
  v_cols := p_fields || case when p_include_answers then array(select 'q' || i from generate_series(1, 12) i) else '{}' end;

  with r as (
    select s.id, jsonb_build_object(
             'email', p.email_normalized, 'session_id', s.id, 'status', s.status, 'started_at', s.started_at,
             'completed_at', s.completed_at, 'answered_count', s.answered_count, 'correct_count', s.correct_count,
             'title', case when s.qualified_for_reward then 'Mầm Nghề' end, 'qualified', s.qualified_for_reward,
             'reward_claimed', s.reward_claimed, 'reward_claimed_at', s.reward_claimed_at,
             'reward_claimed_by', s.reward_claimed_by)
           || case when p_include_answers then coalesce((
                select jsonb_object_agg('q' || a.question_index, a.selected_option_id || case when a.is_correct then ' (đúng)' else ' (sai)' end)
                from answers a where a.session_id = s.id), '{}') else '{}' end as j
    from players p join game_sessions s on s.player_id = p.id
    where (p_from is null or s.started_at >= p_from) and (p_to is null or s.started_at < p_to)
      and (p_status is null or s.status = p_status)
      and (p_score_min is null or s.correct_count >= p_score_min)
      and (p_score_max is null or s.correct_count <= p_score_max)
      and (p_prize is null or p_prize = case when s.reward_claimed then 'CLAIMED'
                                             when s.qualified_for_reward then 'UNCLAIMED'
                                             else 'NOT_ELIGIBLE' end)
  )
  select count(*), array_to_string(v_cols, ',') || E'\n' || coalesce(string_agg((
           select string_agg('"' || replace(coalesce(j->>c, ''), '"', '""') || '"', ',' order by o)
           from unnest(v_cols) with ordinality c(c, o)), E'\n' order by id), '')
    into v_rows, v_csv from r;

  v_filters := jsonb_build_object('from', p_from, 'to', p_to, 'status', p_status, 'score_min', p_score_min,
                                  'score_max', p_score_max, 'prize', p_prize, 'include_answers', p_include_answers);
  -- request_id lặp lại: không thêm audit, trả lại kết quả (tính lại trên dữ liệu hiện tại)
  insert into audit_logs (actor_id, actor_email, action, target_type, after_json, request_id)
  values (auth.uid(), auth.jwt()->>'email', 'report_exported', 'report',
          jsonb_build_object('filters', v_filters, 'fields', p_fields, 'row_count', v_rows), p_request_id)
  on conflict (request_id) do nothing;

  return _res(true, 'OK', null, jsonb_build_object('csv', v_csv, 'row_count', v_rows));
end $$;

revoke execute on function public.admin_export_report(timestamptz, timestamptz, text, int, int, text, text[], boolean, text) from public, anon;
grant execute on function public.admin_export_report(timestamptz, timestamptz, text, int, int, text, text[], boolean, text) to authenticated;
