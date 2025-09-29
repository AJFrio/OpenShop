import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { adminApiRequest } from '../../lib/auth'
import { normalizeImageUrl } from '../../lib/utils'

export default function ExistingMediaModal({ open, onClose, onPick }) {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    load()
  }, [open])

  async function load() {
    try {
      setIsLoading(true)
      setError('')
      const res = await adminApiRequest('/api/admin/media', { method: 'GET' })
      if (!res.ok) throw new Error('Failed to load media')
      const data = await res.json()
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        : []
      setItems(sorted)
    } catch (e) {
      setError(e.message || 'Failed to load media')
    } finally {
      setIsLoading(false)
    }
  }

  function handlePick(url) {
    onPick?.(url)
    onClose?.()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold">Select existing media</h3>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-600">No media yet. Add images in the Media tab.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className="aspect-square rounded border overflow-hidden bg-white hover:ring-2 hover:ring-purple-500"
                  title={it.filename || it.url}
                  onClick={() => handlePick(it.url)}
                >
                  <img src={normalizeImageUrl(it.url)} alt={it.filename || 'media'} className="w-full h-full object-cover" />
                </button>
              ))}
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



