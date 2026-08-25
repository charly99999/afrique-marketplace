import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Seules l’URL publique et la clé publishable sont admises dans le navigateur.
 * La service role key reste exclusivement dans les Edge Functions Supabase.
 */
export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase n’est pas configuré. Définissez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY.");
  }
  return supabase;
}
