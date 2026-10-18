import { serverRequest } from './server-api.js';
import { replaceWorkspaceData } from '../demo-data.js';
import { useWorkflowBackend } from '../workflow.js';
let state = {
    live: false
};
export function runtimeState() {
    return state;
}
export function normalizeWorkspace(tables, date, userId) {
    const types = new Map(tables.cylinder_types.map(t => [t.id, t]));
    const priceMap = Object.fromEntries(tables.cylinder_types.map(t => [t.name, Number(t.price_paise) / 100]));
    const snapshot = {
        connected: true,
        currentStaffId: tables.staff.find(s => s.auth_user_id === userId)?.id,
        customers: tables.customers.map(c => ({
            id: c.id, name: c.name, mobile: c.mobile || 'Not provided', address: c.address, type: c.customer_type === 'walk_in' ? 'Walk-in Customer' : 'Registered Customer', consumer: c.consumer_number || '', status: c.active ? 'Active' : 'Inactive'
        })),
        staff: tables.staff.map(s => ({
            id: s.id, name: s.name, contact: s.contact || 'Not provided', status: s.active ? 'Active' : 'Inactive', duty: s.on_duty ? 'On duty' : 'Off duty'
        })),
        stock: tables.cylinder_types.map(t => {
            const godown = tables.stock_balances.find(s => s.cylinder_type_id === t.id) || {};
            const partners = tables.staff_stock.filter(s => s.cylinder_type_id === t.id);
            return {
                size: t.name, godownFull: godown.full_count || 0, staffFull: partners.reduce((s, r) => s + r.full_count, 0), full: (godown.full_count || 0) + partners.reduce((s, r) => s + r.full_count, 0), empty: (godown.empty_count || 0) + partners.reduce((s, r) => s + r.empty_count, 0), damaged: godown.damaged_count || 0, missing: godown.missing_count || 0, reserve: 0
            };
        }),
        deliveries: tables.deliveries.map(d => ({
            id: d.id, reference: d.reference, customer: d.customer_id, staff: d.staff_id, size: types.get(d.cylinder_type_id)?.name || 'Unknown', qty: d.quantity, unitPrice: Number(d.unit_price_paise) / 100, date: d.delivery_date, status: d.status, payment: d.payment_status, method: d.payment_method === 'upi' ? 'UPI' : 'Cash', address: d.address, notes: d.notes, timeline: tables.delivery_events.filter(e => e.delivery_id === d.id).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(e => ({
                status: e.status, date: e.created_at.slice(0, 10)
            }))
        })),
        movements: tables.stock_movements.map(m => ({
            id: m.id, date: m.created_at.slice(0, 10), size: types.get(m.cylinder_type_id)?.name || 'Unknown', qty: m.quantity, type: m.movement_type, from: m.from_location, to: m.to_location, status: 'Completed', delivery: m.delivery_id
        })),
        payments: tables.payments.map(p => ({
            id: p.id, delivery: p.delivery_id, amount: Number(p.amount_paise) / 100, method: p.method === 'upi' ? 'UPI' : 'Cash', status: p.status, date: p.paid_on
        })),
        settlements: tables.settlements.map(s => ({
            id: s.id, staff: s.staff_id, date: s.settlement_date, submitted: Number(s.submitted_paise) / 100, status: s.submitted_paise === s.cash_expected_paise ? 'Settled' : 'Pending'
        })),
        reports: {
            deliveries: [], collections: [], labels: []
        }
    };
    for (let i = 6; i >= 0; i--) {
        const day = new Date(date + 'T12:00:00Z');
        day.setUTCDate(day.getUTCDate() - i);
        const key = day.toISOString().slice(0, 10);
        snapshot.reports.labels.push(day.toLocaleDateString('en-US', {
            weekday: 'short', timeZone: 'UTC'
        }));
        snapshot.reports.deliveries.push(snapshot.deliveries.filter(d => d.date === key).length);
        snapshot.reports.collections.push(snapshot.payments.filter(p => p.date === key && p.status === 'Paid').reduce((s, p) => s + p.amount, 0));
    }
    return {
        snapshot, priceMap
    };
}
export async function initializeRuntime(portal) {
    if (typeof document !== 'undefined' && !document.querySelector('meta[name="gas-server"]'))
        return state;
    let status;
    try {
        const response = await fetch('/api/status', {
            credentials: 'same-origin'
        });
        if (!response.ok)
            throw Error('Status request failed.');
        status = await response.json();
    }
    catch {
        throw Error('Agency services are unavailable. Please reload to retry. No changes have been saved.');
    }
    if (typeof status?.configured !== 'boolean')
        throw Error('Agency status is invalid. Please reload to retry.');
    if (!status.configured)
        return state;
    state = {
        live: true, session: null
    };
    try {
        state.session = await serverRequest('session');
    }
    catch (error) {
        if (portal !== 'auth') {
            location.replace(new URL('../../../pages/auth/login.html', import.meta.url));
            throw Error('Sign in required.');
        }
        return state;
    }
    let selected;
    try {
        selected = sessionStorage.getItem('gas-agency-selection');
    }
    catch {
    }
    state.agency = state.session.members.find(m => m.agency_id === selected)?.agency_id || state.session.members[0]?.agency_id;
    if (portal === 'auth')
        return state;
    const membership = state.session.members.find(m => m.agency_id === state.agency);
    if (portal === 'admin' && !['owner', 'admin'].includes(membership?.role)) {
        location.replace(new URL('../../../pages/delivery/dashboard.html', import.meta.url));
        throw Error('Admin access required.');
    }
    if (portal === 'delivery' && ['owner', 'admin'].includes(membership?.role)) {
        location.replace(new URL('../../../pages/admin/dashboard.html', import.meta.url));
        throw Error('Opening your owner workspace.');
    }
    const result = await serverRequest('data?agency=' + encodeURIComponent(state.agency));
    const normalized = normalizeWorkspace(result.tables, result.businessDate, state.session.userId);
    replaceWorkspaceData(normalized.snapshot, result.businessDate, normalized.priceMap);
    useWorkflowBackend({
        async execute(name, values) {
            const type = result.tables.cylinder_types.find(t => t.name === values.size);
            let operation, parameters;
            if (['saveCustomer', 'saveStaff'].includes(name)) {
                const isCustomer = name === 'saveCustomer';
                const fields = isCustomer ? {
                    name: values.name, address: values.address, mobile: values.mobile || null, customer_type: values.type === 'Walk-in Customer' ? 'walk_in' : 'registered', consumer_number: values.consumer || null, active: true
                } : {
                    name: values.name, active: values.status === 'Active', on_duty: values.duty === 'On duty', contact: values.contact === undefined ? undefined : values.contact || null, auth_user_id: values.authUserId || undefined
                };
                const saved = await serverRequest('metadata', {
                    agency: state.agency, table: isCustomer ? 'customers' : 'staff', id: values.id, values: fields
                });
                location.reload();
                return saved;
            }
            if (name === 'reviewSettlement') {
                operation = 'review_settlement';
                parameters = {
                    p_staff_id: values.staff, p_date: values.date, p_submitted_paise: Math.round(Number(values.submitted) * 100)
                };
            }
            if (name === 'adjustStock') {
                operation = 'adjust_stock';
                parameters = {
                    p_cylinder_type_id: type?.id, p_quantity: Number(values.qty), p_category: values.category, p_reason: values.reason
                };
            }
            if (name === 'returnEmpties') {
                operation = 'return_empty_stock';
                parameters = {
                    p_staff_id: values.staff, p_cylinder_type_id: type?.id, p_quantity: Number(values.qty)
                };
            }
            if (name === 'receiveStock') {
                operation = 'receive_stock';
                parameters = {
                    p_cylinder_type_id: type?.id, p_quantity: Number(values.qty)
                };
            }
            if (name === 'createDelivery') {
                operation = 'create_delivery';
                parameters = {
                    p_customer_id: values.customer, p_staff_id: values.staff, p_cylinder_type_id: type?.id, p_quantity: Number(values.qty), p_delivery_date: values.date, p_address: values.address, p_payment_method: values.method.toLowerCase(), p_request_id: values.requestId || crypto.randomUUID(), p_notes: values.notes || ''
                };
            }
            if (name === 'transitionDelivery') {
                operation = 'transition_delivery';
                parameters = {
                    p_delivery_id: values.id, p_status: values.status, p_empty_returned: Number(values.emptyReturned || 0)
                };
            }
            if (name === 'recordPayment') {
                if (values.status && values.status !== 'Paid')
                    throw Error('Connected collections record confirmed payments only.');
                operation = 'record_payment';
                parameters = {
                    p_delivery_id: values.delivery, p_method: values.method.toLowerCase(), p_paid_on: values.date, p_request_id: values.requestId || crypto.randomUUID()
                };
            }
            if (!operation)
                throw Error('This connected workflow has not been enabled.');
            const saved = await serverRequest('operation', {
                name: operation, parameters: {
                    ...parameters, p_agency_id: state.agency
                }
            });
            if (name !== 'createDelivery')
                location.reload();
            return saved;
        }
    });
    return state;
}
export async function configureConnectedAuth() {
    const form = document.querySelector('#login-form');
    if (!form) return;
    const button = form.querySelector('button[type="submit"]');
    const notice = document.querySelector('.auth-notice');
    if (!state.live) {
        button.disabled = true;
        notice.textContent = 'Sign-in is unavailable until Supabase is configured on the application server. Sample workspaces below are separate from account sign-in.';
        form.addEventListener('submit', event => event.preventDefault());
        return;
    }
    document.querySelector('.demo-access')?.remove();
    notice.textContent = 'Your database account determines access. Use your registered email as your username.';
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity() || form.dataset.pending) return;
        form.dataset.pending = 'true';
        button.disabled = true;
        document.querySelector('#login-error').textContent = '';
        try {
            let agency;
            try { agency = sessionStorage.getItem('gas-agency-selection'); } catch {}
            const result = await serverRequest('login', {
                email: form.elements.username.value.trim(), password: form.elements.password.value,
                portal: document.body.dataset.loginRole || '', agency
            });
            form.elements.password.value = '';
            if (!['owner', 'delivery'].includes(result.portal) || !result.agencyId)
                throw Error('Invalid sign-in response. Please try again.');
            try { sessionStorage.setItem('gas-agency-selection', result.agencyId); } catch {}
            location.href = new URL('../' + (result.portal === 'owner' ? 'admin' : 'delivery') + '/dashboard.html', location.href).href;
        } catch (error) {
            document.querySelector('#login-error').textContent = error.message;
        } finally {
            delete form.dataset.pending;
            button.disabled = false;
        }
    });
}
export function initializeConnectedNavigation() {
    if (!state.live)
        return;
    document.addEventListener('click', async (event) => {
        const link = event.target.closest('a');
        if (link && new URL(link.href).pathname.endsWith('/auth/login.html')) {
            event.preventDefault();
            try {
                await serverRequest('logout', {});
            }
            finally {
                location.href = link.href;
            }
        }
    }, {
        capture: true
    });
}
