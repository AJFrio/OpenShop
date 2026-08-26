import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/storefront-theme.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const key = 'openshop-preload-reload'
  const last = Number(sessionStorage.getItem(key) || 0)
  if (Date.now() - last > 10000) {
    sessionStorage.setItem(key, String(Date.now()))
    window.location.reload()
  }
})
