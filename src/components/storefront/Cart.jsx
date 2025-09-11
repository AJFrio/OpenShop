import { useCart } from '../../contexts/CartContext'
import { Button } from '../ui/button'
import { formatCurrency } from '../../lib/utils'
import { redirectToCheckout } from '../../lib/stripe'
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react'

export function Cart() {
  const { items, isOpen, totalPrice, updateQuantity, removeItem, toggleCart, clearCart } = useCart()

  const handleCheckout = async () => {
    if (items.length === 0) return

    try {
      if (items.length === 1) {
        // Single item checkout
        await redirectToCheckout(items[0].stripePriceId)
      } else {
        // Multiple items checkout
        const response = await fetch('/api/create-cart-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items }),
        })

        const session = await response.json()

        if (session.error) {
          throw new Error(session.error)
        }

        // Import Stripe and redirect
        const { loadStripe } = await import('@stripe/stripe-js')
        const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
        
        const result = await stripe.redirectToCheckout({
          sessionId: session.sessionId,
        })

        if (result.error) {
          throw new Error(result.error.message)
        }
      }
    } catch (error) {
      console.error('Error during checkout:', error)
      alert('Error starting checkout. Please try again.')
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay - Desktop */}
      <div 
        className={`fixed inset-0 bg-black z-40 hidden lg:block transition-opacity duration-400 ease-in-out ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleCart}
      />

      {/* Overlay - Mobile */}
      <div 
        className={`fixed inset-0 bg-black z-40 lg:hidden transition-opacity duration-400 ease-in-out ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleCart}
      />
      
      {/* Cart Sidebar - Desktop (slides from right) */}
      <div className={`
        fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 
        hidden lg:flex lg:flex-col
        transform transition-transform duration-400 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <CartContent 
          items={items}
          totalPrice={totalPrice}
          updateQuantity={updateQuantity}
          removeItem={removeItem}
          toggleCart={toggleCart}
          clearCart={clearCart}
          handleCheckout={handleCheckout}
          isMobile={false}
        />
      </div>

      {/* Cart Fullscreen - Mobile (slides from top) */}
      <div className={`
        fixed inset-0 bg-white z-50 
        lg:hidden flex flex-col
        transform transition-transform duration-400 ease-in-out
        ${isOpen ? 'translate-y-0' : '-translate-y-full'}
      `}>
        <CartContent 
          items={items}
          totalPrice={totalPrice}
          updateQuantity={updateQuantity}
          removeItem={removeItem}
          toggleCart={toggleCart}
          clearCart={clearCart}
          handleCheckout={handleCheckout}
          isMobile={true}
        />
      </div>
    </>
  )
}

function CartContent({ items, totalPrice, updateQuantity, removeItem, toggleCart, clearCart, handleCheckout, isMobile }) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b animate-fade-in">
        <h2 className="text-lg font-semibold">Shopping Cart</h2>
        <button
          onClick={toggleCart}
          className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110 hover:rotate-90"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-gray-500 mb-6">Add some products to get started!</p>
            <Button 
              onClick={toggleCart}
              className="bg-slate-900 text-white hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
            >
              Continue Shopping
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CartItem
                  item={item}
                  updateQuantity={updateQuantity}
                  removeItem={removeItem}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="border-t p-4 space-y-4">
          {/* Clear Cart Button */}
          <button
            onClick={clearCart}
            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-2 transition-all duration-200 hover:scale-105"
          >
            <Trash2 className="w-4 h-4" />
            Clear Cart
          </button>

          {/* Total */}
          <div className="flex justify-between items-center text-lg font-semibold animate-fade-in">
            <span>Total:</span>
            <span className="text-purple-600">{formatCurrency(totalPrice)}</span>
          </div>

          {/* Checkout Button */}
          <Button 
            onClick={handleCheckout} 
            className="w-full bg-slate-900 text-white hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            size="lg"
          >
            Checkout
          </Button>

          {/* Continue Shopping - Mobile Only */}
          {isMobile && (
            <Button 
              onClick={toggleCart} 
              variant="outline" 
              className="w-full hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:text-white hover:border-transparent transition-all duration-300 hover:scale-105"
            >
              Continue Shopping
            </Button>
          )}
        </div>
      )}
    </>
  )
}

function CartItem({ item, updateQuantity, removeItem }) {
  const primaryImage = Array.isArray(item.images) && item.images.length > 0 
    ? item.images[0] 
    : item.imageUrl

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) {
      removeItem(item.id)
    } else {
      updateQuantity(item.id, newQuantity)
    }
  }

  return (
    <div className="flex gap-3 p-3 border rounded-lg hover:shadow-md transition-all duration-200 hover:border-purple-200">
      {/* Product Image */}
      <div className="flex-shrink-0">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={item.name}
            className="w-16 h-16 object-cover rounded-md"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
        {(item.selectedVariant?.name || item.selectedVariant2?.name) && (
          <p className="text-xs text-gray-600 mt-0.5">
            {item.selectedVariant?.name ? `Variant: ${item.selectedVariant.name}` : ''}
            {item.selectedVariant?.name && item.selectedVariant2?.name ? ' · ' : ''}
            {item.selectedVariant2?.name ? `Variant 2: ${item.selectedVariant2.name}` : ''}
          </p>
        )}
        <p className="text-sm text-gray-500 mt-1">{formatCurrency(item.price)}</p>

        {/* Quantity Controls */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            className="p-1 hover:bg-gray-100 rounded transition-all duration-200 hover:scale-110"
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium min-w-[2rem] text-center transition-all duration-200">
            {item.quantity}
          </span>
          
          <button
            onClick={() => handleQuantityChange(item.quantity + 1)}
            className="p-1 hover:bg-gray-100 rounded transition-all duration-200 hover:scale-110"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Remove Button */}
          <button
            onClick={() => removeItem(item.id)}
            className="ml-auto p-1 text-red-500 hover:bg-red-50 rounded transition-all duration-200 hover:scale-110"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Item Total */}
      <div className="flex-shrink-0 text-right">
        <p className="font-medium text-gray-900">
          {formatCurrency(item.price * item.quantity)}
        </p>
      </div>
    </div>
  )
}
