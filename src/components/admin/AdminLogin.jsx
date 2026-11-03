import { useState } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { adminLogin } from '../../lib/auth'
import { Store } from 'lucide-react'

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
    <div className="admin-container flex min-h-screen items-center justify-center p-4">
      <div className="admin-card w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--os-radius-md)] bg-[var(--os-color-bg-fill-brand-muted)]">
            <Store className="h-5 w-5 text-[var(--os-color-icon-brand)]" />
          </div>
          <h1 className="admin-page-title mb-1">OpenShop Admin</h1>
          <p className="text-sm text-[var(--os-color-text-secondary)]">Sign in to manage your store</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="admin-password" className="admin-label">Password</label>
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
            <div role="alert" className="admin-alert admin-alert-error">
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
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
