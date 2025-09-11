import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Navbar } from '../../components/storefront/Navbar'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { formatCurrency, normalizeImageUrl } from '../../lib/utils'
import { redirectToCheckout } from '../../lib/stripe'
import { useCart } from '../../contexts/CartContext'

export function ProductPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentImage, setCurrentImage] = useState(0)
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(null)
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
    return effectiveVariant?.stripePriceId || effectiveVariant2?.stripePriceId || product?.stripePriceId
  }, [effectiveVariant, effectiveVariant2, product])

  const handleBuyNow = async () => {
    // Use the cart checkout API to preserve line item context (variant names)
    if (!product) return
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
    const variant = effectiveVariant
    const variant2 = effectiveVariant2
    const priceToUse = (variant?.hasCustomPrice && typeof variant.price === 'number')
      ? variant.price
      : (variant2?.hasCustomPrice && typeof variant2.price === 'number')
        ? variant2.price
        : product.price
    const stripePriceIdToUse = variant?.stripePriceId || variant2?.stripePriceId || product.stripePriceId
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
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading product...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
            <Link to="/" className="text-purple-600 hover:text-purple-500">Return to Home</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <Card className="overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[currentImage]}
                  alt={product.name}
                  className="w-full h-96 object-cover"
                />
              ) : (
                <div className="w-full h-96 bg-gray-200" />
              )}
              {images.length > 1 && (
                <CardContent className="p-4 grid grid-cols-5 gap-3">
                  {images.map((src, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImage(idx)}
                      className={`border rounded overflow-hidden h-16 ${idx === currentImage ? 'border-purple-600' : 'border-transparent'}`}
                    >
                      <img src={src} alt="thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </CardContent>
              )}
            </Card>
          </div>

          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              {product.tagline && (
                <p className="text-gray-600">{product.tagline}</p>
              )}
            </div>

            {/* Variant Selector */}
            {Array.isArray(product.variants) && product.variants.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-gray-700 mb-2 font-medium">
                  {product.variantStyle || 'Variant'}
                </p>
                <div className="grid grid-cols-5 gap-3">
                  {product.variants.map((v, idx) => (
                    <button
                      key={v.id || idx}
                      onClick={() => { setSelectedVariantIndex(idx); setCurrentImage(0) }}
                      className={`border rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-purple-500 ${idx === selectedVariantIndex ? 'border-purple-600 ring-2 ring-purple-200' : 'border-gray-200'}`}
                      title={v.name}
                    >
                      {v.selectorImageUrl || v.imageUrl ? (
                        <img src={v.selectorImageUrl || v.imageUrl} alt={v.name} className="w-full h-16 object-cover" />
                      ) : (
                        <div className="w-full h-16 flex items-center justify-center text-sm text-gray-600 bg-gray-50">
                          {v.name || 'Option'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {selectedVariantIndex != null && product.variants[selectedVariantIndex]?.name && (
                  <p className="text-sm text-gray-600 mt-2">Selected: {product.variants[selectedVariantIndex].name}</p>
                )}
              </div>
            )}

            {/* Second Variant Selector */}
            {Array.isArray(product.variants2) && product.variants2.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-gray-700 mb-2 font-medium">
                  {product.variantStyle2 || 'Variant'}
                </p>
                <div className="grid grid-cols-5 gap-3">
                  {product.variants2.map((v, idx) => (
                    <button
                      key={v.id || idx}
                      onClick={() => { setSelectedVariant2Index(idx); setCurrentImage(0) }}
                      className={`border rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-purple-500 ${idx === selectedVariant2Index ? 'border-purple-600 ring-2 ring-purple-200' : 'border-gray-200'}`}
                      title={v.name}
                    >
                      {v.selectorImageUrl || v.imageUrl ? (
                        <img src={v.selectorImageUrl || v.imageUrl} alt={v.name} className="w-full h-16 object-cover" />
                      ) : (
                        <div className="w-full h-16 flex items-center justify-center text-sm text-gray-600 bg-gray-50">
                          {v.name || 'Option'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {selectedVariant2Index != null && product.variants2[selectedVariant2Index]?.name && (
                  <p className="text-sm text-gray-600 mt-2">Selected: {product.variants2[selectedVariant2Index].name}</p>
                )}
              </div>
            )}
            <div className="mb-8">
              <span className="text-4xl font-bold text-gray-900">
                {formatCurrency(effectivePriceCents / 100, product.currency)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                onClick={handleAddToCart}
                variant="outline"
                className="w-full hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:text-white hover:border-transparent"
              >
                Add to Cart
              </Button>
              <Button 
                onClick={handleBuyNow}
                className="w-full bg-slate-900 text-white hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600"
                disabled={!effectiveStripePriceId}
              >
                Buy Now
              </Button>
            </div>

            {product.description && (
              <div className="mt-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Description</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {product.collectionName && (
              <div className="mt-6 text-sm text-gray-500">
                Part of collection: <Link className="text-purple-600 hover:text-purple-500" to={`/collections/${product.collectionId}`}>{product.collectionName}</Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default ProductPage


