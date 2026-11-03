import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"

const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        className={cn(
          "flex h-9 w-full appearance-none rounded-[var(--os-radius-md)] border border-[var(--os-color-border)] bg-[var(--os-color-bg-surface-secondary)] px-3 py-2 text-sm text-[var(--os-color-text)]",
          "focus:outline-none focus:border-[var(--os-color-border-focus)] focus:shadow-[var(--os-shadow-focus)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-[border-color,box-shadow] duration-150",
          "hover:border-[var(--os-color-border-subdued)]",
          "pr-10",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-color-icon)] pointer-events-none" />
    </div>
  )
})
Select.displayName = "Select"

export { Select }
