import { createClient } from '@supabase/supabase-js'
import { createIzakhonoCoreClient } from './izakhonoCoreClient'

const FALLBACK_SUPABASE_URL = 'https://zoolsumifdtanycjryje.supabase.co'
const PUBLIC_CONFIG_URL = `${FALLBACK_SUPABASE_URL}/functions/v1/public-config`

export let supabase = null
export let isSupabaseConfigured = false
export let backendProvider = 'none'

export async function initSupabase() {
  if (supabase) return supabase

  const coreUrl = import.meta.env.VITE_IZAKHONO_CORE_URL || ''
  const coreProject = import.meta.env.VITE_IZAKHONO_PROJECT || 'allegro_vibez'
  const corePublicKey = import.meta.env.VITE_IZAKHONO_PUBLIC_KEY || ''

  if (coreUrl && coreProject && corePublicKey) {
    supabase = createIzakhonoCoreClient(coreUrl, coreProject, corePublicKey)
    isSupabaseConfigured = true
    backendProvider = 'izakhono-core'
    return supabase
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL
  let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

  if (!supabaseAnonKey) {
    try {
      const response = await fetch(PUBLIC_CONFIG_URL, {
        headers: { Accept: 'application/json' },
      })
      if (response.ok) {
        const config = await response.json()
        supabaseAnonKey = config.publishableKey || ''
      }
    } catch {
      // Keep auth disabled if the public bootstrap endpoint is unavailable.
    }
  }

  isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

  if (isSupabaseConfigured) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
    backendProvider = 'supabase'
  }

  return supabase
}

void initSupabase()
