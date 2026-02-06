// Analytics service - handles analytics operations
import { StripeService } from './StripeService.js'

export class AnalyticsService {
  constructor(stripeService, kv = null) {
    this.stripe = stripeService
    this.kv = kv
  }

  /**
   * Get analytics data for a period
   */
  async getAnalytics(period = '30d') {
    const periodDays = { '1d': 1, '7d': 7, '30d': 30, '90d': 90, '1y': 365 }

    // Sanitize period to prevent cache poisoning
    if (!periodDays[period]) {
      period = '30d'
    }

    // Check cache
    if (this.kv) {
      const cacheKey = `analytics:${period}`
      const cached = await this.kv.get(cacheKey)
      if (cached) {
        try {
          return JSON.parse(cached)
        } catch (e) {
          console.error('Error parsing cached analytics', e)
        }
      }
    }

    const days = periodDays[period]
    const now = new Date()
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))

    const paymentIntents = await this.stripe.listPaymentIntents(startDate)
    const successfulPayments = paymentIntents.data.filter(pi => pi.status === 'succeeded')
    const totalRevenue = successfulPayments.reduce((sum, payment) => sum + payment.amount, 0) / 100
    const totalOrders = successfulPayments.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Create chart data
    const chartData = []

    if (period === '1d') {
      // Hourly breakdown for last 24 hours
      const hourlyOrders = {}
      const hourlyRevenue = {}

      successfulPayments.forEach(payment => {
        const d = new Date(payment.created * 1000)
        const bucket = new Date(d)
        bucket.setMinutes(0, 0, 0)
        const key = bucket.toISOString()
        hourlyOrders[key] = (hourlyOrders[key] || 0) + 1
        hourlyRevenue[key] = (hourlyRevenue[key] || 0) + (payment.amount / 100)
      })

      const cursor = new Date(now)
      cursor.setMinutes(0, 0, 0)
      const startHour = new Date(cursor.getTime() - 23 * 60 * 60 * 1000)
      const iter = new Date(startHour)
      while (iter <= cursor) {
        const key = new Date(iter).toISOString()
        chartData.push({
          date: key,
          orders: hourlyOrders[key] || 0,
          revenue: Math.round(((hourlyRevenue[key] || 0) + Number.EPSILON) * 100) / 100,
          formattedDate: new Date(iter).toLocaleTimeString('en-US', { hour: 'numeric' })
        })
        iter.setHours(iter.getHours() + 1)
      }
    } else {
      // Daily breakdown for longer periods
      const dailyData = {}
      const revenueByDate = {}

      successfulPayments.forEach(payment => {
        const date = new Date(payment.created * 1000).toISOString().split('T')[0]
        dailyData[date] = (dailyData[date] || 0) + 1
        revenueByDate[date] = (revenueByDate[date] || 0) + (payment.amount / 100)
      })

      const currentDate = new Date(startDate)
      while (currentDate <= now) {
        const dateStr = currentDate.toISOString().split('T')[0]
        chartData.push({
          date: dateStr,
          orders: dailyData[dateStr] || 0,
          revenue: revenueByDate[dateStr] || 0,
          formattedDate: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }

    const result = {
      period,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      chartData,
      recentOrders: [],
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString()
      }
    }

    // Cache result
    if (this.kv) {
      const cacheKey = `analytics:${period}`
      // Cache for 5 minutes
      await this.kv.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 })
    }

    return result
  }

  /**
   * Get orders with fulfillment status
   */
  async getOrders(options = {}) {
    const limit = Math.min(options.limit || 25, 50)
    const direction = options.direction || 'next'
    const cursor = options.cursor
    const showFulfilled = options.showFulfilled === true

    const listParams = { limit }
    if (cursor) {
      if (direction === 'prev') {
        listParams.ending_before = cursor
      } else {
        listParams.starting_after = cursor
      }
    }

    const sessions = await this.stripe.listCheckoutSessions(listParams)

    // Filter sessions by payment status and fulfillment status
    let filteredSessions = []
    for (const s of sessions.data) {
      if (s.payment_status === 'paid' || s.status === 'complete' || s.status === 'completed') {
        let includeSession = true

        // Apply fulfillment filtering if KV is available
        if (options.kvNamespace) {
          const fulfillmentKey = `order_fulfillment:${s.id}`
          const fulfillmentData = await options.kvNamespace.get(fulfillmentKey)
          const fulfillmentStatus = fulfillmentData ? JSON.parse(fulfillmentData) : { fulfilled: false }

          if (showFulfilled) {
            if (!fulfillmentStatus.fulfilled) {
              includeSession = false
            }
          } else {
            if (fulfillmentStatus.fulfilled) {
              includeSession = false
            }
          }
        }

        if (includeSession) {
          filteredSessions.push(s)
        }
      }
    }

    // Oldest at top within the current page
    const ordered = filteredSessions.reverse()

    // Fetch line items for each session
    const orders = await Promise.all(ordered.map(async (s) => {
      try {
        const lineItemsPromise = this.stripe.getCheckoutSessionLineItems(s.id)
        let paymentIntentPromise = Promise.resolve(null)

        if (!s.shipping_details && s.payment_intent) {
          paymentIntentPromise = this.stripe.getPaymentIntent(s.payment_intent)
            .catch(piError => {
              console.log('Error fetching payment intent shipping:', piError.message)
              return null
            })
        }

        const [lineItems, paymentIntent] = await Promise.all([lineItemsPromise, paymentIntentPromise])

        // Get shipping info
        let shippingDetails = null
        if (s.shipping_details) {
          shippingDetails = s.shipping_details
        } else if (paymentIntent && paymentIntent.shipping) {
          shippingDetails = {
            address: paymentIntent.shipping.address,
            name: paymentIntent.shipping.name
          }
        }

        // Check fulfillment status from KV
        const fulfillmentKey = `order_fulfillment:${s.id}`
        const fulfillmentData = options.kvNamespace ? await options.kvNamespace.get(fulfillmentKey) : null
        const fulfillmentStatus = fulfillmentData ? JSON.parse(fulfillmentData) : { fulfilled: false, fulfilledAt: null, fulfilledBy: null }

        return {
          id: s.id,
          created: s.created,
          amount_total: s.amount_total,
          currency: s.currency,
          customer_email: s.customer_details?.email || s.customer_email || null,
          customer_name: s.customer_details?.name || null,
          shipping: shippingDetails,
          payment_intent: s.payment_intent || null,
          billing: {
            name: s.customer_details?.name || null,
            email: s.customer_details?.email || null,
            address: s.customer_details?.address || null
          },
          fulfillment: fulfillmentStatus,
          items: lineItems.data.map(li => {
            const nickname = li.price?.nickname || ''
            let productName = 'Unknown Product'
            let variant1Info = ''
            let variant2Info = ''

            if (nickname.includes(' - ')) {
              const parts = nickname.split(' - ')
              productName = parts[0]
              if (parts.length >= 2) {
                variant1Info = parts[1]
              }
              if (parts.length >= 3) {
                variant2Info = parts[2]
              }
            } else {
              productName = nickname
            }

            return {
              id: li.id,
              description: productName,
              quantity: li.quantity,
              amount_total: li.amount_total,
              currency: li.currency,
              price_nickname: nickname,
              variant1_name: variant1Info || li.price?.metadata?.variant1_name || null,
              variant1_style: li.price?.metadata?.variant1_style || 'Variant',
              variant2_name: variant2Info || li.price?.metadata?.variant2_name || null,
              variant2_style: li.price?.metadata?.variant2_style || 'Variant'
            }
          })
        }
      } catch (e) {
        console.error('Error fetching line items for session', s.id, e)
        // Handle error case...
        let fulfillmentStatus = { fulfilled: false, fulfilledAt: null, fulfilledBy: null }
        if (options.kvNamespace) {
          const fulfillmentKey = `order_fulfillment:${s.id}`
          const fulfillmentData = await options.kvNamespace.get(fulfillmentKey)
          fulfillmentStatus = fulfillmentData ? JSON.parse(fulfillmentData) : { fulfilled: false, fulfilledAt: null, fulfilledBy: null }
        }

        return {
          id: s.id,
          created: s.created,
          amount_total: s.amount_total,
          currency: s.currency,
          customer_email: s.customer_details?.email || s.customer_email || null,
          customer_name: s.customer_details?.name || null,
          shipping: s.shipping_details || null,
          billing: {
            name: s.customer_details?.name || null,
            email: s.customer_details?.email || null,
            address: s.customer_details?.address || null
          },
          fulfillment: fulfillmentStatus,
          items: []
        }
      }
    }))

    // Cursors for next/prev paging
    const nextCursor = ordered.length > 0 ? ordered[0].id : null
    const prevCursor = ordered.length > 0 ? ordered[ordered.length - 1].id : null

    return {
      limit,
      orders,
      cursors: { next: nextCursor, prev: prevCursor },
      has_more: sessions.has_more
    }
  }
}

