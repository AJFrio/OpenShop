import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MediaTabs from '../MediaTabs'

describe('MediaTabs', () => {
  it('calls onTabChange when a tab is clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(
      <MediaTabs
        tabs={[
          { id: 'one', label: 'One' },
          { id: 'two', label: 'Two' },
        ]}
        activeTab="one"
        onTabChange={handleChange}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Two' }))
    expect(handleChange).toHaveBeenCalledWith('two')
  })
})
