---
title: 'Play L’AMOUR DE MA VIE on special account login'
type: 'bugfix'
ticket: ''
created: '2026-10-06'
status: 'built'
baseline_revision: '506f4c4e252267c94561e3eda61a0145572cd9d0'
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

**Problem:** The special account only bypasses the default queue. It does not select L’AMOUR DE MA VIE, and saved track/mute preferences override playback. Ctrl+Shift+P authentication itself works.

**Approach:** On entry into honguyenvietanh1405@gmail.com, explicitly select the existing Billie Eilish MP3, enable music, reset queue index and clear previous finale. This overrides saved track/music preferences on account entry; subsequent music controls remain usable. It applies to shortcut login, regular login and session restoration. Keep SFX preferences and ordinary-account behavior.

</frozen-after-approval>

## Implementation Notes

- Oneshot: optional loginTrack argument to useMusic, one account-specific song constant and main account mapping.
- Exact encodeURI URL matches existing local MP3 and playlist migration. Explicit login song remains selectable even before playlist arrives or if playlist omits it.
- Rule is exclusively normalized account email, as clarified by user; it is independent of Ctrl+Shift+P or Google login method.

## Verification

- Build and focused browser with old saved song, music off: shortcut installs account, music becomes enabled and requested MP3 plays. Check other account/default behavior and that pausing after login remains possible.
- Build passed. Browser with a mocked authenticated account and real MP3 playback: old Evil track/music off overridden; requested Billie MP3 paused=false/currentTime>0; SFX=false preserved. Empty playlist also retained song. With loaded playlist, subsequent pause worked. No account/server changes.

## Review Triage Log

- Quick review: no actionable findings. Ordinary users keep default queue and saved preferences; explicit song is keyed by account email only.
