function asError(error) {
  if (error instanceof Error) return error
  return new Error(typeof error === 'string' ? error : 'IZAKHONO Core request failed.')
}

function projectColumns(row, columns) {
  if (!row || !columns || columns === '*') return row
  const names = columns.split(',').map(value => value.trim()).filter(Boolean)
  return Object.fromEntries(names.map(name => [name, row[name]]))
}

class CoreQueryBuilder {
  constructor(client, table) {
    this.client = client
    this.table = table
    this.operation = 'select'
    this.payload = null
    this.filters = {}
    this.inFilters = {}
    this.columns = '*'
    this.orderBy = null
    this.limitValue = null
    this.offsetValue = 0
    this.countMode = null
    this.head = false
    this.resultMode = 'many'
  }

  select(columns = '*', options = {}) {
    this.columns = columns || '*'
    this.countMode = options?.count || null
    this.head = Boolean(options?.head)
    return this
  }

  insert(data) {
    this.operation = 'insert'
    this.payload = data
    return this
  }

  update(data) {
    this.operation = 'update'
    this.payload = data
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(column, value) {
    this.filters[column] = value
    return this
  }

  in(column, values) {
    this.inFilters[column] = Array.isArray(values) ? values : []
    return this
  }

  order(column, { ascending = true } = {}) {
    this.orderBy = `${column}.${ascending ? 'asc' : 'desc'}`
    return this
  }

  limit(value) {
    this.limitValue = value
    return this
  }

  range(from, to) {
    this.offsetValue = from
    this.limitValue = Math.max(0, to - from + 1)
    return this
  }

  single() {
    this.resultMode = 'single'
    return this.execute()
  }

  maybeSingle() {
    this.resultMode = 'maybeSingle'
    return this.execute()
  }

  async execute() {
    try {
      if (this.operation === 'select') return await this.executeSelect()
      if (this.operation === 'insert') return await this.executeInsert()
      if (this.operation === 'update') return await this.executeUpdate()
      if (this.operation === 'delete') return await this.executeDelete()
      return { data: null, error: new Error('Unsupported IZAKHONO Core operation.') }
    } catch (error) {
      return { data: null, error: asError(error), count: null }
    }
  }

  async executeSelect() {
    const query = new URLSearchParams()
    Object.entries(this.filters).forEach(([key, value]) => query.set(key, String(value)))
    Object.entries(this.inFilters).forEach(([key, values]) => query.set(`${key}__in`, values.map(String).join(',')))
    if (this.orderBy) query.set('order', this.orderBy)
    query.set('limit', String(this.limitValue ?? (this.head || this.countMode ? 1000 : 100)))
    if (this.offsetValue) query.set('offset', String(this.offsetValue))

    const rows = await this.client.request(`/v1/data/${this.client.project}/${this.table}?${query}`)
    const projected = (rows || []).map(row => projectColumns(row, this.columns))
    const count = this.countMode ? projected.length : null

    if (this.head) return { data: null, error: null, count }
    if (this.resultMode === 'single') {
      if (projected.length !== 1) return { data: null, error: new Error(`Expected one row, received ${projected.length}.`), count }
      return { data: projected[0], error: null, count }
    }
    if (this.resultMode === 'maybeSingle') {
      if (projected.length > 1) return { data: null, error: new Error(`Expected at most one row, received ${projected.length}.`), count }
      return { data: projected[0] || null, error: null, count }
    }
    return { data: projected, error: null, count }
  }

  async executeInsert() {
    const values = Array.isArray(this.payload) ? this.payload : [this.payload]
    const rows = []
    for (const value of values) {
      rows.push(await this.client.request(`/v1/data/${this.client.project}/${this.table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: value }),
      }))
    }
    const projected = rows.map(row => projectColumns(row, this.columns))
    const data = Array.isArray(this.payload) ? projected : projected[0]
    return { data, error: null }
  }

  async executeUpdate() {
    const id = this.filters.id
    if (!id) return { data: null, error: new Error("IZAKHONO Core updates require .eq('id', value).") }
    const row = await this.client.request(`/v1/data/${this.client.project}/${this.table}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: this.payload || {} }),
    })
    const data = projectColumns(row, this.columns)
    if (this.resultMode === 'single' || this.resultMode === 'maybeSingle') return { data, error: null }
    return { data: [data], error: null }
  }

  async executeDelete() {
    const id = this.filters.id
    if (!id) return { data: null, error: new Error("IZAKHONO Core deletes require .eq('id', value).") }
    const data = await this.client.request(`/v1/data/${this.client.project}/${this.table}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return { data, error: null }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject)
  }
}

class CoreBucketClient {
  constructor(client, bucket) {
    this.client = client
    this.bucket = bucket === 'release-assets' ? 'release_assets' : bucket.replaceAll('-', '_')
  }

  async upload(path, file) {
    try {
      const form = new FormData()
      form.append('file', file)
      const data = await this.client.request(`/v1/storage/${this.client.project}/${this.bucket}/${path}`, {
        method: 'PUT',
        body: form,
      })
      return { data, error: null }
    } catch (error) {
      return { data: null, error: asError(error) }
    }
  }

  async download(path) {
    try {
      const response = await fetch(`${this.client.base}/v1/storage/${this.client.project}/${this.bucket}/${path}`, {
        headers: this.client.headers(),
      })
      if (!response.ok) throw new Error(await response.text())
      return { data: await response.blob(), error: null }
    } catch (error) {
      return { data: null, error: asError(error) }
    }
  }

  async remove(paths) {
    try {
      for (const path of paths) {
        await this.client.request(`/v1/storage/${this.client.project}/${this.bucket}/${path}`, { method: 'DELETE' })
      }
      return { data: paths, error: null }
    } catch (error) {
      return { data: null, error: asError(error) }
    }
  }

  getPublicUrl(path) {
    return { data: { publicUrl: `${this.client.base}/v1/storage/${this.client.project}/${this.bucket}/${path}` } }
  }
}

class CoreAuthClient {
  constructor(client) {
    this.client = client
  }

  async signUp({ email, password, options = {} }) {
    try {
      const session = await this.client.request(`/v1/auth/${this.client.project}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, user_metadata: options.data || {} }),
      })
      this.client.setSession(session, 'SIGNED_IN')

      const metadata = options.data || {}
      const profile = {
        display_name: metadata.display_name || null,
        stage_name: metadata.stage_name || null,
        account_type: metadata.account_type || 'artist',
        updated_at: new Date().toISOString(),
      }
      await this.client.request(`/v1/data/${this.client.project}/profiles/${encodeURIComponent(session.user.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: profile }),
      })

      return { data: { user: session.user, session }, error: null }
    } catch (error) {
      return { data: { user: null, session: null }, error: asError(error) }
    }
  }

  async signInWithPassword({ email, password }) {
    try {
      const session = await this.client.request(`/v1/auth/${this.client.project}/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      this.client.setSession(session, 'SIGNED_IN')
      return { data: { user: session.user, session }, error: null }
    } catch (error) {
      return { data: { user: null, session: null }, error: asError(error) }
    }
  }

  async getSession() {
    return { data: { session: this.client.session }, error: null }
  }

  async getUser() {
    if (!this.client.session) return { data: { user: null }, error: null }
    try {
      const user = await this.client.request(`/v1/auth/${this.client.project}/me`)
      return { data: { user: { ...user, id: user.sub, email: user.email } }, error: null }
    } catch (error) {
      return { data: { user: null }, error: asError(error) }
    }
  }

  async refreshSession() {
    try {
      if (!this.client.session?.refresh_token) throw new Error('No refresh token is available.')
      const refreshed = await this.client.request(`/v1/auth/${this.client.project}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.client.session.refresh_token }),
      })
      const session = { ...refreshed, user: this.client.session.user }
      this.client.setSession(session, 'TOKEN_REFRESHED')
      return { data: { session }, error: null }
    } catch (error) {
      return { data: { session: null }, error: asError(error) }
    }
  }

  async signOut() {
    try {
      if (this.client.session?.refresh_token) {
        await this.client.request(`/v1/auth/${this.client.project}/signout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.client.session.refresh_token }),
        })
      }
      this.client.setSession(null, 'SIGNED_OUT')
      return { error: null }
    } catch (error) {
      this.client.setSession(null, 'SIGNED_OUT')
      return { error: asError(error) }
    }
  }

  onAuthStateChange(callback) {
    this.client.authListeners.add(callback)
    queueMicrotask(() => callback('INITIAL_SESSION', this.client.session))
    return {
      data: {
        subscription: {
          unsubscribe: () => this.client.authListeners.delete(callback),
        },
      },
    }
  }

  async resetPasswordForEmail() {
    return { error: new Error('Password-reset email delivery will be enabled when IZAKHONO Core SMTP is activated.') }
  }

  async updateUser() {
    return { data: { user: null }, error: new Error('Password updates will be enabled when IZAKHONO Core recovery is activated.') }
  }

  async resend() {
    return { error: new Error('Email verification is not required by the current IZAKHONO Core authentication mode.') }
  }
}

export function createIzakhonoCoreClient(baseUrl, project, projectKey) {
  return new IzakhonoCoreClient(baseUrl, project, projectKey)
}

class IzakhonoCoreClient {
  constructor(baseUrl, project, projectKey) {
    this.base = baseUrl.replace(/\/$/, '')
    this.project = project
    this.key = projectKey
    this.authListeners = new Set()
    this.session = null

    if (typeof localStorage !== 'undefined') {
      try {
        this.session = JSON.parse(localStorage.getItem(this.sessionKey()) || 'null')
      } catch {
        this.session = null
      }
    }

    this.auth = new CoreAuthClient(this)
    this.storage = { from: bucket => new CoreBucketClient(this, bucket) }
    this.functions = {
      invoke: async name => ({
        data: null,
        error: new Error(`IZAKHONO Core server function '${name}' is not activated on this deployment yet.`),
      }),
    }
  }

  sessionKey() {
    return `izakhono:${this.base}:${this.project}:session`
  }

  setSession(session, event = 'SIGNED_IN') {
    this.session = session
    if (typeof localStorage !== 'undefined') {
      if (session) localStorage.setItem(this.sessionKey(), JSON.stringify(session))
      else localStorage.removeItem(this.sessionKey())
    }
    this.authListeners.forEach(listener => listener(event, session))
  }

  headers() {
    const headers = { 'X-Project-Key': this.key }
    if (this.session?.access_token) headers.Authorization = `Bearer ${this.session.access_token}`
    return headers
  }

  async request(path, init = {}) {
    const response = await fetch(this.base + path, {
      ...init,
      headers: { ...this.headers(), ...(init.headers || {}) },
    })
    const text = await response.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }
    if (!response.ok) throw new Error(data?.detail || data || response.statusText)
    return data
  }

  from(table) {
    return new CoreQueryBuilder(this, table)
  }

  publicFrom(table) {
    return new CoreQueryBuilder(this, table === 'releases' ? 'published_releases' : table)
  }

  async rpc(name, params = {}) {
    if (name === 'request_payout') {
      return this.from('payout_requests').insert({
        owner_id: this.session?.user?.id,
        amount: params.p_amount,
        destination_label: params.p_destination_label || null,
      })
    }

    if (name === 'submit_release') {
      const id = params.p_release_id
      const { data: release, error } = await this.from('releases').select('*').eq('id', id).maybeSingle()
      if (error) return { data: null, error }
      if (!release || !['draft', 'rejected'].includes(release.status)) {
        return { data: null, error: new Error('Release cannot be submitted in its current state.') }
      }
      const now = new Date().toISOString()
      const updated = await this.from('releases').update({ status: 'submitted', submitted_at: now, updated_at: now, review_note: null }).eq('id', id).single()
      if (updated.error) return updated
      await this.from('release_events').insert({
        release_id: id,
        owner_id: this.session?.user?.id,
        actor_id: this.session?.user?.id,
        event_type: 'submitted',
      })
      return updated
    }

    return {
      data: null,
      error: new Error(`IZAKHONO Core RPC '${name}' requires the protected ALLEGRO server-operations service.`),
    }
  }
}
