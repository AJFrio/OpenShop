// Cloudflare Function for Individual Collection API
import { KVManager } from '../../../src/lib/kv.js'

export async function onRequestGet({ params, env }) {
  try {
    const kv = new KVManager(env.OPENSHOP_KV)
    const collection = await kv.getCollection(params.id)
    
    if (!collection) {
      return new Response(JSON.stringify({ error: 'Collection not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(collection), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching collection:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch collection' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function onRequestPut({ params, request, env }) {
  try {
    const updates = await request.json()
    const kv = new KVManager(env.OPENSHOP_KV)

    // Update in KV
    const updatedCollection = await kv.updateCollection(params.id, updates)

    return new Response(JSON.stringify(updatedCollection), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error updating collection:', error)
    return new Response(JSON.stringify({ error: 'Failed to update collection' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function onRequestDelete({ params, env }) {
  try {
    const kv = new KVManager(env.OPENSHOP_KV)

    // Check if collection exists
    const existingCollection = await kv.getCollection(params.id)
    if (!existingCollection) {
      return new Response(JSON.stringify({ error: 'Collection not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Delete from KV
    await kv.deleteCollection(params.id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error deleting collection:', error)
    return new Response(JSON.stringify({ error: 'Failed to delete collection' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
