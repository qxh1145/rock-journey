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
