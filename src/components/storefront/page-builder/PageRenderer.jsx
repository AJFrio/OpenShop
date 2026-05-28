import { Render } from '@puckeditor/core'
import { createPageBuilderConfig } from './config'

export function PageRenderer({
  data,
  products = [],
  collections = [],
  disableNavigation = false,
}) {
  const config = createPageBuilderConfig({ products, collections, disableNavigation })
  const renderData = data || { content: [], root: { props: {} } }

  return <Render config={config} data={renderData} />
}
