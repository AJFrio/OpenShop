import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { adminApiRequest } from '../../lib/auth'
import MediaModalLayout from './media/MediaModalLayout'
import MediaGrid from './media/MediaGrid'

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

  return (
    <MediaModalLayout
      open={open}
      title="Select existing media"
      onClose={onClose}
      footer={
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <MediaGrid
          items={items}
          onSelect={handlePick}
          emptyMessage="No media yet. Add images in the Media tab."
        />
      )}
    </MediaModalLayout>
  )
}
