-- Đồng bộ tên danh hiệu trong báo cáo xuất: 'Mầm Đá' -> 'Mầm Nghề'
create or replace function public.admin_export_report(p_status text default null, p_reward text default null, p_request_id text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_csv text; v_rows int;
begin
  if not _has_role('admin') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;
  -- p_reward: NOT_QUALIFIED | QUALIFIED_UNCLAIMED | CLAIMED
  with r as (
    select p.email_normalized, s.id, s.status, s.started_at, s.completed_at, s.answered_count, s.correct_count,
           s.qualified_for_reward, s.reward_claimed, s.reward_claimed_at, s.reward_claimed_by
    from players p join game_sessions s on s.player_id = p.id
    where (p_status is null or s.status = p_status)
      and (p_reward is null or p_reward = case when s.reward_claimed then 'CLAIMED'
                                               when s.qualified_for_reward then 'QUALIFIED_UNCLAIMED'
                                               else 'NOT_QUALIFIED' end)
  )
  select count(*),
         'email,session_id,status,started_at,completed_at,answered_count,correct_count,title,qualified,reward_claimed,reward_claimed_at,reward_claimed_by' || E'\n' ||
         coalesce(string_agg(concat_ws(',',
           '"' || replace(email_normalized, '"', '""') || '"', id, status, started_at, completed_at,
           answered_count, correct_count, case when qualified_for_reward then 'Mầm Nghề' end,
           qualified_for_reward, reward_claimed, reward_claimed_at, reward_claimed_by), E'\n'), '')
    into v_rows, v_csv from r;

  insert into audit_logs (actor_id, actor_email, action, target_type, after_json, request_id)
  values (auth.uid(), auth.jwt()->>'email', 'report_exported', 'report',
          jsonb_build_object('status', p_status, 'reward', p_reward, 'row_count', v_rows), p_request_id);

  return _res(true, 'OK', null, jsonb_build_object('csv', v_csv, 'row_count', v_rows));
end $$;

revoke execute on function public.admin_export_report(text, text, text) from public, anon, authenticated;
grant execute on function public.admin_export_report(text, text, text) to authenticated;
