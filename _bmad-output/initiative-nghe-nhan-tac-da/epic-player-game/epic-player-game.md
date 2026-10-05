---
type: epic
title: "Player game to spec"
parent: initiative-nghe-nhan-tac-da
covers: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11, FR-12, FR-15, FR-16]
after: []
assignee: ""
risk: medium
---

# Player game to spec

## Description

The existing player flow in web/src/main.tsx is brought to the PRD: every FR checked against §23, gaps closed, analytics (§20) added, and the flow covered by tests.

## Outcome

Players finish the 12-question journey on mobile without lost progress; the signal is the §23 player checklist passing in production.

## Done when

1. Every player item in §23 passes on staging and production.
2. 30-concurrent-user load test on staging: no lost or duplicated answers, one play per identity holds.
3. RLS tests with a player account cannot read others' data or admin RPCs.
4. §20 analytics events fire for the full journey.

## Boundaries

Player-facing web and player RPCs. Not admin UI (epic-prize-desk, epic-admin-dashboard).

## References

- parent — PRD-nghe-nhan-tac-da.md, §7 and §23
- code — web/, supabase/migrations/

## Notes

- Waits on epic-platform-baseline because: needs the staging pipeline and error-code contract.
- Source conflict: FR-12 — music required vs code defaulting music off.
- Source conflict: mascot stage enum vs int 0–6 in game_sessions (minor; RPCs map it).
- Decision (2026-10-05): open with a behaviour-preserving split of web/src/main.tsx into per-screen components so lanes can run in parallel.
- Decision (2026-10-05): FR-12 wins — music starts on the first user gesture; toggle still works. Resolves the FR-12 source conflict.
- Decision (2026-10-05): load and RLS test stories record failures as bugs in backlog/; the spec's no-backend-change non-goal stands.
- Decision (2026-10-05): tests use Vitest (unit), Playwright (mobile journey), k6 (load).
- Decision (2026-10-05): story 2 is the tracer bullet; story 1 is the enabling split before it.
- Decision (2026-10-05): split showcase (7) from medal and result (14).
- Decision (2026-10-05): breakdown of 14 stories approved; open unknowns stay on stories 2 (staging test sign-in) and 11 (analytics provider).
