import { useEffect, useState } from 'react'

function SlotPreview({ file, onClear }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div className="relative w-full h-full">
      <img src={src} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault()
          onClear?.()
        }}
        className="absolute top-1 right-1 bg-white/80 hover:bg-white text-gray-700 rounded px-2 py-0.5 text-xs border"
      >
        Clear
      </button>
    </div>
  )
}

export default function ReferenceSlots({ files, onChange, slots = 4 }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: slots }).map((_, index) => {
        const file = files[index] || null
        const hasFile = !!file
        return (
          <label
            key={index}
            className="aspect-square border rounded-md flex items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 overflow-hidden"
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const nextFile = event.target.files && event.target.files[0] ? event.target.files[0] : null
                onChange(index, nextFile)
              }}
            />
            {hasFile ? (
              <SlotPreview file={file} onClear={() => onChange(index, null)} />
            ) : (
              <div className="flex flex-col items-center text-gray-500 text-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                <span className="mt-1">Add</span>
              </div>
            )}
          </label>
        )
      })}
    </div>
  )
}
