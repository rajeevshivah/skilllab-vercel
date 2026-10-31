// The college this web address opens (GET /api/org): its name for every
// screen, and the modules it has bought (a module that is off disappears from
// the menus). Kept in the browser so the first paint already shows the name.
import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api'

const KEY = 'sl_org'
const OFF_BY_DEFAULT = ['placement']
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
const OrgCtx = createContext(null)

export function OrgProvider({ children }) {
  const [org, setOrg] = useState(read)
  useEffect(() => {
    api.get('/org').then(r => {
      setOrg(r.data.org)
      try { localStorage.setItem(KEY, JSON.stringify(r.data.org)) } catch {}
    }).catch(() => {})
  }, [])
  useEffect(() => { document.title = org ? `${org.shortName} ${org.programName}` : 'Pramakra' }, [org])

  const value = {
    org,
    name: org?.name || '',                                   // "SHEAT College of Engineering"
    brand: org ? `${org.shortName} ${org.programName}` : 'Pramakra',   // "SHEAT Skill Lab"
    program: org?.programName || 'Skill Lab',
    // unknown yet → show; modules that start switched off (placement) show only when switched on
    has: (m) => OFF_BY_DEFAULT.includes(m) ? org?.modules?.[m] === true : org?.modules?.[m] !== false,
    suspended: org?.status === 'suspended',
  }
  return <OrgCtx.Provider value={value}>{children}</OrgCtx.Provider>
}
export const useOrg = () => useContext(OrgCtx)
