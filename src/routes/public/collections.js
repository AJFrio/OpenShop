// Public collection routes
import { Hono } from 'hono'
import { CollectionService } from '../../services/CollectionService.js'
import { ProductService } from '../../services/ProductService.js'
import { getKVNamespace } from '../../utils/kv.js'
import { asyncHandler } from '../../middleware/errorHandler.js'

const router = new Hono()

// Get all collections
router.get('/', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const collectionService = new CollectionService(kvNamespace)
  const collections = await collectionService.getAllCollections()
  return c.json(collections)
}))

// Get single collection
router.get('/:id', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const collectionService = new CollectionService(kvNamespace)
  const collection = await collectionService.getCollection(c.req.param('id'))
  return c.json(collection)
}))

// Get products in collection
router.get('/:id/products', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const collectionService = new CollectionService(kvNamespace)
  const products = await collectionService.getProductsInCollection(c.req.param('id'))
  return c.json(products)
}))

export default router

