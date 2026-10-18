import { customerBalances, dailyClosing } from '../workflow.js';
import { data, prices, money, sampleDate, partner } from '../demo-data.js';
import { metric, field, select, table, badge, esc, downloadCSV, toast, initializeTables } from '../ui.js';
import { chartPanel } from '../charts.js';
export function reportsPage() {
    return `<section class="glass panel" style="margin-bottom:23px"><div class="form-grid">${select('Report period', 'report-period', ['This Week', 'Today', 'This Month', 'Custom Date Range'])}<div class="form-grid">${field('From', 'report-from', 'date', '2026-10-12', 'required')}${field('To', 'report-to', 'date', '2026-10-18', 'required')}</div></div><div class="action-row"><button class="button primary" id="apply-reports">Apply range</button>${select('Export dataset', 'report-dataset', ['Deliveries', 'Cylinder stock', 'Payments', 'Settlements', 'Staff performance', 'Customer balances', 'Daily closing'])}<button class="button" id="export-report">Export CSV</button></div><p id="report-range" class="section-gap" style="font-size:11px"></p></section><div id="report-metrics"></div><div id="closing-report"></div><div id="balance-report"></div><div class="grid-two">${chartPanel('report-deliveries', 'Delivery trends', data.connected ? 'Agency records · seven days ending ' + sampleDate : 'Illustrative weekly series · 12–18 Oct 2026', false)}${chartPanel('report-payment', 'Payment trends', data.connected ? 'Agency collections · last seven days · INR' : 'Illustrative weekly collections · INR', false)}${chartPanel('report-stock', 'Stock distribution', 'Current session inventory · Independent of date range', false)}${chartPanel('report-success', 'Delivery success rate', 'Current session delivery counts · Independent of date range', false)}</div><p class="form-note">Date filters apply to record metrics and CSV exports. ${data.connected ? 'The trend charts show the last seven business dates through ' + sampleDate + '.' : 'The trend charts show the fixed, labeled demonstration week.'}</p>`;
}
export function initializeReports() {
    if (!document.querySelector('#apply-reports'))
        return;
    const from = document.querySelector('[name="report-from"]'), to = document.querySelector('[name="report-to"]'), period = document.querySelector('[name="report-period"]');
    const anchor = new Date(sampleDate + 'T12:00:00Z');
    const monday = new Date(anchor);
    monday.setUTCDate(anchor.getUTCDate() - ((anchor.getUTCDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const iso = d => d.toISOString().slice(0, 10);
    const week = [iso(monday), iso(sunday)];
    from.value = week[0];
    to.value = week[1];
    function range() {
        if (!from.value || !to.value || from.value > to.value) {
            toast('Choose a valid start and end date.');
            return false;
        }
        return [from.value, to.value];
    }
    function filtered(records) {
        const r = range();
        return r ? records.filter(d => d.date >= r[0] && d.date <= r[1]) : [];
    }
    function apply() {
        if (!range())
            return;
        const deliveries = filtered(data.deliveries), payments = filtered(data.payments).filter(p => p.status === 'Paid');
        document.querySelector('#report-range').textContent = `Record range: ${from.value} to ${to.value}. Business-date anchor: ${sampleDate}${data.connected ? '' : ' (sample)'}.`;
        document.querySelector('#report-metrics').innerHTML = `<div class="metrics">${metric('Deliveries', deliveries.length, 'Filtered sample records', 'deliveries')}${metric('Collections', money(payments.reduce((s, p) => s + p.amount, 0)), 'Filtered paid records', 'payments', 'green')}${metric('Delivered', deliveries.filter(d => d.status === 'Delivered').length, 'Filtered sample records', 'check', 'cyan')}${metric('Success rate', `${deliveries.length ? Math.round(deliveries.filter(d => d.status === 'Delivered').length / deliveries.length * 100) : 0}%`, 'Delivered / all filtered records', 'reports')}</div>`;
        const closing = dailyClosing(to.value);
        document.querySelector('#closing-report').innerHTML = `<div class="panel-heading"><div><h2>Daily closing · ${esc(to.value)}</h2><p>Full-cylinder reconciliation from recorded movements; closing date is the last day of the selected range.</p></div></div><div class="metrics">${metric('Opening full', closing.openingFull, 'Recorded movement basis', 'stock')}${metric('Received full', closing.receivedFull, 'Supplier receipts', 'stock')}${metric('Delivered / adjusted', closing.deliveredFull + ' / ' + closing.adjustedFull, 'Issues and category adjustments', 'stock')}${metric('Closing full', closing.closingFull, 'Opening + receipts − issues − adjustments', 'stock')}</div><p class="form-note">Cash: ${money(closing.cashCollected)} · UPI: ${money(closing.upiCollected)} · Submitted cash: ${money(closing.cashSubmitted)} · Cash outstanding: ${money(closing.cashOutstanding)}. Legacy demo deliveries predate the operational movement ledger.</p>`;
        document.querySelector('#balance-report').innerHTML = `<div class="panel-heading"><div><h2>Customer outstanding balances</h2><p>All-time completed deliveries and confirmed collections; pending bookings are excluded.</p></div></div>${table('balances', ['Customer', 'Name', 'Completed delivery amount', 'Collected', 'Outstanding'], customerBalances().map(row => ({
            cells: [esc(row.customer), esc(row.name), money(row.invoiced), money(row.collected), money(row.outstanding)]
        })), {
            title: 'balances'
        })}<div class="section-gap"></div>`;
        initializeTables();
    }
    period.onchange = () => {
        const ranges = {
            'Today': [sampleDate, sampleDate], 'This Week': week, 'This Month': [sampleDate.slice(0, 7) + '-01', iso(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0, 12)))]
        };
        if (ranges[period.value])
            [from.value, to.value] = ranges[period.value];
    };
    from.onchange = to.onchange = () => period.value = 'Custom Date Range';
    document.querySelector('#apply-reports').onclick = apply;
    document.querySelector('#export-report').onclick = () => {
        if (!range())
            return;
        const dataset = document.querySelector('[name="report-dataset"]').value;
        let records;
        if (dataset === 'Deliveries')
            records = filtered(data.deliveries).map(({ timeline, ...r }) => r);
        if (dataset === 'Payments')
            records = filtered(data.payments);
        if (dataset === 'Cylinder stock')
            records = data.stock;
        if (dataset === 'Settlements')
            records = filtered(data.settlements);
        if (dataset === 'Staff performance')
            records = data.staff.map(s => {
                const ds = filtered(data.deliveries).filter(d => d.staff === s.id);
                return {
                    staff: s.name, assigned: ds.length, completed: ds.filter(d => d.status === 'Delivered').length
                };
            });
        if (dataset === 'Customer balances')
            records = customerBalances();
        if (dataset === 'Daily closing')
            records = [dailyClosing(to.value)];
        downloadCSV(`gas-agency-${dataset.toLowerCase().replaceAll(' ', '-')}.csv`, records);
    };
    apply();
}
