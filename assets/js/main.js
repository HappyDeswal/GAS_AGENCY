import { initializeRuntime, configureConnectedAuth, runtimeState, initializeConnectedNavigation } from './backend/runtime.js';
import { initializeTheme } from './theme.js';
import { initializeAnimations } from './animations.js';
import { layout, initializeNavigation, adminPages, deliveryPages, url } from './navigation.js';
import { icon, initializeTables, downloadCSV, toast } from './ui.js';
import { data, sampleDate, dateLabel } from './demo-data.js';
import { initializeCharts } from './charts.js';
import { renderAuth } from './pages/auth.js';
import { dashboard, initializeDashboard } from './pages/dashboard.js';
import { stockPage, initializeStock } from './pages/stock.js';
import { customersPage, customerDetails, initializeCustomers } from './pages/customers.js';
import { deliveriesPage, createDelivery, deliveryDetails, initializeDeliveries } from './pages/deliveries.js';
import { paymentsPage, settlementsPage, initializePayments } from './pages/payments.js';
import { staffPage, initializeStaff } from './pages/staff.js';
import { reportsPage, initializeReports } from './pages/reports.js';
import { receiptsPage } from './pages/receipts.js';
import { settingsPage, initializeSettings } from './pages/settings.js';
import { deliveryDashboard, dailySummary, profilePage } from './pages/delivery-portal.js';
const { page, portal } = document.body.dataset;
try {
    await initializeRuntime(portal);
}
catch (error) {
    document.body.textContent = error.message;
    throw error;
}
initializeTheme();
try {
    document.documentElement.dataset.motion = sessionStorage.getItem('gas-motion') || 'full';
}
catch {
}
if (portal === 'auth') {
    renderAuth(page);
    configureConnectedAuth();
    initializeTheme();
    initializeAnimations();
}
else {
    const titles = {
        'customer-details': 'Customer details', 'create-delivery': 'Create delivery', 'delivery-details': 'Delivery details'
    };
    const title = (portal === 'admin' ? adminPages : deliveryPages).find(p => p[0] === page)?.[1] || titles[page] || 'Dashboard';
    const buttons = {
        dashboard: `<span class="button">${icon('calendar')} ${dateLabel(sampleDate)}</span><a class="button primary" href="${url('pages/admin/create-delivery.html')}">${icon('plus')} Create delivery</a>`, stock: '<button class="button primary" id="add-stock">+ Add stock</button>', cylinders: '<button class="button primary" id="add-stock">+ Add stock</button>', customers: '<button class="button primary" id="add-customer">+ Add customer</button>', 'stock-movements': '<button class="button primary" id="add-movement">+ Add movement</button>', deliveries: `<button class="button" id="export-deliveries">${icon('download')} Export CSV</button><a class="button primary" href="${url('pages/admin/create-delivery.html')}">+ Create delivery</a>`, payments: '<button class="button primary" id="add-payment">+ Demo payment</button>', staff: '<button class="button primary" id="add-staff">+ Add staff</button>'
    };
    document.body.innerHTML = layout(title, portal, page, portal === 'admin' ? buttons[page] || '' : '');
    initializeNavigation();
    initializeConnectedNavigation();
    initializeTheme();
    function renderPage() {
        window.tableDateRange = null;
        let content;
        if (portal === 'admin') {
            switch (page) {
                case 'dashboard':
                    content = dashboard();
                    break;
                case 'stock':
                case 'cylinders':
                case 'stock-movements':
                    content = stockPage(page);
                    break;
                case 'customers':
                    content = customersPage();
                    break;
                case 'customer-details':
                    content = customerDetails();
                    break;
                case 'deliveries':
                    content = deliveriesPage();
                    break;
                case 'create-delivery':
                    content = createDelivery();
                    break;
                case 'delivery-details':
                    content = deliveryDetails(portal);
                    break;
                case 'payments':
                    content = paymentsPage();
                    break;
                case 'settlements':
                    content = settlementsPage();
                    break;
                case 'staff':
                    content = staffPage();
                    break;
                case 'reports':
                    content = reportsPage();
                    break;
                case 'receipts':
                    content = receiptsPage();
                    break;
                case 'settings':
                    content = settingsPage();
                    break;
            }
        }
        else {
            switch (page) {
                case 'dashboard':
                    content = deliveryDashboard();
                    break;
                case 'my-deliveries':
                    content = deliveriesPage('delivery');
                    break;
                case 'delivery-details':
                    content = deliveryDetails('delivery');
                    break;
                case 'history':
                    content = deliveriesPage('delivery', true);
                    break;
                case 'daily-summary':
                    content = dailySummary();
                    break;
                case 'profile':
                    content = profilePage();
                    break;
            }
        }
        document.querySelector('#page-content').innerHTML = content || '<p>Page unavailable.</p>';
        if (runtimeState().live) {
            document.querySelectorAll('.demo-tag').forEach(tag => tag.textContent = 'AGENCY DATA');
            document.querySelector('#reset-demo')?.remove();
            const footer = document.querySelector('.footer span:last-child');
            if (footer)
                footer.textContent = 'Agency workspace · Business date: ' + sampleDate;
            const note = document.createElement('p');
            note.className = 'form-note';
            note.textContent = 'Connected agency data. Delivery completion is locked until the production OTP workflow is configured.';
            document.querySelector('#page-content').prepend(note);
        }
        initializeTables();
        initializeDashboard();
        initializeAnimations();
        initializeCharts();
        initializeDeliveries(renderPage);
        initializeSettings(renderPage);
        initializeReports();
        initializeStock(renderPage);
        initializeCustomers(renderPage);
        initializePayments(renderPage);
        initializeStaff(renderPage);
        document.querySelector('#print-receipt')?.addEventListener('click', () => window.print());
    }
    renderPage();
    document.querySelector('#export-deliveries')?.addEventListener('click', () => downloadCSV('gas-agency-deliveries.csv', data.deliveries.map(({ timeline, ...r }) => r)));
    document.addEventListener('storage-unavailable', () => toast('Browser storage is unavailable. Changes will last only on this page.'));
}
