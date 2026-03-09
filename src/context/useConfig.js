import { useState, useEffect } from 'react'

let cachedConfig = null
let fetchPromise = null

export function useConfig() {
  const [config,  setConfig]  = useState(cachedConfig || {})
  const [loading, setLoading] = useState(!cachedConfig)

  useEffect(() => {
    if (cachedConfig) { setConfig(cachedConfig); setLoading(false); return }
    if (!fetchPromise) {
      fetchPromise = fetch('/api/config')
        .then(r => r.json())
        .then(d => { cachedConfig = d.config; return d.config })
        .catch(() => ({}))
    }
    fetchPromise.then(c => { setConfig(c); setLoading(false) })
  }, [])

  // Helper — get array of values for a type
  const opts = (type) => (config[type] || []).filter(i => i.isActive).map(i => i.value)

  return { config, loading, opts }
}

// Call this to bust the cache after settings change
export function clearConfigCache() { cachedConfig = null; fetchPromise = null }
