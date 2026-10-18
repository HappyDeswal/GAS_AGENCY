// Optional developer checks. The application itself does not need Node or packages.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const memory = new Map();
globalThis.sessionStorage = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
};
const store = await import('../assets/js/demo-data.js');
const {data,seed,prices,resetDemo,saveDemo,sampleDate} = store;
const {esc,downloadCSV} = await import('../assets/js/ui.js');
for (const delivery of data.deliveries) {
  assert(data.customers.some(c => c.id === delivery.customer), delivery.id + ' customer');
  assert(data.staff.some(s => s.id === delivery.staff), delivery.id + ' staff');
  assert(prices[delivery.size] > 0);
  assert(Number.isInteger(delivery.qty) && delivery.qty > 0);
}
for (const payment of data.payments) {
  const delivery = data.deliveries.find(d => d.id === payment.delivery);
  assert(delivery);
  assert.equal(payment.amount, prices[delivery.size] * delivery.qty);
}
for (const stock of data.stock) {
  const held = data.movements.filter(m => m.size === stock.size)
    .reduce((sum,m) => sum + (m.type === 'Dispatch' ? m.qty : -m.qty), 0);
  assert(held >= 0 && held <= stock.full - stock.reserve);
}
const today = data.deliveries.filter(d => d.date === sampleDate && d.staff === 'STF-101');
assert.equal(today.length, 12);
assert.equal(today.filter(d => d.status === 'Delivered').length, 7);
assert.equal(today.filter(d => d.status === 'Failed').length, 1);
assert.equal(today.filter(d => ['Pending','Assigned','In Progress'].includes(d.status)).length, 4);
assert.equal(new Set(data.deliveries.map(d=>d.id)).size,data.deliveries.length);
assert.equal(esc('<script>"&'), '&lt;script&gt;&quot;&amp;');
let csvBlob;
globalThis.URL.createObjectURL = blob => { csvBlob = blob; return 'blob:test'; };
globalThis.URL.revokeObjectURL = () => {};
globalThis.document = { createElement: () => ({ click() {} }) };
downloadCSV('test.csv',[{name:'=1+1',note:'A, "quoted" value'}]);
const csv = await csvBlob.text();
assert(csv.includes("\"'=1+1\""));
assert(csv.includes('"A, ""quoted"" value"'));
data.customers.push({id:'CUS-TEST'});
saveDemo();
assert(JSON.parse(memory.get('gas-agency-demo-v1')).data.customers.some(c=>c.id==='CUS-TEST'));
resetDemo();
assert.equal(store.data.customers.length,seed.customers.length);
const project = path.resolve(import.meta.dirname,'..');
const htmlFiles=[];
function scan(folder){for(const file of fs.readdirSync(folder,{withFileTypes:true})){const full=path.join(folder,file.name);if(file.isDirectory())scan(full);else if(full.endsWith('.html'))htmlFiles.push(full);}}
scan(path.join(project,'pages'));
assert.equal(htmlFiles.length,25);
for(const file of htmlFiles){const html=fs.readFileSync(file,'utf8');for(const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)){const link=match[1];if(!/^https?:/.test(link))assert(fs.existsSync(path.resolve(path.dirname(file),link)),file+' broken '+link);}}
console.log('PASS: 25 page assets; customer/staff references; prices; 12-stop sample day; stock locations; session reset; HTML escaping; CSV quoting and formula protection.');
