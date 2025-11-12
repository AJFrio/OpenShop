// Unit tests for CollectionService
import { describe, it, expect, beforeEach } from 'vitest'
import { CollectionService } from '../../../src/services/CollectionService.js'
import { createMockKV } from '../../setup.js'
import { NotFoundError } from '../../../src/utils/errors.js'
import { setupCollectionInKV, setupProductInKV, createTestCollection, createTestProduct } from '../../utils/test-helpers.js'

describe('CollectionService', () => {
  let collectionService
  let mockKV

  beforeEach(() => {
    mockKV = createMockKV()
    collectionService = new CollectionService(mockKV)
  })

  describe('getAllCollections', () => {
    it('should return all active collections', async () => {
      const coll1 = createTestCollection({ id: 'coll_1', name: 'Collection 1', archived: false })
      const coll2 = createTestCollection({ id: 'coll_2', name: 'Collection 2', archived: true })
      const coll3 = createTestCollection({ id: 'coll_3', name: 'Collection 3', archived: false })

      await setupCollectionInKV(mockKV, coll1)
      await setupCollectionInKV(mockKV, coll2)
      await setupCollectionInKV(mockKV, coll3)

      const result = await collectionService.getAllCollections()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      expect(result.find(c => c.id === 'coll_1')).toBeTruthy()
      expect(result.find(c => c.id === 'coll_3')).toBeTruthy()
      expect(result.find(c => c.id === 'coll_2')).toBeFalsy()
    })

    it('should return empty array when no collections exist', async () => {
      const result = await collectionService.getAllCollections()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })
  })

  describe('getAllCollectionsAdmin', () => {
    it('should return all collections including archived', async () => {
      const coll1 = createTestCollection({ id: 'coll_1', name: 'Collection 1', archived: false })
      const coll2 = createTestCollection({ id: 'coll_2', name: 'Collection 2', archived: true })

      await setupCollectionInKV(mockKV, coll1)
      await setupCollectionInKV(mockKV, coll2)

      const result = await collectionService.getAllCollectionsAdmin()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      expect(result.find(c => c.id === 'coll_1')).toBeTruthy()
      expect(result.find(c => c.id === 'coll_2')).toBeTruthy()
    })
  })

  describe('getCollection', () => {
    it('should return a collection by ID', async () => {
      const collection = createTestCollection({ id: 'coll_123', name: 'Test Collection' })
      await setupCollectionInKV(mockKV, collection)

      const result = await collectionService.getCollection('coll_123')

      expect(result.id).toBe('coll_123')
      expect(result.name).toBe('Test Collection')
    })

    it('should throw NotFoundError for non-existent collection', async () => {
      await expect(
        collectionService.getCollection('non-existent')
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('createCollection', () => {
    it('should create a new collection', async () => {
      const collectionData = {
        id: 'coll_new',
        name: 'New Collection',
        description: 'Collection description',
        heroImage: 'https://example.com/hero.jpg'
      }

      const result = await collectionService.createCollection(collectionData)

      expect(result).toMatchObject(collectionData)

      // Verify it was stored in KV
      const stored = await mockKV.get('collection:coll_new')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored)
      expect(parsed.name).toBe('New Collection')
    })
  })

  describe('updateCollection', () => {
    it('should update an existing collection', async () => {
      const collection = createTestCollection({ id: 'coll_123', name: 'Original Name' })
      await setupCollectionInKV(mockKV, collection)

      const updates = { name: 'Updated Name', description: 'Updated description' }
      const result = await collectionService.updateCollection('coll_123', updates)

      expect(result.name).toBe('Updated Name')
      expect(result.description).toBe('Updated description')
    })

    it('should throw NotFoundError for non-existent collection', async () => {
      await expect(
        collectionService.updateCollection('non-existent', { name: 'Updated' })
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('deleteCollection', () => {
    it('should delete a collection', async () => {
      const collection = createTestCollection({ id: 'coll_123', name: 'Test Collection' })
      await setupCollectionInKV(mockKV, collection)

      await collectionService.deleteCollection('coll_123')

      // Verify it was deleted from KV
      const deleted = await mockKV.get('collection:coll_123')
      expect(deleted).toBeNull()
    })

    it('should throw NotFoundError for non-existent collection', async () => {
      await expect(
        collectionService.deleteCollection('non-existent')
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('getProductsInCollection', () => {
    it('should return products in a collection', async () => {
      const collection = createTestCollection({ id: 'coll_123', name: 'Test Collection' })
      const product1 = createTestProduct({ id: 'prod_1', collectionId: 'coll_123', archived: false })
      const product2 = createTestProduct({ id: 'prod_2', collectionId: 'coll_123', archived: false })
      const product3 = createTestProduct({ id: 'prod_3', collectionId: 'other', archived: false })

      await setupCollectionInKV(mockKV, collection)
      await setupProductInKV(mockKV, product1)
      await setupProductInKV(mockKV, product2)
      await setupProductInKV(mockKV, product3)

      const result = await collectionService.getProductsInCollection('coll_123')

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      expect(result.find(p => p.id === 'prod_1')).toBeTruthy()
      expect(result.find(p => p.id === 'prod_2')).toBeTruthy()
      expect(result.find(p => p.id === 'prod_3')).toBeFalsy()
    })

    it('should return empty array for archived collection', async () => {
      const collection = createTestCollection({ id: 'coll_123', name: 'Test Collection', archived: true })
      const product = createTestProduct({ id: 'prod_1', collectionId: 'coll_123', archived: false })

      await setupCollectionInKV(mockKV, collection)
      await setupProductInKV(mockKV, product)

      const result = await collectionService.getProductsInCollection('coll_123')

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })

    it('should filter out archived products', async () => {
      const collection = createTestCollection({ id: 'coll_123', name: 'Test Collection' })
      const product1 = createTestProduct({ id: 'prod_1', collectionId: 'coll_123', archived: false })
      const product2 = createTestProduct({ id: 'prod_2', collectionId: 'coll_123', archived: true })

      await setupCollectionInKV(mockKV, collection)
      await setupProductInKV(mockKV, product1)
      await setupProductInKV(mockKV, product2)

      const result = await collectionService.getProductsInCollection('coll_123')

      expect(result.length).toBe(1)
      expect(result.find(p => p.id === 'prod_1')).toBeTruthy()
      expect(result.find(p => p.id === 'prod_2')).toBeFalsy()
    })
  })
})


