import { useEffect, useMemo } from 'react'
import { Render } from '@puckeditor/core'
import { createPageBuilderConfig } from './config'

function applyRootMeta(rootProps) {
  if (typeof document === 'undefined') return
  const title = typeof rootProps.title === 'string' ? rootProps.title.trim() : ''
  const description = typeof rootProps.description === 'string' ? rootProps.description.trim() : ''

  if (title) {
    document.title = title
  }

  if (description) {
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', description)
  }
}

export function PageRenderer({
  data,
  products = [],
  collections = [],
  disableNavigation = false,
}) {
  const config = createPageBuilderConfig({ products, collections, disableNavigation })
  const renderData = useMemo(
    () => data || { content: [], root: { props: {} } },
    [data]
  )

  useEffect(() => {
    const previousTitle = typeof document !== 'undefined' ? document.title : ''
    const previousMeta = typeof document !== 'undefined'
      ? document.querySelector('meta[name="description"]')?.getAttribute('content')
      : null

    applyRootMeta(renderData.root?.props || {})

    return () => {
      if (typeof document === 'undefined') return
      document.title = previousTitle
      const meta = document.querySelector('meta[name="description"]')
      if (meta) {
        if (previousMeta === null || previousMeta === undefined) {
          meta.remove()
        } else {
          meta.setAttribute('content', previousMeta)
        }
      }
    }
  }, [renderData])

  return <Render config={config} data={renderData} />
}
