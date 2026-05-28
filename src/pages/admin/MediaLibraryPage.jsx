import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { normalizeImageUrl } from '../../lib/utils'
import { adminApiRequest } from '../../lib/auth'
import { Plus, Trash2, Image as ImageIcon, X, Copy } from 'lucide-react'
import AddMediaModal from '../../components/admin/AddMediaModal'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../components/ui/alert-dialog'

export function MediaLibraryPage() {
  const [media, setMedia] = useState([])
  const [selected, setSelected] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [mediaToDelete, setMediaToDelete] = useState(null)
  const [status, setStatus] = useState('')

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
    try {
      const res = await adminApiRequest(`/api/admin/media/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMedia(media.filter((m) => m.id !== id))
        if (selected?.id === id) setSelected(null)
        setMediaToDelete(null)
        setStatus('Media removed')
      }
    } catch (e) {
      console.error('Delete media failed', e)
    }
  }

  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url)
      setStatus('Media URL copied')
    } catch {
      setStatus('Unable to copy URL')
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

      {status && (
        <div className="rounded-md border border-[var(--admin-success)]/30 bg-[var(--admin-success-bg)] px-4 py-3 text-sm text-[var(--admin-success)]">
          {status}
        </div>
      )}

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
              <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => copyUrl(m.url)} aria-label="Copy media URL">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => setMediaToDelete(m)} aria-label="Delete media">
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
                <button
                  type="button"
                  className="text-[var(--admin-accent-light)] hover:underline"
                  onClick={() => copyUrl(selected.url)}
                >
                  Copy URL
                </button>
                <button
                  type="button"
                  className="text-[var(--admin-error)] hover:underline"
                  onClick={() => setMediaToDelete(selected)}
                >
                  Delete
                </button>
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

      <AlertDialog open={!!mediaToDelete} onOpenChange={(open) => !open && setMediaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete media?</AlertDialogTitle>
            <AlertDialogDescription>
              {mediaToDelete?.filename || 'This media item'} will be removed from the library. Existing product or page references may stop displaying if they use this URL.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => handleDelete(mediaToDelete.id)}>
              Delete media
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
