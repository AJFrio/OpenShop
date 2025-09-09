// Admin-only Products API with authentication
import { KVManager } from '../../../src/lib/kv.js'
import { verifyAdminAuth, createAuthErrorResponse } from './auth-middleware.js'
import Stripe from 'stripe'

export async function onRequestPost({ request, env }) {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request, env)
  if (!authResult.isValid) {
    return createAuthErrorResponse(authResult.error, authResult.status)
  }

  try {
    const productData = await request.json()
    const kv = new KVManager(env.OPENSHOP_KV)
    const stripe = new Stripe(env.STRIPE_SECRET_KEY)

    // Create product in Stripe
    const stripeImages = Array.isArray(productData.images) ? productData.images : 
                        (productData.imageUrl ? [productData.imageUrl] : [])
    
    const stripeProduct = await stripe.products.create({
      name: productData.name,
      description: productData.description,
      images: stripeImages.slice(0, 8), // Stripe allows max 8 images
    })

    // Create price in Stripe
    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round(productData.price * 100), // Convert to cents
      currency: productData.currency,
      product: stripeProduct.id,
    })

    // Add Stripe price ID to product data
    const product = {
      ...productData,
      stripePriceId: stripePrice.id,
      stripeProductId: stripeProduct.id,
    }

    // Save to KV
    const savedProduct = await kv.createProduct(product)

    return new Response(JSON.stringify(savedProduct), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating product:', error)
    return new Response(JSON.stringify({ error: 'Failed to create product' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function onRequestPut({ request, env }) {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request, env)
  if (!authResult.isValid) {
    return createAuthErrorResponse(authResult.error, authResult.status)
  }

  // Implementation for updating products (similar to current products/[id].js PUT)
  return new Response(JSON.stringify({ message: 'Product update endpoint - implement as needed' }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function onRequestDelete({ request, env }) {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request, env)
  if (!authResult.isValid) {
    return createAuthErrorResponse(authResult.error, authResult.status)
  }

  // Implementation for deleting products (similar to current products/[id].js DELETE)
  return new Response(JSON.stringify({ message: 'Product delete endpoint - implement as needed' }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
