import { runWorkflow } from '../workflow.js';
import { data, saveDemo, nextId, customer, partner, prices, money, dateLabel, sampleDate } from '../demo-data.js';
import { metric, table, badge, esc, dialog, field, select, toast } from '../ui.js';
export function collectionFor(staffId) {
    const deliveries = data.deliveries.filter(d => d.staff === staffId);
    const records = data.payments.filter(p => p.status === 'Paid' && p.date === sampleDate && deliveries.some(d => d.id === p.delivery));
    const cash = records.filter(p => p.method === 'Cash').reduce((s, p) => s + p.amount, 0), upi = records.filter(p => p.method === 'UPI').reduce((s, p) => s + p.amount, 0);
    return {
        deliveries: deliveries.filter(d => d.date === sampleDate), cash, upi, total: cash + upi
    };
}
export function paymentsPage() {
    const paid = data.payments.filter(p => p.status === 'Paid');
    const sum = method => paid.filter(p => !method || p.method === method).reduce((s, p) => s + p.amount, 0);
    return `<div class="metrics">${metric('Total collected', money(sum()), 'From listed paid demo records', 'payments')}${metric('Cash collected', money(sum('Cash')), 'Demo cash entries', 'payments', 'green')}${metric('UPI collected', money(sum('UPI')), 'No real UPI transactions', 'payments', 'cyan')}${metric('Pending payments', money(data.deliveries.filter(d => d.payment !== 'Paid' && d.status === 'Delivered').reduce((s, d) => s + (d.unitPrice ?? prices[d.size]) * d.qty, 0)), 'From pending demo deliveries', 'payments', 'amber')}</div>${table('payments', ['Payment ID', 'Delivery', 'Customer', 'Amount', 'Method', 'Status', 'Date', 'Action'], data.payments.map(p => ({
        filter: p.status, cells: [esc(p.id), esc(p.delivery), esc(customer(data.deliveries.find(d => d.id === p.delivery)?.customer)?.name), money(p.amount), esc(p.method), badge(p.status), dateLabel(p.date), `<button class="button small" data-payment="${p.id}">View details</button>`]
    })), {
        title: 'payments', filters: ['Paid', 'Pending', 'Failed']
    })}`;
}
export function settlementsPage() {
    const collections = data.staff.map(s => collectionFor(s.id));
    const cash = collections.reduce((sum, c) => sum + c.cash, 0);
    const upi = collections.reduce((sum, c) => sum + c.upi, 0);
    const submitted = data.settlements.filter(s => s.date === sampleDate).reduce((sum, s) => sum + s.submitted, 0);
    const metrics = `<div class="metrics">${metric('Total collections', money(cash + upi), 'Sample day · 15 Oct 2026', 'payments')}${metric('Cash due', money(cash), 'Demo cash collections', 'payments', 'green')}${metric('Submitted cash', money(submitted), 'Reviewed demo submissions', 'payments', 'cyan')}${metric('Outstanding cash', money(cash - submitted), 'Cash less submitted amounts', 'payments', 'amber')}</div>`;
    return `${metrics}<p class="form-note">Daily sample settlement · 15 Oct 2026. UPI is recorded separately; only cash is due for submission.</p>${table('settlements', ['Staff', 'Delivery count', 'Cash', 'UPI', 'Total', 'Submitted cash', 'Difference', 'Status', 'Action'], data.staff.map(s => {
        const c = collectionFor(s.id), settlement = data.settlements.find(r => r.staff === s.id && r.date === sampleDate), submitted = settlement?.submitted || 0;
        return {
            filter: settlement?.status || 'Pending', cells: [esc(s.name), c.deliveries.length, money(c.cash), money(c.upi), money(c.total), money(submitted), money(c.cash - submitted), badge(settlement?.status || 'Pending'), `<button class="button small" data-settlement="${s.id}">Review</button>`]
        };
    }), {
        title: 'settlements', filters: ['Pending', 'Settled']
    })}`;
}
export function initializePayments(refresh) {
    (document.querySelector('#add-payment') || {}).onclick = () => {
        const pending = data.deliveries.filter(d => d.payment !== 'Paid' && d.status === 'Delivered');
        if (!pending.length) {
            toast('All eligible demo deliveries are paid.');
            return;
        }
        dialog('Record collection', `<p class="form-note">${data.connected ? 'Saves a collection entry to your connected agency. This does not transfer money.' : 'No money is collected. Records are temporary and fictional.'} Amounts come from the selected delivery.</p><form><div class="form-grid">${select('Delivery', 'delivery', pending.map(d => [d.id, `${d.id} · ${money((d.unitPrice ?? prices[d.size]) * d.qty)}`]))}${select('Payment method', 'method', ['Cash', 'UPI'])}${select('Status', 'status', data.connected ? ['Paid'] : ['Paid', 'Pending', 'Failed'])}${field('Date', 'date', 'date', sampleDate, 'required')}</div><div class="form-actions"><button class="button primary">Record demo payment</button></div></form>`, async (v) => {
            await runWorkflow('recordPayment', v);
            refresh();
            toast('Demo collection recorded.');
        });
    };
    document.querySelectorAll('[data-payment]').forEach(b => b.onclick = () => {
        const p = data.payments.find(p => p.id === b.dataset.payment);
        dialog(p.id, `<p>DEMO PAYMENT · No real collection</p><dl class="detail-list">${Object.entries(p).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(k === 'amount' ? money(v) : v)}</dd></div>`).join('')}</dl>`);
    });
    document.querySelectorAll('[data-settlement]').forEach(b => b.onclick = () => {
        const id = b.dataset.settlement, c = collectionFor(id), record = data.settlements.find(r => r.staff === id && r.date === sampleDate);
        dialog('Review demo settlement', `<p>${esc(partner(id).name)} · Cash due: ${money(c.cash)} · UPI: ${money(c.upi)}</p><form class="section-gap">${field('Cash submitted', 'submitted', 'number', record?.submitted || 0, `required min="0" max="${c.cash}" step="1"`)}<p style="font-size:11px;margin-top:12px">Marked settled only when all collected cash is submitted.</p><div class="form-actions"><button class="button primary">Save demo review</button></div></form>`, async (v) => {
            await runWorkflow('reviewSettlement', {
                staff: id, date: sampleDate, submitted: v.submitted
            });
            refresh();
            toast('Settlement reviewed.');
        });
    });
}
