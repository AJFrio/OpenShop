// API endpoint definitions

export const API_ENDPOINTS = {
  // Public endpoints
  products: {
    list: '/api/products',
    get: (id) => `/api/products/${id}`
  },
  collections: {
    list: '/api/collections',
    get: (id) => `/api/collections/${id}`,
    products: (id) => `/api/collections/${id}/products`
  },
  storefront: {
    theme: '/api/storefront/theme'
  },
  storeSettings: {
    get: '/api/store-settings',
    contactEmail: '/api/contact-email'
  },
  checkout: {
    createSession: '/api/create-checkout-session',
    createCartSession: '/api/create-cart-checkout-session',
    getSession: (sessionId) => `/api/checkout-session/${sessionId}`
  },
  imageProxy: (src) => `/api/image-proxy?src=${encodeURIComponent(src)}`,

  // Admin endpoints
  admin: {
    login: '/api/admin/login',
    products: {
      list: '/api/admin/products',
      get: (id) => `/api/admin/products/${id}`,
      create: '/api/admin/products',
      update: (id) => `/api/admin/products/${id}`,
      delete: (id) => `/api/admin/products/${id}`
    },
    collections: {
      list: '/api/admin/collections',
      get: (id) => `/api/admin/collections/${id}`,
      create: '/api/admin/collections',
      update: (id) => `/api/admin/collections/${id}`,
      delete: (id) => `/api/admin/collections/${id}`
    },
    analytics: {
      get: (period) => `/api/admin/analytics?period=${period || '30d'}`,
      orders: (params) => {
        const query = new URLSearchParams()
        if (params.limit) query.set('limit', params.limit)
        if (params.direction) query.set('direction', params.direction)
        if (params.cursor) query.set('cursor', params.cursor)
        if (params.showFulfilled) query.set('showFulfilled', params.showFulfilled)
        return `/api/admin/analytics/orders?${query.toString()}`
      },
      fulfillOrder: (orderId) => `/api/admin/analytics/orders/${orderId}/fulfill`
    },
    media: {
      list: '/api/admin/media',
      create: '/api/admin/media',
      delete: (id) => `/api/admin/media/${id}`
    },
    drive: {
      status: '/api/admin/drive/status',
      disconnect: '/api/admin/drive/disconnect',
      oauthStart: '/api/admin/drive/oauth/start',
      upload: '/api/admin/drive/upload',
      pickerConfig: '/api/admin/drive/picker-config',
      copy: '/api/admin/drive/copy'
    },
    settings: {
      theme: {
        get: '/api/admin/storefront/theme',
        update: '/api/admin/storefront/theme',
        reset: '/api/admin/storefront/theme'
      },
      store: {
        update: '/api/admin/store-settings'
      }
    },
    ai: {
      generateImage: '/api/admin/ai/generate-image'
    }
  }
}

