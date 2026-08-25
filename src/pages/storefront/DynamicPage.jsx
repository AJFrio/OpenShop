import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Navbar } from '../../components/storefront/Navbar'
import { Footer } from '../../components/storefront/Footer'
import { PageRenderer } from '../../components/storefront/page-builder/PageRenderer'

export function DynamicPage() {
  const { slug } = useParams()
  const [page, setPage] = useState(null)
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function fetchPage() {
      try {
        setLoading(true)
        setNotFound(false)
        setPage(null)

        const res = await fetch(`/api/storefront/pages/${slug}`)
        if (res.status === 404) {
          if (isMounted) setNotFound(true)
          return
        }
        if (!res.ok) throw new Error('Failed to load page')
        const data = await res.json()
        if (isMounted) setPage(data)

        const [productsRes, collectionsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/collections'),
        ])
        if (productsRes.ok) {
          const productsData = await productsRes.json()
          if (isMounted) setProducts(Array.isArray(productsData) ? productsData : [])
        }
        if (collectionsRes.ok) {
          const collectionsData = await collectionsRes.json()
          if (isMounted) setCollections(Array.isArray(collectionsData) ? collectionsData : [])
        }
      } catch (e) {
        console.error('Failed to load page content', e)
        if (isMounted) setNotFound(true)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchPage()
    return () => { isMounted = false }
  }, [slug])

  if (notFound) {
    return (
      <div className="min-h-screen storefront-surface">
        <Navbar />
        <div className="flex h-96 flex-col items-center justify-center gap-2">
          <h1 className="text-3xl font-bold storefront-heading">Page not found</h1>
          <p className="storefront-subtle">The page you are looking for does not exist.</p>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen storefront-surface">
      <Navbar />
      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <p className="storefront-subtle">Loading page...</p>
        </div>
      ) : (
        <PageRenderer
          data={page?.data}
          products={products}
          collections={collections}
        />
      )}
      <Footer />
    </div>
  )
}

export default DynamicPage
