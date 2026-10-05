---
type: initiative
title: "Nghệ nhân tạc đá ships to players and admins"
parent: none
covers: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20]
after: []
assignee: ""
risk: medium
---

# Nghệ nhân tạc đá ships to players and admins

## Description

The mobile-first quiz game "Nghệ nhân tạc đá" runs in production: players sign in with Google, play the 12-question carving journey once, and those scoring exactly 10/12 earn "Mầm Nghề" and a prize that admins hand out and audit. The PRD (v1.3) owns the requirements; the codebase already holds most of the player flow and schema.

## Outcome

Players complete the journey on their phones and every winner receives their prize exactly once, with an audit trail admins can export.

## Requirements

The PRD §7 ids FR-01…FR-20 are the source; see References.

## Done when

1. The game is live in production behind Google sign-in and passes the PRD §23 acceptance checklists.
2. A 30-concurrent-user load test on staging passes with no lost or duplicated answers (§25).
3. An admin can find any player by email and mark the prize given once, with an audit record.
4. Admins manage users, questions, playlist and prize status, and export filtered CSV (FR-17–20).
5. RLS is verified with separate player and admin accounts; no service_role key ships to the frontend.

## Boundaries

Capability-cut: platform, player game, prize desk, admin ops. Not leaderboard, multi-language, self-serve CMS or payments (PRD §3). Tracer path: the existing game deployed to staging via the new pipeline, then played end to end by one Google account.

- Touch point: Supabase Auth Google provider — configured, not built; owner: epic-platform-baseline

## References

- prd — PRD-nghe-nhan-tac-da.md, §7 (FR), §19 (RPCs), §20 (analytics), §21 (NFR), §23 (acceptance), §25 (test plan)
- code — web/src/main.tsx, supabase/migrations/

## Notes

- Decision: 4 epics in order platform → player game → prize desk → admin dashboard; prize desk kept separate to be usable early (user, 2026-10-05).
- Decision: cross-epic contracts (RPC error codes, admin-auth check, audit_logs shape) are settled as hitl stories in epic-platform-baseline rather than via bmad-architecture (user, 2026-10-05).
- Source conflict: §17 vs §18 — AuditLog fields differ (sessionId/metadata vs target_type/target_id); code follows §18.
- Source conflict: §17 — default role `player` vs code where admin_roles only allows 'admin'.
