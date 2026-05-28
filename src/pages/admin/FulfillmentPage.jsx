import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { formatCurrency } from '../../lib/utils'
import { adminApiRequest } from '../../lib/auth'
import { X } from 'lucide-react'

export function FulfillmentPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cursorNext, setCursorNext] = useState(null)
  const [cursorPrev, setCursorPrev] = useState(null)
  const [direction, setDirection] = useState('next')
  const [statusFilter, setStatusFilter] = useState('open')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const limit = 25

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    setCursorNext(null)
    setCursorPrev(null)
    fetchOrders()
  }, [statusFilter])

  const fetchOrders = async (dir = 'next', cursor) => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({
        limit: String(limit),
        status: statusFilter,
      })
      if (cursor) params.set('cursor', cursor)
      if (dir) params.set('direction', dir)
      const res = await adminApiRequest(`/api/admin/analytics/orders?${params.toString()}`)
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
      const res = await adminApiRequest(`/api/admin/analytics/orders/${orderId}/fulfill`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to fulfill order')
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
      const response = await fetch('/api/store-settings')
      const storeSettings = await response.json()

      const shipping = order.shipping
      const labelWindow = window.open('', '_blank')

      const businessLines = []
      if (storeSettings.businessName) businessLines.push(storeSettings.businessName)
      if (storeSettings.businessAddressLine1) businessLines.push(storeSettings.businessAddressLine1)
      if (storeSettings.businessAddressLine2) businessLines.push(storeSettings.businessAddressLine2)
      const cityLine = [storeSettings.businessCity, storeSettings.businessState, storeSettings.businessPostalCode]
        .filter(Boolean)
        .join(', ')
      if (cityLine) businessLines.push(cityLine)
      if (storeSettings.businessCountry) businessLines.push(storeSettings.businessCountry)

      const businessAddress =
        businessLines.length > 0
          ? businessLines.join('<br>')
          : 'Business Address Not Set<br>Please configure in Store Settings'

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
        <div className="inline-flex rounded-md border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] p-1">
          {[
            { value: 'open', label: 'Open' },
            { value: 'fulfilled', label: 'Fulfilled' },
            { value: 'all', label: 'All' },
          ].map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={statusFilter === item.value ? 'default' : 'ghost'}
              className="h-8 px-3 text-xs"
              onClick={() => setStatusFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
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
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => fetchOrders('prev', cursorPrev)}
              disabled={!cursorPrev || loading}
              size="sm"
            >
              Prev
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchOrders('next', cursorNext)}
              disabled={!cursorNext || loading}
              size="sm"
            >
              Next
            </Button>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--admin-border-primary)]">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className={`p-4 ${order.fulfillment?.fulfilled ? 'bg-[var(--admin-success-bg)] border-l-4 border-l-[var(--admin-success)]' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs text-[var(--admin-text-muted)]">
                          {new Date(order.created * 1000).toLocaleString()}
                        </span>
                        <span className="text-[var(--admin-text-primary)] font-medium text-sm">
                          {order.customer_name || 'Unknown Customer'}
                        </span>
                        <span className="text-[var(--admin-text-secondary)] text-xs">
                          {order.customer_email || ''}
                        </span>
                        {order.fulfillment?.fulfilled && (
                          <span className="text-xs text-[var(--admin-success)] font-medium mt-1">
                            ✓ Fulfilled{' '}
                            {order.fulfillment.fulfilledAt
                              ? new Date(order.fulfillment.fulfilledAt).toLocaleDateString()
                              : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right font-semibold text-[var(--admin-text-primary)] text-sm">
                          {formatCurrency(
                            (order.amount_total || 0) / 100,
                            order.currency?.toUpperCase() || 'USD'
                          )}
                        </div>
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

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => fetchOrders('prev', cursorPrev)}
              disabled={!cursorPrev || loading}
              size="sm"
            >
              Prev
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchOrders('next', cursorNext)}
              disabled={!cursorNext || loading}
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {isModalOpen && selectedOrder && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-[var(--admin-bg-card)] rounded-lg shadow-[var(--admin-shadow-lg)] w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden border border-[var(--admin-border-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
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
                <div>
                  <h3 className="font-semibold text-[var(--admin-text-primary)] mb-3 text-sm">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-[var(--admin-text-secondary)]">
                      <span className="text-[var(--admin-text-muted)]">Name:</span>{' '}
                      {selectedOrder.customer_name || 'Unknown'}
                    </p>
                    <p className="text-[var(--admin-text-secondary)]">
                      <span className="text-[var(--admin-text-muted)]">Email:</span>{' '}
                      {selectedOrder.customer_email || 'Not provided'}
                    </p>
                    <p className="text-[var(--admin-text-secondary)]">
                      <span className="text-[var(--admin-text-muted)]">Order Date:</span>{' '}
                      {new Date(selectedOrder.created * 1000).toLocaleString()}
                    </p>
                    <p className="text-[var(--admin-text-secondary)]">
                      <span className="text-[var(--admin-text-muted)]">Total:</span>{' '}
                      {formatCurrency(
                        (selectedOrder.amount_total || 0) / 100,
                        selectedOrder.currency?.toUpperCase() || 'USD'
                      )}
                    </p>
                    {selectedOrder.fulfillment?.fulfilled && (
                      <p className="text-[var(--admin-success)] font-medium text-sm">
                        ✓ Fulfilled on {new Date(selectedOrder.fulfillment.fulfilledAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

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
                            <p className="font-medium text-[var(--admin-text-primary)]">
                              {selectedOrder.shipping.address.country}
                            </p>
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

              <div className="mt-5">
                <h3 className="font-semibold text-[var(--admin-text-primary)] mb-3 text-sm">Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start p-3 bg-[var(--admin-bg-elevated)] rounded-lg border border-[var(--admin-border-primary)]"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-[var(--admin-text-primary)] text-sm">{item.description}</p>
                        {item.price_nickname && (
                          <p className="text-xs text-[var(--admin-text-secondary)]">{item.price_nickname}</p>
                        )}
                        {(item.variant1_name || item.variant2_name) && (
                          <div className="text-xs text-[var(--admin-text-muted)] mt-1">
                            {item.variant1_name && (
                              <div>
                                {item.variant1_style || 'Variant'}: {item.variant1_name}
                              </div>
                            )}
                            {item.variant2_name && (
                              <div>
                                {item.variant2_style || 'Variant'}: {item.variant2_name}
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-[var(--admin-text-secondary)]">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-[var(--admin-text-primary)] text-sm">
                          {formatCurrency(
                            (item.amount_total || 0) / 100,
                            item.currency?.toUpperCase() || 'USD'
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-[var(--admin-border-primary)] flex justify-between items-center">
              {!selectedOrder.fulfillment?.fulfilled ? (
                <div className="text-sm text-[var(--admin-text-secondary)]">This order is ready for fulfillment</div>
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
