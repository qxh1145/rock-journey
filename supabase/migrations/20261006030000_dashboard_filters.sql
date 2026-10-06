-- Dashboard nhận bộ lọc admin dùng chung; thêm resume_count để tính tỉ lệ quay lại (chỉ đếm từ lúc deploy)
alter table public.game_sessions add column resume_count int not null default 0;

-- giống bản cũ, chỉ thêm: tăng resume_count khi người chơi mở lại lượt IN_PROGRESS (nên bỏ "stable")
create or replace function public.get_current_session()
returns jsonb language plpgsql security definer set search_path = public as $$
declare s game_sessions;
begin
  if auth.uid() is null then return _res(false, 'UNAUTHENTICATED', 'Chưa đăng nhập'); end if;
  select * into s from game_sessions where player_id = auth.uid();
  if not found then return _res(true, 'NONE', 'Chưa có lượt'); end if;
  if s.status = 'IN_PROGRESS' then
    update game_sessions set resume_count = resume_count + 1 where id = s.id;
  end if;
  return _res(true, s.status, null, _session_json(s) || jsonb_build_object('question', _current_question(s)));
end $$;

drop function public.admin_get_dashboard(timestamptz, timestamptz);

create function public.admin_get_dashboard(
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
  return _res(true, 'OK', null, (
    with f as (
      select * from game_sessions
      where (p_from is null or started_at >= p_from) and (p_to is null or started_at < p_to)
        and (p_status is null or status = p_status)
        and (p_score_min is null or correct_count >= p_score_min)
        and (p_score_max is null or correct_count <= p_score_max)
        and (p_prize is null or p_prize = case when reward_claimed then 'CLAIMED'
                                               when qualified_for_reward then 'UNCLAIMED'
                                               else 'NOT_ELIGIBLE' end)
    )
    select jsonb_build_object(
      'total',       count(*),
      'in_progress', count(*) filter (where status = 'IN_PROGRESS'),
      'completed',   count(*) filter (where status = 'COMPLETED'),
      'resume_rate', round(avg((resume_count > 0)::int), 2),
      'avg_score',   round(avg(correct_count) filter (where status = 'COMPLETED'), 2),
      'eligible',    count(*) filter (where qualified_for_reward),
      'unclaimed',   count(*) filter (where qualified_for_reward and not reward_claimed),
      'claimed',     count(*) filter (where reward_claimed))
    from f
  ));
end $$;

revoke execute on function public.admin_get_dashboard(timestamptz, timestamptz, text, int, int, text) from public, anon;
grant execute on function public.admin_get_dashboard(timestamptz, timestamptz, text, int, int, text) to authenticated;
