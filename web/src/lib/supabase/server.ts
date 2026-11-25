import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseEnv } from './env';

/** Supabase client acting as the signed-in user: every query is limited by the database's access rules. */
export async function createClient() {
  const cookieStore = await cookies(); // first, so pages using this always render per request
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only; the proxy refreshes them.
        }
      },
    },
  });
}
