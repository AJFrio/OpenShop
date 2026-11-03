import { lazy, Suspense } from 'react'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'

const PuckPageEditor = lazy(() =>
  import('../../components/admin/PuckPageEditor').then((module) => ({ default: module.PuckPageEditor }))
)

export function PagesPage() {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Pages"
        description="Build the Home and About pages with reusable storefront blocks."
      />
      <Suspense
        fallback={
          <div className="admin-card p-6 text-sm text-[var(--os-color-text-disabled)]">
            Loading page editor...
          </div>
        }
      >
        <PuckPageEditor />
      </Suspense>
    </div>
  )
}
