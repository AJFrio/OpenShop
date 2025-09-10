import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { generateId } from '../../lib/utils'
import { adminApiRequest } from '../../lib/auth'

export function CollectionForm({ collection, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    heroImage: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (collection) {
      setFormData(collection)
    } else {
      setFormData(prev => ({ ...prev, id: generateId() }))
    }
  }, [collection])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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
      alert('Error saving collection. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {collection ? 'Edit Collection' : 'Create New Collection'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Input
              name="heroImage"
              type="url"
              value={formData.heroImage}
              onChange={handleChange}
              placeholder="https://example.com/hero-banner.jpg"
            />
            <p className="text-sm text-gray-500 mt-1">
              This image will be displayed as a banner on the collection page
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (collection ? 'Update Collection' : 'Create Collection')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
