# Testing report

Development and browser verification completed on 18 October 2026. The application was served with a local static HTTP server and inspected in the Codex in-app browser. No test accounts, paid services, or real records were used.

## Page and layout checks

All **23 application HTML pages** rendered successfully in the final smoke pass at the available 615px browser viewport. There was no document-wide horizontal overflow on that pass. The optional Node integrity check verified local asset references in every application HTML file. All JavaScript modules were parsed with the existing editor's parser during formatting; no runtime dependency or package was added.

Nine representative routes were inspected through the local `tests/responsive.html` harness at **1440, 1024, 768, 390, and 320px**: Admin dashboard, create delivery, reports, customers, receipt list, Delivery Boy dashboard/details, login, and role selection. This produced 45 viewport inspections. The delivery details test initially found a 320px OTP-row overflow; after the fix, all five widths passed again. Light theme was included in that retest. Authentication orbs also initially widened the page and were repaired and retested.

These checks read the actual iframe document widths and page headings. They are structural responsive checks, not physical-device tests or full visual approval of every page at every size.

## Verified interactions

- Created a fictional customer and filtered the table to exactly that record.
- Created a two-cylinder delivery for that customer; verified customer/address/quantity/amount in details after navigation.
- Advanced Assigned → In Progress → Delivered through native confirmation dialogs and verified the timeline.
- Recorded a ₹700 demo cash payment, verified its list entry, and opened the matching receipt with the same amount and delivery reference.
- Added a three-cylinder stock transfer and observed the new movement count.
- Added a staff member, edited their status to Inactive, and verified filtering.
- Used table pagination, filtered Failed deliveries, and sorted their IDs.
- Followed the stock navigation link and verified browser Back/Forward returned to the correct screens; opened/closed the profile menu and checked a demo notification.
- Applied the reports Today range and verified that it uses the labeled sample date 15 October 2026. Clicked CSV export.
- Reviewed a settlement, submitted the full demo cash amount, and verified Settled with a zero difference.
- Changed dark/light theme, opened/closed the mobile drawer, selected reduced animation, and reset demo records.
- Verified the restored Delivery Boy day counts: 12 assigned, 7 completed, 4 pending/in progress, 1 failed.
- Verified invalid email feedback on login and successful demo-role navigation with a fictional username.

## Charts and print styles

The Admin Chart.js activity chart rendered in the browser. `tests/chart-fallback.html` deliberately omits the CDN script: the fallback rendered seven bars with values 64, 72, 58, 81, 76, 92, 86. The CDN script is asynchronous so its failure cannot block the rest of the interface.

`tests/print-preview.html` applies the actual project print-media rules to a paid receipt. It verified that navigation, top header, and page heading were hidden, the page/receipt backgrounds were white, and the receipt remained visible. The receipt page and enabled Print receipt control were checked after fixing the table initializer. No physical print or actual browser PDF file was produced, so those remain untested.

## Automated data checks

`node tests/data-checks.mjs` passed:

- 23 expected application HTML files and their local asset paths.
- Valid customer/staff references for every delivery.
- Payment amounts matching cylinder prices and quantities.
- Unique delivery IDs and positive quantities.
- Source inventory bounds for initial stock movements.
- The 12-stop daily delivery distribution.
- Session save/reset behavior.
- HTML escaping and CSV quoting/formula-prefix protection.

The CSV button was exercised in the browser; serialization was inspected in the data check. The browser-downloaded file itself was not manually opened.

## Repairs and final result

Browser QA found and fixed an extra closing parenthesis in the stock module, receipt tables being initialized without list controls, auth background overflow, the narrow OTP row, and a blocking CDN script arrangement. The final 23-page smoke pass showed no failures or new captured browser exceptions. Earlier exceptions remain in the browser's historical log; they are not described as a clean historical console.

The test-created customer, delivery, payment, staff, and settlement changes were removed using the application's reset control. The preview was restored to the dark theme.

## Not tested

Safari, Firefox, Android/iOS devices, real touch input, a complete keyboard traversal of every screen, a screen-reader audit, OS reduced-motion changes, physical printer output, actual browser PDF output, and exhaustive offline/storage-blocked behavior. All backend functionality is intentionally absent and cannot be validated in this phase.

## Reference UI and backend-preparation revision

The entire shared visual layer was updated to match the user's soft glass reference. A theme-button defect was found: the original handler was registered before the shared header existed. Delegated event binding now handles the header and auth controls. Actual browser tests passed for light/dark button changes, login reload persistence, role-selection control, and synchronization between the header button and Settings select.

The nine-route responsive harness passed again at 1440, 1024, 768, 390, and 320px in light mode (45 structural checks). The Admin dashboard was visually inspected in both themes at the available preview size. Workspace search filtered nine module tiles down to Payments and restored all nine after clearing.

`node tests/backend-checks.mjs` passed mocked checks for disabled/unconfigured mode, missing-session handling, secret/service-role key rejection, tenant pinning, protected write contracts, pagination limits, and normalized HTTP failures. The existing `node tests/data-checks.mjs` still passes. The backend migration contracts were checked at source level only. PostgreSQL/Supabase CLI are not installed and no hosted database is connected, so SQL compilation, transactional behavior, and real RLS integration are **not tested**. A 14-assertion pgTAP test source is included for a disposable Supabase development environment.

The final post-formatting smoke pass rendered all 23 application pages with a theme control on every page, no document-wide overflow at the available 615px viewport, and no captured browser errors. The source module/import and documentation link checks also passed.

Additional final checks passed for the dark Admin dashboard at all five target widths, stock/delivery workspace search aliases, the isolated chart fallback, and simulated receipt print styling after the visual revision. The preview HTTP server on port 8081 was used because the user’s port 8080 was already occupied.

## Completion work: inventory receipt and application server

Added the previously missing Add Stock form on Stock/Cylinders. Positive whole-number receipts increase full-cylinder inventory, append a Receive movement, save the demo session and update the stock-overview values. Receive movements are excluded from staff-held transfer totals. Async dialog submission now disables duplicate submission, keeps the dialog open on error, and reports failures.

`node tests/inventory-checks.mjs` passed for the real stock receipt callback using a minimal DOM harness: quantity increase, receipt ledger entry, overview update, session persistence, and rejection of negative input. `node tests/server-checks.mjs` passed mocked HTTP integration checks for HttpOnly session cookies, token isolation, same-origin enforcement, tenant/operation checks, server/SQL file isolation, logout, and fail-closed OTP routing. The SMS and email provider adapter contracts passed with mocked responses. Existing backend and demo-data checks still pass.

Browser verification for this pass was rejected by the browser security policy. No workaround was used and no browser QA is claimed for the new receipt form. No live Supabase or real OTP request was made. The user stated that Supabase will be set up later and requested both SMS and email. Full frontend/live-backend integration and delivery-bound OTP enforcement remain unfinished; see server/README.md.

## Workflow and PRD iteration

Added root `PRD.md` and a workflow status matrix. Implemented shared business operations and migrated booking, status changes, receipt, collection, customer/staff saves and settlement forms to that boundary. Added adjustment/empty-return forms, customer balance reporting, recorded-movement daily closing and CSV exports. Bookings snapshot prices; completion changes inventory; cancellation releases allocation; duplicate paid entries and invalid final-state changes are rejected. Dashboard stock, delivery, partner and outstanding totals now derive from records.

Connected runtime sources now detect the native application server, require its session for protected pages, map database records into page view models, apply staff identity, and route supported writes through scoped server operations/metadata. Connected records cannot be persisted through demo storage. Live completion is explicitly rejected by the server until the production OTP workflow is ready. Static hosting does not probe absent API paths.

Executed checks:

- `node tests/workflow-checks.mjs`: allocation, progression, completion/empties, repeated completion guard, snapshotted pricing, paid duplicate rejection, cancellation release/final states, adjustment, submitted cash bounds, settlement, closing arithmetic and empty-return source bounds.
- `node tests/connected-workflow-checks.mjs`: canonical data mapping, current staff identity, price snapshots, scoped receipt/customer requests, post-success reload, and refusal to persist private agency records to demo storage or fall back to in-memory writes for unsupported operations.
- `node tests/render-checks.mjs`: 21 operational page content render functions and unknown-record states. These are template checks, not full browser tests.
- Existing inventory, backend-contract, page/data and server tests pass. New server assertions found and repaired a trailing-slash static-root check that previously rejected application files; login HTML now serves with a native-server marker. Same-origin, secret-file isolation and unauthorized operation/data guards are covered with mocked upstream services.

No real Supabase, SQL migration execution, messaging, or concurrency verification occurred. Browser verification remains unavailable after the earlier browser security-policy rejection; no alternate browser method was used and no new browser/visual/print QA is claimed. Production OTP/database enforcement, recovery and other open gates are listed in the PRD/status matrix.


## Review corrections · 18 October 2026

Fixed four findings: direct RPC completion bypass, native-server status outages falling back to demo mode, availability including dispatched cylinders, and partner daily collections omitting payments for older deliveries. Migration 004 installs a database trigger that rejects inserts/transitions to Delivered until delivery-bound verification exists; updates to previously delivered records remain possible for collection. This is a fail-closed lock, not an implementation of OTP delivery.

Executed checks: data, backend, inventory, workflow, connected-workflow, render, review-regressions, and server suites. The connected tests cover HTTP failures, network errors and invalid status responses. Review regressions verify zero availability after full dispatch, authoritative connected location balances, and today's collections/settlement due for prior-date deliveries while excluding other partners and payment dates. All passed. The updated 16-assertion pgTAP suite includes partner/owner direct-RPC denial and inventory rollback checks, but has not been executed because no PostgreSQL/Supabase instance is connected. No browser verification or real SMS/email was performed.
