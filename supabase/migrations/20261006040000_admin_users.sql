-- Danh sách người dùng (lọc + phân trang 20/trang) và chi tiết một người dùng cho admin; không ghi audit khi xem
create function public.admin_search_users(
  p_q text default null, p_from timestamptz default null, p_to timestamptz default null, p_status text default null,
  p_score_min int default null, p_score_max int default null, p_prize text default null, p_page int default 1)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_filtered boolean := num_nonnulls(p_from, p_to, p_status, p_score_min, p_score_max, p_prize) > 0;
  v_total int; v_rows jsonb;
begin
  if not _has_role('admin') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;
  if p_status is not null and p_status not in ('IN_PROGRESS', 'COMPLETED')
     or p_prize is not null and p_prize not in ('NOT_ELIGIBLE', 'UNCLAIMED', 'CLAIMED')
     or p_score_min > p_score_max
     or p_page is null or p_page < 1 then
    return _res(false, 'INVALID_INPUT', 'Bộ lọc không hợp lệ');
  end if;

  with u as (
  select p.id, p.email_normalized, p.display_name, p.locked, s.status, s.correct_count, s.answered_count,
         s.started_at, s.completed_at,
         case when s.id is null then null when s.reward_claimed then 'CLAIMED'
              when s.qualified_for_reward then 'UNCLAIMED' else 'NOT_ELIGIBLE' end as prize
  from players p left join game_sessions s on s.player_id = p.id
  where (p_q is null or p.email_normalized like '%' || replace(replace(lower(trim(p_q)), '%', '\%'), '_', '\_') || '%')
    and (not v_filtered or s.id is not null)
    and (p_from is null or s.started_at >= p_from) and (p_to is null or s.started_at < p_to)
    and (p_status is null or s.status = p_status)
    and (p_score_min is null or s.correct_count >= p_score_min)
    and (p_score_max is null or s.correct_count <= p_score_max)
    and (p_prize is null or p_prize = case when s.reward_claimed then 'CLAIMED'
                                           when s.qualified_for_reward then 'UNCLAIMED'
                                           else 'NOT_ELIGIBLE' end)
  )
  select (select count(*) from u), coalesce(jsonb_agg(jsonb_build_object(
      'player_id', id, 'email', email_normalized, 'display_name', display_name, 'locked', locked,
      'status', coalesce(status, 'NONE'), 'correct_count', correct_count, 'answered_count', answered_count,
      'started_at', started_at, 'completed_at', completed_at, 'prize', prize) order by email_normalized), '[]'::jsonb)
    into v_total, v_rows
  from (select * from u order by email_normalized limit 20 offset (p_page - 1) * 20) x;
  return _res(true, 'OK', null, jsonb_build_object('total', v_total, 'page', p_page, 'page_size', 20, 'rows', v_rows));
end $$;

create function public.admin_get_user_detail(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p players; s game_sessions;
begin
  if not _has_role('admin') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;
  select * into p from players where id = p_user_id;
  if not found then return _res(false, 'NOT_FOUND', 'Không tìm thấy người dùng'); end if;
  select * into s from game_sessions where player_id = p.id;
  return _res(true, 'OK', null, jsonb_build_object(
    'profile', jsonb_build_object('player_id', p.id, 'email', p.email_normalized, 'display_name', p.display_name,
      'locked', p.locked, 'first_seen_at', p.first_seen_at, 'last_seen_at', p.last_seen_at),
    'session', case when s.id is null then null else _session_json(s) || jsonb_build_object(
      'started_at', s.started_at, 'completed_at', s.completed_at, 'resume_count', s.resume_count,
      'reward_claimed_at', s.reward_claimed_at, 'reward_note', s.reward_note) end,
    'answers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'question_index', a.question_index, 'prompt', q.prompt,
        'selected_text', (select o->>'text' from jsonb_array_elements(q.options) o where o->>'id' = a.selected_option_id),
        'is_correct', a.is_correct, 'answered_at', a.answered_at) order by a.question_index)
      from answers a join questions q on q.set_version = s.question_set_version and q.id = a.question_id
      where a.session_id = s.id), '[]'::jsonb)));
end $$;

revoke execute on function public.admin_search_users(text, timestamptz, timestamptz, text, int, int, text, int) from public, anon;
grant execute on function public.admin_search_users(text, timestamptz, timestamptz, text, int, int, text, int) to authenticated;
revoke execute on function public.admin_get_user_detail(uuid) from public, anon;
grant execute on function public.admin_get_user_detail(uuid) to authenticated;
