import { normalizeImageUrl } from '../../../lib/utils'

export default function MediaGrid({ items = [], onSelect, emptyMessage }) {
  if (!items.length) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {items.map((item, index) => {
        const url = typeof item === 'string' ? item : item.url
        const key = item.id ?? index
        const title = typeof item === 'string' ? item : item.filename || item.url
        return (
          <button
            key={key}
            type="button"
            className="aspect-square rounded border overflow-hidden bg-white hover:ring-2 hover:ring-purple-500"
            title={title}
            onClick={() => onSelect(url)}
          >
            <img src={normalizeImageUrl(url)} alt={title || 'media'} className="w-full h-full object-cover" />
          </button>
        )
      })}
    </div>
  )
}
