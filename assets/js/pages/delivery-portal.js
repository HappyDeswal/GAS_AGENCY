import { data, partner, prices, money, sampleDate, dateLabel } from '../demo-data.js';
import { metric, table, badge, esc } from '../ui.js';
import { deliveryRows, deliveryColumns } from './dashboard.js';
import { chartPanel } from '../charts.js';
export function deliveryDashboard() {
    const list = data.deliveries.filter(d => d.staff === (data.currentStaffId || 'STF-101') && d.date === sampleDate);
    return `<p class="form-note">Business day: ${dateLabel(sampleDate)}. Summary cards use the current workspace records.</p><div class="metrics">${metric('Assigned today', list.length, dateLabel(sampleDate), 'deliveries')}${metric('Completed', list.filter(d => d.status === 'Delivered').length, 'Demo delivery records', 'check', 'green')}${metric('Pending', list.filter(d => ['Assigned', 'Pending', 'In Progress'].includes(d.status)).length, 'Ready for your next stop', 'calendar', 'amber')}${metric('Failed', list.filter(d => d.status === 'Failed').length, 'Sample exceptions', 'deliveries', 'cyan')}</div><div class="panel-heading"><div><h2>Your deliveries</h2><p>Open a delivery to start, complete, or mark it failed in demo mode.</p></div></div>${table('assigned', deliveryColumns, deliveryRows(list, 'delivery'), {
        title: 'deliveries', filters: ['Assigned', 'In Progress', 'Delivered', 'Failed']
    })}<p class="form-note section-gap">Counts are calculated from your demo records and update when you change a delivery status.</p>`;
}
export function dailySummary() {
    const list = data.deliveries.filter(d => d.staff === (data.currentStaffId || 'STF-101') && d.date === sampleDate);
    const records = data.payments.filter(p => p.status === 'Paid' && p.date === sampleDate && list.some(d => d.id === p.delivery));
    const sum = method => records.filter(p => p.method === method).reduce((s, p) => s + p.amount, 0);
    const submitted = data.settlements.find(s => s.staff === (data.currentStaffId || 'STF-101') && s.date === sampleDate)?.submitted || 0;
    return `<p class="form-note">Daily summary · ${dateLabel(sampleDate)}. UPI is a recorded method only; no money is transferred.</p><div class="metrics">${metric('Assigned', list.length, 'Sample day', 'deliveries')}${metric('Completed', list.filter(d => d.status === 'Delivered').length, 'Sample day', 'check', 'green')}${metric('Failed', list.filter(d => d.status === 'Failed').length, 'Sample day', 'deliveries', 'amber')}${metric('Pending', list.filter(d => ['Assigned', 'Pending', 'In Progress'].includes(d.status)).length, 'Includes deliveries in progress', 'calendar', 'cyan')}</div><div class="metrics">${metric('Cash collected', money(sum('Cash')), 'Paid demo entries', 'payments', 'green')}${metric('UPI collected', money(sum('UPI')), 'Paid demo entries', 'payments', 'cyan')}${metric('Cash submitted', money(submitted), 'From demo settlement review', 'payments')}${metric('Amount to settle', money(Math.max(0, sum('Cash') - submitted)), 'Cash collection less submission', 'payments', 'amber')}</div>`;
}
export function profilePage() {
    const s = partner(data.currentStaffId || 'STF-101');
    if (!s)
        return '<section class="glass panel"><h2>No linked staff profile</h2><p>Ask an administrator to link your account to an active staff record.</p></section>';
    const list = data.deliveries.filter(d => d.staff === s.id);
    return `<section class="glass panel" style="max-width:700px"><span class="avatar" style="width:65px;height:65px;font-size:23px">DA</span><h2 class="section-gap">${esc(s.name)}</h2><p>Delivery partner · Demo profile</p><dl class="detail-list">${Object.entries({
        'Staff ID': s.id, 'Contact placeholder': s.contact, Role: 'Delivery partner', Status: s.status, 'Assigned deliveries': list.length, 'Completed deliveries': list.filter(d => d.status === 'Delivered').length
    }).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="form-note section-gap">This is a fictional profile preview. No real authentication or role authorization is connected.</p></section>`;
}
