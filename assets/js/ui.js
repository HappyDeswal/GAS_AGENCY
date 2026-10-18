export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const paths = {
    dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', stock: 'M5 7h14v14H5z M8 7V3h8v4 M5 12h14', customers: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M18 8h4 M20 6v4', deliveries: 'M1 5h13v12H1z M14 9h4l4 4v4h-8 M6 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M18 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4', payments: 'M3 5h18v15H3z M3 9h18 M15 14h3', reports: 'M4 20V10 M10 20V4 M16 20v-8 M22 20H1', settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2', search: 'M21 21l-5-5 M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16', theme: 'M21 12a9 9 0 1 1-9-9 7 7 0 0 0 9 9', bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4', menu: 'M3 6h18 M3 12h18 M3 18h18', arrow: 'M5 12h14 M14 7l5 5-5 5', plus: 'M12 5v14 M5 12h14', receipt: 'M5 2h14v20l-3-2-4 2-4-2-3 2z M8 7h8 M8 11h8 M8 15h5', logout: 'M10 4H4v16h6 M14 8l4 4-4 4 M8 12h12', check: 'M5 12l4 4L19 6', calendar: 'M4 5h16v16H4z M8 2v6 M16 2v6 M4 10h16', download: 'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4'
};
export function icon(name) {
    return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${(paths[name] || paths.stock).split(' M').map((d, i) => `<path d="${i ? 'M' : ''}${d}"/>`).join('')}</svg>`;
}
export function badge(status) {
    return `<span class="badge ${['Delivered', 'Paid', 'Active', 'Completed', 'Settled'].includes(status) ? 'success' : ['Failed', 'Cancelled', 'Missing', 'Inactive'].includes(status) ? 'danger' : ['In Progress', 'Assigned', 'On duty'].includes(status) ? 'info' : 'warning'}">${esc(status)}</span>`;
}
export function toast(message) {
    document.querySelector('#toast').textContent = message;
    document.querySelector('#toast').classList.add('visible');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => document.querySelector('#toast').classList.remove('visible'), 4000);
}
export function dialog(title, html, onSubmit) {
    const modal = document.querySelector('#modal');
    modal.innerHTML = `<div class="modal-heading"><h2 id="dialog-title">${esc(title)}</h2><button class="icon-button" data-close aria-label="Close dialog">×</button></div>${html}`;
    modal.querySelector('[data-close]').onclick = () => modal.close();
    if (onSubmit)
        modal.querySelector('form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            if (!form.reportValidity())
                return;
            if (form.dataset.pending)
                return;
            form.dataset.pending = 'true';
            const buttons = [...form.querySelectorAll('button[type="submit"], button:not([type])')];
            buttons.forEach(button => button.disabled = true);
            try {
                const result = await onSubmit(Object.fromEntries(new FormData(form)));
                if (result !== false)
                    modal.close();
            }
            catch (error) {
                toast(error.message || 'Could not save. Please try again.');
            }
            finally {
                delete form.dataset.pending;
                buttons.forEach(button => button.disabled = false);
            }
        };
    modal.setAttribute('aria-labelledby', 'dialog-title');
    modal.showModal();
}
export function field(label, name, type = 'text', value = '', extra = '') {
    return `<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
}
export function select(label, name, options, value = '') {
    return `<label>${esc(label)}<select name="${name}">${options.map(o => {
        const [v, t] = Array.isArray(o) ? o : [o, o];
        return `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`;
    }).join('')}</select></label>`;
}
export function metric(label, value, description, ico = 'stock', color = 'purple') {
    return `<article class="metric glass tilt"><div class="metric-top"><span>${esc(label)}</span><span class="metric-icon ${color}">${icon(ico)}</span></div><strong>${esc(value)}</strong><div class="metric-note">${esc(description)}</div></article>`;
}
export function table(id, columns, rows, options = {}) {
    const filters = options.filters || [];
    return `<section class="glass table-panel"><div class="table-toolbar"><div class="search-field">${icon('search')}<input aria-label="Search ${esc(options.title || 'records')}" data-search="${id}" placeholder="Search ${esc(options.title || 'records')}…"></div>${filters.length ? `<select aria-label="Filter ${esc(options.title || 'records')}" data-filter="${id}"><option value="">All ${esc(options.filterLabel || 'statuses')}</option>${filters.map(s => `<option>${esc(s)}</option>`).join('')}</select>` : ''}<span class="table-count" id="${id}-count"></span></div><div class="table-scroll"><table id="${id}"><thead><tr>${columns.map(c => `<th scope="col"><button data-sort="${id}">${esc(c)} <span aria-hidden="true">↕</span></button></th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr data-filter-value="${esc(row.filter || '')}" ${row.date ? `data-date="${esc(row.date)}"` : ''}>${row.cells.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="table-footer"><span>Fictional demo records</span><div><button class="button small" data-prev="${id}" aria-label="Previous page">←</button> <span id="${id}-page"></span> <button class="button small" data-next="${id}" aria-label="Next page">→</button></div></div><p class="empty" id="${id}-empty" hidden>No matching records. Try another search or filter.</p></section>`;
}
let tableEvents;
export function initializeTables() {
    tableEvents?.abort();
    tableEvents = new AbortController();
    document.querySelectorAll('table[id]').forEach(t => {
        let page = 1, sortDirection = 1;
        const rows = [...t.tBodies[0].rows], search = document.querySelector(`[data-search="${t.id}"]`), filter = document.querySelector(`[data-filter="${t.id}"]`);
        function update() {
            const query = search.value.toLowerCase();
            const matched = rows.filter(r => r.textContent.toLowerCase().includes(query) && (!filter?.value || r.dataset.filterValue === filter.value) && (!window.tableDateRange || r.dataset.date >= window.tableDateRange[0] && r.dataset.date <= window.tableDateRange[1]));
            const pages = Math.max(1, Math.ceil(matched.length / 6));
            page = Math.min(page, pages);
            rows.forEach(r => r.hidden = true);
            matched.slice((page - 1) * 6, page * 6).forEach(r => r.hidden = false);
            document.getElementById(t.id + '-count').textContent = `${matched.length} records`;
            document.getElementById(t.id + '-page').textContent = `${page} / ${pages}`;
            document.getElementById(t.id + '-empty').hidden = matched.length > 0;
            document.querySelector(`[data-prev="${t.id}"]`).disabled = page === 1;
            document.querySelector(`[data-next="${t.id}"]`).disabled = page === pages;
        }
        search.oninput = () => {
            page = 1;
            update();
        };
        if (filter)
            filter.onchange = () => {
                page = 1;
                update();
            };
        document.querySelector(`[data-prev="${t.id}"]`).onclick = () => {
            page--;
            update();
        };
        document.querySelector(`[data-next="${t.id}"]`).onclick = () => {
            page++;
            update();
        };
        t.querySelectorAll('[data-sort]').forEach((b, i) => b.onclick = () => {
            rows.sort((a, b) => a.cells[i].textContent.localeCompare(b.cells[i].textContent, undefined, {
                numeric: true
            }) * sortDirection);
            sortDirection *= -1;
            rows.forEach(r => t.tBodies[0].append(r));
            t.querySelectorAll('th').forEach(h => h.removeAttribute('aria-sort'));
            b.parentElement.setAttribute('aria-sort', sortDirection === -1 ? 'ascending' : 'descending');
            update();
        });
        document.addEventListener('date-filter', update, {
            signal: tableEvents.signal
        });
        update();
    });
}
export function downloadCSV(filename, records) {
    if (!records.length) {
        toast('No records to export for this range.');
        return;
    }
    const headings = Object.keys(records[0]);
    const cell = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
    const csv = [headings, ...records.map(r => headings.map(h => r[h]))].map(r => r.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], {
        type: 'text/csv;charset=utf-8'
    }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
