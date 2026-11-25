// In-memory Postgres (PGlite) with small stand-ins for Supabase's auth and
// storage schemas, with all migrations applied. Used by the test scripts.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export async function freshDb({ quiet = false, upTo = null } = {}) {
  const root = new URL('../..', import.meta.url).pathname;
  const db = new PGlite();
  // ── Supabase stand-ins ──────────────────────────────────────────────
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as
      $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to authenticated, service_role;
    alter default privileges in schema public grant all on sequences to authenticated, service_role;
    grant all on storage.objects to authenticated;
  `);

  const dir = join(root, 'supabase/migrations');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql') && (!upTo || f <= upTo)).sort()) {
    try { await db.exec(readFileSync(join(dir, f), 'utf8')); }
    catch (e) { console.error(`${f}: ${e.message}`, e.position ? `(at character ${e.position})` : '', e.where ?? ''); process.exit(1); }
    if (!quiet) console.log('applied', f);
  }
  return db;
}

/** Applies one migration file to an existing practice database. */
export async function applyMigration(db, name) {
  const root = new URL('../..', import.meta.url).pathname;
  await db.exec(readFileSync(join(root, 'supabase/migrations', name), 'utf8'));
}
