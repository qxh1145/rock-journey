-- Reset exactly the selected session; retain player, lock state and immutable audits.
create function public.admin_reset_player_progress(p_session_id uuid, p_request_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s game_sessions; prior audit_logs; deleted_count integer; result jsonb;
begin
  if not _has_role('admin') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;
  if p_session_id is null or coalesce(length(trim(p_request_id)), 0) not between 8 and 100 then
    return _res(false, 'INVALID_REQUEST', 'Yêu cầu không hợp lệ');
  end if;
  -- Serialize retries before checking the immutable receipt, including requests for different targets.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id, 0));
  select * into prior from audit_logs where request_id = p_request_id;
  if found then
    if prior.actor_id = auth.uid() and prior.action = 'player_progress_reset'
       and prior.target_type = 'game_session' and prior.target_id = p_session_id::text then
      return _res(true, 'OK', null, prior.after_json);
    end if;
    return _res(false, 'CONFLICT', 'Mã yêu cầu đã được sử dụng');
  end if;
  -- Matches submit_answer's lock: no answer can race the scoped deletion.
  select * into s from game_sessions where id = p_session_id for update;
  if not found then return _res(false, 'CONFLICT', 'Lượt chơi đã thay đổi. Tìm lại người chơi.'); end if;
  delete from answers where session_id = s.id;
  get diagnostics deleted_count = row_count;
  delete from game_sessions where id = s.id;
  result := jsonb_build_object('session_id', s.id, 'player_id', s.player_id,
    'deleted_answer_count', deleted_count, 'status', 'NONE');
  insert into audit_logs(actor_id, actor_email, action, target_type, target_id, before_json, after_json, request_id)
  values(auth.uid(), auth.jwt()->>'email', 'player_progress_reset', 'game_session', s.id::text,
    to_jsonb(s), result, p_request_id);
  return _res(true, 'OK', null, result);
end $$;
revoke execute on function public.admin_reset_player_progress(uuid, text) from public, anon;
grant execute on function public.admin_reset_player_progress(uuid, text) to authenticated;
