import { useEffect, useState, useRef } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { adminApiRequest } from '../../lib/auth'
import { normalizeImageUrl } from '../../lib/utils'

export default function AddMediaModal({ open, onClose, onCreated }) {
  const [activeTab, setActiveTab] = useState('upload') // upload | link | generate
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // upload (multi)
  const [files, setFiles] = useState([]) // File[]
  const [uploading, setUploading] = useState(false)
  const [previews, setPreviews] = useState([]) // { url, name, size }[]
  const inputIdRef = useRef('file-' + Math.random().toString(36).slice(2))
  const fileInputRef = useRef(null)

  // link
  const [url, setUrl] = useState('')

  // generate
  const [prompt, setPrompt] = useState('')
  const [resultBase64, setResultBase64] = useState('')
  const [resultMime, setResultMime] = useState('image/png')
  const [isGenerating, setIsGenerating] = useState(false)
  const [filename, setFilename] = useState('openshop-image.png')

  // generate: reference images from media library (up to 3)
  const [refUrls, setRefUrls] = useState([]) // string[]
  const [isPickingRefs, setIsPickingRefs] = useState(false)
  const [library, setLibrary] = useState([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [pickSelected, setPickSelected] = useState(new Set())

  useEffect(() => {
    if (!open) return
    setActiveTab('upload')
    setError('')
    setUrl('')
    setFiles([])
    setPrompt('')
    setResultBase64('')
  }, [open])

  useEffect(() => {
    // Rebuild previews when files change
    // Revoke prior object URLs
    for (const p of previews) {
      try { URL.revokeObjectURL(p.url) } catch (_) {}
    }
    const next = files.map(f => ({ url: URL.createObjectURL(f), name: f.name, size: f.size }))
    setPreviews(next)
    return () => {
      for (const p of next) { try { URL.revokeObjectURL(p.url) } catch (_) {} }
    }
  }, [files])

  async function uploadFileAndRecord() {
    if (!files.length) return
    setUploading(true)
    setError('')
    try {
      const createdItems = []
      for (const f of files) {
        const dataUrl = await fileToDataUrl(f)
        const { mimeType, base64 } = parseDataUrl(dataUrl)
        const uploadRes = await adminApiRequest('/api/admin/storage/upload', {
          method: 'POST',
          body: JSON.stringify({ mimeType, dataBase64: base64, filename: f.name || 'image.png' })
        })
        const uploaded = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploaded.error || 'Upload failed')
        // Save to media library
        const mediaRes = await adminApiRequest('/api/admin/media', {
          method: 'POST',
          body: JSON.stringify({
            url: uploaded.viewUrl || uploaded.downloadUrl,
            source: 'storage',
            filename: f.name || 'image',
            mimeType: mimeType,
          })
        })
        const saved = await mediaRes.json()
        if (!mediaRes.ok) throw new Error(saved.error || 'Failed to save media')
        createdItems.push(saved)
      }
      onCreated?.(createdItems)
      onClose?.()
    } catch (e) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function onPickFile(e) {
    const picked = Array.from(e.target && e.target.files ? e.target.files : [])
    if (picked.length > 0) setFiles(picked)
  }

  function onDropFile(e) {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : [])
    const images = dropped.filter(f => String(f.type || '').startsWith('image/'))
    if (images.length > 0) setFiles(images)
  }

  function handlePaste(e) {
    try {
      const items = (e.clipboardData && e.clipboardData.items) ? Array.from(e.clipboardData.items) : []
      const images = []
      for (const it of items) {
        if (it && String(it.type || '').startsWith('image/')) {
          const f = it.getAsFile && it.getAsFile()
          if (f) images.push(f)
        }
      }
      if (images.length > 0) {
        e.preventDefault()
        setFiles(prev => prev.concat(images))
      }
    } catch (_) {}
  }

  function preventDragDefaults(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  async function saveLink() {
    if (!url) return
    setIsLoading(true)
    setError('')
    try {
      const res = await adminApiRequest('/api/admin/media', {
        method: 'POST',
        body: JSON.stringify({ url, source: 'link' })
      })
      const saved = await res.json()
      if (!res.ok) throw new Error(saved.error || 'Failed to save link')
      onCreated?.([saved])
      onClose?.()
    } catch (e) {
      setError(e.message || 'Failed to save link')
    } finally {
      setIsLoading(false)
    }
  }

  async function generateImage() {
    if (!prompt) return
    setIsGenerating(true)
    setResultBase64('')
    setError('')
    try {
      // Build inputs from selected reference images (up to 3)
      const inputs = []
      for (const url of refUrls.slice(0, 3)) {
        try {
          const proxied = `/api/image-proxy?src=${encodeURIComponent(url)}`
          const resp = await fetch(proxied)
          if (!resp.ok) continue
          const blob = await resp.blob()
          const { mimeType, base64 } = await blobToBase64(blob)
          if (base64) inputs.push({ mimeType, dataBase64: base64 })
        } catch (_) {}
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
      setError(e.message || 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  async function saveGeneratedAndRecord() {
    if (!resultBase64) return
    setIsLoading(true)
    try {
      const uploadRes = await adminApiRequest('/api/admin/storage/upload', {
        method: 'POST',
        body: JSON.stringify({ mimeType: resultMime, dataBase64: resultBase64, filename })
      })
      const uploaded = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploaded.error || 'Upload failed')
      const mediaRes = await adminApiRequest('/api/admin/media', {
        method: 'POST',
        body: JSON.stringify({
          url: uploaded.viewUrl || uploaded.downloadUrl,
          source: 'storage',
          filename: filename,
          mimeType: resultMime,
        })
      })
      const saved = await mediaRes.json()
      if (!mediaRes.ok) throw new Error(saved.error || 'Failed to save media')
      onCreated?.([saved])
      onClose?.()
    } catch (e) {
      setError(e.message || 'Upload failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Helpers for reference images selection
  async function openRefPicker() {
    setIsPickingRefs(true)
    setPickSelected(new Set(refUrls))
    if (library.length === 0) {
      try {
        setLibraryLoading(true)
        const res = await adminApiRequest('/api/admin/media', { method: 'GET' })
        const items = await res.json().catch(() => [])
        const urls = Array.isArray(items) ? items.map(i => i.url).filter(Boolean) : []
        setLibrary(urls)
      } catch (_) {
        // ignore
      } finally {
        setLibraryLoading(false)
      }
    }
  }

  function togglePick(url) {
    setPickSelected(prev => {
      const next = new Set(prev)
      if (next.has(url)) {
        next.delete(url)
      } else {
        next.add(url)
      }
      // Enforce max 3
      if (next.size > 3) {
        // Remove oldest by converting to array and slicing
        const arr = Array.from(next)
        next.clear()
        for (const u of arr.slice(arr.length - 3)) next.add(u)
      }
      return next
    })
  }

  function applyPickedRefs() {
    setRefUrls(Array.from(pickSelected).slice(0, 3))
    setIsPickingRefs(false)
  }

  function removeRef(url) {
    setRefUrls(prev => prev.filter(u => u !== url))
  }

  function blobToBase64(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const m = String(reader.result).match(/^data:([^;]+);base64,(.*)$/)
        if (m) resolve({ mimeType: m[1], base64: m[2] })
        else resolve({ mimeType: blob.type || 'image/png', base64: '' })
      }
      reader.readAsDataURL(blob)
    })
  }

  function dataUrlFromState() {
    if (!resultBase64) return ''
    return `data:${resultMime};base64,${resultBase64}`
  }

  async function fileToDataUrl(f) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(f)
    })
  }

  function parseDataUrl(dataUrl) {
    const match = String(dataUrl).match(/^data:([^;]+);base64,(.*)$/)
    if (!match) return { mimeType: 'application/octet-stream', base64: '' }
    return { mimeType: match[1], base64: match[2] }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold">Add media</h3>
          <div className="flex items-center gap-2">
            {['upload', 'link', 'generate'].map(tab => (
              <button
                key={tab}
                type="button"
                className={`px-3 py-1.5 text-sm rounded border ${activeTab === tab ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setActiveTab(tab)}
              >{(tab[0].toUpperCase() + tab.slice(1))}</button>
            ))}
          </div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div
                className={`border-2 border-dashed rounded-md p-6 text-center ${files.length ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'} cursor-pointer`}
                onDragEnter={preventDragDefaults}
                onDragOver={preventDragDefaults}
                onDrop={onDropFile}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                onPaste={handlePaste}
              >
                <input id={inputIdRef.current} ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickFile} />
                <label htmlFor={inputIdRef.current} className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  <span>{files.length ? 'Change images' : 'Click to choose images'}</span>
                </label>
                <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF up to ~10MB each. Or drag & drop here.</p>
                <p className="text-xs text-gray-500">You can also paste images from your clipboard here.</p>
              </div>
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {previews.map((p, i) => (
                      <div key={i} className="relative">
                        <img src={p.url} alt="preview" className="w-full h-20 object-cover rounded border" />
                        <button type="button" className="absolute top-1 right-1 bg-white/80 hover:bg-white text-gray-700 rounded px-1 text-xs border" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>Remove</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <span className="truncate">{files.length} {files.length === 1 ? 'file' : 'files'} selected</span>
                    <button type="button" className="ml-auto underline" onClick={() => setFiles([])}>Clear all</button>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
              <div className="flex gap-2 ml-auto">
                <Button type="button" onClick={uploadFileAndRecord} disabled={!files.length || uploading}>{uploading ? `Uploading…` : `Upload ${files.length > 1 ? files.length + ' images' : 'image'}`}</Button>
              </div>
            </div>
            </div>
          )}
          {activeTab === 'link' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Paste image URL</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
              <div className="flex justify-end">
                <Button type="button" onClick={saveLink} disabled={!url || isLoading}>{isLoading ? 'Saving…' : 'Save'}</Button>
              </div>
            </div>
          )}
          {activeTab === 'generate' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Prompt</label>
                <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe what to create…" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Reference images (optional, up to 3)</label>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={openRefPicker}>Add from Library</Button>
                  </div>
                </div>
                {refUrls.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {refUrls.map((u, i) => (
                      <div key={i} className="relative">
                        <img src={normalizeImageUrl(u)} alt="ref" className="w-20 h-20 object-cover rounded border" />
                        <button type="button" className="absolute top-1 right-1 bg-white/80 hover:bg-white text-gray-700 rounded px-1 text-xs border" onClick={() => removeRef(u)}>Remove</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No reference images selected.</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" onClick={generateImage} disabled={isGenerating || !prompt}>{isGenerating ? 'Generating…' : 'Generate'}</Button>
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
                      <Button type="button" onClick={saveGeneratedAndRecord} disabled={isLoading}>{isLoading ? 'Uploading…' : 'Save to Media'}</Button>
                    </div>
                  </div>
                </div>
              )}

              {isPickingRefs && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setIsPickingRefs(false)}>
                  <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-base font-semibold">Select reference images</h4>
                      <button className="text-sm underline" onClick={() => setIsPickingRefs(false)}>Close</button>
                    </div>
                    {libraryLoading ? (
                      <p className="text-sm text-gray-500">Loading…</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-80 overflow-auto">
                        {library.map((u, i) => {
                          const selected = pickSelected.has(u)
                          return (
                            <button
                              key={i}
                              type="button"
                              className={`relative aspect-square rounded border overflow-hidden ${selected ? 'ring-2 ring-gray-500' : 'hover:ring-2 hover:ring-gray-300'}`}
                              onClick={() => togglePick(u)}
                            >
                              <img src={normalizeImageUrl(u)} alt="library" className="w-full h-full object-cover" />
                              {selected && <span className="absolute top-1 left-1 bg-gray-600 text-white text-[10px] px-1 rounded">Selected</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <div className="text-gray-600">{pickSelected.size}/3 selected</div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setPickSelected(new Set())}>Clear</Button>
                        <Button type="button" onClick={applyPickedRefs} disabled={pickSelected.size === 0}>Use selected</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-3 border-t flex justify-end flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}
