// Admin authentication middleware for Workers
export async function verifyAdminAuth(request, env) {
  const adminToken = request.headers.get('X-Admin-Token')
  
  if (!adminToken) {
    return { 
      isValid: false, 
      error: 'Admin authentication required',
      status: 401 
    }
  }

  try {
    // Check if token exists in KV
    const tokenData = await env.OPENSHOP_KV.get(`admin_token:${adminToken}`)
    
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
      await env.OPENSHOP_KV.delete(`admin_token:${adminToken}`)
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
