---
title: 'Ctrl Shift P shared player login'
type: 'feature'
ticket: ''
created: '2026-10-06'
status: 'built'
baseline_revision: 'bfd71bca5a8454790ce892c804d93a49687fcf5b'
route: 'oneshot'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The user explicitly requests a production keyboard shortcut that logs into honguyenvietanh1405@gmail.com without Google/email verification interaction, plus provisioning the user and a database table. The account does not currently exist in production.

**Approach:** Provision a dedicated shared player account and a service-only shortcut configuration table. On the logged-out login screen only, Ctrl+Shift+P calls a fixed-account public Edge Function and installs the issued Supabase session. No OAuth or email interaction. Supabase still issues valid signed sessions so RPC/RLS work. User was told anyone knowing the shortcut can access this shared account; this is explicitly requested public access, not an administrative impersonation feature. Disable gateway JWT checking for this specific endpoint as requested. Never expose service credentials, accept arbitrary accounts, grant admin role, or disable authentication elsewhere.

</frozen-after-approval>

## Implementation Notes

- Oneshot: compact Edge Function, SQL configuration, keyboard effect and pending CTA state.
- Fixed email allowlist, non-user-editable app_metadata marker and active-admin denial constrain the endpoint to the dedicated shared player. Public endpoint access is intentional; CORS only controls browser origin and is not authorization.
- Use supported Auth Admin provisioning rather than manually forging auth.users/identities rows. SQL provisions configuration and an application player row can be inserted from the created Auth user.
- Gate event listener by screen=landing and user=null; prevent repeated requests, remove on transition, and ignore late responses after leaving login. Loading/error messages must remain actionable.
- Config row has RLS with no public policies and no anon/authenticated privileges. Administrators can disable it with SQL enabled=false. Backend Auth verification remains; only manual identity-verification steps are skipped.
- Provisioned Auth user with supported Admin API and server-owned shared_shortcut_player marker, confirmed config mapping, then removed lazy provisioning from final Edge function before publishing frontend. Added SQL player row and mapping migration using email/metadata lookup.
- Production function deployed with verify_jwt=false as authorized; its service-role key remains environment-only. Account has no admin role.

## Verification

- Web build, SQL checks of table RLS/grants, production Auth user/identity and absence of admin role.
- Endpoint accepts fixed-account login, rejects other origins/non-POST/disabled config/admin account. No session tokens or admin keys printed.
- Browser: shortcut from login installs correct session; repeat key sends once; outside login sends nothing; regular Google login remains available. Verify production deployment and actual Ctrl+Shift+P login.
- Web build passed. Mocked browser repeated-key check: one invoke and one session installation; logged-in gate produced no extra calls. Real backend session validated /auth/v1/user email and authenticated role, get_current_session returned ok/NONE. GET rejected 405; other origin and disabled config rejected 403; request-body email ignored and fixed account preserved.
- SQL confirms RLS enabled, anon SELECT false, authenticated UPDATE false, service-role UPDATE true. Advisor INFO for no policies is intentional deny-all; pre-existing function-search-path/security-definer/password warnings are unrelated to this change.

## Review Triage Log

- medium, patch: lazy Auth creation followed by failed config UPDATE could leave permanent retry failures. Provisioned and confirmed user first; final endpoint now requires config user_id and contains no create path. Follow-up quick review found no actionable issues.
