begin;
alter table public.stock_movements add column reason text not null default '';
alter table public.stock_movements drop constraint stock_movements_movement_type_check;
alter table public.stock_movements add constraint stock_movements_movement_type_check check(movement_type in ('Receive','Dispatch','Return','Delivered','Empty exchange','Empty return','Damaged','Missing'));
create function public.adjust_stock(p_agency_id uuid,p_cylinder_type_id uuid,p_quantity integer,p_category text,p_reason text)
returns public.stock_balances language plpgsql security definer set search_path='' as $$
declare result public.stock_balances;
begin
 if not private.has_agency_role(p_agency_id,array['owner','admin']) then raise exception 'Admin membership required' using errcode='42501'; end if;
 if p_quantity is null or p_quantity<1 or p_quantity>10000 or p_category is null or p_category not in ('damaged','missing') or p_reason is null or length(trim(p_reason))<3 then raise exception 'Valid quantity, category and reason required'; end if;
 update public.stock_balances set full_count=full_count-p_quantity,damaged_count=damaged_count+case when p_category='damaged' then p_quantity else 0 end,missing_count=missing_count+case when p_category='missing' then p_quantity else 0 end
 where agency_id=p_agency_id and cylinder_type_id=p_cylinder_type_id and full_count>=p_quantity returning * into result;
 if not found then raise exception 'Insufficient available godown stock'; end if;
 insert into public.stock_movements(agency_id,cylinder_type_id,quantity,movement_type,from_location,to_location,actor_id,reason)
 values(p_agency_id,p_cylinder_type_id,p_quantity,case when p_category='damaged' then 'Damaged' else 'Missing' end,'Godown full stock',p_category,auth.uid(),p_reason);
 return result;
end $$;
revoke all on function public.adjust_stock(uuid,uuid,integer,text,text) from public,anon;
grant execute on function public.adjust_stock(uuid,uuid,integer,text,text) to authenticated;
commit;
