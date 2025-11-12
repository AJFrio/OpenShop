// Product service - handles product business logic
import { KVManager } from '../lib/kv.js'
import { NotFoundError } from '../utils/errors.js'

export class ProductService {
  constructor(kvNamespace) {
    this.kv = new KVManager(kvNamespace)
  }

  /**
   * Get all products (excluding archived)
   */
  async getAllProducts() {
    const products = await this.kv.getAllProducts()
    return products.filter(p => !p.archived)
  }

  /**
   * Get all products including archived (for admin)
   */
  async getAllProductsAdmin() {
    return await this.kv.getAllProducts()
  }

  /**
   * Get single product by ID
   */
  async getProduct(id) {
    const product = await this.kv.getProduct(id)
    if (!product) {
      throw new NotFoundError('Product not found')
    }
    return product
  }

  /**
   * Create a new product
   */
  async createProduct(productData) {
    return await this.kv.createProduct(productData)
  }

  /**
   * Update an existing product
   */
  async updateProduct(id, updates) {
    const existing = await this.kv.getProduct(id)
    if (!existing) {
      throw new NotFoundError('Product not found')
    }
    return await this.kv.updateProduct(id, updates)
  }

  /**
   * Delete a product
   */
  async deleteProduct(id) {
    const existing = await this.kv.getProduct(id)
    if (!existing) {
      throw new NotFoundError('Product not found')
    }
    await this.kv.deleteProduct(id)
  }

  /**
   * Get products by collection ID
   */
  async getProductsByCollection(collectionId) {
    const products = await this.kv.getProductsByCollection(collectionId)
    return products.filter(p => !p.archived)
  }
}

