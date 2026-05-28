import { Link, Outlet, useLocation } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import {
  Package,
  FolderOpen,
  Home,
  Settings,
  ShoppingBag,
  Image as ImageIcon,
  LogOut,
  Store,
} from 'lucide-react'

const menuItems = [
  { path: '/admin', label: 'Dashboard', icon: Home, end: true },
  { path: '/admin/products', label: 'Products', icon: Package },
  { path: '/admin/collections', label: 'Collections', icon: FolderOpen },
  { path: '/admin/fulfillment', label: 'Fulfillment', icon: ShoppingBag },
  { path: '/admin/media', label: 'Media', icon: ImageIcon },
  { path: '/admin/store-settings', label: 'Store Settings', icon: Settings },
]

function isNavActive(pathname, item) {
  if (item.end) {
    return pathname === item.path
  }
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}

export function AdminLayout({ onLogout }) {
  const location = useLocation()

  return (
    <div className="flex min-h-screen flex-col bg-[var(--admin-bg-primary)] admin-container lg:flex-row">
      <div className="bg-[var(--admin-bg-secondary)] border-b border-[var(--admin-border-primary)] lg:w-64 lg:min-h-screen lg:border-b-0 lg:border-r flex flex-col">
        <div className="p-5 border-b border-[var(--admin-border-primary)]">
          <h1 className="text-lg font-bold text-[var(--admin-text-primary)]">OpenShop Admin</h1>
          <Link
            to="/"
            className="text-xs text-[var(--admin-text-secondary)] hover:text-[var(--admin-accent-light)] transition-colors mt-1 inline-block"
          >
            <Store className="mr-1 inline h-3.5 w-3.5" />
            Back to Store
          </Link>
        </div>
        <nav className="flex-1 p-3">
          <ul className="flex gap-1 overflow-x-auto lg:block lg:space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = isNavActive(location.pathname, item)
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex whitespace-nowrap items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--admin-accent)]/15 text-[var(--admin-accent-light)] border-l-2 border-[var(--admin-accent)]'
                        : 'text-[var(--admin-text-secondary)] hover:bg-[var(--admin-overlay-light)] hover:text-[var(--admin-text-primary)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="p-3 border-t border-[var(--admin-border-primary)]">
          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full border-[var(--admin-error)] text-[var(--admin-error)] hover:bg-[var(--admin-error-bg)] text-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 sm:p-5">
        <Outlet />
      </div>
    </div>
  )
}
