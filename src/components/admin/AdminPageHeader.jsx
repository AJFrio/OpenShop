import { cn } from '../../lib/utils'

export function AdminPageHeader({ title, description, actions, className }) {
  return (
    <header className={cn('admin-page-header', className)}>
      <div className="min-w-0">
        <h1 className="admin-page-title">{title}</h1>
        {description ? <p className="admin-page-description">{description}</p> : null}
      </div>
      {actions ? <div className="admin-page-actions">{actions}</div> : null}
    </header>
  )
}
