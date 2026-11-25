import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseEnv } from './env';

/**
 * Supabase client with the secret key: bypasses access rules. Server only, and only
 * after the caller's role has been checked — used for creating logins, first-time
 * setup and importing a backup.
 */
export function createAdminClient() {
  const { url } = supabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('SUPABASE_SECRET_KEY is not set in .env.local.');
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
