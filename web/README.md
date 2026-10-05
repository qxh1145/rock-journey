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
