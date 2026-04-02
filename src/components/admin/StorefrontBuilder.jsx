import { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/button'
import { Select } from '../ui/select'
import { adminApiRequest } from '../../lib/auth'
import { STOREFRONT_PAGE_OPTIONS } from '../../lib/storefrontPages'
import { StorefrontPageEditor } from '../storefront/StorefrontPageBuilder'

function formatPublishedAt(value) {
  if (!value) return 'Not published yet'
  try {
    return new Date(value).toLocaleString()
  } catch (_) {
    return 'Unknown publish time'
  }
}

export function StorefrontBuilder() {
  const [selectedPageId, setSelectedPageId] = useState(STOREFRONT_PAGE_OPTIONS[0].id)
  const [pageRecord, setPageRecord] = useState(null)
  const [editorData, setEditorData] = useState(null)
  const [settings, setSettings] = useState({})
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    loadRuntimeData()
  }, [])

  useEffect(() => {
    loadPage(selectedPageId)
  }, [selectedPageId])

  async function loadRuntimeData() {
    try {
      const [settingsResponse, productsResponse, collectionsResponse] = await Promise.all([
        fetch('/api/store-settings', { cache: 'no-store' }),
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/collections', { cache: 'no-store' }),
      ])

      if (settingsResponse.ok) {
        setSettings(await settingsResponse.json())
      }
      if (productsResponse.ok) {
        setProducts(await productsResponse.json())
      }
      if (collectionsResponse.ok) {
        setCollections(await collectionsResponse.json())
      }
    } catch (runtimeError) {
      console.error('Failed to load builder runtime data:', runtimeError)
    }
  }

  async function loadPage(pageId) {
    try {
      setLoading(true)
      setError('')
      setStatusMessage('')

      const response = await adminApiRequest(`/api/admin/storefront/pages/${pageId}`, {
        method: 'GET',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || `Failed to load ${pageId} page`)
      }

      const nextPage = await response.json()
      setPageRecord(nextPage)
      setEditorData(nextPage.data)
    } catch (loadError) {
      console.error('Failed to load storefront page:', loadError)
      setError(loadError.message || 'Failed to load page builder')
    } finally {
      setLoading(false)
    }
  }

  async function handlePublish(nextData) {
    try {
      setPublishing(true)
      setError('')
      setStatusMessage('')

      const response = await adminApiRequest(`/api/admin/storefront/pages/${selectedPageId}`, {
        method: 'PUT',
        body: JSON.stringify(nextData),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || `Failed to publish ${selectedPageId}`)
      }

      const savedPage = await response.json()
      setPageRecord(savedPage)
      setEditorData(savedPage.data)
      setStatusMessage(`Published ${selectedPageLabel.toLowerCase()} at ${formatPublishedAt(savedPage.meta?.updatedAt)}.`)
    } catch (publishError) {
      console.error('Failed to publish storefront page:', publishError)
      setError(publishError.message || 'Failed to publish page')
    } finally {
      setPublishing(false)
    }
  }

  async function handleReset() {
    if (!window.confirm(`Reset the ${selectedPageLabel.toLowerCase()} back to the generated default layout?`)) {
      return
    }

    try {
      setResetting(true)
      setError('')
      setStatusMessage('')

      const response = await adminApiRequest(`/api/admin/storefront/pages/${selectedPageId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || `Failed to reset ${selectedPageId}`)
      }

      const resetPage = await response.json()
      setPageRecord(resetPage)
      setEditorData(resetPage.data)
      setStatusMessage(`Reset ${selectedPageLabel.toLowerCase()} to the default generated layout.`)
    } catch (resetError) {
      console.error('Failed to reset storefront page:', resetError)
      setError(resetError.message || 'Failed to reset page')
    } finally {
      setResetting(false)
    }
  }

  const selectedPage = useMemo(
    () => STOREFRONT_PAGE_OPTIONS.find((page) => page.id === selectedPageId) || STOREFRONT_PAGE_OPTIONS[0],
    [selectedPageId],
  )
  const selectedPageLabel = selectedPage.label

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--admin-border-primary)] bg-[var(--admin-bg-card)] p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[var(--admin-text-primary)]">Website Builder</h1>
            <p className="text-sm text-[var(--admin-text-secondary)]">
              Design the live homepage and about page with drag-and-drop sections. Product, collection, and checkout routes stay operational outside this builder.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-48">
              <Select value={selectedPageId} onChange={(event) => setSelectedPageId(event.target.value)}>
                {STOREFRONT_PAGE_OPTIONS.map((page) => (
                  <option key={page.id} value={page.id}>{page.label}</option>
                ))}
              </Select>
            </div>
            <Button variant="outline" onClick={handleReset} disabled={loading || resetting || publishing}>
              {resetting ? 'Resetting...' : 'Reset Page'}
            </Button>
            <Button asChild variant="outline">
              <a href={selectedPage.path} target="_blank" rel="noreferrer">Open Live Page</a>
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-xs text-[var(--admin-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            {pageRecord?.meta?.isDefault ? 'Using generated default layout.' : `Published: ${formatPublishedAt(pageRecord?.meta?.updatedAt)}`}
          </div>
          <div>
            Available live data: {products.length} products, {collections.length} collections
          </div>
        </div>

        {statusMessage ? (
          <div className="mt-4 rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">
            {statusMessage}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-[var(--admin-border-primary)] bg-[var(--admin-bg-card)] shadow-sm overflow-hidden">
        {loading || !editorData ? (
          <div className="flex h-[70vh] items-center justify-center">
            <div className="flex items-center gap-3 text-[var(--admin-text-secondary)]">
              <div className="admin-spinner" />
              <span>Loading {selectedPageLabel.toLowerCase()} builder...</span>
            </div>
          </div>
        ) : (
          <StorefrontPageEditor
            data={editorData}
            onChange={setEditorData}
            onPublish={handlePublish}
            headerTitle={`${selectedPageLabel} Builder`}
            headerPath={selectedPage.path}
            runtime={{
              settings,
              products,
              collections,
              previewMode: true,
            }}
          />
        )}
      </div>
    </div>
  )
}
