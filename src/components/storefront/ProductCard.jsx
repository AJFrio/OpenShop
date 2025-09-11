import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardFooter } from '../ui/card'
import { Button } from '../ui/button'
import { formatCurrency, normalizeImageUrl } from '../../lib/utils'
import { redirectToCheckout } from '../../lib/stripe'
import { useCart } from '../../contexts/CartContext'
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'

export function ProductCard({ product }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const { addItem } = useCart()
  
  const images = (Array.isArray(product.images) ? product.images : 
                (product.imageUrl ? [product.imageUrl] : []))
                .map(normalizeImageUrl)
  const hasMultipleImages = images.length > 1
  const handleBuyNow = async () => {
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
    addItem(product)
  }

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <Link to={`/products/${product.id}`} className="block">
      <div className="relative aspect-w-16 aspect-h-12 bg-gray-200">
        {images.length > 0 ? (
          <>
            <img
              src={images[currentImageIndex]}
              alt={product.name}
              className="w-full h-48 object-cover"
            />
            {hasMultipleImages && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-all opacity-0 group-hover:opacity-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-all opacity-0 group-hover:opacity-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      </Link>
      
      <CardContent className="p-4">
        <Link to={`/products/${product.id}`} className="hover:text-purple-600">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {product.name}
          </h3>
        </Link>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {product.tagline || product.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(product.price, product.currency)}
          </span>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button 
            onClick={handleAddToCart}
            variant="outline"
            className="w-full hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:text-white hover:border-transparent transition-all duration-300"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
          <Button 
            onClick={handleBuyNow}
            className="w-full bg-slate-900 text-white hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
            disabled={!product.stripePriceId}
          >
            Buy Now
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
