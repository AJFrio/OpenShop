import { useEffect, useState } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { adminApiRequest } from '../../lib/auth'
import { normalizeImageUrl } from '../../lib/utils'

export default function AddMediaModal({ open, onClose, onCreated }) {
  const [activeTab, setActiveTab] = useState('upload') // upload | link | generate
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // upload
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  // link
  const [url, setUrl] = useState('')

  // generate
  const [prompt, setPrompt] = useState('')
  const [resultBase64, setResultBase64] = useState('')
  const [resultMime, setResultMime] = useState('image/png')
  const [isGenerating, setIsGenerating] = useState(false)
  const [driveConnected, setDriveConnected] = useState(false)
  const [filename, setFilename] = useState('openshop-image.png')

  useEffect(() => {
    if (!open) return
    setActiveTab('upload')
    setError('')
    setUrl('')
    setFile(null)
    setPrompt('')
    setResultBase64('')
    checkDriveStatus()
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

  async function uploadFileToDriveAndRecord() {
    if (!file) return
    if (!driveConnected) {
      setError('Google Drive is not connected. Please connect first.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const dataUrl = await fileToDataUrl(file)
      const { mimeType, base64 } = parseDataUrl(dataUrl)
      const uploadRes = await adminApiRequest('/api/admin/drive/upload', {
        method: 'POST',
        body: JSON.stringify({ mimeType, dataBase64: base64, filename: file.name || 'image.png' })
      })
      const uploaded = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploaded.error || 'Upload failed')
      // Save to media library
      const mediaRes = await adminApiRequest('/api/admin/media', {
        method: 'POST',
        body: JSON.stringify({
          url: uploaded.viewUrl || uploaded.downloadUrl,
          source: 'drive',
          filename: file.name || 'image',
          mimeType: mimeType,
          driveFileId: uploaded.id,
        })
      })
      const saved = await mediaRes.json()
      if (!mediaRes.ok) throw new Error(saved.error || 'Failed to save media')
      onCreated?.(saved)
      onClose?.()
    } catch (e) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
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
      onCreated?.(saved)
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
      const res = await adminApiRequest('/api/admin/ai/generate-image', {
        method: 'POST',
        body: JSON.stringify({ prompt, inputs: [] })
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

  async function saveGeneratedToDriveAndRecord() {
    if (!resultBase64) return
    setIsLoading(true)
    try {
      const uploadRes = await adminApiRequest('/api/admin/drive/upload', {
        method: 'POST',
        body: JSON.stringify({ mimeType: resultMime, dataBase64: resultBase64, filename })
      })
      const uploaded = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploaded.error || 'Upload failed')
      const mediaRes = await adminApiRequest('/api/admin/media', {
        method: 'POST',
        body: JSON.stringify({
          url: uploaded.viewUrl || uploaded.downloadUrl,
          source: 'drive',
          filename: filename,
          mimeType: resultMime,
          driveFileId: uploaded.id,
        })
      })
      const saved = await mediaRes.json()
      if (!mediaRes.ok) throw new Error(saved.error || 'Failed to save media')
      onCreated?.(saved)
      onClose?.()
    } catch (e) {
      setError(e.message || 'Upload failed')
    } finally {
      setIsLoading(false)
    }
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
              >{tab[0].toUpperCase() + tab.slice(1)}</button>
            ))}
          </div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
            <div className="flex items-center justify-between">
              {!driveConnected && (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  Google Drive not connected
                </div>
              )}
              <div className="flex gap-2 ml-auto">
                {!driveConnected && (
                  <Button type="button" variant="outline" onClick={() => window.open('/api/admin/drive/oauth/start', '_blank', 'width=480,height=720')}>
                    Connect Google Drive
                  </Button>
                )}
                <Button type="button" onClick={uploadFileToDriveAndRecord} disabled={!file || uploading || !driveConnected}>{uploading ? 'Uploading…' : 'Upload'}</Button>
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
                      {driveConnected ? (
                        <Button type="button" onClick={saveGeneratedToDriveAndRecord} disabled={isLoading}>{isLoading ? 'Uploading…' : 'Save to Media'}</Button>
                      ) : (
                        <Button type="button" onClick={() => window.open('/api/admin/drive/oauth/start', '_blank', 'width=480,height=720')}>Connect Google Drive</Button>
                      )}
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



