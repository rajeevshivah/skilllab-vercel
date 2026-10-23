import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api'

const SemCtx = createContext(null)

export function SemesterProvider({ children }) {
  // The list is kept in this browser too, so pages that need the semester can start
  // loading at once; the fresh list replaces it a moment later.
  const cached = (() => { try { return JSON.parse(localStorage.getItem('sl_semesters') || 'null') } catch { return null } })()
  const [semesters, setSemesters] = useState(cached || [])
  const [selected, setSelected]   = useState(() => (cached || []).find(s => s.status === 'active') || (cached || [])[0] || null) // selected semester object
  const [loading, setLoading]     = useState(!cached)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/semesters')
      setSemesters(data.semesters)
      try { localStorage.setItem('sl_semesters', JSON.stringify(data.semesters)) } catch { /* storage blocked */ }
      // default selection: the active one, else the newest
      setSelected(prev => {
        if (prev) {
          const still = data.semesters.find(s => s._id === prev._id)
          // keep the choice — unless it was the active semester and no longer is (a new one started)
          if (still && !(prev.status === 'active' && still.status !== 'active'))
            return (still.name === prev.name && still.status === prev.status) ? prev : still
        }
        return data.semesters.find(s => s.status === 'active') || data.semesters[0] || null
      })
    } catch { /* public read may fail if server down */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <SemCtx.Provider value={{ semesters, selected, setSelected, refresh, loading }}>
      {children}
    </SemCtx.Provider>
  )
}

export const useSemester = () => useContext(SemCtx)
