-- Explicitly public shared-player login; table is editable only by backend/admin SQL.
create table public.shortcut_login_accounts (
  email text primary key check (email = 'honguyenvietanh1405@gmail.com'),
  user_id uuid unique references auth.users(id) on delete set null,
  enabled boolean not null default false
);
alter table public.shortcut_login_accounts enable row level security;
revoke all on public.shortcut_login_accounts from public, anon, authenticated;
grant select, update on public.shortcut_login_accounts to service_role;
insert into public.shortcut_login_accounts (email, enabled)
values ('honguyenvietanh1405@gmail.com', true);
