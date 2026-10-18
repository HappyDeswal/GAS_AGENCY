// Unit/contract checks use mocked HTTP responses. They do not validate a deployed database.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBackendClient,BackendError} from '../assets/js/backend/client.js';
import {createAgencyRepository} from '../assets/js/backend/repository.js';
let requests=[];
globalThis.fetch=async (url,options)=>{
    requests.push({url:new URL(url),options});
    return {ok:true,status:200,text:async()=>JSON.stringify([{id:'fixture'}])};
};
await assert.rejects(createBackendClient().request('/rest/v1/customers'),/not configured/);
assert.equal(requests.length,0);
const config={enabled:true,supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_fixture'};
await assert.rejects(createBackendClient(config).request('/rest/v1/customers'),/Sign in/);
await assert.rejects(createBackendClient({...config,publishableKey:'sb_secret_fixture'}).request('/rest/v1/customers'),/secret key/);
const encoded=Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url');
await assert.rejects(createBackendClient({...config,publishableKey:`a.${encoded}.b`}).request('/rest/v1/customers'),/service-role/);
const client=createBackendClient(config,async()=> 'test-jwt');
const agency='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const repo=createAgencyRepository(agency,client);
await repo.list('customers',{limit:10,offset:20});
assert.equal(requests.at(-1).url.searchParams.get('agency_id'),'eq.'+agency);
assert.equal(requests.at(-1).url.searchParams.get('offset'),'20');
assert.equal(requests.at(-1).options.headers.Authorization,'Bearer test-jwt');
await repo.createMetadata('customers',{agency_id:'wrong',name:'Test',address:'Fictional address',customer_type:'registered'});
assert.equal(JSON.parse(requests.at(-1).options.body).agency_id,agency);
await repo.operation('create_delivery',{p_agency_id:'wrong',p_quantity:2});
assert.equal(JSON.parse(requests.at(-1).options.body).p_agency_id,agency);
await assert.rejects(repo.createMetadata('payments',{}),/backend operation/);
await assert.rejects(repo.list('agency_members'),/Unsupported/);
await assert.rejects(repo.list('customers',{limit:1000}),/page size/);
await assert.rejects(repo.operation('delete_agency',{}),/Unsupported/);
globalThis.fetch=async()=>({ok:false,status:401,text:async()=>'{"message":"bad token"}'});
await assert.rejects(client.getCurrentUser(),e=>e instanceof BackendError&&e.status===401&&e.message.includes('expired'));
globalThis.fetch=async()=>({ok:true,status:200,text:async()=>'<html>oops</html>'});
await assert.rejects(client.getCurrentUser(),/unexpected response/);
globalThis.fetch=async()=>{throw new Error('network');};
await assert.rejects(client.getCurrentUser(),/Could not reach/);
const schema=readFileSync(new URL('../supabase/migrations/202610180001_agency_schema.sql',import.meta.url),'utf8');
const operations=readFileSync(new URL('../supabase/migrations/202610180002_operations.sql',import.meta.url),'utf8');
assert(schema.includes('enable row level security'));
assert(schema.includes('references public.customers(agency_id,id)'));
assert(!schema.includes('grant insert,update on public.payments'));
for(const name of ['receive_stock','create_delivery','transition_delivery','return_empty_stock','record_payment','review_settlement']){
    assert(operations.includes('create function public.'+name));
    assert(operations.includes('revoke all on function public.'+name));
}
console.log('PASS: disabled configuration; auth/secret-key guards; tenant filters; protected write contracts; HTTP error handling; migration contract checks. SQL execution and RLS integration are not tested here.');

const completionLock=readFileSync(new URL('../supabase/migrations/202610180004_completion_lock.sql',import.meta.url),'utf8');
assert(completionLock.includes('before insert or update on public.deliveries'));
assert(completionLock.includes("new.status = 'Delivered'"));
assert(completionLock.includes('old.status is distinct from new.status'));
assert(completionLock.includes("errcode = '42501'"));
