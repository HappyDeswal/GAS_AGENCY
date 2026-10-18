-- Fail closed at the database boundary, including direct authenticated RPC calls.
-- Replace this lock only with a transactionally consumed, delivery-bound OTP proof.
begin;
create function private.require_delivery_verification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'Delivered' then
    if TG_OP = 'INSERT' then
      raise exception 'Delivery completion is disabled until delivery-bound OTP verification is enforced' using errcode = '42501';
    elsif old.status is distinct from new.status then
      raise exception 'Delivery completion is disabled until delivery-bound OTP verification is enforced' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.require_delivery_verification() from public, anon, authenticated;
create trigger delivery_completion_verification
before insert or update on public.deliveries
for each row execute function private.require_delivery_verification();
commit;
