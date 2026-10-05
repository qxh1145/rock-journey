---
type: epic
title: "Platform baseline"
parent: initiative-nghe-nhan-tac-da
covers: []
after: []
assignee: ""
risk: medium
---

# Platform baseline

## Description

The existing app and database deploy through CI to staging and production, with backups, observability and rate limits, and the contracts every later epic adopts are decided.

## Outcome

The team can ship any later epic to production safely; the signal is a green pipeline deploying the current game to staging.

## Done when

1. Repo on GitHub; CI runs smoke tests on every push.
2. A branch push auto-deploys web + migrations to staging; a merge to main auto-deploys to production.
3. Google OAuth redirect works on iOS Safari and Android Chrome in staging (§21).
4. Backups, correlation IDs, alerts and RPC rate limits are in place (§21).
5. RPC error codes, admin-auth check and audit_logs shape are decided and recorded.

## Boundaries

Infrastructure and cross-epic contracts only (PRD §21, §25); no feature work.

## References

- parent — PRD-nghe-nhan-tac-da.md, §7 and §23
- code — web/, supabase/migrations/

## Notes

- Waits on nothing; opening epic.
- Decision: no CI/CD — "no need ci/cd, keep it simple" (user, 2026-10-05). Superseded below.
- Decision: reversed — "dùng CI/CD để tự động deploy"; entry 9 adds auto deploy via Vercel Git integration + GitHub Actions for migrations (user, 2026-10-05).
- Assumption: GitHub + Actions as CI host (recommended earlier; not explicitly chosen).
- Decision: web hosted on Vercel (user, 2026-10-05).
- Decision: refactor sweep kept as closing story (user, 2026-10-05).
- Assumption: the existing Supabase project is production; staging is created in entry 4.
