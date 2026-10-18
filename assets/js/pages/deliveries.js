import { runWorkflow } from '../workflow.js';
import { data, saveDemo, nextId, customer, partner, prices, dateLabel, sampleDate, money } from '../demo-data.js';
import { metric, table, badge, esc, field, select, dialog, toast } from '../ui.js';
import { url } from '../navigation.js';
import { deliveryRows, deliveryColumns } from './dashboard.js';
export function deliveriesPage(portal = 'admin', history = false) {
    let records = portal === 'delivery' ? data.deliveries.filter(d => d.staff === (data.currentStaffId || 'STF-101')) : data.deliveries;
    if (history)
        records = records.filter(d => ['Delivered', 'Failed', 'Cancelled'].includes(d.status));
    return `<div class="metrics">${metric('Total deliveries', records.length, 'Current demo records', 'deliveries')}${metric('Pending / assigned', records.filter(d => ['Pending', 'Assigned'].includes(d.status)).length, 'Awaiting dispatch', 'calendar', 'amber')}${metric('Completed', records.filter(d => d.status === 'Delivered').length, 'Demo delivery workflow', 'check', 'green')}${metric('In progress / failed', records.filter(d => ['In Progress', 'Failed'].includes(d.status)).length, `${records.filter(d => d.status === 'In Progress').length} in progress · ${records.filter(d => d.status === 'Failed').length} failed`, 'deliveries', 'cyan')}</div>${history ? `<div class="glass panel" style="margin-bottom:20px"><div class="form-grid">${field('From date', 'history-from', 'date', '2026-10-01')}${field('To date', 'history-to', 'date', '2026-10-31')}</div><button class="button small" id="history-dates" style="margin-top:12px">Apply date range</button></div>` : ''}${table('deliveries', [...deliveryColumns.slice(0, 6), 'Assigned staff', 'Action'], deliveryRows(records, portal).map((r, i) => ({
        ...r, cells: [...r.cells.slice(0, 6), esc(partner(records[i].staff)?.name), r.cells[6]]
    })), {
        title: 'deliveries', filters: ['Pending', 'Assigned', 'In Progress', 'Delivered', 'Failed', 'Cancelled']
    })}`;
}
export function createDelivery() {
    if (!data.customers.some(c => c.status === 'Active') || !data.staff.some(s => s.status === 'Active') || !data.stock.length)
        return `<section class="glass panel"><h2>Complete setup before booking</h2><p>Add an active customer, an active delivery partner, cylinder types and available stock before creating a delivery.</p><div class="action-row"><a class="button" href="${url('pages/admin/customers.html')}">Customers</a><a class="button" href="${url('pages/admin/staff.html')}">Staff</a><a class="button" href="${url('pages/admin/stock.html')}">Inventory</a></div></section>`;
    return `<section class="glass panel" style="max-width:950px"><div class="panel-heading"><div><h2>Create a delivery</h2><p>A smoother delivery starts with the right details.</p></div></div><p class="form-note">${data.connected ? 'Creates a delivery and allocates godown stock in your connected agency.' : 'DEMO MODE · Creates a temporary record in this browser tab. No real delivery is booked.'}</p><form id="delivery-form"><div class="form-grid">${select('Customer type', 'customerType', ['Registered Customer', 'Walk-in Customer'])}${select('Customer', 'customer', data.customers.map(c => [c.id, c.name + ' · ' + c.type]))}${select('Cylinder type', 'size', Object.keys(prices))}${field('Quantity', 'qty', 'number', 1, 'required min="1" max="20" step="1"')}${field('Delivery date', 'date', 'date', sampleDate, 'required')}${select('Assign delivery partner', 'staff', data.staff.filter(s => s.status === 'Active').map(s => [s.id, s.name]))}<label class="full-width">Delivery address<textarea name="address" required minlength="5" maxlength="180">${esc(data.customers[0]?.address || '')}</textarea></label>${select('Payment method', 'method', ['Cash', 'UPI'])}<label>Delivery notes<textarea name="notes" maxlength="400"></textarea></label></div><div class="form-actions"><a class="button" href="${url('pages/admin/deliveries.html')}">Cancel</a><button class="button primary">${data.connected ? 'Create delivery' : 'Create demo delivery'}</button></div></form></section>`;
}
export function deliveryDetails(portal) {
    const id = new URLSearchParams(location.search).get('id') || data.deliveries.find(d => portal === 'admin' || d.staff === (data.currentStaffId || 'STF-101'))?.id;
    const d = data.deliveries.find(d => d.id === id && (portal === 'admin' || d.staff === (data.currentStaffId || 'STF-101')));
    if (!d)
        return `<section class="glass panel"><h2>Delivery not found</h2><p>Choose an available demo delivery from your delivery list.</p></section>`;
    const fields = {
        'Delivery reference': d.id, Customer: customer(d.customer)?.name, 'Assigned partner': partner(d.staff)?.name, 'Cylinder details': `${d.qty} × ${d.size}`, 'Delivery address': d.address, 'Payment method': d.method, 'Demo amount': money((d.unitPrice ?? prices[d.size]) * d.qty), 'Payment status': d.payment
    };
    return `<div class="grid-two"><section class="glass panel"><div class="panel-heading"><h2>${esc(d.id)}</h2>${badge(d.status)}</div><dl class="detail-list">${Object.entries(fields).map(([l, v]) => `<div><dt>${l}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="section-gap">${esc(d.notes || 'No special instructions.')}</p></section><section class="glass panel"><h2>Delivery timeline</h2><p style="font-size:11px;margin:5px 0 25px">Sample workflow events</p><ol class="timeline">${[...d.timeline, ...(d.timeline.at(-1)?.status !== d.status ? [{
                status: d.status, date: d.date
            }] : [])].map(t => `<li>${esc(t.status)}<small>${dateLabel(t.date)}</small></li>`).join('')}</ol></section></div><section class="glass panel"><h2>Demo delivery actions</h2><p>Changes below demonstrate the workflow and update this tab’s fictional records.</p><div class="action-row" data-delivery-id="${esc(d.id)}">${['Assigned', 'Pending'].includes(d.status) ? '<button class="button primary" data-status="In Progress">Start demo delivery</button>' : ''}${d.status === 'In Progress' ? '<button class="button" data-status="Delivered">Mark delivered</button>' : ''}${['Assigned', 'Pending', 'In Progress'].includes(d.status) ? '<button class="button" data-status="Failed">Mark failed</button>' : ''}${portal === 'admin' && ['Assigned', 'Pending', 'In Progress', 'Failed'].includes(d.status) ? '<button class="button" data-status="Cancelled">Cancel delivery</button>' : ''}${portal === 'admin' && d.status === 'Failed' ? '<button class="button" data-status="Assigned">Retry assigned delivery</button>' : ''}<a class="button" href="${url(`pages/${portal}/${portal === 'admin' ? 'deliveries' : 'my-deliveries'}.html`)}">Back to deliveries</a></div></section><section class="glass panel section-gap"><h2>OTP verification preview</h2><p class="form-note section-gap">OTP DEMO — Real verification requires secure backend integration. No OTP is generated, sent, or validated.</p><div class="otp-inputs">${Array.from({
        length: 6
    }, (_, i) => `<input inputmode="numeric" pattern="[0-9]" maxlength="1" aria-label="Demo OTP digit ${i + 1}">`).join('')}</div><small>Expiry: preview only · No active code</small><div class="action-row"><button class="button" id="otp-preview">Preview verification state</button><button class="button" id="otp-resend">Resend OTP · demo</button></div><p id="otp-status" role="status" style="margin-top:12px"></p></section>`;
}
export function initializeDeliveries(refresh) {
    const form = document.querySelector('#delivery-form');
    if (form) {
        function syncCustomers() {
            const type = form.elements.customerType.value;
            const list = data.customers.filter(c => c.type === type);
            form.elements.customer.innerHTML = list.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
            form.elements.address.value = customer(form.elements.customer.value)?.address || '';
        }
        form.elements.customerType.onchange = syncCustomers;
        form.elements.customer.onchange = () => form.elements.address.value = customer(form.elements.customer.value)?.address || '';
        syncCustomers();
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!form.reportValidity())
                return;
            if (form.dataset.pending)
                return;
            form.dataset.pending = 'true';
            try {
                const values = Object.fromEntries(new FormData(form));
                values.requestId = form.dataset.requestId || (form.dataset.requestId = crypto.randomUUID());
                const record = await runWorkflow('createDelivery', values);
                location.href = url('pages/admin/delivery-details.html?id=' + record.id);
            }
            catch (error) {
                toast(error.message);
            }
            finally {
                delete form.dataset.pending;
            }
        };
    }
    document.querySelectorAll('[data-status]').forEach(b => b.onclick = () => {
        const id = b.closest('[data-delivery-id]').dataset.deliveryId, d = data.deliveries.find(d => d.id === id);
        const completed = b.dataset.status === 'Delivered';
        dialog('Update delivery', `<p>Change ${esc(id)} to <strong>${esc(b.dataset.status)}</strong>? Demo changes affect inventory and the timeline.</p><form>${completed ? field('Empty cylinders collected', 'emptyReturned', 'number', 0, `required min="0" max="${d.qty}" step="1"`) : ''}<div class="form-actions"><button class="button primary">Confirm update</button></div></form>`, async (values) => {
            await runWorkflow('transitionDelivery', {
                id, status: b.dataset.status, emptyReturned: values.emptyReturned || 0
            });
            refresh();
            toast('Delivery workflow updated.');
        });
    });
    if (data.connected) {
        document.querySelectorAll('.otp-inputs input,#otp-preview,#otp-resend').forEach(control => control.disabled = true);
        const note = document.querySelector('#otp-status');
        if (note)
            note.textContent = 'Production OTP verification is not configured. Live completion is disabled.';
    }
    document.querySelector('#otp-preview')?.addEventListener('click', () => {
        document.querySelector('#otp-status').textContent = 'Demo preview complete. Recipient identity has not been verified.';
    });
    document.querySelector('#otp-resend')?.addEventListener('click', () => toast('Demo only: no SMS or email was sent.'));
    document.querySelectorAll('.otp-inputs input').forEach((input, i, inputs) => input.oninput = () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 1);
        if (input.value)
            inputs[i + 1]?.focus();
    });
    document.querySelector('#history-dates')?.addEventListener('click', () => {
        const from = document.querySelector('[name="history-from"]').value, to = document.querySelector('[name="history-to"]').value;
        if (!from || !to || from > to) {
            toast('Choose a valid date range.');
            return;
        }
        window.tableDateRange = [from, to];
        document.dispatchEvent(new CustomEvent('date-filter'));
    });
}
