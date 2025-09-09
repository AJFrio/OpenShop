import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe
let stripePromise
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

export { getStripe }

// Client-side Stripe operations
export async function redirectToCheckout(priceId) {
  try {
    const stripe = await getStripe()
    
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId }),
    })

    const session = await response.json()

    if (session.error) {
      throw new Error(session.error)
    }

    const result = await stripe.redirectToCheckout({
      sessionId: session.sessionId,
    })

    if (result.error) {
      throw new Error(result.error.message)
    }
  } catch (error) {
    console.error('Error redirecting to checkout:', error)
    throw error
  }
}
