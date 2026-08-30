import { createIzakhonoCoreClient } from './izakhonoCoreClient'

// Compatibility exports are intentionally retained so the existing UI can move
// to IZAKHONO Core without a disruptive page-by-page rewrite. No Supabase
// client is instantiated by this module anymore.
const coreUrl = import.meta.env.VITE_IZAKHONO_CORE_URL || ''
const coreProject = import.meta.env.VITE_IZAKHONO_PROJECT || 'allegro_vibez'
const corePublicKey = import.meta.env.VITE_IZAKHONO_PUBLIC_KEY || ''

let selectedClient = null

if (coreUrl && coreProject && corePublicKey) {
  const core = createIzakhonoCoreClient(coreUrl, coreProject, corePublicKey)
  const coreFrom = core.from.bind(core)

  // Anonymous visitors are restricted to explicit public views. Authenticated
  // creators continue to use owner-protected tables through the same query
  // interface already used by the ALLEGRO UI.
  core.from = table => {
    if (!core.session && table === 'releases') return coreFrom('published_releases')
    if (!core.session && table === 'profiles') return coreFrom('public_profiles')
    return coreFrom(table)
  }

  selectedClient = core
}

export const supabase = selectedClient
export const isSupabaseConfigured = Boolean(selectedClient)
export const backendProvider = selectedClient ? 'izakhono-core' : 'none'

export async function initSupabase() {
  return supabase
}
