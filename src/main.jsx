import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { supabase } from './lib/supabaseClient'
import './styles/app.css'
import './styles/landing-upgrade.css'
import './styles/artist-magnet.css'
import './styles/home-live.css'
import './styles/platform-experience.css'
import './styles/auth-experience.css'
import './styles/publishing-fixes.css'
import './homeArtistExperience.js'
import './platformExperience.js'
import './authExperience.js'

const basePath = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '')

function appUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${window.location.origin}${basePath}${normalized}`
}

function normalizeRedirect(url) {
  if (!url || !basePath) return url
  try {
    const parsed = new URL(url, window.location.origin)
    if (parsed.origin !== window.location.origin) return url
    if (parsed.pathname === basePath || parsed.pathname.startsWith(`${basePath}/`)) return parsed.toString()
    parsed.pathname = `${basePath}${parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`}`
    return parsed.toString()
  } catch {
    return url
  }
}

if (basePath) {
  const base = document.createElement('base')
  base.href = `${window.location.origin}${import.meta.env.BASE_URL}`
  document.head.prepend(base)

  const params = new URLSearchParams(window.location.search)
  const restoredPath = params.get('__spa')
  if (restoredPath) {
    params.delete('__spa')
    const query = params.toString()
    const destination = `${basePath}${restoredPath.startsWith('/') ? restoredPath : `/${restoredPath}`}${query ? `?${query}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', destination)
  }

  if (supabase?.auth) {
    if (typeof supabase.auth.resetPasswordForEmail === 'function') {
      const originalReset = supabase.auth.resetPasswordForEmail.bind(supabase.auth)
      supabase.auth.resetPasswordForEmail = (email, options = {}) => originalReset(email, {
        ...options,
        redirectTo: normalizeRedirect(options.redirectTo),
      })
    }

    if (typeof supabase.auth.signUp === 'function') {
      const originalSignUp = supabase.auth.signUp.bind(supabase.auth)
      supabase.auth.signUp = credentials => {
        const next = credentials?.options?.emailRedirectTo
          ? {
              ...credentials,
              options: {
                ...credentials.options,
                emailRedirectTo: normalizeRedirect(credentials.options.emailRedirectTo),
              },
            }
          : credentials
        return originalSignUp(next)
      }
    }

    if (typeof supabase.auth.resend === 'function') {
      const originalResend = supabase.auth.resend.bind(supabase.auth)
      supabase.auth.resend = payload => {
        const next = payload?.options?.emailRedirectTo
          ? {
              ...payload,
              options: {
                ...payload.options,
                emailRedirectTo: normalizeRedirect(payload.options.emailRedirectTo),
              },
            }
          : payload
        return originalResend(next)
      }
    }
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('button.text-button') : null
    if (!target || target.textContent?.trim() !== 'Log out') return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    Promise.resolve(supabase?.auth?.signOut?.()).finally(() => window.location.assign(appUrl('/')))
  }, true)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basePath || undefined}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
