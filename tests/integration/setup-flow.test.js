// Tests for the first-run setup flow.
//
// A fresh install runs on a password published in the README. Login reports
// that so the panel can require a change before anything else happens.
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
import { DEFAULT_ADMIN_PASSWORD } from '../../src/config/index.js'

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    products: { create: vi.fn(), update: vi.fn(), retrieve: vi.fn() },
    prices: { create: vi.fn(), update: vi.fn() },
  })),
}))

describe('First-run setup flow', () => {
  let app
  let env
  let kv

  beforeEach(async () => {
    app = await createTestApp()
    env = createMockEnv()
    kv = createMockKV()
    env.TEST_KV = kv
    vi.clearAllMocks()
  })

  it('flags a login that used the default password', async () => {
    delete env.ADMIN_PASSWORD // a fresh install with nothing configured

    const res = await executeRequest(app, createTestRequest('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: DEFAULT_ADMIN_PASSWORD }),
    }), env)
    const body = await parseJsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.mustChangePassword).toBe(true)
  })

  it('does not flag a login with a configured password', async () => {
    env.ADMIN_PASSWORD = 'a-real-configured-password'

    const res = await executeRequest(app, createTestRequest('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'a-real-configured-password' }),
    }), env)
    const body = await parseJsonResponse(res)

    expect(body.mustChangePassword).toBe(false)
  })

  it('stops flagging once the password is changed in the panel', async () => {
    delete env.ADMIN_PASSWORD
    const adminToken = await createAdminToken(env, kv)

    await executeRequest(app, createTestRequest('/api/admin/developer-settings/password', {
      method: 'PUT',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify({
        currentPassword: DEFAULT_ADMIN_PASSWORD,
        newPassword: 'something-much-better',
      }),
    }), env)

    const res = await executeRequest(app, createTestRequest('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'something-much-better' }),
    }), env)
    const body = await parseJsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.mustChangePassword).toBe(false)
  })
})
