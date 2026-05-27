import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { normalizeImageUrl } from '../../lib/utils'
import { adminApiRequest } from '../../lib/auth'
import { Plus, Trash2, Image as ImageIcon, X } from 'lucide-react'
import AddMediaModal from '../../components/admin/AddMediaModal'

export function MediaLibraryPage() {
  const [media, setMedia] = useState([])
  const [selected, setSelected] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const res = await adminApiRequest('/api/admin/media', { method: 'GET' })
      if (!res.ok) throw new Error('Failed to fetch media')
      const data = await res.json()
      const sorted = Array.isArray(data) ? data : []
      setMedia(sorted)
    } catch (e) {
      console.error('Error fetching media:', e)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this media from the library?')) return
    try {
      const res = await adminApiRequest(`/api/admin/media/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMedia(media.filter((m) => m.id !== id))
      }
    } catch (e) {
      console.error('Delete media failed', e)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-[var(--admin-text-primary)]">Media</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} size="sm">
            Refresh
          </Button>
          <Button onClick={() => setAddOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add media
          </Button>
        </div>
      </div>

      {media.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ImageIcon className="w-12 h-12 text-[var(--admin-border-secondary)] mx-auto mb-4" />
            <h3 className="text-base font-medium text-[var(--admin-text-primary)] mb-2">No media yet</h3>
            <p className="text-[var(--admin-text-secondary)] text-sm">
              Use Add media to upload, link, or generate images.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {media.map((m) => (
            <div
              key={m.id}
              className="group relative rounded-lg overflow-hidden border border-[var(--admin-border-primary)] hover:border-[var(--admin-border-secondary)] hover:shadow-[var(--admin-shadow)] transition-all"
            >
              <button
                onClick={() => setSelected(m)}
                className="block w-full h-full"
                title={m.filename || m.url}
              >
                <img
                  src={normalizeImageUrl(m.url)}
                  alt={m.filename || 'media'}
                  className="w-full h-28 object-cover"
                />
              </button>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => handleDelete(m.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-[var(--admin-bg-card)] rounded-lg shadow-[var(--admin-shadow-lg)] max-w-3xl w-full mx-4 relative flex flex-col max-h-[80vh] overflow-hidden border border-[var(--admin-border-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 p-2 rounded-full border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] hover:bg-[var(--admin-bg-secondary)] transition-colors"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              <X className="w-5 h-5 text-[var(--admin-text-secondary)]" />
            </button>
            <div className="flex-1 overflow-auto p-4">
              <img
                src={normalizeImageUrl(selected.url)}
                alt={selected.filename || 'media'}
                className="block max-w-full max-h-full object-contain mx-auto"
              />
            </div>
            <div className="p-4 border-t border-[var(--admin-border-primary)] space-y-2 flex-shrink-0">
              <p className="text-sm text-[var(--admin-text-secondary)] break-all">
                {selected.filename || selected.url}
              </p>
              <div className="flex gap-4 items-center text-sm">
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--admin-accent-light)] hover:underline"
                >
                  Open original
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddMediaModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(items) => {
          const array = Array.isArray(items) ? items : [items]
          setMedia([...array, ...media])
          setAddOpen(false)
        }}
      />
    </div>
  )
}
