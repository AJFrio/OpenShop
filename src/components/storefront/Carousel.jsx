import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { normalizeImageUrl } from '../../lib/utils'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Carousel({ products = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Auto-advance carousel
  useEffect(() => {
    if (products.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === products.length - 1 ? 0 : prevIndex + 1
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [products.length])

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? products.length - 1 : currentIndex - 1)
  }

  const goToNext = () => {
    setCurrentIndex(currentIndex === products.length - 1 ? 0 : currentIndex + 1)
  }

  if (products.length === 0) {
    return (
      <div className="relative w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No featured products available</p>
      </div>
    )
  }

  const currentProduct = products[currentIndex]

  return (
    <div className="relative w-full h-96 bg-gray-900 rounded-lg overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0" onClick={goToNext}>
        {currentProduct.images && currentProduct.images.length > 0 ? (
          <img
            src={normalizeImageUrl(currentProduct.images[0])}
            alt={currentProduct.name}
            className="w-full h-full object-cover opacity-50"
          />
        ) : currentProduct.imageUrl ? (
          <img
            src={normalizeImageUrl(currentProduct.imageUrl)}
            alt={currentProduct.name}
            className="w-full h-full object-cover opacity-50"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-purple-600 to-blue-600 opacity-50"></div>
        )}
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex items-center justify-center h-full text-white text-center px-8">
        <div>
          <h2 className="text-4xl font-bold mb-4">{currentProduct.name}</h2>
          <p className="text-lg mb-6 max-w-2xl">{currentProduct.description}</p>
          <Link to={`/products/${currentProduct.id}`} onClick={(e) => e.stopPropagation()}>
            <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 cursor-pointer">
              Shop Now - ${currentProduct.price}
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Buttons */}
      <button
        type="button"
        onClick={goToPrevious}
        aria-label="Previous product"
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all z-20 cursor-pointer"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      
      <button
        type="button"
        onClick={goToNext}
        aria-label="Next product"
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all z-20 cursor-pointer"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
        {products.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
              index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
