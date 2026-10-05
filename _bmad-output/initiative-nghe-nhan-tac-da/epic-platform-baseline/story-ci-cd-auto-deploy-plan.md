---
title: 'CI/CD auto deploy'
type: 'chore'
ticket: '9'
created: '2026-10-05'
status: 'built'
baseline_revision: '54493266f544f73700623c4d2018e86315853530'
route: 'oneshot'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/web/README.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Deploys are manual: migrations need `supabase link` + `db push` by hand per environment, and nothing runs the smoke tests before code reaches staging or production.

**Approach:** Keep the already-connected Vercel Git integration for web (branch push → Preview/staging env, `main` → Production). Add one GitHub Actions workflow that, on every push, runs the SQL smoke tests and the web build, then `supabase db push` to staging (non-main branches) or production (`main`).

</frozen-after-approval>

## Implementation Notes

Oneshot: one ~50-line workflow file plus a README line; the rest is secrets the user sets.

- Vercel Git integration is already live (branch pushes produced Preview deploys; Root Directory = `web`). No Vercel change.
- Smoke: `supabase/tests/smoke.sql` header gives the command; run against a `postgres` service container: `stub_auth.sql`, `migrations/*.sql`, `smoke.sql`, `ON_ERROR_STOP=1`. Web: `npm ci && npm run build` in `web/`.
- Migrate job `needs` smoke; `supabase/setup-cli`, `supabase link --project-ref <ref> -p $DB_PASSWORD`, `supabase db push` (no `--include-seed`; both DBs are seeded). Refs are public: staging `awvaujmkbstkpsbaxpku`, prod `xmkkkuepzhgcqpjbzrwe`.
- Secrets (user sets via `gh secret set`): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_DB_PASSWORD`, `SUPABASE_PROD_DB_PASSWORD`.
- `concurrency` per target DB so two pushes never migrate at once.
- Known ceiling: Vercel builds web in parallel with the migrate job, so a new frontend can be live a minute before its migration. Fine while migrations are additive.

### Progress (2026-10-05)
- Added `.github/workflows/deploy.yml` (smoke + migrate jobs) and a CI/CD section in `web/README.md`.
- Local smoke run not possible: local Postgres cluster already has `anon` role, `stub_auth.sql` assumes a fresh cluster (CI container is fresh). YAML parses.
- Pending (user): set the 3 repo secrets, then push to see staging run.

## Verification

**Commands:**
- `gh run list --limit 2` after a branch push -- expected: workflow success, migrate step targets staging
- `gh run list --branch main --limit 1` after merge -- expected: success, migrate targets prod

**Manual checks (if no CLI):**
- Vercel shows a Preview deploy for the branch and a Production deploy after merge, no CLI deploy run.

## Review Triage Log

Pass 1 (quick): high 0, medium 2, low 4, false 1.
- medium — patched: `on: push` also fired on tags and migrated staging; now `branches: ['**']`.
- medium — deferred: shared `migrate-staging` concurrency group lets a newer branch push cancel another branch's pending staging migration (shows "cancelled").
- low — patched: `db push --yes` so CI never waits on a prompt.
- low — patched: `smoke.sql` header glob passed only the first migration to `-f`; now matches CI.
- low — patched: README Environments table still described manual `vercel` deploys and said "any branch".
- low — rejected: unpinned `setup-cli` version; rare breakage, pin when it bites.
- false: verification not yet run — pending secrets, recorded in Progress, not a defect.
