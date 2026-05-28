import * as React from "react"
import { cn } from "../../lib/utils"

// Minimal shadcn-style AlertDialog for this project (no portals for simplicity)

const AlertDialogContext = React.createContext({ open: false, setOpen: () => {} })

export function AlertDialog({ open, onOpenChange, children }) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = typeof open === 'boolean'
  const actualOpen = isControlled ? open : internalOpen
  const setOpen = (v) => {
    if (isControlled && onOpenChange) onOpenChange(v)
    if (!isControlled) setInternalOpen(v)
  }
  return (
    <AlertDialogContext.Provider value={{ open: actualOpen, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  )
}

export function AlertDialogTrigger({ asChild = false, children }) {
  const { setOpen } = React.useContext(AlertDialogContext)
  const props = { onClick: () => setOpen(true) }
  return asChild && React.isValidElement(children)
    ? React.cloneElement(children, props)
    : <button {...props}>{children}</button>
}

export function AlertDialogContent({ children, className }) {
  const { open, setOpen } = React.useContext(AlertDialogContext)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div
        className={cn(
          "relative w-full max-w-md mx-4 rounded-lg border border-[var(--admin-border-primary)] bg-[var(--admin-bg-card)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-lg)]",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function AlertDialogHeader({ children }) {
  return <div className="p-6 pb-2">{children}</div>
}

export function AlertDialogTitle({ children }) {
  return <h2 className="text-lg font-semibold text-[var(--admin-text-primary)]">{children}</h2>
}

export function AlertDialogDescription({ children }) {
  return <p className="mt-2 text-sm text-[var(--admin-text-secondary)]">{children}</p>
}

export function AlertDialogFooter({ children }) {
  return <div className="p-6 pt-2 flex justify-end gap-2">{children}</div>
}

export function AlertDialogCancel({ children, onClick, disabled, className }) {
  const { setOpen } = React.useContext(AlertDialogContext)
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-md border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] text-sm text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-card)] disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      onClick={(e) => { onClick?.(e); setOpen(false) }}
    >
      {children}
    </button>
  )
}

export function AlertDialogAction({ children, onClick, disabled, variant = 'default', className }) {
  const { setOpen } = React.useContext(AlertDialogContext)
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-md text-sm font-medium disabled:pointer-events-none disabled:opacity-50",
        variant === 'destructive'
          ? "border border-[var(--admin-error)] bg-transparent text-[var(--admin-error)] hover:bg-[var(--admin-error-bg)]"
          : "bg-[var(--admin-accent)] text-white hover:bg-[var(--admin-accent-hover)]",
        className
      )}
      onClick={(e) => {
        const result = onClick?.(e)
        if (result !== false) setOpen(false)
      }}
    >
      {children}
    </button>
  )
}


