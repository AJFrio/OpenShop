import { Link } from 'react-router-dom'
import { Card, CardContent } from '../ui/card'
import { formatCurrency } from '../../lib/utils'
import { TrendingUp, TrendingDown, ShoppingBag } from 'lucide-react'

export function MetricCard({ title, value, change, changeType, icon: _Icon, prefix = '', href, hint }) {
  const isPositive = changeType === 'positive' || change > 0
  const isNeutral = change === 0 || change === undefined
  const display =
    typeof value === 'number'
      ? (prefix === '$' ? formatCurrency(value) : `${prefix}${value}`)
      : `${prefix}${value}`

  const inner = (
    <Card className="admin-stat-card h-full transition-colors">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-[var(--os-color-text-secondary)]">{title}</p>
        <p className="mt-1 truncate text-xl font-semibold tabular-nums tracking-tight text-[var(--os-color-text)]">
          {display}
        </p>
        {change !== undefined && (
          <div
            className={`mt-1.5 flex items-center text-xs tabular-nums ${
              isNeutral
                ? 'text-[var(--os-color-text-disabled)]'
                : isPositive
                  ? 'text-[var(--os-color-text-success)]'
                  : 'text-[var(--os-color-text-critical)]'
            }`}
          >
            {!isNeutral && (isPositive ? <TrendingUp className="mr-1 h-3.5 w-3.5" /> : <TrendingDown className="mr-1 h-3.5 w-3.5" />)}
            <span>{isNeutral ? 'No change' : `${isPositive ? '+' : ''}${change.toFixed(1)}%`}</span>
            <span className="ml-1 text-[var(--os-color-text-disabled)]">vs last period</span>
          </div>
        )}
        {hint && change === undefined && (
          <p className="mt-1.5 text-xs text-[var(--os-color-text-disabled)]">{hint}</p>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link to={href} className="block h-full focus-visible:outline-none focus-visible:shadow-[var(--os-shadow-focus)] rounded-[var(--os-radius-lg)]">
        {inner}
      </Link>
    )
  }
  return inner
}

const statusStyles = {
  paid: { bg: 'var(--os-color-bg-fill-success)', color: 'var(--os-color-text-success)' },
  pending: { bg: 'var(--os-color-bg-fill-caution)', color: 'var(--os-color-text-caution)' },
  failed: { bg: 'var(--os-color-bg-fill-critical)', color: 'var(--os-color-text-critical)' },
}

function getStatusStyle(status) {
  return statusStyles[status] || statusStyles.pending
}

export function RecentOrdersCard({ orders }) {
  return (
    <Card className="admin-card h-full">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--os-color-text)]">Recent orders</h3>
          <Link
            to="/admin/fulfillment"
            className="text-xs font-medium text-[var(--os-color-text-brand)] hover:underline"
          >
            View all
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="py-8 text-center">
            <ShoppingBag className="mx-auto mb-2 h-6 w-6 text-[var(--os-color-icon-secondary)]" />
            <p className="text-sm text-[var(--os-color-text-disabled)]">No recent orders</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--os-color-border)]">
            {orders.slice(0, 5).map((order) => {
              const statusStyle = getStatusStyle(order.status)
              return (
                <div key={order.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--os-color-text)]">{order.customerEmail}</p>
                    <p className="text-xs text-[var(--os-color-text-disabled)]">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                    >
                      {order.status}
                    </span>
                    <p className="text-sm font-semibold tabular-nums text-[var(--os-color-text)]">
                      {formatCurrency(order.amount, order.currency)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
