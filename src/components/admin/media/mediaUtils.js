export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.*)$/)
  if (!match) return { mimeType: 'application/octet-stream', base64: '' }
  return { mimeType: match[1], base64: match[2] }
}

export function buildDataUrl({ mimeType, base64 }) {
  if (!mimeType || !base64) return ''
  return `data:${mimeType};base64,${base64}`
}

export function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const match = String(reader.result).match(/^data:([^;]+);base64,(.*)$/)
      if (match) {
        resolve({ mimeType: match[1], base64: match[2] })
      } else {
        resolve({ mimeType: blob.type || 'image/png', base64: '' })
      }
    }
    reader.readAsDataURL(blob)
  })
}
