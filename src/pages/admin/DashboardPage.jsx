import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { RevenueChart, OrdersChart } from '../../components/admin/AnalyticsCharts'
import { MetricCard, RecentOrdersCard } from '../../components/admin/AnalyticsCards'
import { formatCurrency } from '../../lib/utils'
import { adminApiRequest } from '../../lib/auth'
import { Package, Edit, DollarSign, ShoppingBag, BarChart3 } from 'lucide-react'

export function DashboardPage() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCollections: 0,
    recentProducts: [],
  })
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
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
        recentProducts: products.slice(0, 5),
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      const response = await adminApiRequest(`/api/admin/analytics?period=${selectedPeriod}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        console.error('Failed to fetch analytics')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-[var(--admin-text-primary)]">Dashboard</h1>

        <div className="flex gap-1.5">
          {[
            { value: '1d', label: '24H' },
            { value: '7d', label: '7D' },
            { value: '30d', label: '30D' },
            { value: '90d', label: '90D' },
            { value: '1y', label: '1Y' },
          ].map((period) => (
            <Button
              key={period.value}
              variant={selectedPeriod === period.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period.value)}
              className="text-xs px-3"
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>

      {analyticsLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="admin-spinner"></div>
          <span className="ml-3 text-[var(--admin-text-secondary)]">Loading analytics...</span>
        </div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <MetricCard title="Products" value={stats.totalProducts} icon={Package} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RevenueChart data={analytics.chartData} period={selectedPeriod} />
            <OrdersChart data={analytics.chartData} period={selectedPeriod} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RecentOrdersCard orders={analytics.recentOrders} />

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Recent Products</h3>
                  <Package className="w-4 h-4 text-[var(--admin-text-muted)]" />
                </div>
                {stats.recentProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-[var(--admin-border-secondary)] mx-auto mb-3" />
                    <p className="text-[var(--admin-text-muted)]">No products created yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.recentProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 bg-[var(--admin-bg-elevated)] rounded-lg border border-[var(--admin-border-primary)]"
                      >
                        <div>
                          <h4 className="font-medium text-[var(--admin-text-primary)] text-sm">{product.name}</h4>
                          <p className="text-xs text-[var(--admin-text-secondary)]">
                            {formatCurrency(product.price, product.currency)}
                          </p>
                        </div>
                        <Link to={`/admin/products/${product.id}/edit`}>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-[var(--admin-border-secondary)] mx-auto mb-4" />
            <h3 className="text-base font-medium text-[var(--admin-text-primary)] mb-2">No Analytics Data</h3>
            <p className="text-[var(--admin-text-secondary)] text-sm">
              Analytics data will appear here once you have orders.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
