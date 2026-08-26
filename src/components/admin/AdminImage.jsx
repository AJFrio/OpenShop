import { useState } from 'react'
import { Package } from 'lucide-react'

export function AdminImage({ src, alt, className, fallbackClassName }) {
  const [failed, setFailed] = useState(false)

  if (failed || !src) {
    return (
      <div className={`flex items-center justify-center bg-[var(--admin-bg-secondary)] ${fallbackClassName || className}`}>
        <Package className="h-6 w-6 text-[var(--admin-text-muted)]" aria-hidden />
        <span className="sr-only">{alt}</span>
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
