-- Bỏ role staff: admin đảm nhận tra cứu người chơi và ghi nhận trao quà
delete from public.admin_roles where role = 'staff';
alter table public.admin_roles drop constraint admin_roles_role_check;
alter table public.admin_roles add constraint admin_roles_role_check check (role = 'admin');

create or replace function public._has_role(p_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_roles where user_id = auth.uid() and active and role = p_role)
$$;

drop function public.staff_search_players(text);
drop function public.staff_claim_reward(uuid, text, text);

create function public.admin_search_players(p_email text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not _has_role('admin') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;
  return _res(true, 'OK', null, coalesce((
    select jsonb_agg(jsonb_build_object(
      'player_id', p.id, 'email', p.email_normalized,
      'session_id', s.id, 'status', coalesce(s.status, 'NONE'),
      'correct_count', s.correct_count, 'answered_count', s.answered_count,
      'completed_at', s.completed_at,
      'qualified_for_reward', coalesce(s.qualified_for_reward, false),
      'reward_claimed', coalesce(s.reward_claimed, false),
      'reward_claimed_at', s.reward_claimed_at) order by p.email_normalized)
    from (select * from players
          where email_normalized like '%' || replace(replace(lower(trim(p_email)), '%', '\%'), '_', '\_') || '%'
          order by email_normalized limit 50) p
    left join game_sessions s on s.player_id = p.id
  ), '[]'::jsonb));
end $$;

create function public.admin_claim_reward(p_session_id uuid, p_request_id text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s game_sessions; v_before jsonb;
begin
  if not _has_role('admin') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;

  select * into s from game_sessions where id = p_session_id for update;
  if not found then return _res(false, 'CONFLICT', 'Không tìm thấy lượt'); end if;
  if s.reward_claimed then return _res(true, 'ALREADY_CLAIMED', 'Đã nhận quà trước đó', _session_json(s)); end if;
  if not s.qualified_for_reward then return _res(false, 'FORBIDDEN', 'Không đủ điều kiện', _session_json(s)); end if;

  v_before := _session_json(s);
  update game_sessions set reward_claimed = true, reward_claimed_at = now(),
         reward_claimed_by = auth.uid(), reward_note = p_note, row_version = row_version + 1
  where id = s.id returning * into s;

  insert into audit_logs (actor_id, actor_email, action, target_type, target_id, before_json, after_json, request_id)
  values (auth.uid(), auth.jwt()->>'email', 'reward_claimed', 'game_session', s.id::text, v_before, _session_json(s), p_request_id);

  return _res(true, 'OK', null, _session_json(s));
end $$;

revoke execute on function public.admin_search_players(text), public.admin_claim_reward(uuid, text, text) from public, anon;
grant execute on function public.admin_search_players(text), public.admin_claim_reward(uuid, text, text) to authenticated;
