// Files in the browser: read a picked file as a data URL (for upload), and
// download / open something the API sends (it needs the sign-in header, so a
// plain <a href> would not work).
export const MAX_DOC = 2 * 1024 * 1024

export function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Pick a file'))
    if (file.size > MAX_DOC) return reject(new Error('The file is too big — keep it under 2 MB.'))
    if (!/^(application\/pdf|image\/(jpeg|png))$/.test(file.type)) return reject(new Error('Only PDF, JPG or PNG files.'))
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(new Error('Could not read the file'))
    r.readAsDataURL(file)
  })
}

// GET a file through an axios client and save it (download) or open it (view)
export async function fetchFile(client, url, { filename, open } = {}) {
  const res = await client.get(url, { responseType: 'blob' })
  const blob = res.data
  const href = URL.createObjectURL(blob)
  if (open) { window.open(href, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(href), 60000); return }
  const name = filename || (res.headers['content-disposition'] || '').match(/filename="([^"]+)"/)?.[1] || 'download'
  const a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 10000)
}

// paste from Excel (tab-separated) or a CSV → rows of cells
export function parseTable(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').filter(l => l.trim())
  if (!lines.length) return []
  const sep = lines[0].includes('\t') ? '\t' : ','
  return lines.map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, '')))
}
