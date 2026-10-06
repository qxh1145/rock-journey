-- Auth Admin must provision the dedicated shared user before enabling frontend login.
-- Resolve UUIDs from Auth data rather than hardcoding generated user IDs.
update public.shortcut_login_accounts c set user_id = u.id
from auth.users u
where c.email = u.email and u.email = 'honguyenvietanh1405@gmail.com'
  and u.raw_app_meta_data->>'shared_shortcut_player' = 'true';
insert into public.players (id, email_normalized, email_at_play, display_name)
select u.id, lower(u.email), u.email, 'Việt Anh'
from auth.users u join public.shortcut_login_accounts c on c.user_id = u.id
where u.email = 'honguyenvietanh1405@gmail.com'
on conflict (id) do nothing;
