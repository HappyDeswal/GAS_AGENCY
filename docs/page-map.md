# Page map

All paths are relative to the project root. Start a local HTTP server before opening pages.

| Portal | Page | URL |
| --- | --- | --- |
| Entry | Welcome redirect | `index.html` |
| Public | Agency homepage | `index.html` |
| Auth | Owner login | `pages/auth/owner-login.html` |
| Auth | Delivery login | `pages/auth/delivery-login.html` |
| Auth | Login | `pages/auth/login.html` |
| Auth | Select Role | `pages/auth/select-role.html` |
| Admin | Create Delivery | `pages/admin/create-delivery.html` |
| Admin | Customer Details | `pages/admin/customer-details.html` |
| Admin | Customers | `pages/admin/customers.html` |
| Admin | Cylinders | `pages/admin/cylinders.html` |
| Admin | Dashboard | `pages/admin/dashboard.html` |
| Admin | Deliveries | `pages/admin/deliveries.html` |
| Admin | Delivery Details | `pages/admin/delivery-details.html` |
| Admin | Payments | `pages/admin/payments.html` |
| Admin | Receipts | `pages/admin/receipts.html` |
| Admin | Reports | `pages/admin/reports.html` |
| Admin | Settings | `pages/admin/settings.html` |
| Admin | Settlements | `pages/admin/settlements.html` |
| Admin | Staff | `pages/admin/staff.html` |
| Admin | Stock Movements | `pages/admin/stock-movements.html` |
| Admin | Stock | `pages/admin/stock.html` |
| Delivery | Daily Summary | `pages/delivery/daily-summary.html` |
| Delivery | Dashboard | `pages/delivery/dashboard.html` |
| Delivery | Delivery Details | `pages/delivery/delivery-details.html` |
| Delivery | History | `pages/delivery/history.html` |
| Delivery | My Deliveries | `pages/delivery/my-deliveries.html` |
| Delivery | Profile | `pages/delivery/profile.html` |

Customer, delivery, and receipt details accept an `id` query parameter. Examples:

- `pages/admin/customer-details.html?id=CUS-1001`
- `pages/admin/delivery-details.html?id=DEL-1001`
- `pages/delivery/delivery-details.html?id=DEL-2001`
- `pages/admin/receipts.html?id=DEL-1001`

Missing IDs use a sensible initial demo record. Unknown IDs show a readable unavailable state. The receipt base URL shows the list.
