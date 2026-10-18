# GAS AGENCY — Product Requirements Document

Version: 1.0 · Updated: 18 October 2026 · Status: implementation and service integration in progress

## 1. Product objective

Provide an LPG agency owner and delivery team with one consistent workflow for inventory, customers, bookings, delivery execution, collections, receipts and daily settlement. The application must show whether it is operating on fictional demo records or authenticated agency records. No action may report a real booking, collection, OTP verification or durable save unless the relevant backend confirms it.

## 2. Users and permissions

| User | Responsibilities | Restrictions |
| --- | --- | --- |
| Owner/admin | Customer/staff metadata, stock receipts/adjustments, bookings, assignment, cancellations, collections, settlement reviews and reports | Access only agencies in verified membership; cannot create their own privileged membership from browser metadata |
| Delivery partner | Assigned work, delivery progression, empty exchanges, authorized collections, own daily summary/history | Cannot see other agencies or unauthorized colleagues; cannot edit prices, inventory totals or settlement approvals |
| Trusted operator | Provision initial agency/owner and authentication membership, configure services, apply migrations | Operates outside ordinary frontend privileges; secrets never ship to browser |

## 3. Scope and technology

- Separate HTML files for all existing Admin and Delivery portal screens.
- HTML/CSS/vanilla JavaScript frontend; pinned Chart.js with an offline fallback.
- Shared glass UI with working light/dark themes, responsive navigation, keyboard-accessible dialogs, labeled forms and reduced motion.
- Native JavaScript application server with no npm dependencies; HttpOnly session cookies and same-origin API writes.
- Supabase PostgreSQL, Auth, tenant-scoped RLS, composite tenant foreign keys and transactional operational functions.
- Both SMS and email are required capabilities for delivery OTP. The user will configure Supabase and providers later.
- UPI/cash collection is accounting. This phase does not initiate real money transfers or claim receipts are legally compliant tax invoices.

## 4. Operating modes

**Demo:** uses clearly fictional records, temporary session storage and labeled sample dates. No real authentication or message delivery. Reset restores the initial dataset. Only the theme is stored persistently in localStorage.

**Connected:** a verified server session and active agency membership are required. Data loads from authorized backend records. Failures must not silently fall back to demo data. Operational writes use server APIs and transactional database functions, never browser-array mutation as proof of persistence. Until deployed services and database tests pass, connected mode is not production-approved.

## 5. Required workflows and acceptance criteria

### WF-01 — Sign-in and agency access

Email/password is validated by Supabase. Access/refresh tokens remain server-side; browser receives an HttpOnly cookie. Session refresh and logout invalidate access appropriately. Agency selection is restricted to active memberships. Unauthorized users cannot obtain records by changing URLs or request bodies. Password recovery uses a configured secure provider flow; a demo recovery link must be labeled as such.

Acceptance: bad credentials fail; missing/revoked membership fails; role permissions are enforced by database policies; logout prevents subsequent API access; no tokens or passwords appear in browser storage, logs or responses.

### WF-02 — Customer and staff setup

Admin creates a customer with name, type, address, optional consumer reference and validated contact information. Customer phone/email are needed before the corresponding delivery OTP channel is usable. Staff records can be activated/deactivated; real delivery users require a trusted Auth membership plus linked staff record. New bookings may only be assigned to active staff.

Acceptance: required fields and tenant references validate; masked demo contacts remain fictional; inactive staff cannot receive new assignments; unlinked staff cannot gain authorization merely from a frontend role choice.

### WF-03 — Receive and reconcile inventory

Admin receives full cylinders by size and quantity. A receipt increases godown inventory and creates a movement event. Dispatch/return transfers change location balances while preserving total agency stock. A delivery consumes allocated full stock; an empty exchange increases empty stock. Damaged/missing adjustments require a reason and an audit entry and cannot create negative available balances.

Acceptance: positive whole quantities only; duplicate requests cannot silently double-count stock; insufficient source stock is rejected; ledger/location/category totals reconcile. Receiving stock is distinct from a dispatch or return. Earlier fixed demo headline KPIs must not be treated as a transactional stock source.

### WF-04 — Book and assign delivery

Admin selects a valid customer, cylinder type, quantity, date, address, payment method and active staff member. The price is snapshotted at booking. Available godown stock is checked before booking and allocated atomically. A single request key is retained for retries.

Acceptance: one successful booking creates one delivery, allocation and initial timeline event; insufficient stock or invalid references leave no partial records. Concurrent requests cannot oversell stock.

### WF-05 — Execute delivery

Allowed progression: Assigned/Pending → In Progress; Assigned/In Progress → Failed; In Progress → Delivered; admin may cancel unpaid open deliveries. Failed deliveries may be retried or cancelled by admin. Delivered and Cancelled are final. Cancellation releases allocation; completion records quantities and optional empties. Repeating the current status must not repeat inventory effects.

Acceptance: invalid transitions fail; a cancelled booking cannot simply reopen without a fresh allocation; paid cancellation requires a separate audited refund workflow; partner permissions match the assigned staff account.

### WF-06 — SMS and email OTP

Backend creates a challenge bound to agency, delivery, customer, contact, channel and actor. OTP codes are never generated or validated as browser security. The provider handles message delivery; backend persists challenge status, expiry, attempts and resend limits. The requested default is both SMS and email approval for the same delivery; any policy allowing only one channel needs an explicit product decision. Successful proof is single-use and checked inside the delivery-completion database transaction, preventing direct-RPC bypass.

Acceptance: wrong/expired/replayed codes fail; resend and attempt limits apply across restarts; contacts come from authorized server records; no arbitrary-recipient messaging; failed provider delivery cannot produce a verified flag. No production delivery is described as OTP-verified until this entire chain is tested.

### WF-07 — Collections and receipts

A completed delivery can receive a cash/UPI collection entry. The backend calculates the amount from stored price and quantity. A successful paid entry marks the delivery paid and enables its receipt. Pending/failed attempts do not count toward collections. Duplicate paid entries for one delivery are rejected or return the original result for an identical retry.

Acceptance: no client-selected amount; no duplicate collection; later cylinder price edits do not alter old receipts; receipt references delivery/payment records; print output is white, readable, and hides navigation. A receipt is an accounting document, not proof that a payment gateway transferred funds.

### WF-08 — Daily cash settlement

Business date uses Asia/Kolkata. Summaries calculate assigned/completed/failed/open deliveries, cash/UPI collected, submitted cash and remaining cash. Admin reviews submitted cash, which cannot exceed recorded cash collection. Later collections reopen an outstanding balance as appropriate. Every correction/review is audited. UPI is separate from physical cash due.

Acceptance: paid records only; date/partner/agency filters match; cash difference equals expected less submitted; collection/review races cannot produce a false settled status.

### WF-09 — Reporting, balances and closing

Search/filter/sort/paginate lists; export authorized data as CSV with quoting and formula protection. Reports cover deliveries, inventory, payments, settlements and staff performance. Customer outstanding balance excludes cancelled deliveries and subtracts paid amounts. Daily closing shows opening stock, receipts, completed deliveries, adjustments, closing stock and cash/UPI reconciliation. Fixed demonstration charts must be labeled; live period controls must use actual queried data.

Acceptance: list, dashboard, detail, receipt and export totals agree for the same records/range; no cross-agency rows; a date filter never silently relabels unrelated historical samples as live activity.

## 6. Failure behavior

- Validation error: retain entered values and describe the field/problem.
- Save in progress: disable duplicate submission; restore controls on failure.
- Backend/provider unavailable: show failure and keep current state; do not show a success toast or silently create a demo record.
- Session expired: require sign-in; do not reveal records through cached browser demo storage.
- Unknown record: readable unavailable state with navigation back to the relevant list.
- Missing provider configuration: disable real OTP operations and explain that no code was sent.

## 7. Security and operational requirements

All operational records have agency IDs; RLS and composite foreign keys enforce scope. Money is integer paise in PostgreSQL. Stock and collection invariants live in transactional functions. Secrets remain in server environment variables and are excluded from archives/Git/static file serving. Production uses HTTPS. Sessions/rate limits currently held in process memory require a reviewed durable/shared approach for multiple instances. Backups, migration testing, error monitoring and audit retention are release requirements.

## 8. Release gates

| Gate | Required evidence |
| --- | --- |
| Demo workflow | Automated booking → stock → delivery → payment → receipt/settlement checks, including errors and duplicate actions |
| UI | All pages and key forms work at 1440/1024/768/390/320px; themes, keyboard and reduced-motion checks |
| Database | Migrations execute in development; RLS tests cover two agencies, both roles, invalid references and direct-write bypass |
| Concurrency | Concurrent stock reservations, duplicate collections and settlement races preserve invariants |
| OTP | Real test SMS/email delivery, expiry, rate limiting, replay resistance and transactional completion enforcement |
| Deployment | Configured services, HTTPS, restore-tested backup, secret isolation, monitoring and known rollback path |

## 9. Current implementation and limitations

Implemented sources include 25 portal/auth screens plus a public agency homepage, shared components, inventory receipt form, demo storage, Supabase schema/operational migration sources, native server/session API contracts, and provider adapters. This iteration centralizes booking, stock allocation, delivery transitions, collections and adjustments behind a shared operation layer and adds regression coverage.

Supabase and messaging accounts are not configured. SQL execution/RLS, real messaging, production hosting and true end-to-end service behavior are not verified. Provider adapters alone do not constitute a secure delivery OTP workflow. Any still-unwired connected path must stay disabled or explicitly documented until its release gates pass; this document is a requirements contract, not a claim that every requirement has shipped.

## 10. Explicit exclusions and future decisions

No automatic payment gateway transfers, tax-compliance certification, Android app, public self-provisioning of owner roles, purchases/subscriptions, or production deployment without service setup. Decide refund/partial-payment policy, any future exception to mandatory SMS-and-email approval, provider/account ownership, audit retention and production session storage before release.


### Agency introduction and role-specific sign-in

The public homepage introduces agency services using local illustrations and CSS 3D animation, with light/dark themes and reduced-motion support. Owner and Delivery login links open separate login URLs; the common login also shows both options beneath its form. Credentials use the Supabase Auth email as the username. Active database membership determines the destination; mismatched portal attempts must be rejected before a session is created. Successful login opens the correct dashboard directly. No post-login role chooser grants access. Unconfigured deployments disable credential sign-in and offer explicitly separate fictional samples. Actual contact details and service areas await owner-provided content.
