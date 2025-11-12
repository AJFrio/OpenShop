// Admin collection routes
import { Hono } from 'hono'
import { CollectionService } from '../../services/CollectionService.js'
import { getKVNamespace } from '../../utils/kv.js'
import { asyncHandler } from '../../middleware/errorHandler.js'

const router = new Hono()

// List all collections (admin - includes archived)
router.get('/', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const collectionService = new CollectionService(kvNamespace)
  const collections = await collectionService.getAllCollectionsAdmin()
  return c.json(collections)
}))

// Create collection
router.post('/', asyncHandler(async (c) => {
  const collectionData = await c.req.json()
  const kvNamespace = getKVNamespace(c.env)
  const collectionService = new CollectionService(kvNamespace)
  const savedCollection = await collectionService.createCollection(collectionData)
  return c.json(savedCollection, 201)
}))

// Get single collection
router.get('/:id', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const collectionService = new CollectionService(kvNamespace)
  const collection = await collectionService.getCollection(c.req.param('id'))
  return c.json(collection)
}))

// Update collection
router.put('/:id', asyncHandler(async (c) => {
  const updates = await c.req.json()
  const kvNamespace = getKVNamespace(c.env)
  const collectionService = new CollectionService(kvNamespace)
  const updatedCollection = await collectionService.updateCollection(c.req.param('id'), updates)
  return c.json(updatedCollection)
}))

// Delete collection
router.delete('/:id', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const collectionService = new CollectionService(kvNamespace)
  await collectionService.deleteCollection(c.req.param('id'))
  return c.json({ success: true })
}))

export default router

