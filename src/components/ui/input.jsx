import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-[var(--os-radius-md)] border border-[var(--os-color-border)] bg-[var(--os-color-bg-surface-secondary)] px-3 py-2 text-sm text-[var(--os-color-text)]",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-[var(--os-color-text-disabled)]",
        "focus-visible:outline-none focus-visible:border-[var(--os-color-border-focus)] focus-visible:shadow-[var(--os-shadow-focus)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-[border-color,box-shadow] duration-150",
        "hover:border-[var(--os-color-border-subdued)]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
