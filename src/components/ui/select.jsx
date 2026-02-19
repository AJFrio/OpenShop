import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"

const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        className={cn(
          "flex h-9 w-full appearance-none rounded-md border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] px-3 py-2 text-sm text-[var(--admin-text-primary)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:ring-offset-2 focus:ring-offset-[var(--admin-bg-primary)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-150",
          "hover:border-[var(--admin-border-secondary)]",
          "pr-10",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)] pointer-events-none" />
    </div>
  )
})
Select.displayName = "Select"

export { Select }
