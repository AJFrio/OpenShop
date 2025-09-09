// Cloudflare Function for Stripe Analytics API
import Stripe from 'stripe'

export async function onRequestGet({ env, request }) {
  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY)
    const url = new URL(request.url)
    const period = url.searchParams.get('period') || '30d' // 7d, 30d, 90d, 1y

    // Calculate date range based on period
    const now = new Date()
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }
    
    const days = periodDays[period] || 30
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
    
    // Fetch payment intents (completed orders)
    const paymentIntents = await stripe.paymentIntents.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
      },
      limit: 100, // Adjust as needed
    })

    // Fetch checkout sessions for more detailed order data
    const checkoutSessions = await stripe.checkout.sessions.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
      },
      limit: 100,
    })

    // Process the data
    const successfulPayments = paymentIntents.data.filter(
      pi => pi.status === 'succeeded'
    )

    const completedSessions = checkoutSessions.data.filter(
      session => session.payment_status === 'paid'
    )

    // Calculate metrics
    const totalRevenue = successfulPayments.reduce((sum, payment) => {
      return sum + payment.amount
    }, 0) / 100 // Convert from cents to dollars

    const totalOrders = successfulPayments.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Group data by date for charts
    const dailyData = {}
    const revenueByDate = {}
    
    successfulPayments.forEach(payment => {
      const date = new Date(payment.created * 1000).toISOString().split('T')[0]
      dailyData[date] = (dailyData[date] || 0) + 1
      revenueByDate[date] = (revenueByDate[date] || 0) + (payment.amount / 100)
    })

    // Convert to arrays for charts
    const chartData = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0]
      chartData.push({
        date: dateStr,
        orders: dailyData[dateStr] || 0,
        revenue: revenueByDate[dateStr] || 0,
        formattedDate: currentDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Recent orders for the dashboard
    const recentOrders = completedSessions.slice(0, 10).map(session => ({
      id: session.id,
      amount: session.amount_total / 100,
      currency: session.currency,
      customerEmail: session.customer_details?.email || 'N/A',
      createdAt: new Date(session.created * 1000).toISOString(),
      status: session.payment_status,
    }))

    // Calculate period comparison (vs previous period)
    const previousStartDate = new Date(startDate.getTime() - (days * 24 * 60 * 60 * 1000))
    
    const previousPayments = await stripe.paymentIntents.list({
      created: {
        gte: Math.floor(previousStartDate.getTime() / 1000),
        lt: Math.floor(startDate.getTime() / 1000),
      },
      limit: 100,
    })

    const previousSuccessfulPayments = previousPayments.data.filter(
      pi => pi.status === 'succeeded'
    )

    const previousRevenue = previousSuccessfulPayments.reduce((sum, payment) => {
      return sum + payment.amount
    }, 0) / 100

    const previousOrders = previousSuccessfulPayments.length

    // Calculate growth percentages
    const revenueGrowth = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : totalRevenue > 0 ? 100 : 0

    const ordersGrowth = previousOrders > 0 
      ? ((totalOrders - previousOrders) / previousOrders) * 100 
      : totalOrders > 0 ? 100 : 0

    const analytics = {
      period,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      ordersGrowth: Math.round(ordersGrowth * 10) / 10,
      chartData,
      recentOrders,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      }
    }

    return new Response(JSON.stringify(analytics), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch analytics data',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
