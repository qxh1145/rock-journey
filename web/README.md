# Nghệ nhân tạc đá — web client

React + TypeScript + Vite frontend using Supabase Auth, PostgreSQL RPCs, and the active music playlist from the existing Supabase project.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set the Supabase URL and publishable (or legacy anon) key.
3. Start the app with `npm run dev` (http://127.0.0.1:3000).

The local Supabase Auth `site_url` already uses port 3000. Configure Google OAuth in Supabase before signing in. The frontend only uses a publishable/anon key; never put a service-role key in a `VITE_` variable.

## Scripts

- `npm run dev` — Vite development server
- `npm run typecheck` — TypeScript project check
- `npm run build` — TypeScript check and production build
- `npm run preview` — preview the production build
- `npm test` — Vitest unit tests
- `npm run e2e` — Playwright mobile (390x844) journey against the **staging** Supabase project

### e2e

Needs `npx playwright install chromium` once, plus env vars (never commit them):

- `VITE_SUPABASE_KEY` — staging publishable/anon key
- `SUPABASE_STAGING_SERVICE_ROLE_KEY` — staging service-role key; used only by the test to create and delete a confirmed `e2e-*` throwaway user per run

The app is built and served with `vite preview` against `awvaujmkbstkpsbaxpku` (URL is fixed in `playwright.config.ts`).

### Load test

`load/journey.k6.js` runs 30 concurrent throwaway players through the full game on **staging** (with a duplicate `start_session` race and a duplicate `submit_answer` race), then counts DB rows and deletes every user it created.

1. `brew install k6` (k6 >= 0.48)
2. Export `SUPABASE_ANON_KEY` (staging publishable/anon key) and `SUPABASE_STAGING_SERVICE_ROLE_KEY` (never commit them).
3. From the repo root: `k6 run load/journey.k6.js`

Pass = exit 0 with `checks` 100%, `lost_answers` 0, `dup_violations` 0. On failure, teardown logs the offending player ids; a human files them as backlog bugs from that output. Leftover users (aborted run) match `load-%@example.com`.

## Environments

| | Supabase project | Vercel |
|---|---|---|
| Staging | `rock-journey-staging` (`awvaujmkbstkpsbaxpku`) | Preview deploys (any non-`main` branch push) |
| Production | `rock-journey` (`xmkkkuepzhgcqpjbzrwe`) | merge to `main` → https://rock-journey.vercel.app |

CI runs migrations; for a manual `supabase db push`, it goes to whichever project the CLI is linked to. From the repo root, run `cat supabase/.temp/project-ref` before pushing (missing = not linked), and switch with `supabase link --project-ref <ref>`.

## CI/CD

Every push runs `.github/workflows/deploy.yml`: SQL smoke tests + web build, then `supabase db push` to staging (any non-`main` branch) or production (`main`). Web deploys via the Vercel Git integration (branch → Preview, `main` → Production). Repo secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_DB_PASSWORD`, `SUPABASE_PROD_DB_PASSWORD`, `SUPABASE_STAGING_PUBLISHABLE_KEY`, `SUPABASE_STAGING_SERVICE_ROLE_KEY` (the last two feed the non-`main` `e2e` job).
