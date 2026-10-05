# Admin-auth check

Who counts as an admin, and how every RPC and screen checks it.

Source: PRD §14 and §17 (`AdminRole`), plus decisions from 2026-10-05 (story "Decide admin-auth check").

## Rule

A caller is an **admin** only if `admin_roles` has a row with:

- `user_id = auth.uid()`
- `active = true`
- `role = 'admin'`, which is the only value the column allows

A Google sign-in alone grants nothing. A **player** is any authenticated user who has no such row. The PRD's "default role `player`" means exactly that, so no row and no `role` value ever stores `player`.

## Server check (the authority)

- Every `admin_*` RPC is `security definer`, granted to `authenticated` only, and starts with:

  ```sql
  if not _has_role('admin') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;
  ```

- `_has_role` is defined in `supabase/migrations/20261005020000_drop_staff_role.sql`. It is `security definer`, and clients cannot execute it.
- `admin_roles` has RLS enabled and no policies, so clients can neither read nor write it.
- Denial returns `FORBIDDEN`, as described in [rpc-error-codes.md](rpc-error-codes.md).

## Client

The client may hide admin screens, using the `FORBIDDEN` result of an admin RPC as its signal. Hiding a screen is cosmetic only. The RPC check is the only thing that enforces access.

## Granting and revoking

- **Grant:** no grant RPC exists yet, so an operator uses the service role to insert a row with `granted_by` set. Users can never grant themselves admin.
- **Revoke:** set `active = false` and stamp `revoked_at`. Never delete the row. The check reads only `active`. `revoked_at` exists for audit.
- **Re-grant:** `user_id` is the primary key, so re-granting updates the existing row (set `active = true`, update `granted_by` and `granted_at`, clear `revoked_at`). The row holds only the latest grant, and the full history has to come from `audit_logs`.
- Requirement for whoever adds a grant/revoke RPC: every grant, revoke and re-grant must write an `audit_logs` entry. Nothing writes these entries today.

## Compliance (2026-10-05)

| RPC | Migration | Guard first |
|---|---|---|
| `admin_get_dashboard` | `20261005000000_init.sql` | yes |
| `admin_export_report` | `20261005000000_init.sql` | yes |
| `admin_search_players` | `20261005020000_drop_staff_role.sql` | yes |
| `admin_claim_reward` | `20261005020000_drop_staff_role.sql` | yes |

Add a row to this table for every new `admin_*` RPC.
