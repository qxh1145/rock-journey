---
type: epic
title: "Admin dashboard & ops"
parent: initiative-nghe-nhan-tac-da
covers: [FR-17, FR-18, FR-19, FR-20]
after: []
assignee: ""
risk: medium
---

# Admin dashboard & ops

## Description

Admins get a dashboard of users and progress, CRUD for users, questions, playlist and prize status with audit, and filtered CSV export, including the five missing §19 admin RPCs.

## Outcome

Ops can run the event without database access; the signal is admins completing §23 admin checks unaided.

## Done when

1. Dashboard shows users and progress (FR-17, FR-18).
2. CRUD for users, questions, playlist and prize status works, each change audited (FR-19).
3. CSV export with filters matches the dashboard (FR-20).
4. Non-admins are refused by every admin RPC.

## Boundaries

Admin dashboard, CRUD and export within the admin shell from epic-prize-desk.

## References

- parent — PRD-nghe-nhan-tac-da.md, §7 and §23
- code — web/, supabase/migrations/

## Notes

- Waits on epic-platform-baseline because: needs admin-auth, audit_logs shape and error codes.
- Waits on epic-prize-desk because: reuses its admin shell.
- Source conflict: §19 — anonymize/lock action vs code with only players.locked.
- Decision (2026-10-06): admin shell stays owned by epic-prize-desk; this epic's first story waits on it.
- Decision (2026-10-06): schema gaps (players anonymize/soft-delete, question draft/archive) are closed by migrations inside the CRUD stories that need them, no spike.
- Decision (2026-10-06): closing story is a Refactor sweep only; §23 admin e2e suite declined.
- Decision (2026-10-06): tracer bullet is entry 1 (dashboard KPIs); it owns the shared filter shape and admin nav slot. Lanes after it: 2→3→4, 5, 6, 7, 8→9.
- Decision (2026-10-06): Source conflict §19 anonymize/lock settled — players.locked stays the lock flag; anonymized_at/deleted_at added in entry 3.
- Decision (2026-10-06): §16A dashboard alerts deferred until telemetry exists.
- Decision (2026-10-06): admin_get_user_detail writes no read-audit row; only changes and exports are audited.
- Decision (2026-10-06): exporting detailed answers needs only the admin's explicit opt-in, audited; no separate permission.
- Decision (2026-10-06): entry 11 adds a live progress board; it polls an admin RPC every few seconds instead of using Supabase Realtime, so no admin RLS on game_sessions is needed.
