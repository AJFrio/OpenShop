import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { RevenueChart, OrdersChart } from '../../components/admin/AnalyticsCharts'
import { MetricCard, RecentOrdersCard } from '../../components/admin/AnalyticsCards'
import { AgentChat } from '../../components/admin/AgentChat'
import { adminApiRequest } from '../../lib/auth'
import { Package, DollarSign, ShoppingBag, BarChart3, Plus } from 'lucide-react'

export function DashboardPage() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCollections: 0,
  })
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')

  useEffect(() => {
    fetchDashboardData()
    fetchAnalytics()
  }, [selectedPeriod])

  const fetchDashboardData = async () => {
    try {
      const [productsResponse, collectionsResponse] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/collections'),
      ])

      const products = productsResponse.ok ? await productsResponse.json() : []
      const collections = collectionsResponse.ok ? await collectionsResponse.json() : []

      setStats({
        totalProducts: products.length,
        totalCollections: collections.length,
      })
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
    <div className="space-y-8">
      <h1 className="sr-only">Dashboard</h1>
      <AgentChat />

      <section className="space-y-5" aria-labelledby="dashboard-overview-heading" data-testid="dashboard-stats">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="dashboard-overview-heading"
            className="text-lg font-semibold text-[var(--admin-text-primary)]"
          >
            Overview
          </h2>

          <div className="flex gap-1">
            {[
              { value: '1d', label: '24H' },
              { value: '7d', label: '7D' },
              { value: '30d', label: '30D' },
              { value: '90d', label: '90D' },
              { value: '1y', label: '1Y' },
            ].map((period) => (
              <Button
                key={period.value}
                variant={selectedPeriod === period.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedPeriod(period.value)}
                className="px-2.5 text-xs"
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link to="/admin/products/new" className="contents">
            <Button variant="outline" className="h-10 text-sm">
              <Plus className="mr-2 h-4 w-4" />
              New product
            </Button>
          </Link>
          <Link to="/admin/fulfillment" className="contents">
            <Button variant="outline" className="h-10 text-sm">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Manage orders
            </Button>
          </Link>
          <Link to="/admin/collections" className="contents">
            <Button variant="outline" className="h-10 text-sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              Collections
            </Button>
          </Link>
        </div>

        {analyticsLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="admin-spinner"></div>
            <span className="ml-3 text-sm text-[var(--admin-text-secondary)]">Loading analytics...</span>
          </div>
        ) : analyticsError ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="mx-auto mb-4 h-12 w-12 text-[var(--admin-border-secondary)]" />
              <h3 className="mb-2 text-base font-medium text-[var(--admin-text-primary)]">Couldn't load analytics</h3>
              <p className="mb-4 text-sm text-[var(--admin-text-secondary)]">
                Something went wrong while loading analytics data.
              </p>
              <Button variant="outline" size="sm" onClick={fetchAnalytics}>Retry</Button>
            </CardContent>
          </Card>
        ) : analytics ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Products" value={stats.totalProducts} icon={Package} />
              <MetricCard
                title="Total Revenue"
                value={analytics.totalRevenue}
                change={analytics.revenueGrowth}
                icon={DollarSign}
                prefix="$"
              />
              <MetricCard
                title="Total Orders"
                value={analytics.totalOrders}
                change={analytics.ordersGrowth}
                icon={ShoppingBag}
              />
              <MetricCard
                title="Average Order"
                value={analytics.averageOrderValue}
                icon={BarChart3}
                prefix="$"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <RevenueChart data={analytics.chartData} period={selectedPeriod} />
              <OrdersChart data={analytics.chartData} period={selectedPeriod} />
            </div>

            <RecentOrdersCard orders={analytics.recentOrders} />
          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="mx-auto mb-4 h-12 w-12 text-[var(--admin-border-secondary)]" />
              <h3 className="mb-2 text-base font-medium text-[var(--admin-text-primary)]">No Analytics Data</h3>
              <p className="text-sm text-[var(--admin-text-secondary)]">
                Analytics data will appear here once you have orders.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
