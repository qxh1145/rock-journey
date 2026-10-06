---
title: 'Temporary flat mobile-first question cards'
type: 'feature'
ticket: ''
created: '2026-10-07'
status: 'built'
baseline_revision: 'c97342874f3da9ae20965edfdb3d1ba1a5562789'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
context: []
---

<frozen-after-approval reason="human-owned intent">
## Intent
Replace the playing screen's notebook presentation temporarily with flat div cards and selectable buttons. Prioritize mobile readability, clear selection and correct/incorrect feedback. Preserve answer submission, retry and progress behavior, and existing user edits.
</frozen-after-approval>

## Implementation Notes
Small presentation change implemented directly. Replace Notebook use in PlayScreen and scope responsive layout to the playing screen. Retain the transition lifecycle with a short fade so input unlocks normally. Existing dirty files are authorized context for the requested edit; preserve their previous changes.

## Plan Change Log

## Review Triage Log
- Medium, patch: fixed overlays scrolled with transformed phone. Use transform-free centering; verified sheet/backdrop remain anchored after scrolling.
- Medium, patch: :has(.play) matched music buttons on result screen. Scope to direct .screen.play; verified result keeps original transform.

## Verification
Production build and all 7 unit tests passed. Local Playwright fixtures passed at 320×568, 390×844 and 480×900, covering selection, long content, feedback and transition unlocking; reduced motion passed. Final screenshot visually checked. No staging writes performed.
- Run production build and existing unit tests.
- Check flat cards at narrow and standard mobile widths, long answers, selected/disabled controls, feedback, and next-question unlocking using local browser fixtures without external writes.

### Production integration (2026-10-07)
Applied onto origin/main 7b3cd14, preserving newer gate, account, music and admin features. Opening animation now fades the compact mascot and question cards while retaining intro input lock and completion callback. Production integration build and all 34 tests pass; local mobile fixtures verify intro unlock, answer and next question at 320/390/480px.
