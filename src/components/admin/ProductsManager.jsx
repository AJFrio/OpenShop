import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { ProductForm } from './ProductForm'
import { adminApiRequest } from '../../lib/auth'
import { Plus, Edit, Trash2, Package } from 'lucide-react'
import { Switch } from '../ui/switch'
import { Select } from '../ui/select'
import { formatCurrency, normalizeImageUrl } from '../../lib/utils'

export function ProductsManager() {
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
    <div className="space-y-4">
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
                      <img src={normalizeImageUrl(product.images[0])} alt={product.name} className="w-16 h-16 object-cover rounded-lg" />
                    ) : product.imageUrl ? (
                      <img src={normalizeImageUrl(product.imageUrl)} alt={product.name} className="w-16 h-16 object-cover rounded-lg" />
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