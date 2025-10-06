import { useEffect, useRef, useState } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { adminApiRequest } from '../../lib/auth'
import { normalizeImageUrl } from '../../lib/utils'
import MediaModalLayout from './media/MediaModalLayout'
import MediaTabs from './media/MediaTabs'
import { useDriveStatus } from './media/useDriveStatus'
import ReferencePicker from './media/ReferencePicker'
import { blobToBase64, buildDataUrl, fileToDataUrl, parseDataUrl } from './media/mediaUtils'

const TABS = [
  { id: 'upload', label: 'Upload' },
  { id: 'link', label: 'Link' },
  { id: 'generate', label: 'Generate' },
]

export default function AddMediaModal({ open, onClose, onCreated }) {
  const [activeTab, setActiveTab] = useState('upload')
  const [error, setError] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputId = useRef('file-' + Math.random().toString(36).slice(2))
  const [linkValue, setLinkValue] = useState('')
  const [linkSaving, setLinkSaving] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [resultBase64, setResultBase64] = useState('')
  const [resultMime, setResultMime] = useState('image/png')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSavingGenerated, setIsSavingGenerated] = useState(false)
  const [filename, setFilename] = useState('openshop-image.png')
  const [refUrls, setRefUrls] = useState([])
  const [isPickingRefs, setIsPickingRefs] = useState(false)
  const [library, setLibrary] = useState([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [pickSelected, setPickSelected] = useState(new Set())
  const { driveConnected, checkDriveStatus, disconnectDrive, error: driveError, setError: setDriveError } = useDriveStatus()

  useEffect(() => {
    if (!open) return
    setActiveTab('upload')
    setError('')
    setDriveError('')
    setFiles([])
    setPreviews([])
    setLinkValue('')
    setPrompt('')
    setResultBase64('')
    setResultMime('image/png')
    setFilename('openshop-image.png')
    setRefUrls([])
    setIsPickingRefs(false)
    setPickSelected(new Set())
    checkDriveStatus()
  }, [open, checkDriveStatus, setDriveError])

  useEffect(() => {
    previews.forEach((preview) => {
      try { URL.revokeObjectURL(preview.url) } catch (_) {}
    })
    const next = files.map((file) => ({
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }))
    setPreviews(next)
    return () => {
      next.forEach((preview) => {
        try { URL.revokeObjectURL(preview.url) } catch (_) {}
      })
    }
  }, [files])

  const combinedError = error || driveError

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setError('')
    setDriveError('')
  }

  const handleFileInput = (event) => {
    const picked = Array.from(event.target?.files || [])
    if (picked.length > 0) setFiles(picked)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const dropped = Array.from(event.dataTransfer?.files || [])
    const images = dropped.filter((file) => String(file.type || '').startsWith('image/'))
    if (images.length > 0) setFiles(images)
  }

  const preventDragDefaults = (event) => {
    event.preventDefault()
    event.stopPropagation()
  }

  async function uploadFileToDriveAndRecord() {
    if (!files.length) return
    if (!driveConnected) {
      setError('Google Drive is not connected. Please connect first.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const createdItems = []
      for (const file of files) {
        const dataUrl = await fileToDataUrl(file)
        const { mimeType, base64 } = parseDataUrl(dataUrl)
        const uploadRes = await adminApiRequest('/api/admin/drive/upload', {
          method: 'POST',
          body: JSON.stringify({ mimeType, dataBase64: base64, filename: file.name || 'image.png' }),
        })
        const uploaded = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploaded.error || 'Upload failed')
        const mediaRes = await adminApiRequest('/api/admin/media', {
          method: 'POST',
          body: JSON.stringify({
            url: uploaded.viewUrl || uploaded.downloadUrl,
            source: 'drive',
            filename: file.name || 'image',
            mimeType,
            driveFileId: uploaded.id,
          }),
        })
        const saved = await mediaRes.json()
        if (!mediaRes.ok) throw new Error(saved.error || 'Failed to save media')
        createdItems.push(saved)
      }
      onCreated?.(createdItems)
      onClose?.()
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function saveLink() {
    if (!linkValue) return
    setLinkSaving(true)
    setError('')
    try {
      const res = await adminApiRequest('/api/admin/media', {
        method: 'POST',
        body: JSON.stringify({ url: linkValue, source: 'link' }),
      })
      const saved = await res.json()
      if (!res.ok) throw new Error(saved.error || 'Failed to save link')
      onCreated?.([saved])
      onClose?.()
    } catch (err) {
      setError(err.message || 'Failed to save link')
    } finally {
      setLinkSaving(false)
    }
  }

  async function openRefPicker() {
    setIsPickingRefs(true)
    setPickSelected(new Set(refUrls))
    if (library.length > 0) return
    try {
      setLibraryLoading(true)
      const res = await adminApiRequest('/api/admin/media', { method: 'GET' })
      const items = await res.json().catch(() => [])
      const urls = Array.isArray(items) ? items.map((item) => normalizeImageUrl(item.url)).filter(Boolean) : []
      setLibrary(urls)
    } catch (_) {
      // ignore
    } finally {
      setLibraryLoading(false)
    }
  }

  function togglePick(url) {
    setPickSelected((prev) => {
      const next = new Set(prev)
      if (next.has(url)) {
        next.delete(url)
      } else {
        next.add(url)
      }
      if (next.size > 3) {
        const arr = Array.from(next)
        next.clear()
        for (const value of arr.slice(arr.length - 3)) {
          next.add(value)
        }
      }
      return next
    })
  }

  function applyPickedRefs() {
    setRefUrls(Array.from(pickSelected).slice(0, 3))
    setIsPickingRefs(false)
  }

  function removeRef(url) {
    setRefUrls((prev) => prev.filter((item) => item !== url))
  }

  async function generateImage() {
    if (!prompt) return
    setIsGenerating(true)
    setResultBase64('')
    setError('')
    try {
      const inputs = []
      for (const url of refUrls.slice(0, 3)) {
        try {
          const proxied = `/api/image-proxy?src=${encodeURIComponent(url)}`
          const response = await fetch(proxied)
          if (!response.ok) continue
          const blob = await response.blob()
          const { mimeType, base64 } = await blobToBase64(blob)
          if (base64) inputs.push({ mimeType, dataBase64: base64 })
        } catch (_) {
          // ignore
        }
      }
      const res = await adminApiRequest('/api/admin/ai/generate-image', {
        method: 'POST',
        body: JSON.stringify({ prompt, inputs }),
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
    } catch (err) {
      setError(err.message || 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  async function saveGeneratedToDrive() {
    if (!resultBase64 || !driveConnected) return
    setIsSavingGenerated(true)
    setError('')
    try {
      const uploadRes = await adminApiRequest('/api/admin/drive/upload', {
        method: 'POST',
        body: JSON.stringify({ mimeType: resultMime, dataBase64: resultBase64, filename }),
      })
      const uploaded = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploaded.error || 'Upload failed')
      const mediaRes = await adminApiRequest('/api/admin/media', {
        method: 'POST',
        body: JSON.stringify({
          url: uploaded.viewUrl || uploaded.downloadUrl,
          source: 'drive',
          filename,
          mimeType: resultMime,
          driveFileId: uploaded.id,
        }),
      })
      const saved = await mediaRes.json()
      if (!mediaRes.ok) throw new Error(saved.error || 'Failed to save media')
      onCreated?.([saved])
      onClose?.()
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setIsSavingGenerated(false)
    }
  }

  const renderUploadTab = () => (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-md p-6 text-center ${
          files.length ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        } cursor-pointer`}
        onDragEnter={preventDragDefaults}
        onDragOver={preventDragDefaults}
        onDrop={handleDrop}
      >
        <input
          id={fileInputId.current}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
        <label htmlFor={fileInputId.current} className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          <span>{files.length ? 'Change images' : 'Click to choose images'}</span>
        </label>
        <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF up to ~10MB each. Or drag & drop here.</p>
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {previews.map((preview, index) => (
              <div key={index} className="relative">
                <img src={preview.url} alt="preview" className="w-full h-20 object-cover rounded border" />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-white/80 hover:bg-white text-gray-700 rounded px-1 text-xs border"
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center text-xs text-gray-600">
            <span className="truncate">{files.length} {files.length === 1 ? 'file' : 'files'} selected</span>
            <button type="button" className="ml-auto underline" onClick={() => setFiles([])}>
              Clear all
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        {!driveConnected && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            Google Drive not connected
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          {!driveConnected && (
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open('/api/admin/drive/oauth/start', '_blank', 'width=480,height=720')}
            >
              Connect Google Drive
            </Button>
          )}
          {driveConnected && (
            <Button type="button" variant="outline" onClick={disconnectDrive}>
              Disconnect
            </Button>
          )}
          <Button
            type="button"
            onClick={uploadFileToDriveAndRecord}
            disabled={!files.length || uploading || !driveConnected}
          >
            {uploading ? 'Uploading…' : files.length > 1 ? `Upload ${files.length} images` : 'Upload image'}
          </Button>
        </div>
      </div>
    </div>
  )

  const renderLinkTab = () => (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Paste image URL</label>
      <Input value={linkValue} onChange={(event) => setLinkValue(event.target.value)} placeholder="https://…" />
      <div className="flex justify-end">
        <Button type="button" onClick={saveLink} disabled={!linkValue || linkSaving}>
          {linkSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )

  const renderGenerateTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Prompt</label>
        <Input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe what to create…" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">Reference images (optional, up to 3)</label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={openRefPicker}>
              Add from Library
            </Button>
          </div>
        </div>
        {refUrls.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {refUrls.map((url, index) => (
              <div key={index} className="relative">
                <img src={normalizeImageUrl(url)} alt="ref" className="w-20 h-20 object-cover rounded border" />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-white/80 hover:bg-white text-gray-700 rounded px-1 text-xs border"
                  onClick={() => removeRef(url)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No reference images selected.</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" onClick={generateImage} disabled={isGenerating || !prompt}>
          {isGenerating ? 'Generating…' : 'Generate'}
        </Button>
      </div>
      {resultBase64 && (
        <div className="mt-2">
          <img src={buildDataUrl({ mimeType: resultMime, base64: resultBase64 })} alt="generated" className="w-1/2 h-auto rounded border" />
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Filename</label>
              <Input value={filename} onChange={(event) => setFilename(event.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              {driveConnected ? (
                <Button type="button" onClick={saveGeneratedToDrive} disabled={isSavingGenerated}>
                  {isSavingGenerated ? 'Uploading…' : 'Save to Media'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => window.open('/api/admin/drive/oauth/start', '_blank', 'width=480,height=720')}
                >
                  Connect Google Drive
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <MediaModalLayout
        open={open}
        title="Add media"
        onClose={onClose}
        footer={
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        }
      >
        {combinedError && <p className="text-sm text-red-600 mb-2">{combinedError}</p>}
        <MediaTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />
        <div className="mt-4">
          {activeTab === 'upload' && renderUploadTab()}
          {activeTab === 'link' && renderLinkTab()}
          {activeTab === 'generate' && renderGenerateTab()}
        </div>
      </MediaModalLayout>
      <ReferencePicker
        open={isPickingRefs}
        loading={libraryLoading}
        items={library}
        selected={pickSelected}
        onToggle={togglePick}
        onClear={() => setPickSelected(new Set())}
        onApply={applyPickedRefs}
        onClose={() => setIsPickingRefs(false)}
      />
    </>
  )
}
