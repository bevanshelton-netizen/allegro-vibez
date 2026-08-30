import { createIzakhonoCoreClient } from './izakhonoCoreClient'

// Compatibility exports are intentionally retained so the existing UI can move
// to IZAKHONO Core without a disruptive page-by-page rewrite. No Supabase
// client is instantiated by this module anymore.
export let supabase = null
export let isSupabaseConfigured = false
export let backendProvider = 'none'

export async function initSupabase() {
  if (supabase) return supabase

  const coreUrl = import.meta.env.VITE_IZAKHONO_CORE_URL || ''
  const coreProject = import.meta.env.VITE_IZAKHONO_PROJECT || 'allegro_vibez'
  const corePublicKey = import.meta.env.VITE_IZAKHONO_PUBLIC_KEY || ''

  if (!coreUrl || !coreProject || !corePublicKey) {
    return null
  }

  const core = createIzakhonoCoreClient(coreUrl, coreProject, corePublicKey)
  const coreFrom = core.from.bind(core)

  // Anonymous visitors are restricted to explicit public views. Authenticated
  // creators continue to use the owner-protected tables through the same
  // Supabase-shaped query interface used by the existing ALLEGRO UI.
  core.from = table => {
    if (!core.session && table === 'releases') return coreFrom('published_releases')
    if (!core.session && table === 'profiles') return coreFrom('public_profiles')
    return coreFrom(table)
  }

  supabase = core
  isSupabaseConfigured = true
  backendProvider = 'izakhono-core'
  return supabase
}

void initSupabase()
