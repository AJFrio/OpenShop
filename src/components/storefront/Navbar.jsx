import { useState, useEffect } from 'react'
import { normalizeImageUrl } from '../../lib/utils'
import { Link } from 'react-router-dom'
import { Button } from '../ui/button'
import { useCart } from '../../contexts/CartContext'
import { ShoppingCart } from 'lucide-react'

export function Navbar() {
  const [collections, setCollections] = useState([])
  const [collectionsWithProducts, setCollectionsWithProducts] = useState([])
  const [storeSettings, setStoreSettings] = useState({
    logoType: 'text',
    logoText: 'OpenShop',
    logoImageUrl: ''
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedCollections, setExpandedCollections] = useState(new Set())
  const { itemCount, toggleCart } = useCart()

  useEffect(() => {
    // Fetch collections, products, and store settings for navigation
    fetchCollectionsAndProducts()
    fetchStoreSettings()
  }, [])

  const fetchCollectionsAndProducts = async () => {
    try {
      const [collectionsResponse, productsResponse] = await Promise.all([
        fetch('/api/collections'),
        fetch('/api/products')
      ])

      if (collectionsResponse.ok && productsResponse.ok) {
        const collectionsData = await collectionsResponse.json()
        const productsData = await productsResponse.json()
        
        setCollections(collectionsData)

        // Group products by collection
        const collectionsWithProducts = collectionsData.map(collection => ({
          ...collection,
          products: productsData.filter(product => product.collectionId === collection.id)
        }))
        
        setCollectionsWithProducts(collectionsWithProducts)
      }
    } catch (error) {
      console.error('Error fetching collections and products:', error)
    }
  }

  const fetchStoreSettings = async () => {
    try {
      const response = await fetch('/api/store-settings')
      if (response.ok) {
        const data = await response.json()
        setStoreSettings(data)
      }
    } catch (error) {
      console.error('Error fetching store settings:', error)
    }
  }

  const toggleCollection = (collectionId) => {
    const newExpanded = new Set(expandedCollections)
    if (newExpanded.has(collectionId)) {
      newExpanded.delete(collectionId)
    } else {
      newExpanded.add(collectionId)
    }
    setExpandedCollections(newExpanded)
  }

  return (
    <nav className="bg-white shadow-sm border-b relative z-50">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            {storeSettings.logoType === 'image' && storeSettings.logoImageUrl ? (
              <img
                src={storeSettings.logoImageUrl}
                alt={storeSettings.storeName || 'Store Logo'}
                className="h-8 max-w-48 object-contain"
                onError={(e) => {
                  // Fallback to text if image fails to load
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'block'
                }}
              />
            ) : null}
            <h1 
              className={`text-2xl font-bold text-slate-900 ${
                storeSettings.logoType === 'image' && storeSettings.logoImageUrl ? 'hidden' : 'block'
              }`}
            >
              {storeSettings.logoText || 'OpenShop'}
            </h1>
          </Link>

          {/* Navigation Links centered */}
          <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2">
            <div className="flex items-baseline space-x-6">
              <Link
                to="/"
                className="text-slate-900 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Home
              </Link>
              
              {/* Individual Collection Links with Product Dropdowns */}
              {collectionsWithProducts.map((collection) => (
                <div key={collection.id} className="relative group">
                  <Link
                    to={`/collections/${collection.id}`}
                    className="text-slate-900 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center"
                  >
                    {collection.name}
                    {collection.products.length > 0 && (
                      <svg className="w-4 h-4 ml-1 transition-transform duration-200 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </Link>
                  
                  {/* Product Dropdown */}
                  {collection.products.length > 0 && (
                    <div className="absolute left-0 top-full w-72 bg-white rounded-md rounded-t-none shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[100] pointer-events-none group-hover:pointer-events-auto">
                      <div className="py-2">
                        <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b">
                          {collection.name} Products
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {collection.products.map((product) => (
                            <Link
                              key={product.id}
                              to={`/products/${product.id}`}
                              className="block px-4 py-3 hover:bg-slate-50 transition-colors duration-150"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  {(product.images && product.images.length > 0) ? (
                                    <img
                                      src={normalizeImageUrl(product.images[0])}
                                      alt={product.name}
                                      className="w-10 h-10 object-cover rounded-md"
                                      onError={(e) => {
                                        e.target.style.display = 'none'
                                        e.target.nextSibling.style.display = 'flex'
                                      }}
                                    />
                                  ) : product.imageUrl ? (
                                    <img
                                      src={normalizeImageUrl(product.imageUrl)}
                                      alt={product.name}
                                      className="w-10 h-10 object-cover rounded-md"
                                      onError={(e) => {
                                        e.target.style.display = 'none'
                                        e.target.nextSibling.style.display = 'flex'
                                      }}
                                    />
                                  ) : null}
                                  <div 
                                    className="w-10 h-10 bg-slate-200 rounded-md flex items-center justify-center"
                                    style={{ display: (product.images && product.images.length > 0) || product.imageUrl ? 'none' : 'flex' }}
                                  >
                                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-900 truncate">
                                    {product.name}
                                  </p>
                                  <p className="text-sm text-purple-600 font-semibold">
                                    ${product.price}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                        <div className="border-t px-4 py-2">
                          <Link
                            to={`/collections/${collection.id}`}
                            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                          >
                            View all {collection.name} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cart and Mobile Menu Buttons */}
          <div className="flex items-center justify-end space-x-2">
            {/* Cart Button - Visible on all screen sizes */}
            <button
              onClick={toggleCart}
              className="relative p-2 text-slate-900 hover:text-slate-600 transition-all duration-200 hover:scale-110"
            >
              <ShoppingCart className="w-6 h-6 transition-transform duration-200" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce-in">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            {/* Mobile menu button - Only visible on mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-900 hover:text-slate-600 transition-colors duration-200 p-2"
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className="block px-3 py-2 text-base font-medium text-slate-900 hover:text-purple-600 hover:bg-slate-50 rounded-md transition-colors duration-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            
            {collectionsWithProducts.map((collection) => (
              <div key={collection.id} className="space-y-1">
                <button
                  onClick={() => toggleCollection(collection.id)}
                  className="flex items-center justify-between w-full px-3 py-2 text-base font-medium text-slate-900 hover:text-purple-600 hover:bg-slate-50 rounded-md transition-colors duration-200"
                >
                  <span>{collection.name}</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${expandedCollections.has(collection.id) ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Mobile Product List - Accordion Style */}
                {collection.products.length > 0 && expandedCollections.has(collection.id) && (
                  <div className="pl-6 space-y-1">
                    {collection.products.slice(0, 5).map((product) => (
                      <Link
                        key={product.id}
                        to={`/products/${product.id}`}
                        className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md transition-colors duration-200"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {(product.images && product.images.length > 0) ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-8 h-8 object-cover rounded"
                              />
                            ) : product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-8 h-8 object-cover rounded"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 truncate">{product.name}</p>
                            <p className="text-purple-600 font-semibold">${product.price}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    <Link
                      to={`/collections/${collection.id}`}
                      className="block px-3 py-2 text-sm text-purple-600 hover:text-purple-700 font-medium border-t border-slate-200 pt-2 mt-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      View Collection →
                    </Link>
                    {collection.products.length > 5 && (
                      <Link
                        to={`/collections/${collection.id}`}
                        className="block px-3 py-2 text-sm text-slate-600 hover:text-purple-700 font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        View all {collection.products.length} products →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
