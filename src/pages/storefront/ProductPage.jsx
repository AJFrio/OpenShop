import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Navbar } from '../../components/storefront/Navbar'
import { Footer } from '../../components/storefront/Footer'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { SmartImage } from '../../components/storefront/SmartImage'
import { formatCurrency, normalizeImageUrl } from '../../lib/utils'
import { useCart } from '../../contexts/CartContext'
import { Minus, Plus } from 'lucide-react'

export function ProductPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentImage, setCurrentImage] = useState(0)
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [variantErrors, setVariantErrors] = useState({})
  const { addItem } = useCart()

  useEffect(() => {
    let isMounted = true
    async function fetchProduct() {
      try {
        setLoading(true)
        const res = await fetch(`/api/products/${id}`)
        if (!res.ok) {
          throw new Error('Not found')
        }
        const data = await res.json()
        if (isMounted) setProduct(data)
      } catch (e) {
        console.error('Failed to load product', e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchProduct()
    return () => {
      isMounted = false
    }
  }, [id])

  const images = useMemo(() => {
    if (!product) return []
    // If a variant is selected and has a display image, prioritize it
    const displayImage = (product.variants && selectedVariantIndex != null)
      ? (product.variants[selectedVariantIndex]?.displayImageUrl || product.variants[selectedVariantIndex]?.imageUrl)
      : null
    const baseImages = Array.isArray(product.images)
      ? product.images
      : (product?.imageUrl ? [product.imageUrl] : [])
    const list = displayImage ? [displayImage, ...baseImages] : baseImages
    return list.map(normalizeImageUrl)
  }, [product, selectedVariantIndex])

  const effectiveVariant = useMemo(() => {
    if (!product || !Array.isArray(product.variants)) return null
    if (selectedVariantIndex == null) return null
    return product.variants[selectedVariantIndex] || null
  }, [product, selectedVariantIndex])

  const [selectedVariant2Index, setSelectedVariant2Index] = useState(null)
  const effectiveVariant2 = useMemo(() => {
    if (!product || !Array.isArray(product.variants2)) return null
    if (selectedVariant2Index == null) return null
    return product.variants2[selectedVariant2Index] || null
  }, [product, selectedVariant2Index])

  const effectivePriceCents = useMemo(() => {
    if (!product) return 0
    if (effectiveVariant?.hasCustomPrice && typeof effectiveVariant.price === 'number') {
      return Math.round(effectiveVariant.price * 100)
    }
    if (effectiveVariant2?.hasCustomPrice && typeof effectiveVariant2.price === 'number') {
      return Math.round(effectiveVariant2.price * 100)
    }
    return Math.round((product.price || 0) * 100)
  }, [product, effectiveVariant, effectiveVariant2])

  const effectiveStripePriceId = useMemo(() => {
    if (!product) return null

    // Use variantPrices lookup if available (new system)
    if (product.variantPrices && typeof product.variantPrices === 'object') {
      if (effectiveVariant && effectiveVariant2) {
        // Both variants selected
        const comboKey = `${effectiveVariant.id}-${effectiveVariant2.id}`
        return product.variantPrices[comboKey] || product.stripePriceId
      } else if (effectiveVariant) {
        // Only first variant selected
        return product.variantPrices[effectiveVariant.id] || product.stripePriceId
      } else if (effectiveVariant2) {
        // Only second variant selected
        return product.variantPrices[effectiveVariant2.id] || product.stripePriceId
      }
    }

    // Fallback to old system
    return effectiveVariant?.stripePriceId || effectiveVariant2?.stripePriceId || product?.stripePriceId
  }, [effectiveVariant, effectiveVariant2, product])

  const validateVariants = () => {
    const errors = {}
    if (Array.isArray(product?.variants) && product.variants.length > 0 && selectedVariantIndex == null) {
      errors.variant1 = `Please select a ${product.variantStyle || 'variant'} option.`
    }
    if (Array.isArray(product?.variants2) && product.variants2.length > 0 && selectedVariant2Index == null) {
      errors.variant2 = `Please select a ${product.variantStyle2 || 'variant'} option.`
    }
    setVariantErrors(errors)
    if (Object.keys(errors).length > 0) return false
    return true
  }

  const handleBuyNow = async () => {
    // Use the cart checkout API to preserve line item context (variant names)
    if (!product) return

    if (!validateVariants()) return

    try {
      const tempItem = {
        id: effectiveVariant?.id || effectiveVariant2?.id || product.id,
        stripePriceId: effectiveStripePriceId,
        quantity: 1
      }
      const response = await fetch('/api/create-cart-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [tempItem] })
      })
      const session = await response.json()
      if (session.error) throw new Error(session.error)
      const { loadStripe } = await import('@stripe/stripe-js')
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
      const result = await stripe.redirectToCheckout({ sessionId: session.sessionId })
      if (result.error) throw new Error(result.error.message)
    } catch (error) {
      console.error('Error initiating checkout:', error)
      alert('Error starting checkout. Please try again.')
    }
  }

  const handleAddToCart = () => {
    if (!product) return

    if (!validateVariants()) return

    const variant = effectiveVariant
    const variant2 = effectiveVariant2
    const priceToUse = (variant?.hasCustomPrice && typeof variant.price === 'number')
      ? variant.price
      : (variant2?.hasCustomPrice && typeof variant2.price === 'number')
        ? variant2.price
        : product.price
    // Use variantPrices lookup if available (new system)
    let stripePriceIdToUse = product?.stripePriceId
    if (product?.variantPrices && typeof product.variantPrices === 'object') {
      if (variant && variant2) {
        // Both variants selected
        const comboKey = `${variant.id}-${variant2.id}`
        stripePriceIdToUse = product.variantPrices[comboKey] || product.stripePriceId
      } else if (variant) {
        // Only first variant selected
        stripePriceIdToUse = product.variantPrices[variant.id] || product.stripePriceId
      } else if (variant2) {
        // Only second variant selected
        stripePriceIdToUse = product.variantPrices[variant2.id] || product.stripePriceId
      }
    } else {
      // Fallback to old system
      stripePriceIdToUse = variant?.stripePriceId || variant2?.stripePriceId || product.stripePriceId
    }
    const idSegments = [product.id]
    if (variant) idSegments.push(variant.id)
    if (variant2) idSegments.push(variant2.id)
    const idWithVariant = idSegments.join(':')
    addItem({
      ...product,
      id: idWithVariant,
      price: priceToUse,
      stripePriceId: stripePriceIdToUse,
      selectedVariant: variant ? { id: variant.id, name: variant.name } : undefined,
      selectedVariant2: variant2 ? { id: variant2.id, name: variant2.name } : undefined,
    }, quantity)
    setQuantity(1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading product...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Product Not Found</h1>
            <p className="text-slate-600 mb-6">The product you're looking for doesn't exist.</p>
            <Link to="/" className="text-slate-600 hover:text-slate-500">Return to Home</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <Card className="overflow-hidden">
              <SmartImage
                src={images[currentImage] || null}
                alt={product.name}
                className="w-full aspect-square object-cover"
              />
              {images.length > 1 && (
                <CardContent className="p-4 grid grid-cols-5 gap-3">
                  {images.map((src, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImage(idx)}
                      aria-label={`Show image ${idx + 1} of ${product.name}`}
                      aria-pressed={idx === currentImage}
                      className={`border rounded overflow-hidden h-16 ${idx === currentImage ? 'border-slate-900 ring-2 ring-slate-300' : 'border-transparent'}`}
                    >
                      <SmartImage src={src} alt={`${product.name} — view ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </CardContent>
              )}
            </Card>
          </div>

          <div>
            <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
              <Link to="/" className="hover:text-slate-700">Home</Link>
              {product.collectionId && product.collectionName && (
                <>
                  <span className="mx-2" aria-hidden>/</span>
                  <Link to={`/collections/${product.collectionId}`} className="hover:text-slate-700">{product.collectionName}</Link>
                </>
              )}
              <span className="mx-2" aria-hidden>/</span>
              <span className="text-slate-700" aria-current="page">{product.name}</span>
            </nav>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{product.name}</h1>
              {product.tagline && (
                <p className="text-slate-600">{product.tagline}</p>
              )}
            </div>

            {/* Variant Selector */}
            {Array.isArray(product.variants) && product.variants.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-slate-700 mb-2 font-medium">
                  {product.variantStyle || 'Variant'}
                  {selectedVariantIndex != null && product.variants[selectedVariantIndex]?.name && (
                    <span className="text-slate-500">: {product.variants[selectedVariantIndex].name}</span>
                  )}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {product.variants.map((v, idx) => (
                    <button
                      key={v.id || idx}
                      onClick={() => { setSelectedVariantIndex(idx); setCurrentImage(0); setVariantErrors((e) => ({ ...e, variant1: undefined })) }}
                      aria-pressed={idx === selectedVariantIndex}
                      className={`border-2 rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-slate-500 ${idx === selectedVariantIndex ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'}`}
                      title={v.name}
                    >
                      {v.selectorImageUrl || v.imageUrl ? (
                        <SmartImage src={normalizeImageUrl(v.selectorImageUrl || v.imageUrl)} alt={v.name} className="w-full h-16 object-cover" />
                      ) : (
                        <div className={`w-full h-16 flex items-center justify-center text-sm ${idx === selectedVariantIndex ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-50'}`}>
                          {v.name || 'Option'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {variantErrors.variant1 && (
                  <p role="alert" className="text-sm text-red-600 mt-2">{variantErrors.variant1}</p>
                )}
              </div>
            )}

            {/* Second Variant Selector */}
            {Array.isArray(product.variants2) && product.variants2.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-slate-700 mb-2 font-medium">
                  {product.variantStyle2 || 'Variant'}
                  {selectedVariant2Index != null && product.variants2[selectedVariant2Index]?.name && (
                    <span className="text-slate-500">: {product.variants2[selectedVariant2Index].name}</span>
                  )}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {product.variants2.map((v, idx) => (
                    <button
                      key={v.id || idx}
                      onClick={() => { setSelectedVariant2Index(idx); setCurrentImage(0); setVariantErrors((e) => ({ ...e, variant2: undefined })) }}
                      aria-pressed={idx === selectedVariant2Index}
                      className={`border-2 rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-slate-500 ${idx === selectedVariant2Index ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'}`}
                      title={v.name}
                    >
                      {v.selectorImageUrl || v.imageUrl ? (
                        <SmartImage src={normalizeImageUrl(v.selectorImageUrl || v.imageUrl)} alt={v.name} className="w-full h-16 object-cover" />
                      ) : (
                        <div className={`w-full h-16 flex items-center justify-center text-sm ${idx === selectedVariant2Index ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-50'}`}>
                          {v.name || 'Option'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {variantErrors.variant2 && (
                  <p role="alert" className="text-sm text-red-600 mt-2">{variantErrors.variant2}</p>
                )}
              </div>
            )}
            <div className="mb-6 flex items-baseline gap-4">
              <span className="text-4xl font-bold text-slate-900">
                {formatCurrency(effectivePriceCents / 100, product.currency)}
              </span>
              {!effectiveStripePriceId && (
                <span className="text-sm text-slate-500">Currently unavailable for online purchase</span>
              )}
            </div>

            <div className="mb-6 flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700" id="quantity-label">Quantity</span>
              <div className="flex items-center border border-slate-300 rounded-md" role="group" aria-labelledby="quantity-label">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="p-2 text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-sm font-medium tabular-nums" aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  aria-label="Increase quantity"
                  className="p-2 text-slate-600 hover:text-slate-900"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                onClick={handleAddToCart}
                variant="outline"
                className="w-full hover:bg-gradient-to-r hover:from-slate-600 hover:to-slate-700 hover:text-white hover:border-transparent"
              >
                Add to Cart
              </Button>
              {effectiveStripePriceId ? (
                <Button 
                  onClick={handleBuyNow}
                  className="w-full bg-slate-900 text-white hover:bg-gradient-to-r hover:from-slate-600 hover:to-slate-700"
                >
                  Buy Now
                </Button>
              ) : (
                <Button 
                  className="w-full bg-slate-900 text-white"
                  disabled
                >
                  Unavailable online
                </Button>
              )}
            </div>

            {product.description && (
              <div className="mt-10">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Description</h2>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default ProductPage


