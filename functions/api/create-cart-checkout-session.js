// Cloudflare Function for Cart Checkout Session with Multiple Items
import Stripe from 'stripe'

export async function onRequestPost({ request, env }) {
  try {
    const { items } = await request.json()
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Cart items are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY)

    // Create line items for Stripe checkout
    const lineItems = items.map(item => ({
      price: item.stripePriceId,
      quantity: item.quantity,
    }))

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${env.SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.SITE_URL}/`,
      // Optional: Add metadata for order tracking
      metadata: {
        order_type: 'cart_checkout',
        item_count: items.length.toString(),
        total_quantity: items.reduce((sum, item) => sum + item.quantity, 0).toString(),
      },
    })

    return new Response(JSON.stringify({ sessionId: session.id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating cart checkout session:', error)
    return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
