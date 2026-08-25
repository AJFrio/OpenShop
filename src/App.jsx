import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { CartProvider } from './contexts/CartContext'
import { StorefrontThemeProvider } from './contexts/StorefrontThemeContext'
import { Storefront } from './pages/storefront/Storefront'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { CollectionPage } from './pages/storefront/CollectionPage'
import { Success } from './pages/storefront/Success'
import { Cart } from './components/storefront/Cart'
import { ProductPage } from './pages/storefront/ProductPage'
import { About } from './pages/storefront/About'
import { DynamicPage } from './pages/storefront/DynamicPage'

function App() {
  return (
    <CartProvider>
      <Router>
        <StorefrontThemeProvider>
          <div className="min-h-screen storefront-surface">
            <Routes>
              {/* Storefront Routes */}
              <Route path="/" element={<Storefront />} />
              <Route path="/about" element={<About />} />
              <Route path="/p/:slug" element={<DynamicPage />} />
              <Route path="*" element={
                <div className="flex h-96 flex-col items-center justify-center gap-2">
                  <h1 className="text-3xl font-bold storefront-heading">Page not found</h1>
                  <p className="storefront-subtle">The page you are looking for does not exist.</p>
                </div>
              } />
              <Route path="/collections/:collectionId" element={<CollectionPage />} />
              <Route path="/products/:id" element={<ProductPage />} />
              <Route path="/success" element={<Success />} />

              {/* Admin Routes */}
              <Route path="/admin/*" element={<AdminDashboard />} />
            </Routes>
            
            {/* Cart Overlay */}
            <Cart />
          </div>
        </StorefrontThemeProvider>
      </Router>
    </CartProvider>
  )
}

export default App
