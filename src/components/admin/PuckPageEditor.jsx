import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Puck } from '@puckeditor/core'
import '@puckeditor/core/no-external.css'
import { adminAPI } from '../../api/admin'
import { clearDraft, isDraftNewer, loadDraft, saveDraft } from '../../lib/pageDrafts'
import { PuckImageField } from './PuckImageField'
import { createPageBuilderConfig } from '../storefront/page-builder/config'

const CORE_PAGE_SLUGS = ['home', 'about']
const AUTOSAVE_DEBOUNCE_MS = 1000

const puckImageField = {
  type: 'custom',
  render: ({ value, onChange }) => <PuckImageField value={value} onChange={onChange} />,
}

function pageLabel(slug) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function pagePath(slug) {
  if (slug === 'home') return '/'
  if (slug === 'about') return '/about'
  return `/p/${slug}`
}

export function PuckPageEditor() {
  const [pages, setPages] = useState([])
  const [activeSlug, setActiveSlug] = useState('home')
  const [page, setPage] = useState(null)
  const [draftInfo, setDraftInfo] = useState(null)
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [newSlug, setNewSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const autosaveTimerRef = useRef(null)
  // Puck may fire onChange once during mount while it resolves stored data
  // (defaultProps, field resolution). Ignore that first event per mount so
  // phantom drafts are never written without a real user edit.
  const mountedKeyRef = useRef(null)

  const activePage = pages.find((entry) => entry.slug === activeSlug)

  const config = useMemo(() => createPageBuilderConfig({
    products,
    collections,
    disableNavigation: true,
    imageField: puckImageField,
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

  const refreshPages = useCallback(async () => {
    try {
      const list = await adminAPI.settings.pages.list()
      const entries = Array.isArray(list) ? list : []
      setPages(entries)
      if (!entries.some((entry) => entry.slug === activeSlug) && entries.length > 0) {
        setActiveSlug(entries[0].slug)
      }
      return entries
    } catch (listError) {
      console.error('Error fetching page list:', listError)
      setError(listError.message || 'Failed to load page list')
      return []
    }
  }, [activeSlug])

  useEffect(() => {
    let isMounted = true

    async function bootstrap() {
      const entries = await refreshPages()
      if (!isMounted) return
      if (entries.length === 0) return

      const target = entries.some((entry) => entry.slug === activeSlug)
        ? activeSlug
        : entries[0].slug

      try {
        setLoading(true)
        setError('')
        setMessage('')
        const record = await adminAPI.settings.pages.get(target)
        if (isMounted) setPage(record)

        const draft = loadDraft(target)
        if (draft && isDraftNewer(draft, record?.updatedAt)) {
          if (isMounted) {
            setPage({ ...record, data: draft.data })
            setDraftInfo(draft)
          }
        } else {
          clearDraft(target)
          if (isMounted) setDraftInfo(null)
        }
      } catch (loadError) {
        if (isMounted) setError(loadError.message || 'Failed to load page')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    bootstrap()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug])

  const cancelPendingAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
  }, [])

  useEffect(() => () => {
    cancelPendingAutosave()
  }, [cancelPendingAutosave])

  // Puck may fire onChange once during mount while it resolves stored data
  // (defaultProps, field resolution). Ignore that first event per mount so
  // phantom drafts are never written without a real user edit.
  const editorMountKey = `${activeSlug}-${page?.updatedAt || 'default'}-${draftInfo ? 'draft' : 'published'}`

  const handleEditorChange = useCallback(({ data }) => {
    if (!data || !activeSlug) return

    if (mountedKeyRef.current !== editorMountKey) {
      mountedKeyRef.current = editorMountKey
      return
    }

    cancelPendingAutosave()
    autosaveTimerRef.current = setTimeout(() => {
      saveDraft(activeSlug, data)
    }, AUTOSAVE_DEBOUNCE_MS)
  }, [activeSlug, editorMountKey, cancelPendingAutosave])

  const discardDraft = () => {
    cancelPendingAutosave()
    clearDraft(activeSlug)
    setDraftInfo(null)
    refreshPageRecord()
  }

  const refreshPageRecord = async () => {
    try {
      const record = await adminAPI.settings.pages.get(activeSlug)
      setPage(record)
    } catch (reloadError) {
      setError(reloadError.message || 'Failed to reload page')
    }
  }

  const publishPage = async (data) => {
    try {
      setPublishing(true)
      cancelPendingAutosave()
      setError('')
      setMessage('')
      const updated = await adminAPI.settings.pages.update(activeSlug, { data })
      setPage(updated)
      clearDraft(activeSlug)
      setDraftInfo(null)
      setMessage(`${activePage ? activePage.slug : activeSlug} page published.`)
      refreshPages()
    } catch (publishError) {
      setError(publishError.message || 'Failed to publish page')
      throw publishError
    } finally {
      setPublishing(false)
    }
  }

  const createPage = async (event) => {
    event.preventDefault()
    const slug = newSlug.trim().toLowerCase()
    if (!slug) return
    try {
      setCreating(true)
      setError('')
      setMessage('')
      await adminAPI.settings.pages.create({ slug })
      setNewSlug('')
      await refreshPages()
      setActiveSlug(slug)
      setMessage(`Created page "${slug}".`)
    } catch (createError) {
      setError(createError.message || 'Failed to create page')
    } finally {
      setCreating(false)
    }
  }

  const deletePage = async (slug) => {
    if (CORE_PAGE_SLUGS.includes(slug)) return
    if (!window.confirm(`Delete the "${slug}" page? This cannot be undone.`)) return
    try {
      setError('')
      setMessage('')
      clearDraft(slug)
      await adminAPI.settings.pages.delete(slug)
      await refreshPages()
      if (activeSlug === slug) {
        const remaining = pages.filter((entry) => entry.slug !== slug)
        setActiveSlug(remaining[0]?.slug || 'home')
      }
      setMessage(`Deleted page "${slug}".`)
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete page')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--admin-border-primary)] bg-[var(--admin-bg-card)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Pages</h3>
            <p className="text-xs text-[var(--admin-text-muted)]">Edit storefront page layouts with reusable blocks. Changes autosave as a local draft; publish to go live.</p>
          </div>
          <form onSubmit={createPage} className="flex items-center gap-2">
            <input
              type="text"
              value={newSlug}
              onChange={(event) => setNewSlug(event.target.value)}
              placeholder="new-page-slug"
              className="h-8 w-36 rounded border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] px-2 text-xs text-[var(--admin-text-primary)]"
            />
            <button
              type="submit"
              disabled={creating || !newSlug.trim()}
              className="h-8 rounded bg-[var(--admin-accent)] px-3 text-xs font-medium text-white disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Add page'}
            </button>
          </form>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {pages.map((entry) => (
            <span key={entry.slug} className="inline-flex items-center overflow-hidden rounded-md border border-[var(--admin-border-primary)]">
              <button
                type="button"
                onClick={() => setActiveSlug(entry.slug)}
                className={`h-8 px-3 text-xs font-medium ${activeSlug === entry.slug ? 'bg-[var(--admin-accent)] text-white' : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'}`}
                title={pagePath(entry.slug)}
              >
                {pageLabel(entry.slug)}
              </button>
              {!CORE_PAGE_SLUGS.includes(entry.slug) && (
                <button
                  type="button"
                  onClick={() => deletePage(entry.slug)}
                  className="h-8 px-2 text-xs font-medium text-[var(--admin-text-muted)] hover:bg-[var(--admin-error-bg)] hover:text-[var(--admin-error)]"
                  aria-label={`Delete ${entry.slug} page`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        {(message || error || publishing || draftInfo) && (
          <div className="mt-3 space-y-2">
            {draftInfo && (
              <div className="flex items-center justify-between rounded-md bg-[var(--admin-warning-bg, #fef3c7)] px-3 py-2 text-xs text-yellow-800">
                <span>Local draft restored (saved {draftInfo.savedAt ? new Date(draftInfo.savedAt).toLocaleString() : 'recently'}). Not published yet.</span>
                <button
                  type="button"
                  onClick={discardDraft}
                  className="ml-3 shrink-0 font-medium underline hover:no-underline"
                >
                  Discard draft
                </button>
              </div>
            )}
            {(message || error || publishing) && (
              <div className={`rounded-md px-3 py-2 text-xs ${error ? 'bg-[var(--admin-error-bg)] text-[var(--admin-error)]' : 'bg-[var(--admin-success-bg)] text-[var(--admin-success)]'}`}>
                {error || (publishing ? 'Publishing...' : message)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--admin-border-primary)] bg-white">
        {loading ? (
          <div className="flex h-96 items-center justify-center text-sm text-[var(--admin-text-muted)]">Loading editor...</div>
        ) : page?.data ? (
          <div className="h-[calc(100vh-12rem)] min-h-[720px]">
            <Puck
              key={editorMountKey}
              config={config}
              data={page.data}
              headerTitle={`${activePage ? pageLabel(activePage.slug) : activeSlug} page`}
              headerPath={activePage ? pagePath(activePage.slug) : ''}
              height="100%"
              onPublish={publishPage}
              onChange={handleEditorChange}
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
