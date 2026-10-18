import { runWorkflow, availableFullStock, staffFullStock } from '../workflow.js';
import { data, saveDemo, nextId, sampleDate, dateLabel } from '../demo-data.js';
import { metric, table, badge, esc, dialog, field, select, toast } from '../ui.js';
import { url } from '../navigation.js';
export function stockPage(page) {
    const sums = ['full', 'empty', 'damaged', 'missing'].map(k => data.stock.reduce((s, r) => s + r[k], 0));
    const metrics = `<div class="metrics">${['Full cylinders', 'Empty cylinders', 'Damaged cylinders', 'Missing cylinders'].map((k, i) => metric(k, sums[i], 'Classified demo inventory', 'stock', ['purple', 'cyan', 'amber', 'amber'][i])).join('')}</div>`;
    if (page === 'stock-movements')
        return `${metrics}${movementTable()}`;
    const rows = data.stock.map(r => ({
        filter: availableFullStock(r) < 150 ? 'Low stock' : 'Healthy', cells: [esc(r.size), r.full, r.empty, r.damaged, r.missing, r.reserve, availableFullStock(r), badge(availableFullStock(r) < 150 ? 'Low stock' : 'Healthy')]
    }));
    return `${metrics}<div class="panel-heading"><div><h2>${page === 'cylinders' ? 'Cylinder size breakdown' : 'Inventory by cylinder size'}</h2><p>Available cylinders are full godown stock less reserves; dispatched cylinders are excluded.</p></div><a class="button" href="${url('pages/admin/stock-movements.html')}">Movement history →</a></div>${table('inventory', ['Size', 'Full', 'Empty', 'Damaged', 'Missing', 'Reserved', 'Available', 'Stock health'], rows, {
        title: 'inventory', filters: ['Low stock', 'Healthy']
    })}<div class="grid-two section-gap"><section class="glass panel"><h2>Godown inventory</h2><p>Full cylinders: ${data.stock.reduce((sum, s) => sum + (s.godownFull ?? (s.full - staffFullStock(s.size))), 0)}</p><p>Demo movements transfer full cylinders between locations, without changing total agency stock.</p></section><section class="glass panel"><h2>Delivery team inventory</h2><p>Full cylinders held: ${data.stock.reduce((sum, s) => sum + (s.staffFull ?? staffFullStock(s.size)), 0)}</p><p class="stock-alert">Reorder alert: full stock under 150 cylinders.</p></section></div>`;
}
function movementTable() {
    return table('movements', ['Movement ID', 'Date', 'Cylinder type', 'Quantity', 'From', 'To', 'Type', 'Status', 'Action'], data.movements.map(m => ({
        filter: m.type, cells: [esc(m.id), dateLabel(m.date), esc(m.size), m.qty, esc(m.from), esc(m.to), esc(m.type), badge(m.status), `<button class="button small" data-movement="${m.id}">View details</button>`]
    })), {
        title: 'movements', filters: ['Dispatch', 'Return', 'Receive'], filterLabel: 'types'
    });
}
export function initializeStock(refresh) {
    const headingButton = document.querySelector('#add-stock');
    if (headingButton && !document.querySelector('#return-empties'))
        headingButton.insertAdjacentHTML('beforebegin', '<button class="button" id="return-empties">Return empties</button>');
    (document.querySelector('#return-empties') || {}).onclick = () => dialog('Return empty cylinders', `<form><div class="form-grid">${select('Delivery partner', 'staff', data.staff.map(s => [s.id, s.name]))}${select('Cylinder size', 'size', data.stock.map(s => s.size))}${field('Quantity', 'qty', 'number', 1, 'required min="1" max="10000" step="1"')}</div><div class="form-actions"><button class="button primary">Record return</button></div></form>`, async (values) => {
        await runWorkflow('returnEmpties', values);
        refresh();
        toast('Empty return recorded.');
    });
    if (headingButton && !document.querySelector('#adjust-stock'))
        headingButton.insertAdjacentHTML('beforebegin', '<button class="button" id="adjust-stock">Adjust stock</button>');
    (document.querySelector('#adjust-stock') || {}).onclick = () => dialog('Record a stock adjustment', `<p class="form-note">Move available full cylinders to damaged or missing stock. A reason is required.</p><form><div class="form-grid">${select('Cylinder size', 'size', data.stock.map(s => s.size))}${select('Category', 'category', ['damaged', 'missing'])}${field('Quantity', 'qty', 'number', 1, 'required min="1" max="10000" step="1"')}${field('Reason', 'reason', 'text', '', 'required minlength="3" maxlength="300"')}</div><div class="form-actions"><button class="button primary">Record adjustment</button></div></form>`, async (values) => {
        await runWorkflow('adjustStock', values);
        refresh();
        toast('Stock adjustment recorded.');
    });
    (document.querySelector('#add-stock') || {}).onclick = () => dialog('Receive stock', `<p class="form-note">${data.connected ? 'Receives full cylinders into your connected agency godown.' : 'Adds newly received full cylinders to fictional demo inventory.'} This is separate from a transfer.</p><form><div class="form-grid">${select('Cylinder size', 'size', data.stock.map(s => s.size))}${field('Quantity received', 'qty', 'number', 1, 'required min="1" max="10000" step="1"')}${field('Receipt date', 'date', 'date', sampleDate, 'required')}</div><div class="form-actions"><button class="button primary">${data.connected ? 'Save stock receipt' : 'Add stock to demo'}</button></div></form>`, async (values) => {
        await runWorkflow('receiveStock', values);
        refresh();
        toast('Demo inventory receipt recorded.');
    });
    (document.querySelector('#add-movement') || {}).onclick = () => {
        if (data.connected) {
            toast('Use delivery booking for dispatch and the Return empties action for returns.');
            return;
        }
        return dialog('Add demo stock movement', `<p class="form-note">Transfers full cylinders between the godown and delivery team. This is a temporary demo record.</p><form><div class="form-grid">${select('Cylinder type', 'size', data.stock.map(s => s.size))}${field('Quantity', 'qty', 'number', 1, 'required min="1" max="9999" step="1"')}${select('Movement type', 'type', ['Dispatch', 'Return'])}${field('Date', 'date', 'date', sampleDate, 'required')}</div><div class="form-actions"><button class="button primary">Add demo movement</button></div></form>`, values => {
            const held = data.movements.filter(m => m.size === values.size).reduce((s, m) => s + (m.type === 'Dispatch' ? m.qty : ['Return', 'Delivered'].includes(m.type) ? -m.qty : 0), 0);
            const stock = data.stock.find(s => s.size === values.size);
            const reserved = data.deliveries.filter(d => d.size === values.size && !['Delivered', 'Cancelled'].includes(d.status) && data.movements.some(m => m.delivery === d.id && m.type === 'Dispatch')).reduce((sum, d) => sum + d.qty, 0);
            const available = values.type === 'Return' ? Math.max(0, held - reserved) : stock.full - held - stock.reserve;
            if (Number(values.qty) > available) {
                toast(`Only ${available} full cylinders available at the source.`);
                return false;
            }
            data.movements.push({
                id: nextId('MOV', data.movements), ...values, qty: Number(values.qty), from: values.type === 'Dispatch' ? 'Godown' : 'Delivery team', to: values.type === 'Dispatch' ? 'Delivery team' : 'Godown', status: 'Completed'
            });
            saveDemo();
            refresh();
            toast('Demo stock movement added for this session.');
        });
    };
    document.querySelectorAll('[data-movement]').forEach(b => b.onclick = () => {
        const m = data.movements.find(m => m.id === b.dataset.movement);
        dialog(m.id, `<p>${esc(m.qty)} × ${esc(m.size)} full cylinders</p><dl class="detail-list"><div><dt>From</dt><dd>${esc(m.from)}</dd></div><div><dt>To</dt><dd>${esc(m.to)}</dd></div><div><dt>Date</dt><dd>${dateLabel(m.date)}</dd></div><div><dt>Status</dt><dd>${badge(m.status)}</dd></div></dl>`);
    });
}
