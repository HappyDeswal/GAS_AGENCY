import assert from 'node:assert/strict';
globalThis.document = {addEventListener(){}, documentElement:{dataset:{}}};
const {data, sampleDate} = await import('../assets/js/demo-data.js');
const {availableFullStock} = await import('../assets/js/workflow.js');
const {stockPage} = await import('../assets/js/pages/stock.js');
const {dailySummary} = await import('../assets/js/pages/delivery-portal.js');

data.stock = [{size:'14.2 kg', full:10, reserve:0, empty:0, damaged:0, missing:0}];
data.movements = [{type:'Dispatch', size:'14.2 kg', qty:10}];
assert.equal(availableFullStock(data.stock[0]), 0);
assert(stockPage('stock').includes('<td>10</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td>'));
// Connected balances are authoritative even when historical movement data is absent.
data.stock[0] = {...data.stock[0], full:12, godownFull:2, staffFull:10, reserve:1};
data.movements = [];
assert.equal(availableFullStock(data.stock[0]), 1);
assert(stockPage('stock').includes('Full cylinders: 2'));
assert(stockPage('stock').includes('Full cylinders held: 10'));

data.currentStaffId = 'partner';
data.deliveries = [{id:'older', staff:'partner', date:'2026-10-01', status:'Delivered'},
    {id:'other', staff:'another-partner', date:sampleDate, status:'Delivered'}];
data.payments = [{delivery:'older', status:'Paid', date:sampleDate, method:'Cash', amount:1000},
    {delivery:'other', status:'Paid', date:sampleDate, method:'Cash', amount:500},
    {delivery:'older', status:'Paid', date:'2026-10-01', method:'Cash', amount:200}];
data.settlements = [{staff:'partner', date:sampleDate, submitted:400}];
const html = dailySummary();
assert.match(html, /Cash collected[\s\S]*?<strong>₹1,000<\/strong>/);
assert.match(html, /Amount to settle[\s\S]*?<strong>₹600<\/strong>/);
assert.match(html, /Assigned[\s\S]*?<strong>0<\/strong>/);
console.log('PASS: dispatched stock excluded from availability; authoritative location balances; collections use payment date and partner across delivery dates.');
