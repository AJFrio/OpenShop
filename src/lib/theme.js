// Theme configuration for OpenShop
// Centralized color management for consistent theming

export const theme = {
  colors: {
    // Primary accent color for storefront
    primary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },

    // Admin accent color (grey)
    admin: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },

    // Common colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Neutral colors
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },

    // Slate colors (used in storefront)
    slate: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },

    // Purple (legacy - should be replaced)
    purple: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
    },
  },

  // Tailwind color classes for easy use
  classes: {
    primary: {
      50: 'bg-slate-50 text-slate-900 border-slate-200',
      100: 'bg-slate-100 text-slate-800',
      200: 'bg-slate-200 text-slate-700',
      300: 'bg-slate-300 text-slate-600',
      400: 'bg-slate-400 text-slate-500',
      500: 'bg-slate-500 text-white',
      600: 'bg-slate-600 text-white',
      700: 'bg-slate-700 text-white',
      800: 'bg-slate-800 text-white',
      900: 'bg-slate-900 text-white',
    },

    admin: {
      50: 'bg-gray-50 text-gray-900 border-gray-200',
      100: 'bg-gray-100 text-gray-800',
      200: 'bg-gray-200 text-gray-700',
      300: 'bg-gray-300 text-gray-600',
      400: 'bg-gray-400 text-gray-500',
      500: 'bg-gray-500 text-white',
      600: 'bg-gray-600 text-white',
      700: 'bg-gray-700 text-white',
      800: 'bg-gray-800 text-white',
      900: 'bg-gray-900 text-white',
    },
  },
}

// Helper functions for common color patterns
export const getPrimaryColor = (shade = 600) => theme.colors.primary[shade]
export const getAdminColor = (shade = 600) => theme.colors.admin[shade]
export const getGrayColor = (shade = 600) => theme.colors.gray[shade]
export const getSlateColor = (shade = 600) => theme.colors.slate[shade]

// Common color combinations
export const colorCombinations = {
  // Storefront accent colors
  storefront: {
    hover: 'hover:text-slate-600',
    accent: 'text-slate-600',
    accentHover: 'hover:text-slate-700',
    background: 'bg-slate-50',
    border: 'border-slate-200',
  },

  // Admin accent colors (grey)
  admin: {
    hover: 'hover:text-gray-600',
    accent: 'text-gray-600',
    accentHover: 'hover:text-gray-700',
    background: 'bg-gray-50',
    border: 'border-gray-200',
  },

  // Loading states
  loading: {
    primary: 'border-slate-600',
    admin: 'border-gray-600',
  },

  // Interactive elements
  interactive: {
    primary: 'text-slate-600 hover:text-slate-700',
    admin: 'text-gray-600 hover:text-gray-700',
  },

  // Gradients
  gradients: {
    storefront: {
      button: 'hover:bg-gradient-to-r hover:from-slate-600 hover:to-slate-700 hover:text-white',
      buttonOutline: 'hover:bg-gradient-to-r hover:from-slate-600 hover:to-slate-700 hover:text-white hover:border-transparent',
      background: 'bg-gradient-to-r from-slate-600 to-slate-700',
    },
    admin: {
      button: 'hover:bg-gradient-to-r hover:from-gray-600 hover:to-gray-700 hover:text-white',
      buttonOutline: 'hover:bg-gradient-to-r hover:from-gray-600 hover:to-gray-700 hover:text-white hover:border-transparent',
      background: 'bg-gradient-to-r from-gray-600 to-gray-700',
    },
  },
}
