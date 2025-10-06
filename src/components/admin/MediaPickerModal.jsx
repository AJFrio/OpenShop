import { useEffect, useMemo, useState } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { adminApiRequest } from '../../lib/auth'
import { normalizeImageUrl } from '../../lib/utils'

export default function MediaPickerModal({ open, onClose, onPick }) {
  const [activeTab, setActiveTab] = useState('library') // 'library' | 'link' | 'generate'
  const [library, setLibrary] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [linkValue, setLinkValue] = useState('')
  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState([])
  const [resultBase64, setResultBase64] = useState('')
  const [resultMime, setResultMime] = useState('image/png')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [driveConnected, setDriveConnected] = useState(false)
  const [genError, setGenError] = useState('')
  const [filename, setFilename] = useState('openshop-image.png')

  useEffect(() => {
    if (!open) return
    setActiveTab('library')
    setError('')
    setLinkValue('')
    loadLibrary()
    checkDriveStatus()
  }, [open])

  async function loadLibrary() {
    try {
      setIsLoading(true)
      setError('')
      const [prodRes, collRes, settingsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/collections'),
        fetch('/api/store-settings')
      ])
      const [products, collections, settings] = await Promise.all([
        prodRes.ok ? prodRes.json() : [],
        collRes.ok ? collRes.json() : [],
        settingsRes.ok ? settingsRes.json() : {}
      ])
      const urls = new Set()

      // Products images and variant images
      for (const p of (products || [])) {
        if (Array.isArray(p.images)) {
          for (const u of p.images) if (u) urls.add(String(u))
        }
        if (Array.isArray(p.variants)) {
          for (const v of p.variants) {
            if (v?.selectorImageUrl) urls.add(String(v.selectorImageUrl))
            if (v?.displayImageUrl) urls.add(String(v.displayImageUrl))
          }
        }
        if (Array.isArray(p.variants2)) {
          for (const v of p.variants2) {
            if (v?.selectorImageUrl) urls.add(String(v.selectorImageUrl))
            if (v?.displayImageUrl) urls.add(String(v.displayImageUrl))
          }
        }
      }

      // Collections hero images
      for (const c of (collections || [])) {
        if (c?.heroImage) urls.add(String(c.heroImage))
      }

      // Store settings images
      if (settings?.logoImageUrl) urls.add(String(settings.logoImageUrl))
      if (settings?.heroImageUrl) urls.add(String(settings.heroImageUrl))

      setLibrary(Array.from(urls))
    } catch (e) {
      setError('Failed to load media library')
    } finally {
      setIsLoading(false)
    }
  }

  function handlePick(url) {
    if (!onPick) return
    onPick(url)
    onClose?.()
  }

  function renderTabs() {
    const TabBtn = ({ id, children }) => (
      <button
        type="button"
        className={`px-3 py-1.5 text-sm rounded border ${activeTab === id ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        onClick={() => setActiveTab(id)}
      >{children}</button>
    )
    return (
      <div className="flex items-center gap-2">
        <TabBtn id="library">Library</TabBtn>
        <TabBtn id="link">Link</TabBtn>
        <TabBtn id="generate">Generate</TabBtn>
      </div>
    )
  }

  function renderLibrary() {
    if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>
    if (error) return <p className="text-sm text-red-600">{error}</p>
    if (!library.length) return <p className="text-sm text-gray-500">No media found yet. Try Link or Generate.</p>
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-80 overflow-auto">
        {library.map((url, i) => (
          <button
            key={i}
            type="button"
            className="aspect-square rounded border overflow-hidden bg-white hover:ring-2 hover:ring-purple-500"
            title={url}
            onClick={() => handlePick(url)}
          >
            <img src={normalizeImageUrl(url)} alt="media" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    )
  }

  function renderLink() {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium">Paste image URL</label>
        <Input value={linkValue} onChange={(e) => setLinkValue(e.target.value)} placeholder="https://…" />
        <div className="flex justify-end">
          <Button type="button" onClick={() => linkValue && handlePick(linkValue)}>Use image URL</Button>
        </div>
      </div>
    )
  }

  async function checkDriveStatus() {
    try {
      const res = await adminApiRequest('/api/admin/drive/status', { method: 'GET' })
      const data = await res.json()
      setDriveConnected(!!data.connected)
    } catch (_) {
      setDriveConnected(false)
    }
  }

  async function handleDriveDisconnect() {
    try {
      const res = await adminApiRequest('/api/admin/drive/disconnect', { method: 'POST' })
      if (res.ok) {
        setDriveConnected(false)
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (e) {
      console.error('Failed to disconnect Google Drive:', e)
    }
  }

  function updateSlotFile(slotIndex, fileOrNull) {
    setFiles(prev => {
      const next = [...prev]
      next[slotIndex] = fileOrNull || null
      let last = -1
      for (let i = 0; i < next.length; i++) if (next[i]) last = i
      return last >= 0 ? next.slice(0, Math.max(last + 1, 4)) : Array(0)
    })
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
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

  async function handleGenerate() {
    setGenError('')
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
      setGenError(String(e.message || e))
    } finally {
      setIsGenerating(false)
    }
  }

  async function uploadToDrive() {
    if (!resultBase64) return
    setIsUploading(true)
    setGenError('')
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
      handlePick(data.viewUrl || data.webViewLink || data.downloadUrl)
    } catch (e) {
      setGenError(String(e.message || e))
    } finally {
      setIsUploading(false)
    }
  }

  function renderSlot(i) {
    const file = files[i] || null
    const has = !!file
    return (
      <label key={i} className="aspect-square border rounded-md flex items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 overflow-hidden">
        <input type="file" accept="image/*" className="hidden" onChange={(e) => updateSlotFile(i, e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
        {has ? (
          <SlotPreview file={file} onClear={() => updateSlotFile(i, null)} />
        ) : (
          <div className="flex flex-col items-center text-gray-500 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            <span className="mt-1">Add</span>
          </div>
        )}
      </label>
    )
  }

  function renderGenerate() {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Prompt</label>
          <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe what to create or edit..." />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Reference images (up to 4)</label>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => renderSlot(i))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={handleGenerate} disabled={isGenerating || !prompt}>
            {isGenerating ? 'Generating…' : 'Generate'}
          </Button>
          {genError && <span className="text-sm text-red-600">{genError}</span>}
        </div>
        {resultBase64 && (
          <div className="mt-2">
            <img src={dataUrlFromState()} alt="generated" className="w-1/2 h-auto rounded border" />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Filename</label>
                <Input value={filename} onChange={(e) => setFilename(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => handlePick(dataUrlFromState())}>Use data URL</Button>
                {driveConnected ? (
                  <div className="flex items-center gap-2">
                    <Button type="button" onClick={uploadToDrive} disabled={isUploading}>{isUploading ? 'Uploading…' : 'Upload to Drive'}</Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleDriveDisconnect}>Disconnect</Button>
                  </div>
                ) : (
                  <Button type="button" onClick={() => window.open('/api/admin/drive/oauth/start', '_blank', 'width=480,height=720')}>Connect Google Drive</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold">Choose an image</h3>
          {renderTabs()}
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          {activeTab === 'library' && renderLibrary()}
          {activeTab === 'link' && renderLink()}
          {activeTab === 'generate' && renderGenerate()}
        </div>
        <div className="p-3 border-t flex justify-end flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
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


