// Example unit test for ProductService
// This demonstrates the testing structure

import { describe, it, expect, beforeEach } from 'vitest'
import { ProductService } from '../../../src/services/ProductService.js'
import { createMockKV } from '../../setup.js'

describe('ProductService', () => {
  let productService
  let mockKV

  beforeEach(() => {
    mockKV = createMockKV()
    productService = new ProductService(mockKV)
  })

  it('should create a product', async () => {
    const productData = {
      id: 'test-product-1',
      name: 'Test Product',
      price: 29.99,
      currency: 'usd'
    }

    const result = await productService.createProduct(productData)
    
    expect(result).toMatchObject(productData)
    
    // Verify it was stored in KV
    const stored = await mockKV.get('product:test-product-1')
    expect(stored).toBeTruthy()
  })

  it('should get a product by ID', async () => {
    // Setup: create a product first
    const productData = {
      id: 'test-product-2',
      name: 'Test Product 2',
      price: 39.99,
      currency: 'usd'
    }
    await productService.createProduct(productData)

    // Test: get the product
    const result = await productService.getProduct('test-product-2')
    
    expect(result).toMatchObject(productData)
  })

  it('should throw NotFoundError for non-existent product', async () => {
    await expect(
      productService.getProduct('non-existent')
    ).rejects.toThrow('Product not found')
  })
})

