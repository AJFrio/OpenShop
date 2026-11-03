import * as React from "react"
import { cn } from "../../lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-[var(--os-radius-md)] border border-[var(--os-color-border)] bg-[var(--os-color-bg-surface-secondary)] px-3 py-2 text-sm text-[var(--os-color-text)]",
        "placeholder:text-[var(--os-color-text-disabled)]",
        "focus-visible:outline-none focus-visible:border-[var(--os-color-border-focus)] focus-visible:shadow-[var(--os-shadow-focus)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-[border-color,box-shadow] duration-150",
        "hover:border-[var(--os-color-border-subdued)]",
        "resize-y",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
