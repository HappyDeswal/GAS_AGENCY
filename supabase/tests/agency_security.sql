-- Integration suite for a disposable LOCAL Supabase database after all migrations.
-- NOT executed in the current environment (no PostgreSQL / Supabase CLI installed).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public,extensions;
select plan(16);
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-000000000011','owner-a@example.invalid'),
 ('00000000-0000-0000-0000-000000000022','partner-a@example.invalid'),
 ('00000000-0000-0000-0000-000000000033','owner-b@example.invalid');
insert into public.agencies(id,name) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Test agency A'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','Test agency B');
insert into public.agency_members(agency_id,user_id,role) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','00000000-0000-0000-0000-000000000011','owner'),
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','00000000-0000-0000-0000-000000000022','delivery'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','00000000-0000-0000-0000-000000000033','owner');
insert into public.staff(id,agency_id,auth_user_id,name) values
 ('10000000-0000-0000-0000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','00000000-0000-0000-0000-000000000022','Test partner');
insert into public.customers(id,agency_id,name,address,customer_type) values
 ('20000000-0000-0000-0000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Test A','Fictional test address','registered'),
 ('20000000-0000-0000-0000-000000000002','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','Test B','Fictional test address','registered');
insert into public.cylinder_types(id,agency_id,name,weight_kg,price_paise) values
 ('30000000-0000-0000-0000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','14.2 kg',14.2,85000);
insert into public.stock_balances(agency_id,cylinder_type_id,full_count) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','30000000-0000-0000-0000-000000000001',10);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}';
select is((select count(*)::integer from public.customers),1,'Owner sees only own agency customers');
select throws_ok($$update public.agency_members set role='owner'$$,'42501',null,'Membership cannot be changed by browser users');
select lives_ok($$select public.create_delivery('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',2,current_date,'Fictional test address','cash','40000000-0000-0000-0000-000000000001')$$,'Owner creates delivery');
select is((select full_count from public.stock_balances),8,'Dispatch atomically reduces godown stock');
select lives_ok($$select public.create_delivery('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',2,current_date,'Fictional test address','cash','40000000-0000-0000-0000-000000000001')$$,'Booking retry returns existing delivery');
select is((select full_count from public.stock_balances),8,'Retry does not dispatch stock twice');
select throws_ok($$select public.create_delivery('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',1,current_date,'Fictional test address','cash','40000000-0000-0000-0000-000000000002')$$,'P0001','Active customer required','Cross-agency customer is rejected');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000033","role":"authenticated"}';
select is((select count(*)::integer from public.deliveries),0,'Another agency owner cannot read deliveries');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000022","role":"authenticated"}';
select is((select count(*)::integer from public.deliveries),1,'Assigned delivery partner can read own delivery');
select throws_ok($$update public.deliveries set status='Delivered'$$,'42501',null,'Direct delivery write is denied');
select lives_ok($$select public.transition_delivery(agency_id,id,'In Progress') from public.deliveries$$,'Assigned partner starts delivery');
select throws_ok($$select public.transition_delivery(agency_id,id,'Delivered',2) from public.deliveries$$,'42501','Delivery completion is disabled until delivery-bound OTP verification is enforced','Partner cannot bypass OTP through direct RPC');
select is((select full_count from public.staff_stock),2,'Rejected completion rolls back partner inventory');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}';
select throws_ok($$select public.transition_delivery(agency_id,id,'Delivered',2) from public.deliveries$$,'42501','Delivery completion is disabled until delivery-bound OTP verification is enforced','Owner cannot bypass OTP through direct RPC');
select throws_ok($$select public.record_payment(agency_id,id,'cash','50000000-0000-0000-0000-000000000001') from public.deliveries$$,'P0001','Complete the delivery before recording collection','Blocked completion cannot be collected');
select is((select count(*)::integer from public.payments),0,'Rejected collection creates no payment');
reset role;
select * from finish();
rollback;
