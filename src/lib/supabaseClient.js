import { createClient } from '@supabase/supabase-js'

// ALLEGRO-VIBEZ production project. The public project URL is safe to keep as a
// fallback so a missing hosting URL variable cannot disable authentication.
// The browser-safe publishable/anon key must still be supplied by the host.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://zoolsumifdtanycjryje.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
