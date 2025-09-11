import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { isAdminAuthenticated, clearAdminToken } from '../../lib/auth'
import { AdminLogin } from '../../components/admin/AdminLogin'
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { ProductForm } from '../../components/admin/ProductForm'
import { CollectionForm } from '../../components/admin/CollectionForm'
import { StoreSettingsForm } from '../../components/admin/StoreSettingsForm'
import { RevenueChart, OrdersChart } from '../../components/admin/AnalyticsCharts'
import { MetricCard, RecentOrdersCard } from '../../components/admin/AnalyticsCards'
import { formatCurrency, normalizeImageUrl } from '../../lib/utils'
import { adminApiRequest } from '../../lib/auth'
import { Package, FolderOpen, Plus, Edit, Trash2, Home, Settings, DollarSign, ShoppingBag, BarChart3, Image as ImageIcon, X } from 'lucide-react'
import { Switch } from '../../components/ui/switch'

function AdminSidebar({ onLogout }) {
  const location = useLocation()
  
  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: Home },
    { path: '/admin/products', label: 'Products', icon: Package },
    { path: '/admin/collections', label: 'Collections', icon: FolderOpen },
    { path: '/admin/fulfillment', label: 'Fulfillment', icon: ShoppingBag },
    { path: '/admin/media', label: 'Media', icon: ImageIcon },
    { path: '/admin/store-settings', label: 'Store Settings', icon: Settings },
  ]

  return (
    <div className="w-64 bg-white shadow-sm border-r min-h-screen">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
        <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to Store
        </Link>
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      
      {/* Logout Button */}
      <div className="p-4 border-t">
        <Button 
          onClick={onLogout}
          variant="outline" 
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
        >
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        
        {/* Period Selector */}
        <div className="flex gap-2">
          {[
            { value: '1d', label: '1 Day' },
            { value: '7d', label: '7 Days' },
            { value: '30d', label: '30 Days' },
            { value: '90d', label: '90 Days' },
            { value: '1y', label: '1 Year' }
          ].map((period) => (
            <Button
              key={period.value}
              variant={selectedPeriod === period.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period.value)}
              className="text-xs"
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>

      {analyticsLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-2">Loading analytics...</span>
        </div>
      ) : analytics ? (
        <>
          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueChart data={analytics.chartData} period={selectedPeriod} />
            <OrdersChart data={analytics.chartData} period={selectedPeriod} />
          </div>

          {/* Recent Orders and Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentOrdersCard orders={analytics.recentOrders} />
            
            {/* Recent Products */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Products</h3>
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
                {stats.recentProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No products created yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.recentProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-600">{formatCurrency(product.price, product.currency)}</p>
                        </div>
                        <Link to={`/admin/products/${product.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-2" />
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
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
            <p className="text-gray-600">Analytics data will appear here once you have orders.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ProductsManager() {
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [collectionFilter, setCollectionFilter] = useState('')
  const [archivedFilter, setArchivedFilter] = useState('all')

  useEffect(() => {
    fetchProducts()
    fetchCollections()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await adminApiRequest('/api/admin/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

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

  const handleSaveProduct = (product) => {
    if (editingProduct) {
      setProducts(products.map(p => p.id === product.id ? product : p))
    } else {
      setProducts([...products, product])
    }
    setShowForm(false)
    setEditingProduct(null)
  }

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const response = await adminApiRequest(`/api/admin/products/${productId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setProducts(products.filter(p => p.id !== productId))
      }
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  if (showForm) {
    return (
      <div className="flex justify-center">
        <ProductForm
          product={editingProduct}
          onSave={handleSaveProduct}
          onCancel={() => {
            setShowForm(false)
            setEditingProduct(null)
          }}
        />
      </div>
    )
  }

  const filteredProducts = products.filter(p => {
    const byCollection = collectionFilter ? p.collectionId === collectionFilter : true
    const byArchived = archivedFilter === 'all' ? true : archivedFilter === 'archived' ? !!p.archived : !p.archived
    return byCollection && byArchived
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-sm font-medium mb-1">Filter by Collection</label>
          <Select value={collectionFilter} onChange={(e) => setCollectionFilter(e.target.value)}>
            <option value="">All</option>
            {collections.map(col => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Filter by Archived</label>
          <Select value={archivedFilter} onChange={(e) => setArchivedFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products</h3>
            <p className="text-gray-600 mb-6">Try adjusting your filters or create a product.</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {(product.images && product.images.length > 0) ? (
                      <img src={product.images[0]} alt={product.name} className="w-16 h-16 object-cover rounded-lg" />
                    ) : product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-16 h-16 object-cover rounded-lg" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-1">{product.description}</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(product.price, product.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2 items-center">
                    <label className="flex items-center gap-3 text-sm text-gray-700">
                      <Switch
                        checked={!!product.archived}
                        onCheckedChange={async (v) => {
                          const updated = { archived: v }
                          const res = await adminApiRequest(`/api/admin/products/${product.id}`, { method: 'PUT', body: JSON.stringify(updated) })
                          if (res.ok) {
                            const saved = await res.json()
                            setProducts(products.map(p => p.id === saved.id ? saved : p))
                          }
                        }}
                      />
                      Archived
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingProduct(product)
                        setShowForm(true)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteProduct(product.id)}
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Collection
        </Button>
      </div>

      {/* Filters */}
      <div>
        <label className="block text-sm font-medium mb-1">Filter by Archived</label>
        <Select value={archivedFilter} onChange={(e) => setArchivedFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {collections.filter(c => archivedFilter === 'all' ? true : archivedFilter === 'archived' ? !!c.archived : !c.archived).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No collections yet</h3>
            <p className="text-gray-600 mb-6">Organize your products by creating collections.</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {collections.filter(c => archivedFilter === 'all' ? true : archivedFilter === 'archived' ? !!c.archived : !c.archived).map((collection) => (
            <Card key={collection.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{collection.name}</h3>
                    <p className="text-sm text-gray-600">{collection.description}</p>
                  </div>
                  <div className="flex space-x-2 items-center">
                    <label className="flex items-center gap-3 text-sm text-gray-700">
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
  const [images, setImages] = useState([])
  const [modalImage, setModalImage] = useState(null)

  useEffect(() => {
    collectImages()
  }, [])

  const collectImages = async () => {
    try {
      const [productsRes, collectionsRes, settingsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/collections'),
        fetch('/api/store-settings')
      ])

      const products = productsRes.ok ? await productsRes.json() : []
      const collections = collectionsRes.ok ? await collectionsRes.json() : []
      const settings = settingsRes.ok ? await settingsRes.json() : {}

      const gathered = new Set()
      const add = (url, label, link) => {
        if (url && typeof url === 'string') {
          const normalized = normalizeImageUrl(url)
          gathered.add(JSON.stringify({ url: normalized, label, link }))
        }
      }

      products.forEach(p => {
        ;(Array.isArray(p.images) ? p.images : (p.imageUrl ? [p.imageUrl] : [])).forEach(u => add(u, `Product: ${p.name}`, `/admin/products`))
        if (Array.isArray(p.variants)) {
          p.variants.forEach(v => {
            add(v.selectorImageUrl, `Variant (${p.variantStyle || 'Variant'}) ${v.name} selector`, `/admin/products`)
            add(v.displayImageUrl, `Variant (${p.variantStyle || 'Variant'}) ${v.name} display`, `/admin/products`)
            if (v.imageUrl) add(v.imageUrl, `Variant (${p.variantStyle || 'Variant'}) ${v.name}`, `/admin/products`)
          })
        }
      })

      collections.forEach(c => add(c.heroImage, `Collection: ${c.name} hero`, `/admin/collections`))
      add(settings.logoImageUrl, 'Store Logo', '/admin/store-settings')
      add(settings.heroImageUrl, 'Home Hero', '/admin/store-settings')

      const list = Array.from(gathered).map(s => JSON.parse(s))
      setImages(list)
    } catch (e) {
      console.error('Error collecting images', e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
        <Button variant="outline" onClick={collectImages}>Refresh</Button>
      </div>

      {images.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
            <p className="text-gray-600">Images from products, variants, collections, and hero settings will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setModalImage(img)}
              className="group relative rounded-lg overflow-hidden border hover:shadow-md transition"
              title={img.label}
            >
              <img src={img.url} alt={img.label} className="w-full h-28 object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition" />
            </button>
          ))}
        </div>
      )}

      {modalImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setModalImage(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 relative" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-3 right-3 p-2 rounded-full border hover:bg-gray-50" onClick={() => setModalImage(null)}>
              <X className="w-5 h-5" />
            </button>
            <img src={modalImage.url} alt={modalImage.label} className="w-full h-auto object-contain rounded-t-lg" />
            <div className="p-4 border-t space-y-2">
              <p className="text-sm text-gray-700 break-all">{modalImage.label}</p>
              <div className="flex gap-4 items-center text-sm">
                <a href={modalImage.url} target="_blank" rel="noreferrer" className="text-purple-600 hover:text-purple-700">Open original</a>
                {modalImage.link && (
                  <a href={modalImage.link} className="text-purple-600 hover:text-purple-700">Open related editor</a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StoreSettingsManager() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Store Settings</h1>
      </div>

      <div className="flex justify-center">
        <StoreSettingsForm />
      </div>
    </div>
  )
}

function FulfillmentManager() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cursorNext, setCursorNext] = useState(null)
  const [cursorPrev, setCursorPrev] = useState(null)
  const [direction, setDirection] = useState('next')
  const limit = 20

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async (dir = 'next', cursor) => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({ limit: String(limit) })
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Fulfillment</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchOrders('prev', cursorPrev)} disabled={!cursorPrev || loading}>Prev</Button>
          <Button variant="outline" onClick={() => fetchOrders('next', cursorNext)} disabled={!cursorNext || loading}>Next</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-2">Loading orders...</span>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-red-600">{error}</CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">No orders found.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Top pager */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => fetchOrders('prev', cursorPrev)} disabled={!cursorPrev || loading}>Prev</Button>
            <Button variant="outline" onClick={() => fetchOrders('next', cursorNext)} disabled={!cursorNext || loading}>Next</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {orders.map((order) => (
                  <details key={order.id} className="group">
                    <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-600">{new Date(order.created * 1000).toLocaleString()}</span>
                        <span className="text-gray-900 font-medium">{order.customer_name || 'Unknown Customer'}</span>
                        <span className="text-gray-600 text-sm">{order.customer_email || ''}</span>
                      </div>
                      <div className="text-right font-semibold">{formatCurrency((order.amount_total || 0) / 100, order.currency?.toUpperCase() || 'USD')}</div>
                    </summary>
                    <div className="px-4 pb-4">
                      {order.shipping && (
                        <div className="mb-4">
                          <h4 className="font-semibold mb-1">Shipping</h4>
                          <p className="text-sm text-gray-700">
                            {order.shipping.name || ''}<br/>
                            {order.shipping.address?.line1 || ''}{order.shipping.address?.line2 ? `, ${order.shipping.address.line2}` : ''}<br/>
                            {order.shipping.address?.city || ''}, {order.shipping.address?.state || ''} {order.shipping.address?.postal_code || ''}<br/>
                            {order.shipping.address?.country || ''}
                          </p>
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold mb-2">Items</h4>
                        <div className="space-y-2">
                          {order.items.map(item => (
                            <div key={item.id} className="flex flex-col gap-0.5 text-sm">
                              <div className="flex justify-between">
                                <span>
                                  {item.description}
                                  {item.price_nickname ? ` (${item.price_nickname})` : ''}
                                  × {item.quantity}
                                </span>
                                <span>{formatCurrency((item.amount_total || 0) / 100, item.currency?.toUpperCase() || 'USD')}</span>
                              </div>
                              {(item.variant1_name || item.variant2_name) && (
                                <div className="text-xs text-gray-600">
                                  {item.variant1_name && <div>Variant 1 - {item.variant1_name}</div>}
                                  {item.variant2_name && <div>Variant 2 - {item.variant2_name}</div>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bottom pager */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => fetchOrders('prev', cursorPrev)} disabled={!cursorPrev || loading}>Prev</Button>
            <Button variant="outline" onClick={() => fetchOrders('next', cursorNext)} disabled={!cursorNext || loading}>Next</Button>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar onLogout={handleLogout} />
      <div className="flex-1 p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductsManager />} />
          <Route path="/collections" element={<CollectionsManager />} />
          <Route path="/fulfillment" element={<FulfillmentManager />} />
          <Route path="/media" element={<MediaLibrary />} />
          <Route path="/store-settings" element={<StoreSettingsManager />} />
        </Routes>
      </div>
    </div>
  )
}
