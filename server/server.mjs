// Native JavaScript server. No npm packages or build step.
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {selectLoginMembership,portalForRole} from '../assets/js/portal-access.js';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
export function createApplication(env=process.env,transport=fetch){
 const sessions=new Map(); const attempts=new Map();
 const configured=!!(env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY);
 const origin=env.APP_ORIGIN||'http://127.0.0.1:8082';
 if(configured&&new URL(env.SUPABASE_URL).protocol!=='https:'&&!['localhost','127.0.0.1'].includes(new URL(env.SUPABASE_URL).hostname))throw Error('Supabase requires HTTPS');
 function reply(res,status,value,headers={}){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(value));}
 async function body(req){let value='';for await(const chunk of req){value+=chunk;if(value.length>16384)throw Object.assign(Error('Request too large'),{status:413});}try{return JSON.parse(value||'{}');}catch{throw Object.assign(Error('Invalid JSON'),{status:400});}}
 async function upstream(endpoint,{token,method='GET',body:payload}={}){
  if(!configured)throw Object.assign(Error('Supabase is not configured. This server cannot access live data yet.'),{status:503});
  const response=await transport(new URL(endpoint,env.SUPABASE_URL),{method,headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json',...(method!=='GET'?{Prefer:'return=representation'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(15000),redirect:'error'});
  const text=await response.text();let result;try{result=text?JSON.parse(text):null;}catch{throw Error('Invalid backend response');}
  if(!response.ok)throw Object.assign(Error(response.status===401?'Please sign in again.':result?.message||result?.msg||'Backend request failed'),{status:response.status});return result;
 }
 function cookie(id,clear=false){return `gas_session=${clear?'':id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear?0:28800}${origin.startsWith('https:')?'; Secure':''}`;}
 async function session(req){const id=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('gas_session='))?.slice(12);const s=sessions.get(id);if(!s||s.deadline<Date.now()){sessions.delete(id);throw Object.assign(Error('Sign in required'),{status:401});}if(s.expires<Date.now()+30000){if(!s.refreshing)s.refreshing=upstream('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh}}).then(result=>{s.token=result.access_token;s.refresh=result.refresh_token;s.expires=Date.now()+result.expires_in*1000;}).finally(()=>s.refreshing=null);await s.refreshing;}s.members=await upstream(`/rest/v1/agency_members?select=agency_id,role&user_id=eq.${encodeURIComponent(s.userId)}&active=eq.true`,{token:s.token});if(!s.members.length){sessions.delete(id);throw Object.assign(Error('No active agency membership'),{status:403});}return {id,...s};}
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,origin);
  if(url.pathname.startsWith('/api/')){
   if(req.method!=='GET'&&req.headers.origin!==origin)return reply(res,403,{error:'Same-origin request required'});
   if(url.pathname==='/api/status'&&req.method==='GET')return reply(res,200,{configured,otpConfigured:false});
   if(url.pathname==='/api/login'&&req.method==='POST'){
    const key=req.socket.remoteAddress;const previous=attempts.get(key)||{count:0,until:Date.now()+60000};if(previous.until<Date.now()){previous.count=0;previous.until=Date.now()+60000;}previous.count++;attempts.set(key,previous);if(previous.count>10)return reply(res,429,{error:'Too many login attempts. Try again in a minute.'});
    const input=await body(req);if(typeof input.email!=='string'||typeof input.password!=='string')return reply(res,400,{error:'Email and password required'});
    const result=await upstream('/auth/v1/token?grant_type=password',{method:'POST',body:{email:input.email,password:input.password}});
    const members=await upstream(`/rest/v1/agency_members?select=agency_id,role&user_id=eq.${encodeURIComponent(result.user.id)}&active=eq.true`,{token:result.access_token});
    if(!members?.length)return reply(res,403,{error:'No active agency membership. Ask the agency owner to provision your account.'});
    let selected;try{selected=selectLoginMembership(members,input.portal||'',input.agency||'');}catch(error){return reply(res,403,{error:error.message});}
    const id=randomBytes(32).toString('hex');sessions.set(id,{token:result.access_token,refresh:result.refresh_token,expires:Date.now()+result.expires_in*1000,deadline:Date.now()+28800000,userId:result.user.id,members});
    return reply(res,200,{userId:result.user.id,members,agencyId:selected.agency_id,portal:portalForRole(selected.role)},{'Set-Cookie':cookie(id)});
   }
   const s=await session(req);
   if(url.pathname==='/api/session'&&req.method==='GET')return reply(res,200,{userId:s.userId,members:s.members});
   if(url.pathname==='/api/logout'&&req.method==='POST'){try{await upstream('/auth/v1/logout',{method:'POST',token:s.token});}finally{sessions.delete(s.id);}return reply(res,200,{signedOut:true},{'Set-Cookie':cookie('',true)});}
   if(url.pathname==='/api/data'&&req.method==='GET'){
    const agency=url.searchParams.get('agency');if(!s.members.some(m=>m.agency_id===agency))return reply(res,403,{error:'Agency membership required'});
    const names=['customers','staff','cylinder_types','stock_balances','staff_stock','deliveries','delivery_events','stock_movements','payments','settlements'];
    const entries=await Promise.all(names.map(async name=>{const rows=[];for(let offset=0;offset<10000;offset+=1000){const page=await upstream(`/rest/v1/${name}?agency_id=eq.${encodeURIComponent(agency)}&select=*&limit=1000&offset=${offset}`,{token:s.token});if(!Array.isArray(page))throw Error('Invalid table response');rows.push(...page);if(page.length<1000)return[name,rows];}throw Object.assign(Error('Dataset is too large for this workspace view. Add server pagination before continuing.'),{status:422});}));
    return reply(res,200,{tables:Object.fromEntries(entries),businessDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())});
   }
   if(url.pathname==='/api/metadata'&&req.method==='POST'){
    const input=await body(req);const membership=s.members.find(m=>m.agency_id===input.agency);
    if(!membership||!['owner','admin'].includes(membership.role))return reply(res,403,{error:'Admin membership required'});
    const fields={customers:['name','mobile','address','customer_type','consumer_number','active'],staff:['name','contact','active','on_duty','auth_user_id'],cylinder_types:['name','weight_kg','price_paise','reorder_level','active']}[input.table];
    if(!fields)return reply(res,400,{error:'Metadata table not supported'});
    const value=Object.fromEntries(fields.filter(k=>input.values?.[k]!==undefined).map(k=>[k,input.values[k]]));
    if(input.id&&!/^[0-9a-f-]{36}$/i.test(input.id))return reply(res,400,{error:'Invalid record ID'});
    const query=input.id?`?id=eq.${encodeURIComponent(input.id)}&agency_id=eq.${encodeURIComponent(input.agency)}`:'';
    return reply(res,200,await upstream('/rest/v1/'+input.table+query,{token:s.token,method:input.id?'PATCH':'POST',body:input.id?value:{...value,agency_id:input.agency}}));
   }
   // Clients cannot choose an upstream URL or supply a privileged token.
   if(url.pathname==='/api/operation'&&req.method==='POST'){
    const input=await body(req);const allowed=['receive_stock','create_delivery','transition_delivery','return_empty_stock','record_payment','review_settlement','adjust_stock'];
    if(input.name==='transition_delivery'&&input.parameters?.p_status==='Delivered')return reply(res,503,{error:'Live completion is disabled until delivery-bound OTP verification is configured and enforced in the database.'});
    if(!allowed.includes(input.name))return reply(res,400,{error:'Unknown operation'});
    if(!s.members.some(m=>m.agency_id===input.parameters?.p_agency_id))return reply(res,403,{error:'Agency membership required'});
    return reply(res,200,await upstream('/rest/v1/rpc/'+input.name,{method:'POST',token:s.token,body:input.parameters}));
   }
   if(url.pathname.startsWith('/api/otp/'))return reply(res,503,{error:'OTP provider is not configured. No code was sent or verified.'});
   return reply(res,404,{error:'API route not found'});
  }
  if(!['GET','HEAD'].includes(req.method))return reply(res,405,{error:'Method not allowed'});
  let relative;try{relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';}catch{return reply(res,400,{error:'Invalid path'});}
  // Serve application assets only; secrets, server sources, tests, and SQL are never public.
  if(relative!=='index.html'&&!/^(pages|assets)\//.test(relative))return reply(res,404,{error:'Not found'});
  const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)||relative.split('/').some(part=>part.startsWith('.')))return reply(res,404,{error:'Not found'});
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
  const raw=await readFile(file);const content=path.extname(file)==='.html'?Buffer.from(raw.toString('utf8').replace('</head>','<meta name="gas-server" content="available"></head>')):raw;res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:content);
 }catch(error){reply(res,error.code==='ENOENT'?404:error.status||500,{error:error.code==='ENOENT'?'Not found':error.status?error.message:'The server could not complete this request.'});}});
 const cleanup=setInterval(()=>{const now=Date.now();for(const[id,s]of sessions)if(s.deadline<now)sessions.delete(id);for(const[id,a]of attempts)if(a.until<now)attempts.delete(id);},60000);cleanup.unref();server.on('close',()=>clearInterval(cleanup));return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||8082);createApplication().listen(port,'127.0.0.1',()=>console.log(`GAS AGENCY: http://127.0.0.1:${port} (live services require configuration)`));}
