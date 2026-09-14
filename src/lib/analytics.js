const rawUrl = String(import.meta.env.VITE_IZAKHONO_ANALYTICS_URL || '').trim()

function allowedAnalyticsUrl(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    const loopback = url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)
    if (url.protocol !== 'https:' && !loopback) return ''
    return url.origin
  } catch {
    return ''
  }
}

export function startIzakhonoAnalytics() {
  if (typeof document === 'undefined') return
  const origin = allowedAnalyticsUrl(rawUrl)
  if (!origin) return
  if (document.querySelector('script[data-izakhono-analytics="allegro-vibez"]')) return
  const script = document.createElement('script')
  script.defer = true
  script.dataset.izakhonoAnalytics = 'allegro-vibez'
  script.src = `${origin}/beacon.js?platform=allegro-vibez`
  document.head.appendChild(script)
}
