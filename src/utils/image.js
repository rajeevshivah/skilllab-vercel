// Shrinks a picked photo in the browser before it is uploaded: longest side
// `max` px, JPEG. A 2–5 MB phone photo becomes ~30–60 KB, so pages that show
// photos (Hall of Fame, cycle report) stay fast. Resolves to a data URL.
export function resizeImage(file, max = 480, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('Please choose an image file.')); return }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k))
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)   // transparent PNGs → white, not black
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')) }
    img.src = url
  })
}

// Project screenshots: shrink until the file is under `limitKB` (the server
// refuses more than 300 KB). Resolves to { data (base64), contentType }.
export async function shrinkScreenshot(file, limitKB = 280) {
  for (const [max, q] of [[1280, 0.72], [1100, 0.62], [900, 0.55], [720, 0.5]]) {
    const url = await resizeImage(file, max, q)
    const data = url.split(',')[1]
    if (data.length * 0.75 <= limitKB * 1024) return { data, contentType: 'image/jpeg' }
  }
  throw new Error('That screenshot is too large even after shrinking. Crop it and try again.')
}
