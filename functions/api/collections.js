// Cloudflare Function for Collections API
import { KVManager } from '../../src/lib/kv.js'

export async function onRequestGet({ env }) {
  try {
    const kv = new KVManager(env.OPENSHOP_KV)
    const collections = await kv.getAllCollections()
    
    return new Response(JSON.stringify(collections), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching collections:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch collections' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const collectionData = await request.json()
    const kv = new KVManager(env.OPENSHOP_KV)

    // Save to KV
    const savedCollection = await kv.createCollection(collectionData)

    return new Response(JSON.stringify(savedCollection), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating collection:', error)
    return new Response(JSON.stringify({ error: 'Failed to create collection' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
