import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MediaModalLayout from '../MediaModalLayout'

describe('MediaModalLayout', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <MediaModalLayout open={false} title="Test" onClose={() => {}}>
        <p>Content</p>
      </MediaModalLayout>
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders content when open', () => {
    render(
      <MediaModalLayout open title="Title" onClose={() => {}} footer={<div>Footer</div>}>
        <p>Body</p>
      </MediaModalLayout>
    )

    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })
})
