import { createClient } from '@supabase/supabase-js'
import { createIzakhonoCoreClient } from './izakhonoCoreClient'

const FALLBACK_SUPABASE_URL = 'https://zoolsumifdtanycjryje.supabase.co'
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_8LBaWtgMxlewODl4STQ9YA_jMMEt5Gt'

const coreUrl = import.meta.env.VITE_IZAKHONO_CORE_URL || ''
const coreProject = import.meta.env.VITE_IZAKHONO_PROJECT || 'allegro_vibez'
const corePublicKey = import.meta.env.VITE_IZAKHONO_PUBLIC_KEY || ''

let selectedClient
let selectedProvider

if (coreUrl && coreProject && corePublicKey) {
  const core = createIzakhonoCoreClient(coreUrl, coreProject, corePublicKey)
  const coreFrom = core.from.bind(core)

  core.from = table => {
    if (!core.session && table === 'releases') return coreFrom('published_releases')
    if (!core.session && table === 'profiles') return coreFrom('public_profiles')
    return coreFrom(table)
  }

  selectedClient = core
  selectedProvider = 'izakhono-core'
} else {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL
  const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY

  selectedClient = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  selectedProvider = 'supabase'
}

export const supabase = selectedClient
export const isSupabaseConfigured = Boolean(selectedClient)
export const backendProvider = selectedProvider

export async function initSupabase() {
  return supabase
}
