import { useState, useEffect } from 'react'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { generateId, normalizeImageUrl } from '../../lib/utils'
import { adminApiRequest } from '../../lib/auth'
import ImageUrlField from './ImageUrlField'
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction
} from '../ui/alert-dialog'
import { Switch } from '../ui/switch'

export function CollectionForm({ collection, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    heroImage: '',
    archived: false
  })
  const [loading, setLoading] = useState(false)
  const [modalImage, setModalImage] = useState(null)
  const [errorOpen, setErrorOpen] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [driveNotice, setDriveNotice] = useState('')
  const [driveNoticeTimer, setDriveNoticeTimer] = useState(null)

  const headerDisabled = loading

  useEffect(() => {
    if (collection) {
      setFormData(collection)
    } else {
      setFormData(prev => ({ ...prev, id: generateId() }))
    }
  }, [collection])

  const handleChange = (e) => {
    const { name, value } = e.target
    const normalized = name === 'heroImage' ? maybeNormalizeDriveUrl(value) : value
    setFormData(prev => ({
      ...prev,
      [name]: normalized
    }))
  }

  function maybeNormalizeDriveUrl(input) {
    const val = (input || '').trim()
    if (!val) return input
    const isDrive = val.includes('drive.google.com') || val.includes('drive.usercontent.google.com')
    if (!isDrive) return input
    const fileMatch = val.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    const idMatch = val.match(/[?&#]id=([a-zA-Z0-9_-]+)/)
    const id = (fileMatch && fileMatch[1]) || (idMatch && idMatch[1]) || null
    const normalized = id
      ? `https://drive.usercontent.google.com/download?id=${id}&export=view`
      : val
    if (normalized !== val) {
      setDriveNotice('Google Drive link detected — converted for reliable preview and delivery.')
      if (driveNoticeTimer) clearTimeout(driveNoticeTimer)
      const t = setTimeout(() => setDriveNotice(''), 3000)
      setDriveNoticeTimer(t)
    }
    return normalized
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = collection ? `/api/admin/collections/${collection.id}` : '/api/admin/collections'
      const method = collection ? 'PUT' : 'POST'

      const response = await adminApiRequest(url, {
        method,
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const savedCollection = await response.json()
        onSave(savedCollection)
      } else {
        throw new Error('Failed to save collection')
      }
    } catch (error) {
      console.error('Error saving collection:', error)
      setErrorText('Error saving collection. Please try again.')
      setErrorOpen(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="sticky top-0 z-20 px-6 py-4 bg-white/95 backdrop-blur border border-gray-200 rounded-lg flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{collection ? 'Edit Collection' : 'Create New Collection'}</h2>
          <p className="text-sm text-gray-500">Organize products into collections with names, descriptions, and hero imagery.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" form="collection-form" disabled={headerDisabled}>
            {loading ? 'Saving...' : (collection ? 'Update Collection' : 'Create Collection')}
          </Button>
        </div>
      </div>
      <Card className="w-full">
        <CardContent className="p-6">
          <form id="collection-form" onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Collection Name *</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter collection name"
              required
            />
          </div>
          {driveNotice && (
            <p className="text-xs text-gray-700 mt-2">{driveNotice}</p>
          )}

          <div className="flex items-center gap-3">
            <Switch
              id="collection-archived"
              checked={!!formData.archived}
              onCheckedChange={(v) => setFormData(prev => ({ ...prev, archived: v }))}
            />
            <label htmlFor="collection-archived" className="text-sm text-gray-700 select-none">Archived (hide from storefront)</label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter collection description"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Hero Banner Image</label>
            <ImageUrlField
              value={formData.heroImage}
              onChange={(val) => setFormData(prev => ({ ...prev, heroImage: val }))}
              placeholder="https://example.com/hero-banner.jpg"
              onPreview={(src) => setModalImage(src)}
              hideInput
            />
            <p className="text-sm text-gray-500 mt-1">
              This image will be displayed as a banner on the collection page
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
    </div>
    {modalImage && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setModalImage(null)}>
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 relative max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="absolute top-2 right-2 px-2 py-1 rounded border bg-white/90 hover:bg-white"
            onClick={() => setModalImage(null)}
            aria-label="Close"
          >
            ×
          </button>
          <img src={modalImage} alt="preview" className="w-full h-auto max-h-[80vh] object-contain rounded" />
          <div className="p-3 border-t text-center">
            <a href={modalImage} target="_blank" rel="noreferrer" className="text-sm text-gray-600 hover:text-gray-700">Open original</a>
          </div>
        </div>
      </div>
    )}
    <AlertDialog open={errorOpen} onOpenChange={setErrorOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Something went wrong</AlertDialogTitle>
          <AlertDialogDescription>{errorText}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
