import * as React from "react"
import { cn } from "../../lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] px-3 py-2 text-sm text-[var(--admin-text-primary)]",
        "placeholder:text-[var(--admin-text-muted)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-bg-primary)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-all duration-150",
        "hover:border-[var(--admin-border-secondary)]",
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
