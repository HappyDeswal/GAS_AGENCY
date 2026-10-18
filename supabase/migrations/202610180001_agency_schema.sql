-- GAS AGENCY: initial schema for a NEW Supabase project.
-- Apply through Supabase CLI migrations or the SQL editor. No live deployment is done by this file.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  timezone text not null default 'Asia/Kolkata' check (timezone = 'Asia/Kolkata'),
  created_at timestamptz not null default now()
);
create table public.agency_members (
  agency_id uuid not null references public.agencies(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner','admin','delivery')),
  active boolean not null default true,
  primary key (agency_id,user_id)
);
-- Roles are provisioned by a trusted operator, never from user-editable auth metadata.
create function private.has_agency_role(p_agency uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.agency_members m
    where m.agency_id=p_agency and m.user_id=(select auth.uid())
      and m.active and m.role=any(p_roles));
$$;
revoke all on function private.has_agency_role(uuid,text[]) from public,anon;
grant execute on function private.has_agency_role(uuid,text[]) to authenticated;

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id),
  auth_user_id uuid references auth.users(id),
  name text not null check (length(trim(name)) between 2 and 120),
  contact text,
  active boolean not null default true,
  on_duty boolean not null default false,
  unique (agency_id,id), unique (agency_id,auth_user_id)
);
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id),
  name text not null check (length(trim(name)) between 2 and 120),
  mobile text check (mobile is null or mobile ~ '^[0-9+ ()-]{7,20}$'),
  address text not null check (length(trim(address)) between 5 and 500),
  customer_type text not null check (customer_type in ('registered','walk_in')),
  consumer_number text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (agency_id,id), unique (agency_id,consumer_number)
);
create table public.cylinder_types (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id),
  name text not null,
  weight_kg numeric(5,2) not null check (weight_kg>0),
  price_paise bigint not null check (price_paise>0),
  reorder_level integer not null default 150 check (reorder_level>=0),
  active boolean not null default true,
  unique (agency_id,id), unique (agency_id,name)
);
create table public.stock_balances (
  agency_id uuid not null references public.agencies(id),
  cylinder_type_id uuid not null,
  full_count integer not null default 0 check (full_count>=0),
  empty_count integer not null default 0 check (empty_count>=0),
  damaged_count integer not null default 0 check (damaged_count>=0),
  missing_count integer not null default 0 check (missing_count>=0),
  primary key (agency_id,cylinder_type_id),
  foreign key (agency_id,cylinder_type_id) references public.cylinder_types(agency_id,id)
);
create table public.staff_stock (
  agency_id uuid not null,
  staff_id uuid not null,
  cylinder_type_id uuid not null,
  full_count integer not null default 0 check (full_count>=0),
  empty_count integer not null default 0 check (empty_count>=0),
  primary key (agency_id,staff_id,cylinder_type_id),
  foreign key (agency_id,staff_id) references public.staff(agency_id,id),
  foreign key (agency_id,cylinder_type_id) references public.cylinder_types(agency_id,id)
);
create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id),
  reference text not null default ('DEL-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,16))),
  customer_id uuid not null,
  staff_id uuid not null,
  cylinder_type_id uuid not null,
  quantity integer not null check (quantity between 1 and 20),
  unit_price_paise bigint not null check (unit_price_paise>0),
  delivery_date date not null,
  address text not null check (length(trim(address)) between 5 and 500),
  payment_method text not null check (payment_method in ('cash','upi')),
  payment_status text not null default 'Pending' check (payment_status in ('Pending','Paid')),
  status text not null default 'Assigned' check (status in ('Assigned','In Progress','Delivered','Failed','Cancelled')),
  notes text not null default '' check (length(notes)<=1000),
  request_id uuid not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id,id), unique (agency_id,reference), unique (agency_id,request_id),
  foreign key (agency_id,customer_id) references public.customers(agency_id,id),
  foreign key (agency_id,staff_id) references public.staff(agency_id,id),
  foreign key (agency_id,cylinder_type_id) references public.cylinder_types(agency_id,id)
);
create table public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  delivery_id uuid not null,
  status text not null check (status in ('Assigned','In Progress','Delivered','Failed','Cancelled')),
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (agency_id,delivery_id) references public.deliveries(agency_id,id)
);
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  cylinder_type_id uuid not null,
  staff_id uuid,
  delivery_id uuid,
  quantity integer not null check (quantity>0),
  movement_type text not null check (movement_type in ('Receive','Dispatch','Return','Delivered','Empty exchange','Empty return')),
  from_location text not null,
  to_location text not null,
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (agency_id,cylinder_type_id) references public.cylinder_types(agency_id,id),
  foreign key (agency_id,staff_id) references public.staff(agency_id,id),
  foreign key (agency_id,delivery_id) references public.deliveries(agency_id,id)
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  delivery_id uuid not null,
  staff_id uuid not null,
  amount_paise bigint not null check (amount_paise>0),
  method text not null check (method in ('cash','upi')),
  status text not null default 'Paid' check (status='Paid'),
  paid_on date not null,
  request_id uuid not null,
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (agency_id,delivery_id), unique (agency_id,request_id),
  foreign key (agency_id,delivery_id) references public.deliveries(agency_id,id),
  foreign key (agency_id,staff_id) references public.staff(agency_id,id)
);
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  staff_id uuid not null,
  settlement_date date not null,
  cash_expected_paise bigint not null check (cash_expected_paise>=0),
  upi_expected_paise bigint not null check (upi_expected_paise>=0),
  submitted_paise bigint not null check (submitted_paise>=0 and submitted_paise<=cash_expected_paise),
  reviewed_by uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now(),
  unique (agency_id,staff_id,settlement_date),
  foreign key (agency_id,staff_id) references public.staff(agency_id,id)
);
-- Append-only history preserves each reviewed cash submission.
create table public.settlement_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  staff_id uuid not null,
  settlement_date date not null,
  cash_expected_paise bigint not null,
  upi_expected_paise bigint not null,
  submitted_paise bigint not null,
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (agency_id,staff_id) references public.staff(agency_id,id)
);
create index deliveries_agency_date_idx on public.deliveries(agency_id,delivery_date desc);
create index deliveries_assignee_idx on public.deliveries(agency_id,staff_id,status);
create index payments_agency_date_idx on public.payments(agency_id,paid_on desc);
create index customers_agency_name_idx on public.customers(agency_id,name);
create index events_delivery_idx on public.delivery_events(agency_id,delivery_id,created_at);

-- Every operational table has RLS and explicit grants. No anonymous data access.
do $$ declare t text; begin
  foreach t in array array['agencies','agency_members','staff','customers','cylinder_types','stock_balances','staff_stock','deliveries','delivery_events','stock_movements','payments','settlements','settlement_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from public, anon, authenticated',t);
    execute format('grant select on table public.%I to authenticated',t);
  end loop;
end $$;
create policy agencies_read on public.agencies for select to authenticated
using (private.has_agency_role(id,array['owner','admin','delivery']));
create policy membership_read on public.agency_members for select to authenticated
using (user_id=(select auth.uid()) or private.has_agency_role(agency_id,array['owner','admin']));
create policy staff_read on public.staff for select to authenticated
using (private.has_agency_role(agency_id,array['owner','admin']) or
  (auth_user_id=(select auth.uid()) and private.has_agency_role(agency_id,array['delivery'])));
create policy customer_read on public.customers for select to authenticated
using (private.has_agency_role(agency_id,array['owner','admin']) or
  (private.has_agency_role(agency_id,array['delivery']) and exists(select 1 from public.deliveries d join public.staff s on s.id=d.staff_id and s.agency_id=d.agency_id where d.customer_id=customers.id and d.agency_id=customers.agency_id and s.auth_user_id=(select auth.uid()))));
create policy cylinder_read on public.cylinder_types for select to authenticated
using (private.has_agency_role(agency_id,array['owner','admin','delivery']));
create policy stock_read on public.stock_balances for select to authenticated
using (private.has_agency_role(agency_id,array['owner','admin']));
create policy staff_stock_read on public.staff_stock for select to authenticated
using (private.has_agency_role(agency_id,array['owner','admin']) or
 (private.has_agency_role(agency_id,array['delivery']) and exists(select 1 from public.staff s where s.id=staff_stock.staff_id and s.agency_id=staff_stock.agency_id and s.auth_user_id=(select auth.uid()))));
create policy delivery_read on public.deliveries for select to authenticated
using (private.has_agency_role(agency_id,array['owner','admin']) or
 (private.has_agency_role(agency_id,array['delivery']) and exists(select 1 from public.staff s where s.id=deliveries.staff_id and s.agency_id=deliveries.agency_id and s.auth_user_id=(select auth.uid()))));
create policy event_read on public.delivery_events for select to authenticated
using (exists(select 1 from public.deliveries d where d.id=delivery_events.delivery_id and d.agency_id=delivery_events.agency_id));
create policy movement_read on public.stock_movements for select to authenticated
using (private.has_agency_role(agency_id,array['owner','admin']));
create policy payment_read on public.payments for select to authenticated
using (exists(select 1 from public.deliveries d where d.id=payments.delivery_id and d.agency_id=payments.agency_id));
create policy settlement_read on public.settlements for select to authenticated
using (private.has_agency_role(agency_id,array['owner','admin']) or
 (private.has_agency_role(agency_id,array['delivery']) and exists(select 1 from public.staff s where s.id=settlements.staff_id and s.agency_id=settlements.agency_id and s.auth_user_id=(select auth.uid()))));
-- Owner/admin metadata writes only. Membership changes remain operator-only.
grant insert,update on public.customers,public.staff,public.cylinder_types to authenticated;
do $$ declare t text; begin
 foreach t in array array['customers','staff','cylinder_types'] loop
  execute format('create policy admin_insert on public.%I for insert to authenticated with check (private.has_agency_role(agency_id,array[''owner'',''admin'']))',t);
  execute format('create policy admin_update on public.%I for update to authenticated using (private.has_agency_role(agency_id,array[''owner'',''admin''])) with check (private.has_agency_role(agency_id,array[''owner'',''admin'']))',t);
 end loop;
end $$;
create policy settlement_history_read on public.settlement_events for select to authenticated
using (private.has_agency_role(agency_id,array['owner','admin']) or
 (private.has_agency_role(agency_id,array['delivery']) and exists(select 1 from public.staff s where s.id=settlement_events.staff_id and s.agency_id=settlement_events.agency_id and s.auth_user_id=(select auth.uid()))));
commit;
