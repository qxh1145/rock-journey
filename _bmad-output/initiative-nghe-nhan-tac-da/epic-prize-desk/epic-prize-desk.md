---
type: epic
title: "Prize desk"
parent: initiative-nghe-nhan-tac-da
covers: [FR-13, FR-14]
after: []
assignee: ""
risk: medium
---

# Prize desk

## Description

An admin on a phone looks up a player by email and marks their prize handed out — atomically, once, with an audit record — on top of the existing admin_search_players and admin_claim_reward RPCs.

## Outcome

Every Mầm Nghề winner receives their prize exactly once; the signal is zero double-claims in audit_logs.

## Done when

1. An admin finds a player by email and sees score, title and prize status.
2. Marking a prize given succeeds once; a second attempt, concurrent or not, is refused with a stable error code.
3. Each handout writes an audit_logs row.
4. A non-admin account cannot reach the screen or the RPCs.

## Boundaries

Admin lookup and prize handout UI plus its RPCs; introduces the admin shell reused by epic-admin-dashboard.

## References

- parent — PRD-nghe-nhan-tac-da.md, §7 and §23
- code — web/, supabase/migrations/

## Notes

- Waits on epic-platform-baseline because: needs the admin-auth check and audit_logs shape.
- Source conflict: §19 — admin_search_users paginated vs admin_search_players capped at 50.
