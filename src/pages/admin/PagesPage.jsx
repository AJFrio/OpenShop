import { lazy, Suspense } from 'react'

const PuckPageEditor = lazy(() =>
  import('../../components/admin/PuckPageEditor').then((module) => ({ default: module.PuckPageEditor }))
)

export function PagesPage() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[var(--admin-text-primary)]">Pages</h1>
        <p className="text-xs text-[var(--admin-text-secondary)]">
          Build the Home and About pages with reusable storefront blocks.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="rounded-lg border border-[var(--admin-border-primary)] bg-[var(--admin-bg-card)] p-6 text-sm text-[var(--admin-text-muted)]">
            Loading page editor...
          </div>
        }
      >
        <PuckPageEditor />
      </Suspense>
    </div>
  )
}
