import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-bg-primary)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--admin-accent)] text-white hover:bg-[var(--admin-accent-hover)] hover:shadow-[var(--admin-shadow-glow)]",
        destructive:
          "bg-transparent border border-[var(--admin-error)] text-[var(--admin-error)] hover:bg-[var(--admin-error-bg)]",
        outline:
          "border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-card)] hover:border-[var(--admin-border-secondary)]",
        secondary:
          "bg-[var(--admin-bg-elevated)] text-[var(--admin-text-primary)] border border-[var(--admin-border-primary)] hover:bg-[var(--admin-bg-card)]",
        ghost: "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-overlay-light)]",
        link: "text-[var(--admin-accent-light)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
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
