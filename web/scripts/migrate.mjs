// Applies new files in supabase/migrations to the database in DATABASE_URL (.env.local).
// Each file runs in its own transaction and is recorded, so running this again is safe.
// Usage: npm run db:migrate
import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const url = process.env.DATABASE_URL;
// Read the password line exactly as written: the usual .env reader cuts a value at "#", and generated passwords can contain one
const rawLine = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_PASSWORD='));
const password = rawLine ? rawLine.slice('DATABASE_PASSWORD='.length) : process.env.DATABASE_PASSWORD;
if (!url || !password) {
  console.error('DATABASE_URL or DATABASE_PASSWORD is missing from .env.local.');
  process.exit(1);
}

const u = new URL(url);   // the address part; the password is added separately
const client = new pg.Client({ host: u.hostname, port: Number(u.port || 5432), user: decodeURIComponent(u.username), database: u.pathname.slice(1) || 'postgres', password, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
} catch (e) {
  console.error(`Could not connect to the database: ${e.message}`);
  console.error('Check DATABASE_PASSWORD in .env.local: it is the database password you set when the project was made.');
  process.exit(1);
}

await client.query(`
  create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now());
  alter table public.schema_migrations enable row level security;
  revoke all on public.schema_migrations from anon, authenticated;
`);
const done = new Set((await client.query('select name from public.schema_migrations')).rows.map((r) => r.name));

const dir = join(new URL('..', import.meta.url).pathname, 'supabase/migrations');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
let applied = 0;
for (const f of files) {
  if (done.has(f)) continue;
  process.stdout.write(`applying ${f} … `);
  try {
    await client.query('begin');
    await client.query(readFileSync(join(dir, f), 'utf8'));
    await client.query('insert into public.schema_migrations (name) values ($1)', [f]);
    await client.query('commit');
    console.log('done');
    applied++;
  } catch (e) {
    await client.query('rollback');
    console.log('FAILED');
    console.error(e.message);
    await client.end();
    process.exit(1);
  }
}
console.log(applied ? `${applied} migration(s) applied.` : 'Database is up to date.');
await client.end();
