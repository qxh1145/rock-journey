---
title: 'Export prize list to CSV and XLSX'
type: 'feature'
ticket: '3'
created: '2026-10-06'
status: 'built'
baseline_revision: '5ca9162623685c662f36681691ee4d5523503bee'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admins can't get the qualified or claimed player list out of the system to reconcile prize handouts offline.

**Approach:** Add an "Xuất danh sách" section to the admin shell. It calls the existing `admin_export_report` RPC with a reward filter and downloads the result as UTF-8 CSV (with a BOM so Excel reads it correctly) and as .xlsx. A migration fixes the RPC's stale title, `'Mầm Đá'`, to `'Mầm Nghề'`.

## Boundaries & Constraints

**Always:** the RPC stays the single source of rows and the audit (`report_exported`). FORBIDDEN goes to `onForbidden()`. File-export helpers live in their own module so epic-admin-dashboard entry 8 can reuse them. Vietnamese text must survive in both formats.

**Decision:** .xlsx is written with the `write-excel-file` dependency (browser build), lazy-imported on click.

**Never:** build rows client-side from other RPCs, add pagination, or change the CSV column set.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| CSV export | filter CLAIMED, admin | `prize-list-claimed-YYYYMMDD.csv` downloads, BOM + RPC csv | — |
| XLSX export | filter QUALIFIED_UNCLAIMED | `.xlsx` with the same header and rows | — |
| Empty result | no matching rows | file with header only, plus "0 dòng" status | — |
| Non-admin | role ≠ admin | no file | `onForbidden()` |
| RPC failure | network/other code | no file | `role=alert` message |
| Quoted fields | email containing `,` or `"` | parsed correctly into XLSX cells | — |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261005000000_init.sql:364-401` -- `admin_export_report(p_status,p_reward,p_request_id)` returns `{csv,row_count}` and already audits. Copy the body unchanged except the title literal.
- `supabase/migrations/20261005010000_title_mam_nghe.sql` -- the earlier rename that missed this function.
- `supabase/tests/smoke.sql:29-38` -- psql `do $$ assert` style. The run command is on line 1.
- `web/src/admin/AdminApp.tsx:8-10` -- the `adminSections` registry (`{id,label,render({onForbidden})}`).
- `web/src/admin/LookupSection.tsx` -- reference for the `callRpc`, FORBIDDEN, `message()` and CSS-class patterns.
- `web/src/game` `callRpc<T>` -- returns `{ok,code,message,data}`.
- `web/src/admin/admin.test.tsx` -- mocks `../game` callRpc. Follow it.

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/migrations/20261006020000_export_title_mam_nghe.sql` -- `create or replace` `admin_export_report` with the title `'Mầm Nghề'`, and re-grant -- stale title.
- [ ] `supabase/tests/smoke.sql` -- assert: for CLAIMED and QUALIFIED_UNCLAIMED, `row_count` equals the matching count from game_sessions. Each call adds one `report_exported` audit row. A non-admin gets FORBIDDEN.
- [ ] `web/src/admin/fileExport.ts` -- `downloadCsv(name, csv)` (BOM + Blob + anchor click), `parseCsv(text)` (RFC4180) and `downloadXlsx(name, rows)` -- reusable export helpers.
- [ ] `web/src/admin/ExportSection.tsx` -- reward filter select (QUALIFIED_UNCLAIMED / CLAIMED / all qualified) plus CSV and XLSX buttons, with busy, status and error states.
- [ ] `web/src/admin/AdminApp.tsx` -- register the section.
- [ ] `web/src/admin/export.test.tsx` -- matrix cases: parseCsv quoting, FORBIDDEN, error, and the right RPC params.

**Acceptance Criteria:**
- Given an admin, when they export CSV for CLAIMED, then the opened file shows the Vietnamese titles intact in Excel.
- Given an admin, when they export XLSX, then Excel opens it without a repair prompt and it shows the same rows as the CSV.

## Implementation Notes

## Plan Change Log

## Review Triage Log

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | "All qualified" merge inserts blank row when first call is empty | medium | patch | RPC returns header + `E'\n'` + `''` for 0 rows, so `slice(nl)` appends after a trailing newline. |
| 2 | File-name date is UTC | low | patch | `toISOString` is UTC; exports before 07:00 ICT get the previous day. One-line fix. |
| 3 | Blob URL revoked synchronously after click | low | patch | Known Safari download cancellation; helper is reused by dashboard entry 8. |
| 4 | Spreadsheet formula injection via email | medium (unverified) | defer | Emails may start with `-`/`+`/`=`; neutralizing changes RPC output, which intent fixes as the single source. |
| 5 | Test matrix gaps (RPC-shaped empty/merge) | low | patch | Folded into #1's added test. |
| 6 | Smoke audit count is global, not delta | low | reject | Deterministic in this smoke script; no earlier exports run. |

## Design Notes

"All qualified" means calling the RPC twice (QUALIFIED_UNCLAIMED + CLAIMED) and concatenating the rows under one header. Both calls are audited.

## Verification

**Commands:**
- `dropdb --if-exists rj_test && createdb rj_test && psql rj_test -v ON_ERROR_STOP=1 -f supabase/tests/stub_auth.sql $(printf -- '-f %s ' supabase/migrations/*.sql) -f supabase/tests/smoke.sql` -- expected: exit 0
- `cd web && npm test && npx tsc --noEmit` -- expected: pass

**Manual checks (if no CLI):**
- On staging, open both files in Excel. Vietnamese text should display correctly.

