import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import VariantGroup from '../VariantGroup'

function createProps(overrides = {}) {
  return {
    id: 'group-1',
    enabled: true,
    onToggle: vi.fn(),
    title: 'Variants',
    description: 'Enable variants',
    styleLabel: 'Style',
    styleValue: 'Color',
    onStyleChange: vi.fn(),
    stylePlaceholder: 'Color',
    variants: [
      {
        id: 'v1',
        name: 'Green',
        selectorImageUrl: '',
        displayImageUrl: '',
        hasCustomPrice: false,
        price: '',
      },
    ],
    onAddVariant: vi.fn(),
    onVariantChange: vi.fn(),
    onVariantRemove: vi.fn(),
    emptyMessage: 'No variants',
    priceLabel: 'Custom price',
    namePlaceholder: 'Variant name',
    onPreviewImage: vi.fn(),
    ...overrides,
  }
}

describe('VariantGroup', () => {
  it('calls callbacks for toggle, add, change, and remove actions', async () => {
    const user = userEvent.setup()
    const props = createProps()
    render(<VariantGroup {...props} />)

    await user.click(screen.getByRole('switch', { name: /enable variants/i }))
    expect(props.onToggle).toHaveBeenCalledWith(false)

    await user.click(screen.getByRole('button', { name: /add variant/i }))
    expect(props.onAddVariant).toHaveBeenCalled()

    const nameInput = screen.getAllByPlaceholderText(/Variant name/i)[0]
    await user.type(nameInput, ' updated')
    expect(props.onVariantChange).toHaveBeenCalledWith(0, 'name', 'Green updated')

    await user.click(screen.getByRole('button', { name: '×' }))
    expect(props.onVariantRemove).toHaveBeenCalledWith(0)
  })

  it('renders empty message when variants list is empty', () => {
    const props = createProps({ variants: [], emptyMessage: 'Nothing here' })
    render(<VariantGroup {...props} />)

    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })
})
