// Product limit middleware - enforces product creation limits
import { getKVNamespace } from '../utils/kv.js'
import { StoreSettingsService } from '../services/StoreSettingsService.js'
import { ProductService } from '../services/ProductService.js'

/**
 * Middleware to check product limit before allowing product creation
 * Only applies to POST requests to /api/admin/products
 */
export async function productLimitMiddleware(c, next) {
  // Only check on POST requests to create products
  if (c.req.method !== 'POST' || c.req.path !== '/api/admin/products') {
    return next()
  }

  try {
    const kvNamespace = getKVNamespace(c.env)
    if (!kvNamespace) {
      console.error('Product limit middleware - KV namespace not available')
      return next() // Allow request to proceed if KV is unavailable
    }

    // Get store settings to check product limit
    const settingsService = new StoreSettingsService(kvNamespace)
    const settings = await settingsService.getSettings()
    
    // Check store settings first, then fall back to environment variable
    let productLimit = settings.productLimit
    
    // If not in store settings, check environment variable
    if ((productLimit === null || productLimit === undefined || productLimit === '') && c.env.PRODUCT_LIMIT) {
      productLimit = c.env.PRODUCT_LIMIT
    }
    
    // If no limit is set (null/undefined), allow unlimited products
    if (productLimit === null || productLimit === undefined || productLimit === '') {
      return next()
    }

    // Parse limit as integer
    const limit = parseInt(productLimit, 10)
    if (isNaN(limit) || limit <= 0) {
      // Invalid limit, treat as unlimited
      return next()
    }

    // Count current active products (excluding archived)
    const productService = new ProductService(kvNamespace)
    const allProducts = await productService.getAllProducts()
    const activeProductCount = allProducts.length

    // Check if limit is reached
    if (activeProductCount >= limit) {
      return c.json({
        error: 'Product limit reached',
        message: `You have reached your product limit of ${limit}. Please delete products or upgrade your plan to add more.`,
        limit: limit,
        current: activeProductCount
      }, 403)
    }

    // Under limit, allow request to proceed
    return next()
  } catch (error) {
    console.error('Product limit middleware error:', error)
    // On error, allow request to proceed (fail open)
    return next()
  }
}

