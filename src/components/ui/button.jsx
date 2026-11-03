import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--os-radius-md)] text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:shadow-[var(--os-shadow-focus)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--os-color-bg-fill-brand)] text-[var(--os-color-text-on-brand)] hover:bg-[var(--os-color-bg-fill-brand-hover)] hover:shadow-[var(--os-shadow-glow)]",
        destructive:
          "bg-transparent border border-[var(--os-color-text-critical)] text-[var(--os-color-text-critical)] hover:bg-[var(--os-color-bg-fill-critical)]",
        outline:
          "border border-[var(--os-color-border)] bg-[var(--os-color-bg-surface-secondary)] text-[var(--os-color-text)] hover:bg-[var(--os-color-bg-surface-hover)] hover:border-[var(--os-color-border-subdued)]",
        secondary:
          "bg-[var(--os-color-bg-surface-secondary)] text-[var(--os-color-text)] border border-[var(--os-color-border)] hover:bg-[var(--os-color-bg-surface-hover)]",
        ghost: "text-[var(--os-color-text-secondary)] hover:text-[var(--os-color-text)] hover:bg-[var(--os-color-bg-overlay-light)]",
        link: "text-[var(--os-color-text-brand)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-[var(--os-radius-md)] px-3 text-xs",
        lg: "h-10 rounded-[var(--os-radius-md)] px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? "span" : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
