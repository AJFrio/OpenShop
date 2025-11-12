// Collection service - handles collection business logic
import { KVManager } from '../lib/kv.js'
import { NotFoundError } from '../utils/errors.js'

export class CollectionService {
  constructor(kvNamespace) {
    this.kv = new KVManager(kvNamespace)
  }

  /**
   * Get all collections (excluding archived)
   */
  async getAllCollections() {
    const collections = await this.kv.getAllCollections()
    return collections.filter(col => !col.archived)
  }

  /**
   * Get all collections including archived (for admin)
   */
  async getAllCollectionsAdmin() {
    return await this.kv.getAllCollections()
  }

  /**
   * Get single collection by ID
   */
  async getCollection(id) {
    const collection = await this.kv.getCollection(id)
    if (!collection) {
      throw new NotFoundError('Collection not found')
    }
    return collection
  }

  /**
   * Create a new collection
   */
  async createCollection(collectionData) {
    return await this.kv.createCollection(collectionData)
  }

  /**
   * Update an existing collection
   */
  async updateCollection(id, updates) {
    const existing = await this.kv.getCollection(id)
    if (!existing) {
      throw new NotFoundError('Collection not found')
    }
    return await this.kv.updateCollection(id, updates)
  }

  /**
   * Delete a collection
   */
  async deleteCollection(id) {
    const existing = await this.kv.getCollection(id)
    if (!existing) {
      throw new NotFoundError('Collection not found')
    }
    await this.kv.deleteCollection(id)
  }

  /**
   * Get products in a collection (with archived check)
   */
  async getProductsInCollection(collectionId) {
    const collection = await this.kv.getCollection(collectionId)
    const products = await this.kv.getProductsByCollection(collectionId)
    
    // If collection is archived, hide all products regardless of product flag
    if (collection && collection.archived) {
      return []
    }
    
    return products.filter(p => !p.archived)
  }
}

