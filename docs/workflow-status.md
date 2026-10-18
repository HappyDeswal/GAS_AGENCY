# Workflow implementation status

Product contract: [PRD.md](../PRD.md). This matrix records code and test status, not production certification.

| Workflow | Implemented in this iteration | Verification / remaining work |
| --- | --- | --- |
| Sign-in/session | Connected login handler, role/agency selection, HttpOnly server session, refresh and logout navigation | Mocked server contracts pass; real Auth/password recovery is not verified and recovery UI remains a demo |
| Customer/staff | Shared operations; connected metadata adapter and admin-scoped API | Mocked routing passes; actual database validation and user provisioning need configured Supabase |
| Inventory | Receipts, adjustment form/reason, empty-return form, source checks, movement entries; connected operations | Demo tests pass; adjustment SQL migration is prepared, not executed |
| Booking | Active customer/staff checks, availability, allocation, booking-price snapshot, request key retained on retry | Demo booking/allocation and connected request mapping pass |
| Delivery | Valid transitions, completion inventory effects/empty exchange, cancellation release, final-state/idempotent guards | Demo workflow passes; live completion is blocked by server and prepared database trigger pending OTP integration |
| Collections | Completed deliveries only, price snapshot, duplicate-paid rejection; connected collection operation | Demo chain and API contract tests pass; no real money transfer integration |
| Receipts | Confirmed collection creates eligibility; snapshots determine amounts; existing print flow | Template checks pass; current browser/print output not reverified |
| Settlement | Cash validation, correct date/staff identity, review/reopen status; connected review operation | Demo chain passes; database concurrency and SQL behavior remain unverified |
| Reporting | Customer balances, daily full-stock/cash reconciliation, date ranges and CSV exports | Calculation/render checks pass; physical browser QA outstanding |
| OTP | SMS/email provider adapters, explicit unavailable state, connected completion lock | No real SMS/email or durable delivery challenge; database completion lock prepared but not executed; provider tests use mocks |

## How to use each mode

- **Static HTTP server:** continues the fictional frontend demo; no API probing or connection fallback.
- **Native application server, unconfigured:** serves the same demo.
- **Native application server with Supabase environment configured:** enables connected login, session checks, data hydration and supported operational/metadata requests. A protected-page failure does not substitute demo records. Connected records stay in memory and cannot be written to demo storage.

The connected operational adapter is `assets/js/backend/runtime.js`; business rules are centralized in `assets/js/workflow.js`. The native server marks HTML responses so ordinary static hosting does not issue broken `/api/status` requests. The UI supports the first active membership and an agency chooser when multiple memberships are available.

## Remaining release gates

1. Configure Supabase, apply all migrations in order, provision test memberships and execute the database/security/concurrency suites.
2. Finish password recovery and verify all connected form behavior with real authorized records.
3. Implement durable, delivery-bound challenges and mandatory SMS/email verification, including expiry, resend/attempt limits, single use, and database-level completion enforcement.
4. Keep live completion disabled until those gates pass. Apply migration 004 to close direct RPC completion; keep its database lock until delivery-bound OTP enforcement is implemented and verified.
5. Browser/mobile/print/keyboard regression QA; production HTTPS, session/rate-limit persistence, backups and monitoring.

No hosted service was connected and no real OTP was sent during this work. See `docs/testing-report.md` for the actual executed checks.
