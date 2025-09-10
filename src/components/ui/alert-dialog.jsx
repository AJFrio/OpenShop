import * as React from "react"

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

export function AlertDialogContent({ children }) {
  const { open, setOpen } = React.useContext(AlertDialogContext)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        {children}
      </div>
    </div>
  )
}

export function AlertDialogHeader({ children }) {
  return <div className="p-6 pb-2">{children}</div>
}

export function AlertDialogTitle({ children }) {
  return <h2 className="text-lg font-semibold text-gray-900">{children}</h2>
}

export function AlertDialogDescription({ children }) {
  return <p className="mt-2 text-sm text-gray-600">{children}</p>
}

export function AlertDialogFooter({ children }) {
  return <div className="p-6 pt-2 flex justify-end gap-2">{children}</div>
}

export function AlertDialogCancel({ children, onClick }) {
  const { setOpen } = React.useContext(AlertDialogContext)
  return (
    <button
      type="button"
      className="px-4 py-2 rounded border hover:bg-gray-50"
      onClick={(e) => { onClick?.(e); setOpen(false) }}
    >
      {children}
    </button>
  )
}

export function AlertDialogAction({ children, onClick }) {
  const { setOpen } = React.useContext(AlertDialogContext)
  return (
    <button
      type="button"
      className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600"
      onClick={(e) => { onClick?.(e); setOpen(false) }}
    >
      {children}
    </button>
  )
}


