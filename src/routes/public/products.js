// Public product routes
import { Hono } from 'hono'
import { ProductService } from '../../services/ProductService.js'
import { getKVNamespace } from '../../utils/kv.js'
import { asyncHandler } from '../../middleware/errorHandler.js'

const router = new Hono()

// Get all products
router.get('/', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const productService = new ProductService(kvNamespace)
  const products = await productService.getAllProducts()
  return c.json(products)
}))

// Get single product
router.get('/:id', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const productService = new ProductService(kvNamespace)
  const product = await productService.getProduct(c.req.param('id'))
  return c.json(product)
}))

export default router

