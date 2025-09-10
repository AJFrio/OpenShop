import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Select } from '../ui/select'
import { generateId, normalizeImageUrl } from '../../lib/utils'
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
    stripePriceId: '',
    variantStyle: '',
    variants: [],
    archived: false
  })
  const [collections, setCollections] = useState([])
  const [modalImage, setModalImage] = useState(null)
  const [errorOpen, setErrorOpen] = useState(false)
  const [errorText, setErrorText] = useState('')
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

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...(prev.variants || []), { id: generateId(), name: '', selectorImageUrl: '', displayImageUrl: '' }]
    }))
  }

  const updateVariant = (index, key, value) => {
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).map((v, i) => i === index ? { ...v, [key]: value } : v)
    }))
  }

  const removeVariant = (index) => {
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).filter((_, i) => i !== index)
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
        images: formData.images.filter(img => img.trim() !== ''),
        variants: (formData.variants || []).map(v => ({ 
          id: v.id || generateId(), 
          name: v.name, 
          selectorImageUrl: v.selectorImageUrl || v.imageUrl || v.displayImageUrl || '',
          displayImageUrl: v.displayImageUrl || v.imageUrl || v.selectorImageUrl || ''
        })),
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
      setErrorText('Error saving product. Please try again.')
      setErrorOpen(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
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

          <div className="flex items-center gap-3">
            <Switch
              id="archived"
              checked={!!formData.archived}
              onCheckedChange={(v) => setFormData(prev => ({ ...prev, archived: v }))}
            />
            <label htmlFor="archived" className="text-sm text-gray-700 select-none">Archived (hide from storefront)</label>
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
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    type="url"
                    value={image}
                    onChange={(e) => handleImageChange(index, e.target.value)}
                    placeholder={`Image URL ${index + 1}`}
                    className="flex-1"
                  />
                  {image && (
                    <button
                      type="button"
                      className="w-12 h-12 rounded overflow-hidden border bg-white"
                      title="Preview"
                      onClick={() => setModalImage(normalizeImageUrl(image))}
                    >
                      <img src={normalizeImageUrl(image)} alt="preview" className="w-full h-full object-cover" />
                    </button>
                  )}
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

          {/* Variants */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">Variants</h3>
            <div>
              <label className="block text-sm font-medium mb-2">Variant Style (e.g., Color, Logo)</label>
              <Input
                name="variantStyle"
                value={formData.variantStyle || ''}
                onChange={handleChange}
                placeholder="Color"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">Variant Options</label>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>Add Variant</Button>
            </div>
            {(formData.variants || []).length === 0 ? (
              <p className="text-sm text-gray-500">No variants added. Add at least one to enable variant selection on the PDP.</p>
            ) : (
              <div className="space-y-2">
                {(formData.variants || []).map((variant, index) => (
                  <div key={variant.id || index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <Input
                        value={variant.name}
                        onChange={(e) => updateVariant(index, 'name', e.target.value)}
                        placeholder="Variant name (e.g., Green)"
                      />
                    </div>
                    <div className="col-span-4">
                      <div className="flex items-center gap-2">
                        <Input
                          type="url"
                          value={variant.selectorImageUrl || ''}
                          onChange={(e) => updateVariant(index, 'selectorImageUrl', e.target.value)}
                          placeholder="Selector image URL"
                          className="flex-1"
                        />
                        {(variant.selectorImageUrl) && (
                          <button
                            type="button"
                            className="w-12 h-12 rounded overflow-hidden border bg-white"
                            title="Preview selector image"
                            onClick={() => setModalImage(normalizeImageUrl(variant.selectorImageUrl))}
                          >
                            <img src={normalizeImageUrl(variant.selectorImageUrl)} alt="selector" className="w-full h-full object-cover" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="col-span-4">
                      <div className="flex items-center gap-2">
                        <Input
                          type="url"
                          value={variant.displayImageUrl || ''}
                          onChange={(e) => updateVariant(index, 'displayImageUrl', e.target.value)}
                          placeholder="Display image URL"
                          className="flex-1"
                        />
                        {(variant.displayImageUrl) && (
                          <button
                            type="button"
                            className="w-12 h-12 rounded overflow-hidden border bg-white"
                            title="Preview display image"
                            onClick={() => setModalImage(normalizeImageUrl(variant.displayImageUrl))}
                          >
                            <img src={normalizeImageUrl(variant.displayImageUrl)} alt="display" className="w-full h-full object-cover" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 text-right">
                      <Button type="button" variant="outline" size="sm" className="px-3" onClick={() => removeVariant(index)}>×</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
    {modalImage && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setModalImage(null)}>
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <img src={modalImage} alt="preview" className="w-full h-auto object-contain rounded" />
          <div className="p-3 border-t text-center">
            <a href={modalImage} target="_blank" rel="noreferrer" className="text-sm text-purple-600 hover:text-purple-700">Open original</a>
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
