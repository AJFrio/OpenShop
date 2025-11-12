// Test setup and utilities
// This file sets up the testing environment

// Mock Cloudflare Workers environment
export function createMockEnv() {
  return {
    STRIPE_SECRET_KEY: 'sk_test_mock',
    SITE_URL: 'https://test.workers.dev',
    ADMIN_PASSWORD: 'test123',
    GOOGLE_CLIENT_ID: 'test_client_id',
    GOOGLE_CLIENT_SECRET: 'test_client_secret',
    GOOGLE_API_KEY: 'test_api_key',
    GEMINI_API_KEY: 'test_gemini_key',
    DRIVE_ROOT_FOLDER: 'TestFolder',
    // Mock KV namespace
    TEST_KV: createMockKV()
  }
}

// Mock KV namespace
export function createMockKV() {
  const store = new Map()
  
  return {
    get: async (key) => {
      return store.get(key) || null
    },
    put: async (key, value, options) => {
      store.set(key, value)
    },
    delete: async (key) => {
      store.delete(key)
    },
    list: async (options) => {
      const keys = Array.from(store.keys())
      const filtered = options?.prefix 
        ? keys.filter(k => k.startsWith(options.prefix))
        : keys
      return {
        keys: filtered.map(key => ({ name: key })),
        list_complete: true,
        cursor: ''
      }
    }
  }
}

// Mock Hono context
export function createMockContext(env, path = '/', method = 'GET', body = null) {
  const url = new URL(path, 'https://test.workers.dev')
  
  return {
    env,
    req: {
      url: url.toString(),
      path: url.pathname,
      method,
      param: (key) => {
        // Simple param extraction - in real tests, use proper routing
        const match = path.match(new RegExp(`/:${key}/([^/]+)`))
        return match ? match[1] : null
      },
      query: (key) => url.searchParams.get(key),
      json: async () => body || {}
    },
    json: (data, status = 200) => {
      return new Response(JSON.stringify(data), { status })
    },
    text: (text, status = 200) => {
      return new Response(text, { status })
    },
    html: (html, status = 200) => {
      return new Response(html, { status, headers: { 'Content-Type': 'text/html' } })
    },
    redirect: (url, status = 302) => {
      return Response.redirect(url, status)
    },
    notFound: () => {
      return new Response('Not Found', { status: 404 })
    }
  }
}

