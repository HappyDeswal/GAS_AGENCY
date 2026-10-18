# GAS AGENCY

A complete, buildless frontend prototype for managing an LPG agency. It has separate Owner/Admin and Delivery Boy portals, 23 HTML screens, light and dark soft-glass themes, and temporary interactive demo records.

**Demo only:** No real authentication, authorization, OTP, payments, messages, database, or production transaction storage is connected. Use fictional information only.

## Start the website

### Option A: VS Code Live Server

1. Open this **GAS AGENCY** folder in Visual Studio Code.
2. Install the free **Live Server** extension by Ritwick Dey, if needed.
3. Right-click `index.html` and choose **Open with Live Server**.
4. Enter a fictional username, select **Continue to Demo**, and choose a portal. A password is optional and never stored.

### Option B: A simple local HTTP server

If Python 3 is already installed, open Terminal and run:

```sh
cd "/Users/happydeswal/Documents/ChatGPT/GAS AGENCY"
python3 -m http.server 8080 --bind 127.0.0.1
```

Keep Terminal open. Open **http://127.0.0.1:8080/** in your browser. Stop the server with **Control+C** when finished. If port 8080 is occupied, use 8081 in both the command and browser address.

Direct portal addresses while the server is running:

- Owner/Admin: http://127.0.0.1:8080/pages/admin/dashboard.html
- Delivery Boy: http://127.0.0.1:8080/pages/delivery/dashboard.html

Do not double-click the HTML files to run the app: JavaScript modules need an HTTP server. No Node, npm, installation, API keys, or compilation is required to run the application. Python here serves static files only; it is not an application backend.

## Explore the demo

- **Customers:** add a fictional customer, search, filter by category, sort columns, and open their delivery/payment history. Contact information stays masked.
- **Deliveries:** create a record, choose a customer and staff member, and open delivery details. Use the explicit demo actions to start, complete, fail, cancel, or reassign a delivery. The timeline updates across pages.
- **Delivery portal:** see Demo Partner A's assignments, update delivery statuses from details, filter history, and view daily totals.
- **Stock:** inspect size/category totals, godown inventory, staff-held inventory, and low-stock warnings. Add dispatches/returns from Stock movements. Transfers enforce source availability and do not change agency-wide stock totals.
- **Payments:** record a fictional cash/UPI entry against a delivery. A paid entry updates the delivery's payment status; it does not transfer money. Receipt entries become available for paid deliveries.
- **Settlements:** review cash due and submitted for the sample day. A record becomes settled when submitted cash equals collected cash. UPI is shown separately.
- **Staff:** add/edit fictional partners, filter active/inactive staff, and open profiles.
- **Reports:** apply record date ranges and export deliveries, payments, stock, settlements, or staff performance as CSV. Trend charts explicitly show the fixed example week; the date range applies to record metrics/exports.
- **Receipts:** open a paid demo receipt and choose **Print receipt**. The button calls the browser's print function; choose Save as PDF if your browser offers it. Print styles hide navigation and use a white background. These are demonstration receipts, not tax invoices.
- **Settings:** choose a theme, reduce animation, set preview notification preferences, or reset all fictional records.

Search/filter controls work together. Table headers sort; footer controls paginate. Wide tables scroll inside their own containers. On small screens, use the menu button; Escape closes the drawer. Native dialogs support keyboard focus and Escape.

## Demonstration dates and totals

The example week is **12–18 October 2026**. Daily work, settlements, and the reports **Today** shortcut use the labeled sample day **15 October 2026**, rather than the live calendar. Demo Partner A initially has 12 stops: seven delivered, four pending/in progress, one failed.

The requested Admin headline KPIs are separate illustrative numbers. In particular, **1,250 total stock** differs from the supplied category breakdown of **1,190** (840 full + 320 empty + 25 damaged + 5 missing). Both are explicitly labeled. Detailed modules calculate totals from actual session records; the Admin sample headline cards do not change with those records.

## Project structure

```text
index.html                     Demo entry point
pages/auth/                    Login preview and role selector
pages/admin/                   15 admin pages
pages/delivery/                6 delivery pages
assets/css/                    Tokens, base, layout, components, animation,
                               responsive/print, and auth styles
assets/js/demo-data.js         Central fictional records and session storage
assets/js/main.js              Page initialization
assets/js/navigation.js        Shared sidebar, header, breadcrumbs
assets/js/ui.js                Tables, forms, dialogs, toast, CSV
assets/js/charts.js             Chart.js and offline fallback
assets/js/theme.js              Theme preference
assets/js/animations.js         Pointer tilt and reduced-motion checks
assets/js/pages/                Page-specific rendering and interactions
assets/images/                 Original SVG branding, cylinders, and grain texture
supabase/                      Database migrations, bootstrap template, tests
assets/js/backend/             Disabled Supabase REST/Auth adapter
docs/                          Page map, checklist, test report, backend plan
tests/                         Optional data checks and browser QA pages
```

## Updated UI and prepared backend

The UI now follows the supplied reference: a pale frosted frame, sage/lavender backgrounds, rounded panels, circular shortcuts, a cylinder welcome illustration, and a separate workspace/queue rail. The same design applies to both portals, login, forms, dialogs, and tables. Light is the new default; a saved theme choice is preserved. The theme button now works on every screen, including authentication previews, and stays synchronized with the appearance selector.

A Supabase backend foundation is now included. Read [the backend setup guide](supabase/README.md) for the schema, RLS policies, transactional operations, API adapter, integration tests, and exact connection steps. No external project is connected and the application still uses demo data. Enabling the adapter config alone does not convert the current demo screens into live pages.

## Technology and preferences

The application uses HTML5, CSS3, ES modules, and vanilla JavaScript. The only external runtime library is **Chart.js 4.4.7**, loaded asynchronously from a pinned CDN URL. Charts have a local, accessible bar fallback if the library is unavailable. Everything else works without external services. Fonts use the device's system font; icons are local inline SVGs.

Only the theme is saved to **localStorage** (`gas-theme`). Fictional records are kept in **sessionStorage** (`gas-agency-demo-v1`) for this tab. Reduced-animation and notification UI preferences also use sessionStorage. Closing the tab normally ends the demo session; browser session restoration may retain it. **Settings → Reset demo data** explicitly restores all original records. No password, token, account identifier, or real customer record is saved. If browser storage is blocked, records work in page memory and cannot survive navigation; a toast explains this on saving.

## Verification and remaining work

Read [the testing report](docs/testing-report.md) for actual checks, limitations, and the bugs fixed during QA. See [the page map](docs/page-map.md) for every screen and [the development checklist](docs/development-checklist.md) for implementation status.

Optional developer-only integrity checks can run with an existing Node installation:

```sh
node tests/data-checks.mjs
```

No packages are needed for these checks. Node is not required to run the website. While serving the project, developers can open `tests/responsive.html`, `tests/chart-fallback.html`, and `tests/print-preview.html` for the same browser inspection harnesses used during development. These pages are not part of the product navigation.

The backend preparation files are included; the next phase is applying/testing them and wiring the screens to real authentication and authorized data. Read [the future backend plan](docs/future-backend-plan.md). The frontend role selector and hidden navigation are not security boundaries.

## Current completion status

A new **Stock Management / Cylinders → Add Stock** form receives full cylinders into the demo inventory and appends a stock receipt. It is distinct from transferring cylinders to staff.

A native JavaScript application server and server-side session/API contracts are included in `server/`. Read [its setup and completion status](server/README.md) before using it. The user will configure Supabase later. Real database persistence, live screen integration and delivery-bound SMS/email OTP are not yet complete, and no real OTP has been sent. The earlier static demo remains usable without this server.

## Workflow and product requirements update

Read [PRD.md](PRD.md) for the full requirements, roles, state transitions, acceptance criteria and production release gates. [Workflow status](docs/workflow-status.md) distinguishes implemented code from verified behavior.

The core demo now follows booking → inventory allocation → delivery progression → completion/empty exchange → collection → receipt → settlement. It rejects invalid transitions, duplicate confirmed payments and insufficient inventory, and retains booking-price snapshots. Stock pages include receipts, reasoned damaged/missing adjustments and empty returns. Reports now include customer outstanding balances and a daily closing reconciliation with CSV exports. Dashboard totals are calculated from current records rather than the old illustrative headline constants.

The configured native server enables connected sign-in, scoped data loading and supported form operations through server APIs; ordinary static hosting remains a demo. No agency records are copied into demo session storage in connected mode. Live completion is locked until production OTP enforcement is implemented and verified. Supabase and real SMS/email services still need setup and testing. See [server setup](server/README.md).

Additional checks:

```sh
node tests/workflow-checks.mjs
node tests/connected-workflow-checks.mjs
node tests/render-checks.mjs
```
