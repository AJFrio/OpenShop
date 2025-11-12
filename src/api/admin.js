// Admin API client
import apiClient from './client.js'
import { API_ENDPOINTS } from './endpoints.js'

export const adminAPI = {
  /**
   * Admin login
   */
  login: (password) => apiClient.post(API_ENDPOINTS.admin.login, { password }),

  /**
   * Products
   */
  products: {
    getAll: () => apiClient.get(API_ENDPOINTS.admin.products.list),
    get: (id) => apiClient.get(API_ENDPOINTS.admin.products.get(id)),
    create: (data) => apiClient.post(API_ENDPOINTS.admin.products.create, data),
    update: (id, data) => apiClient.put(API_ENDPOINTS.admin.products.update(id), data),
    delete: (id) => apiClient.delete(API_ENDPOINTS.admin.products.delete(id))
  },

  /**
   * Collections
   */
  collections: {
    getAll: () => apiClient.get(API_ENDPOINTS.admin.collections.list),
    get: (id) => apiClient.get(API_ENDPOINTS.admin.collections.get(id)),
    create: (data) => apiClient.post(API_ENDPOINTS.admin.collections.create, data),
    update: (id, data) => apiClient.put(API_ENDPOINTS.admin.collections.update(id), data),
    delete: (id) => apiClient.delete(API_ENDPOINTS.admin.collections.delete(id))
  },

  /**
   * Analytics
   */
  analytics: {
    get: (period) => apiClient.get(API_ENDPOINTS.admin.analytics.get(period)),
    getOrders: (params) => apiClient.get(API_ENDPOINTS.admin.analytics.orders(params)),
    fulfillOrder: (orderId) => apiClient.post(API_ENDPOINTS.admin.analytics.fulfillOrder(orderId))
  },

  /**
   * Media
   */
  media: {
    getAll: () => apiClient.get(API_ENDPOINTS.admin.media.list),
    create: (data) => apiClient.post(API_ENDPOINTS.admin.media.create, data),
    delete: (id) => apiClient.delete(API_ENDPOINTS.admin.media.delete(id))
  },

  /**
   * Drive
   */
  drive: {
    getStatus: () => apiClient.get(API_ENDPOINTS.admin.drive.status),
    disconnect: () => apiClient.post(API_ENDPOINTS.admin.drive.disconnect),
    upload: (data) => apiClient.post(API_ENDPOINTS.admin.drive.upload, data),
    getPickerConfig: () => apiClient.get(API_ENDPOINTS.admin.drive.pickerConfig),
    copy: (data) => apiClient.post(API_ENDPOINTS.admin.drive.copy, data)
  },

  /**
   * Settings
   */
  settings: {
    theme: {
      get: () => apiClient.get(API_ENDPOINTS.admin.settings.theme.get),
      update: (data) => apiClient.put(API_ENDPOINTS.admin.settings.theme.update, data),
      reset: () => apiClient.delete(API_ENDPOINTS.admin.settings.theme.reset)
    },
    store: {
      update: (data) => apiClient.put(API_ENDPOINTS.admin.settings.store.update, data)
    }
  },

  /**
   * AI
   */
  ai: {
    generateImage: (data) => apiClient.post(API_ENDPOINTS.admin.ai.generateImage, data)
  }
}

