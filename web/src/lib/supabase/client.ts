import { createBrowserClient } from '@supabase/ssr';

/** Supabase client in the browser, signed in as the current user (same access rules as the server). Used for uploads that are too big to pass through the server. */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
