import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MediaGrid from '../MediaGrid'

describe('MediaGrid', () => {
  it('renders an empty message when no items are provided', () => {
    render(
      <MediaGrid items={[]} onSelect={vi.fn()} emptyMessage="Nothing to see" />
    )

    expect(screen.getByText('Nothing to see')).toBeInTheDocument()
  })

  it('invokes onSelect when an item is clicked', async () => {
    const user = userEvent.setup()
    const handleSelect = vi.fn()
    render(
      <MediaGrid
        items={[{ id: '1', url: 'https://example.com/image.png' }]}
        onSelect={handleSelect}
        emptyMessage=""
      />
    )

    await user.click(screen.getByRole('button'))
    expect(handleSelect).toHaveBeenCalledWith('https://example.com/image.png')
  })
})
