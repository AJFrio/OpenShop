import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Select } from '../ui/select'
import { generateId } from '../../lib/utils'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '../ui/alert-dialog'
import { Switch } from '../ui/switch'
import { adminApiRequest } from '../../lib/auth'
import VariantGroup from './product-form/VariantGroup'
import ProductImageFields from './product-form/ProductImageFields'
import { useDriveImageNormalizer } from './product-form/useDriveImageNormalizer'

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
    variantStyle2: '',
    variants2: [],
    archived: false,
  })
  const [enableVariants1, setEnableVariants1] = useState(false)
  const [enableVariants2, setEnableVariants2] = useState(false)
  const [collections, setCollections] = useState([])
  const [modalImage, setModalImage] = useState(null)
  const [errorOpen, setErrorOpen] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [loading, setLoading] = useState(false)
  const { normalize, notice: driveNotice } = useDriveImageNormalizer()

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        tagline: product.tagline || product.description || '',
        images: Array.isArray(product.images)
          ? product.images
          : product.imageUrl
            ? [product.imageUrl]
            : [''],
      })
      setEnableVariants1(!!(product.variants && product.variants.length > 0 || product.variantStyle))
      setEnableVariants2(!!(product.variants2 && product.variants2.length > 0 || product.variantStyle2))
    } else {
      setFormData((prev) => ({ ...prev, id: generateId() }))
      setEnableVariants1(false)
      setEnableVariants2(false)
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

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleImageChange = (index, value) => {
    const normalized = normalize(value)
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => (i === index ? normalized : img)),
    }))
  }

  const addImageField = () => {
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ''],
    }))
  }

  const removeImageField = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [...(prev.variants || []), emptyVariant()],
    }))
  }

  const addVariant2 = () => {
    setFormData((prev) => ({
      ...prev,
      variants2: [...(prev.variants2 || []), emptyVariant()],
    }))
  }

  const updateVariantList = (key, index, field, value) => {
    const normalizedValue =
      field === 'selectorImageUrl' || field === 'displayImageUrl' ? normalize(value) : value
    setFormData((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((variant, i) =>
        i === index ? { ...variant, [field]: normalizedValue } : variant,
      ),
    }))
  }

  const removeVariantFromList = (key, index) => {
    setFormData((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        images: formData.images.filter((img) => img.trim() !== ''),
        variants: prepareVariants(formData.variants || []),
        variants2: prepareVariants(formData.variants2 || []),
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
          <CardTitle>{product ? 'Edit Product' : 'Create New Product'}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
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
                onCheckedChange={(value) =>
                  setFormData((prev) => ({ ...prev, archived: value }))
                }
              />
              <label htmlFor="archived" className="text-sm text-gray-700 select-none">
                Archived (hide from storefront)
              </label>
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
                <Select name="currency" value={formData.currency} onChange={handleChange}>
                  <option value="usd">USD</option>
                  <option value="eur">EUR</option>
                  <option value="gbp">GBP</option>
                </Select>
              </div>
            </div>

            <ProductImageFields
              images={formData.images}
              onImageChange={handleImageChange}
              onAddImage={addImageField}
              onRemoveImage={removeImageField}
              onPreviewImage={setModalImage}
              notice={driveNotice}
            />

            <div>
              <label className="block text-sm font-medium mb-2">Collection</label>
              <Select name="collectionId" value={formData.collectionId} onChange={handleChange}>
                <option value="">Select a collection</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </Select>
            </div>

            <VariantGroup
              id="enableVariants1"
              enabled={enableVariants1}
              onToggle={setEnableVariants1}
              title="Variants"
              description="Enable Variant Group 1"
              styleLabel="Variant Style (e.g., Color, Logo)"
              styleValue={formData.variantStyle || ''}
              onStyleChange={(value) =>
                setFormData((prev) => ({ ...prev, variantStyle: value }))
              }
              stylePlaceholder="Color"
              variants={formData.variants || []}
              onAddVariant={addVariant}
              onVariantChange={(index, field, value) =>
                updateVariantList('variants', index, field, value)
              }
              onVariantRemove={(index) => removeVariantFromList('variants', index)}
              emptyMessage="No variants added. Add at least one to enable variant selection on the PDP."
              priceLabel="Custom price for this variant"
              namePlaceholder="Variant name (e.g., Green)"
              onPreviewImage={setModalImage}
            />

            <VariantGroup
              id="enableVariants2"
              enabled={enableVariants2}
              onToggle={setEnableVariants2}
              title="Second Variant Group (optional)"
              description="Enable Variant Group 2"
              styleLabel="Variant Style (e.g., Size)"
              styleValue={formData.variantStyle2 || ''}
              onStyleChange={(value) =>
                setFormData((prev) => ({ ...prev, variantStyle2: value }))
              }
              stylePlaceholder="Size"
              variants={formData.variants2 || []}
              onAddVariant={addVariant2}
              onVariantChange={(index, field, value) =>
                updateVariantList('variants2', index, field, value)
              }
              onVariantRemove={(index) => removeVariantFromList('variants2', index)}
              emptyMessage="No options added."
              priceLabel="Custom price for this option"
              namePlaceholder="Variant name (e.g., Large)"
              onPreviewImage={setModalImage}
            />

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {modalImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setModalImage(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 relative max-h-[90vh] overflow-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-2 right-2 px-2 py-1 rounded border bg-white/90 hover:bg-white"
              onClick={() => setModalImage(null)}
              aria-label="Close"
            >
              ×
            </button>
            <img
              src={modalImage}
              alt="preview"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
            <div className="p-3 border-t text-center">
              <a
                href={modalImage}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                Open original
              </a>
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

function emptyVariant() {
  return {
    id: generateId(),
    name: '',
    selectorImageUrl: '',
    displayImageUrl: '',
    hasCustomPrice: false,
    price: '',
  }
}

function prepareVariants(list) {
  return list.map((variant) => ({
    id: variant.id || generateId(),
    name: variant.name,
    selectorImageUrl: variant.selectorImageUrl || variant.imageUrl || variant.displayImageUrl || '',
    displayImageUrl: variant.displayImageUrl || variant.imageUrl || variant.selectorImageUrl || '',
    hasCustomPrice: !!variant.hasCustomPrice,
    price: variant.hasCustomPrice ? parseFloat(variant.price || '0') : undefined,
  }))
}
