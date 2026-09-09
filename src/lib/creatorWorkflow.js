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
    press_headline: values.pressHeadline?.trim() || null,
    marketing_message: values.marketingMessage?.trim() || null,
    booking_email: values.bookingEmail?.trim() || null,
    booking_phone: values.bookingPhone?.trim() || null,
    website_url: values.websiteUrl?.trim() || null,
    instagram_url: values.instagramUrl?.trim() || null,
    tiktok_url: values.tiktokUrl?.trim() || null,
    youtube_url: values.youtubeUrl?.trim() || null,
    home_region: values.homeRegion?.trim() || null,
    primary_genres: String(values.primaryGenres || '').split(',').map(v=>v.trim()).filter(Boolean).slice(0,12),
    languages: String(values.languages || '').split(',').map(v=>v.trim()).filter(Boolean).slice(0,12),
    available_for_international_bookings: Boolean(values.internationalBookings),
    booking_regions: String(values.bookingRegions || '').split(',').map(v=>v.trim()).filter(Boolean).slice(0,12),
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


export async function createArtistBookingRequest(artistId, payload) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('create_artist_booking_request', {
    p_artist_id: artistId,
    p_payload: payload,
  })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

export async function getArtistBookingSettings(artistId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('artist_booking_settings')
    .select('artist_id,booking_enabled,base_currency,minimum_fee,deposit_percent,default_set_minutes,performance_types,travel_policy,rider_summary,quote_valid_days,updated_at')
    .eq('artist_id', artistId)
    .maybeSingle()
  if (error) throw error
  return data || null
}

export async function saveArtistBookingSettings(artistId, values) {
  const client = requireSupabase()
  const payload = {
    artist_id: artistId,
    booking_enabled: Boolean(values.booking_enabled),
    base_currency: String(values.base_currency || 'ZAR').toUpperCase(),
    minimum_fee: values.minimum_fee === '' ? null : Number(values.minimum_fee),
    deposit_percent: Number(values.deposit_percent ?? 50),
    default_set_minutes: Number(values.default_set_minutes ?? 60),
    performance_types: String(values.performance_types || '').split(',').map(v=>v.trim()).filter(Boolean).slice(0,20),
    travel_policy: values.travel_policy?.trim() || null,
    rider_summary: values.rider_summary?.trim() || null,
    quote_valid_days: Number(values.quote_valid_days ?? 7),
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await client
    .from('artist_booking_settings')
    .upsert(payload, { onConflict: 'artist_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getArtistBookingRequests(artistId, limit = 100) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('artist_booking_requests')
    .select('id,request_code,artist_id,company_name,contact_name,contact_email,contact_phone,preferred_contact,performance_type,performance_other,event_date,event_time,event_visibility,venue_name,venue_address,city,country,event_description,expected_audience,proposed_budget,budget_currency,backline_provided,flights_hotel_provided,ground_transport_provided,visa_support_required,livestream_rights_requested,recording_rights_requested,merchandise_opportunity,special_requests,status,quoted_gross_amount,quote_currency,platform_fee_bps,platform_fee_amount,creator_net_amount,quote_valid_until,deposit_percent,deposit_amount,deposit_status,created_at,updated_at')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function quoteArtistBooking(bookingId, grossAmount, currency = 'ZAR', depositPercent = null) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('quote_artist_booking', {
    p_booking_id: bookingId,
    p_gross_amount: grossAmount,
    p_currency: currency,
    p_deposit_percent: depositPercent,
  })
  if (error) throw error
  return data
}

export async function setArtistBookingStatus(bookingId, status, note = '') {
  const client = requireSupabase()
  const { data, error } = await client.rpc('set_artist_booking_status', {
    p_booking_id: bookingId,
    p_status: status,
    p_note: note || null,
  })
  if (error) throw error
  return data
}
