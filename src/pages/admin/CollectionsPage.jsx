import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import { Card, CardContent } from '../../components/ui/card'
import { CollectionForm } from '../../components/admin/CollectionForm'
import { adminApiRequest } from '../../lib/auth'
import { FolderOpen, Plus, Edit, Trash2 } from 'lucide-react'
import { Switch } from '../../components/ui/switch'

export function CollectionsPage() {
  const [collections, setCollections] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingCollection, setEditingCollection] = useState(null)
  const [archivedFilter, setArchivedFilter] = useState('all')

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      const response = await adminApiRequest('/api/admin/collections')
      if (response.ok) {
        const data = await response.json()
        setCollections(data)
      }
    } catch (error) {
      console.error('Error fetching collections:', error)
    }
  }

  const handleSaveCollection = (collection) => {
    if (editingCollection) {
      setCollections(collections.map((c) => (c.id === collection.id ? collection : c)))
    } else {
      setCollections([...collections, collection])
    }
    setShowForm(false)
    setEditingCollection(null)
  }

  const handleDeleteCollection = async (collectionId) => {
    if (!confirm('Are you sure you want to delete this collection?')) return

    try {
      const response = await adminApiRequest(`/api/admin/collections/${collectionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCollections(collections.filter((c) => c.id !== collectionId))
      }
    } catch (error) {
      console.error('Error deleting collection:', error)
    }
  }

  const filteredCollections = collections.filter((c) =>
    archivedFilter === 'all' ? true : archivedFilter === 'archived' ? !!c.archived : !c.archived
  )

  if (showForm) {
    return (
      <div className="flex justify-center">
        <CollectionForm
          collection={editingCollection}
          onSave={handleSaveCollection}
          onCancel={() => {
            setShowForm(false)
            setEditingCollection(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-[var(--admin-text-primary)]">Collections</h1>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Collection
        </Button>
      </div>

      <div className="max-w-xs">
        <label className="block text-xs font-semibold uppercase text-[var(--admin-text-secondary)] mb-2">
          Filter by Archived
        </label>
        <Select value={archivedFilter} onChange={(e) => setArchivedFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {filteredCollections.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-12 h-12 text-[var(--admin-text-muted)] mx-auto mb-4" />
            <h3 className="text-base font-medium text-[var(--admin-text-primary)] mb-2">No collections yet</h3>
            <p className="text-[var(--admin-text-secondary)] text-sm mb-6">
              Organize your products by creating collections.
            </p>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredCollections.map((collection) => (
            <Card key={collection.id} className="hover:border-[var(--admin-border-secondary)] transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-[var(--admin-text-primary)]">{collection.name}</h3>
                    <p className="text-xs text-[var(--admin-text-secondary)]">{collection.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-[var(--admin-text-secondary)]">
                      <Switch
                        checked={!!collection.archived}
                        onCheckedChange={async (v) => {
                          const updated = { archived: v }
                          const res = await adminApiRequest(`/api/admin/collections/${collection.id}`, {
                            method: 'PUT',
                            body: JSON.stringify(updated),
                          })
                          if (res.ok) {
                            const saved = await res.json()
                            setCollections(collections.map((c) => (c.id === saved.id ? saved : c)))
                          }
                        }}
                      />
                      Archived
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5"
                      onClick={() => {
                        setEditingCollection(collection)
                        setShowForm(true)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 px-2.5"
                      onClick={() => handleDeleteCollection(collection.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
