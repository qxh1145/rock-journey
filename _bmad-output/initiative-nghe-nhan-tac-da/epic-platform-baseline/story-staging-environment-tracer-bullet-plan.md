---
title: 'Staging environment (tracer bullet)'
type: 'chore'
ticket: '4'
created: '2026-10-05'
status: 'in-progress'
baseline_revision: '1de96b4975aca78447cd4a4a4cef029694896d3e'
route: 'oneshot'
route_source: 'auto'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: ['{project-root}/web/README.md', '{project-root}/supabase/config.toml']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no staging environment: only an existing Supabase project (assumed production) and local dev, so nothing can be tested end to end on real phones before production.

**Approach:** Create a new Supabase project as staging, push `supabase/migrations/` to it, enable Google OAuth with the staging callback, and deploy `web/` to a Vercel preview whose env points at staging. The repo is already a git repo on GitHub (`qxh1145/rock-journey`), so "git init" is done.

</frozen-after-approval>

## Implementation Notes

Oneshot: almost no code changes. The work is external setup (Supabase, Google Cloud, Vercel) plus at most a `web/README.md` section on staging. `signInWithOAuth` already redirects to `window.location.origin` (`web/src/main.tsx:134`), so preview URLs only need to be allow-listed in staging's Auth redirect URLs (wildcard `https://*-<team>.vercel.app/**`).

Steps (human-in-the-loop, outward-facing):
1. `supabase projects create rock-journey-staging` (needs user's org + region + DB password), then `supabase link --project-ref <staging>` and `supabase db push`.
2. Google Cloud: OAuth client (Web) with redirect `https://<staging-ref>.supabase.co/auth/v1/callback`; put client id/secret in staging Auth > Google.
3. Staging Auth: Site URL = Vercel preview URL; redirect allow-list adds the Vercel preview wildcard.
4. Vercel: install CLI, `vercel link` in `web/`, set `VITE_SUPABASE_URL`/`VITE_SUPABASE_KEY` for the Preview environment only, `vercel deploy` (not `--prod`).
5. Re-link CLI back to nothing/production is left to story 5; do not push migrations to the existing project here.

## Verification

**Commands:**
- `supabase migration list --linked` -- expected: all 3 local migrations applied remotely on staging
- `curl -sI <preview-url>` -- expected: HTTP 200

**Manual checks (if no CLI):**
- One Google account signs in and plays all 12 questions on iOS Safari and on Android Chrome against the preview URL.

### Progress (2026-10-05)
- Staging Supabase: `rock-journey-staging`, ref `awvaujmkbstkpsbaxpku`, ap-south-1 (same region as prod `xmkkkuepzhgcqpjbzrwe`). DB password in gitignored `supabase/.temp/staging-db-password`. CLI now linked to staging.
- 3 migrations pushed + `seed.sql` (questions, playlist) via `db push --include-seed`.
- Google provider + redirect wildcard `https://*.vercel.app/**` set by user in dashboard (CLI token not readable from the agent session).
- Vercel project `rock-journey` linked in `web/` (`web/.gitignore` gained `.vercel`, `.env*` from `vercel link`). Preview env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (publishable, `--type config`; Vercel refuses Secret type for `VITE_`).
- Surprise: the first `vercel deploy` of a new project went to Production (`rock-journey.vercel.app`) with no prod env vars, so it shows the missing-env screen. Story 5 owns production; redeploy there.
- Preview: `https://rock-journey-cvi0voprh-qxh1145s-projects.vercel.app` returns 302 (Vercel Deployment Protection), so phones need protection off for previews or a shareable link.
