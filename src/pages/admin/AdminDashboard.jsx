import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { isAdminAuthenticated, clearAdminToken } from '../../lib/auth'
import { AdminLogin } from '../../components/admin/AdminLogin'
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { CollectionForm } from '../../components/admin/CollectionForm'
import { StoreSettingsEditor } from '../../components/admin/StoreSettingsEditor'
import { ProductWorkspace } from '../../components/admin/ProductWorkspace'
import { RevenueChart, OrdersChart } from '../../components/admin/AnalyticsCharts'
import { MetricCard, RecentOrdersCard } from '../../components/admin/AnalyticsCards'
import { formatCurrency, normalizeImageUrl } from '../../lib/utils'
import { adminApiRequest } from '../../lib/auth'
import { 
  Package, FolderOpen, Plus, Edit, Trash2, Home, Settings, 
  DollarSign, ShoppingBag, BarChart3, Image as ImageIcon, X, LogOut 
} from 'lucide-react'
import AddMediaModal from '../../components/admin/AddMediaModal'
import { Switch } from '../../components/ui/switch'

function AdminSidebar({ onLogout }) {
  const location = useLocation()
  
  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: Home },
    { path: '/admin/products', label: 'Products', icon: Package },
    { path: '/admin/collections', label: 'Collections', icon: FolderOpen },
    { path: '/admin/Fulfillment', label: 'Fulfillment', icon: ShoppingBag },
    { path: '/admin/media', label: 'Media', icon: ImageIcon },
    { path: '/admin/store-settings', label: 'Store Settings', icon: Settings },
  ]

  return (
    <div className="w-64 bg-[var(--admin-bg-secondary)] border-r border-[var(--admin-border-primary)] min-h-screen flex flex-col">
      <div className="p-5 border-b border-[var(--admin-border-primary)]">
        <h1 className="text-lg font-bold text-[var(--admin-text-primary)]">OpenShop Admin</h1>
        <Link to="/" className="text-xs text-[var(--admin-text-secondary)] hover:text-[var(--admin-accent-light)] transition-colors mt-1 inline-block">
          ← Back to Store
        </Link>
      </div>
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
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
      
      {/* Logout Button */}
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
  )
}

function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCollections: 0,
    recentProducts: []
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
        fetch('/api/collections')
      ])

      const products = productsResponse.ok ? await productsResponse.json() : []
      const collections = collectionsResponse.ok ? await collectionsResponse.json() : []

      setStats({
        totalProducts: products.length,
        totalCollections: collections.length,
        recentProducts: products.slice(0, 5)
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
        
        {/* Period Selector */}
        <div className="flex gap-1.5">
          {[
            { value: '1d', label: '24H' },
            { value: '7d', label: '7D' },
            { value: '30d', label: '30D' },
            { value: '90d', label: '90D' },
            { value: '1y', label: '1Y' }
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
          {/* Analytics Cards */}
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
            <MetricCard
              title="Products"
              value={stats.totalProducts}
              icon={Package}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RevenueChart data={analytics.chartData} period={selectedPeriod} />
            <OrdersChart data={analytics.chartData} period={selectedPeriod} />
          </div>

          {/* Recent Orders and Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RecentOrdersCard orders={analytics.recentOrders} />
            
            {/* Recent Products */}
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
                      <div key={product.id} className="flex items-center justify-between p-3 bg-[var(--admin-bg-elevated)] rounded-lg border border-[var(--admin-border-primary)]">
                        <div>
                          <h4 className="font-medium text-[var(--admin-text-primary)] text-sm">{product.name}</h4>
                          <p className="text-xs text-[var(--admin-text-secondary)]">{formatCurrency(product.price, product.currency)}</p>
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
            <p className="text-[var(--admin-text-secondary)] text-sm">Analytics data will appear here once you have orders.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ProductsManager() {
  return <ProductWorkspace />
}

function CollectionsManager() {
  const [collections, setCollections] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingCollection, setEditingCollection] = useState(null)
  const [archivedFilter, setArchivedFilter] = useState('all')

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      const response = await adminApiRequest('/api/admin/collections')
      if (response.ok) {
        const data = await response.json()
        setCollections(data)
      }
    } catch (error) {
      console.error('Error fetching collections:', error)
    }
  }

  const handleSaveCollection = (collection) => {
    if (editingCollection) {
      setCollections(collections.map(c => c.id === collection.id ? collection : c))
    } else {
      setCollections([...collections, collection])
    }
    setShowForm(false)
    setEditingCollection(null)
  }

  const handleDeleteCollection = async (collectionId) => {
    if (!confirm('Are you sure you want to delete this collection?')) return

    try {
      const response = await adminApiRequest(`/api/admin/collections/${collectionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCollections(collections.filter(c => c.id !== collectionId))
      }
    } catch (error) {
      console.error('Error deleting collection:', error)
    }
  }

  if (showForm) {
    return (
      <div className="flex justify-center">
        <CollectionForm
          collection={editingCollection}
          onSave={handleSaveCollection}
          onCancel={() => {
            setShowForm(false)
            setEditingCollection(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-[var(--admin-text-primary)]">Collections</h1>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Collection
        </Button>
      </div>

      {/* Filters */}
      <div className="max-w-xs">
        <label className="block text-xs font-semibold uppercase text-[var(--admin-text-secondary)] mb-2">Filter by Archived</label>
        <Select value={archivedFilter} onChange={(e) => setArchivedFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {collections.filter(c => archivedFilter === 'all' ? true : archivedFilter === 'archived' ? !!c.archived : !c.archived).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-12 h-12 text-[var(--admin-text-muted)] mx-auto mb-4" />
            <h3 className="text-base font-medium text-[var(--admin-text-primary)] mb-2">No collections yet</h3>
            <p className="text-[var(--admin-text-secondary)] text-sm mb-6">Organize your products by creating collections.</p>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {collections.filter(c => archivedFilter === 'all' ? true : archivedFilter === 'archived' ? !!c.archived : !c.archived).map((collection) => (
            <Card key={collection.id} className="hover:border-[var(--admin-border-secondary)] transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-[var(--admin-text-primary)]">{collection.name}</h3>
                    <p className="text-xs text-[var(--admin-text-secondary)]">{collection.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-[var(--admin-text-secondary)]">
                      <Switch
                        checked={!!collection.archived}
                        onCheckedChange={async (v) => {
                          const updated = { archived: v }
                          const res = await adminApiRequest(`/api/admin/collections/${collection.id}`, { method: 'PUT', body: JSON.stringify(updated) })
                          if (res.ok) {
                            const saved = await res.json()
                            setCollections(collections.map(c => c.id === saved.id ? saved : c))
                          }
                        }}
                      />
                      Archived
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5"
                      onClick={() => {
                        setEditingCollection(collection)
                        setShowForm(true)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 px-2.5"
                      onClick={() => handleDeleteCollection(collection.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function MediaLibrary() {
  const [media, setMedia] = useState([])
  const [selected, setSelected] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const res = await adminApiRequest('/api/admin/media', { method: 'GET' })
      if (!res.ok) throw new Error('Failed to fetch media')
      const data = await res.json()
      const sorted = Array.isArray(data) ? data : []
      setMedia(sorted)
    } catch (e) {
      console.error('Error fetching media:', e)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this media from the library?')) return
    try {
      const res = await adminApiRequest(`/api/admin/media/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMedia(media.filter(m => m.id !== id))
      }
    } catch (e) {
      console.error('Delete media failed', e)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-[var(--admin-text-primary)]">Media</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} size="sm">Refresh</Button>
          <Button onClick={() => setAddOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add media
          </Button>
        </div>
      </div>

      {media.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ImageIcon className="w-12 h-12 text-[var(--admin-border-secondary)] mx-auto mb-4" />
            <h3 className="text-base font-medium text-[var(--admin-text-primary)] mb-2">No media yet</h3>
            <p className="text-[var(--admin-text-secondary)] text-sm">Use Add media to upload, link, or generate images.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {media.map((m) => (
            <div key={m.id} className="group relative rounded-lg overflow-hidden border border-[var(--admin-border-primary)] hover:border-[var(--admin-border-secondary)] hover:shadow-[var(--admin-shadow)] transition-all">
              <button
                onClick={() => setSelected(m)}
                className="block w-full h-full"
                title={m.filename || m.url}
              >
                <img src={normalizeImageUrl(m.url)} alt={m.filename || 'media'} className="w-full h-28 object-cover" />
              </button>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => handleDelete(m.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-[var(--admin-bg-card)] rounded-lg shadow-[var(--admin-shadow-lg)] max-w-3xl w-full mx-4 relative flex flex-col max-h-[80vh] overflow-hidden border border-[var(--admin-border-primary)]" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-3 right-3 p-2 rounded-full border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] hover:bg-[var(--admin-bg-secondary)] transition-colors" onClick={() => setSelected(null)} aria-label="Close">
              <X className="w-5 h-5 text-[var(--admin-text-secondary)]" />
            </button>
            <div className="flex-1 overflow-auto p-4">
              <img src={normalizeImageUrl(selected.url)} alt={selected.filename || 'media'} className="block max-w-full max-h-full object-contain mx-auto" />
            </div>
            <div className="p-4 border-t border-[var(--admin-border-primary)] space-y-2 flex-shrink-0">
              <p className="text-sm text-[var(--admin-text-secondary)] break-all">{selected.filename || selected.url}</p>
              <div className="flex gap-4 items-center text-sm">
                <a href={selected.url} target="_blank" rel="noreferrer" className="text-[var(--admin-accent-light)] hover:underline">Open original</a>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddMediaModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(items) => {
          const array = Array.isArray(items) ? items : [items]
          setMedia([...array, ...media])
          setAddOpen(false)
        }}
      />
    </div>
  )
}

function StoreSettingsManager() {
  return <StoreSettingsEditor />
}

function FulfillmentManager() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cursorNext, setCursorNext] = useState(null)
  const [cursorPrev, setCursorPrev] = useState(null)
  const [direction, setDirection] = useState('next')
  const [showFulfilled, setShowFulfilled] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const limit = 25

  useEffect(() => {
    fetchOrders()
  }, [])

  // Reset cursors when filter changes to ensure fresh results
  useEffect(() => {
    setCursorNext(null)
    setCursorPrev(null)
    fetchOrders()
  }, [showFulfilled])

  const fetchOrders = async (dir = 'next', cursor) => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({
        limit: String(limit),
        showFulfilled: String(showFulfilled)
      })
      if (cursor) params.set('cursor', cursor)
      if (dir) params.set('direction', dir)
      const res = await adminApiRequest(`/api/admin/orders?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch orders')
      const data = await res.json()
      setOrders(data.orders || [])
      setCursorNext(data.cursors?.next || null)
      setCursorPrev(data.cursors?.prev || null)
      setDirection(dir)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fulfillOrder = async (orderId) => {
    try {
      const res = await adminApiRequest(`/api/admin/orders/${orderId}/fulfill`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to fulfill order')
      // Refresh orders
      await fetchOrders(direction, cursorNext || cursorPrev)
      setIsModalOpen(false)
      setSelectedOrder(null)
    } catch (e) {
      setError(e.message)
    }
  }

  const openOrderModal = (order) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }

  const printShippingLabel = async (order) => {
    if (!order.shipping || !order.shipping.address) {
      alert('No shipping address available for this order')
      return
    }

    try {
      // Fetch store settings for business address
      const response = await fetch('/api/store-settings')
      const storeSettings = await response.json()

      const shipping = order.shipping
      const labelWindow = window.open('', '_blank')

      // Build business address lines
      const businessLines = []
      if (storeSettings.businessName) businessLines.push(storeSettings.businessName)
      if (storeSettings.businessAddressLine1) businessLines.push(storeSettings.businessAddressLine1)
      if (storeSettings.businessAddressLine2) businessLines.push(storeSettings.businessAddressLine2)
      const cityLine = [storeSettings.businessCity, storeSettings.businessState, storeSettings.businessPostalCode].filter(Boolean).join(', ')
      if (cityLine) businessLines.push(cityLine)
      if (storeSettings.businessCountry) businessLines.push(storeSettings.businessCountry)

      const businessAddress = businessLines.length > 0 ? businessLines.join('<br>') : 'Business Address Not Set<br>Please configure in Store Settings'

      labelWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Shipping Label - Order ${order.id.slice(-8)}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                margin: 0;
                padding: 10px;
                background: white;
                color: #000;
              }
              .label-container {
                width: 4in;
                min-height: 6in;
                border: 2px solid #000;
                padding: 15px;
                margin: 0 auto;
                background: white;
                box-sizing: border-box;
                position: relative;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 8px;
                margin-bottom: 15px;
                font-weight: bold;
                font-size: 16px;
                letter-spacing: 1px;
              }
              .section {
                margin-bottom: 12px;
                display: flex;
                flex-direction: column;
              }
              .section:last-child {
                margin-bottom: 0;
              }
              .address-label {
                font-weight: bold;
                font-size: 11px;
                margin-bottom: 3px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 1px solid #ccc;
                padding-bottom: 2px;
              }
              .address-lines {
                font-size: 12px;
                line-height: 1.3;
                margin-top: 2px;
              }
              .from-section {
                margin-bottom: 15px;
                padding-bottom: 8px;
                border-bottom: 1px dashed #666;
              }
              .shipping-section {
                flex-grow: 1;
                justify-content: center;
              }
              .order-info {
                border-top: 1px solid #666;
                padding-top: 8px;
                margin-top: auto;
                font-size: 10px;
                background: #f9f9f9;
                padding: 6px;
                border-radius: 2px;
              }
              .order-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
              }
              .barcode-area {
                text-align: center;
                margin: 8px 0;
                font-family: 'Courier New', monospace;
                font-size: 24px;
                letter-spacing: 2px;
              }
              @media print {
                body { margin: 0; padding: 0; }
                .label-container {
                  width: 100%;
                  height: auto;
                  border: none;
                  padding: 0;
                  margin: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="label-container">
              <div class="header">SHIPPING LABEL</div>

              <div class="from-section">
                <div class="address-label">FROM:</div>
                <div class="address-lines">
                  ${businessAddress}
                </div>
              </div>

              <div class="shipping-section">
                <div class="address-label">SHIP TO:</div>
                <div class="address-lines">
                  ${shipping.name || ''}<br>
                  ${shipping.address.line1 || ''}<br>
                  ${shipping.address.line2 ? shipping.address.line2 + '<br>' : ''}
                  ${shipping.address.city || ''}, ${shipping.address.state || ''} ${shipping.address.postal_code || ''}<br>
                  ${shipping.address.country || ''}
                </div>
              </div>

              <div class="barcode-area">
                ||||||||||||||||||||||||||||||||<br>
                ${order.id.slice(-12)}<br>
                ||||||||||||||||||||||||||||||||
              </div>

              <div class="order-info">
                <div class="order-row">
                  <strong>Order:</strong> <span>${order.id.slice(-8)}</span>
                </div>
                <div class="order-row">
                  <strong>Date:</strong> <span>${new Date(order.created * 1000).toLocaleDateString()}</span>
                </div>
                <div class="order-row">
                  <strong>Items:</strong> <span>${order.items?.length || 0}</span>
                </div>
                <div class="order-row">
                  <strong>Weight:</strong> <span>--.-- lbs</span>
                </div>
              </div>
            </div>

            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              };
            </script>
          </body>
        </html>
      `)

      labelWindow.document.close()
    } catch (error) {
      console.error('Error generating shipping label:', error)
      alert('Error generating shipping label. Please check store settings.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-[var(--admin-text-primary)]">Fulfillment</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--admin-text-secondary)]">Unfulfilled</span>
          <Switch
            checked={showFulfilled}
            onCheckedChange={(checked) => {
              setShowFulfilled(checked)
              fetchOrders()
            }}
          />
          <span className="text-sm text-[var(--admin-text-secondary)]">Fulfilled</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="admin-spinner"></div>
          <span className="ml-3 text-[var(--admin-text-secondary)]">Loading orders...</span>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-[var(--admin-error)]">{error}</CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-[var(--admin-text-muted)]">No orders found.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Top pager */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => fetchOrders('prev', cursorPrev)} disabled={!cursorPrev || loading} size="sm">Prev</Button>
            <Button variant="outline" onClick={() => fetchOrders('next', cursorNext)} disabled={!cursorNext || loading} size="sm">Next</Button>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--admin-border-primary)]">
                {orders.map((order) => (
                  <div key={order.id} className={`p-4 ${order.fulfillment?.fulfilled ? 'bg-[var(--admin-success-bg)] border-l-4 border-l-[var(--admin-success)]' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs text-[var(--admin-text-muted)]">{new Date(order.created * 1000).toLocaleString()}</span>
                        <span className="text-[var(--admin-text-primary)] font-medium text-sm">{order.customer_name || 'Unknown Customer'}</span>
                        <span className="text-[var(--admin-text-secondary)] text-xs">{order.customer_email || ''}</span>
                        {order.fulfillment?.fulfilled && (
                          <span className="text-xs text-[var(--admin-success)] font-medium mt-1">✓ Fulfilled {order.fulfillment.fulfilledAt ? new Date(order.fulfillment.fulfilledAt).toLocaleDateString() : ''}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right font-semibold text-[var(--admin-text-primary)] text-sm">{formatCurrency((order.amount_total || 0) / 100, order.currency?.toUpperCase() || 'USD')}</div>
                        <Button variant="outline" size="sm" onClick={() => openOrderModal(order)} className="h-8">
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bottom pager */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => fetchOrders('prev', cursorPrev)} disabled={!cursorPrev || loading} size="sm">Prev</Button>
            <Button variant="outline" onClick={() => fetchOrders('next', cursorNext)} disabled={!cursorNext || loading} size="sm">Next</Button>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[var(--admin-bg-card)] rounded-lg shadow-[var(--admin-shadow-lg)] w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden border border-[var(--admin-border-primary)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[var(--admin-border-primary)]">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-[var(--admin-text-primary)]">Order Details</h2>
                  <p className="text-xs text-[var(--admin-text-muted)]">Order #{selectedOrder.id.slice(-8)}</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Customer Info */}
                <div>
                  <h3 className="font-semibold text-[var(--admin-text-primary)] mb-3 text-sm">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-[var(--admin-text-secondary)]"><span className="text-[var(--admin-text-muted)]">Name:</span> {selectedOrder.customer_name || 'Unknown'}</p>
                    <p className="text-[var(--admin-text-secondary)]"><span className="text-[var(--admin-text-muted)]">Email:</span> {selectedOrder.customer_email || 'Not provided'}</p>
                    <p className="text-[var(--admin-text-secondary)]"><span className="text-[var(--admin-text-muted)]">Order Date:</span> {new Date(selectedOrder.created * 1000).toLocaleString()}</p>
                    <p className="text-[var(--admin-text-secondary)]"><span className="text-[var(--admin-text-muted)]">Total:</span> {formatCurrency((selectedOrder.amount_total || 0) / 100, selectedOrder.currency?.toUpperCase() || 'USD')}</p>
                    {selectedOrder.fulfillment?.fulfilled && (
                      <p className="text-[var(--admin-success)] font-medium text-sm">
                        ✓ Fulfilled on {new Date(selectedOrder.fulfillment.fulfilledAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Shipping Info */}
                {selectedOrder.shipping ? (
                  <div>
                    <h3 className="font-semibold text-[var(--admin-text-primary)] mb-3 text-sm">Shipping Address</h3>
                    <div className="text-sm space-y-1 text-[var(--admin-text-secondary)]">
                      {selectedOrder.shipping.name && (
                        <p className="font-medium text-[var(--admin-text-primary)]">{selectedOrder.shipping.name}</p>
                      )}
                      {selectedOrder.shipping.address && (
                        <>
                          <p>
                            {selectedOrder.shipping.address.line1 || ''}
                            {selectedOrder.shipping.address.line2 && (
                              <span className="block">{selectedOrder.shipping.address.line2}</span>
                            )}
                          </p>
                          <p>
                            {selectedOrder.shipping.address.city && `${selectedOrder.shipping.address.city}, `}
                            {selectedOrder.shipping.address.state && `${selectedOrder.shipping.address.state} `}
                            {selectedOrder.shipping.address.postal_code || ''}
                          </p>
                          {selectedOrder.shipping.address.country && (
                            <p className="font-medium text-[var(--admin-text-primary)]">{selectedOrder.shipping.address.country}</p>
                          )}
                        </>
                      )}
                      {!selectedOrder.shipping.address && (
                        <p className="text-[var(--admin-text-muted)] italic">No shipping address provided</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-semibold text-[var(--admin-text-primary)] mb-3 text-sm">Shipping Address</h3>
                    <p className="text-[var(--admin-text-muted)] italic text-sm">No shipping information available</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="mt-5">
                <h3 className="font-semibold text-[var(--admin-text-primary)] mb-3 text-sm">Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="flex justify-between items-start p-3 bg-[var(--admin-bg-elevated)] rounded-lg border border-[var(--admin-border-primary)]">
                      <div className="flex-1">
                        <p className="font-medium text-[var(--admin-text-primary)] text-sm">{item.description}</p>
                        {item.price_nickname && (
                          <p className="text-xs text-[var(--admin-text-secondary)]">{item.price_nickname}</p>
                        )}
                        {(item.variant1_name || item.variant2_name) && (
                          <div className="text-xs text-[var(--admin-text-muted)] mt-1">
                            {item.variant1_name && <div>{item.variant1_style || 'Variant'}: {item.variant1_name}</div>}
                            {item.variant2_name && <div>{item.variant2_style || 'Variant'}: {item.variant2_name}</div>}
                          </div>
                        )}
                        <p className="text-xs text-[var(--admin-text-secondary)]">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-[var(--admin-text-primary)] text-sm">{formatCurrency((item.amount_total || 0) / 100, item.currency?.toUpperCase() || 'USD')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-[var(--admin-border-primary)] flex justify-between items-center">
              {!selectedOrder.fulfillment?.fulfilled ? (
                <div className="text-sm text-[var(--admin-text-secondary)]">
                  This order is ready for fulfillment
                </div>
              ) : (
                <div className="text-sm text-[var(--admin-success)] font-medium">
                  ✓ Order fulfilled on {new Date(selectedOrder.fulfillment.fulfilledAt).toLocaleDateString()}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)} size="sm">
                  Close
                </Button>
                {selectedOrder.shipping && (
                  <Button variant="outline" onClick={() => printShippingLabel(selectedOrder)} size="sm">
                    Print Label
                  </Button>
                )}
                {!selectedOrder.fulfillment?.fulfilled && (
                  <Button onClick={() => fulfillOrder(selectedOrder.id)} size="sm">
                    Fulfill Order
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
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
    <div className="flex min-h-screen bg-[var(--admin-bg-primary)] admin-container">
      <AdminSidebar onLogout={handleLogout} />
      <div className="flex-1 p-5 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductsManager />} />
          <Route path="/collections" element={<CollectionsManager />} />
          <Route path="/Fulfillment" element={<FulfillmentManager />} />
          <Route path="/media" element={<MediaLibrary />} />
          <Route path="/store-settings" element={<StoreSettingsManager />} />
        </Routes>
      </div>
    </div>
  )
}
