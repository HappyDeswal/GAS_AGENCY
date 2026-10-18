import { data, customer, prices, money, dateLabel } from '../demo-data.js';
import { table, esc, badge } from '../ui.js';
import { brand, url } from '../navigation.js';
export function receiptsPage() {
    const id = new URLSearchParams(location.search).get('id');
    if (!id)
        return `${table('receipts', ['Receipt', 'Delivery', 'Customer', 'Amount', 'Status', 'Action'], data.deliveries.filter(d => d.payment === 'Paid').map(d => ({
            cells: [`REC-${esc(d.id.slice(4))}`, esc(d.id), esc(customer(d.customer)?.name), money((d.unitPrice ?? prices[d.size]) * d.qty), badge(d.status), `<a class="button small" href="${url('pages/admin/receipts.html?id=' + d.id)}">View receipt →</a>`]
        })), {
            title: 'receipts'
        })}<p class="form-note section-gap">Demonstration receipts are generated from paid demo deliveries. They are not tax invoices.</p>`;
    const d = data.deliveries.find(r => r.id === id && r.payment === 'Paid');
    if (!d)
        return '<section class="glass panel"><h2>Receipt unavailable</h2><p>Choose a paid demo delivery from the receipt list.</p></section>';
    return `<div class="action-row no-print" style="margin:0 0 22px"><a class="button" href="${url('pages/admin/receipts.html')}">← All receipts</a><button class="button primary" id="print-receipt">Print receipt</button></div><article class="receipt glass"><header class="receipt-header">${brand()}<div><div class="eyebrow">DEMO RECEIPT</div><h2>REC-${esc(d.id.slice(4))}</h2><p>${dateLabel(d.date)}</p></div></header><dl class="detail-list"><div><dt>Customer</dt><dd>${esc(customer(d.customer)?.name)}</dd></div><div><dt>Delivery reference</dt><dd>${esc(d.id)}</dd></div><div><dt>Payment method</dt><dd>${esc(d.method)} · Paid</dd></div><div><dt>Delivery status</dt><dd>${esc(d.status)}</dd></div></dl><div class="table-scroll section-gap"><table><thead><tr><th>Item</th><th>Quantity</th><th>Unit price</th><th>Amount</th></tr></thead><tbody><tr><td>LPG cylinder · ${esc(d.size)}</td><td>${d.qty}</td><td>${money(prices[d.size])}</td><td>${money((d.unitPrice ?? prices[d.size]) * d.qty)}</td></tr></tbody></table></div><div class="receipt-total"><small>Total &nbsp;</small>${money((d.unitPrice ?? prices[d.size]) * d.qty)}</div><footer><p>Thank you for being part of our everyday.</p><small>Fictional demonstration receipt. Not a legally compliant tax invoice.</small></footer></article>`;
}
