import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DEFAULT_STORE_THEME, resolveStorefrontTheme } from '../lib/theme'

const DEFAULT_RESOLVED_THEME = resolveStorefrontTheme(DEFAULT_STORE_THEME)

const StorefrontThemeContext = createContext({
  theme: DEFAULT_RESOLVED_THEME,
  isLoading: false,
  lastError: null,
  refreshTheme: async () => DEFAULT_RESOLVED_THEME,
})

function setStorefrontFlag(isActive) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (isActive) {
    root.setAttribute('data-storefront-theme', 'true')
  } else {
    root.removeAttribute('data-storefront-theme')
  }
}

function applyCssVariables(cssVariables) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  Object.entries(cssVariables || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    root.style.setProperty(key, value)
  })
}

function ensureResolvedTheme(payload) {
  if (payload && typeof payload === 'object' && payload.cssVariables) {
    return payload
  }
  return resolveStorefrontTheme(payload || DEFAULT_STORE_THEME)
}

export function StorefrontThemeProvider({ children }) {
  const location = useLocation()
  const isStorefrontRoute = !location.pathname.startsWith('/admin')
  const [theme, setTheme] = useState(DEFAULT_RESOLVED_THEME)
  const [isLoading, setIsLoading] = useState(false)
  const [lastError, setLastError] = useState(null)
  const abortControllerRef = useRef(null)

  const applyTheme = useCallback((resolvedTheme) => {
    applyCssVariables(resolvedTheme.cssVariables)
    setTheme(resolvedTheme)
  }, [])

  const fetchTheme = useCallback(async () => {
    try {
      const response = await fetch('/api/storefront/theme', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`Theme request failed with status ${response.status}`)
      }
      const payload = await response.json()
      const resolved = ensureResolvedTheme(payload)
      applyTheme(resolved)
      setLastError(null)
      return resolved
    } catch (error) {
      console.error('Failed to fetch storefront theme:', error)
      applyTheme(DEFAULT_RESOLVED_THEME)
      setLastError(error)
      throw error
    }
  }, [applyTheme])

  useEffect(() => {
    applyCssVariables(DEFAULT_RESOLVED_THEME.cssVariables)
  }, [])

  useEffect(() => {
    setStorefrontFlag(isStorefrontRoute)

    if (!isStorefrontRoute) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      applyTheme(DEFAULT_RESOLVED_THEME)
      setIsLoading(false)
      setLastError(null)
      return
    }

    setIsLoading(true)
    const controller = new AbortController()
    abortControllerRef.current = controller

    fetch('/api/storefront/theme', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Theme request failed with status ${response.status}`)
        }
        return response.json()
      })
      .then((payload) => {
        const resolved = ensureResolvedTheme(payload)
        applyTheme(resolved)
        setLastError(null)
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return
        }
        console.error('Failed to initialize storefront theme:', error)
        applyTheme(DEFAULT_RESOLVED_THEME)
        setLastError(error)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => {
      controller.abort()
      abortControllerRef.current = null
    }
  }, [applyTheme, isStorefrontRoute])

  const refreshTheme = useCallback(async () => {
    if (!isStorefrontRoute) {
      applyTheme(DEFAULT_RESOLVED_THEME)
      return DEFAULT_RESOLVED_THEME
    }

    setIsLoading(true)
    try {
      const resolved = await fetchTheme()
      return resolved
    } finally {
      setIsLoading(false)
    }
  }, [applyTheme, fetchTheme, isStorefrontRoute])

  const value = useMemo(() => ({
    theme,
    isLoading,
    lastError,
    refreshTheme,
  }), [isLoading, lastError, refreshTheme, theme])

  return (
    <StorefrontThemeContext.Provider value={value}>
      {children}
    </StorefrontThemeContext.Provider>
  )
}

export function useStorefrontTheme() {
  return useContext(StorefrontThemeContext)
}

