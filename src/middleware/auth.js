// Admin authentication middleware for Workers

// Helper function to get KV namespace dynamically
function getKVNamespace(env) {
  console.log('Auth middleware - Available env bindings:', Object.keys(env))
  
  // Try direct access to known binding names first
  const possibleBindings = [
    'OPENSHOP-TEST3_KV',
    'OPENSHOP_TEST3_KV', 
    'OPENSHOP_KV'
  ]
  
  for (const bindingName of possibleBindings) {
    // Use bracket notation for property names with hyphens
    if (bindingName in env && env[bindingName]) {
      console.log(`Auth middleware - Found KV namespace via direct access: ${bindingName}`)
      const kvNamespace = env[bindingName]
      console.log('Auth middleware - KV namespace object:', !!kvNamespace, typeof kvNamespace)
      console.log('Auth middleware - KV namespace has get method:', typeof kvNamespace?.get)
      return kvNamespace
    }
  }
  
  // Look for KV namespace by checking for KV-like binding names
  const kvBindingName = Object.keys(env).find(key => 
    key.endsWith('_KV') || key.endsWith('-KV') || key.includes('KV')
  )
  
  console.log('Auth middleware - Found KV binding name via search:', kvBindingName)
  
  if (kvBindingName) {
    const kvNamespace = env[kvBindingName]
    console.log('Auth middleware - KV namespace object via search:', !!kvNamespace, typeof kvNamespace)
    if (kvNamespace) {
      return kvNamespace
    }
  }
  
  // Fallback: look for any binding with get/put methods
  const kvNamespace = Object.values(env).find(binding => 
    binding && typeof binding.get === 'function' && typeof binding.put === 'function'
  )
  console.log('Auth middleware - Fallback KV namespace found:', !!kvNamespace)
  
  if (!kvNamespace) {
    console.error('Auth middleware - No KV namespace found! Available bindings:', Object.keys(env))
    console.error('Auth middleware - Environment values:', Object.values(env).map(v => typeof v))
  }
  
  return kvNamespace
}

export async function verifyAdminAuth(request, env) {
  // Support both Hono's HonoRequest (c.req) and the native Request
  let adminToken
  try {
    if (request && typeof request.header === 'function') {
      // HonoRequest API
      adminToken = request.header('X-Admin-Token') || request.header('x-admin-token')
    } else if (request && request.headers && typeof request.headers.get === 'function') {
      // Native Request API
      adminToken = request.headers.get('X-Admin-Token') || request.headers.get('x-admin-token')
    } else if (request && request.raw && request.raw.headers && typeof request.raw.headers.get === 'function') {
      // Some frameworks expose the raw Request on .raw
      adminToken = request.raw.headers.get('X-Admin-Token') || request.raw.headers.get('x-admin-token')
    }
  } catch (e) {
    console.error('Auth middleware - error reading admin token header:', e)
  }

  if (!adminToken) {
    return { 
      isValid: false, 
      error: 'Admin authentication required',
      status: 401 
    }
  }

  try {
    // Check if token exists in KV
    const kvNamespace = getKVNamespace(env)
    
    if (!kvNamespace) {
      console.error('Auth middleware - KV namespace is undefined')
      return { 
        isValid: false, 
        error: 'KV namespace not available',
        status: 500 
      }
    }
    
    const tokenData = await kvNamespace.get(`admin_token:${adminToken}`)
    
    if (!tokenData) {
      return { 
        isValid: false, 
        error: 'Invalid or expired admin token',
        status: 401 
      }
    }

    // Check if token is not expired
    const tokenTime = parseInt(tokenData)
    const now = Date.now()
    const twentyFourHours = 86400000 // 24 hours in milliseconds
    
    if (now - tokenTime > twentyFourHours) {
      // Clean up expired token
      await kvNamespace.delete(`admin_token:${adminToken}`)
      return { 
        isValid: false, 
        error: 'Admin session expired',
        status: 401 
      }
    }

    return { isValid: true }
  } catch (error) {
    console.error('Admin auth verification error:', error)
    return { 
      isValid: false, 
      error: 'Authentication verification failed',
      status: 500 
    }
  }
}
