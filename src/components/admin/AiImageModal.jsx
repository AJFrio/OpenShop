import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { adminApiRequest } from '../../lib/auth'
import MediaPickerModal from './MediaPickerModal'

export default function AiImageModal({ open, onClose, onApplyUrl }) {
  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState([])
  const [resultBase64, setResultBase64] = useState('')
  const [resultMime, setResultMime] = useState('image/png')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [driveConnected, setDriveConnected] = useState(false)
  const [error, setError] = useState('')
  const [filename, setFilename] = useState('openshop-image.png')
  const pollRef = useRef(null)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    checkDriveStatus()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [open])

  async function checkDriveStatus() {
    try {
      const res = await adminApiRequest('/api/admin/drive/status', { method: 'GET' })
      const data = await res.json()
      setDriveConnected(!!data.connected)
    } catch (_) {
      setDriveConnected(false)
    }
  }

  function updateSlotFile(slotIndex, fileOrNull) {
    setFiles(prev => {
      const next = [...prev]
      next[slotIndex] = fileOrNull || null
      // trim trailing nulls beyond last non-null
      let last = -1
      for (let i = 0; i < next.length; i++) if (next[i]) last = i
      return last >= 0 ? next.slice(0, Math.max(last + 1, 4)) : Array(0)
    })
  }

  function addFileToFirstEmptySlot(file) {
    const maxSlots = 4
    const current = files.slice(0, maxSlots)
    const index = current.findIndex(f => !f)
    if (index === -1) return
    updateSlotFile(index, file)
  }

  async function urlToFile(url) {
    const res = await fetch(url)
    const blob = await res.blob()
    const contentType = blob.type || 'application/octet-stream'
    const ext = (contentType.split('/')[1] || 'bin').split(';')[0]
    const safeName = `library-image.${ext}`
    return new File([blob], safeName, { type: contentType })
  }

  async function handlePickFromLibrary(url) {
    try {
      if (files.filter(Boolean).length >= 4) {
        setError('You can add up to 4 reference images')
        return
      }
      const file = await urlToFile(url)
      addFileToFirstEmptySlot(file)
    } catch (e) {
      setError('Failed to add image from library')
    } finally {
      setMediaPickerOpen(false)
    }
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleGenerate() {
    setError('')
    setIsGenerating(true)
    setResultBase64('')
    try {
      const inputs = []
      for (const f of files.slice(0, 4)) {
        if (!f) continue
        const dataUrl = await fileToDataUrl(f)
        const { mimeType, base64 } = parseDataUrl(dataUrl)
        inputs.push({ mimeType, dataBase64: base64 })
      }
      const res = await adminApiRequest('/api/admin/ai/generate-image', {
        method: 'POST',
        body: JSON.stringify({ prompt, inputs })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Generation failed')
      }
      const data = await res.json()
      setResultBase64(data.dataBase64)
      setResultMime(data.mimeType || 'image/png')
      const ext = (data.mimeType || 'image/png').split('/')[1] || 'png'
      setFilename(`openshop-image.${ext}`)
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setIsGenerating(false)
    }
  }

  function parseDataUrl(dataUrl) {
    const match = String(dataUrl).match(/^data:([^;]+);base64,(.*)$/)
    if (!match) return { mimeType: 'application/octet-stream', base64: '' }
    return { mimeType: match[1], base64: match[2] }
  }

  function dataUrlFromState() {
    if (!resultBase64) return ''
    return `data:${resultMime};base64,${resultBase64}`
  }

  function openDriveAuth() {
    const w = window.open('/api/admin/drive/oauth/start', '_blank', 'width=480,height=720')
    if (!w) return
    let count = 0
    pollRef.current = setInterval(async () => {
      count += 1
      await checkDriveStatus()
      try {
        if (w.closed) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      } catch (_) {}
      if (driveConnected || count > 30) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }, 2000)
  }

  async function uploadToDrive() {
    if (!resultBase64) return
    setIsUploading(true)
    setError('')
    try {
      const res = await adminApiRequest('/api/admin/drive/upload', {
        method: 'POST',
        body: JSON.stringify({
          mimeType: resultMime,
          dataBase64: resultBase64,
          filename: filename || 'openshop-image.png'
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      if (onApplyUrl) onApplyUrl(data.viewUrl || data.webViewLink || data.downloadUrl)
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setIsUploading(false)
    }
  }

  function handleApplyBase64() {
    if (!resultBase64) return
    if (onApplyUrl) onApplyUrl(dataUrlFromState())
  }

  function handleAddFromComputerClick() {
    if (files.filter(Boolean).length >= 4) return
    fileInputRef.current?.click()
  }

  function handleComputerFilesSelected(e) {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return
    const remaining = 4 - files.filter(Boolean).length
    const toAdd = selected.slice(0, Math.max(0, remaining))
    for (const f of toAdd) addFileToFirstEmptySlot(f)
    e.target.value = ''
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold">Generate image with Gemini</h3>
          <p className="text-xs text-gray-500 mt-1">Uses Google's image generation API. Images you upload must be yours.</p>
        </div>
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium mb-1">Prompt</label>
            <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe what to create or edit..." />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Reference images (up to 4)</label>
            <div className="flex items-center gap-2 mb-3">
              <Button type="button" variant="outline" onClick={() => setMediaPickerOpen(true)} disabled={files.filter(Boolean).length >= 4}>Add from media library</Button>
              <Button type="button" onClick={handleAddFromComputerClick} disabled={files.filter(Boolean).length >= 4}>Add from computer</Button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleComputerFilesSelected} />
            </div>
            {files.filter(Boolean).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => f && (
                  <div key={i} className="w-16 h-16 rounded border overflow-hidden bg-white">
                    <SlotPreview file={f} onClear={() => updateSlotFile(i, null)} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No reference images added yet.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" onClick={handleGenerate} disabled={isGenerating || !prompt}>
              {isGenerating ? 'Generating…' : 'Generate'}
            </Button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>

          {resultBase64 && (
            <div className="mt-2">
              <img src={dataUrlFromState()} alt="generated" className="w-1/2 h-auto rounded border mx-auto" />
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
                <div>
                  <label className="block text-sm font-medium mb-1">Filename</label>
                  <Input value={filename} onChange={(e) => setFilename(e.target.value)} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={handleApplyBase64}>Use data URL</Button>
                  {driveConnected ? (
                    <Button type="button" onClick={uploadToDrive} disabled={isUploading}>{isUploading ? 'Uploading…' : 'Upload to Drive'}</Button>
                  ) : (
                    <Button type="button" onClick={openDriveAuth}>Connect Google Drive</Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end gap-2 flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onPick={(url) => handlePickFromLibrary(url)}
      />
    </div>
  )
}

function SlotPreview({ file, onClear }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  return (
    <div className="relative w-full h-full">
      <img src={src} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
      <button type="button" onClick={(e) => { e.preventDefault(); onClear?.() }} className="absolute top-1 right-1 bg-white/80 hover:bg-white text-gray-700 rounded px-2 py-0.5 text-xs border">Clear</button>
    </div>
  )
}


