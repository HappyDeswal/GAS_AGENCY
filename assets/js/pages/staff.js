import { runWorkflow } from '../workflow.js';
import { data, saveDemo, nextId } from '../demo-data.js';
import { metric, table, badge, esc, dialog, field, select, toast } from '../ui.js';
export function staffPage() {
    return `<div class="metrics">${metric('Total staff', data.staff.length, 'Fictional delivery partners', 'customers')}${metric('Active', data.staff.filter(s => s.status === 'Active').length, 'Available for assignment', 'customers', 'green')}${metric('Inactive', data.staff.filter(s => s.status === 'Inactive').length, 'Not accepting assignments', 'customers', 'amber')}${metric('On duty', data.staff.filter(s => s.duty === 'On duty' && s.status === 'Active').length, 'Demo duty roster', 'deliveries', 'cyan')}</div>${table('staff', ['Staff ID', 'Name', 'Contact', 'Assigned', 'Completed', 'Status', 'Duty', 'Actions'], data.staff.map(s => ({
        filter: s.status, cells: [esc(s.id), esc(s.name), esc(s.contact), data.deliveries.filter(d => d.staff === s.id).length, data.deliveries.filter(d => d.staff === s.id && d.status === 'Delivered').length, badge(s.status), esc(s.duty), `<button class="button small" data-staff-view="${s.id}">Profile</button> <button class="button small" data-staff-edit="${s.id}">Edit</button>`]
    })), {
        title: 'staff', filters: ['Active', 'Inactive']
    })}`;
}
export function initializeStaff(refresh) {
    function edit(id) {
        const s = data.staff.find(s => s.id === id);
        dialog(s ? 'Edit staff' : 'Add staff', `<p class="form-note">${data.connected ? 'Changes save to the connected agency. Auth membership must already be provisioned.' : 'Use fictional names. Contact remains masked.'}</p><form><div class="form-grid">${field('Name', 'name', 'text', s?.name || '', 'required minlength="2" maxlength="60"')}${select('Status', 'status', ['Active', 'Inactive'], s?.status)}${select('Duty', 'duty', ['On duty', 'Off duty'], s?.duty)}</div><div class="form-actions"><button class="button primary">Save staff</button></div></form>`, async (v) => {
            await runWorkflow('saveStaff', {
                ...v, id: s?.id
            });
            refresh();
            toast('Staff record saved.');
        });
    }
    (document.querySelector('#add-staff') || {}).onclick = () => edit();
    document.querySelectorAll('[data-staff-edit]').forEach(b => b.onclick = () => edit(b.dataset.staffEdit));
    document.querySelectorAll('[data-staff-view]').forEach(b => b.onclick = () => {
        const s = data.staff.find(s => s.id === b.dataset.staffView);
        dialog(s.name, `<div class="avatar">${esc(s.name.slice(-1))}</div><dl class="detail-list">${Object.entries(s).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="section-gap">${data.deliveries.filter(d => d.staff === s.id).length} assigned demo deliveries</p>`);
    });
}
