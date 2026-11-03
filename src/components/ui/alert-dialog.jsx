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
      <div className="admin-modal-overlay absolute inset-0" onClick={() => setOpen(false)} />
      <div
        className={cn(
          "admin-modal relative w-full max-w-md mx-4 text-[var(--os-color-text)]",
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
  return <h2 className="text-lg font-semibold text-[var(--os-color-text)]">{children}</h2>
}

export function AlertDialogDescription({ children }) {
  return <p className="mt-2 text-sm text-[var(--os-color-text-secondary)]">{children}</p>
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
        "px-4 py-2 rounded-[var(--os-radius-md)] border border-[var(--os-color-border)] bg-[var(--os-color-bg-surface-secondary)] text-sm text-[var(--os-color-text)] hover:bg-[var(--os-color-bg-surface-hover)] disabled:pointer-events-none disabled:opacity-50",
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
          ? "border border-[var(--os-color-text-critical)] bg-transparent text-[var(--os-color-text-critical)] hover:bg-[var(--os-color-bg-fill-critical)]"
          : "bg-[var(--os-color-bg-fill-brand)] text-[var(--os-color-text-on-brand)] hover:bg-[var(--os-color-bg-fill-brand-hover)]",
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


