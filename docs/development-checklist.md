# Development checklist

## Completed implementation stages

- [x] 1. Inspected the empty workspace and established the folder structure.
- [x] 2. Created shared tokens, glass surfaces, responsive layout, and typography.
- [x] 3. Created shared navigation, breadcrumbs, themes, dialogs, and notifications.
- [x] 4. Built demo login and role selection.
- [x] 5. Built Admin dashboard, Chart.js activity chart, stock breakdown, and recent deliveries.
- [x] 6. Built stock, cylinder breakdown, movements, source availability checks, and low-stock signals.
- [x] 7. Built customer list, details, and validated add form.
- [x] 8. Built delivery list, validated creation form, status workflow, timeline, and labeled OTP preview.
- [x] 9. Built payment entry, balances, and daily settlement review.
- [x] 10. Built staff list, profiles, and add/edit forms.
- [x] 11. Built report metrics, date ranges, line/bar/doughnut charts, and five CSV datasets.
- [x] 12. Built receipt list/detail, print styles, and settings.
- [x] 13. Built all six Delivery Boy screens.
- [x] 14. Connected shared fictional session records and explicit reset.
- [x] 15. Added focus states, inert closed mobile drawer, keyboard dialog behavior, labels, SVGs, motion preference handling, and narrow-screen refinements.
- [x] 16. Ran browser smoke tests, representative responsive checks, workflow tests, and integrity checks; repaired observed failures.
- [x] 17. Wrote setup instructions, page map, test report, and future backend plan.

## Tested

- [x] All 23 application pages render after final shared-code changes.
- [x] Nine representative screens inspected at 1440, 1024, 768, 390, and 320px for readiness and page-wide overflow.
- [x] Retested delivery details at all five widths after the OTP layout fix.
- [x] Customer creation/search and delivery creation/status timeline.
- [x] Payment entry and resulting receipt; settlement review and calculated difference.
- [x] Stock movement creation; staff creation/edit and filtering.
- [x] Pagination, status filtering, sorting, report date application, CSV serialization, and export button interaction.
- [x] Theme change, mobile drawer, reduced-animation setting, and data reset.
- [x] Invalid-email validation, demo-entry navigation, actual links, browser Back/Forward, profile menu, and notification feedback.
- [x] Chart.js rendering and isolated CDN-free fallback.
- [x] Simulated print stylesheet: white background, visible receipt, hidden navigation/header/heading.
- [x] Data references, prices, unique delivery IDs, twelve-stop day counts, inventory source bounds, escaping, and session reset.

## Limits and known issues

- No unresolved failure was observed in the final page smoke test. Browser logs retained the earlier stock syntax and receipt-table exceptions; both were repaired and did not recur on the final pass.
- Physical printing, an actual print-to-PDF output, real touch hardware, Safari/Firefox, OS-level reduced-motion switching, and a full screen-reader audit were not tested.
- Responsive QA used same-origin iframe viewports, not physical devices; it checked layout readiness and document overflow, not screenshot approval of every screen at every width.
- Header sample KPIs intentionally differ from detailed session totals; this is explained in the UI and README.
- Trend-chart series are fixed sample data. Record filters apply to metrics and CSV exports, not to invented historical chart values.
- This is a frontend demonstration. Demo status updates do not implement a complete transactional inventory ledger; production delivery/stock/payment reconciliation belongs in the backend phase.

## Future tasks

- [ ] Supabase Auth and verified agency memberships.
- [x] Prepared PostgreSQL schema, migrations, constraints, and agency RLS policy sources.
- [ ] Apply and validate those migrations against PostgreSQL/Supabase.
- [ ] Secure stock reservation/delivery/collection/settlement transactions.
- [ ] Server-generated OTP with provider delivery, limits, expiry, and audit trail.
- [ ] Durable agency records, pagination, search, and server-side reporting.
- [ ] Integration/security tests across agencies and roles; Android client reuse.

## Reference UI revision and backend preparation

- [x] Applied reference-inspired frosted glass, framed layout, sage/lavender accents, original cylinder illustration, circular shortcuts, and workspace/queue rail.
- [x] Kept all 23 pages and existing demo workflows.
- [x] Fixed theme event binding after shared-header rendering; added controls on login and role selection.
- [x] Verified actual button light/dark changes, reload persistence, and Settings synchronization.
- [x] Rechecked nine representative screens at all five target widths after the redesign.
- [x] Added 13-table Supabase schema with tenant foreign keys, RLS, and explicit grants.
- [x] Added six transactional backend operations and append-only delivery/stock/settlement history.
- [x] Added a disabled JavaScript REST/Auth adapter and tenant repository.
- [x] Passed mocked backend client/contract checks.
- [ ] Apply migrations to a development Supabase database; execute pgTAP integration tests.
- [ ] Connect actual authentication/session handling and live page view models.

Backend source preparation is complete. A working deployed backend, verified database policies, real OTP, and live frontend integration are still future tasks.

## Workflow and PRD iteration

- [x] Root PRD with roles, workflows, acceptance criteria, operating modes and release gates.
- [x] Shared operational layer and form bindings for receipts, booking, status changes, collections, customer/staff saves and settlement reviews.
- [x] Stock allocation/release, completion/empties, snapshot pricing, negative/duplicate/final-state guards.
- [x] Adjustment and empty-return forms; adjustment SQL migration source.
- [x] Customer outstanding balance report and daily closing/CSV output.
- [x] Connected runtime for authenticated data hydration and scoped write contracts; private records barred from demo persistence.
- [x] Connected login/role/agency selection and logout bindings; static hosting remains demo without broken API probes.
- [x] Seven local test suites pass; operational template/module checks pass.
- [ ] Real database migrations/RLS/concurrency tests and connected browser QA.
- [ ] Delivery-bound SMS/email OTP, database completion gate and real provider tests.
- [ ] Production password recovery, refund/reassignment edge cases, deployment/operations release gates.

See `docs/workflow-status.md`; remaining boxes are not reported as completed.
