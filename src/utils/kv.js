// KV namespace discovery utility
// Consolidates all KV namespace discovery logic

/**
 * Gets the KV namespace from environment bindings
 * Tries multiple strategies to find the KV namespace
 * 
 * @param {Record<string, any>} env - Environment object with bindings
 * @returns {any|null} - KV namespace or null if not found
 */
export function getKVNamespace(env) {
  if (!env || typeof env !== 'object') {
    console.error('getKVNamespace: Invalid environment object')
    return null
  }

  // Strategy 1: Try direct access to known binding names
  const possibleBindings = [
    'OPENSHOP-TEST3_KV',
    'OPENSHOP_TEST3_KV', 
    'OPENSHOP_KV'
  ]
  
  for (const bindingName of possibleBindings) {
    if (bindingName in env && env[bindingName]) {
      const kvNamespace = env[bindingName]
      if (isKVNamespace(kvNamespace)) {
        console.log(`Found KV namespace via direct access: ${bindingName}`)
        return kvNamespace
      }
    }
  }
  
  // Strategy 2: Look for KV namespace by checking for KV-like binding names
  const kvBindingName = Object.keys(env).find(key => 
    (key.endsWith('_KV') || key.endsWith('-KV') || key.includes('KV')) &&
    isKVNamespace(env[key])
  )
  
  if (kvBindingName) {
    console.log(`Found KV namespace via search: ${kvBindingName}`)
    return env[kvBindingName]
  }

  // Strategy 3: Fallback - look for any binding with KV methods
  const kvNamespace = Object.values(env).find(binding => 
    isKVNamespace(binding)
  )
  
  if (kvNamespace) {
    console.log('Found KV namespace via fallback')
    return kvNamespace
  }

  // No KV namespace found
  console.error('No KV namespace found! Available bindings:', Object.keys(env))
  console.error('Environment value types:', Object.values(env).map(v => typeof v))
  return null
}

/**
 * Checks if an object is a valid KV namespace
 * @param {any} binding - Object to check
 * @returns {boolean}
 */
function isKVNamespace(binding) {
  return binding && 
         typeof binding.get === 'function' && 
         typeof binding.put === 'function' &&
         typeof binding.delete === 'function' &&
         typeof binding.list === 'function'
}

