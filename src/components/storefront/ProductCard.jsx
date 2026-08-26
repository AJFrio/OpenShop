import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardFooter } from '../ui/card'
import { Button } from '../ui/button'
import { formatCurrency, normalizeImageUrl } from '../../lib/utils'
import { redirectToCheckout } from '../../lib/stripe'
import { useCart } from '../../contexts/CartContext'
import { SmartImage } from './SmartImage'
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'

export function ProductCard({ product, disableNavigation }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const { addItem } = useCart()
  const navigate = useNavigate()

  const images = (Array.isArray(product.images) ? product.images :
                (product.imageUrl ? [product.imageUrl] : []))
                .map(normalizeImageUrl)
  const hasMultipleImages = images.length > 1
  const hasVariants = Boolean(
    product.variants?.length || product.variants2?.length
  )

  const handleBuyNow = async () => {
    if (disableNavigation) return
    if (hasVariants) {
      navigate(`/products/${product.id}`)
      return
    }
    try {
      await redirectToCheckout(product.stripePriceId)
    } catch (error) {
      console.error('Error initiating checkout:', error)
      alert('Error starting checkout. Please try again.')
    }
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const handleAddToCart = () => {
    if (disableNavigation) return
    if (hasVariants) {
      navigate(`/products/${product.id}`)
      return
    }
    addItem(product)
  }

  const CardLink = ({ to, children, className }) => {
    if (disableNavigation) {
      return <div className={className}>{children}</div>
    }
    return <Link to={to} className={className}>{children}</Link>
  }

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-shadow duration-300 storefront-card storefront-radius">
      <CardLink to={`/products/${product.id}`} className="block">
      <div
        className="relative aspect-w-16 aspect-h-12 overflow-hidden"
        style={{
          backgroundColor: 'var(--storefront-color-accent-soft)',
          borderTopLeftRadius: 'var(--storefront-radius-lg)',
          borderTopRightRadius: 'var(--storefront-radius-lg)'
        }}
      >
        {images.length > 0 ? (
          <>
            <SmartImage
              src={images[currentImageIndex]}
              alt={product.name}
              className="w-full h-48 object-cover"
            />
            {hasMultipleImages && (
              <>
                <button
                  onClick={(e) => { e.preventDefault(); prevImage(); }}
                  aria-label={`Previous image of ${product.name}`}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hidden sm:block"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); nextImage(); }}
                  aria-label={`Next image of ${product.name}`}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hidden sm:block"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => { e.preventDefault(); setCurrentImageIndex(index); }}
                      aria-label={`Show image ${index + 1} of ${product.name}`}
                      className={`w-4 h-4 flex items-center justify-center ${
                        index === currentImageIndex ? 'text-white' : 'text-white/60'
                      }`}
                    >
                      <span className={`block w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex ? 'bg-current' : 'bg-current'
                      }`} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <SmartImage
            src={null}
            alt={product.name}
            className="w-full h-48"
          />
        )}
      </div>
      </CardLink>
      
      <CardContent className="p-4">
        <CardLink to={`/products/${product.id}`} className="hover:text-slate-600">
          <h3 className="text-lg font-semibold storefront-heading mb-2 line-clamp-2">
            {product.name}
          </h3>
        </CardLink>
        <p className="storefront-subtle text-sm mb-3 line-clamp-2">
          {product.tagline || product.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold storefront-heading">
            {formatCurrency(product.price, product.currency)}
          </span>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button 
            onClick={handleAddToCart}
            variant="outline"
            className="w-full"
            disabled={disableNavigation}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
          {product.stripePriceId || hasVariants ? (
            <Button 
              onClick={handleBuyNow}
              className="w-full"
              disabled={disableNavigation}
            >
              Buy Now
            </Button>
          ) : (
            <Button 
              className="w-full"
              disabled
              title="Currently unavailable for online purchase"
            >
              Unavailable online
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
