import { useEffect, useMemo, useState } from 'react'
import { Puck } from '@puckeditor/core'
import '@puckeditor/core/no-external.css'
import { adminApiRequest } from '../../lib/auth'
import { createPageBuilderConfig } from '../storefront/page-builder/config'

const PAGE_OPTIONS = [
  { slug: 'home', label: 'Home', path: '/' },
  { slug: 'about', label: 'About', path: '/about' },
]

export function PuckPageEditor() {
  const [activeSlug, setActiveSlug] = useState('home')
  const [page, setPage] = useState(null)
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const activePage = PAGE_OPTIONS.find((option) => option.slug === activeSlug) || PAGE_OPTIONS[0]
  const config = useMemo(() => createPageBuilderConfig({
    products,
    collections,
    disableNavigation: true,
  }), [collections, products])

  useEffect(() => {
    let isMounted = true

    async function loadCatalogPreviewData() {
      try {
        const [productsResponse, collectionsResponse] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/collections'),
        ])

        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          if (isMounted) setProducts(Array.isArray(productsData) ? productsData : [])
        }

        if (collectionsResponse.ok) {
          const collectionsData = await collectionsResponse.json()
          if (isMounted) setCollections(Array.isArray(collectionsData) ? collectionsData : [])
        }
      } catch (catalogError) {
        console.error('Error fetching page editor preview data:', catalogError)
      }
    }

    loadCatalogPreviewData()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadPage() {
      try {
        setLoading(true)
        setError('')
        setMessage('')
        const response = await adminApiRequest(`/api/admin/storefront/pages/${activeSlug}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to load page')
        }
        const data = await response.json()
        if (isMounted) setPage(data)
      } catch (loadError) {
        if (isMounted) setError(loadError.message || 'Failed to load page')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadPage()

    return () => {
      isMounted = false
    }
  }, [activeSlug])

  const publishPage = async (data) => {
    try {
      setPublishing(true)
      setError('')
      setMessage('')
      const response = await adminApiRequest(`/api/admin/storefront/pages/${activeSlug}`, {
        method: 'PUT',
        body: JSON.stringify({ data }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to publish page')
      }
      const updated = await response.json()
      setPage(updated)
      setMessage(`${activePage.label} page published.`)
    } catch (publishError) {
      setError(publishError.message || 'Failed to publish page')
      throw publishError
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--admin-border-primary)] bg-[var(--admin-bg-card)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Pages</h3>
            <p className="text-xs text-[var(--admin-text-muted)]">Edit the Home and About page layouts with reusable storefront blocks.</p>
          </div>
          <div className="inline-flex rounded-md border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] p-1">
            {PAGE_OPTIONS.map((option) => (
              <button
                key={option.slug}
                type="button"
                onClick={() => setActiveSlug(option.slug)}
                className={`h-8 rounded px-3 text-xs font-medium ${activeSlug === option.slug ? 'bg-[var(--admin-accent)] text-white' : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {(message || error || publishing) && (
          <div className={`mt-3 rounded-md px-3 py-2 text-xs ${error ? 'bg-[var(--admin-error-bg)] text-[var(--admin-error)]' : 'bg-[var(--admin-success-bg)] text-[var(--admin-success)]'}`}>
            {error || (publishing ? 'Publishing...' : message)}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--admin-border-primary)] bg-white">
        {loading ? (
          <div className="flex h-96 items-center justify-center text-sm text-[var(--admin-text-muted)]">Loading editor...</div>
        ) : page?.data ? (
          <div className="h-[calc(100vh-12rem)] min-h-[720px]">
            <Puck
              key={`${activeSlug}-${page.updatedAt || 'default'}`}
              config={config}
              data={page.data}
              headerTitle={`${activePage.label} page`}
              headerPath={activePage.path}
              height="100%"
              onPublish={publishPage}
              viewports={[
                { width: 390, height: 'auto', icon: 'Smartphone', label: 'Mobile' },
                { width: 768, height: 'auto', icon: 'Tablet', label: 'Tablet' },
                { width: 1280, height: 'auto', icon: 'Monitor', label: 'Desktop' },
              ]}
            />
          </div>
        ) : (
          <div className="flex h-96 items-center justify-center text-sm text-[var(--admin-error)]">Page data unavailable.</div>
        )}
      </div>
    </div>
  )
}
