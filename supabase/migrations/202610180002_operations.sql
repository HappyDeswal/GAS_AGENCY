-- Transactional operations. Tables containing money, ledgers and balances are read-only to API roles.
begin;
create function public.receive_stock(p_agency_id uuid,p_cylinder_type_id uuid,p_quantity integer)
returns public.stock_balances language plpgsql security definer set search_path='' as $$
declare result public.stock_balances;
begin
 if not private.has_agency_role(p_agency_id,array['owner','admin']) then raise exception 'Admin membership required' using errcode='42501'; end if;
 if p_quantity is null or p_quantity<1 or p_quantity>10000 then raise exception 'Quantity must be 1 to 10000'; end if;
 if not exists(select 1 from public.cylinder_types where id=p_cylinder_type_id and agency_id=p_agency_id and active) then raise exception 'Active cylinder type required'; end if;
 insert into public.stock_balances(agency_id,cylinder_type_id,full_count) values(p_agency_id,p_cylinder_type_id,p_quantity)
 on conflict(agency_id,cylinder_type_id) do update set full_count=public.stock_balances.full_count+excluded.full_count returning * into result;
 insert into public.stock_movements(agency_id,cylinder_type_id,quantity,movement_type,from_location,to_location,actor_id)
 values(p_agency_id,p_cylinder_type_id,p_quantity,'Receive','Supplier','Godown',auth.uid());
 return result;
end $$;

create function public.create_delivery(
 p_agency_id uuid,p_customer_id uuid,p_staff_id uuid,p_cylinder_type_id uuid,
 p_quantity integer,p_delivery_date date,p_address text,p_payment_method text,p_request_id uuid,p_notes text default '')
returns public.deliveries language plpgsql security definer set search_path='' as $$
declare result public.deliveries; price bigint;
begin
 if not private.has_agency_role(p_agency_id,array['owner','admin']) then raise exception 'Admin membership required' using errcode='42501'; end if;
 if p_request_id is null then raise exception 'Idempotency request UUID required'; end if;
 -- One lock per request makes retrying a successful booking safe, even concurrently.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_agency_id::text||p_request_id::text,0));
 select * into result from public.deliveries where agency_id=p_agency_id and request_id=p_request_id;
 if found then
  if row(result.customer_id,result.staff_id,result.cylinder_type_id,result.quantity,result.delivery_date,result.address,result.payment_method,result.notes) is distinct from row(p_customer_id,p_staff_id,p_cylinder_type_id,p_quantity,p_delivery_date,p_address,p_payment_method,coalesce(p_notes,'')) then raise exception 'Request UUID already used for different delivery data'; end if;
  return result;
 end if;
 if p_quantity is null or p_quantity not between 1 and 20 then raise exception 'Quantity must be 1 to 20'; end if;
 if not exists(select 1 from public.customers where id=p_customer_id and agency_id=p_agency_id and active) then raise exception 'Active customer required'; end if;
 if not exists(select 1 from public.staff where id=p_staff_id and agency_id=p_agency_id and active) then raise exception 'Active staff required'; end if;
 select price_paise into price from public.cylinder_types where id=p_cylinder_type_id and agency_id=p_agency_id and active;
 if not found then raise exception 'Active cylinder type required'; end if;
 update public.stock_balances set full_count=full_count-p_quantity
 where agency_id=p_agency_id and cylinder_type_id=p_cylinder_type_id and full_count>=p_quantity;
 if not found then raise exception 'Insufficient godown stock'; end if;
 insert into public.staff_stock(agency_id,staff_id,cylinder_type_id,full_count)
 values(p_agency_id,p_staff_id,p_cylinder_type_id,p_quantity)
 on conflict(agency_id,staff_id,cylinder_type_id) do update set full_count=public.staff_stock.full_count+excluded.full_count;
 insert into public.deliveries(agency_id,customer_id,staff_id,cylinder_type_id,quantity,unit_price_paise,delivery_date,address,payment_method,request_id,created_by,notes)
 values(p_agency_id,p_customer_id,p_staff_id,p_cylinder_type_id,p_quantity,price,p_delivery_date,p_address,p_payment_method,p_request_id,auth.uid(),coalesce(p_notes,'')) returning * into result;
 insert into public.delivery_events(agency_id,delivery_id,status,actor_id) values(p_agency_id,result.id,'Assigned',auth.uid());
 insert into public.stock_movements(agency_id,cylinder_type_id,staff_id,delivery_id,quantity,movement_type,from_location,to_location,actor_id)
 values(p_agency_id,p_cylinder_type_id,p_staff_id,result.id,p_quantity,'Dispatch','Godown','Delivery partner',auth.uid());
 return result;
end $$;

create function public.transition_delivery(p_agency_id uuid,p_delivery_id uuid,p_status text,p_empty_returned integer default 0)
returns public.deliveries language plpgsql security definer set search_path='' as $$
declare d public.deliveries; is_admin boolean;
begin
 is_admin:=private.has_agency_role(p_agency_id,array['owner','admin']);
 if not is_admin and not private.has_agency_role(p_agency_id,array['delivery']) then raise exception 'Agency membership required' using errcode='42501'; end if;
 select * into d from public.deliveries where id=p_delivery_id and agency_id=p_agency_id for update;
 if not found then raise exception 'Delivery not found'; end if;
 if not is_admin and not exists(select 1 from public.staff where id=d.staff_id and agency_id=p_agency_id and auth_user_id=auth.uid() and active) then raise exception 'Assigned partner required' using errcode='42501'; end if;
 if p_status is null or p_status not in ('Assigned','In Progress','Delivered','Failed','Cancelled') then raise exception 'Unknown status'; end if;
 if d.status=p_status then return d; end if;
 if not ((d.status='Assigned' and p_status in ('In Progress','Failed','Cancelled')) or
         (d.status='In Progress' and p_status in ('Delivered','Failed','Cancelled')) or
         (d.status='Failed' and is_admin and p_status in ('Assigned','Cancelled'))) then raise exception 'Status transition not allowed'; end if;
 if p_status='Cancelled' and not is_admin then raise exception 'Only an admin can cancel a delivery' using errcode='42501'; end if;
 if p_status='Cancelled' and d.payment_status='Paid' then raise exception 'Paid delivery requires a separately audited refund workflow before cancellation'; end if;
 if p_empty_returned is null or p_empty_returned<0 or p_empty_returned>d.quantity then raise exception 'Invalid empty cylinder count'; end if;
 if p_status<>'Delivered' and p_empty_returned<>0 then raise exception 'Empty exchange is recorded only at completion'; end if;
 if p_status in ('Delivered','Cancelled') then
  update public.staff_stock set full_count=full_count-d.quantity,
    empty_count=empty_count+case when p_status='Delivered' then p_empty_returned else 0 end
  where agency_id=p_agency_id and staff_id=d.staff_id and cylinder_type_id=d.cylinder_type_id and full_count>=d.quantity;
  if not found then raise exception 'Partner inventory does not cover this delivery'; end if;
  if p_status='Cancelled' then
   update public.stock_balances set full_count=full_count+d.quantity where agency_id=p_agency_id and cylinder_type_id=d.cylinder_type_id;
  end if;
  insert into public.stock_movements(agency_id,cylinder_type_id,staff_id,delivery_id,quantity,movement_type,from_location,to_location,actor_id)
  values(p_agency_id,d.cylinder_type_id,d.staff_id,d.id,d.quantity,case when p_status='Cancelled' then 'Return' else 'Delivered' end,'Delivery partner',case when p_status='Cancelled' then 'Godown' else 'Customer' end,auth.uid());
  if p_status='Delivered' and p_empty_returned>0 then
   insert into public.stock_movements(agency_id,cylinder_type_id,staff_id,delivery_id,quantity,movement_type,from_location,to_location,actor_id)
   values(p_agency_id,d.cylinder_type_id,d.staff_id,d.id,p_empty_returned,'Empty exchange','Customer','Delivery partner',auth.uid());
  end if;
 end if;
 update public.deliveries set status=p_status,updated_at=now() where id=d.id returning * into d;
 insert into public.delivery_events(agency_id,delivery_id,status,actor_id) values(p_agency_id,d.id,p_status,auth.uid());
 return d;
end $$;

create function public.return_empty_stock(p_agency_id uuid,p_staff_id uuid,p_cylinder_type_id uuid,p_quantity integer)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_agency_role(p_agency_id,array['owner','admin']) then raise exception 'Admin membership required' using errcode='42501'; end if;
 if p_quantity is null or p_quantity<1 then raise exception 'Positive quantity required'; end if;
 update public.staff_stock set empty_count=empty_count-p_quantity where agency_id=p_agency_id and staff_id=p_staff_id and cylinder_type_id=p_cylinder_type_id and empty_count>=p_quantity;
 if not found then raise exception 'Insufficient partner empty cylinders'; end if;
 insert into public.stock_balances(agency_id,cylinder_type_id,empty_count) values(p_agency_id,p_cylinder_type_id,p_quantity)
 on conflict(agency_id,cylinder_type_id) do update set empty_count=public.stock_balances.empty_count+excluded.empty_count;
 insert into public.stock_movements(agency_id,cylinder_type_id,staff_id,quantity,movement_type,from_location,to_location,actor_id)
 values(p_agency_id,p_cylinder_type_id,p_staff_id,p_quantity,'Empty return','Delivery partner','Godown',auth.uid());
end $$;

create function public.record_payment(p_agency_id uuid,p_delivery_id uuid,p_method text,p_request_id uuid,p_paid_on date default (now() at time zone 'Asia/Kolkata')::date)
returns public.payments language plpgsql security definer set search_path='' as $$
declare d public.deliveries; result public.payments; is_admin boolean;
begin
 is_admin:=private.has_agency_role(p_agency_id,array['owner','admin']);
 if not is_admin and not private.has_agency_role(p_agency_id,array['delivery']) then raise exception 'Agency membership required' using errcode='42501'; end if;
 if p_request_id is null or p_paid_on is null or p_method is null or p_method not in ('cash','upi') then raise exception 'Valid request, date and method required'; end if;
 if not is_admin and p_paid_on<>(now() at time zone 'Asia/Kolkata')::date then raise exception 'Partner collections must use the current business date'; end if;
 select * into d from public.deliveries where id=p_delivery_id and agency_id=p_agency_id for update;
 if not found then raise exception 'Delivery not found'; end if;
 if not is_admin and not exists(select 1 from public.staff where id=d.staff_id and agency_id=p_agency_id and auth_user_id=auth.uid() and active) then raise exception 'Assigned partner required' using errcode='42501'; end if;
 select * into result from public.payments where agency_id=p_agency_id and request_id=p_request_id;
 if found then
  if result.delivery_id<>p_delivery_id or result.method<>p_method or result.paid_on<>p_paid_on then raise exception 'Request UUID already used for another collection'; end if;
  return result;
 end if;
 if d.status<>'Delivered' then raise exception 'Complete the delivery before recording collection'; end if;
 if d.payment_status='Paid' then raise exception 'Delivery is already paid'; end if;
 -- Same staff/day lock as settlement review prevents a collection/review race.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_agency_id::text||d.staff_id::text||p_paid_on::text,0));
 insert into public.payments(agency_id,delivery_id,staff_id,amount_paise,method,paid_on,request_id,recorded_by)
 values(p_agency_id,d.id,d.staff_id,d.unit_price_paise*d.quantity,p_method,p_paid_on,p_request_id,auth.uid()) returning * into result;
 update public.deliveries set payment_status='Paid',payment_method=p_method,updated_at=now() where id=d.id;
 update public.settlements set
  cash_expected_paise=cash_expected_paise+case when p_method='cash' then result.amount_paise else 0 end,
  upi_expected_paise=upi_expected_paise+case when p_method='upi' then result.amount_paise else 0 end
 where agency_id=p_agency_id and staff_id=d.staff_id and settlement_date=p_paid_on;
 return result;
end $$;

create function public.review_settlement(p_agency_id uuid,p_staff_id uuid,p_date date,p_submitted_paise bigint)
returns public.settlements language plpgsql security definer set search_path='' as $$
declare cash_total bigint; upi_total bigint; result public.settlements;
begin
 if not private.has_agency_role(p_agency_id,array['owner','admin']) then raise exception 'Admin membership required' using errcode='42501'; end if;
 if p_date is null or p_submitted_paise is null or p_submitted_paise<0 then raise exception 'Valid date and submission required'; end if;
 if not exists(select 1 from public.staff where id=p_staff_id and agency_id=p_agency_id) then raise exception 'Staff not found'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_agency_id::text||p_staff_id::text||p_date::text,0));
 select coalesce(sum(amount_paise) filter(where method='cash'),0),coalesce(sum(amount_paise) filter(where method='upi'),0)
 into cash_total,upi_total from public.payments where agency_id=p_agency_id and staff_id=p_staff_id and paid_on=p_date;
 if p_submitted_paise>cash_total then raise exception 'Submission exceeds collected cash'; end if;
 insert into public.settlements(agency_id,staff_id,settlement_date,cash_expected_paise,upi_expected_paise,submitted_paise,reviewed_by)
 values(p_agency_id,p_staff_id,p_date,cash_total,upi_total,p_submitted_paise,auth.uid())
 on conflict(agency_id,staff_id,settlement_date) do update set cash_expected_paise=excluded.cash_expected_paise,upi_expected_paise=excluded.upi_expected_paise,submitted_paise=excluded.submitted_paise,reviewed_by=excluded.reviewed_by,reviewed_at=now()
 returning * into result;
 insert into public.settlement_events(agency_id,staff_id,settlement_date,cash_expected_paise,upi_expected_paise,submitted_paise,actor_id)
 values(p_agency_id,p_staff_id,p_date,cash_total,upi_total,p_submitted_paise,auth.uid());
 return result;
end $$;
-- Function execution is denied by default to public/anonymous callers.
revoke all on function public.receive_stock(uuid,uuid,integer) from public,anon;
revoke all on function public.create_delivery(uuid,uuid,uuid,uuid,integer,date,text,text,uuid,text) from public,anon;
revoke all on function public.transition_delivery(uuid,uuid,text,integer) from public,anon;
revoke all on function public.return_empty_stock(uuid,uuid,uuid,integer) from public,anon;
revoke all on function public.record_payment(uuid,uuid,text,uuid,date) from public,anon;
revoke all on function public.review_settlement(uuid,uuid,date,bigint) from public,anon;
grant execute on function public.receive_stock(uuid,uuid,integer) to authenticated;
grant execute on function public.create_delivery(uuid,uuid,uuid,uuid,integer,date,text,text,uuid,text) to authenticated;
grant execute on function public.transition_delivery(uuid,uuid,text,integer) to authenticated;
grant execute on function public.return_empty_stock(uuid,uuid,uuid,integer) to authenticated;
grant execute on function public.record_payment(uuid,uuid,text,uuid,date) to authenticated;
grant execute on function public.review_settlement(uuid,uuid,date,bigint) to authenticated;
commit;
