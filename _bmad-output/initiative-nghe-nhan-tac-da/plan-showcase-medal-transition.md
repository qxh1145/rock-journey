---
title: 'Open earned medal explicitly from showcase'
type: 'bugfix'
ticket: ''
created: '2026-10-06'
status: 'built'
baseline_revision: '1eae201345c6c0c48109f1b50d4f7bf1a6562983'
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

**Problem:** Clicking the showcase results/prize CTA only navigates to result. Automatic medal opening is gated by persisted seen-session state, so an explicit completion action can fail to celebrate an earned MAM_NGHE title.

**Approach:** Explicitly open the earned medal on the showcase CTA regardless of the seen flag. Preserve existing reload suppression after dismissal, manual reopening and server-provided qualification. Play the medal audio when the overlay mounts so navigation and automatic opening cannot duplicate the sound.

</frozen-after-approval>

## Implementation Notes

- Oneshot: small main.tsx transition and MedalOverlay.tsx effect changes. Production SQL inspection confirms submit_answer uses _session_json and returns MAM_NGHE for qualified sessions. No database writes or qualification changes.
- At 10/12 with MAM_NGHE and a preexisting seen marker, showcase CTA must show the dialog and play badge audio once. Without MAM_NGHE it must show results without a dialog. Dismissal/reload must not automatically replay; manual reopening must play once.
- Implemented explicit showcase transition in main.tsx and moved badge playback into MedalOverlay mount effect. Existing automatic opening and seen-state persistence remain.

## Verification

- Production build and focused browser reproduction with local mocked responses and saved seen markers; no real user accounts or backend changes.
- Build passed. Browser reproduction through Q12 submission, showcase and CTA passed for 10/12 with and without saved seen marker: dialog present, audio once, dismissal successful, manual reopening audio once. 9/12 produced no dialog or badge audio. Audio playback was instrumented, not acoustically measured.

## Review Triage Log

- Quick review found no actionable issues. No deferred findings.
