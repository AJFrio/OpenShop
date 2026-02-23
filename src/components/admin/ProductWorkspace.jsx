import { useState, useEffect, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"
import { Button } from "../ui/button"
import { Select } from "../ui/select"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Switch } from "../ui/switch"
import { RefreshCcw, Plus, Save, Trash2, CheckCircle2, AlertTriangle, Package } from "lucide-react"
import ImageUrlField from "./ImageUrlField"
import VariantImageSelector from "./VariantImageSelector"
import { adminApiRequest } from "../../lib/auth"
import { formatCurrency, normalizeImageUrl, generateId } from "../../lib/utils"
const createEmptyProduct = () => ({
  id: generateId(),
  name: "",
  tagline: "",
  description: "",
  price: "",
  currency: "usd",
  images: [""],
  collectionId: "",
  stripePriceId: "",
  variantStyle: "",
  variants: [],
  variantStyle2: "",
  variants2: [],
  archived: false,
})

const mapProductToDraft = (product) => {
  if (!product) return createEmptyProduct()
  return {
    id: product.id,
    name: product.name || "",
    tagline: product.tagline || "",
    description: product.description || "",
    price: product.price !== undefined && product.price !== null ? String(product.price) : "",
    currency: product.currency || "usd",
    images: Array.isArray(product.images)
      ? (product.images.length ? product.images : [""])
      : product.imageUrl
        ? [product.imageUrl]
        : [""],
    collectionId: product.collectionId || "",
    stripePriceId: product.stripePriceId || "",
    variantStyle: product.variantStyle || "",
    variants: Array.isArray(product.variants) ? product.variants : [],
    variantStyle2: product.variantStyle2 || "",
    variants2: Array.isArray(product.variants2) ? product.variants2 : [],
    archived: !!product.archived,
  }
}

const hasVariantGroup = (variants, style) =>
  (Array.isArray(variants) && variants.length > 0) || Boolean(style)

const prepareVariantsForSave = (variants = []) =>
  variants
    .filter((variant) => variant && (variant.name || variant.selectorImageUrl || variant.displayImageUrl))
    .map((variant) => {
      const parsedPrice = parseFloat(String(variant.price ?? "0"))
      return {
        id: variant.id || generateId(),
        name: variant.name || "",
        selectorImageUrl: variant.selectorImageUrl || variant.imageUrl || variant.displayImageUrl || "",
        displayImageUrl: variant.displayImageUrl || variant.imageUrl || variant.selectorImageUrl || "",
        hasCustomPrice: !!variant.hasCustomPrice,
        price: variant.hasCustomPrice ? (Number.isFinite(parsedPrice) ? parsedPrice : 0) : undefined,
      }
    })
function VariantGroupEditor({
  id,
  title,
  enabled,
  onToggle,
  variantStyle,
  onVariantStyleChange,
  variantPlaceholder,
  variants,
  onAddVariant,
  onVariantChange,
  onVariantRemove,
  onPreview,
}) {
  const items = Array.isArray(variants) ? variants : []

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Switch id={id} checked={enabled} onCheckedChange={onToggle} />
        <label htmlFor={id} className="text-sm text-[var(--admin-text-secondary)] select-none">
          {title}
        </label>
      </div>
      {enabled && (
        <>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">Variant label</label>
            <Input
              value={variantStyle}
              onChange={(event) => onVariantStyleChange(event.target.value)}
              placeholder={variantPlaceholder}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">Variant options</label>
            <Button type="button" variant="outline" size="sm" onClick={onAddVariant}>
              <Plus className="mr-2 h-4 w-4" />
              Add option
            </Button>
          </div>
          <div className="grid grid-cols-12 gap-2 text-xs text-[var(--admin-text-muted)] px-1">
            <div className="col-span-3">Option name</div>
            <div className="col-span-3">Selector image</div>
            <div className="col-span-3">Display image</div>
            <div className="col-span-3">Price & actions</div>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No options added.</p>
          ) : (
            <div className="space-y-2">
              {items.map((variant, index) => (
                <div key={variant.id || index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <Input
                      value={variant.name || ""}
                      onChange={(event) => onVariantChange(index, "name", event.target.value)}
                      placeholder="Variant name"
                    />
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <VariantImageSelector
                      value={variant.selectorImageUrl || ""}
                      onChange={(value) => onVariantChange(index, "selectorImageUrl", value)}
                      onPreview={onPreview}
                    />
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <VariantImageSelector
                      value={variant.displayImageUrl || ""}
                      onChange={(value) => onVariantChange(index, "displayImageUrl", value)}
                      onPreview={onPreview}
                    />
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!variant.hasCustomPrice}
                        onCheckedChange={(checked) => onVariantChange(index, "hasCustomPrice", checked)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={!variant.hasCustomPrice}
                        value={variant.hasCustomPrice ? variant.price ?? "" : ""}
                        onChange={(event) => onVariantChange(index, "price", event.target.value)}
                        placeholder="Price"
                        className="w-20"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="px-2 text-[var(--admin-error)] border-[var(--admin-error)] hover:bg-[var(--admin-error-bg)]"
                      onClick={() => onVariantRemove(index)}
                    >
                      X
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProductListItem({ product, isActive, onSelect, collectionName }) {
  const rawPreviewImage =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : product.imageUrl || ''

  const previewImage = useMemo(() => normalizeImageUrl(rawPreviewImage), [rawPreviewImage])

  return (
    <button
      type="button"
      onClick={() => onSelect(product.id)}
      className={`w-full rounded-lg border p-3 text-left transition-all duration-200 ${
        isActive
          ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/10 shadow-[var(--admin-shadow)]'
          : 'border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] hover:border-[var(--admin-border-secondary)]'
      }`}
    >
      <div className="flex gap-3">
        {previewImage ? (
          <img
            src={previewImage}
            alt={product.name}
            className="h-12 w-12 flex-shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-[var(--admin-bg-secondary)]">
            <Package className="h-6 w-6 text-[var(--admin-text-muted)]" />
          </div>
        )}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-[var(--admin-text-primary)] text-sm truncate">
              {product.name || 'Untitled product'}
            </span>
            <span className="text-xs font-semibold text-[var(--admin-text-secondary)]">
              {formatCurrency(product.price, product.currency)}
            </span>
          </div>
          <p className="text-xs text-[var(--admin-text-muted)] truncate">
            {product.tagline || product.description || 'No description provided.'}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {collectionName ? (
              <span className="rounded-full bg-[var(--admin-bg-secondary)] px-2 py-0.5 text-[var(--admin-text-secondary)]">
                {collectionName}
              </span>
            ) : (
              <span className="rounded-full bg-[var(--admin-bg-secondary)] px-2 py-0.5 text-[var(--admin-text-muted)]">
                No collection
              </span>
            )}
            {product.archived && (
              <span className="rounded-full bg-[var(--admin-text-muted)]/20 px-2 py-0.5 text-[var(--admin-text-secondary)]">
                Archived
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export function ProductWorkspace() {
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [collectionFilter, setCollectionFilter] = useState('all')
  const [archivedFilter, setArchivedFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [modalImage, setModalImage] = useState(null)
  const [variants1Enabled, setVariants1Enabled] = useState(false)
  const [variants2Enabled, setVariants2Enabled] = useState(false)
  const [storeSettings, setStoreSettings] = useState(null)

  const collectionLookup = useMemo(() => {
    const map = new Map()
    collections.forEach((collection) => {
      map.set(collection.id, collection.name)
    })
    return map
  }, [collections])

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return products
      .filter((product) => {
        const matchesCollection =
          collectionFilter === 'all'
            ? true
            : collectionFilter === 'none'
              ? !product.collectionId
              : product.collectionId === collectionFilter
        const matchesArchived =
          archivedFilter === 'all'
            ? true
            : archivedFilter === 'archived'
              ? !!product.archived
              : !product.archived
        const matchesSearch =
          term.length === 0
            ? true
            : [product.name, product.tagline, product.description].some(
                (field) => field && field.toLowerCase().includes(term)
              )
        return matchesCollection && matchesArchived && matchesSearch
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [products, collectionFilter, archivedFilter, searchTerm])

  const fetchProductsAndCollections = async () => {
    const [productsRes, collectionsRes] = await Promise.all([
      adminApiRequest('/api/admin/products'),
      adminApiRequest('/api/admin/collections'),
    ])

    if (!productsRes.ok) {
      throw new Error('Failed to fetch products')
    }

    const productData = await productsRes.json()
    setProducts(productData)

    if (!isCreating) {
      if (productData.length > 0) {
        setSelectedId((prev) => {
          if (prev && productData.some((product) => product.id === prev)) {
            return prev
          }
          return productData[0].id
        })
      } else {
        setSelectedId(null)
        setDraft(null)
      }
    }

    if (collectionsRes.ok) {
      const collectionData = await collectionsRes.json()
      setCollections(collectionData)
    }

    return productData
  }

  const fetchStoreSettings = async () => {
    try {
      const settingsRes = await adminApiRequest('/api/admin/settings/store-settings')
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setStoreSettings(settingsData)
      }
    } catch (error) {
      console.error('Error fetching store settings:', error)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        await Promise.all([
          fetchProductsAndCollections(),
          fetchStoreSettings()
        ])
      } catch (error) {
        console.error('Error loading products workspace:', error)
        setStatus({ type: 'error', message: 'Unable to load products. Please refresh.' })
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (isCreating) return
    if (filteredProducts.length === 0) {
      if (selectedId !== null) {
        setSelectedId(null)
      }
      if (draft) {
        setDraft(null)
      }
      return
    }
    if (!selectedId || !filteredProducts.some((product) => product.id === selectedId)) {
      setSelectedId(filteredProducts[0].id)
    }
  }, [filteredProducts, isCreating, selectedId, draft])

  useEffect(() => {
    if (isCreating) return
    if (!selectedId) {
      setDraft(null)
      return
    }
    const selectedProduct = products.find((product) => product.id === selectedId)
    if (selectedProduct) {
      const nextDraft = mapProductToDraft(selectedProduct)
      setDraft(nextDraft)
      setVariants1Enabled(hasVariantGroup(nextDraft.variants, nextDraft.variantStyle))
      setVariants2Enabled(hasVariantGroup(nextDraft.variants2, nextDraft.variantStyle2))
    }
  }, [selectedId, products, isCreating])

  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(null), 4000)
    return () => clearTimeout(timer)
  }, [status])
  const handleRefresh = async () => {
    try {
      setIsLoading(true)
      await fetchProductsAndCollections()
      setStatus({ type: 'success', message: 'Catalog refreshed' })
    } catch (error) {
      console.error('Error refreshing products:', error)
      setStatus({ type: 'error', message: 'Unable to refresh products right now.' })
    } finally {
      setIsLoading(false)
    }
  }

  const startCreate = () => {
    const blank = createEmptyProduct()
    setDraft(blank)
    setIsCreating(true)
    setSelectedId(null)
    setVariants1Enabled(false)
    setVariants2Enabled(false)
    setStatus(null)
  }

  const handleSelectProduct = (productId) => {
    setIsCreating(false)
    setSelectedId(productId)
    setStatus(null)
  }

  const handleDraftChange = (key, value) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleImageChange = (index, value) => {
    setDraft((prev) => {
      if (!prev) return prev
      const images = Array.isArray(prev.images) ? [...prev.images] : ['']
      images[index] = value
      return { ...prev, images }
    })
  }

  const addImageField = () => {
    setDraft((prev) => {
      if (!prev) return prev
      const images = Array.isArray(prev.images) ? [...prev.images] : []
      images.push('')
      return { ...prev, images }
    })
  }

  const removeImageField = (index) => {
    setDraft((prev) => {
      if (!prev) return prev
      const images = Array.isArray(prev.images) ? [...prev.images] : []
      images.splice(index, 1)
      return { ...prev, images: images.length > 0 ? images : [''] }
    })
  }

  const handleVariantToggle = (group, enabled) => {
    if (group === 1) {
      setVariants1Enabled(enabled)
      if (!enabled) {
        setDraft((prev) => (prev ? { ...prev, variantStyle: '', variants: [] } : prev))
      }
    } else {
      setVariants2Enabled(enabled)
      if (!enabled) {
        setDraft((prev) => (prev ? { ...prev, variantStyle2: '', variants2: [] } : prev))
      }
    }
  }

  const addVariant = (group) => {
    setDraft((prev) => {
      if (!prev) return prev
      const key = group === 1 ? 'variants' : 'variants2'
      const list = Array.isArray(prev[key]) ? [...prev[key]] : []
      list.push({
        id: generateId(),
        name: '',
        selectorImageUrl: '',
        displayImageUrl: '',
        hasCustomPrice: false,
        price: '',
      })
      return { ...prev, [key]: list }
    })
  }

  const updateVariant = (group, index, key, value) => {
    setDraft((prev) => {
      if (!prev) return prev
      const stateKey = group === 1 ? 'variants' : 'variants2'
      const list = Array.isArray(prev[stateKey]) ? [...prev[stateKey]] : []
      if (!list[index]) {
        list[index] = {}
      }
      list[index] = {
        ...list[index],
        [key]: value,
      }
      return { ...prev, [stateKey]: list }
    })
  }

  const removeVariant = (group, index) => {
    setDraft((prev) => {
      if (!prev) return prev
      const stateKey = group === 1 ? 'variants' : 'variants2'
      const list = Array.isArray(prev[stateKey]) ? [...prev[stateKey]] : []
      list.splice(index, 1)
      return { ...prev, [stateKey]: list }
    })
  }

  const handleCancel = () => {
    if (isSaving) return
    if (isCreating) {
      setIsCreating(false)
      if (filteredProducts.length > 0) {
        setSelectedId(filteredProducts[0].id)
      } else {
        setDraft(null)
      }
      return
    }
    if (!selectedId) {
      setDraft(null)
      return
    }
    const original = products.find((product) => product.id === selectedId)
    if (original) {
      const nextDraft = mapProductToDraft(original)
      setDraft(nextDraft)
      setVariants1Enabled(hasVariantGroup(nextDraft.variants, nextDraft.variantStyle))
      setVariants2Enabled(hasVariantGroup(nextDraft.variants2, nextDraft.variantStyle2))
    }
  }
  const handleSave = async () => {
    if (!draft) return
    setIsSaving(true)
    try {
      const priceValue = parseFloat(String(draft.price || '0'))
      const payload = {
        ...draft,
        id: draft.id || generateId(),
        name: draft.name?.trim() || '',
        tagline: draft.tagline || '',
        description: draft.description || '',
        price: Number.isFinite(priceValue) ? priceValue : 0,
        currency: (draft.currency || 'usd').toLowerCase(),
        images: (Array.isArray(draft.images) ? draft.images : [])
          .map((image) => (image || '').trim())
          .filter(Boolean),
        collectionId: draft.collectionId || '',
        stripePriceId: draft.stripePriceId || '',
        variantStyle: variants1Enabled ? draft.variantStyle || '' : '',
        variants: variants1Enabled ? prepareVariantsForSave(draft.variants || []) : [],
        variantStyle2: variants2Enabled ? draft.variantStyle2 || '' : '',
        variants2: variants2Enabled ? prepareVariantsForSave(draft.variants2 || []) : [],
        archived: !!draft.archived,
      }
      const isNew = isCreating || !products.some((product) => product.id === payload.id)
      const url = isNew ? '/api/admin/products' : `/api/admin/products/${payload.id}`
      const method = isNew ? 'POST' : 'PUT'

      const response = await adminApiRequest(url, {
        method,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.error === 'Product limit reached') {
          setStatus({ type: 'error', message: errorData.message || 'Product limit reached. Please delete products or upgrade your plan.' })
          return
        }
        throw new Error('Failed to save product')
      }

      const savedProduct = await response.json()

      setProducts((prev) => {
        const next = [...prev]
        const existingIndex = next.findIndex((product) => product.id === savedProduct.id)
        if (existingIndex === -1) {
          next.push(savedProduct)
        } else {
          next[existingIndex] = savedProduct
        }
        return next
      })

      setIsCreating(false)
      setSelectedId(savedProduct.id)
      const nextDraft = mapProductToDraft(savedProduct)
      setDraft(nextDraft)
      setVariants1Enabled(hasVariantGroup(nextDraft.variants, nextDraft.variantStyle))
      setVariants2Enabled(hasVariantGroup(nextDraft.variants2, nextDraft.variantStyle2))
      setStatus({ type: 'success', message: isNew ? 'Product created' : 'Product updated' })
      
      // Refresh store settings after creating a product to update limit status
      if (isNew) {
        await fetchStoreSettings()
      }
    } catch (error) {
      console.error('Error saving product:', error)
      setStatus({ type: 'error', message: 'Unable to save product. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!draft?.id || isCreating) return
    const confirmed = window.confirm('Delete this product? This action cannot be undone.')
    if (!confirmed) return
    try {
      const response = await adminApiRequest(`/api/admin/products/${draft.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete product')
      }
      setProducts((prev) => prev.filter((product) => product.id !== draft.id))
      setDraft(null)
      setSelectedId(null)
      setIsCreating(false)
      setStatus({ type: 'success', message: 'Product deleted' })
      
      // Refresh store settings after deleting a product to update limit status
      await fetchStoreSettings()
    } catch (error) {
      console.error('Error deleting product:', error)
      setStatus({ type: 'error', message: 'Unable to delete product. Please try again.' })
    }
  }

  // Calculate if product limit is reached
  const isProductLimitReached = useMemo(() => {
    if (!storeSettings || !storeSettings.productLimit) {
      return false // Unlimited if no limit set
    }
    
    const limit = parseInt(storeSettings.productLimit, 10)
    if (isNaN(limit) || limit <= 0) {
      return false // Invalid limit, treat as unlimited
    }
    
    // Count only active (non-archived) products
    const activeProductCount = products.filter(p => !p.archived).length
    return activeProductCount >= limit
  }, [storeSettings, products])
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--admin-text-primary)]">Products</h1>
          <p className="text-xs text-[var(--admin-text-secondary)]">
            Browse the catalog on the left, then edit details in the workspace on the right.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleRefresh} disabled={isLoading} size="sm">
            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="relative group">
            <Button 
              type="button" 
              onClick={startCreate}
              disabled={isProductLimitReached}
              className={isProductLimitReached ? 'opacity-50 cursor-not-allowed' : ''}
              title={isProductLimitReached ? 'Product limit reached, delete products or upgrade plan' : ''}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              New product
            </Button>
            {isProductLimitReached && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--admin-bg-elevated)] text-[var(--admin-text-primary)] text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-[var(--admin-border-primary)]">
                Product limit reached, delete products or upgrade plan
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-[var(--admin-bg-elevated)]"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row">
        <aside className="xl:w-72 xl:flex-shrink-0">
          <Card className="flex h-full max-h-[calc(100vh-220px)] flex-col xl:max-h-[calc(100vh-180px)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Catalog</CardTitle>
              <p className="text-xs text-[var(--admin-text-secondary)]">Use filters to locate a product quickly.</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden">
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">
                    Search
                  </label>
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by name, tagline, or description"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">
                      Collection
                    </label>
                    <Select
                      value={collectionFilter}
                      onChange={(event) => setCollectionFilter(event.target.value)}
                    >
                      <option value="all">All collections</option>
                      <option value="none">No collection</option>
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">
                      Visibility
                    </label>
                    <Select
                      value={archivedFilter}
                      onChange={(event) => setArchivedFilter(event.target.value)}
                    >
                      <option value="all">All products</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-20 rounded-lg border border-dashed border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] p-6 text-center text-xs text-[var(--admin-text-muted)]">
                    No products match your filters.
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const isActive = !isCreating && selectedId === product.id
                    const collectionName = product.collectionId
                      ? collectionLookup.get(product.collectionId)
                      : null
                    return (
                      <ProductListItem
                        key={product.id}
                        product={product}
                        isActive={isActive}
                        collectionName={collectionName}
                        onSelect={handleSelectProduct}
                      />
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
        <section className="flex-1 overflow-y-auto">
          {status && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${
                status.type === 'success'
                  ? 'border-[var(--admin-success)]/30 bg-[var(--admin-success-bg)] text-[var(--admin-success)]'
                  : 'border-[var(--admin-warning)]/30 bg-[var(--admin-warning-bg)] text-[var(--admin-warning)]'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          {draft ? (
            <div className="space-y-5 pb-16">
              <Card className="border border-[var(--admin-border-primary)]">
                <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between py-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {draft.name || (isCreating ? 'New product draft' : 'Untitled product')}
                    </CardTitle>
                    <p className="text-xs text-[var(--admin-text-secondary)]">
                      {isCreating
                        ? 'Draft will be created once you save changes.'
                        : 'Changes are saved to the live product.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isCreating && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleDelete}
                        disabled={isSaving}
                        className="border-[var(--admin-error)] text-[var(--admin-error)] hover:bg-[var(--admin-error-bg)]"
                        size="sm"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    )}
                    <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving} size="sm">
                      Discard
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={isSaving} size="sm">
                      {isSaving ? (
                        <>
                          <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid gap-5 xl:grid-cols-2">
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">Product overview</CardTitle>
                    <p className="text-xs text-[var(--admin-text-secondary)]">
                      Headline content that introduces the product to customers.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">Name</label>
                      <Input
                        value={draft.name}
                        onChange={(event) => handleDraftChange('name', event.target.value)}
                        placeholder="Product name"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">
                        Tagline
                      </label>
                      <Input
                        value={draft.tagline}
                        onChange={(event) => handleDraftChange('tagline', event.target.value)}
                        placeholder="Catchy summary that appears in cards"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">
                        Description
                      </label>
                      <Textarea
                        rows={5}
                        value={draft.description}
                        onChange={(event) => handleDraftChange('description', event.target.value)}
                        placeholder="Detailed description, markdown supported."
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">Pricing & visibility</CardTitle>
                    <p className="text-xs text-[var(--admin-text-secondary)]">
                      Control how the product is presented and whether it appears in the storefront.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">
                          Price
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.price}
                          onChange={(event) => handleDraftChange('price', event.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">
                          Currency
                        </label>
                        <Select
                          value={draft.currency || 'usd'}
                          onChange={(event) => handleDraftChange('currency', event.target.value)}
                        >
                          <option value="usd">USD</option>
                          <option value="eur">EUR</option>
                          <option value="gbp">GBP</option>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-md border border-[var(--admin-border-primary)] p-3 bg-[var(--admin-bg-elevated)]">
                      <Switch
                        id="product-archived"
                        checked={!!draft.archived}
                        onCheckedChange={(checked) => handleDraftChange('archived', checked)}
                      />
                      <div>
                        <p className="text-sm font-medium text-[var(--admin-text-primary)]">Hide from storefront</p>
                        <p className="text-xs text-[var(--admin-text-muted)]">
                          Archive products to remove them from the storefront without deleting.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="xl:col-span-2">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">Media</CardTitle>
                    <p className="text-xs text-[var(--admin-text-secondary)]">
                      Add high quality imagery to help customers evaluate the product.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(draft.images || []).map((image, index) => (
                      <div key={`image-${index}`} className="space-y-2">
                        <label className="block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">
                          Image {index + 1}
                        </label>
                        <ImageUrlField
                          value={image}
                          onChange={(value) => handleImageChange(index, value)}
                          placeholder="https://"
                          onPreview={(src) => setModalImage(src)}
                          onRemove={
                            (draft.images || []).length > 1
                              ? () => removeImageField(index)
                              : undefined
                          }
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addImageField}
                      className="self-start"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add image
                    </Button>
                  </CardContent>
                </Card>

                <Card className="xl:col-span-2">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">Collections & metadata</CardTitle>
                    <p className="text-xs text-[var(--admin-text-secondary)]">
                      Organize products and connect payment identifiers.
                    </p>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">
                        Collection
                      </label>
                      <Select
                        value={draft.collectionId || ''}
                        onChange={(event) => handleDraftChange('collectionId', event.target.value)}
                      >
                        <option value="">Not assigned</option>
                        {collections.map((collection) => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="xl:col-span-2">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">Variants</CardTitle>
                    <p className="text-xs text-[var(--admin-text-secondary)]">
                      Create option groups such as color or size with optional pricing overrides.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <VariantGroupEditor
                      id="variant-group-1"
                      title="Enable variant group 1"
                      enabled={variants1Enabled}
                      onToggle={(checked) => handleVariantToggle(1, checked)}
                      variantStyle={draft.variantStyle || ''}
                      variantPlaceholder="e.g. Color"
                      onVariantStyleChange={(value) => handleDraftChange('variantStyle', value)}
                      variants={draft.variants || []}
                      onAddVariant={() => addVariant(1)}
                      onVariantChange={(index, key, value) => updateVariant(1, index, key, value)}
                      onVariantRemove={(index) => removeVariant(1, index)}
                      onPreview={setModalImage}
                    />
                    <VariantGroupEditor
                      id="variant-group-2"
                      title="Enable variant group 2"
                      enabled={variants2Enabled}
                      onToggle={(checked) => handleVariantToggle(2, checked)}
                      variantStyle={draft.variantStyle2 || ''}
                      variantPlaceholder="e.g. Size"
                      onVariantStyleChange={(value) => handleDraftChange('variantStyle2', value)}
                      variants={draft.variants2 || []}
                      onAddVariant={() => addVariant(2)}
                      onVariantChange={(index, key, value) => updateVariant(2, index, key, value)}
                      onVariantRemove={(index) => removeVariant(2, index)}
                      onPreview={setModalImage}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="border border-dashed border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)]/50 p-12 text-center text-sm text-[var(--admin-text-muted)]">
              Select a product from the catalog or create a new one to begin editing.
            </Card>
          )}
        </section>
      </div>

      {modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
          onClick={() => setModalImage(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-[var(--admin-bg-card)] shadow-[var(--admin-shadow-xl)] border border-[var(--admin-border-primary)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--admin-border-primary)] px-4 py-3">
              <span className="text-sm font-medium text-[var(--admin-text-primary)]">Preview</span>
              <button
                type="button"
                className="rounded-md border border-[var(--admin-border-primary)] px-3 py-1.5 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-elevated)] transition-colors"
                onClick={() => setModalImage(null)}
              >
                Close
              </button>
            </div>
            <img
              src={normalizeImageUrl(modalImage)}
              alt="Preview"
              className="h-full max-h-[80vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductWorkspace
