// Cloudflare KV operations
// This will be used by Cloudflare Functions to interact with KV storage

export class KVManager {
  constructor(namespace) {
    this.namespace = namespace
  }

  // Product operations
  async createProduct(product) {
    const key = `product:${product.id}`
    // Ensure images is always an array
    const productData = {
      ...product,
      images: Array.isArray(product.images) ? product.images : (product.imageUrl ? [product.imageUrl] : [])
    }
    await this.namespace.put(key, JSON.stringify(productData))
    
    // Also update the products list
    const productIds = await this.namespace.get('products:all')
    const existingIds = productIds ? JSON.parse(productIds) : []
    existingIds.push(product.id)
    await this.namespace.put('products:all', JSON.stringify(existingIds))
    
    return productData
  }

  async getProduct(id) {
    const key = `product:${id}`
    const product = await this.namespace.get(key)
    return product ? JSON.parse(product) : null
  }

  async updateProduct(id, updates) {
    const existing = await this.getProduct(id)
    if (!existing) throw new Error('Product not found')
    
    const updated = { 
      ...existing, 
      ...updates,
      // Ensure images is always an array
      images: Array.isArray(updates.images) ? updates.images : 
              (updates.imageUrl ? [updates.imageUrl] : existing.images || [])
    }
    const key = `product:${id}`
    await this.namespace.put(key, JSON.stringify(updated))
    return updated
  }

  async deleteProduct(id) {
    const key = `product:${id}`
    await this.namespace.delete(key)
    
    // Remove from products list
    const productIds = await this.namespace.get('products:all')
    if (productIds) {
      const existingIds = JSON.parse(productIds)
      const filtered = existingIds.filter(pid => pid !== id)
      await this.namespace.put('products:all', JSON.stringify(filtered))
    }
  }

  async getAllProducts() {
    const productIds = await this.namespace.get('products:all')
    if (!productIds) return []
    
    const ids = JSON.parse(productIds)
    const products = await Promise.all(
      ids.map(id => this.getProduct(id))
    )
    return products.filter(Boolean)
  }

  // Collection operations
  async createCollection(collection) {
    const key = `collection:${collection.id}`
    await this.namespace.put(key, JSON.stringify(collection))
    
    // Also update the collections list
    const collectionIds = await this.namespace.get('collections:all')
    const existingIds = collectionIds ? JSON.parse(collectionIds) : []
    existingIds.push(collection.id)
    await this.namespace.put('collections:all', JSON.stringify(existingIds))
    
    return collection
  }

  async getCollection(id) {
    const key = `collection:${id}`
    const collection = await this.namespace.get(key)
    return collection ? JSON.parse(collection) : null
  }

  async updateCollection(id, updates) {
    const existing = await this.getCollection(id)
    if (!existing) throw new Error('Collection not found')
    
    const updated = { ...existing, ...updates }
    const key = `collection:${id}`
    await this.namespace.put(key, JSON.stringify(updated))
    return updated
  }

  async deleteCollection(id) {
    const key = `collection:${id}`
    await this.namespace.delete(key)
    
    // Remove from collections list
    const collectionIds = await this.namespace.get('collections:all')
    if (collectionIds) {
      const existingIds = JSON.parse(collectionIds)
      const filtered = existingIds.filter(cid => cid !== id)
      await this.namespace.put('collections:all', JSON.stringify(filtered))
    }
  }

  async getAllCollections() {
    const collectionIds = await this.namespace.get('collections:all')
    if (!collectionIds) return []
    
    const ids = JSON.parse(collectionIds)
    const collections = await Promise.all(
      ids.map(id => this.getCollection(id))
    )
    return collections.filter(Boolean)
  }

  async getProductsByCollection(collectionId) {
    const allProducts = await this.getAllProducts()
    return allProducts.filter(product => product.collectionId === collectionId)
  }

  // Media operations
  async createMediaItem(item) {
    const id = item.id
    if (!id) throw new Error('Media item missing id')
    const key = `media:${id}`
    const record = {
      id,
      url: String(item.url || ''),
      source: item.source || 'unknown',
      filename: item.filename || '',
      mimeType: item.mimeType || '',
      driveFileId: item.driveFileId || '',
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
      updatedAt: Date.now(),
    }
    await this.namespace.put(key, JSON.stringify(record))

    const listKey = 'media:all'
    const existing = await this.namespace.get(listKey)
    const ids = existing ? JSON.parse(existing) : []
    if (!ids.includes(id)) ids.push(id)
    await this.namespace.put(listKey, JSON.stringify(ids))
    return record
  }

  async getMediaItem(id) {
    const key = `media:${id}`
    const raw = await this.namespace.get(key)
    return raw ? JSON.parse(raw) : null
  }

  async deleteMediaItem(id) {
    const key = `media:${id}`
    await this.namespace.delete(key)
    const listKey = 'media:all'
    const existing = await this.namespace.get(listKey)
    if (existing) {
      const ids = JSON.parse(existing)
      const next = ids.filter(mid => mid !== id)
      await this.namespace.put(listKey, JSON.stringify(next))
    }
  }

  async getAllMediaItems() {
    const listKey = 'media:all'
    const existing = await this.namespace.get(listKey)
    if (!existing) return []
    const ids = JSON.parse(existing)
    const items = await Promise.all(ids.map(id => this.getMediaItem(id)))
    return items.filter(Boolean)
  }
}
