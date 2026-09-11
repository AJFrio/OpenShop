// Integration tests for developer settings.
//
// The contract that matters: a value saved in the UI genuinely takes effect
// (KV wins over env), and clearing it falls back to env — which is also the
// documented recovery path if a bad value is ever saved.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createTestApp,
  createTestRequest,
  executeRequest,
  parseJsonResponse,
  createAdminToken,
  createAdminHeaders,
} from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    products: { create: vi.fn(), update: vi.fn(), retrieve: vi.fn() },
    prices: { create: vi.fn(), update: vi.fn() },
  })),
}))

describe('Developer Settings', () => {
  let app
  let env
  let kv
  let adminToken

  beforeEach(async () => {
    app = await createTestApp()
    env = createMockEnv()
    kv = createMockKV()
    env.TEST_KV = kv
    adminToken = await createAdminToken(env, kv)
    vi.clearAllMocks()
  })

  it('never returns secret values to the browser', async () => {
    env.GEMINI_API_KEY = 'super-secret-value'
    const req = createTestRequest('/api/admin/developer-settings', {
      headers: createAdminHeaders(adminToken),
    })
    const res = await executeRequest(app, req, env)
    const body = await parseJsonResponse(res)

    const gemini = body.fields.find((f) => f.key === 'GEMINI_API_KEY')
    expect(gemini.configured).toBe(true)
    expect(gemini.source).toBe('environment')
    expect(gemini.value).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain('super-secret-value')
  })

  it('reports a saved value as coming from settings, not environment', async () => {
    const req = createTestRequest('/api/admin/developer-settings', {
      method: 'PUT',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify({ OPENROUTER_MODEL: 'some/model' }),
    })
    const res = await executeRequest(app, req, env)
    const body = await parseJsonResponse(res)

    const field = body.fields.find((f) => f.key === 'OPENROUTER_MODEL')
    expect(field.source).toBe('settings')
    expect(field.value).toBe('some/model')
  })

  it('clearing a value falls back to the environment', async () => {
    env.OPENROUTER_MODEL = 'env/model'

    await executeRequest(app, createTestRequest('/api/admin/developer-settings', {
      method: 'PUT',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify({ OPENROUTER_MODEL: 'kv/model' }),
    }), env)

    const res = await executeRequest(app, createTestRequest('/api/admin/developer-settings', {
      method: 'PUT',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify({ OPENROUTER_MODEL: '' }),
    }), env)
    const body = await parseJsonResponse(res)

    const field = body.fields.find((f) => f.key === 'OPENROUTER_MODEL')
    expect(field.source).toBe('environment')
    expect(field.value).toBe('env/model')
  })

  it('rejects changing the password through the generic settings route', async () => {
    const req = createTestRequest('/api/admin/developer-settings', {
      method: 'PUT',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify({ ADMIN_PASSWORD: 'sneaky' }),
    })
    const res = await executeRequest(app, req, env)
    expect(res.status).toBe(400)
  })

  describe('admin password', () => {
    it('requires the current password', async () => {
      const req = createTestRequest('/api/admin/developer-settings/password', {
        method: 'PUT',
        headers: createAdminHeaders(adminToken),
        body: JSON.stringify({ currentPassword: 'wrong', newPassword: 'a-new-password' }),
      })
      const res = await executeRequest(app, req, env)
      expect(res.status).toBe(400)
    })

    it('enforces a minimum length', async () => {
      const req = createTestRequest('/api/admin/developer-settings/password', {
        method: 'PUT',
        headers: createAdminHeaders(adminToken),
        body: JSON.stringify({ currentPassword: env.ADMIN_PASSWORD, newPassword: 'short' }),
      })
      const res = await executeRequest(app, req, env)
      expect(res.status).toBe(400)
    })

    it('changes the password, and the new one actually works', async () => {
      const change = await executeRequest(app, createTestRequest('/api/admin/developer-settings/password', {
        method: 'PUT',
        headers: createAdminHeaders(adminToken),
        body: JSON.stringify({ currentPassword: env.ADMIN_PASSWORD, newPassword: 'brand-new-password' }),
      }), env)
      expect(change.status).toBe(200)

      // The whole point of KV-wins: the new password is live even though the
      // ADMIN_PASSWORD binding still holds the old value.
      const good = await executeRequest(app, createTestRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password: 'brand-new-password' }),
      }), env)
      expect(good.status).toBe(200)

      const old = await executeRequest(app, createTestRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password: env.ADMIN_PASSWORD }),
      }), env)
      expect(old.status).toBe(401)
    })

    it('deleting the stored password restores the environment one', async () => {
      await executeRequest(app, createTestRequest('/api/admin/developer-settings/password', {
        method: 'PUT',
        headers: createAdminHeaders(adminToken),
        body: JSON.stringify({ currentPassword: env.ADMIN_PASSWORD, newPassword: 'temporary-password' }),
      }), env)

      // The lockout recovery path, exercised through the API.
      const cleared = await executeRequest(app, createTestRequest('/api/admin/developer-settings/password', {
        method: 'DELETE',
        headers: createAdminHeaders(adminToken),
      }), env)
      expect(cleared.status).toBe(200)

      const res = await executeRequest(app, createTestRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password: env.ADMIN_PASSWORD }),
      }), env)
      expect(res.status).toBe(200)
    })

    it('never stores the password in plaintext', async () => {
      await executeRequest(app, createTestRequest('/api/admin/developer-settings/password', {
        method: 'PUT',
        headers: createAdminHeaders(adminToken),
        body: JSON.stringify({ currentPassword: env.ADMIN_PASSWORD, newPassword: 'plaintext-check-123' }),
      }), env)

      const stored = await kv.get('developer:settings')
      expect(stored).not.toContain('plaintext-check-123')
      expect(JSON.parse(stored).ADMIN_PASSWORD_HASH).toBeTruthy()
    })
  })
})
