-- Cho phép email bichtramnbk63@gmail.com được chơi lại vô hạn lần (cùng quandeptraixuhue@gmail.com)
create or replace function public.replay_session()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_user auth.users;
begin
  if v_uid is null then return _res(false, 'UNAUTHENTICATED', 'Chưa đăng nhập'); end if;
  select * into v_user from auth.users where id = v_uid;
  if coalesce(lower(trim(v_user.email)), '') not in ('quandeptraixuhue@gmail.com', 'bichtramnbk63@gmail.com') or v_user.email_confirmed_at is null then
    return _res(false, 'FORBIDDEN', 'Không có quyền');
  end if;
  delete from answers where session_id in (select id from game_sessions where player_id = v_uid);
  delete from game_sessions where player_id = v_uid;
  return _res(true, 'OK', null);
end $$;
