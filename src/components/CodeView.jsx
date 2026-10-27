// Code with colouring (highlight.js, loaded only when code is shown) and a
// Copy button. Also: the list of languages a student can pick, and the editor
// boxes for pasting several files.
import { useEffect, useRef, useState } from 'react'

export const LANGUAGES = [
  ['javascript', 'JavaScript'], ['jsx', 'React (JSX)'], ['typescript', 'TypeScript'], ['html', 'HTML'], ['css', 'CSS'],
  ['python', 'Python'], ['java', 'Java'], ['c', 'C'], ['cpp', 'C++'], ['csharp', 'C#'], ['php', 'PHP'], ['sql', 'SQL'],
  ['json', 'JSON'], ['kotlin', 'Kotlin'], ['dart', 'Dart'], ['go', 'Go'], ['bash', 'Shell'], ['xml', 'XML'],
  ['yaml', 'YAML'], ['markdown', 'Markdown'], ['text', 'Plain text'],
]
const HL = { jsx: 'javascript', html: 'xml' }   // highlight.js names
// guess the language from the file name
export function guessLanguage(name) {
  const ext = String(name || '').toLowerCase().split('.').pop()
  return ({ js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'typescript', html: 'html', htm: 'html',
    css: 'css', py: 'python', java: 'java', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp', cs: 'csharp', php: 'php', sql: 'sql',
    json: 'json', kt: 'kotlin', dart: 'dart', go: 'go', sh: 'bash', xml: 'xml', yml: 'yaml', yaml: 'yaml', md: 'markdown' })[ext] || null
}

const LANG_LOADERS = {
  javascript: () => import('highlight.js/lib/languages/javascript'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  xml: () => import('highlight.js/lib/languages/xml'),
  css: () => import('highlight.js/lib/languages/css'),
  python: () => import('highlight.js/lib/languages/python'),
  java: () => import('highlight.js/lib/languages/java'),
  c: () => import('highlight.js/lib/languages/c'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  csharp: () => import('highlight.js/lib/languages/csharp'),
  php: () => import('highlight.js/lib/languages/php'),
  sql: () => import('highlight.js/lib/languages/sql'),
  json: () => import('highlight.js/lib/languages/json'),
  kotlin: () => import('highlight.js/lib/languages/kotlin'),
  dart: () => import('highlight.js/lib/languages/dart'),
  go: () => import('highlight.js/lib/languages/go'),
  bash: () => import('highlight.js/lib/languages/bash'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
  markdown: () => import('highlight.js/lib/languages/markdown'),
}
let hljsReady = null
function loadHljs() {
  if (!hljsReady) hljsReady = Promise.all([import('highlight.js/lib/core'), ...Object.entries(LANG_LOADERS).map(([n, f]) => f().then(m => [n, m.default]))])
    .then(([core, ...langs]) => { const h = core.default; langs.forEach(([n, l]) => h.registerLanguage(n, l)); return h })
  return hljsReady
}

export function CodeView({ file, maxHeight = 420 }) {
  const ref = useRef(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    let off = false
    const el = ref.current; if (!el) return
    el.textContent = file.code
    const lang = HL[file.language] || file.language
    if (lang === 'text') return
    loadHljs().then(h => {
      if (off || !el || !h.getLanguage(lang)) return
      el.innerHTML = h.highlight(file.code, { language: lang, ignoreIllegals: true }).value
    }).catch(() => {})
    return () => { off = true }
  }, [file.code, file.language])
  async function copy() {
    try { await navigator.clipboard.writeText(file.code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  const lines = file.code.split('\n').length
  return (
    <div className="code-box">
      <div className="code-head">
        <b className="data">{file.name}</b>
        <span className="muted">{(LANGUAGES.find(l => l[0] === file.language) || [, file.language])[1]} · {lines} line{lines === 1 ? '' : 's'}</span>
        <button type="button" className="btn btn--quiet btn--sm" style={{ marginLeft: 'auto' }} onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
      </div>
      <pre style={{ maxHeight }}><code ref={ref} className="hljs" /></pre>
    </div>
  )
}

// Editor: one box per file (name, language, code). Tab key indents.
export function CodeFilesEditor({ files, onChange, max = 10 }) {
  const set = (i, patch) => onChange(files.map((f, j) => j === i ? { ...f, ...patch } : f))
  function onKey(e, i) {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const t = e.target, s = t.selectionStart, end = t.selectionEnd
    const code = t.value.slice(0, s) + '  ' + t.value.slice(end)
    set(i, { code })
    requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2 })
  }
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {files.map((f, i) => (
        <div key={i} className="code-box">
          <div className="code-head" style={{ flexWrap: 'wrap' }}>
            <input className="ctl data" style={{ height: 32, flex: '1 1 140px', fontSize: 13 }} placeholder="File name, e.g. App.jsx" value={f.name}
              onChange={e => { const name = e.target.value; const g = guessLanguage(name); set(i, { name, ...(g && !f.touched ? { language: g } : {}) }) }} />
            <select className="ctl" style={{ height: 32, width: 'auto', fontSize: 13 }} value={f.language} onChange={e => set(i, { language: e.target.value, touched: true })}>
              {LANGUAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name || 'file'}`}>Remove</button>
          </div>
          <textarea className="code-input" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={f.code}
            onChange={e => set(i, { code: e.target.value })} onKeyDown={e => onKey(e, i)} placeholder="Paste the code of this file here" />
        </div>
      ))}
      {files.length < max && (
        <button type="button" className="btn btn--secondary btn--sm" style={{ justifySelf: 'start' }}
          onClick={() => onChange([...files, { name: '', language: 'javascript', code: '' }])}>+ {files.length ? 'Add another file' : 'Add a code file'}</button>
      )}
    </div>
  )
}
