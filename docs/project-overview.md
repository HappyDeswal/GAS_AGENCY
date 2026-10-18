# Project overview

GAS AGENCY is a static, multi-page LPG operations prototype for agency owners and delivery partners. Every major screen has a separate HTML URL. JavaScript modules reuse the shared layout and components without a framework, build system, or backend.

The Admin portal covers stock, cylinders, movements, customers, deliveries, payments, settlements, staff, reports, receipts, and settings. The Delivery Boy portal covers assignments, status workflows, history, daily summary, and profile.

The updated design follows the supplied reference with a framed frosted-glass workspace, pale sage/lavender gradients, circular actions, and rounded utility tiles. Light mode is the default; a matching dark theme and reduced motion are supported. Animations are decorative; forms and navigation do not depend on motion.

Records are fictional and temporary. Sample daily activity uses 15 October 2026. Central data lives in `assets/js/demo-data.js`; page modules read the same live data export. Session persistence allows records to survive normal navigation within a tab. Only theme preference is saved persistently.

The app's sample KPIs, actual demo records, and chart demonstration series are explicitly distinguished. A detailed future backend plan describes agency isolation, RLS, secure OTP, and durable records without connecting any services in this phase.

Backend preparation now lives in `supabase/` and `assets/js/backend/`. It includes schema/RLS migrations, transactional operations, a REST/Auth adapter, and integration test sources. These are not deployed; the UI continues to use fictional demo records. See `supabase/README.md` for the connection steps and limits.
