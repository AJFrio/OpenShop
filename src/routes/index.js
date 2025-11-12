// Route registration - imports and registers all routes
import { Hono } from 'hono'

// Public routes
import productsRouter from './public/products.js'
import collectionsRouter from './public/collections.js'
import storefrontRouter from './public/storefront.js'
import checkoutRouter from './public/checkout.js'
import imageProxyRouter from './public/imageProxy.js'
import storeSettingsRouter, { contactEmailRouter } from './public/storeSettings.js'

// Admin routes
import authRouter from './admin/auth.js'
import adminProductsRouter from './admin/products.js'
import adminCollectionsRouter from './admin/collections.js'
import analyticsRouter from './admin/analytics.js'
import mediaRouter from './admin/media.js'
import driveRouter from './admin/drive.js'
import settingsRouter from './admin/settings.js'
import aiRouter from './admin/ai.js'

/**
 * Register all routes on the app
 * @param {Hono} app - Hono app instance
 */
export function registerRoutes(app) {
  // Health check
  app.get('/api/health', (c) => {
    return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
  })

  // Public API routes
  app.route('/api/products', productsRouter)
  app.route('/api/collections', collectionsRouter)
  app.route('/api/storefront', storefrontRouter)
  app.route('/api', checkoutRouter) // /api/create-checkout-session, etc.
  app.route('/api/image-proxy', imageProxyRouter)
  app.route('/api/store-settings', storeSettingsRouter)
  app.route('/api/contact-email', contactEmailRouter)

  // Admin API routes
  app.route('/api/admin', authRouter) // /api/admin/login
  app.route('/api/admin/products', adminProductsRouter)
  app.route('/api/admin/collections', adminCollectionsRouter)
  app.route('/api/admin/analytics', analyticsRouter)
  app.route('/api/admin/media', mediaRouter)
  app.route('/api/admin/drive', driveRouter)
  app.route('/api/admin', settingsRouter) // /api/admin/storefront/theme, etc.
  app.route('/api/admin/ai', aiRouter)
}

