import { Card, CardContent } from '../ui/card'
import { formatCurrency } from '../../lib/utils'
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, BarChart3, Package } from 'lucide-react'

const iconStyles = {
  [DollarSign?.name || 'DollarSign']: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
  [ShoppingBag?.name || 'ShoppingBag']: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  [BarChart3?.name || 'BarChart3']: { bg: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' },
  [Package?.name || 'Package']: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
}

function getIconStyle(Icon) {
  return iconStyles[Icon?.name] || { bg: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }
}

export function MetricCard({ title, value, change, changeType, icon: Icon, prefix = '' }) {
  const isPositive = changeType === 'positive' || change > 0
  const isNeutral = change === 0
  const iconStyle = getIconStyle(Icon)
  
  return (
    <Card className="admin-stat-card relative overflow-hidden group">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" 
           style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, transparent 50%)' }} />
      
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider mb-1 truncate" style={{ color: '#94a3b8' }}>
              {title}
            </p>
            <p className="text-2xl font-bold truncate" style={{ color: '#e2e8f0', letterSpacing: '-0.02em' }}>
              {typeof value === 'number'
                ? (prefix === '$' ? formatCurrency(value) : `${prefix}${value}`)
                : `${prefix}${value}`}
            </p>
            {change !== undefined && (
              <div className={`flex items-center mt-2 text-sm ${
                isNeutral ? 'text-slate-500' : isPositive ? 'text-emerald-400' : 'text-red-400'
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
                <span style={{ color: '#64748b' }} className="ml-1">vs last period</span>
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
  paid: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
  pending: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  failed: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
}

function getStatusStyle(status) {
  return statusStyles[status] || statusStyles.pending
}

export function RecentOrdersCard({ orders }) {
  return (
    <Card className="admin-card h-full">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: '#e2e8f0' }}>Recent Orders</h3>
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}>
            <ShoppingBag className="w-4 h-4" style={{ color: '#3b82f6' }} />
          </div>
        </div>
        
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#242837' }}>
              <ShoppingBag className="w-8 h-8" style={{ color: '#475569' }} />
            </div>
            <p style={{ color: '#64748b' }}>No recent orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => {
              const statusStyle = getStatusStyle(order.status)
              return (
                <div key={order.id} 
                     className="p-3 rounded-lg transition-colors duration-200 hover:bg-white/5"
                     style={{ backgroundColor: '#242837', border: '1px solid #2d3748' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                      {formatCurrency(order.amount, order.currency)}
                    </p>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full" 
                          style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: '#94a3b8' }}>
                    {order.customerEmail}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#64748b' }}>
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
