import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] px-3 py-2 text-sm text-[var(--admin-text-primary)]",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-[var(--admin-text-muted)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-bg-primary)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-all duration-150",
        "hover:border-[var(--admin-border-secondary)]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
