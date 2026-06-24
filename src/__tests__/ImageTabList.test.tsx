import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChakraProvider } from '@chakra-ui/react'
import { ImageTabList } from '../popup/components/ImageTabList'
import type { ImageSource } from '../popup/chromeApi'

const renderWithChakra = (ui: React.ReactElement) =>
  render(<ChakraProvider>{ui}</ChakraProvider>)

const makeSource = (id: number, imageUrl: string, tabUrl?: string): ImageSource => ({
  tab: { id, url: tabUrl ?? imageUrl } as chrome.tabs.Tab,
  imageUrl,
})

describe('ImageTabList', () => {
  it('renders nothing when sources is empty', () => {
    renderWithChakra(<ImageTabList sources={[]} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('renders a list of image sources', () => {
    const sources = [
      makeSource(1, 'https://example.com/photo1.png'),
      makeSource(2, 'https://example.com/photo2.jpg'),
    ]

    renderWithChakra(<ImageTabList sources={sources} />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://example.com/photo1.png')
    expect(links[1]).toHaveAttribute('href', 'https://example.com/photo2.jpg')
  })

  it('renders thumbnail images with imageUrl src', () => {
    const sources = [
      makeSource(1, 'https://pbs.twimg.com/media/abc?format=jpg&name=orig', 'https://x.com/user/status/123/photo/1'),
    ]

    renderWithChakra(<ImageTabList sources={sources} />)

    const img = screen.getByRole('presentation')
    expect(img).toHaveAttribute('src', 'https://pbs.twimg.com/media/abc?format=jpg&name=orig')
  })

  it('links to the tab URL for X photo pages', () => {
    const sources = [
      makeSource(1, 'https://pbs.twimg.com/media/abc?format=jpg&name=orig', 'https://x.com/user/status/123/photo/1'),
    ]

    renderWithChakra(<ImageTabList sources={sources} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://x.com/user/status/123/photo/1')
  })

  it('opens links in a new tab', () => {
    const sources = [makeSource(1, 'https://example.com/photo.png')]

    renderWithChakra(<ImageTabList sources={sources} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })
})
