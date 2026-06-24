import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChakraProvider } from '@chakra-ui/react'
import { ImageTabList } from '../popup/components/ImageTabList'

const renderWithChakra = (ui: React.ReactElement) =>
  render(<ChakraProvider>{ui}</ChakraProvider>)

describe('ImageTabList', () => {
  it('renders nothing when tabs is empty', () => {
    renderWithChakra(<ImageTabList tabs={[]} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('renders a list of image tabs', () => {
    const tabs = [
      { id: 1, url: 'https://example.com/photo1.png' },
      { id: 2, url: 'https://example.com/photo2.jpg' },
    ] as chrome.tabs.Tab[]

    renderWithChakra(<ImageTabList tabs={tabs} />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://example.com/photo1.png')
    expect(links[1]).toHaveAttribute('href', 'https://example.com/photo2.jpg')
  })

  it('renders thumbnail images with correct src', () => {
    const tabs = [
      { id: 1, url: 'https://example.com/photo.png' },
    ] as chrome.tabs.Tab[]

    renderWithChakra(<ImageTabList tabs={tabs} />)

    const img = screen.getByRole('presentation')
    expect(img).toHaveAttribute('src', 'https://example.com/photo.png')
  })

  it('opens links in a new tab', () => {
    const tabs = [
      { id: 1, url: 'https://example.com/photo.png' },
    ] as chrome.tabs.Tab[]

    renderWithChakra(<ImageTabList tabs={tabs} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })
})
