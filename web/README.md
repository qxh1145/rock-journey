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

## Environments

| | Supabase project | Vercel |
|---|---|---|
| Staging | `rock-journey-staging` (`awvaujmkbstkpsbaxpku`) | Preview deploys (any non-`main` branch push) |
| Production | `rock-journey` (`xmkkkuepzhgcqpjbzrwe`) | merge to `main` → https://rock-journey.vercel.app |

CI runs migrations; for a manual `supabase db push`, it goes to whichever project the CLI is linked to. From the repo root, run `cat supabase/.temp/project-ref` before pushing (missing = not linked), and switch with `supabase link --project-ref <ref>`.

## CI/CD

Every push runs `.github/workflows/deploy.yml`: SQL smoke tests + web build, then `supabase db push` to staging (any non-`main` branch) or production (`main`). Web deploys via the Vercel Git integration (branch → Preview, `main` → Production). Repo secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_DB_PASSWORD`, `SUPABASE_PROD_DB_PASSWORD`.
