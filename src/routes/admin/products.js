// Admin product routes
import { Hono } from 'hono'
import { ProductService } from '../../services/ProductService.js'
import { StripeService } from '../../services/StripeService.js'
import { ProductStripeService } from '../../services/ProductStripeService.js'
import { getKVNamespace } from '../../utils/kv.js'
import { asyncHandler } from '../../middleware/errorHandler.js'

const router = new Hono()

// List all products (admin - includes archived)
router.get('/', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const productService = new ProductService(kvNamespace)
  const products = await productService.getAllProductsAdmin()
  return c.json(products)
}))

// Create product
router.post('/', asyncHandler(async (c) => {
  const productData = await c.req.json()
  const kvNamespace = getKVNamespace(c.env)
  const productService = new ProductService(kvNamespace)
  const stripeService = new StripeService(c.env.STRIPE_SECRET_KEY, c.env.SITE_URL)
  const productStripeService = new ProductStripeService(stripeService)

  // Create Stripe product and prices
  const { stripeProduct, basePrice, variantPrices } = await productStripeService.createProductWithPrices(productData)

  const product = {
    ...productData,
    stripePriceId: basePrice?.id || Object.values(variantPrices)[0] || '',
    stripeProductId: stripeProduct.id,
    variantPrices: variantPrices,
    variants: Array.isArray(productData.variants) ? productData.variants : [],
    variants2: Array.isArray(productData.variants2) ? productData.variants2 : []
  }

  const savedProduct = await productService.createProduct(product)
  return c.json(savedProduct, 201)
}))

// Get single product
router.get('/:id', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const productService = new ProductService(kvNamespace)
  const product = await productService.getProduct(c.req.param('id'))
  return c.json(product)
}))

// Update product
router.put('/:id', asyncHandler(async (c) => {
  const updates = await c.req.json()
  const kvNamespace = getKVNamespace(c.env)
  const productService = new ProductService(kvNamespace)
  const stripeService = new StripeService(c.env.STRIPE_SECRET_KEY, c.env.SITE_URL)
  const productStripeService = new ProductStripeService(stripeService)

  const existingProduct = await productService.getProduct(c.req.param('id'))

  // Update Stripe product if necessary
  if (updates.name || updates.description !== undefined || updates.images || updates.imageUrl) {
    const stripeImages = Array.isArray(updates.images) ? updates.images : 
                        (updates.imageUrl ? [updates.imageUrl] : 
                        (Array.isArray(existingProduct.images) ? existingProduct.images : 
                        (existingProduct.imageUrl ? [existingProduct.imageUrl] : [])))

    await stripeService.updateProduct(existingProduct.stripeProductId, {
      name: updates.name || existingProduct.name,
      description: updates.description,
      images: stripeImages.slice(0, 8),
    })
  }

  // If price changed, create new price in Stripe
  if (typeof updates.price !== 'undefined' && updates.price !== existingProduct.price) {
    const numericPrice = typeof updates.price === 'number' ? updates.price : parseFloat(String(updates.price))
    const newPrice = await stripeService.createPrice({
      amount: numericPrice,
      currency: updates.currency || existingProduct.currency,
      productId: existingProduct.stripeProductId,
      nickname: `${updates.name || existingProduct.name} - Base`,
      metadata: {}
    })
    
    // Archive old price
    if (existingProduct.stripePriceId) {
      await stripeService.archivePrice(existingProduct.stripePriceId)
    }
    
    updates.stripePriceId = newPrice.id
    updates.price = numericPrice
  }

  // Handle variant updates
  if (Array.isArray(updates.variants) || Array.isArray(updates.variants2)) {
    const variantUpdates = await productStripeService.updateProductVariants(existingProduct, updates, stripeService)
    updates.variants = variantUpdates.variants
    updates.variants2 = variantUpdates.variants2
  }

  const updatedProduct = await productService.updateProduct(c.req.param('id'), updates)
  return c.json(updatedProduct)
}))

// Delete product
router.delete('/:id', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const productService = new ProductService(kvNamespace)
  const stripeService = new StripeService(c.env.STRIPE_SECRET_KEY, c.env.SITE_URL)

  const existingProduct = await productService.getProduct(c.req.param('id'))

  // Archive Stripe product and price
  if (existingProduct.stripePriceId) {
    await stripeService.archivePrice(existingProduct.stripePriceId)
  }
  if (existingProduct.stripeProductId) {
    await stripeService.archiveProduct(existingProduct.stripeProductId)
  }

  await productService.deleteProduct(c.req.param('id'))
  return c.json({ success: true })
}))

export default router

