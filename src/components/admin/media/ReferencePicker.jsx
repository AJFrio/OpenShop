import { Button } from '../../ui/button'

export default function ReferencePicker({
  open,
  loading,
  items,
  selected,
  onToggle,
  onClear,
  onApply,
  onClose,
}) {
  if (!open) return null

  const footer = (
    <div className="mt-3 flex items-center justify-between text-sm">
      <div className="text-gray-600">{selected.size}/3 selected</div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onClear}>
          Clear
        </Button>
        <Button type="button" onClick={onApply} disabled={selected.size === 0}>
          Use selected
        </Button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-semibold">Select reference images</h4>
          <button className="text-sm underline" onClick={onClose}>
            Close
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-80 overflow-auto">
            {items.map((url, index) => {
              const isSelected = selected.has(url)
              return (
                <button
                  key={index}
                  type="button"
                  className={`relative aspect-square rounded border overflow-hidden ${
                    isSelected ? 'ring-2 ring-purple-500' : 'hover:ring-2 hover:ring-purple-300'
                  }`}
                  onClick={() => onToggle(url)}
                >
                  <img src={url} alt="library" className="w-full h-full object-cover" />
                  {isSelected && (
                    <span className="absolute top-1 left-1 bg-purple-600 text-white text-[10px] px-1 rounded">
                      Selected
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
        {footer}
      </div>
    </div>
  )
}
