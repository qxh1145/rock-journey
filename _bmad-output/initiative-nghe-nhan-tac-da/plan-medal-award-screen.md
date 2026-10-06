---
title: 'Match the medal award screen to Figma'
type: 'bugfix'
ticket: ''
created: '2026-10-06'
status: 'built'
baseline_revision: '509494afeb2e3d37f2328e23b85570e3b3b40bd0'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The user reports that the medal award screen in the attached image is missing. Existing MedalOverlay markup and routing exist, but the locally converted badge has transparent margins that shrink the medal inside its Figma slot, body text is 16px instead of 17px, and opening the overlay immediately marks it as seen even before dismissal.

**Approach:** Match Figma frame 7:2 using its original medal asset in the 250×289 slot at (70,226), a 94% dark overlay, the centered caption at y557 and the white Continue button at y711. Retain the completed result underneath and the existing MAM_NGHE qualification rule, first-view award and manual replay. Mark the award as seen on Continue, keep keyboard focus inside the modal and restore it on dismissal. Respect reduced motion.

</frozen-after-approval>

## Implementation Notes

- Small correction to existing React components, CSS and local imagery; estimated under 100 changed source lines.
- Existing unrelated changes in TopBar.tsx, avatar asset and planning files are excluded from this change.
- Reuse ResultScreen, MedalOverlay, local-storage helpers and existing button tokens. No backend changes.
- Implemented original 690×800 Figma PNG, correct 17px caption and explicit 94% dim. Added single-button keyboard focus containment, Escape dismissal, restored focus and no zoom with reduced motion.
- Award seen-state now records on dismissal; overlay rendering is scoped to a qualified result screen.

## Verification

- Run the web production build for TypeScript and bundling checks.
- Inspect the requested overlay at 390×844 using local browser rendering and the Figma reference; check asset geometry, Continue, keyboard focus and reduced motion.
- Production build passed. Browser inspection of actual app with a local mocked completed-player response confirmed badge bounds (70,226,250,289), caption 17px, reduced-motion animation none, Continue dismissal, reload suppression and manual reopening. No live account or backend was changed.
- Visual artifact: /Users/quan/.codex/visualizations/2026/10/06/01a1117f-6dfc-7903-9fd2-606b7e44db02/medal-award.png. Underlying TopBar differs from reference due to existing unrelated changes.

## Review Triage Log

- Quick reviewer inspected the scoped diff and callers; no actionable findings. No deferred findings.
