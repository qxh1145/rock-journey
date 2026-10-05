-- nút "Chơi lại" chỉ dành cho một tài khoản thử nghiệm; kiểm tra email ở server, không tin client
create function public.replay_session()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_user auth.users;
begin
  if v_uid is null then return _res(false, 'UNAUTHENTICATED', 'Chưa đăng nhập'); end if;
  select * into v_user from auth.users where id = v_uid;
  if lower(v_user.email) is distinct from 'quandeptraixuhue@gmail.com' or v_user.email_confirmed_at is null then
    return _res(false, 'FORBIDDEN', 'Không có quyền');
  end if;
  delete from answers where session_id in (select id from game_sessions where player_id = v_uid);
  delete from game_sessions where player_id = v_uid;
  return _res(true, 'OK', null);
end $$;

revoke all on function public.replay_session() from public, anon;
grant execute on function public.replay_session() to authenticated;
