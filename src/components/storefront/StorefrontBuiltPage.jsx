import { useEffect, useState } from 'react'
import { StorefrontPageRender } from './StorefrontPageBuilder'

function createInitialState(pageId) {
  return {
    page: null,
    settings: {},
    products: [],
    collections: [],
    loading: true,
    error: '',
    pageId,
  }
}

export function StorefrontBuiltPage({ pageId }) {
  const [state, setState] = useState(() => createInitialState(pageId))

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        setState((prev) => ({ ...prev, loading: true, error: '' }))

        const [pageResponse, settingsResponse, productsResponse, collectionsResponse] = await Promise.all([
          fetch(`/api/storefront/pages/${pageId}`, { cache: 'no-store' }),
          fetch('/api/store-settings', { cache: 'no-store' }),
          fetch('/api/products', { cache: 'no-store' }),
          fetch('/api/collections', { cache: 'no-store' }),
        ])

        if (!pageResponse.ok) {
          throw new Error(`Failed to load page "${pageId}"`)
        }

        const [page, settings, products, collections] = await Promise.all([
          pageResponse.json(),
          settingsResponse.ok ? settingsResponse.json() : {},
          productsResponse.ok ? productsResponse.json() : [],
          collectionsResponse.ok ? collectionsResponse.json() : [],
        ])

        if (!isMounted) return

        setState({
          page,
          settings,
          products,
          collections,
          loading: false,
          error: '',
          pageId,
        })
      } catch (error) {
        console.error(`Failed to load storefront page "${pageId}":`, error)
        if (!isMounted) return
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to load storefront page',
        }))
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [pageId])

  if (state.loading) {
    return (
      <div className="min-h-screen storefront-surface flex items-center justify-center">
        <div className="flex items-center gap-3 storefront-heading">
          <div className="admin-spinner" />
          <span>Loading storefront...</span>
        </div>
      </div>
    )
  }

  if (state.error || !state.page?.data) {
    return (
      <div className="min-h-screen storefront-surface flex items-center justify-center px-4">
        <div className="max-w-xl text-center space-y-3">
          <h1 className="text-3xl font-bold storefront-heading">Storefront unavailable</h1>
          <p className="storefront-subtle">{state.error || 'The storefront page could not be rendered.'}</p>
        </div>
      </div>
    )
  }

  return (
    <StorefrontPageRender
      data={state.page.data}
      runtime={{
        settings: state.settings,
        products: state.products,
        collections: state.collections,
        previewMode: false,
      }}
    />
  )
}
