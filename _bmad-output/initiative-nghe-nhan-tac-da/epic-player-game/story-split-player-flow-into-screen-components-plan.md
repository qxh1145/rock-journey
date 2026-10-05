---
title: 'Split player flow into screen components'
type: 'refactor'
ticket: '1'
created: '2026-10-05'
status: 'built'
baseline_revision: '332ca429471597332c3b07ebf0e3b713bccfd852'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The whole player flow (state, RPC calls, every screen, mascot, music sheet, medal overlay) lives in one 388-line `web/src/main.tsx`, so every later player story would edit the same file and parallel lanes would conflict.

**Approach:** Move each screen and widget into its own file as a presentational component that takes props. `App` in `main.tsx` keeps all state, effects and handlers. This is a pure move with no behaviour change.

## Boundaries & Constraints

**Always:** Rendered DOM, class names, aria attributes, Vietnamese copy, sfx calls and their timing stay identical. All state, effects, `callRpc` calls and handlers (`loadCurrentRoute`, `reload`, `signIn`, `signOut`, `submitAnswer`, `next`) stay in `App`. Typecheck and build pass under the existing `strict` + `noUnusedLocals` config.

**Never:** No new dependencies, no state library or context, no router, no CSS changes, no renamed copy, no logic fixes (known issues such as FR-12 music start belong to later stories). Do not touch `audio.ts`, `lib/supabase.ts`, `style.css` or `supabase/`.

</frozen-after-approval>

## Code Map

- `web/src/main.tsx` -- current monolith. Lines 8–50: types, constants, storage helpers, `callRpc`. 52–305: `App` with all state and screen JSX. 307–386: `optText`, `carveCaption`, `Notebook`, `DUST`, `Mascot`, `MusicSheet`. 388: render root.
- `web/src/audio.ts` -- `sfx`, `useMusic`, `Track`. Reuse as is.
- `web/src/lib/supabase.ts` -- `supabase` client. Reuse as is.
- `web/tsconfig*.json` -- `strict`, `noUnusedLocals`, `noUnusedParameters`. Every moved import must be used.

## Tasks & Acceptance

**Execution:**
- [ ] `web/src/game.ts` -- move the types (`Screen`, `Stage`, `Option`, `Question`, `AnswerFeedback`, `GameState`, `RpcResponse`, `PendingAnswer`), `STAGES`, the storage keys, `CONFLICT`, `readStore`/`writeStore`/`removeStore`, `message`, `callRpc` and `optText`, and export them -- one shared module for both logic and screens
- [ ] `web/src/components/Notebook.tsx` -- move `Notebook` -- notebook page shell
- [ ] `web/src/components/Mascot.tsx` -- move `Mascot`, `DUST` and `carveCaption` -- carve
- [ ] `web/src/components/MusicSheet.tsx` -- move `MusicSheet` -- music
- [ ] `web/src/components/TopBar.tsx` -- `TopBar` (the former `header()` helper) plus `AvatarMenu` (the `menuOpen` dropdown). Props: title, showAvatar, user, menuOpen, onToggleMenu, onOpenMusic, onSignOut -- avatar
- [ ] `web/src/components/MedalOverlay.tsx` -- the badge overlay with an `onClose` prop -- medal
- [ ] `web/src/screens/StartScreen.tsx` -- landing JSX. Props: error, onSignIn -- start
- [ ] `web/src/screens/PlayScreen.tsx` -- playing JSX, including the feedback page, question radios, tear stack and bottom bar. Receives game, answeredQuestion, selected, submitting, waitingSync, statusMessage, carving, torn and the callbacks. Builds `feedbackPage` itself and passes it to `onNext` -- notebook
- [ ] `web/src/screens/ResultScreen.tsx` -- result JSX. Props: game, onShowMedal, onSignOut, plus TopBar props -- result
- [ ] `web/src/main.tsx` -- keep `App` (state, effects, handlers), the loading/setup/error branches and the render root; compose the new components -- the orchestrator stays in one place

**Acceptance Criteria:**
- Given the refactor, when `npm run build` runs in `web/`, then it exits 0 with no type errors.
- Given local dev signed in with a fresh account, when the player goes from landing → sign-in → 12 questions (with both right and wrong answers) → result, then every screen, caption, carve animation, page tear, sound, music sheet, avatar menu and medal overlay looks and behaves as it does on the baseline revision.
- Given a pending unsynced answer in localStorage, when the page reloads, then the selection and the "chưa được xác nhận" message are restored as before.
- Given the new files, then `main.tsx` holds no screen JSX besides loading, setup and error, and each of start, notebook, carve, music, medal, result and avatar lives in its own file.

## Implementation Notes

## Plan Change Log

## Review Triage Log

| Finding | Verdict | Evidence |
|---|---|---|
| TopBar lacks `onSignOut`; `AvatarMenu` is a separate export rendered at `main.tsx` root | false | The baseline renders `.menu` as a root sibling of `.phone`. Putting it inside `TopBar` would move it into `<header>`, which breaks the intent's identical-DOM rule. Avatar code still lives in `components/TopBar.tsx`. Rejected. |

## Design Notes

`next()` reads `feedbackPage` to build the torn page. Keep that by having PlayScreen call `onNext(feedbackPage)`, and App's `next(page)` uses the argument instead of a closure. This is the only signature change. Keep the `Notebook key={question_id}` and the `torn` `key` so remount behaviour is identical.

## Verification

**Commands:**
- `cd web && npm run build` -- expected: exit 0
- `grep -c "screen ===" web/src/main.tsx` -- expected: each screen branch is now a one-line component call

**Manual checks (if no CLI):**
- `npm run dev`, then play the full journey in a mobile viewport alongside a checkout of the baseline revision, and compare screen for screen.
