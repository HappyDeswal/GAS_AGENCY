import { runWorkflow } from '../workflow.js';
import { data, saveDemo, nextId, customer, dateLabel, money } from '../demo-data.js';
import { table, badge, esc, dialog, field, select, toast } from '../ui.js';
import { url } from '../navigation.js';
import { deliveryRows, deliveryColumns } from './dashboard.js';
export function customersPage() {
    return table('customers', ['Customer ID', 'Name', 'Mobile', 'Address', 'Type', 'Consumer no.', 'Last delivery', 'Status', 'Action'], data.customers.map(c => ({
        filter: c.type, cells: [esc(c.id), esc(c.name), esc(c.mobile), esc(c.address), esc(c.type), esc(c.consumer), data.deliveries.filter(d => d.customer === c.id).sort((a, b) => b.date.localeCompare(a.date))[0]?.date || '—', badge(c.status), `<a class="button small" href="${url('pages/admin/customer-details.html?id=' + c.id)}">View details →</a>`]
    })), {
        title: 'customers', filters: ['Registered Customer', 'Walk-in Customer'], filterLabel: 'types'
    });
}
export function customerDetails() {
    const id = new URLSearchParams(location.search).get('id') || data.customers[0]?.id;
    const c = customer(id);
    if (!c)
        return '<section class="glass panel"><h2>Customer not found</h2><p>Select a customer from the customer list.</p></section>';
    const deliveries = data.deliveries.filter(d => d.customer === id), payments = data.payments.filter(p => deliveries.some(d => d.id === p.delivery));
    return `<section class="glass panel"><div class="panel-heading"><h2>${esc(c.name)}</h2>${badge(c.status)}</div><dl class="detail-list">${Object.entries({
        'Customer ID': c.id, 'Mobile placeholder': c.mobile, Address: c.address, 'Customer type': c.type, 'Consumer number': c.consumer, 'Cylinder sizes': [...new Set(deliveries.map(d => d.size))].join(', ') || 'No deliveries'
    }).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section><div class="panel-heading section-gap"><h2>Delivery history</h2></div>${table('customer-deliveries', deliveryColumns, deliveryRows(deliveries), {
        title: 'deliveries'
    })}<div class="panel-heading section-gap"><h2>Payment history</h2></div>${table('customer-payments', ['Payment', 'Delivery', 'Amount', 'Method', 'Status', 'Date'], payments.map(p => ({
        cells: [esc(p.id), esc(p.delivery), money(p.amount), esc(p.method), badge(p.status), dateLabel(p.date)]
    })), {
        title: 'payments'
    })}`;
}
export function initializeCustomers(refresh) {
    (document.querySelector('#add-customer') || {}).onclick = () => dialog('Add customer', `<p class="form-note">${data.connected ? 'Changes save to the connected agency.' : 'Use fictional information only. Phone numbers remain masked.'}</p><form><div class="form-grid">${field('Name', 'name', 'text', '', 'required minlength="2" maxlength="60"')}${data.connected ? field('Mobile (international format)', 'mobile', 'tel', '', 'pattern="\\+[1-9][0-9]{7,14}"') : ''}${select('Customer type', 'type', ['Registered Customer', 'Walk-in Customer'])}${field('Address', 'address', 'text', '', 'required minlength="5" maxlength="180"')}${field('Consumer reference', 'consumer', 'text', '', 'maxlength="80"')}</div><div class="form-actions"><button class="button primary">Save customer</button></div></form>`, async (v) => {
        await runWorkflow('saveCustomer', v);
        refresh();
        toast('Customer record saved.');
    });
}
