import { useState, useEffect } from 'react'
import { Navbar } from '../../components/storefront/Navbar'
import { Footer } from '../../components/storefront/Footer'
import { PageRenderer } from '../../components/storefront/page-builder/PageRenderer'

export function Storefront() {
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch products and collections
      const [productsResponse, collectionsResponse, pageResponse] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/collections'),
        fetch('/api/storefront/pages/home')
      ])

      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        setProducts(productsData)
      }

      if (collectionsResponse.ok) {
        const collectionsData = await collectionsResponse.json()
        setCollections(collectionsData)
      }

      if (pageResponse.ok) {
        const pageData = await pageResponse.json()
        setPage(pageData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen storefront-surface">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
              style={{
                borderColor: 'var(--storefront-color-primary)',
                borderBottomColor: 'transparent',
              }}
            ></div>
            <p className="storefront-subtle">Loading products...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen storefront-surface">
      <Navbar />
      <PageRenderer data={page?.data} products={products} collections={collections} />
      <Footer />
    </div>
  )
}
