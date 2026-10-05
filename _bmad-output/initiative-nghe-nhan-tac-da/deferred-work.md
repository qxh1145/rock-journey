- source_plan: `_bmad-output/initiative-nghe-nhan-tac-da/epic-platform-baseline/story-decide-rpc-error-code-contract-plan.md`
  summary: Migrate RPCs and web client to the new NOT_FOUND / INVALID_INPUT / NOT_CONFIGURED codes listed under "Known misuse" in docs/rpc-error-codes.md.
  evidence: User chose precise codes (2026-10-05); this story only records the contract, migrations still return the overloaded codes.
- source_plan: `/Users/quan/Work/rock-journey/_bmad-output/initiative-nghe-nhan-tac-da/epic-platform-baseline/story-staging-environment-tracer-bullet-plan.md`
  summary: Polish the game animations (user found them not good enough during the staging phone test).
  evidence: User feedback 2026-10-05 after playing 12 questions on staging; feature work is outside the platform-baseline epic boundaries.
- source_plan: `/Users/quan/Work/rock-journey/_bmad-output/initiative-nghe-nhan-tac-da/epic-platform-baseline/story-staging-environment-tracer-bullet-plan.md`
  summary: Replace the accidental Production deploy at rock-journey.vercel.app (no env vars) when setting up production in story 5.
  evidence: First `vercel deploy` of the new project targeted Production; it serves the missing-config screen.
- source_plan: `/Users/quan/Work/rock-journey/_bmad-output/initiative-nghe-nhan-tac-da/epic-platform-baseline/story-staging-environment-tracer-bullet-plan.md`
  summary: Document in web/README.md that the Supabase CLI is linked to staging (ref awvaujmkbstkpsbaxpku) so a later db push does not surprise anyone.
  evidence: Only the plan file records the link; quick review flagged it.
- source_plan: `_bmad-output/initiative-nghe-nhan-tac-da/epic-platform-baseline/story-ci-cd-auto-deploy-plan.md`
  summary: Shared migrate-staging concurrency group can cancel another branch's pending staging migration.
  evidence: GitHub keeps one pending run per concurrency group; a push on branch A cancels branch B's queued migrate job while B's Vercel Preview still goes live.
- source_plan: `_bmad-output/initiative-nghe-nhan-tac-da/epic-player-game/story-save-state-indicator-and-safe-resend-plan.md`
  summary: Auto-retry with back-off for DATABASE_UNAVAILABLE/RATE_LIMITED on submit_answer while the browser is online.
  evidence: The only auto-resend is the window 'online' event; a server outage leaves the user on a manual retry.
- source_plan: `_bmad-output/initiative-nghe-nhan-tac-da/epic-player-game/story-save-state-indicator-and-safe-resend-plan.md`
  summary: E2E proving resend reuses the idempotency key (in-flight failure then replay → one answer row).
  evidence: The offline spec sends only one request, so answerCount===1 passes even if a new key is minted.
