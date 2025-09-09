// Helper to get the KV namespace dynamically
export function getKVNamespace(env) {
  // Try to find KV namespace by looking for bindings that have KV methods
  const kvBinding = Object.values(env).find(binding => 
    binding && typeof binding.get === 'function' && typeof binding.put === 'function'
  )
  
  // Fallback to specific known bindings
  return kvBinding || env.OPENSHOP_KV || env[`${Object.keys(env).find(key => key.endsWith('_KV'))}`]
}
