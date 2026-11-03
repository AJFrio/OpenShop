import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { RevenueChart, OrdersChart } from '../../components/admin/AnalyticsCharts'
import { MetricCard, RecentOrdersCard } from '../../components/admin/AnalyticsCards'
import { AgentChat } from '../../components/admin/AgentChat'
import { adminApiRequest } from '../../lib/auth'
import { BarChart3, ExternalLink } from 'lucide-react'

function greetingForNow(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const [storeName, setStoreName] = useState('your store')
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCollections: 0,
  })
  const [paymentsEnabled, setPaymentsEnabled] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [selectedPeriod])

  const fetchDashboardData = async () => {
    try {
      const [productsResponse, collectionsResponse, settingsResponse, paymentsResponse] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/collections'),
        fetch('/api/store-settings'),
        fetch('/api/payments-status'),
      ])

      const products = productsResponse.ok ? await productsResponse.json() : []
      const collections = collectionsResponse.ok ? await collectionsResponse.json() : []
      const settings = settingsResponse.ok ? await settingsResponse.json() : null
      const payments = paymentsResponse.ok ? await paymentsResponse.json() : null
      const activeProducts = Array.isArray(products) ? products.filter((p) => !p.archived).length : 0

      setStats({
        totalProducts: activeProducts,
        totalCollections: Array.isArray(collections) ? collections.length : 0,
      })
      if (settings?.storeName) setStoreName(settings.storeName)
      if (payments) setPaymentsEnabled(payments.paymentsEnabled !== false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      setAnalyticsError(false)
      const response = await adminApiRequest(`/api/admin/analytics?period=${selectedPeriod}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        console.error('Failed to fetch analytics')
        setAnalyticsError(true)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setAnalyticsError(true)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--os-color-text-disabled)]">
            Home
          </p>
          <h1 className="admin-page-title mt-1">
            {greetingForNow()}, {storeName}
          </h1>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--os-color-text-brand)] hover:underline"
        >
          View storefront
          <ExternalLink className="h-3 w-3" />
        </Link>
      </header>

      <section aria-labelledby="dashboard-pulse-heading" data-testid="dashboard-stats">
        <h2 id="dashboard-pulse-heading" className="sr-only">
          Store pulse
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            title="Sales"
            value={analytics && !analyticsLoading && !analyticsError ? analytics.totalRevenue : '—'}
            change={analytics?.revenueGrowth}
            prefix={analytics && !analyticsLoading && !analyticsError ? '$' : ''}
          />
          <MetricCard
            title="Orders"
            value={analytics && !analyticsLoading && !analyticsError ? analytics.totalOrders : '—'}
            change={analytics?.ordersGrowth}
            href="/admin/fulfillment"
          />
          <MetricCard
            title="Active products"
            value={stats.totalProducts}
            href="/admin/products"
            hint={stats.totalCollections ? `${stats.totalCollections} collections` : 'Catalog'}
          />
          <MetricCard
            title="Store status"
            value={paymentsEnabled ? 'Live' : 'Catalogue'}
            href={paymentsEnabled ? '/' : '/admin/developer-settings'}
            hint={paymentsEnabled ? 'Checkout is on' : 'Payments not set up'}
          />
        </div>
      </section>

      <AgentChat />

      <section className="space-y-4" aria-labelledby="dashboard-overview-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="dashboard-overview-heading"
            className="text-sm font-semibold text-[var(--os-color-text)]"
          >
            Analytics
          </h2>

          <div className="inline-flex rounded-[var(--os-radius-md)] border border-[var(--os-color-border)] bg-[var(--os-color-bg-surface)] p-0.5">
            {[
              { value: '1d', label: '24H' },
              { value: '7d', label: '7D' },
              { value: '30d', label: '30D' },
              { value: '90d', label: '90D' },
              { value: '1y', label: '1Y' },
            ].map((period) => (
              <Button
                key={period.value}
                variant={selectedPeriod === period.value ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedPeriod(period.value)}
                className="h-7 px-2.5 text-xs"
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>

        {analyticsLoading ? (
          <div className="flex h-28 items-center justify-center">
            <div className="admin-spinner"></div>
            <span className="ml-3 text-sm text-[var(--os-color-text-secondary)]">Loading analytics...</span>
          </div>
        ) : analyticsError ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="mx-auto mb-3 h-8 w-8 text-[var(--os-color-icon-secondary)]" />
              <h3 className="mb-1 text-sm font-medium text-[var(--os-color-text)]">Couldn't load analytics</h3>
              <p className="mb-3 text-sm text-[var(--os-color-text-secondary)]">
                Something went wrong while loading analytics data.
              </p>
              <Button variant="outline" size="sm" onClick={fetchAnalytics}>Retry</Button>
            </CardContent>
          </Card>
        ) : analytics ? (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <RevenueChart data={analytics.chartData} period={selectedPeriod} />
              <OrdersChart data={analytics.chartData} period={selectedPeriod} />
            </div>
            <RecentOrdersCard orders={analytics.recentOrders} />
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="mx-auto mb-3 h-8 w-8 text-[var(--os-color-icon-secondary)]" />
              <h3 className="mb-1 text-sm font-medium text-[var(--os-color-text)]">No analytics data</h3>
              <p className="text-sm text-[var(--os-color-text-secondary)]">
                Analytics data will appear here once you have orders.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
