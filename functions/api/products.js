// Cloudflare Function for Products API
import { KVManager } from '../../src/lib/kv.js'
import Stripe from 'stripe'

export async function onRequestGet({ env }) {
  try {
    // Use the dynamically named KV namespace (will be set in wrangler.toml)
    const kvNamespace = Object.values(env).find(binding => 
      binding && typeof binding.get === 'function'
    ) || env.OPENSHOP_KV // fallback
    const kv = new KVManager(kvNamespace)
    const products = await kv.getAllProducts()
    
    return new Response(JSON.stringify(products), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch products' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// POST method removed - use /api/admin/products for admin operations
export async function onRequestPost({ request, env }) {
  return new Response(JSON.stringify({ 
    error: 'Unauthorized. Use admin endpoints for write operations.' 
  }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}
