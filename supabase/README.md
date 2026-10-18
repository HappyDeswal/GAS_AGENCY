# Supabase backend preparation

This directory contains the backend foundation for GAS AGENCY. **Nothing has been deployed or connected to an external project. The current application still runs its fictional session-storage demo.**

Included:

- `migrations/202610180001_agency_schema.sql`: 13 tables, composite tenant foreign keys, constraints, indexes, agency memberships, and Row Level Security.
- `migrations/202610180002_operations.sql`: six transactional operations for receiving stock, booking deliveries, transitioning statuses, returning empty cylinders, recording collections, and reviewing settlements.
- `bootstrap-agency.sql.example`: a trusted operator's template for the first agency, owner membership, and cylinder prices.
- `tests/agency_security.sql`: 14 pgTAP integration assertions with two agencies and assigned/unassigned roles. Not executed in the current environment.
- `../assets/js/backend/`: a disabled configuration file, dependency-free REST/Auth client, and agency repository.

## Set up a development database

Use a new, disposable Supabase development project first. These are initial migrations, not an automatic upgrade script for an existing agency database.

1. Create a Supabase development project in your own account.
2. In its SQL editor, run the first migration, then the second migration. Alternatively, use the Supabase CLI to apply the migration directory.
3. Create the first owner in Supabase Auth using the project's trusted dashboard workflow.
4. Copy `bootstrap-agency.sql.example`, replace `REPLACE_WITH_EXISTING_AUTH_USER_UUID` and the agency name, review the sample cylinder prices, and run it in the trusted SQL editor. Keep the resulting agency UUID.
5. Provision delivery users through Supabase Auth. A trusted operator adds their `agency_members` row with role `delivery`; an owner/admin then associates their staff record through `staff.auth_user_id`. Browser users cannot insert/update agency membership rows or promote themselves.
6. Run the pgTAP suite in a **disposable local** database, with the migrations applied and no colliding test fixtures. The script inserts fictional users/tenants inside a rolled-back transaction. With a configured local Supabase CLI environment, `supabase test db` runs tests in this directory.
7. Review the RLS policies and production requirements before loading any real agency records.

Apply `202610180003_stock_adjustments.sql` after the first two migrations to enable reasoned damage/missing reclassification.

The SQL migrations and pgTAP suite have **not** been executed here: PostgreSQL and the Supabase CLI are not installed, and no hosted project is connected. Do not treat the prepared policies as security-certified or production-validated.

## Tables and boundaries

| Area | Tables | Browser writes |
| --- | --- | --- |
| Tenant identity | `agencies`, `agency_members` | Trusted provisioning only |
| Metadata | `customers`, `staff`, `cylinder_types` | Owner/admin, scoped by RLS |
| Inventory | `stock_balances`, `staff_stock`, `stock_movements` | RPC operations only |
| Delivery | `deliveries`, `delivery_events` | RPC operations only |
| Collections | `payments` | RPC operation only |
| Cash close | `settlements`, `settlement_events` | RPC operation only |

All operational records carry an agency UUID. Composite foreign keys reject cross-agency customer, staff, cylinder, and delivery references. The policies use verified `auth.uid()` plus protected membership records, not user-editable role metadata. The membership helper uses a private schema with a fixed empty search path. No anonymous access to agency records is granted.

Delivery partners can read their assigned deliveries and linked customer/payment history, their own staff stock, and their own settlement records. Inventory totals, staff administration, movement history, and other partners' records remain admin-only. The UI role selector does not grant access.

Money is stored in integer **paise**: ₹850 is `85000`. Delivery booking snapshots the cylinder price. Collection amounts are computed on the server from that price and quantity; the client cannot choose an amount. UPI here is an accounting method only, not a payment gateway.

## Operation contracts

Call these through `POST /rest/v1/rpc/<operation>` with a valid authenticated session and a publishable project key.

| Operation | Required parameters after `p_agency_id` | Permission / effect |
| --- | --- | --- |
| `receive_stock` | `p_cylinder_type_id`, `p_quantity` | Admin; increases godown full stock with a movement event |
| `create_delivery` | `p_customer_id`, `p_staff_id`, `p_cylinder_type_id`, `p_quantity`, `p_delivery_date`, `p_address`, `p_payment_method`, `p_request_id`; optional `p_notes` | Admin; reserves/dispatches stock to the partner atomically |
| `transition_delivery` | `p_delivery_id`, `p_status`; optional `p_empty_returned` | Admin or assigned partner; validates state transitions and completion inventory |
| `return_empty_stock` | `p_staff_id`, `p_cylinder_type_id`, `p_quantity` | Admin; moves partner empties back to the godown |
| `record_payment` | `p_delivery_id`, `p_method`, `p_request_id`; optional `p_paid_on` | Admin or assigned partner; completed deliveries only, full amount from stored price |
| `review_settlement` | `p_staff_id`, `p_date`, `p_submitted_paise` | Admin; validates submitted cash against server collection totals and appends review history |

`p_request_id` is a UUID generated once for a logical create/collection request. Reuse that UUID on a retry. Do not silently generate a new UUID for the same retry. Stock receipt and empty-return calls do not yet have idempotency keys; the client does not automatically retry any write.

Delivery transitions:

- Assigned → In Progress, Failed, or admin Cancelled.
- In Progress → Delivered, Failed, or admin Cancelled.
- Failed → admin Assigned or admin Cancelled.
- Delivered and Cancelled are final. A repeated request for the current state returns the existing delivery without repeating stock changes.

An admin cancellation returns allocated full cylinders to the godown. A paid delivery cannot be cancelled without a separately implemented refund workflow. Completion consumes allocated full cylinders and records up to `quantity` empty exchanges. Failed deliveries retain their allocated stock until an admin retries/cancels them. Booking and completion update inventory inside their database transaction; negative stock violates constraints.

A collection uses a staff/business-date advisory lock shared with settlement review. If more collections arrive after a review, expected amounts are updated. Settlement status is **derived**: submitted cash equals expected cash → Settled; otherwise Pending. Do not infer settlement status from a stale frontend flag.

## JavaScript integration point

The native application server now enables a connected runtime when its Supabase environment is configured. Ordinary static hosting and setting the legacy adapter `enabled: true` alone do not switch modes. Their renderers currently consume the demo record shape. The prepared adapter is the basis for that next integration step.

```js
import { createBackendClient } from './assets/js/backend/client.js';
import { createAgencyRepository } from './assets/js/backend/repository.js';

const client = createBackendClient(
  {
    enabled: true,
    supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
    publishableKey: 'YOUR_PUBLISHABLE_KEY'
  },
  async () => authSession.accessToken // Inject a real auth/session provider.
);
const agency = createAgencyRepository(verifiedMembership.agencyId, client);
const customers = await agency.list('customers', { limit: 25, offset: 0 });
```

`authSession` and `verifiedMembership` in this example describe values that the future auth integration must supply; they are not globals provided by the demo app. The Auth helpers return sessions to their caller; this adapter does not store passwords or tokens. Session refresh/restoration across separate HTML navigations is still to be implemented. Choose and review a session strategy before enabling production pages.

The repository pins `agency_id` on queries and writes, but **RLS remains the actual authorization boundary**. Metadata writes exclude caller-supplied IDs/agency overrides. Money, inventory, and delivery writes are allowed only through named operations. Do not bypass operations with direct table updates.

## Remaining integration work

1. Apply and run database/integration tests, including concurrent bookings/collections and cross-agency role cases.
2. Implement real sign-in, session restoration/refresh, logout, and agency membership selection.
3. Add async loading/error/retry handling to every page and map canonical UUID/snake-case database records to view models.
4. Replace page-level demo mutations with repository calls. Fetch lists/details, events, receipts and reports from tenant-scoped server records. Demo IDs such as `DEL-1001` are not database UUIDs and must not be uploaded as live IDs.
5. Add membership invitations, robust metadata validation, inventory adjustments/reassignment, refunds, partial collections if needed, and receipt requirements appropriate to the agency.
6. Implement rate-limited, server-generated OTP challenges using a provider and backend secrets. No function here sends or validates OTP, and delivery completion is not claimed to be OTP-verified.
7. Conduct a security review, physical-device QA, and production backup/monitoring setup before deployment.

## Verified locally

`node tests/backend-checks.mjs` passes with mocked HTTP. It checks configuration failures, missing-session handling, rejection of secret/service-role keys, tenant query filters, protected write contracts, HTTP error normalization, and migration source contracts. It does **not** prove that SQL functions compile or that RLS rejects actual database requests.

Official references used for the design: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Data REST API](https://supabase.com/docs/guides/api), and [data security](https://supabase.com/docs/guides/database/secure-data).
