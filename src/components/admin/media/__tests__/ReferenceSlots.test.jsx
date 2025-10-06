import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import ReferenceSlots from '../ReferenceSlots'

let originalCreateObjectURL
let originalRevokeObjectURL

describe('ReferenceSlots', () => {
  beforeAll(() => {
    originalCreateObjectURL = global.URL.createObjectURL
    originalRevokeObjectURL = global.URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob://preview')
    global.URL.revokeObjectURL = vi.fn()
  })

  afterAll(() => {
    global.URL.createObjectURL = originalCreateObjectURL
    global.URL.revokeObjectURL = originalRevokeObjectURL
  })

  it('notifies when files are selected and cleared', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    const file = new File(['hello'], 'hello.png', { type: 'image/png' })

    const { container, rerender } = render(<ReferenceSlots files={[]} onChange={handleChange} />)

    const input = container.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [file] } })
    expect(handleChange).toHaveBeenCalledWith(0, file)

    rerender(<ReferenceSlots files={[file]} onChange={handleChange} />)
    await user.click(screen.getByRole('button', { name: /clear/i }))
    expect(handleChange).toHaveBeenCalledWith(0, null)
  })
})
