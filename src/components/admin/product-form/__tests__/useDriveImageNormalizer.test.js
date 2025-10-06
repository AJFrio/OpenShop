import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDriveImageNormalizer } from '../useDriveImageNormalizer'

describe('useDriveImageNormalizer', () => {
  it('normalizes Google Drive links and exposes a temporary notice', () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useDriveImageNormalizer({ noticeDuration: 100 }))

    let normalized
    act(() => {
      normalized = result.current.normalize('https://drive.google.com/file/d/abc123/view?usp=sharing')
    })

    expect(normalized).toBe('https://drive.usercontent.google.com/download?id=abc123&export=view')
    expect(result.current.notice).toContain('Google Drive link detected')

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current.notice).toBe('')

    vi.useRealTimers()
  })
})
