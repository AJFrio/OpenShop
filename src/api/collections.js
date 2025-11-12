// Collection API client
import apiClient from './client.js'
import { API_ENDPOINTS } from './endpoints.js'

export const collectionsAPI = {
  /**
   * Get all collections
   */
  getAll: () => apiClient.get(API_ENDPOINTS.collections.list),

  /**
   * Get single collection
   */
  get: (id) => apiClient.get(API_ENDPOINTS.collections.get(id)),

  /**
   * Get products in collection
   */
  getProducts: (id) => apiClient.get(API_ENDPOINTS.collections.products(id))
}

