import { Card, CardContent } from '../ui/card'
import { formatCurrency } from '../../lib/utils'
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, BarChart3 } from 'lucide-react'

export function MetricCard({ title, value, change, changeType, icon: Icon, prefix = '' }) {
  const isPositive = changeType === 'positive' || change > 0
  const isNeutral = change === 0
  
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {typeof value === 'number'
                ? (prefix === '$' ? formatCurrency(value) : `${prefix}${value}`)
                : `${prefix}${value}`}
            </p>
            {change !== undefined && (
              <div className={`flex items-center mt-2 text-sm ${
                isNeutral ? 'text-gray-500' : isPositive ? 'text-green-600' : 'text-red-600'
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
                <span className="text-gray-500 ml-1">vs last period</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${
            Icon === DollarSign ? 'bg-green-100' :
            Icon === ShoppingBag ? 'bg-blue-100' :
            'bg-purple-100'
          }`}>
            <Icon className={`w-6 h-6 ${
              Icon === DollarSign ? 'text-green-600' :
              Icon === ShoppingBag ? 'text-blue-600' :
              'text-purple-600'
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function RecentOrdersCard({ orders }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
          <ShoppingBag className="w-5 h-5 text-gray-400" />
        </div>
        
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No recent orders</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(order.amount, order.currency)}
                    </p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {order.customerEmail}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
