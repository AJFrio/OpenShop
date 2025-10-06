import { useCallback, useEffect, useState } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { adminApiRequest } from '../../lib/auth'
import { normalizeImageUrl } from '../../lib/utils'
import MediaModalLayout from './media/MediaModalLayout'
import MediaTabs from './media/MediaTabs'
import MediaGrid from './media/MediaGrid'
import ReferenceSlots from './media/ReferenceSlots'
import { useDriveStatus } from './media/useDriveStatus'
import { buildDataUrl, fileToDataUrl, parseDataUrl } from './media/mediaUtils'

const TABS = [
  { id: 'library', label: 'Library' },
  { id: 'link', label: 'Link' },
  { id: 'generate', label: 'Generate' },
]

export default function MediaPickerModal({ open, onClose, onPick }) {
  const [activeTab, setActiveTab] = useState('library')
  const [library, setLibrary] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [linkValue, setLinkValue] = useState('')
  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState([])
  const [resultBase64, setResultBase64] = useState('')
  const [resultMime, setResultMime] = useState('image/png')
  const [filename, setFilename] = useState('openshop-image.png')
  const [isGenerating, setIsGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const { driveConnected, checkDriveStatus, disconnectDrive, error: driveError, setError: setDriveError } = useDriveStatus()

  const loadLibrary = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      const [prodRes, collRes, settingsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/collections'),
        fetch('/api/store-settings'),
      ])
      const [products, collections, settings] = await Promise.all([
        prodRes.ok ? prodRes.json() : [],
        collRes.ok ? collRes.json() : [],
        settingsRes.ok ? settingsRes.json() : {},
      ])
      const urls = new Set()
      for (const product of products || []) {
        if (Array.isArray(product.images)) {
          for (const url of product.images) if (url) urls.add(String(url))
        }
        for (const variant of product.variants || []) {
          if (variant?.selectorImageUrl) urls.add(String(variant.selectorImageUrl))
          if (variant?.displayImageUrl) urls.add(String(variant.displayImageUrl))
        }
        for (const variant of product.variants2 || []) {
          if (variant?.selectorImageUrl) urls.add(String(variant.selectorImageUrl))
          if (variant?.displayImageUrl) urls.add(String(variant.displayImageUrl))
        }
      }
      for (const collection of collections || []) {
        if (collection?.heroImage) urls.add(String(collection.heroImage))
      }
      if (settings?.logoImageUrl) urls.add(String(settings.logoImageUrl))
      if (settings?.heroImageUrl) urls.add(String(settings.heroImageUrl))
      setLibrary(Array.from(urls).map((url) => normalizeImageUrl(url)))
    } catch (_) {
      setError('Failed to load media library')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setActiveTab('library')
    setLinkValue('')
    setPrompt('')
    setGenError('')
    setResultBase64('')
    setResultMime('image/png')
    setFilename('openshop-image.png')
    setFiles([])
    setDriveError('')
    loadLibrary()
    checkDriveStatus()
  }, [open, loadLibrary, checkDriveStatus, setDriveError])

  const combinedError = error || driveError

  function handleTabChange(tab) {
    setActiveTab(tab)
    setError('')
    setDriveError('')
    setGenError('')
  }

  function handlePick(url) {
    if (!onPick) return
    onPick(url)
    onClose?.()
  }

  function renderLibrary() {
    if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>
    return (
      <MediaGrid
        items={library}
        onSelect={handlePick}
        emptyMessage="No media found yet. Try Link or Generate."
      />
    )
  }

  function renderLink() {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium">Paste image URL</label>
        <Input value={linkValue} onChange={(event) => setLinkValue(event.target.value)} placeholder="https://…" />
        <div className="flex justify-end">
          <Button type="button" onClick={() => linkValue && handlePick(linkValue)}>
            Use image URL
          </Button>
        </div>
      </div>
    )
  }

  const handleSlotChange = (index, file) => {
    setFiles((prev) => {
      const next = [...prev]
      next[index] = file || null
      let lastIndex = -1
      for (let i = 0; i < next.length; i += 1) {
        if (next[i]) lastIndex = i
      }
      return lastIndex >= 0 ? next.slice(0, Math.max(lastIndex + 1, 4)) : []
    })
  }

  async function handleGenerate() {
    if (!prompt) return
    setGenError('')
    setIsGenerating(true)
    setResultBase64('')
    try {
      const inputs = []
      for (const file of files) {
        if (!file) continue
        const dataUrl = await fileToDataUrl(file)
        const { mimeType, base64 } = parseDataUrl(dataUrl)
        inputs.push({ mimeType, dataBase64: base64 })
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
      setGenError(err.message || 'Generation failed')
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
          filename: filename || 'openshop-image.png',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      handlePick(data.viewUrl || data.webViewLink || data.downloadUrl)
    } catch (err) {
      setGenError(err.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  function renderGenerate() {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Prompt</label>
          <Input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe what to create or edit..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Reference images (up to 4)</label>
          <ReferenceSlots files={files} onChange={handleSlotChange} slots={4} />
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={handleGenerate} disabled={isGenerating || !prompt}>
            {isGenerating ? 'Generating…' : 'Generate'}
          </Button>
          {genError && <span className="text-sm text-red-600">{genError}</span>}
        </div>
        {resultBase64 && (
          <div className="mt-2">
            <img
              src={buildDataUrl({ mimeType: resultMime, base64: resultBase64 })}
              alt="generated"
              className="w-1/2 h-auto rounded border"
            />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Filename</label>
                <Input value={filename} onChange={(event) => setFilename(event.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => handlePick(buildDataUrl({ mimeType: resultMime, base64: resultBase64 }))}>
                  Use data URL
                </Button>
                {driveConnected ? (
                  <div className="flex items-center gap-2">
                    <Button type="button" onClick={uploadToDrive} disabled={isUploading}>
                      {isUploading ? 'Uploading…' : 'Upload to Drive'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={disconnectDrive}>
                      Disconnect
                    </Button>
                  </div>
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
  }

  return (
    <MediaModalLayout
      open={open}
      title="Choose an image"
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
        {activeTab === 'library' && renderLibrary()}
        {activeTab === 'link' && renderLink()}
        {activeTab === 'generate' && renderGenerate()}
      </div>
    </MediaModalLayout>
  )
}
