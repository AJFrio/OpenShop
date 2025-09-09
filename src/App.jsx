import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { CartProvider } from './contexts/CartContext'
import { Storefront } from './pages/storefront/Storefront'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { CollectionPage } from './pages/storefront/CollectionPage'
import { Success } from './pages/storefront/Success'
import { Cart } from './components/storefront/Cart'

function App() {
  return (
    <CartProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Storefront Routes */}
            <Route path="/" element={<Storefront />} />
            <Route path="/collections/:collectionId" element={<CollectionPage />} />
            <Route path="/success" element={<Success />} />
            
            {/* Admin Routes */}
            <Route path="/admin/*" element={<AdminDashboard />} />
          </Routes>
          
          {/* Cart Overlay */}
          <Cart />
        </div>
      </Router>
    </CartProvider>
  )
}

export default App
