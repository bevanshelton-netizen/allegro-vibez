import { supabase } from './supabaseClient'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function submitRelease(releaseId) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('submit_release', { p_release_id: releaseId })
  if (error) throw error
  return data
}

export async function reviewRelease(releaseId, decision, note = '') {
  const client = requireSupabase()
  const { data, error } = await client.rpc('review_release', {
    p_release_id: releaseId,
    p_decision: decision,
    p_note: note || null,
  })
  if (error) throw error
  return data
}

export async function getReleaseEvents(releaseId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('release_events')
    .select('id,event_type,note,created_at,actor_id')
    .eq('release_id', releaseId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getRoyaltySummary(ownerId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('creator_royalty_summary')
    .select('currency,gross_amount,platform_fee,net_amount')
    .eq('owner_id', ownerId)
  if (error) throw error
  return data || []
}

export async function getRoyaltyLedger(ownerId, limit = 50) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('royalty_ledger')
    .select('id,release_id,source,territory,currency,gross_amount,platform_fee,net_amount,statement_period,external_reference,created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function updateCreatorProfile(userId, values) {
  const client = requireSupabase()
  const payload = {
    display_name: values.displayName?.trim() || null,
    stage_name: values.stageName?.trim() || null,
    account_type: values.accountType || 'artist',
    country: values.country?.trim() || null,
    city: values.city?.trim() || null,
    bio: values.bio?.trim() || null,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await client
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}
