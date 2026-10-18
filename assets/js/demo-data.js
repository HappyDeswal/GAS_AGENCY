// Only fictional demo records are stored for the lifetime of this browser tab.
const key = 'gas-agency-demo-v1';
export let sampleDate = '2026-10-15';
const customers = Array.from({
    length: 8
}, (_, i) => ({
    id: `CUS-${1001 + i}`, name: `Customer ${String.fromCharCode(65 + i)}`, mobile: 'XXXXX XXXXX', address: `Demo address ${i + 1}, Sample Colony`, type: i % 3 ? 'Registered Customer' : 'Walk-in Customer', consumer: `DEMO-${401 + i}`, status: 'Active'
}));
const staff = Array.from({
    length: 12
}, (_, i) => ({
    id: `STF-${101 + i}`, name: `Demo Partner ${String.fromCharCode(65 + i)}`, contact: 'XXXXX XXXXX', status: i === 11 ? 'Inactive' : 'Active', duty: i < 8 ? 'On duty' : 'Off duty'
}));
const delivery = (id, c, size, qty, status, date, person = 0) => ({
    id, customer: customers[c].id, size, qty, status, date, staff: staff[person].id, address: customers[c].address, method: c % 2 ? 'UPI' : 'Cash', notes: 'Demo delivery. Please collect empty cylinder.', payment: status === 'Delivered' ? 'Paid' : 'Pending', timeline: [{
            status: 'Assigned', date
        }]
});
const deliveries = [delivery('DEL-1001', 0, '14.2 kg', 1, 'Delivered', sampleDate), delivery('DEL-1002', 1, '19 kg', 2, 'Pending', sampleDate, 1), delivery('DEL-1003', 2, '14.2 kg', 1, 'Failed', '2026-10-14'), delivery('DEL-1004', 3, '5 kg', 2, 'Delivered', '2026-10-14', 2), delivery('DEL-1005', 4, '19 kg', 1, 'Delivered', '2026-10-13', 3), delivery('DEL-2001', 0, '14.2 kg', 1, 'Assigned', sampleDate), delivery('DEL-2002', 1, '19 kg', 2, 'In Progress', sampleDate), delivery('DEL-2003', 2, '5 kg', 1, 'Assigned', sampleDate)];
// A twelve-stop sample day: seven delivered, four pending/in progress, one failed.
deliveries.push(...Array.from({
    length: 8
}, (_, i) => delivery(`DEL-${2004 + i}`, i % customers.length, i % 2 ? '19 kg' : '14.2 kg', 1, i < 6 ? 'Delivered' : i === 6 ? 'Failed' : 'Assigned', sampleDate)));
export const prices = {
    '5 kg': 350, '14.2 kg': 850, '19 kg': 1800
};
export const seed = {
    customers, staff, deliveries, stock: [{
            size: '5 kg', full: 120, empty: 60, damaged: 5, missing: 1, reserve: 10
        }, {
            size: '14.2 kg', full: 600, empty: 210, damaged: 15, missing: 3, reserve: 40
        }, {
            size: '19 kg', full: 120, empty: 50, damaged: 5, missing: 1, reserve: 10
        }], movements: [{
            id: 'MOV-1001', date: sampleDate, size: '14.2 kg', qty: 20, from: 'Godown', to: 'Delivery team', type: 'Dispatch', status: 'Completed'
        }, {
            id: 'MOV-1002', date: '2026-10-14', size: '14.2 kg', qty: 10, from: 'Delivery team', to: 'Godown', type: 'Return', status: 'Completed'
        }], payments: deliveries.filter(d => d.status === 'Delivered').map((d, i) => ({
        id: `PAY-${1001 + i}`, delivery: d.id, amount: prices[d.size] * d.qty, method: d.method, status: 'Paid', date: d.date
    })), settlements: [{
            id: 'SET-1001', staff: 'STF-101', date: sampleDate, submitted: 500, status: 'Pending'
        }], reports: {
        deliveries: [64, 72, 58, 81, 76, 92, 86], collections: [4200, 5600, 3900, 6400, 5800, 7300, 6800]
    }
};
function readDemo() {
    try {
        const saved = JSON.parse(sessionStorage.getItem(key));
        return saved?.version === 1 ? saved.data : structuredClone(seed);
    }
    catch {
        return structuredClone(seed);
    }
}
export let data = readDemo();
let connectedWorkspace = false;
export function saveDemo() {
    if (connectedWorkspace)
        throw Error('Use a connected workflow operation. Agency records cannot be saved to demo storage.');
    try {
        sessionStorage.setItem(key, JSON.stringify({
            version: 1, data
        }));
    }
    catch {
        document.dispatchEvent(new CustomEvent('storage-unavailable'));
    }
}
export function resetDemo() {
    data = structuredClone(seed);
    saveDemo();
}
export function customer(id) {
    return data.customers.find(c => c.id === id);
}
export function partner(id) {
    return data.staff.find(s => s.id === id);
}
export function money(n) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(n);
}
export function dateLabel(date) {
    return new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}
export function nextId(prefix, records) {
    return prefix + '-' + (Math.max(1000, ...records.map(r => Number(r.id.split('-')[1]))) + 1);
}
// Connected records remain in memory and are never copied into demo session storage.
export function replaceWorkspaceData(snapshot, date, priceMap) {
    connectedWorkspace = true;
    data = snapshot;
    sampleDate = date;
    for (const key of Object.keys(prices))
        delete prices[key];
    Object.assign(prices, priceMap);
}
