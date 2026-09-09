import { backendProvider, supabase } from './supabaseClient'

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

  if (backendProvider === 'izakhono-core') {
    const publicPayload = {
      display_name: payload.display_name,
      stage_name: payload.stage_name,
      account_type: payload.account_type,
      country: payload.country,
      city: payload.city,
      bio: payload.bio,
      press_headline: payload.press_headline,
      marketing_message: payload.marketing_message,
      booking_email: payload.booking_email,
      booking_phone: payload.booking_phone,
      website_url: payload.website_url,
      instagram_url: payload.instagram_url,
      tiktok_url: payload.tiktok_url,
      youtube_url: payload.youtube_url,
      home_region: payload.home_region,
      primary_genres: payload.primary_genres,
      languages: payload.languages,
      available_for_international_bookings: payload.available_for_international_bookings,
      booking_regions: payload.booking_regions,
      updated_at: payload.updated_at,
    }
    const existing = await client.from('public_profiles').select('id').eq('id', userId).maybeSingle()
    if (existing.error) throw existing.error
    const mirror = existing.data
      ? await client.from('public_profiles').update(publicPayload).eq('id', userId).single()
      : await client.from('public_profiles').insert({ id: userId, ...publicPayload, created_at: new Date().toISOString() }).select('*').single()
    if (mirror.error) throw mirror.error
  }

  return data
}


export async function createArtistBookingRequest(artistId, payload) {
  const client = requireSupabase()
  if (backendProvider === 'izakhono-core') {
    const now = new Date().toISOString()
    const requestCode = 'AB-' + crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()
    const { data, error } = await client
      .from('artist_booking_intake')
      .insert({
        artist_id: artistId,
        request_code: requestCode,
        ...payload,
        created_at: now,
        updated_at: now,
      })
      .select('id,request_code')
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await client.rpc('create_artist_booking_request', {
    p_artist_id: artistId,
    p_payload: payload,
  })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

export async function getArtistBookingSettings(artistId) {
  const client = requireSupabase()
  const table = backendProvider === 'izakhono-core' && !client.session
    ? 'public_artist_booking_settings'
    : 'artist_booking_settings'
  const { data, error } = await client
    .from(table)
    .select('artist_id,booking_enabled,base_currency,minimum_fee,deposit_percent,default_set_minutes,performance_types,travel_policy,rider_summary,quote_valid_days,updated_at')
    .eq('artist_id', artistId)
    .maybeSingle()
  if (error) throw error
  if (backendProvider === 'izakhono-core' && data) {
    return { status:'new', budget_currency:'ZAR', deposit_status:'not_collected', ...data }
  }
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

  if (backendProvider === 'izakhono-core') {
    const existing = await client
      .from('artist_booking_settings')
      .select('id')
      .eq('artist_id', artistId)
      .maybeSingle()
    if (existing.error) throw existing.error

    const result = existing.data?.id
      ? await client.from('artist_booking_settings').update(payload).eq('id', existing.data.id).single()
      : await client.from('artist_booking_settings').insert({ id: artistId, ...payload }).select('*').single()
    if (result.error) throw result.error

    const publicExisting = await client
      .from('public_artist_booking_settings')
      .select('id')
      .eq('artist_id', artistId)
      .maybeSingle()
    if (publicExisting.error) throw publicExisting.error

    if (payload.booking_enabled) {
      const publicPayload = {
        artist_id: artistId,
        booking_enabled: true,
        base_currency: payload.base_currency,
        minimum_fee: payload.minimum_fee,
        deposit_percent: payload.deposit_percent,
        default_set_minutes: payload.default_set_minutes,
        performance_types: payload.performance_types,
        travel_policy: payload.travel_policy,
        rider_summary: payload.rider_summary,
        quote_valid_days: payload.quote_valid_days,
        updated_at: payload.updated_at,
      }
      const mirror = publicExisting.data?.id
        ? await client.from('public_artist_booking_settings').update(publicPayload).eq('id', publicExisting.data.id).single()
        : await client.from('public_artist_booking_settings').insert({ id: artistId, ...publicPayload }).select('*').single()
      if (mirror.error) throw mirror.error
    } else if (publicExisting.data?.id) {
      const removed = await client.from('public_artist_booking_settings').delete().eq('id', publicExisting.data.id)
      if (removed.error) throw removed.error
    }

    return result.data
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
  const bookingTable = backendProvider === 'izakhono-core' ? 'artist_booking_intake' : 'artist_booking_requests'
  const { data, error } = await client
    .from(bookingTable)
    .select('id,request_code,artist_id,company_name,contact_name,contact_email,contact_phone,preferred_contact,performance_type,performance_other,event_date,event_time,event_visibility,venue_name,venue_address,city,country,event_description,expected_audience,proposed_budget,budget_currency,backline_provided,flights_hotel_provided,ground_transport_provided,visa_support_required,livestream_rights_requested,recording_rights_requested,merchandise_opportunity,special_requests,status,quoted_gross_amount,quote_currency,platform_fee_bps,platform_fee_amount,creator_net_amount,quote_valid_until,deposit_percent,deposit_amount,deposit_status,created_at,updated_at')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []).map(row => ({
    status: 'new',
    budget_currency: 'ZAR',
    deposit_status: 'not_collected',
    ...row,
  }))
}

export async function quoteArtistBooking(bookingId, grossAmount, currency = 'ZAR', depositPercent = null) {
  const client = requireSupabase()
  if (backendProvider === 'izakhono-core') {
    const current = await client.from(backendProvider === 'izakhono-core' ? 'artist_booking_intake' : 'artist_booking_requests').select('*').eq('id', bookingId).maybeSingle()
    if (current.error) throw current.error
    if (!current.data) throw new Error('Booking request not found.')

    const settings = await client
      .from('artist_booking_settings')
      .select('deposit_percent,quote_valid_days')
      .eq('artist_id', current.data.artist_id)
      .maybeSingle()
    if (settings.error) throw settings.error

    const days = Number(settings.data?.quote_valid_days ?? 7)
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + days)
    const nextDeposit = depositPercent == null
      ? Number(settings.data?.deposit_percent ?? 50)
      : Number(depositPercent)

    const updated = await client
      .from(backendProvider === 'izakhono-core' ? 'artist_booking_intake' : 'artist_booking_requests')
      .update({
        status: 'quoted',
        quoted_gross_amount: Number(grossAmount),
        quote_currency: String(currency || 'ZAR').toUpperCase(),
        platform_fee_bps: 1000,
        platform_fee_amount: Math.round(Number(grossAmount) * 0.10 * 100) / 100,
        creator_net_amount: Math.round(Number(grossAmount) * 0.90 * 100) / 100,
        quote_valid_until: validUntil.toISOString().slice(0, 10),
        deposit_percent: nextDeposit,
        deposit_amount: Math.round(Number(grossAmount) * nextDeposit / 100 * 100) / 100,
        deposit_status: 'not_collected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .single()
    if (updated.error) throw updated.error

    await client.from('artist_booking_events').insert({
      booking_id: bookingId,
      artist_id: current.data.artist_id,
      actor_id: client.session?.user?.id || null,
      event_type: 'quote_created',
      note: 'Transparent 10% ALLEGRO quote recorded. Payment collection remains gated.',
    })
    return updated.data
  }

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
  if (backendProvider === 'izakhono-core') {
    const allowed = ['new','qualified','quoted','negotiating','deposit_due','confirmed','completed','declined','cancelled']
    if (!allowed.includes(status)) throw new Error('Invalid booking status.')

    const current = await client.from(backendProvider === 'izakhono-core' ? 'artist_booking_intake' : 'artist_booking_requests').select('id,artist_id').eq('id', bookingId).maybeSingle()
    if (current.error) throw current.error
    if (!current.data) throw new Error('Booking request not found.')

    const updated = await client
      .from(backendProvider === 'izakhono-core' ? 'artist_booking_intake' : 'artist_booking_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .single()
    if (updated.error) throw updated.error

    await client.from('artist_booking_events').insert({
      booking_id: bookingId,
      artist_id: current.data.artist_id,
      actor_id: client.session?.user?.id || null,
      event_type: 'status_' + status,
      note: note || null,
    })
    return updated.data
  }

  const { data, error } = await client.rpc('set_artist_booking_status', {
    p_booking_id: bookingId,
    p_status: status,
    p_note: note || null,
  })
  if (error) throw error
  return data
}


export async function getArtistBookingRequestById(bookingId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from(backendProvider === 'izakhono-core' ? 'artist_booking_intake' : 'artist_booking_requests')
    .select('id,request_code,artist_id,company_name,contact_name,contact_email,contact_phone,preferred_contact,performance_type,performance_other,event_date,event_time,event_visibility,venue_name,venue_address,city,country,event_description,expected_audience,proposed_budget,budget_currency,backline_provided,flights_hotel_provided,ground_transport_provided,visa_support_required,livestream_rights_requested,recording_rights_requested,merchandise_opportunity,special_requests,status,quoted_gross_amount,quote_currency,platform_fee_bps,platform_fee_amount,creator_net_amount,quote_valid_until,deposit_percent,deposit_amount,deposit_status,created_at,updated_at')
    .eq('id', bookingId)
    .maybeSingle()
  if (error) throw error
  return data || null
}
