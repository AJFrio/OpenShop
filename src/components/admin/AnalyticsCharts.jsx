import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { formatCurrency } from '../../lib/utils'
import { adminTokens } from '../../lib/adminTheme'

const chartColors = {
  brand: adminTokens.color.brand['600'],
  textMuted: adminTokens.color.text.disabled,
  border: adminTokens.color.border.default,
  surface: adminTokens.color.bg.surface,
  text: adminTokens.color.text.default,
}

function chartTooltipStyle() {
  return {
    backgroundColor: chartColors.surface,
    border: `1px solid ${chartColors.border}`,
    borderRadius: '8px',
    color: chartColors.text,
  }
}

export function RevenueChart({ data, period }) {
  const formatTooltip = (value, name) => {
    if (name === 'revenue') {
      return [formatCurrency(value), 'Revenue']
    }
    return [value, name]
  }

  const formatXAxisLabel = (value) => {
    if (period === '1y') {
      const date = new Date(value)
      return date.getDate() === 1 ? date.toLocaleDateString('en-US', { month: 'short' }) : ''
    }
    return value
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12, fill: chartColors.textMuted, style: { fontVariantNumeric: 'tabular-nums' } }}
                tickFormatter={formatXAxisLabel}
                axisLine={{ stroke: chartColors.border }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: chartColors.textMuted, style: { fontVariantNumeric: 'tabular-nums' } }}
                tickFormatter={(value) => `$${value}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={formatTooltip}
                labelStyle={{ color: chartColors.textMuted, fontVariantNumeric: 'tabular-nums' }}
                itemStyle={{ fontVariantNumeric: 'tabular-nums', color: chartColors.text }}
                contentStyle={chartTooltipStyle()}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke={chartColors.brand}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, stroke: chartColors.brand, strokeWidth: 2 }}
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
      <CardHeader className="pb-2">
        <CardTitle>Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12, fill: chartColors.textMuted, style: { fontVariantNumeric: 'tabular-nums' } }}
                tickFormatter={formatXAxisLabel}
                axisLine={{ stroke: chartColors.border }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: chartColors.textMuted, style: { fontVariantNumeric: 'tabular-nums' } }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value, _name) => [value, 'Orders']}
                labelStyle={{ color: chartColors.textMuted, fontVariantNumeric: 'tabular-nums' }}
                itemStyle={{ fontVariantNumeric: 'tabular-nums', color: chartColors.text }}
                contentStyle={chartTooltipStyle()}
              />
              <Bar
                dataKey="orders"
                fill={chartColors.brand}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
