// Cloudflare Function for Collection Products API
import { KVManager } from '../../../../src/lib/kv.js'

export async function onRequestGet({ params, env }) {
  try {
    const kv = new KVManager(env.OPENSHOP_KV)
    
    // Check if collection exists
    const collection = await kv.getCollection(params.id)
    if (!collection) {
      return new Response(JSON.stringify({ error: 'Collection not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get products in this collection
    const products = await kv.getProductsByCollection(params.id)
    
    return new Response(JSON.stringify(products), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching collection products:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch collection products' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
