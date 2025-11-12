// Storefront API client
import apiClient from './client.js'
import { API_ENDPOINTS } from './endpoints.js'

export const storefrontAPI = {
  /**
   * Get storefront theme
   */
  getTheme: () => apiClient.get(API_ENDPOINTS.storefront.theme),

  /**
   * Get store settings
   */
  getStoreSettings: () => apiClient.get(API_ENDPOINTS.storeSettings.get),

  /**
   * Get contact email
   */
  getContactEmail: () => apiClient.get(API_ENDPOINTS.storeSettings.contactEmail),

  /**
   * Create checkout session
   */
  createCheckoutSession: (priceId) => 
    apiClient.post(API_ENDPOINTS.checkout.createSession, { priceId }),

  /**
   * Create cart checkout session
   */
  createCartCheckoutSession: (items) => 
    apiClient.post(API_ENDPOINTS.checkout.createCartSession, { items }),

  /**
   * Get checkout session
   */
  getCheckoutSession: (sessionId) => 
    apiClient.get(API_ENDPOINTS.checkout.getSession(sessionId)),

  /**
   * Get image proxy URL
   */
  getImageProxyUrl: (src) => API_ENDPOINTS.imageProxy(src)
}

