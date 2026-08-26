import { Card, CardContent } from '../ui/card'
import { formatCurrency } from '../../lib/utils'
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, BarChart3, Package } from 'lucide-react'

const iconStyles = {
  [DollarSign?.name || 'DollarSign']: { bg: 'var(--admin-success-bg)', color: 'var(--admin-success)' },
  [ShoppingBag?.name || 'ShoppingBag']: { bg: 'var(--admin-info-bg)', color: 'var(--admin-info)' },
  [BarChart3?.name || 'BarChart3']: { bg: 'var(--admin-accent-bg, rgba(37, 99, 235, 0.15))', color: 'var(--admin-accent-light)' },
  [Package?.name || 'Package']: { bg: 'var(--admin-warning-bg)', color: 'var(--admin-warning)' },
}

function getIconStyle(Icon) {
  return iconStyles[Icon?.name] || { bg: 'var(--admin-accent-bg, rgba(37, 99, 235, 0.15))', color: 'var(--admin-accent-light)' }
}

export function MetricCard({ title, value, change, changeType, icon: Icon, prefix = '' }) {
  const isPositive = changeType === 'positive' || change > 0
  const isNeutral = change === 0
  const iconStyle = getIconStyle(Icon)
  
  return (
    <Card className="admin-stat-card relative overflow-hidden group">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" 
           style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, transparent 50%)' }} />
      
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider mb-1 truncate" style={{ color: 'var(--admin-text-secondary)' }}>
              {title}
            </p>
            <p className="text-2xl font-bold truncate tabular-nums" style={{ color: 'var(--admin-text-primary)', letterSpacing: '-0.02em' }}>
              {typeof value === 'number'
                ? (prefix === '$' ? formatCurrency(value) : `${prefix}${value}`)
                : `${prefix}${value}`}
            </p>
            {change !== undefined && (
              <div className={`flex items-center mt-2 text-sm tabular-nums ${
                isNeutral ? 'text-[var(--admin-text-muted)]' : isPositive ? 'text-[var(--admin-success)]' : 'text-[var(--admin-error)]'
              }`}>
                {!isNeutral && (
                  isPositive ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )
                )}
                <span>
                  {isNeutral ? 'No change' : `${isPositive ? '+' : ''}${change.toFixed(1)}%`}
                </span>
                <span style={{ color: 'var(--admin-text-muted)' }} className="ml-1">vs last period</span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 ml-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                 style={{ backgroundColor: iconStyle.bg }}>
              <Icon className="w-6 h-6" style={{ color: iconStyle.color }} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const statusStyles = {
  paid: { bg: 'var(--admin-success-bg)', color: 'var(--admin-success)' },
  pending: { bg: 'var(--admin-warning-bg)', color: 'var(--admin-warning)' },
  failed: { bg: 'var(--admin-error-bg)', color: 'var(--admin-error)' },
}

function getStatusStyle(status) {
  return statusStyles[status] || statusStyles.pending
}

export function RecentOrdersCard({ orders }) {
  return (
    <Card className="admin-card h-full">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: 'var(--admin-text-primary)' }}>Recent Orders</h3>
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--admin-info-bg)' }}>
            <ShoppingBag className="w-4 h-4" style={{ color: 'var(--admin-info)' }} />
          </div>
        </div>
        
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--admin-bg-elevated)' }}>
              <ShoppingBag className="w-8 h-8" style={{ color: 'var(--admin-border-secondary)' }} />
            </div>
            <p style={{ color: 'var(--admin-text-muted)' }}>No recent orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => {
              const statusStyle = getStatusStyle(order.status)
              return (
                <div key={order.id} 
                     className="p-3 rounded-lg transition-colors duration-200 hover:bg-white/5"
                     style={{ backgroundColor: 'var(--admin-bg-elevated)', border: '1px solid var(--admin-border-primary)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--admin-text-primary)' }}>
                      {formatCurrency(order.amount, order.currency)}
                    </p>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full" 
                          style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--admin-text-secondary)' }}>
                    {order.customerEmail}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
