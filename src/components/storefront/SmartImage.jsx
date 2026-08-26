import { useState } from 'react'
import { Package } from 'lucide-react'

export function SmartImage({ src, alt, className = '', fallbackLabel }) {
  const [failed, setFailed] = useState(false)

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400 ${className}`}
        role="img"
        aria-label={alt || fallbackLabel || 'Product image unavailable'}
      >
        <Package className="w-8 h-8" aria-hidden />
        {(alt || fallbackLabel) && (
          <span className="px-2 text-xs text-center line-clamp-2">{alt || fallbackLabel}</span>
        )}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
