import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDriveStatus } from '../useDriveStatus'

vi.mock('../../../lib/auth', () => ({
  adminApiRequest: vi.fn(),
}))

const { adminApiRequest } = await import('../../../lib/auth')

describe('useDriveStatus', () => {
  afterEach(() => {
    adminApiRequest.mockReset()
  })

  it('checks drive status and updates state', async () => {
    adminApiRequest.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ connected: true }),
    })

    const { result } = renderHook(() => useDriveStatus())

    await act(async () => {
      await result.current.checkDriveStatus()
    })

    expect(result.current.driveConnected).toBe(true)
    expect(result.current.error).toBe('')
  })

  it('handles disconnect failures', async () => {
    adminApiRequest.mockResolvedValueOnce({ ok: false, json: vi.fn() })

    const { result } = renderHook(() => useDriveStatus())

    await act(async () => {
      const success = await result.current.disconnectDrive()
      expect(success).toBe(false)
    })

    expect(result.current.error).toContain('Failed to disconnect')
  })

  it('disconnects successfully when API returns ok', async () => {
    adminApiRequest.mockResolvedValueOnce({ ok: true, json: vi.fn() })

    const { result } = renderHook(() => useDriveStatus())

    await act(async () => {
      const success = await result.current.disconnectDrive()
      expect(success).toBe(true)
    })

    expect(result.current.driveConnected).toBe(false)
  })
})
