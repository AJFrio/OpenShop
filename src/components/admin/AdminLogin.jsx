import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { adminLogin } from '../../lib/auth'

export function AdminLogin({ onLoginSuccess }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await adminLogin(password)
      if (result.ok) {
        onLoginSuccess()
      } else {
        setError(result.error || 'Invalid password. Please try again.')
      }
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--admin-bg-primary)]">
      <div className="w-full max-w-md p-8 rounded-xl bg-[var(--admin-bg-card)] border border-[var(--admin-border-primary)] shadow-[var(--admin-shadow-lg)]">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--admin-accent-dark)] to-[var(--admin-accent)]">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-[var(--admin-text-primary)]">OpenShop Admin</h1>
          <p className="text-[var(--admin-text-muted)]">Sign in to manage your store</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="admin-password" className="block text-xs font-semibold tracking-wider mb-2 text-[var(--admin-text-secondary)]">Password</label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>
          
          {error && (
            <div role="alert" className="px-4 py-3 rounded-lg text-sm bg-[var(--admin-error-bg)] border border-[var(--admin-error)]/20 text-[var(--admin-error-light)]">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
