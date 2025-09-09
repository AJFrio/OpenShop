// Admin login endpoint
export async function onRequestPost({ request, env }) {
  try {
    const { password } = await request.json()
    
    // Simple password check (in production, use proper password hashing)
    const adminPassword = env.ADMIN_PASSWORD || 'admin123'
    
    if (password !== adminPassword) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Generate simple token (in production, use proper JWT)
    const token = btoa(Date.now() + Math.random().toString(36)).replace(/[^a-zA-Z0-9]/g, '')
    
    // Store token in KV with expiration (24 hours)
    await env.OPENSHOP_KV.put(`admin_token:${token}`, Date.now().toString(), {
      expirationTtl: 86400 // 24 hours
    })

    return new Response(JSON.stringify({ token }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
