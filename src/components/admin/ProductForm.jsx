import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Select } from '../ui/select'
import { generateId, normalizeImageUrl } from '../../lib/utils'
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
    variantStyle2: '',
    variants2: [],
    archived: false
  })
  const [enableVariants1, setEnableVariants1] = useState(false)
  const [enableVariants2, setEnableVariants2] = useState(false)
  const [collections, setCollections] = useState([])
  const [modalImage, setModalImage] = useState(null)
  const [errorOpen, setErrorOpen] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [loading, setLoading] = useState(false)
  const [driveNotice, setDriveNotice] = useState('')
  const [driveNoticeTimer, setDriveNoticeTimer] = useState(null)

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        tagline: product.tagline || product.description || '',
        images: Array.isArray(product.images) ? product.images : 
               (product.imageUrl ? [product.imageUrl] : [''])
      })
      setEnableVariants1(!!(product.variants && product.variants.length > 0 || product.variantStyle))
      setEnableVariants2(!!(product.variants2 && product.variants2.length > 0 || product.variantStyle2))
    } else {
      setFormData(prev => ({ ...prev, id: generateId() }))
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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageChange = (index, value) => {
    const normalized = maybeNormalizeDriveUrl(value)
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => i === index ? normalized : img)
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
      variants: [...(prev.variants || []), { id: generateId(), name: '', selectorImageUrl: '', displayImageUrl: '', hasCustomPrice: false, price: '' }]
    }))
  }

  const addVariant2 = () => {
    setFormData(prev => ({
      ...prev,
      variants2: [...(prev.variants2 || []), { id: generateId(), name: '', selectorImageUrl: '', displayImageUrl: '', hasCustomPrice: false, price: '' }]
    }))
  }

  const updateVariant = (index, key, value) => {
    const newVal = (key === 'selectorImageUrl' || key === 'displayImageUrl')
      ? maybeNormalizeDriveUrl(value)
      : value
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).map((v, i) => i === index ? { ...v, [key]: newVal } : v)
    }))
  }

  const updateVariant2 = (index, key, value) => {
    const newVal = (key === 'selectorImageUrl' || key === 'displayImageUrl')
      ? maybeNormalizeDriveUrl(value)
      : value
    setFormData(prev => ({
      ...prev,
      variants2: (prev.variants2 || []).map((v, i) => i === index ? { ...v, [key]: newVal } : v)
    }))
  }

  function maybeNormalizeDriveUrl(input) {
    const val = (input || '').trim()
    if (!val) return input
    const isDrive = val.includes('drive.google.com') || val.includes('drive.usercontent.google.com')
    if (!isDrive) return input
    // Extract file id
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

  const removeVariant = (index) => {
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).filter((_, i) => i !== index)
    }))
  }

  const removeVariant2 = (index) => {
    setFormData(prev => ({
      ...prev,
      variants2: (prev.variants2 || []).filter((_, i) => i !== index)
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
          displayImageUrl: v.displayImageUrl || v.imageUrl || v.selectorImageUrl || '',
          hasCustomPrice: !!v.hasCustomPrice,
          price: v.hasCustomPrice ? parseFloat(v.price || '0') : undefined,
        })),
        variants2: (formData.variants2 || []).map(v => ({
          id: v.id || generateId(),
          name: v.name,
          selectorImageUrl: v.selectorImageUrl || v.imageUrl || v.displayImageUrl || '',
          displayImageUrl: v.displayImageUrl || v.imageUrl || v.selectorImageUrl || '',
          hasCustomPrice: !!v.hasCustomPrice,
          price: v.hasCustomPrice ? parseFloat(v.price || '0') : undefined,
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
                <ImageUrlField
                  key={index}
                  value={image}
                  onChange={(val) => handleImageChange(index, val)}
                  placeholder={`Image URL ${index + 1}`}
                  onPreview={(src) => setModalImage(src)}
                  onRemove={formData.images.length > 1 ? () => removeImageField(index) : undefined}
                  hideInput
                />
              ))}
            </div>
            {driveNotice && (
              <p className="text-xs text-purple-700 mt-2">{driveNotice}</p>
            )}
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
            <div className="flex items-center gap-3">
              <Switch id="enableVariants1" checked={enableVariants1} onCheckedChange={setEnableVariants1} />
              <label htmlFor="enableVariants1" className="text-sm text-gray-700 select-none">Enable Variant Group 1</label>
            </div>
            {enableVariants1 && (
              <>
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
                  <label className="block text-sm font-medium">Variant Picker</label>
                  <Button type="button" variant="outline" size="sm" onClick={addVariant}>Add Variant</Button>
                </div>
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-600 px-1">
                  <div className="col-span-3">Variant name</div>
                  <div className="col-span-4">Selector image</div>
                  <div className="col-span-4">Display image</div>
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
                            <ImageUrlField
                              value={variant.selectorImageUrl || ''}
                              onChange={(val) => updateVariant(index, 'selectorImageUrl', val)}
                              placeholder="Selector image URL"
                              onPreview={(src) => setModalImage(src)}
                              hideInput
                            />
                          </div>
                        </div>
                        <div className="col-span-4">
                          <div className="flex items-center gap-2">
                            <ImageUrlField
                              value={variant.displayImageUrl || ''}
                              onChange={(val) => updateVariant(index, 'displayImageUrl', val)}
                              placeholder="Display image URL"
                              onPreview={(src) => setModalImage(src)}
                              hideInput
                            />
                          </div>
                        </div>
                        <div className="col-span-12 grid grid-cols-12 gap-2 items-center">
                          <label className="col-span-3 flex items-center gap-2 text-sm text-gray-700">
                            <Switch
                              checked={!!variant.hasCustomPrice}
                              onCheckedChange={(v) => updateVariant(index, 'hasCustomPrice', v)}
                            />
                            Custom price for this variant
                          </label>
                          <div className="col-span-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              disabled={!variant.hasCustomPrice}
                              value={variant.price ?? ''}
                              onChange={(e) => updateVariant(index, 'price', e.target.value)}
                              placeholder="Variant price"
                            />
                          </div>
                        </div>
                        <div className="col-span-1 text-right">
                          <Button type="button" variant="outline" size="sm" className="px-3" onClick={() => removeVariant(index)}>×</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Secondary Variants */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch id="enableVariants2" checked={enableVariants2} onCheckedChange={setEnableVariants2} />
              <label htmlFor="enableVariants2" className="text-sm text-gray-700 select-none">Enable Variant Group 2</label>
            </div>
            {enableVariants2 && (
              <>
                <h3 className="text-lg font-medium text-gray-900">Second Variant Group (optional)</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Variant Style (e.g., Size)</label>
                  <Input
                    name="variantStyle2"
                    value={formData.variantStyle2 || ''}
                    onChange={handleChange}
                    placeholder="Size"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Variant Picker</label>
                  <Button type="button" variant="outline" size="sm" onClick={addVariant2}>Add Variant</Button>
                </div>
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-600 px-1">
                  <div className="col-span-3">Option name</div>
                  <div className="col-span-4">Selector image</div>
                  <div className="col-span-4">Display image</div>
                </div>
                {(formData.variants2 || []).length === 0 ? (
                  <p className="text-sm text-gray-500">No options added.</p>
                ) : (
                  <div className="space-y-2">
                    {(formData.variants2 || []).map((variant, index) => (
                      <div key={variant.id || index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3">
                          <Input
                            value={variant.name}
                            onChange={(e) => updateVariant2(index, 'name', e.target.value)}
                            placeholder="Variant name (e.g., Large)"
                          />
                        </div>
                        <div className="col-span-4">
                          <div className="flex items-center gap-2">
                            <ImageUrlField
                              value={variant.selectorImageUrl || ''}
                              onChange={(val) => updateVariant2(index, 'selectorImageUrl', val)}
                              placeholder="Selector image URL"
                              onPreview={(src) => setModalImage(src)}
                              hideInput
                            />
                          </div>
                        </div>
                        <div className="col-span-4">
                          <div className="flex items-center gap-2">
                            <ImageUrlField
                              value={variant.displayImageUrl || ''}
                              onChange={(val) => updateVariant2(index, 'displayImageUrl', val)}
                              placeholder="Display image URL"
                              onPreview={(src) => setModalImage(src)}
                              hideInput
                            />
                          </div>
                        </div>
                        <div className="col-span-12 grid grid-cols-12 gap-2 items-center">
                          <label className="col-span-3 flex items-center gap-2 text-sm text-gray-700">
                            <Switch
                              checked={!!variant.hasCustomPrice}
                              onCheckedChange={(v) => updateVariant2(index, 'hasCustomPrice', v)}
                            />
                            Custom price for this option
                          </label>
                          <div className="col-span-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              disabled={!variant.hasCustomPrice}
                              value={variant.price ?? ''}
                              onChange={(e) => updateVariant2(index, 'price', e.target.value)}
                              placeholder="Option price"
                            />
                          </div>
                        </div>
                        <div className="col-span-1 text-right">
                          <Button type="button" variant="outline" size="sm" className="px-3" onClick={() => removeVariant2(index)}>×</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
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
