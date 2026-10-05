---
title: 'Music sheet to spec'
type: 'feature'
ticket: '6'
created: '2026-10-06'
status: 'built'
baseline_revision: 'fd6f81653d4e8fc89fd9f452876874476f5febd6'
route: 'oneshot'
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

**Problem:** FR-12/CAP-6 call for music that starts on the first user gesture. The code instead defaults music to off (`web/src/audio.ts` `loadPrefs`). The music sheet (`web/src/components/MusicSheet.tsx`) neither traps focus nor returns it to the Đổi nhạc button, and nothing tests the audio prefs that stories 4 and 8 will read.

**Approach:** Default `music: true` and export the prefs API (`loadPrefs`/`savePrefs`/`DEFAULT_PREFS`) from `audio.ts`. Add a focus trap, Escape to close, and focus restore to the opener in `MusicSheet`. Cover it with a Vitest prefs test and a Playwright spec that mocks the playlist request and records `HTMLMediaElement.play` calls to prove: music plays after the first tap, focus returns on close, and the track choice survives a reload.

</frozen-after-approval>

## Implementation Notes

Oneshot: the playback, playlist, toggles and persistence already exist in `audio.ts`/`MusicSheet.tsx`. Only the default, the focus handling and the tests are missing, roughly 100 lines in total. Known limit: players who already have `music:false` saved under `rock-journey-audio` keep music off, because `savePrefs` ran on mount before this change. That's acceptable before launch.

## Verification

**Commands:**
- `cd web && npm test` -- expected: exit 0, prefs tests pass
- `cd web && npm run typecheck && npm run build` -- expected: exit 0
- `cd web && npm run e2e` (staging env set) -- expected: all passed, including the music spec

## Review Triage Log

- medium (patched): the first-tap e2e passed even without a tap, because Chromium allows autoplay. The spec now rejects `play()` until a pointerdown happens and asserts the music is silent before the tap.
- medium (patched): Safari/iOS doesn't focus a button on click, so the saved opener was `<body>`. `TopBar` now focuses Đổi nhạc explicitly before it opens the sheet.
- low (rejected): Escape has no `preventDefault`. There is no other Escape handler in the app, so nothing breaks today.
- low (rejected): after the reload, only the checked state of "Bài hai" is asserted, not its playback. The AC (choice survives reload) is met, and adding a playback check costs more than it proves.
- false (outside the diff): untracked commercial mp3s in `web/public/audio/music/` belong to the user's working tree. This change did not stage them.
