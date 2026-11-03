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
        checked ? "bg-[var(--os-color-bg-fill-brand)]" : "bg-[var(--os-color-bg-surface-secondary)]",
        "focus-visible:outline-none focus-visible:shadow-[var(--os-shadow-focus)]",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  )
}
