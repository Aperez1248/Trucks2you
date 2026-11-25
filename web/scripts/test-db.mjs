// Runs the migrations against an in-memory Postgres (PGlite) with small stand-ins for
// Supabase's auth schema, then checks the access rules for each kind of person.
// Usage: npm run test:db
import { freshDb } from './lib/pglite.mjs';

const db = await freshDb();
let failed = 0;
const check = (ok, msg) => { console.log(ok ? '  ok  ' : '  FAIL', msg); if (!ok) failed++; };

// ── People ─────────────────────────────────────────────────────────
const u = {
  contractor: '10000000-0000-0000-0000-000000000001',
  contractor2: '10000000-0000-0000-0000-000000000002',
  owner: '10000000-0000-0000-0000-000000000003',
  driver: '10000000-0000-0000-0000-000000000004',
  driver2: '10000000-0000-0000-0000-000000000005',
  newbie: '10000000-0000-0000-0000-000000000006',
  admin: '10000000-0000-0000-0000-000000000007',
};
const C1 = '00000000-0000-0000-0000-0000000000c1', C2 = '00000000-0000-0000-0000-0000000000c2', OW = '00000000-0000-0000-0000-0000000000f1';
const T1 = '00000000-0000-0000-0000-0000000000a1', T2 = '00000000-0000-0000-0000-0000000000a2', T3 = '00000000-0000-0000-0000-0000000000a3';
await db.exec(`
  insert into auth.users (id) values ${Object.values(u).map((x) => `('${x}')`).join(',')};
  insert into public.companies (id, kind, name, status) values
    ('${C1}', 'contractor', 'Lucas Paving', 'approved'), ('${C2}', 'contractor', 'Other Paving', 'approved'), ('${OW}', 'owner', 'Delgado Hauling', 'approved');
  insert into public.profiles (user_id, full_name, role, company_id, status) values
    ('${u.contractor}', 'Al', 'contractor', '${C1}', 'approved'),
    ('${u.contractor2}', 'Other', 'contractor', '${C2}', 'approved'),
    ('${u.owner}', 'Ray', 'owner', '${OW}', 'approved'),
    ('${u.driver}', 'Marco', 'driver', '${OW}', 'approved'),
    ('${u.driver2}', 'Sam', 'driver', null, 'approved'),
    ('${u.admin}', 'Admin', 'admin', null, 'approved');
  insert into public.trucks (id, company_id, unit, type, driver_id) values
    ('${T1}', '${OW}', 'T-14', 'w12', '${u.owner}'), ('${T2}', '${OW}', 'T-22', 'sd', '${u.driver}'), ('${T3}', '${OW}', 'T-30', 'sd', null);
  insert into public.plants (id, name, addr, lat, lng) values ('P03', 'Gallagher & Burk', '344 High St, Oakland', 37.763, -122.213);
`);

async function as(who, sql, params) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${u[who]}';`);
  try { return await db.query(sql, params); }
  finally { await db.exec(`reset role; reset request.jwt.claim.sub;`); }
}
const fails = async (fn) => { try { await fn(); return false; } catch { return true; } };
const count = async (who, table, where = 'true') => (await as(who, `select count(*)::int c from public.${table} where ${where}`)).rows[0].c;

// ── Signing up ─────────────────────────────────────────────────────
await as('newbie', `insert into public.profiles (user_id, full_name, role, status) values ('${u.newbie}', 'New', 'driver', 'approved')`);
check((await db.query(`select status from public.profiles where user_id = $1`, [u.newbie])).rows[0].status === 'review', 'a new sign-up goes to review and cannot approve themselves');
check(await fails(() => as('newbie', `insert into public.profiles (user_id, role) values ('${u.driver2}', 'driver')`)), 'cannot create a profile for someone else');
await db.exec(`insert into auth.users (id) values ('10000000-0000-0000-0000-000000000099')`);
u.sneaky = '10000000-0000-0000-0000-000000000099';
check(await fails(() => as('sneaky', `insert into public.profiles (user_id, role, company_id) values ('${u.sneaky}', 'contractor', '${C1}')`)), "cannot sign up into someone else's company");
check(await fails(() => as('newbie', `update public.profiles set role = 'admin' where user_id = '${u.newbie}'`)), 'cannot make yourself an admin');
check(await fails(() => as('newbie', `update public.profiles set status = 'approved' where user_id = '${u.newbie}'`)), 'cannot approve yourself later either');
await as('newbie', `update public.profiles set full_name = 'Newbie Two', phone = '5105550100' where user_id = '${u.newbie}'`);
check((await db.query(`select full_name from public.profiles where user_id = $1`, [u.newbie])).rows[0].full_name === 'Newbie Two', 'you can edit your own name and phone');
check(await fails(() => as('newbie', `update public.profiles set company_id = '${C1}' where user_id = '${u.newbie}'`)), 'cannot join a company you did not create');
await as('newbie', `insert into public.companies (kind, name, status) values ('owner', 'Newbie Trucking', 'approved')`);
const nc = (await db.query(`select id, status, created_by from public.companies where name = 'Newbie Trucking'`)).rows[0];
check(nc.status === 'review' && nc.created_by === u.newbie, 'a new company starts in review, owned by its creator');
await as('newbie', `update public.profiles set company_id = '${nc.id}' where user_id = '${u.newbie}'`);
check(await count('newbie', 'companies', `id = '${nc.id}'`) === 1, 'you can join and see the company you created');
check(await fails(() => as('newbie', `update public.companies set status = 'approved' where id = '${nc.id}'`)), 'cannot approve your own company');

// ── Jobs ───────────────────────────────────────────────────────────
const job = (await as('contractor', `insert into public.jobs (company_id, name, site_name, site_lat, site_lng, plant_id, day)
  values ('${C1}', 'Main St', 'Main St & Oak', 37.79, -122.25, 'P03', current_date + 1) returning id, ref`)).rows[0];
check(/^J-\d+$/.test(job.ref), 'a new job gets a J- number: ' + job.ref);
await as('contractor', `insert into public.job_needs (job_id, truck_type, count) values ('${job.id}', 'w12', 1), ('${job.id}', 'sd', 1)`);
check(await fails(() => as('contractor', `insert into public.jobs (company_id, name, site_name, site_lat, site_lng, day) values ('${C2}', 'x', 'x', 0, 0, current_date)`)), 'contractors cannot post jobs for another company');
check(await fails(() => as('driver', `insert into public.jobs (company_id, name, site_name, site_lat, site_lng, day) values ('${OW}', 'x', 'x', 0, 0, current_date)`)), 'drivers cannot post jobs');
check(await count('contractor2', 'jobs') === 0, 'another contractor does not see our jobs');
check(await count('driver', 'jobs') === 1, 'an approved driver sees open jobs');
check(await count('driver', 'job_needs') === 2, 'and what trucks they need');
check(await count('newbie', 'jobs') === 0, 'someone still being checked does not see jobs');
const up = await as('driver', `update public.jobs set name = 'Hacked' where id = '${job.id}' returning id`);
check(up.rows.length === 0, 'drivers cannot change jobs');

// ── Taking spots ───────────────────────────────────────────────────
check(await fails(() => as('driver', `insert into public.assignments (job_id, truck_id, company_id, truck_type) values ('${job.id}', '${T2}', '${OW}', 'sd')`)), 'nobody adds themselves to a job directly');
check(await fails(() => as('driver', `select public.accept_job('${job.id}', '${T1}')`)), "a driver cannot send someone else's truck");
check(await fails(() => as('newbie', `select public.accept_job('${job.id}', '${T2}')`)), 'someone still being checked cannot take a job');
const a1 = (await as('driver', `select public.accept_job('${job.id}', '${T2}') as id`)).rows[0].id;
check(!!a1, 'a driver takes a spot with their own truck');
check(await fails(() => as('owner', `select public.accept_job('${job.id}', '${T3}')`)), 'no spots left for super dumpers: the next one is turned away');
check(await fails(() => as('driver', `select public.accept_job('${job.id}', '${T2}')`)), 'the same truck cannot take two spots');
await as('owner', `select public.accept_job('${job.id}', '${T1}')`);
check((await db.query(`select status from public.jobs where id = $1`, [job.id])).rows[0].status === 'booked', 'when every spot is filled the job is booked');
check(await count('driver2', 'jobs') === 0, 'a booked job leaves the open list for other drivers');
check(await count('driver', 'jobs') === 1, 'but the drivers on it still see it');

// a second job the same day for the same truck
const job2 = (await as('contractor2', `insert into public.jobs (company_id, name, site_name, site_lat, site_lng, day) values ('${C2}', 'Other', 'x', 0, 0, current_date + 1) returning id`)).rows[0];
await as('contractor2', `insert into public.job_needs (job_id, truck_type, count) values ('${job2.id}', 'sd', 2)`);
check(await fails(() => as('driver', `select public.accept_job('${job2.id}', '${T2}')`)), 'a truck cannot take two jobs on the same day');

// ── Seeing each other ──────────────────────────────────────────────
check(await count('contractor', 'profiles', `user_id = '${u.driver}'`) === 1, "the contractor sees the drivers on their job");
check(await count('contractor', 'profiles', `user_id = '${u.driver2}'`) === 0, 'but not drivers who are not on their jobs');
check(await count('contractor', 'trucks') === 2, 'the contractor sees the trucks on their job');
check(await count('contractor2', 'assignments') === 0, "another contractor doesn't see who is on our job");
check(await count('owner', 'assignments') === 2, "the truck owner sees their trucks' spots");

// ── The day: tickets, events, dispatch notes ───────────────────────
await as('driver', `insert into public.tickets (assignment_id, no, tons) values ('${a1}', '448712', 18.6)`);
await as('driver', `insert into public.events (assignment_id, kind, source) values ('${a1}', 'clock_in', 'gps')`);
check(await count('contractor', 'tickets') === 1 && await count('contractor', 'events') === 1, 'the contractor sees load tickets and the day\'s events');
check(await fails(() => as('driver2', `insert into public.tickets (assignment_id, no) values ('${a1}', 'x')`)), 'nobody else can add tickets to that spot');
await as('contractor', `insert into public.job_updates (job_id, text) values ('${job.id}', 'Staging moved to Oak Ave')`);
check(await count('driver', 'job_updates') === 1, 'drivers on the job see dispatch notes');
check(await count('driver2', 'job_updates') === 0, 'drivers not on the job do not');
check(await fails(() => as('driver', `insert into public.job_updates (job_id, text) values ('${job.id}', 'x')`)), 'drivers cannot post dispatch notes');

// ── Phone notifications ────────────────────────────────────────────
await as('driver', `insert into public.push_subscriptions (endpoint, user_id, keys) values ('https://push.example/1', '${u.driver}', '{}')`);
check(await count('driver', 'push_subscriptions') === 1, 'you save your own phone for notifications');
check(await count('contractor', 'push_subscriptions') === 0, "nobody sees anyone else's phones");
check(await fails(() => as('driver2', `insert into public.push_subscriptions (endpoint, user_id, keys) values ('https://push.example/2', '${u.driver}', '{}')`)), "cannot add a phone to someone else's account");

// ── Admins ─────────────────────────────────────────────────────────
check(await count('admin', 'jobs') === 2 && await count('admin', 'profiles') === 7, 'admins see everyone and every job');
await as('admin', `update public.profiles set status = 'approved' where user_id = '${u.newbie}'`);
check((await db.query(`select status from public.profiles where user_id = $1`, [u.newbie])).rows[0].status === 'approved', 'admins approve people');

console.log(failed ? `\n${failed} check(s) failed` : '\nAll access rules hold.');
process.exit(failed ? 1 : 0);
