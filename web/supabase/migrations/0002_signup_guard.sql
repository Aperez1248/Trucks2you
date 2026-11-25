-- Signing up: a new profile can only point at a company its owner just created,
-- and finishing sign-up puts it in review (Trucks2U approves it).
create or replace function public.t2u_guard_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- no signed-in person (the server or a migration) or a Trucks2U admin: allowed
  if auth.uid() is null or public.t2u_admin() then
    new.updated_at := now(); return new;
  end if;
  if tg_op = 'INSERT' then
    if new.user_id is distinct from auth.uid() then raise exception 'You can only create your own profile'; end if;
    if new.role = 'admin' then raise exception 'Admins are added by Trucks2U'; end if;
    new.status := 'review';
  else
    if new.role is distinct from old.role or new.status is distinct from old.status or new.user_id is distinct from old.user_id then
      raise exception 'Your role and approval are set by Trucks2U';
    end if;
  end if;
  -- you can only belong to a company you created; anything else is set by an admin or the company
  if new.company_id is not null and (tg_op = 'INSERT' or new.company_id is distinct from old.company_id)
     and not exists (select 1 from public.companies c where c.id = new.company_id and c.created_by = auth.uid()) then
    raise exception 'You can only join a company you created';
  end if;
  new.updated_at := now();
  return new;
end $$;
