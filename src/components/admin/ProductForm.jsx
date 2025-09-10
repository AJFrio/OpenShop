import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Select } from '../ui/select'
import { generateId } from '../../lib/utils'
import { adminApiRequest } from '../../lib/auth'

export function ProductForm({ product, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    tagline: '',
    description: '',
    price: '',
    currency: 'usd',
    images: [''],
    collectionId: '',
    stripePriceId: ''
  })
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        tagline: product.tagline || product.description || '',
        images: Array.isArray(product.images) ? product.images : 
               (product.imageUrl ? [product.imageUrl] : [''])
      })
    } else {
      setFormData(prev => ({ ...prev, id: generateId() }))
    }
    fetchCollections()
  }, [product])

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/collections')
      if (response.ok) {
        const data = await response.json()
        setCollections(data)
      }
    } catch (error) {
      console.error('Error fetching collections:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => i === index ? value : img)
    }))
  }

  const addImageField = () => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, '']
    }))
  }

  const removeImageField = (index) => {
    if (formData.images.length > 1) {
      setFormData(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        images: formData.images.filter(img => img.trim() !== '')
      }

      const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products'
      const method = product ? 'PUT' : 'POST'

      const response = await adminApiRequest(url, {
        method,
        body: JSON.stringify(productData),
      })

      if (response.ok) {
        const savedProduct = await response.json()
        onSave(savedProduct)
      } else {
        throw new Error('Failed to save product')
      }
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error saving product. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {product ? 'Edit Product' : 'Create New Product'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Product Name *</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter product name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tagline (short)</label>
            <Input
              name="tagline"
              value={formData.tagline}
              onChange={handleChange}
              placeholder="A short one-liner for cards"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description (detailed)</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter a multi-sentence product description for the PDP"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Price *</label>
              <Input
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Currency</label>
              <Select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
              >
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
                <option value="gbp">GBP</option>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Product Images</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addImageField}
              >
                Add Image
              </Button>
            </div>
            <div className="space-y-2">
              {formData.images.map((image, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="url"
                    value={image}
                    onChange={(e) => handleImageChange(index, e.target.value)}
                    placeholder={`Image URL ${index + 1}`}
                    className="flex-1"
                  />
                  {formData.images.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeImageField(index)}
                      className="px-3"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Add multiple images for your product. The first image will be the primary image.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Collection</label>
            <Select
              name="collectionId"
              value={formData.collectionId}
              onChange={handleChange}
            >
              <option value="">Select a collection</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
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
