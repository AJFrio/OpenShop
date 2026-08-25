import { useState } from 'react'
import ExistingMediaModal from './ExistingMediaModal'
import { normalizeImageUrl } from '../../lib/utils'

export function PuckImageField({ value, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="space-y-2">
      {value ? (
        <img
          src={normalizeImageUrl(value)}
          alt=""
          className="h-24 w-full rounded-md border border-gray-200 bg-white object-cover"
        />
      ) : null}
      <input
        type="text"
        value={value || ''}
        placeholder="Pick from library or paste a URL"
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50"
        >
          Choose from library
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-md border border-transparent px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Clear
          </button>
        ) : null}
      </div>
      <ExistingMediaModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(url) => onChange(url)}
      />
    </div>
  )
}
