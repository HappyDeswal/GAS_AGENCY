import { customerBalances } from '../workflow.js';
import { data, customer, dateLabel, money, sampleDate } from '../demo-data.js';
import { metric, icon, badge, esc, table } from '../ui.js';
import { url } from '../navigation.js';
import { chartPanel } from '../charts.js';
export function deliveryRows(records, portal = 'admin') {
    return records.map(d => ({
        filter: d.status, date: d.date, cells: [esc(d.id), `<span class="avatar" style="width:25px;height:25px;font-size:9px;margin-right:9px">${esc(customer(d.customer)?.name.slice(-1))}</span>${esc(customer(d.customer)?.name)}`, esc(d.size), d.qty, badge(d.status), dateLabel(d.date), `<a class="button small" href="${url(`pages/${portal}/delivery-details.html?id=${d.id}`)}">View details ${icon('arrow')}</a>`]
    }));
}
export const deliveryColumns = ['Delivery ID', 'Customer', 'Cylinder type', 'Quantity', 'Status', 'Date', 'Action'];
export function dashboard() {
    const shortcuts = [
        ['stock', 'Stock', 'stock'], ['deliveries', 'Deliveries', 'deliveries'],
        ['customers', 'Customers', 'customers'], ['staff', 'Team', 'customers'],
        ['reports', 'Reports', 'reports'], ['settings', 'More', 'settings']
    ];
    const tiles = [
        ['stock', 'Inventory', 'stock'], ['cylinders', 'Cylinders', 'stock'],
        ['customers', 'Customers', 'customers'], ['deliveries', 'Deliveries', 'deliveries'],
        ['payments', 'Payments', 'payments'], ['staff', 'Staff', 'customers'],
        ['reports', 'Reports', 'reports'], ['receipts', 'Receipts', 'receipt'],
        ['settlements', 'Settlements', 'payments']
    ];
    const pending = data.deliveries.filter(delivery => ['Assigned', 'Pending', 'In Progress'].includes(delivery.status));
    const next = pending[0];
    return `
    <div class="overview-layout">
      <div class="overview-center">
        <section class="welcome-card glass">
          <div class="welcome-copy">
            <span class="eyebrow">YOUR AGENCY, AT A GLANCE</span>
            <h2>A little clarity.<br>A smoother day.</h2>
            <p>Every cylinder, every connection.<br>All coming together in one place.</p>
          </div>
          <img class="hero-cylinder" src="${url('assets/images/cylinder-hero.svg')}" alt="Sage and lavender LPG cylinders">
          <div class="hero-strip"><span>${icon('calendar')} ${dateLabel(sampleDate)}</span><span>${icon('check')} A fresh perspective on your operations</span></div>
        </section>
        <nav class="circle-shortcuts" aria-label="Frequent agency actions">
          ${shortcuts.map(([page, label, symbol]) => `<a class="circle-link" href="${url(`pages/admin/${page}.html`)}"><span>${icon(symbol)}</span>${label}</a>`).join('')}
        </nav>
        <div class="panel-heading"><h2>Your agency in numbers</h2><small>${data.connected ? 'Agency overview' : 'Demo records'}</small></div>
        <div class="metrics overview-metrics">
          ${metric('Total stock', data.stock.reduce((sum, s) => sum + s.full + s.empty + s.damaged + s.missing, 0).toLocaleString('en-IN'), 'Current workspace inventory', 'stock')}
          ${metric('Daily deliveries', data.deliveries.filter(d => d.date === sampleDate).length, dateLabel(sampleDate), 'deliveries', 'cyan')}
          ${metric('Pending payments', money(customerBalances().reduce((sum, c) => sum + c.outstanding, 0)), 'Unpaid completed deliveries', 'payments', 'amber')}
          ${metric('Delivery partners', data.staff.filter(s => s.status === 'Active').length, 'Active staff records', 'customers', 'green')}
        </div>
        <div class="overview-charts">
          ${chartPanel('delivery-activity', 'Delivery Activity', 'A week in motion · sample data')}
          <section class="glass panel">
            <div class="panel-heading"><div><h2>Stock & balance</h2><p>A place for every cylinder</p></div><a class="text-accent" style="font-size:10px" href="${url('pages/admin/stock.html')}">View stock ↗</a></div>
            ${stockRows()}
            <div class="stock-total"><span>Classified sample stock</span><strong>${data.stock.reduce((sum, row) => sum + row.full + row.empty + row.damaged + row.missing, 0).toLocaleString('en-IN')}</strong></div>
          </section>
        </div>
      </div>
      <aside class="workspace-rail glass" aria-label="Workspace quick access">
        <h2>Find your workspace</h2>
        <div class="search-field rail-search"><input id="workspace-search" aria-label="Find a workspace" placeholder="What would you like to do?">${icon('search')}</div>
        <nav class="access-tiles" aria-label="Agency modules">
          ${tiles.map(([page, label, symbol]) => `<a class="access-tile" href="${url(`pages/admin/${page}.html`)}" data-workspace-name="${label.toLowerCase()} ${page.replace('deliveries', 'delivery')}">${icon(symbol)}<span>${label}</span></a>`).join('')}
        </nav>
        <p id="workspace-empty" class="rail-note" hidden>No matching workspace. Try “stock” or “delivery”.</p>
        <section class="rail-section">
          <h2>Delivery queue</h2>
          <div class="queue-card">${next ? `<small>Up next · ${esc(next.id)}</small><a href="${url('pages/admin/delivery-details.html?id=' + next.id)}"><strong>${esc(customer(next.customer)?.name)}</strong>${icon('arrow')}</a><small>${esc(next.size)} · ${next.qty} cylinder${next.qty > 1 ? 's' : ''}</small>` : '<strong>All caught up</strong><small>No pending demo deliveries.</small>'}</div>
          <div class="queue-stats"><div class="queue-stat">In queue<strong>${pending.length}</strong></div><div class="queue-stat">On route<strong>${pending.filter(d => d.status === 'In Progress').length}</strong></div><div class="queue-stat">Completed<strong>${data.deliveries.filter(d => d.status === 'Delivered').length}</strong></div></div>
        </section>
        <section class="rail-section"><h2>A gentle reminder</h2><p class="rail-note">19 kg full-cylinder stock is below the sample reorder level. A quick review keeps tomorrow running smoothly.</p><a class="button small section-gap" href="${url('pages/admin/stock.html')}">Review inventory ${icon('arrow')}</a></section>
        <div class="rail-status"><i></i>Demo workspace · ready to explore</div>
      </aside>
    </div>
    <div class="panel-heading section-gap"><div><h2>Recent deliveries</h2><p>The latest from your delivery team</p></div><a class="button small" href="${url('pages/admin/deliveries.html')}">View all ${icon('arrow')}</a></div>
    ${table('recent', deliveryColumns, deliveryRows(data.deliveries.slice(0, 5)), {
        title: 'deliveries', filters: ['Delivered', 'Pending', 'Failed']
    })}
    <p class="muted" style="font-size:9px;margin-top:12px">Totals are calculated from current workspace records. Demo mode uses fictional records.</p>`;
}
export function initializeDashboard() {
    const search = document.querySelector('#workspace-search');
    if (!search)
        return;
    search.oninput = () => {
        const term = search.value.trim().toLowerCase();
        const tiles = [...document.querySelectorAll('[data-workspace-name]')];
        tiles.forEach(tile => tile.hidden = !tile.dataset.workspaceName.includes(term));
        document.querySelector('#workspace-empty').hidden = tiles.some(tile => !tile.hidden);
    };
}
export function stockRows() {
    const totals = ['full', 'empty', 'damaged', 'missing'].map(key => data.stock.reduce((sum, row) => sum + row[key], 0));
    const total = totals.reduce((sum, value) => sum + value, 0) || 1;
    return [['Full cylinders', totals[0], 'var(--accent)'], ['Empty cylinders', totals[1], 'var(--cyan)'], ['Damaged cylinders', totals[2], 'var(--yellow)'], ['Missing cylinders', totals[3], 'var(--red)']].map(([l, n, c]) => `<div class="stock-row"><img src="${url('assets/images/cylinder.svg')}" alt=""><div class="stock-row-content"><div class="stock-row-title"><span>${l}</span><strong>${n}</strong></div><div class="progress"><span style="width:${Math.max(3, n / total * 100)}%;background:${c}"></span></div></div></div>`).join('');
}
