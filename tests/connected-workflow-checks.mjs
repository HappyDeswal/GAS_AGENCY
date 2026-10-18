import assert from 'node:assert/strict';
const memory=new Map();globalThis.sessionStorage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
const {normalizeWorkspace,initializeRuntime}=await import('../assets/js/backend/runtime.js');
const {runWorkflow}=await import('../assets/js/workflow.js');
const store=await import('../assets/js/demo-data.js');
const tables={customers:[{id:'customer-a',name:'Agency customer',address:'Private agency address',customer_type:'registered',active:true}],staff:[{id:'staff-a',name:'Partner',active:true,auth_user_id:'user-a'}],cylinder_types:[{id:'type-a',name:'14.2 kg',price_paise:85000}],stock_balances:[{cylinder_type_id:'type-a',full_count:20}],staff_stock:[{cylinder_type_id:'type-a',staff_id:'staff-a',full_count:2,empty_count:1}],deliveries:[{id:'delivery-a',customer_id:'customer-a',staff_id:'staff-a',cylinder_type_id:'type-a',quantity:2,unit_price_paise:80000,delivery_date:'2026-10-18',status:'Delivered',payment_status:'Paid',payment_method:'cash',address:'Private address'}],delivery_events:[],stock_movements:[],payments:[{id:'payment-a',delivery_id:'delivery-a',amount_paise:160000,method:'cash',status:'Paid',paid_on:'2026-10-18'}],settlements:[]};
const normalized=normalizeWorkspace(tables,'2026-10-18','user-a');assert.equal(normalized.snapshot.stock[0].full,22);assert.equal(normalized.snapshot.stock[0].godownFull,20);assert.equal(normalized.snapshot.stock[0].staffFull,2);assert.equal(normalized.snapshot.currentStaffId,'staff-a');assert.equal(normalized.snapshot.deliveries[0].unitPrice,800);assert.equal(normalized.snapshot.payments[0].amount,1600);
const requests=[];let reloads=0;globalThis.location={reload(){reloads++;},replace(){throw Error('Unexpected redirect');}};
globalThis.fetch=async(url,options={})=>{requests.push({url,options});return{ok:true,status:200,json:async()=>url==='/api/status'?{configured:true}:url==='/api/session'?{userId:'user-a',members:[{agency_id:'agency-a',role:'owner'}]}:url.startsWith('/api/data?')?{tables,businessDate:'2026-10-18'}:{id:'saved-a'}};};
const connectedFetch=globalThis.fetch;
for (const fetchStatus of [async()=>({ok:false,status:503}),async()=>{throw Error('Offline');},async()=>({ok:true,json:async()=>({})})]) {
 globalThis.fetch=fetchStatus;
 await assert.rejects(initializeRuntime('admin'),/unavailable|invalid/);
}
globalThis.fetch=connectedFetch;
await initializeRuntime('admin');assert.equal(store.data.connected,true);assert.throws(()=>store.saveDemo(),/cannot be saved/);assert.equal(memory.size,0);
await runWorkflow('receiveStock',{size:'14.2 kg',qty:10});let last=requests.at(-1);const operation=JSON.parse(last.options.body);assert.equal(operation.name,'receive_stock');assert.equal(operation.parameters.p_agency_id,'agency-a');assert.equal(operation.parameters.p_cylinder_type_id,'type-a');assert.equal(reloads,1);
await runWorkflow('saveCustomer',{name:'New agency customer',address:'New private address',type:'Registered Customer'});assert.equal(requests.at(-1).url,'/api/metadata');assert.equal(JSON.parse(requests.at(-1).options.body).agency,'agency-a');assert.equal(memory.size,0);
await assert.rejects(runWorkflow('unsupported',{}),/not been enabled/);assert.equal(store.data.stock[0].full,22);
console.log('PASS: database/view mapping; staff identity; price snapshots; agency-scoped live stock and metadata requests; reload after server success; no private-record demo persistence or mutation fallback.');
