export default function MediaModalLayout({ open, title, onClose, children, footer }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[80vh] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="p-3 border-t flex justify-end flex-shrink-0">{footer}</div>}
      </div>
    </div>
  )
}
