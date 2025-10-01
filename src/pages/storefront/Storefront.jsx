import { useState, useEffect } from 'react'
import { Navbar } from '../../components/storefront/Navbar'
import { Hero } from '../../components/storefront/Hero'
import { Carousel } from '../../components/storefront/Carousel'
import { ProductCard } from '../../components/storefront/ProductCard'
import { Footer } from '../../components/storefront/Footer'
import { Button } from '../../components/ui/button'

export function Storefront() {
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch products and collections
      const [productsResponse, collectionsResponse] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/collections')
      ])

      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        setProducts(productsData)
      }

      if (collectionsResponse.ok) {
        const collectionsData = await collectionsResponse.json()
        setCollections(collectionsData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = selectedCollection
    ? products.filter(product => product.collectionId === selectedCollection)
    : products

  const featuredProducts = products.slice(0, 3) // Show first 3 products in carousel

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <Hero />

      {/* Featured Products Carousel */}
      {featuredProducts.length > 0 && (
        <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Featured Products
          </h2>
          <Carousel products={featuredProducts} />
        </section>
      )}

      {/* Collection Filter */}
      <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-4 justify-center">
          <Button
            variant={selectedCollection === null ? 'default' : 'outline'}
            onClick={() => setSelectedCollection(null)}
          >
            All Products
          </Button>
          {collections.map((collection) => (
            <Button
              key={collection.id}
              variant={selectedCollection === collection.id ? 'default' : 'outline'}
              onClick={() => setSelectedCollection(collection.id)}
            >
              {collection.name}
            </Button>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="max-w-8xl mx-auto px-3 sm:px-4 lg:px-6 pb-16">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-6">
              {selectedCollection 
                ? 'No products in this collection yet.' 
                : 'No products available at the moment.'
              }
            </p>
            {selectedCollection && (
              <Button onClick={() => setSelectedCollection(null)}>
                View All Products
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
