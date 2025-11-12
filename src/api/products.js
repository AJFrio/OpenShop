// Product API client
import apiClient from './client.js'
import { API_ENDPOINTS } from './endpoints.js'

export const productsAPI = {
  /**
   * Get all products
   */
  getAll: () => apiClient.get(API_ENDPOINTS.products.list),

  /**
   * Get single product
   */
  get: (id) => apiClient.get(API_ENDPOINTS.products.get(id))
}

