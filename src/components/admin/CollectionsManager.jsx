import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { CollectionForm } from './CollectionForm'
import { adminApiRequest } from '../../lib/auth'
import { Plus, Edit, Trash2, FolderOpen } from 'lucide-react'
import { Switch } from '../ui/switch'
import { Select } from '../ui/select'

export function CollectionsManager() {
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
      setCollections(collections.map(c => c.id === collection.id ? collection : c))
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
        method: 'DELETE'
      })

      if (response.ok) {
        setCollections(collections.filter(c => c.id !== collectionId))
      }
    } catch (error) {
      console.error('Error deleting collection:', error)
    }
  }

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Collection
        </Button>
      </div>

      {/* Filters */}
      <div>
        <label className="block text-sm font-medium mb-1">Filter by Archived</label>
        <Select value={archivedFilter} onChange={(e) => setArchivedFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {collections.filter(c => archivedFilter === 'all' ? true : archivedFilter === 'archived' ? !!c.archived : !c.archived).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No collections yet</h3>
            <p className="text-gray-600 mb-6">Organize your products by creating collections.</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {collections.filter(c => archivedFilter === 'all' ? true : archivedFilter === 'archived' ? !!c.archived : !c.archived).map((collection) => (
            <Card key={collection.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{collection.name}</h3>
                    <p className="text-sm text-gray-600">{collection.description}</p>
                  </div>
                  <div className="flex space-x-2 items-center">
                    <label className="flex items-center gap-3 text-sm text-gray-700">
                      <Switch
                        checked={!!collection.archived}
                        onCheckedChange={async (v) => {
                          const updated = { archived: v }
                          const res = await adminApiRequest(`/api/admin/collections/${collection.id}`, { method: 'PUT', body: JSON.stringify(updated) })
                          if (res.ok) {
                            const saved = await res.json()
                            setCollections(collections.map(c => c.id === saved.id ? saved : c))
                          }
                        }}
                      />
                      Archived
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
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