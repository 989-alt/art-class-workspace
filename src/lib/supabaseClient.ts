import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

export function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  if (!isSupabaseConfigured()) return null;
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  cachedClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'artclass.supabase.auth',
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });
  return cachedClient;
}

/**
 * Clears the cached Supabase client so the next `getSupabase()` call rebuilds it.
 *
 * Note: Any live Realtime subscriptions held by the old client will leak after
 * reset. Task 4 intentionally does not clean those up — Task 5+ owns subscription
 * lifecycle and should unsubscribe before calling this helper.
 */
export function resetSupabase(): void {
  cachedClient = null;
}
