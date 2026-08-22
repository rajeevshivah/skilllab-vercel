import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api'

const SemCtx = createContext(null)

export function SemesterProvider({ children }) {
  const [semesters, setSemesters] = useState([])
  const [selected, setSelected]   = useState(null) // selected semester object
  const [loading, setLoading]     = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/semesters')
      setSemesters(data.semesters)
      // default selection: the active one, else the newest
      setSelected(prev => {
        if (prev) {
          const still = data.semesters.find(s => s._id === prev._id)
          if (still) return still
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
