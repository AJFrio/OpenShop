import { createContext, useContext, useReducer, useEffect } from 'react'
import { CART_MAX_ITEM_QUANTITY } from '../config/index.js'

function clampQuantity(quantity) {
  const n = Number.parseInt(quantity, 10)
  if (!Number.isInteger(n) || n <= 0) return 0
  return Math.min(CART_MAX_ITEM_QUANTITY, n)
}

const CartContext = createContext()

// Cart actions
const CART_ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  TOGGLE_CART: 'TOGGLE_CART',
  OPEN_CART: 'OPEN_CART'
}

// Cart reducer
function cartReducer(state, action) {
  switch (action.type) {
    case CART_ACTIONS.ADD_ITEM: {
      const existingItem = state.items.find(item => item.id === action.payload.id)
      
      const addQty = clampQuantity(action.payload.quantity || 1) || 1
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: clampQuantity(item.quantity + addQty) }
              : item
          )
        }
      } else {
        return {
          ...state,
          items: [...state.items, { ...action.payload, quantity: addQty }]
        }
      }
    }

    case CART_ACTIONS.REMOVE_ITEM: {
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      }
    }

    case CART_ACTIONS.UPDATE_QUANTITY: {
      const quantity = clampQuantity(action.payload.quantity)
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.id !== action.payload.id)
        }
      }

      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity }
            : item
        )
      }
    }

    case CART_ACTIONS.CLEAR_CART: {
      return {
        ...state,
        items: []
      }
    }

    case CART_ACTIONS.TOGGLE_CART: {
      return {
        ...state,
        isOpen: !state.isOpen
      }
    }

    case CART_ACTIONS.OPEN_CART: {
      return {
        ...state,
        isOpen: true
      }
    }

    default:
      return state
  }
}

// Initial state
const initialState = {
  items: [],
  isOpen: false
}

// Cart provider component
export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('openshop-cart')
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        parsedCart.items.forEach(item => {
          dispatch({ type: CART_ACTIONS.ADD_ITEM, payload: item })
          if (item.quantity > 1) {
            dispatch({ 
              type: CART_ACTIONS.UPDATE_QUANTITY, 
              payload: { id: item.id, quantity: item.quantity } 
            })
          }
        })
      } catch (error) {
        console.error('Error loading cart from localStorage:', error)
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('openshop-cart', JSON.stringify({ items: state.items }))
  }, [state.items])

  // Cart actions
  const addItem = (product, quantity = 1) => {
    dispatch({ type: CART_ACTIONS.ADD_ITEM, payload: { ...product, quantity } })
    dispatch({ type: CART_ACTIONS.OPEN_CART })
  }

  const removeItem = (productId) => {
    dispatch({ type: CART_ACTIONS.REMOVE_ITEM, payload: productId })
  }

  const updateQuantity = (productId, quantity) => {
    dispatch({ type: CART_ACTIONS.UPDATE_QUANTITY, payload: { id: productId, quantity } })
  }

  const clearCart = () => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART })
  }

  const toggleCart = () => {
    dispatch({ type: CART_ACTIONS.TOGGLE_CART })
  }
  const openCart = () => {
    dispatch({ type: CART_ACTIONS.OPEN_CART })
  }

  // Computed values
  const itemCount = state.items.reduce((total, item) => total + item.quantity, 0)
  const totalPrice = state.items.reduce((total, item) => total + (item.price * item.quantity), 0)

  const value = {
    items: state.items,
    isOpen: state.isOpen,
    itemCount,
    totalPrice,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    openCart
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

// Custom hook to use cart context
export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
