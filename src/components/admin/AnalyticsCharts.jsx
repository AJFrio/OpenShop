import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { formatCurrency } from '../../lib/utils'

export function RevenueChart({ data, period }) {
  const formatTooltip = (value, name) => {
    if (name === 'revenue') {
      return [formatCurrency(value), 'Revenue']
    }
    return [value, name]
  }

  const formatXAxisLabel = (value) => {
    // For longer periods, show fewer labels
    if (period === '1y') {
      const date = new Date(value)
      return date.getDate() === 1 ? date.toLocaleDateString('en-US', { month: 'short' }) : ''
    }
    return value
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
          Revenue Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fontSize: 12 }}
                tickFormatter={formatXAxisLabel}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={formatTooltip}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#9333ea" 
                strokeWidth={3}
                dot={{ fill: '#9333ea', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#9333ea', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function OrdersChart({ data, period }) {
  const formatXAxisLabel = (value) => {
    if (period === '1y') {
      const date = new Date(value)
      return date.getDate() === 1 ? date.toLocaleDateString('en-US', { month: 'short' }) : ''
    }
    return value
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          Orders Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fontSize: 12 }}
                tickFormatter={formatXAxisLabel}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value, name) => [value, 'Orders']}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px'
                }}
              />
              <Bar 
                dataKey="orders" 
                fill="#2563eb" 
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
