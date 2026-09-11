// Cloudflare KV operations
// This will be used by Cloudflare Functions to interact with KV storage

export class KVManager {
  constructor(namespace) {
    this.namespace = namespace
  }

  // Product operations
  async createProduct(product) {
    // Callers do not supply an id — neither the admin UI nor the agent's
    // create_product tool does. Without one this wrote to `product:undefined`
    // and pushed `undefined` into products:all, so the create returned 201
    // with no id and the product was invisible everywhere afterwards.
    const id = product.id || crypto.randomUUID()
    const key = `product:${id}`
    // Ensure images is always an array
    const productData = {
      ...product,
      id,
      images: Array.isArray(product.images) ? product.images : (product.imageUrl ? [product.imageUrl] : [])
    }
    await this.namespace.put(key, JSON.stringify(productData))
    
    // Also update the products list
    const productIds = await this.namespace.get('products:all')
    const existingIds = productIds ? JSON.parse(productIds) : []
    // Drop any nulls left by creates that ran before ids were generated;
    // they resolve to nothing and make every listing skip an entry.
    const cleanedIds = existingIds.filter(Boolean)
    cleanedIds.push(id)
    await this.namespace.put('products:all', JSON.stringify(cleanedIds))

    // Update collection index if present
    if (productData.collectionId) {
      const collKey = `collection:products:${productData.collectionId}`
      const collProductIds = await this.namespace.get(collKey)
      const existingCollIds = collProductIds ? JSON.parse(collProductIds) : []
      if (!existingCollIds.includes(productData.id)) {
        existingCollIds.push(productData.id)
        await this.namespace.put(collKey, JSON.stringify(existingCollIds))
      }
    }
    
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

    // Update collection index if collectionId changed
    if (existing.collectionId !== updated.collectionId) {
      // Remove from old collection index
      if (existing.collectionId) {
        const oldCollKey = `collection:products:${existing.collectionId}`
        const oldCollProductIds = await this.namespace.get(oldCollKey)
        if (oldCollProductIds) {
          const ids = JSON.parse(oldCollProductIds).filter(pid => pid !== id)
          await this.namespace.put(oldCollKey, JSON.stringify(ids))
        }
      }
      // Add to new collection index
      if (updated.collectionId) {
        const newCollKey = `collection:products:${updated.collectionId}`
        const newCollProductIds = await this.namespace.get(newCollKey)
        const ids = newCollProductIds ? JSON.parse(newCollProductIds) : []
        if (!ids.includes(id)) {
          ids.push(id)
          await this.namespace.put(newCollKey, JSON.stringify(ids))
        }
      }
    }

    return updated
  }

  async deleteProduct(id) {
    const product = await this.getProduct(id)
    const key = `product:${id}`
    await this.namespace.delete(key)
    
    // Remove from products list
    const productIds = await this.namespace.get('products:all')
    if (productIds) {
      const existingIds = JSON.parse(productIds)
      const filtered = existingIds.filter(pid => pid !== id)
      await this.namespace.put('products:all', JSON.stringify(filtered))
    }

    // Remove from collection index
    if (product && product.collectionId) {
      const collKey = `collection:products:${product.collectionId}`
      const collProductIds = await this.namespace.get(collKey)
      if (collProductIds) {
        const ids = JSON.parse(collProductIds).filter(pid => pid !== id)
        await this.namespace.put(collKey, JSON.stringify(ids))
      }
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
    // Same missing-id problem as createProduct: no caller supplies one.
    const id = collection.id || crypto.randomUUID()
    const key = `collection:${id}`
    const collectionData = { ...collection, id }
    await this.namespace.put(key, JSON.stringify(collectionData))
    
    // Also update the collections list
    const collectionIds = await this.namespace.get('collections:all')
    const existingIds = collectionIds ? JSON.parse(collectionIds) : []
    const cleanedIds = existingIds.filter(Boolean)
    cleanedIds.push(id)
    await this.namespace.put('collections:all', JSON.stringify(cleanedIds))
    
    return collectionData
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

    // Clean up the index
    await this.namespace.delete(`collection:products:${id}`)
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
    const collKey = `collection:products:${collectionId}`
    const productIds = await this.namespace.get(collKey)
    if (!productIds) return []

    const ids = JSON.parse(productIds)
    const products = await Promise.all(
      ids.map(id => this.getProduct(id))
    )
    return products.filter(Boolean)
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
