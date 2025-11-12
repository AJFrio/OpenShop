// Base API client with error handling and interceptors

const API_BASE_URL = '' // Use relative URLs

/**
 * API client class with error handling and interceptors
 */
class APIClient {
  constructor() {
    this.interceptors = {
      request: [],
      response: []
    }
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor)
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor)
  }

  /**
   * Apply request interceptors
   */
  async applyRequestInterceptors(config) {
    let result = config
    for (const interceptor of this.interceptors.request) {
      result = await interceptor(result)
    }
    return result
  }

  /**
   * Apply response interceptors
   */
  async applyResponseInterceptors(response) {
    let result = response
    for (const interceptor of this.interceptors.response) {
      result = await interceptor(result)
    }
    return result
  }

  /**
   * Make API request
   */
  async request(url, options = {}) {
    const config = {
      url: url.startsWith('http') ? url : `${API_BASE_URL}${url}`,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }

    // Apply request interceptors
    const finalConfig = await this.applyRequestInterceptors(config)

    try {
      const response = await fetch(finalConfig.url, {
        method: finalConfig.method || 'GET',
        headers: finalConfig.headers,
        body: finalConfig.body ? JSON.stringify(finalConfig.body) : undefined,
        ...finalConfig
      })

      // Apply response interceptors
      const finalResponse = await this.applyResponseInterceptors(response)

      // Handle errors
      if (!finalResponse.ok) {
        const errorData = await finalResponse.json().catch(() => ({
          error: finalResponse.statusText || 'Request failed'
        }))
        throw new APIError(
          errorData.error || 'Request failed',
          finalResponse.status,
          errorData
        )
      }

      // Parse JSON response
      const data = await finalResponse.json().catch(() => null)
      return data
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }
      throw new APIError(
        error.message || 'Network error',
        0,
        error
      )
    }
  }

  /**
   * GET request
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' })
  }

  /**
   * POST request
   */
  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: data
    })
  }

  /**
   * PUT request
   */
  async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: data
    })
  }

  /**
   * DELETE request
   */
  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' })
  }
}

/**
 * API Error class
 */
class APIError extends Error {
  constructor(message, status, details = null) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.details = details
  }
}

// Create singleton instance
const apiClient = new APIClient()

// Add admin token interceptor
apiClient.addRequestInterceptor(async (config) => {
  const token = localStorage.getItem('openshop_admin_token')
  if (token) {
    config.headers = {
      ...config.headers,
      'X-Admin-Token': token
    }
  }
  return config
})

// Add error handling interceptor
apiClient.addResponseInterceptor(async (response) => {
  if (response.status === 401) {
    // Clear admin token on 401
    localStorage.removeItem('openshop_admin_token')
    // Dispatch event for components to handle
    try {
      window.dispatchEvent(new CustomEvent('openshop-admin-logout'))
    } catch (_) {}
  }
  return response
})

export default apiClient
export { APIError }

