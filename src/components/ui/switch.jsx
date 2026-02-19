import * as React from "react"
import { cn } from "../../lib/utils"

export function Switch({ checked = false, onCheckedChange, className, id }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      type="button"
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-[var(--admin-accent)]" : "bg-[var(--admin-bg-elevated)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-bg-primary)]",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  )
}
