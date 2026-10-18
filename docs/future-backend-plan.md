# Backend integration roadmap

The backend foundation has been prepared in `supabase/migrations/` and `assets/js/backend/`, with setup instructions in `supabase/README.md`. No backend is connected in this version. The current shared data module is the replacement point for a future asynchronous API/repository layer; page modules should then call explicit operations instead of editing the exported demo arrays. Keep the demo adapter available for training and tests.

## Identity and agency isolation

Use Supabase Auth for sign-in and password recovery. Store agency membership and role in protected database tables. Every operational row should carry `agency_id`; staff assignments should reference valid members of that agency. Enable Row Level Security on every exposed table. Enforce Owner/Admin permissions and restrict delivery partners to the records and actions appropriate to their assignments. Test that users cannot change agency IDs, promote their own roles, or read another agency's records.

The current role selector, separate folders, hidden links, and staff ID selection are presentation only. None provides real authorization. Only a publishable browser key may appear in a future frontend configuration; service-role keys, SMS credentials, and other secrets must stay in secure server environments.

## PostgreSQL model

Plan tables for agencies, memberships, customer records, cylinder types, godowns, stock ledger entries, reservations, deliveries, delivery events, payment entries, settlement entries, and receipt references. Add foreign keys, positive quantity/amount constraints, timestamps, unique external identifiers, and immutable audit events. Store money as integer paise or an exact numeric type. Model full/empty exchanges, damaged/missing stock, allocations, returns, cancelled reservations, partial deliveries, and reconciliation explicitly.

Use database transactions or narrowly scoped backend functions to atomically reserve stock, dispatch cylinders, record returns, complete deliveries, record collections, and settle cash. Reject duplicate submissions with idempotency keys. The present demo status update is not a production inventory transaction.

## Secure OTP and sensitive workflows

Generate OTP challenges server-side. Use a suitable SMS/email provider from an Edge Function with server-side secrets. Store only a suitable challenge hash, enforce expiry, attempt limits, rate limits, and single use. Bind the challenge to the delivery, recipient, agency, and authorized actor. Validate on the server and write an audit event. Never promote the current visual OTP preview into a client-side security check.

If actual payment processing is added, use provider-hosted flows and verified server-side callbacks. Do not infer collection success from a frontend toggle or client-supplied amount. Keep cash/UPI accounting and settlement validation authoritative on the backend. Have receipt/tax requirements reviewed separately before issuing production invoices.

## Frontend integration

1. Define repository operations such as `listDeliveries`, `createDelivery`, `updateDeliveryStatus`, `recordCollection`, and `reviewSettlement`.
2. Keep the existing demo implementation behind that interface; add a Supabase adapter.
3. Convert render functions to handle asynchronous loading, empty, validation, retry, and permission-denied states.
4. Replace temporary browser records with authorized server queries; do not migrate fictional demo data into production.
5. Add server-side pagination/filtering, date ranges, tenant-scoped reports, and export permissions.
6. Validate sessions on entry, offer real logout, and remove any suggestion that frontend navigation is an access control.

## Validation and deployment

Test permissions across at least two agencies, both roles, unauthorized assignments, concurrent stock reservations, OTP replay, duplicate collection attempts, settlement races, and expired sessions. Add migration rollback plans, backups, audit retention, and monitoring. Configure HTTPS static hosting and a restrictive CSP for approved resources. Reuse the same authenticated backend and authorization rules for a future Android application.
