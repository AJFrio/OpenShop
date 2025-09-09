// Cloudflare Function for Individual Product API
import { KVManager } from '../../../src/lib/kv.js'
import Stripe from 'stripe'

export async function onRequestGet({ params, env }) {
  try {
    const kv = new KVManager(env.OPENSHOP_KV)
    const product = await kv.getProduct(params.id)
    
    if (!product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(product), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch product' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function onRequestPut({ params, request, env }) {
  try {
    const updates = await request.json()
    const kv = new KVManager(env.OPENSHOP_KV)
    const stripe = new Stripe(env.STRIPE_SECRET_KEY)

    // Get existing product
    const existingProduct = await kv.getProduct(params.id)
    if (!existingProduct) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Update Stripe product if necessary
    if (updates.name || updates.description || updates.images || updates.imageUrl) {
      const stripeImages = Array.isArray(updates.images) ? updates.images : 
                          (updates.imageUrl ? [updates.imageUrl] : 
                          (Array.isArray(existingProduct.images) ? existingProduct.images : 
                          (existingProduct.imageUrl ? [existingProduct.imageUrl] : [])))
      
      await stripe.products.update(existingProduct.stripeProductId, {
        name: updates.name || existingProduct.name,
        description: updates.description || existingProduct.description,
        images: stripeImages.slice(0, 8), // Stripe allows max 8 images
      })
    }

    // If price changed, create new price in Stripe
    if (updates.price && updates.price !== existingProduct.price) {
      const newPrice = await stripe.prices.create({
        unit_amount: Math.round(updates.price * 100),
        currency: updates.currency || existingProduct.currency,
        product: existingProduct.stripeProductId,
      })
      
      // Archive old price
      if (existingProduct.stripePriceId) {
        await stripe.prices.update(existingProduct.stripePriceId, {
          active: false,
        })
      }
      
      updates.stripePriceId = newPrice.id
    }

    // Update in KV
    const updatedProduct = await kv.updateProduct(params.id, updates)

    return new Response(JSON.stringify(updatedProduct), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error updating product:', error)
    return new Response(JSON.stringify({ error: 'Failed to update product' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function onRequestDelete({ params, env }) {
  try {
    const kv = new KVManager(env.OPENSHOP_KV)
    const stripe = new Stripe(env.STRIPE_SECRET_KEY)

    // Get existing product
    const existingProduct = await kv.getProduct(params.id)
    if (!existingProduct) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Archive Stripe product and price
    if (existingProduct.stripePriceId) {
      await stripe.prices.update(existingProduct.stripePriceId, {
        active: false,
      })
    }
    
    if (existingProduct.stripeProductId) {
      await stripe.products.update(existingProduct.stripeProductId, {
        active: false,
      })
    }

    // Delete from KV
    await kv.deleteProduct(params.id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    return new Response(JSON.stringify({ error: 'Failed to delete product' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
