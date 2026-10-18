import { icon, esc, toast } from './ui.js';
export const root = new URL('../../', import.meta.url);
export const url = path => new URL(path, root).href;
export const adminPages = [['dashboard', 'Dashboard', 'dashboard'], ['stock', 'Stock management', 'stock'], ['cylinders', 'Cylinders', 'stock'], ['stock-movements', 'Stock movements', 'reports'], ['customers', 'Customers', 'customers'], ['deliveries', 'Deliveries', 'deliveries'], ['payments', 'Payments', 'payments'], ['settlements', 'Settlements', 'payments'], ['staff', 'Staff management', 'customers'], ['reports', 'Reports & analytics', 'reports'], ['receipts', 'Receipts', 'receipt'], ['settings', 'Settings', 'settings']];
export const deliveryPages = [['dashboard', 'Dashboard', 'dashboard'], ['my-deliveries', 'My deliveries', 'deliveries'], ['history', 'Delivery history', 'calendar'], ['daily-summary', 'Daily summary', 'reports'], ['profile', 'My profile', 'customers']];
export function brand() {
    return `<a class="brand" aria-label="GAS AGENCY demo home" href="${url('pages/auth/select-role.html')}"><img src="${url('assets/images/logo.svg')}" alt=""><div><strong>GAS AGENCY</strong><small>OPERATIONS, SIMPLIFIED</small></div></a>`;
}
export function layout(title, portal, page, action = '') {
    const nav = portal === 'admin' ? adminPages : deliveryPages;
    const activePage = ({
        'customer-details': 'customers', 'create-delivery': 'deliveries', 'delivery-details': portal === 'admin' ? 'deliveries' : 'my-deliveries'
    })[page] || page;
    return `<a class="skip-link button primary" href="#main">Skip to content</a><div class="mobile-backdrop" id="backdrop"></div><aside class="sidebar" aria-label="${portal === 'admin' ? 'Admin' : 'Delivery'} navigation">${brand()}<div class="nav-label">${portal === 'admin' ? 'WORKSPACE' : 'DELIVERY PORTAL'}</div><nav>${nav.map(([p, t, i]) => `<a aria-label="${esc(t)}" class="nav-link ${activePage === p ? 'active' : ''}" ${activePage === p ? 'aria-current="page"' : ''} href="${url(`pages/${portal}/${p}.html`)}">${icon(i)}<span>${t}</span></a>`).join('')}</nav><div class="sidebar-bottom"><div class="workspace-card"><strong>Built for a better everyday.</strong><p>Explore your agency in demo mode.</p><a href="${url('pages/auth/select-role.html')}">Switch demo portal →</a></div><a class="nav-link" href="${url('pages/auth/login.html')}">${icon('logout')}<span>Exit demo</span></a></div></aside><header class="topbar"><div class="topbar-left"><button class="icon-button" id="menu-toggle" aria-label="Toggle navigation" aria-expanded="false">${icon('menu')}</button><div class="breadcrumb">Workspace <span>/ &nbsp;${esc(title)}</span></div></div><div class="topbar-actions"><span class="demo-tag">DEMO MODE</span><button class="icon-button" id="theme-toggle" aria-label="Switch color theme">${icon('theme')}</button><button class="icon-button" id="notifications" aria-label="View notifications">${icon('bell')}</button><div class="profile-menu"><button class="profile-button" id="profile-toggle" aria-expanded="false"><span class="avatar">${portal === 'admin' ? 'AD' : 'DA'}</span><span class="profile-name">${portal === 'admin' ? 'Agency Owner' : 'Demo Partner A'}<small>${portal === 'admin' ? 'Administrator' : 'Delivery partner'}</small></span><span aria-hidden="true">⌄</span></button><div class="dropdown" id="profile-dropdown" hidden><a href="${url(`pages/${portal}/${portal === 'admin' ? 'settings' : 'profile'}.html`)}">Profile & preferences</a><a href="${url('pages/auth/select-role.html')}">Switch demo role</a><a href="${url('pages/auth/login.html')}">Exit demo</a></div></div></div></header><main class="content" id="main"><div class="page-heading"><div><h1>${page === 'dashboard' && portal === 'admin' ? 'Welcome back' : esc(title)}<span class="demo-tag">DEMO DATA</span></h1><p>${subtitle(page, portal)}</p></div><div class="heading-actions">${action}</div></div><div id="page-content"></div><footer class="footer"><span>© 2026 GAS AGENCY · Designed for everyday progress</span><span>Frontend prototype · Sample period: 12–18 Oct 2026</span></footer></main><dialog id="modal" aria-label="Demo dialog"></dialog><div id="toast" role="status" aria-live="polite"></div>`;
}
function subtitle(page, portal) {
    if (page === 'dashboard')
        return portal === 'admin' ? 'Agency operations overview' : 'A clear view of your day. Every delivery matters.';
    return ({
        stock: 'Your inventory, in balance. Track every cylinder.', customers: 'Every connection, thoughtfully managed.', deliveries: 'From your godown to their doorstep.', reports: 'A clearer perspective on your agency.', payments: 'Keep every collection accounted for.', settlements: 'Review collections and close the day with confidence.'
    })[page] || 'Manage your agency with clarity. All records are fictional demo data.';
}
export function initializeNavigation() {
    const menu = document.querySelector('#menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mobileQuery = matchMedia('(max-width:900px)');
    sidebar.inert = mobileQuery.matches;
    menu.setAttribute('aria-expanded', !mobileQuery.matches);
    mobileQuery.addEventListener('change', () => {
        sidebar.inert = mobileQuery.matches && !document.body.classList.contains('mobile-open');
        menu.setAttribute('aria-expanded', mobileQuery.matches ? document.body.classList.contains('mobile-open') : !document.body.classList.contains('collapsed'));
    });
    menu.onclick = () => {
        if (matchMedia('(max-width:900px)').matches) {
            document.body.classList.toggle('mobile-open');
            sidebar.inert = !document.body.classList.contains('mobile-open');
            menu.setAttribute('aria-expanded', document.body.classList.contains('mobile-open'));
            if (document.body.classList.contains('mobile-open'))
                document.querySelector('.sidebar a').focus();
        }
        else {
            document.body.classList.toggle('collapsed');
            menu.setAttribute('aria-expanded', !document.body.classList.contains('collapsed'));
        }
    };
    function closeMenu() {
        document.body.classList.remove('mobile-open');
        sidebar.inert = mobileQuery.matches;
        menu.setAttribute('aria-expanded', 'false');
    }
    document.querySelector('#backdrop').onclick = closeMenu;
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeMenu();
            document.querySelector('#profile-dropdown').hidden = true;
            menu.focus();
        }
        if (e.key === 'Tab' && document.body.classList.contains('mobile-open')) {
            const focusables = [...document.querySelectorAll('.sidebar a')];
            if (e.shiftKey && document.activeElement === focusables[0]) {
                e.preventDefault();
                focusables.at(-1).focus();
            }
            else if (!e.shiftKey && document.activeElement === focusables.at(-1)) {
                e.preventDefault();
                focusables[0].focus();
            }
        }
    });
    document.querySelector('#notifications').onclick = () => toast('Demo notification: 19 kg full stock is below the 150-cylinder reorder level.');
    const toggle = document.querySelector('#profile-toggle'), dropdown = document.querySelector('#profile-dropdown');
    toggle.onclick = () => {
        dropdown.hidden = !dropdown.hidden;
        toggle.setAttribute('aria-expanded', !dropdown.hidden);
    };
    document.addEventListener('click', e => {
        if (!e.target.closest('.profile-menu')) {
            dropdown.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
        }
    });
}
