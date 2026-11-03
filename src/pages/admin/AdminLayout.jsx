import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { confirmLeaveIfDirty } from '../../lib/dirtyGuard'
import { mustChangePassword } from '../../lib/auth'
import { Button } from '../../components/ui/button'
import {
  Package,
  FolderOpen,
  Home,
  Settings,
  ShoppingBag,
  Image as ImageIcon,
  LayoutTemplate,
  Wrench,
  ShieldAlert,
  LogOut,
  Store,
  CreditCard,
} from 'lucide-react'

const menuItems = [
  { path: '/admin', label: 'Home', icon: Home, end: true },
  { path: '/admin/products', label: 'Products', icon: Package },
  { path: '/admin/collections', label: 'Collections', icon: FolderOpen },
  { path: '/admin/fulfillment', label: 'Fulfillment', icon: ShoppingBag },
  { path: '/admin/media', label: 'Media', icon: ImageIcon },
  { path: '/admin/store-settings', label: 'Store settings', icon: Settings },
  { path: '/admin/pages', label: 'Pages', icon: LayoutTemplate },
  { path: '/admin/developer-settings', label: 'Developer', icon: Wrench },
]

function isNavActive(pathname, item) {
  if (item.end) {
    return pathname === item.path
  }
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}

export function AdminLayout({ onLogout }) {
  const location = useLocation()
  const needsPasswordChange = mustChangePassword()
  const [paymentsEnabled, setPaymentsEnabled] = useState(true)
  const [storeName, setStoreName] = useState('OpenShop')

  useEffect(() => {
    let cancelled = false
    fetch('/api/payments-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setPaymentsEnabled(data.paymentsEnabled !== false)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/store-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.storeName) setStoreName(data.storeName)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-[var(--os-color-bg)] admin-container lg:flex-row">
      <div className="admin-sidebar flex w-full flex-col border-b border-[var(--os-color-border)] lg:w-[var(--os-sidebar-width)] lg:min-h-screen lg:flex-shrink-0 lg:border-b-0 lg:border-r">
        <div className="admin-sidebar-header px-4 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--os-color-text-disabled)]">
            OpenShop
          </p>
          <h1 className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-[var(--os-color-text)]">
            {storeName}
          </h1>
          <Link
            to="/"
            className="mt-1.5 inline-flex items-center text-xs text-[var(--os-color-text-secondary)] transition-colors hover:text-[var(--os-color-text-brand)]"
          >
            <Store className="mr-1 inline h-3.5 w-3.5" />
            View store
          </Link>
        </div>
        <nav className="flex-1 p-2" aria-label="Admin">
          <ul className="grid grid-cols-2 gap-0.5 sm:grid-cols-3 lg:block">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = isNavActive(location.pathname, item)
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={(e) => {
                      if (!confirmLeaveIfDirty()) e.preventDefault()
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`admin-sidebar-link flex items-center gap-3 px-3 py-2 text-sm focus-visible:outline-none focus-visible:shadow-[var(--os-shadow-focus)] ${
                      isActive ? 'active' : ''
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="border-t border-[var(--os-color-border)] p-2">
          <Button
            onClick={onLogout}
            variant="ghost"
            className="w-full justify-start text-[var(--os-color-text-disabled)] hover:text-[var(--os-color-text-critical)] hover:bg-[var(--os-color-bg-fill-critical)] text-sm"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            Log out
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[var(--os-page-max-width)] p-4 sm:p-6 lg:p-8">
        {needsPasswordChange && location.pathname !== '/admin/developer-settings' && (
          <div
            role="alert"
            className="admin-alert admin-alert-error mb-4"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-[var(--os-color-text)]">
                You are using the default admin password
              </p>
              <p className="mt-0.5 text-[var(--os-color-text-secondary)]">
                It is published in the OpenShop README, so anyone can sign in
                to this store.{' '}
                <Link
                  to="/admin/developer-settings"
                  className="underline hover:text-[var(--os-color-text)]"
                >
                  Change it now
                </Link>
                .
              </p>
            </div>
          </div>
        )}
        {!paymentsEnabled && (
          <div
            role="status"
            className="mb-4 flex items-start gap-3 rounded-[var(--os-radius-md)] border border-[var(--os-color-border)] bg-[var(--os-color-bg-surface)] p-3.5"
          >
            <CreditCard className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--os-color-icon)]" />
            <div className="text-sm">
              <p className="font-medium text-[var(--os-color-text)]">
                Payments are not set up yet
              </p>
              <p className="mt-0.5 text-[var(--os-color-text-secondary)]">
                You can add and edit products, but customers cannot check out.
                Add <code>STRIPE_SECRET_KEY</code> under{' '}
                <Link
                  to="/admin/developer-settings"
                  className="underline hover:text-[var(--os-color-text)]"
                >
                  Developer Settings
                </Link>{' '}
                to start accepting payments; products created now sync to
                Stripe the next time they are saved.
              </p>
            </div>
          </div>
        )}
        <Outlet />
        </div>
      </div>
    </div>
  )
}
