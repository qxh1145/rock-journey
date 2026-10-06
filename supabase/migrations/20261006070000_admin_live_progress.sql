-- Bảng tiến độ trực tiếp: lượt IN_PROGRESS (tối đa 200), mới hoạt động nhất trước. Client poll 5 s.
create function public.admin_live_progress(
  p_from timestamptz default null, p_to timestamptz default null, p_status text default null,
  p_score_min int default null, p_score_max int default null, p_prize text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not _has_role('admin') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;
  if p_status is not null and p_status not in ('IN_PROGRESS', 'COMPLETED')
     or p_prize is not null and p_prize not in ('NOT_ELIGIBLE', 'UNCLAIMED', 'CLAIMED')
     or p_score_min > p_score_max then
    return _res(false, 'INVALID_INPUT', 'Bộ lọc không hợp lệ');
  end if;
  return _res(true, 'OK', null, coalesce((
    select jsonb_agg(jsonb_build_object('session_id', id, 'email', email, 'answered', answered_count,
             'correct', correct_count, 'current_idx', answered_count + 1, 'last_activity', last_activity)
             order by last_activity desc, email)
    from (
      select s.id, p.email_normalized email, s.answered_count, s.correct_count,
             coalesce((select max(a.answered_at) from answers a where a.session_id = s.id), s.started_at) last_activity
      from game_sessions s join players p on p.id = s.player_id
      where s.status = 'IN_PROGRESS'  -- p_status khác IN_PROGRESS cho kết quả rỗng
        and (p_from is null or s.started_at >= p_from) and (p_to is null or s.started_at < p_to)
        and (p_status is null or s.status = p_status)
        and (p_score_min is null or s.correct_count >= p_score_min)
        and (p_score_max is null or s.correct_count <= p_score_max)
        and (p_prize is null or p_prize = case when s.reward_claimed then 'CLAIMED'
                                               when s.qualified_for_reward then 'UNCLAIMED'
                                               else 'NOT_ELIGIBLE' end)
      order by last_activity desc, email limit 200) x), '[]'::jsonb));
end $$;

revoke execute on function public.admin_live_progress(timestamptz, timestamptz, text, int, int, text) from public, anon;
grant execute on function public.admin_live_progress(timestamptz, timestamptz, text, int, int, text) to authenticated;
