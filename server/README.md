# Application server integration

This is a native JavaScript server with no npm dependencies. It serves the existing application and introduces server-side Supabase sign-in, session refresh, logout, and an allowlisted operational RPC gateway. Authentication tokens stay in server memory; the browser receives an HttpOnly, SameSite=Strict session cookie. HTTPS deployments add Secure cookies.

## Local setup when Supabase is available

1. Copy `server/.env.example` to `server/.env` locally.
2. Fill in the Supabase URL and **publishable** key. Never use a service-role key for that setting.
3. Apply the database migrations and provision users/memberships using `supabase/README.md`.
4. With Node 22 or later, run:

```sh
node --env-file=server/.env server/server.mjs
```

Open the APP_ORIGIN configured in the file. The default is port 8082. The server never exposes server files, environment files, or SQL migrations over HTTP. With Supabase configured, HTML responses enable the connected frontend runtime and sign-in is required for agency pages. Without Supabase configuration, the server serves the demo. Ordinary static hosting also remains a demo.

## Implemented API contracts

- `GET /api/status`: reports whether Supabase is configured; OTP is currently false.
- `POST /api/login`: email/password sign-in through Supabase, requires active agency membership.
- `GET /api/session`: returns user ID and memberships, never access/refresh tokens.
- `POST /api/logout`: revokes the session and clears the browser cookie.
- `GET /api/data?agency=<uuid>`: loads authorized tenant records and a business-date anchor; oversized workspaces fail explicitly instead of truncating records.
- `POST /api/metadata`: admin-only customer/staff/cylinder metadata, with field/table allowlists.
- `POST /api/operation`: allowlisted transactional operations with a membership check and user JWT; database policies remain authoritative.
- `/api/otp/*`: deliberately returns 503 until the delivery-bound OTP workflow is integrated. It never pretends to send or verify a code.

All API writes require an exact Origin match with APP_ORIGIN. The server refreshes expired Supabase access tokens and rate-limits login attempts per source address. Sessions and local rate-limit counters are in memory, so sessions end when the process restarts. A shared durable session/rate-limit store is required before running multiple server instances.

## SMS and email OTP

`otp-provider.mjs` implements both Twilio Verify channel contracts using server-only environment variables. Email requires the email delivery integration configured in the Verify service. No account is created, no subscription purchased, and no real message was sent during development.

The provider adapter is **not** exposed directly to the browser. Before enabling OTP endpoints, implement durable challenge records bound to agency, delivery, customer, contact and channel; resend/attempt limits; expiry and single use; and a database completion gate that prevents bypass through a direct delivery RPC. If the agency requires both SMS and email approval, completion must require both matching challenge results. Existing `transition_delivery` does not yet enforce this gate, so production completion is not OTP-secured.

References: [Supabase sessions](https://supabase.com/docs/guides/auth/sessions), [Twilio Verify channels](https://www.twilio.com/docs/verify/api/verification), [verification checks](https://www.twilio.com/docs/verify/api/verification-check).

## Remaining work before completion

The user will configure Supabase later. Until then, these external services cannot be tested. The project is **not complete for production**. Connected hydration, sign-in/role UI and operational/metadata form adapters are now wired and mocked-contract tested. Password recovery, durable delivery-bound OTP endpoints/database enforcement, live service validation, and production deployment remain outstanding. Connected completion is deliberately blocked by the operation API. The existing direct database completion RPC still needs the OTP gate, so this is not production OTP enforcement. The Add Stock form updates demo inventory in demo mode and calls the receipt operation when the configured server enables connected mode.

## Tests

```sh
node tests/server-checks.mjs
node tests/inventory-checks.mjs
node tests/backend-checks.mjs
node tests/data-checks.mjs
```

Server tests use mocked Supabase and OTP responses and a temporary loopback port. Inventory tests exercise the actual form callback using a minimal DOM harness. They do not substitute for browser tests or real PostgreSQL/RLS/provider tests.
