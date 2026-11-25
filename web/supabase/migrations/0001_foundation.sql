-- ════════════════════════════════════════════════════════════════════
--  Trucks2U — Foundation
--  People and their companies, trucks, plants, jobs, who's on each job,
--  load tickets, the day's events, dispatch notes and phone notifications.
--
--  Access rules (row-level security), in short:
--    · You always see and edit your own profile, but never your own role or approval.
--    · Contractors see and run their company's jobs.
--    · Approved drivers, truck owners and brokers see open jobs, and every job they're on.
--    · Taking a spot on a job only happens through accept_job(), which checks spots,
--      one job per truck per day, and approval in one step.
--    · Trucks2U admins see everything and approve people.
-- ════════════════════════════════════════════════════════════════════

create type public.t2u_role as enum ('contractor', 'owner', 'driver', 'broker', 'admin');
create type public.t2u_status as enum ('new', 'review', 'approved', 'suspended');
create type public.truck_type as enum ('w10', 'w12', 'sd', 'transfer', 'semi_end', 'bottom');
create type public.job_status as enum ('searching', 'booked', 'done', 'approved', 'cancelled');
create type public.asg_status as enum ('assigned', 'onsite', 'done', 'cancelled');

-- ── Companies: contractors, truck owners (fleets) and brokers ──────
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  kind        public.t2u_role not null check (kind in ('contractor', 'owner', 'broker')),
  name        text not null,
  phone       text,
  email       text,
  address     text,
  city        text,
  usdot       text,
  mc          text,
  status      public.t2u_status not null default 'review',
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── People: one row per login ─────────────────────────────────────
create table public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  email       text,
  role        public.t2u_role not null,
  company_id  uuid references public.companies (id) on delete set null,
  status      public.t2u_status not null default 'new',
  -- driver job alerts: distance from home base, workdays, how to be told
  alerts      jsonb not null default '{"radius": 50, "days": ["Weekdays"], "push": true, "text": false, "sameDay": false}',
  home_lat    double precision,
  home_lng    double precision,
  home_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.profiles (company_id);

-- ── Who is asking ─────────────────────────────────────────────────
create function public.t2u_role() returns public.t2u_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where user_id = auth.uid()
$$;
create function public.t2u_company() returns uuid
language sql stable security definer set search_path = '' as $$
  select company_id from public.profiles where user_id = auth.uid()
$$;
create function public.t2u_approved() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select status = 'approved' from public.profiles where user_id = auth.uid()), false)
$$;
create function public.t2u_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' and status = 'approved' from public.profiles where user_id = auth.uid()), false)
$$;

-- Nobody approves themselves or changes their own role: those columns only change through an admin (or the server)
create function public.t2u_guard_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- no signed-in person (the server or a migration) or a Trucks2U admin: allowed
  if auth.uid() is null or public.t2u_admin() then
    new.updated_at := now(); return new;
  end if;
  if tg_op = 'INSERT' then
    if new.user_id is distinct from auth.uid() then raise exception 'You can only create your own profile'; end if;
    if new.role = 'admin' then raise exception 'Admins are added by Trucks2U'; end if;
    new.status := 'new';
  else
    if new.role is distinct from old.role or new.status is distinct from old.status or new.user_id is distinct from old.user_id then
      raise exception 'Your role and approval are set by Trucks2U';
    end if;
    -- you can join a company you created; anything else is set by an admin or the company
    if new.company_id is distinct from old.company_id and new.company_id is not null
       and not exists (select 1 from public.companies c where c.id = new.company_id and c.created_by = auth.uid()) then
      raise exception 'You can only join a company you created';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger t2u_guard_profile before insert or update on public.profiles
  for each row execute function public.t2u_guard_profile();

create function public.t2u_guard_company() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- no signed-in person (the server or a migration) or a Trucks2U admin: allowed
  if auth.uid() is null or public.t2u_admin() then
    new.updated_at := now(); return new;
  end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.status := 'review';
  elsif new.status is distinct from old.status or new.kind is distinct from old.kind then
    raise exception 'Company approval is set by Trucks2U';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger t2u_guard_company before insert or update on public.companies
  for each row execute function public.t2u_guard_company();

-- ── Trucks ────────────────────────────────────────────────────────
create table public.trucks (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  unit        text not null,                 -- "T-14"
  type        public.truck_type not null,
  plate       text,
  make        text,
  model       text,
  year        int,
  driver_id   uuid references public.profiles (user_id) on delete set null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (company_id, unit)
);
create index on public.trucks (driver_id);

-- ── Asphalt plants and dump sites (shared list) ───────────────────
create table public.plants (
  id       text primary key,                 -- "P03"
  name     text not null,
  addr     text not null,
  county   text,
  lat      double precision not null,
  lng      double precision not null,
  kinds    text,
  phone    text,
  recycle  boolean not null default false
);

-- ── Jobs ──────────────────────────────────────────────────────────
create sequence public.job_ref_seq start 1001;
create table public.jobs (
  id          uuid primary key default gen_random_uuid(),
  ref         text not null unique default ('J-' || nextval('public.job_ref_seq')),
  company_id  uuid not null references public.companies (id) on delete cascade,
  created_by  uuid references auth.users (id) on delete set null,
  name        text not null,
  kind        int not null default 2,          -- 0 haul grindings off, 1 deliver asphalt, 2 both
  kind_text   text,
  site_name   text not null,
  site_addr   text,
  site_lat    double precision not null,
  site_lng    double precision not null,
  plant_id    text references public.plants (id),
  day         date not null,
  start_time  time not null default '06:00',
  hours       numeric not null default 8,
  radius_mi   int not null default 25,
  rates       jsonb not null default '{"w10": 115, "w12": 130, "sd": 150}',
  dispatch    jsonb not null default '{}',      -- on-site contact, phone, staging, gate, order #, mix, safety gear, notes
  status      public.job_status not null default 'searching',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.jobs (company_id, day);
create index on public.jobs (status, day);

create table public.job_needs (
  job_id      uuid not null references public.jobs (id) on delete cascade,
  truck_type  public.truck_type not null,
  count       int not null check (count between 1 and 50),
  primary key (job_id, truck_type)
);

-- ── Who is on each job ────────────────────────────────────────────
create table public.assignments (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs (id) on delete cascade,
  truck_id    uuid not null references public.trucks (id) on delete restrict,
  driver_id   uuid references public.profiles (user_id) on delete set null,
  company_id  uuid not null references public.companies (id),   -- the truck's owner or broker
  truck_type  public.truck_type not null,
  status      public.asg_status not null default 'assigned',
  confirmed   boolean not null default false,
  check_in    timestamptz,
  check_out   timestamptz,
  hours       numeric,
  created_at  timestamptz not null default now()
);
create index on public.assignments (job_id);
create index on public.assignments (driver_id);
create index on public.assignments (company_id);
create unique index assignments_one_spot on public.assignments (job_id, truck_id) where status <> 'cancelled';

create table public.tickets (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.assignments (id) on delete cascade,
  no             text not null,
  tons           numeric,
  at             timestamptz not null default now(),
  photo_path     text
);
create index on public.tickets (assignment_id);

-- The day's events for the reports: clock in/out, heading to the plant, at the plant, loaded, back at the job
create table public.events (
  id             bigint generated always as identity primary key,
  assignment_id  uuid not null references public.assignments (id) on delete cascade,
  kind           text not null,
  at             timestamptz not null default now(),
  lat            double precision,
  lng            double precision,
  note           text,
  source         text not null default 'tap' check (source in ('gps', 'tap'))
);
create index on public.events (assignment_id, at);

-- Dispatch notes from the contractor to everyone on the job
create table public.job_updates (
  id          bigint generated always as identity primary key,
  job_id      uuid not null references public.jobs (id) on delete cascade,
  text        text not null,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on public.job_updates (job_id);

-- Documents: CDL, medical card, insurance, registration... (files go in storage later)
create table public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (user_id) on delete cascade,
  company_id  uuid references public.companies (id) on delete cascade,
  truck_id    uuid references public.trucks (id) on delete cascade,
  kind        text not null,
  file_path   text,
  details     jsonb not null default '{}',
  expires_on  date,
  status      text not null default 'review' check (status in ('review', 'good', 'bad')),
  created_at  timestamptz not null default now()
);

-- Phone notifications: one row per phone that allowed them
create table public.push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  keys        jsonb not null,
  created_at  timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);

-- ── Helpers for the access rules ──────────────────────────────────
-- Is the person asking on this job (the driver, or the company that owns the truck)?
create function public.t2u_on_job(j uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.assignments a
    where a.job_id = j and a.status <> 'cancelled'
      and (a.driver_id = auth.uid() or a.company_id = public.t2u_company()))
$$;
-- Does the person asking run this job (its contractor)?
create function public.t2u_runs_job(j uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.jobs where id = j and company_id = public.t2u_company())
$$;
create function public.t2u_can_see_assignment(aid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.assignments a
    where a.id = aid and (a.driver_id = auth.uid() or a.company_id = public.t2u_company() or public.t2u_runs_job(a.job_id)))
$$;

-- ── Access rules ──────────────────────────────────────────────────
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.trucks enable row level security;
alter table public.plants enable row level security;
alter table public.jobs enable row level security;
alter table public.job_needs enable row level security;
alter table public.assignments enable row level security;
alter table public.tickets enable row level security;
alter table public.events enable row level security;
alter table public.job_updates enable row level security;
alter table public.documents enable row level security;
alter table public.push_subscriptions enable row level security;

-- New tables aren't shared automatically in this project, so say exactly who may use each one (the rules below still apply)
grant select, insert, update on public.companies, public.profiles, public.trucks, public.jobs, public.job_needs,
  public.assignments, public.tickets, public.events, public.job_updates, public.documents to authenticated;
grant delete on public.trucks, public.job_needs, public.tickets, public.documents to authenticated;
grant select on public.plants to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant usage on sequence public.job_ref_seq to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- companies
create policy co_read on public.companies for select to authenticated
  using (id = public.t2u_company() or created_by = auth.uid() or public.t2u_admin()
         or (status = 'approved' and public.t2u_approved()));   -- approved people see approved companies' names
create policy co_insert on public.companies for insert to authenticated with check (true);   -- the trigger sets owner and review
create policy co_update on public.companies for update to authenticated
  using (id = public.t2u_company() or created_by = auth.uid() or public.t2u_admin());

-- profiles
create policy pr_read on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.t2u_admin()
         or (company_id is not null and company_id = public.t2u_company())          -- people in your company
         or exists (select 1 from public.assignments a where a.driver_id = profiles.user_id and public.t2u_runs_job(a.job_id)));  -- drivers on your jobs
create policy pr_insert on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy pr_update on public.profiles for update to authenticated using (user_id = auth.uid() or public.t2u_admin());

-- trucks
create policy tr_read on public.trucks for select to authenticated
  using (company_id = public.t2u_company() or driver_id = auth.uid() or public.t2u_admin()
         or exists (select 1 from public.assignments a where a.truck_id = trucks.id and public.t2u_runs_job(a.job_id)));
create policy tr_write on public.trucks for all to authenticated
  using (company_id = public.t2u_company() and public.t2u_role() in ('owner', 'broker'))
  with check (company_id = public.t2u_company() and public.t2u_role() in ('owner', 'broker'));

-- plants
create policy pl_read on public.plants for select to authenticated using (true);

-- jobs
create policy jb_read on public.jobs for select to authenticated
  using (company_id = public.t2u_company() or public.t2u_admin() or public.t2u_on_job(id)
         or (status = 'searching' and day >= current_date and public.t2u_approved()
             and public.t2u_role() in ('driver', 'owner', 'broker')));
create policy jb_insert on public.jobs for insert to authenticated
  with check (company_id = public.t2u_company() and public.t2u_role() = 'contractor' and public.t2u_approved());
create policy jb_update on public.jobs for update to authenticated
  using (company_id = public.t2u_company() and public.t2u_role() = 'contractor');

-- job_needs follow their job
create policy jn_read on public.job_needs for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id));    -- jobs' own rule decides
create policy jn_write on public.job_needs for all to authenticated
  using (public.t2u_runs_job(job_id)) with check (public.t2u_runs_job(job_id));

-- assignments: read by the people involved; created only by accept_job()
create policy as_read on public.assignments for select to authenticated
  using (driver_id = auth.uid() or company_id = public.t2u_company() or public.t2u_runs_job(job_id) or public.t2u_admin());
create policy as_update on public.assignments for update to authenticated
  using (driver_id = auth.uid() or company_id = public.t2u_company() or public.t2u_runs_job(job_id));

-- tickets and events: the driver and truck company add them; everyone on the assignment reads them
create policy tk_read on public.tickets for select to authenticated using (public.t2u_can_see_assignment(assignment_id) or public.t2u_admin());
create policy tk_write on public.tickets for insert to authenticated
  with check (exists (select 1 from public.assignments a where a.id = assignment_id and (a.driver_id = auth.uid() or a.company_id = public.t2u_company())));
create policy tk_delete on public.tickets for delete to authenticated
  using (exists (select 1 from public.assignments a where a.id = assignment_id and (a.driver_id = auth.uid() or a.company_id = public.t2u_company())));
create policy ev_read on public.events for select to authenticated using (public.t2u_can_see_assignment(assignment_id) or public.t2u_admin());
create policy ev_write on public.events for insert to authenticated
  with check (exists (select 1 from public.assignments a where a.id = assignment_id and (a.driver_id = auth.uid() or a.company_id = public.t2u_company())));

-- dispatch notes: the contractor writes; everyone on the job reads
create policy ju_read on public.job_updates for select to authenticated
  using (public.t2u_runs_job(job_id) or public.t2u_on_job(job_id) or public.t2u_admin());
create policy ju_write on public.job_updates for insert to authenticated with check (public.t2u_runs_job(job_id));

-- documents: yours and your company's; admins check them
create policy dc_read on public.documents for select to authenticated
  using (user_id = auth.uid() or company_id = public.t2u_company() or public.t2u_admin());
create policy dc_write on public.documents for insert to authenticated
  with check (user_id = auth.uid() or company_id = public.t2u_company());
create policy dc_update on public.documents for update to authenticated using (public.t2u_admin());
create policy dc_delete on public.documents for delete to authenticated using (user_id = auth.uid() and status = 'review');

-- phone notifications: only your own
create policy ps_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Taking a spot on a job ────────────────────────────────────────
-- One step, so two drivers can't take the last spot at the same time.
create function public.accept_job(p_job uuid, p_truck uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs; t public.trucks; open int; aid uuid;
begin
  if not public.t2u_approved() then raise exception 'Your account is still being checked'; end if;
  select * into j from public.jobs where id = p_job for update;          -- one at a time per job
  if j.id is null or j.status <> 'searching' or j.day < current_date then raise exception 'This job is no longer taking trucks'; end if;
  select * into t from public.trucks where id = p_truck and active;
  if t.id is null then raise exception 'Truck not found'; end if;
  if not (t.driver_id = auth.uid() or (t.company_id = public.t2u_company() and public.t2u_role() in ('owner', 'broker'))) then
    raise exception 'You can only send your own trucks';
  end if;
  select coalesce((select count from public.job_needs where job_id = p_job and truck_type = t.type), 0)
       - (select count(*) from public.assignments where job_id = p_job and truck_type = t.type and status <> 'cancelled')
    into open;
  if open <= 0 then raise exception 'No spots left for this truck type'; end if;
  if exists (select 1 from public.assignments a join public.jobs x on x.id = a.job_id
             where a.truck_id = p_truck and a.status <> 'cancelled' and x.day = j.day) then
    raise exception 'This truck already has a job that day';
  end if;
  insert into public.assignments (job_id, truck_id, driver_id, company_id, truck_type)
    values (p_job, p_truck, t.driver_id, t.company_id, t.type) returning id into aid;
  -- every spot filled: the job is booked
  if not exists (select 1 from public.job_needs n where n.job_id = p_job
                 and n.count > (select count(*) from public.assignments a where a.job_id = p_job and a.truck_type = n.truck_type and a.status <> 'cancelled')) then
    update public.jobs set status = 'booked', updated_at = now() where id = p_job;
  end if;
  return aid;
end $$;
revoke all on function public.accept_job(uuid, uuid) from public;
grant execute on function public.accept_job(uuid, uuid) to authenticated;
