import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { isAdminAuthenticated, clearAdminToken } from '../../lib/auth'
import { AdminLogin } from '../../components/admin/AdminLogin'
import { AdminLayout } from './AdminLayout'
import { DashboardPage } from './DashboardPage'
import { ProductsPage } from './ProductsPage'
import { CollectionsPage } from './CollectionsPage'
import { MediaLibraryPage } from './MediaLibraryPage'
import { StoreSettingsPage } from './StoreSettingsPage'
import { FulfillmentPage } from './FulfillmentPage'

export function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const authenticated = isAdminAuthenticated()
    setIsAuthenticated(authenticated)
    setLoading(false)

    const handleLogout = () => setIsAuthenticated(false)
    const handleLogin = () => setIsAuthenticated(true)
    window.addEventListener('openshop-admin-logout', handleLogout)
    window.addEventListener('openshop-admin-login', handleLogin)
    return () => {
      window.removeEventListener('openshop-admin-logout', handleLogout)
      window.removeEventListener('openshop-admin-login', handleLogin)
    }
  }, [])

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    clearAdminToken()
    setIsAuthenticated(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg-primary)] flex items-center justify-center">
        <div className="admin-spinner"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <Routes>
      <Route element={<AdminLayout onLogout={handleLogout} />}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="Fulfillment" element={<FulfillmentPage />} />
        <Route path="media" element={<MediaLibraryPage />} />
        <Route path="store-settings" element={<StoreSettingsPage />} />
      </Route>
    </Routes>
  )
}
