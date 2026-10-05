---
title: 'Test harness and tracer journey'
type: 'feature'
ticket: '2'
created: '2026-10-05'
status: 'in-progress'
baseline_revision: '2d41bcd6576351a7f1c27997c4eeaf07fb308bce'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The player flow has no automated tests. Every later player story (medal screens, music sheet, §23 suite) needs a browser harness to prove itself, and "answers survive a reload" (FR-08/FR-09) is not checked anywhere.

**Approach:** Add Vitest (unit) and Playwright (mobile 390x844) to `web/`, plus one journey test against the staging Supabase project: sign in as a throwaway player, answer Q1, reload, and assert the app resumes at Q2. Run it in CI after `migrate` on non-main branches.

## Boundaries & Constraints

**Always:** Tests run against the staging Supabase project `awvaujmkbstkpsbaxpku`, never prod. Secrets come only from env/GitHub secrets, never committed. Each run uses a fresh identity, because `game_sessions.player_id` is unique (one play per identity), and deletes it afterwards, even when the test fails.

**Decisions:** Sign-in uses a service-role key (new secret `SUPABASE_STAGING_SERVICE_ROLE_KEY`) to create a confirmed throwaway user per run, with the session obtained via `admin.generateLink` + `verifyOtp`; staging auth settings unchanged. Playwright hits a local `vite preview` of `web/` built against staging Supabase (Playwright `webServer`), not a Vercel deploy.

**Never:** No app code changes, no data-testid additions (use roles and Vietnamese text), no new RPCs or migrations, no real Google OAuth in tests, no k6 (that's the load-test story).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Fresh confirmed user, session injected | Title `Câu 1/12` → pick option, submit, `Tiếp tục câu 2` → reload → title `Câu 2/12` | No error expected |
| Missing secrets | `SUPABASE_STAGING_SERVICE_ROLE_KEY` unset | Journey fails fast with a clear message naming the missing var | Do not skip silently |
| Test fails mid-run | Assertion error after user created | Throwaway user still deleted in teardown | Teardown logs but does not mask the original failure |

</frozen-after-approval>

## Code Map

- `web/package.json` -- scripts dev/build/preview/typecheck; no test deps. Add `test` (vitest run) and `e2e` (playwright test).
- `web/vite.config.ts` -- react plugin only; add a Vitest `test` block here (no separate config file).
- `web/src/lib/supabase.ts` -- createClient with default storage key, so the session lives at localStorage `sb-awvaujmkbstkpsbaxpku-auth-token`. Injecting a session there skips the Google button.
- `web/src/main.tsx:40-59` -- `loadCurrentRoute`: `getSession()` → `get_current_session` → `start_session` on `NONE`. This is how resume works.
- `web/src/screens/PlayScreen.tsx` -- title `Câu N/12` (TopBar), `role="radiogroup"` with `role="radio"` options, submit `button.primary`, then `Tiếp tục câu {n}`.
- `web/src/game.ts` -- `optText`, `readStore`/`writeStore`: pure helpers, good first Vitest target.
- `supabase/migrations/20261005000000_init.sql:166` -- `start_session` requires `email_confirmed_at`, so the admin-created user must be confirmed.
- `.github/workflows/deploy.yml` -- jobs `smoke` → `migrate` (staging on non-main). Secrets so far: `SUPABASE_ACCESS_TOKEN` and the DB passwords; there is no service-role key yet.
- Do not touch: `supabase/`, `web/src/**` app code, `style.css`.

## Tasks & Acceptance

**Execution:**
- [ ] `web/package.json` -- add devDeps `vitest`, `@playwright/test`; scripts `test`, `e2e` -- harness
- [ ] `web/vite.config.ts` -- Vitest `test` block (environment node, include `src/**/*.test.ts`) -- unit runner
- [ ] `web/src/game.test.ts` -- one test for `optText` -- proves Vitest is wired
- [ ] `web/playwright.config.ts` -- one project with viewport 390x844, isMobile, testDir `e2e`, `webServer` = build + `vite preview`, baseURL from it -- mobile harness
- [ ] `web/e2e/staging-auth.ts` -- with the service role: create a confirmed throwaway user, obtain a session, return it; delete the user (and its game_session) in cleanup -- test identity
- [ ] `web/e2e/journey.spec.ts` -- inject the session into localStorage via `addInitScript`, then run the happy path from the matrix -- tracer journey
- [ ] `.github/workflows/deploy.yml` -- job `e2e` (needs `migrate`, non-main only): Node 22, `npm ci`, `npx playwright install --with-deps chromium`, `npm run e2e` with the staging secrets -- CI gate
- [ ] `web/README.md` -- how to run `test`/`e2e` locally and the required env vars -- onboarding

**Acceptance Criteria:**
- Given `web/`, when `npm test` runs, then Vitest exits 0.
- Given the staging secrets in env, when `npm run e2e` runs locally, then the journey passes and no throwaway user remains in staging auth.
- Given a push to a non-main branch, when the workflow runs, then the `e2e` job runs after `migrate` and passes.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Verification

**Commands:**
- `cd web && npm test` -- expected: exit 0
- `cd web && npm run build` -- expected: exit 0
- `cd web && npm run e2e` (staging env set) -- expected: 1 passed

**Manual checks (if no CLI):**
- Staging Auth users list has no `e2e-*` users after a run.
- CI is currently blocked by the GitHub billing lock (commit 332ca42). If it's still locked, AC 3 can only be verified once it's lifted.
