import { useState } from 'react'
import { Button } from '../ui/button'
import { normalizeImageUrl } from '../../lib/utils'
import ExistingMediaModal from './ExistingMediaModal'

export function VariantImageSelector({
  value,
  onChange,
  onPreview,
  placeholder = 'Select image'
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleImageClick = () => {
    if (value) {
      // If there's a value, open the media picker to change it
      setPickerOpen(true)
    } else {
      // If no value, open the media picker to select one
      setPickerOpen(true)
    }
  }

  const handleMediaSelect = (url) => {
    onChange(url)
    setPickerOpen(false)
  }

  if (!value) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          className="w-16 h-16 p-0 flex flex-col items-center justify-center text-xs"
          onClick={handleImageClick}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14"/>
            <path d="M5 12h14"/>
          </svg>
          <span className="mt-1">Add</span>
        </Button>
        <ExistingMediaModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPick={handleMediaSelect}
        />
      </>
    )
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          className="w-16 h-16 rounded overflow-hidden border bg-white hover:opacity-80 transition-opacity"
          onClick={handleImageClick}
          title="Click to change image"
        >
          <img
            src={normalizeImageUrl(value)}
            alt="preview"
            className="w-full h-full object-cover"
          />
        </button>
        <button
          type="button"
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
          onClick={(e) => {
            e.stopPropagation()
            onChange('')
          }}
          title="Remove image"
        >
          ×
        </button>
      </div>
      <ExistingMediaModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handleMediaSelect}
      />
    </>
  )
}

export default VariantImageSelector

