import { useState, useRef } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { normalizeImageUrl } from '../../lib/utils'
import MediaPickerModal from './MediaPickerModal'

export function ImageUrlField({
  value,
  onChange,
  placeholder = 'Image URL',
  onPreview,
  onRemove,
  required = false,
  inputName,
  hideInput = false,
}) {
  const [notice, setNotice] = useState('')
  const timerRef = useRef(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleChange = (e) => {
    const next = maybeNormalizeDriveUrl(e.target.value)
    onChange(next)
  }

  const maybeNormalizeDriveUrl = (input) => {
    const val = (input || '').trim()
    if (!val) return input
    const isDrive = val.includes('drive.google.com') || val.includes('drive.usercontent.google.com')
    if (!isDrive) return input
    const fileMatch = val.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    const idMatch = val.match(/[?&#]id=([a-zA-Z0-9_-]+)/)
    const id = (fileMatch && fileMatch[1]) || (idMatch && idMatch[1]) || null
    const normalized = id
      ? `https://drive.usercontent.google.com/download?id=${id}&export=view`
      : val
    if (normalized !== val) {
      setNotice('Google Drive link detected — converted for reliable preview and delivery.')
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setNotice(''), 3000)
    }
    return normalized
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        {!hideInput && (
          <Input
            name={inputName}
            type="url"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            required={required}
            className="flex-1"
          />
        )}
        <Button type="button" onClick={() => setPickerOpen(true)} className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Upload image
        </Button>
        {value && (
          <button
            type="button"
            className="w-12 h-12 rounded overflow-hidden border bg-white"
            title="Preview"
            onClick={() => onPreview && onPreview(normalizeImageUrl(value))}
          >
            <img src={normalizeImageUrl(value)} alt="preview" className="w-full h-full object-cover" />
          </button>
        )}
        {onRemove && (
          <Button type="button" variant="outline" size="sm" onClick={onRemove} className="px-3">×</Button>
        )}
      </div>
      {notice && (
        <p className="text-xs text-purple-700 mt-2">{notice}</p>
      )}
      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(url) => { onChange(url); setPickerOpen(false) }}
      />
    </div>
  )
}

export default ImageUrlField


