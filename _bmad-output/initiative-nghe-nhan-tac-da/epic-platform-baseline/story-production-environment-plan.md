---
title: 'Production environment'
type: 'chore'
ticket: '5'
created: '2026-10-05'
status: 'built'
baseline_revision: '9ee4e660cc563801bacc14fa12c07dd1b706beac'
route: 'oneshot'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/web/README.md', '{project-root}/supabase/config.toml']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Production has no working deploy: `rock-journey.vercel.app` was created by story 4's first deploy with no env vars, and the existing Supabase project has not been confirmed or migrated as production.

**Approach:** Link the existing Supabase project (`xmkkkuepzhgcqpjbzrwe`, confirmed production by the user 2026-10-05) and push the 3 migrations, set Production-scope Vercel env vars to it, enable Google OAuth with production redirects, and `vercel --prod`.

</frozen-after-approval>

## Implementation Notes

Oneshot: no app code. External setup plus a short `web/README.md` note on which project the CLI is linked to (deferred from story 4).

Steps (human-in-the-loop, outward-facing):
1. `supabase link --project-ref xmkkkuepzhgcqpjbzrwe` (needs prod DB password from the user), `supabase migration list --linked` to see drift, then `supabase db push`. Seed only if the prod tables are empty and the user agrees.
2. Vercel Production env: `VITE_SUPABASE_URL=https://xmkkkuepzhgcqpjbzrwe.supabase.co`, `VITE_SUPABASE_KEY` = prod publishable key (`supabase projects api-keys`), `--type config` as in story 4.
3. Prod Auth (dashboard, user): Google provider on (Google client redirect `https://xmkkkuepzhgcqpjbzrwe.supabase.co/auth/v1/callback`), Site URL `https://rock-journey.vercel.app`, allow-list exactly that origin.
4. `vercel --prod` from `web/`.
5. Re-link CLI to staging afterwards? No: leave it on prod and say so in the README.

### Progress (2026-10-05)
- Vercel Production env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (prod publishable, `--type config`).
- User linked CLI to prod and set prod Auth (Google provider, Site URL, allow-list) in the dashboard.
- Prod had no tables from migrations; `db push --include-seed` applied all 3 + seed (user approved).
- `vercel --prod`: https://rock-journey.vercel.app returns 200; bundle references `xmkkkuepzhgcqpjbzrwe`.
- `supabase migration list --linked` after push: all 3 applied remotely.
- `web/README.md` gained an Environments table + "check linked ref before push" note. CLI is left linked to prod.

## Verification

**Commands:**
- `supabase migration list --linked` -- expected: all 3 local migrations applied on prod
- `curl -sI https://rock-journey.vercel.app` -- expected: HTTP 200

**Manual checks (if no CLI):**
- One Google account signs in and plays at `https://rock-journey.vercel.app`.

## Review Triage Log

Pass 1 (quick): high 0, medium 0, low 2, false 1.
- low — patched: README `cat supabase/.temp/project-ref` is root-relative but sits in `web/README.md`; now says "from the repo root" and what a missing file means.
- low — rejected: README OAuth line doesn't name a project; docs-only, the new table already maps environments.
- false: migration check unrecorded — `migration list --linked` showed all 3 remote after push (now in Progress). Manual Google sign-in on prod is pending the user.
