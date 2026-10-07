# audit_logs shape

The single shape every audited action writes.

Source: PRD §17 (`AuditLog`) and §18 (`audit_logs`), plus decisions from 2026-10-05 (story "Decide audit_logs shape").

## Shape

The table in `supabase/migrations/20261005000000_init.sql` is the contract. Its columns match §18's, and no migration is needed. §18 also asks for an FK from `actor_id` to `auth.users`. That FK is deliberately left out (decision 2026-10-05), so `actor_id` is a plain `uuid`.

| Column | Type | Fill with |
|---|---|---|
| `id` | `bigint` identity | Leave it to the database. |
| `actor_id` | `uuid` | `auth.uid()` |
| `actor_email` | `text` | `auth.jwt()->>'email'`. It is kept so the entry still reads correctly if the account changes. |
| `action` | `text not null` | A past-tense `snake_case` verb, e.g. `reward_claimed` |
| `target_type` | `text` | The kind of thing acted on, e.g. `game_session`, `report`, `admin_role` |
| `target_id` | `text` | The target's id as text. Use null when there is no single target, as with an export. |
| `before_json` | `jsonb` | The target's state before the change. Use null for creates and read-only actions. |
| `after_json` | `jsonb` | The target's state after the change. For actions that change nothing, use the parameters and outcome instead (filters, row count, reason). |
| `created_at` | `timestamptz` | Leave it to the default, `now()`. |
| `request_id` | `text unique` | The caller's idempotency key. A reused key raises a unique violation and rolls back the whole RPC. New writers should check for "already done" before inserting. Today neither writer looks up `request_id`: `admin_claim_reward` only checks `reward_claimed`, and a retried `admin_export_report` that reuses its key fails. |

## Mapping from §17

| §17 `AuditLog` | Column |
|---|---|
| `auditId` | `id` |
| `actorId` | `actor_id` |
| `action` | `action` |
| `sessionId` | `target_type = 'game_session'`, `target_id = <session id>` |
| `before` / `after` | `before_json` / `after_json` |
| `createdAt` | `created_at` |
| `requestId` | `request_id` |
| `metadata` | goes in `after_json`. There is no separate column. |

## Rules

- Write the entry in the same transaction as the change, inside the `security definer` RPC. `audit_logs` has RLS enabled and no policies, so clients can neither read nor write it.
- Never update or delete an entry.
- Never put sensitive file contents or secrets in the JSON. For exports, record the filters and row count, not the CSV (PRD §16A).

## Writers (2026-10-05)

| RPC | Migration | `action` | `target_type` |
|---|---|---|---|
| `admin_claim_reward` | `20261005020000_drop_staff_role.sql` | `reward_claimed` | `game_session` |
| `admin_export_report` | `20261005000000_init.sql` | `report_exported` | `report` |
| `admin_reset_player_progress` | `20261007115652_admin_reset_player_progress.sql` | `player_progress_reset` | `game_session` |

Add a row to this table for every new writer. Grant, revoke and re-grant of admin rights are still owed entries (see [admin-auth.md](admin-auth.md)).
