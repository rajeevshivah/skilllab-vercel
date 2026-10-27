import { useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'

// "Connect AI" — lets any signed-in user create a personal MCP token so an AI
// app (Claude Code, Claude Desktop, Cursor, VS Code…) can read Skill Lab data
// AS THEM. Trainers' AI sees only their own batches; superadmin's sees all.
// Round 1 tools are read-only.

const EXPIRY = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
  { value: 0, label: 'Never' },
]

const CLIENTS = [
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'claude-desktop', label: 'Claude Desktop' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'vscode', label: 'VS Code' },
  { id: 'chatgpt', label: 'ChatGPT / claude.ai' },
]

function snippet(client, url, token) {
  const t = token || '<YOUR_TOKEN>'
  switch (client) {
    case 'claude-code':
      return {
        where: 'Run this once in a terminal:',
        code: `claude mcp add --transport http skilllab ${url} --header "Authorization: Bearer ${t}"`,
      }
    case 'claude-desktop':
      return {
        where: 'Claude Desktop → Settings → Developer → Edit Config, then add this inside claude_desktop_config.json and restart Claude (needs Node.js installed):',
        code: JSON.stringify({
          mcpServers: {
            skilllab: {
              command: 'npx',
              args: ['-y', 'mcp-remote', url, '--header', 'Authorization:${AUTH_HEADER}'],
              env: { AUTH_HEADER: `Bearer ${t}` },
            },
          },
        }, null, 2),
      }
    case 'cursor':
      return {
        where: 'Add to ~/.cursor/mcp.json (or Cursor → Settings → MCP → Add):',
        code: JSON.stringify({ mcpServers: { skilllab: { url, headers: { Authorization: `Bearer ${t}` } } } }, null, 2),
      }
    case 'vscode':
      return {
        where: 'Add to .vscode/mcp.json in any project (Copilot agent mode):',
        code: JSON.stringify({ servers: { skilllab: { type: 'http', url, headers: { Authorization: `Bearer ${t}` } } } }, null, 2),
      }
    default:
      return {
        where: 'One-click connectors in ChatGPT and claude.ai need a "Sign in with Skill Lab" (OAuth) login, which is the next step of this feature. Until then, use one of the apps in the other tabs.',
        code: null,
      }
  }
}

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

async function copy(text, setCopied, key) {
  try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1800) }
  catch { window.prompt('Copy this:', text) }
}

export default function ConnectAIPage() {
  const { program } = useOrg()
  const { user } = useAuth()
  const [tokens, setTokens]   = useState([])
  const [mcpUrl, setMcpUrl]   = useState('')
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [banner, setBanner]   = useState(null)
  const [name, setName]       = useState('')
  const [expiry, setExpiry]   = useState(90)
  const [busy, setBusy]       = useState(false)
  const [fresh, setFresh]     = useState(null)   // the just-created plain token (shown once)
  const [client, setClient]   = useState('claude-code')
  const [copied, setCopied]   = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [onlySaved, setOnlySaved] = useState(false)

  useEffect(() => { load() }, [onlySaved])
  async function load() {
    setLoading(prev => prev && !tokens.length)
    try {
      const [t, a] = await Promise.all([api.get('/tokens'), api.get('/tokens/activity', { params: onlySaved ? { kind: 'write', limit: 100 } : { limit: 100 } })])
      setTokens(t.data.tokens || []); setMcpUrl(t.data.mcpUrl || ''); setActivity(a.data.activity || [])
    } catch (e) { setBanner({ type: 'error', msg: e.response?.data?.message || 'Could not load tokens' }) }
    finally { setLoading(false) }
  }

  async function create(e) {
    e.preventDefault()
    if (!name.trim()) return setBanner({ type: 'error', msg: 'Give the token a name, e.g. "Claude on my laptop".' })
    setBusy(true); setBanner(null)
    try {
      const { data } = await api.post('/tokens', { name: name.trim(), expiresInDays: expiry })
      setFresh({ token: data.token, name: data.record.name })
      setMcpUrl(data.mcpUrl || mcpUrl)
      setName('')
      load()
    } catch (e) { setBanner({ type: 'error', msg: e.response?.data?.message || 'Could not create token' }) }
    finally { setBusy(false) }
  }

  async function revoke(id) {
    try {
      await api.delete(`/tokens/${id}`)
      setConfirmId(null)
      setBanner({ type: 'success', msg: 'Token revoked. Any AI app using it is disconnected now.' })
      load()
    } catch (e) { setBanner({ type: 'error', msg: e.response?.data?.message || 'Could not revoke' }) }
  }

  const isAdmin = user?.role === 'superadmin'
  const snip = snippet(client, mcpUrl || 'https://<your-backend>/mcp', fresh?.token)

  if (loading) return <div className="page" style={{ color: 'var(--ink-soft)' }}>Loading…</div>

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <h1 className="page-title">Connect AI</h1>
      <p className="muted" style={{ fontSize: 14, marginTop: 4, marginBottom: 22, maxWidth: '68ch', lineHeight: 1.6 }}>
        Let an AI app such as Claude or Cursor answer questions from {program} data, e.g. "who was not evaluated in MERN Cycle 2?"
        or "which BTech 3rd students are below 50% attendance?". The AI acts as <b>you</b>:{' '}
        {isAdmin ? 'as superadmin it can see every batch.' : 'it sees only the batches you are assigned to.'}{' '}
        It can also <b>fill the cycle report, marks, Top 3, daily logs and the cycle plan</b>, but it always shows you a
        preview first and saves only after you say yes. It cannot delete anything.
      </p>

      {banner && <div className={`banner banner--${banner.type}`}>{banner.msg}</div>}

      {/* Step 1: create */}
      <section className="sheet" style={{ padding: 20, marginBottom: 18 }}>
        <h2 className="section-title" style={{ marginBottom: 12 }}>1. Create a token</h2>
        <form onSubmit={create} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: '1 1 240px' }}>
            <label htmlFor="tok-name">Name</label>
            <input id="tok-name" type="text" maxLength={60} placeholder="Claude on my laptop" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="field" style={{ flex: '0 0 140px', marginTop: 0 }}>
            <label htmlFor="tok-exp">Expires</label>
            <select id="tok-exp" value={expiry} onChange={e => setExpiry(Number(e.target.value))}>
              {EXPIRY.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create token'}</button>
        </form>

        {fresh && (
          <div className="banner banner--pencil" style={{ marginTop: 16, marginBottom: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Copy "{fresh.name}" now. It will not be shown again.</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <code style={{ fontFamily: 'var(--font-data)', fontSize: 13, background: 'var(--sheet)', padding: '6px 10px', borderRadius: 6, wordBreak: 'break-all', flex: '1 1 300px', color: 'var(--ink)' }}>{fresh.token}</code>
              <button className="btn btn--secondary btn--sm" type="button" onClick={() => copy(fresh.token, setCopied, 'tok')}>{copied === 'tok' ? 'Copied' : 'Copy'}</button>
            </div>
            <div style={{ marginTop: 8, fontSize: 13 }}>Treat it like a password: don't share it in WhatsApp groups. If it leaks, revoke it below.</div>
          </div>
        )}
      </section>

      {/* Step 2: connect */}
      <section className="sheet" style={{ padding: 20, marginBottom: 18 }}>
        <h2 className="section-title" style={{ marginBottom: 6 }}>2. Add it to your AI app</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <span className="muted" style={{ fontSize: 13 }}>Server URL</span>
          <code style={{ fontFamily: 'var(--font-data)', fontSize: 13, color: 'var(--ink)' }}>{mcpUrl}</code>
          <button className="btn btn--quiet" type="button" onClick={() => copy(mcpUrl, setCopied, 'url')}>{copied === 'url' ? 'Copied' : 'Copy'}</button>
        </div>
        <div className="tabs" role="tablist" style={{ marginBottom: 14 }}>
          {CLIENTS.map(c => (
            <button key={c.id} type="button" role="tab" aria-selected={client === c.id}
              className={client === c.id ? 'is-active' : ''} onClick={() => setClient(c.id)}>{c.label}</button>
          ))}
        </div>
        <p style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 10, lineHeight: 1.55 }}>{snip.where}</p>
        {snip.code && (
          <div style={{ position: 'relative' }}>
            <pre style={{ fontFamily: 'var(--font-data)', fontSize: 12.5, background: 'var(--page)', border: '1px solid var(--rule)', borderRadius: 8, padding: '12px 76px 12px 14px', overflowX: 'auto', whiteSpace: 'pre', color: 'var(--ink)', margin: 0 }}>{snip.code}</pre>
            <button className="btn btn--secondary btn--sm" type="button" style={{ position: 'absolute', top: 8, right: 8 }}
              onClick={() => copy(snip.code, setCopied, 'snip')}>{copied === 'snip' ? 'Copied' : 'Copy'}</button>
          </div>
        )}
        {snip.code && !fresh && <p className="field-hint">Replace &lt;YOUR_TOKEN&gt; with your token. If you create a token now, it is filled in for you.</p>}
        <p className="field-hint" style={{ marginTop: 12 }}>
          Then ask things like: "Show me today's overview", "Who is below 50% attendance in MERN?", or
          "Fill the Cycle 2 report for Full Stack: behind schedule, lab internet was down twice". For changes, the AI shows a preview and waits for your yes.
        </p>
      </section>

      {/* Tokens list */}
      <section style={{ marginBottom: 26 }}>
        <h2 className="section-title" style={{ marginBottom: 10 }}>Your tokens</h2>
        {tokens.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>No tokens yet.</p>
        ) : (
          <div className="table-wrap sheet">
            <table className="table table--compact table--stack">
              <thead><tr><th>Name</th><th>Token</th><th>Created</th><th>Last used</th><th>Expires</th><th></th></tr></thead>
              <tbody>
                {tokens.map(t => (
                  <tr key={t._id}>
                    <td data-label="Name" style={{ fontWeight: 700 }}>{t.name}</td>
                    <td data-label="Token" className="data">{t.prefix}…</td>
                    <td data-label="Created">{fmt(t.createdAt)}</td>
                    <td data-label="Last used">{t.lastUsedAt ? fmt(t.lastUsedAt) : <span className="muted">Never</span>}</td>
                    <td data-label="Expires">{t.expired ? <span className="tag tag--red">Expired</span> : t.expiresAt ? fmt(t.expiresAt) : 'Never'}</td>
                    <td data-label="">
                      {confirmId === t._id ? (
                        <span style={{ display: 'inline-flex', gap: 6 }}>
                          <button className="btn btn--sm btn--danger--confirm" type="button" onClick={() => revoke(t._id)}>Yes, revoke</button>
                          <button className="btn btn--sm btn--secondary" type="button" onClick={() => setConfirmId(null)}>Cancel</button>
                        </span>
                      ) : (
                        <button className="btn btn--sm btn--danger" type="button" onClick={() => setConfirmId(t._id)}>Revoke</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Activity */}
      <section>
        <h2 className="section-title" style={{ marginBottom: 4 }}>AI activity</h2>
        <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
          {isAdmin ? 'Every tool call any AI app made, for all users.' : 'Every tool call your AI apps made.'} Kept for 180 days.
          {' '}<b>Saved</b> = data was changed. <b>Preview</b> = a change was only shown, not saved.
        </p>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={onlySaved} onChange={e => setOnlySaved(e.target.checked)} />
          Show only saved changes
        </label>
        {activity.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>Nothing yet.</p>
        ) : (
          <div className="table-wrap sheet">
            <table className="table table--compact table--stack">
              <thead><tr><th>When</th>{isAdmin && <th>User</th>}<th>App</th><th>Tool</th><th>Details</th><th>Result</th></tr></thead>
              <tbody>
                {activity.map(a => (
                  <tr key={a._id}>
                    <td data-label="When">{fmt(a.at)}</td>
                    {isAdmin && <td data-label="User">{a.user}</td>}
                    <td data-label="App" className="muted">{a.tokenName || '—'}</td>
                    <td data-label="Tool" className="data">{a.tool}</td>
                    <td data-label="Details" className="data muted" title={a.args} style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{a.args === '{}' ? '' : a.args}</td>
                    <td data-label="Result">
                      {!a.ok ? <span className="tag tag--red" title={a.error}>Refused</span>
                        : a.kind === 'write' ? <span className="tag tag--blue">Saved</span>
                        : a.kind === 'preview' ? <span className="tag tag--pencil">Preview</span>
                        : <span className="tag tag--tick">Read</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
