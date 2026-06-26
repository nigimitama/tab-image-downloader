import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { ImageTabList } from '../popup/components/ImageTabList'
import type { ImageSource } from '../popup/chromeApi'

const renderWithChakra = (ui: React.ReactElement) =>
  render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)

const makeSource = (id: number, imageUrl: string, tabUrl?: string): ImageSource => ({
  tab: { id, url: tabUrl ?? imageUrl } as chrome.tabs.Tab,
  imageUrl,
})

const allSelected = (sources: ImageSource[]) =>
  new Set(sources.map((s) => s.tab.id).filter((id): id is number => id !== undefined))

type Overrides = {
  selectedIds?: Set<number>
  onToggle?: (id: number) => void
  onToggleAll?: () => void
}

const defaultDownloadStatuses = new Map()

const renderList = (sources: ImageSource[], overrides: Overrides = {}) =>
  renderWithChakra(
    <ImageTabList
      sources={sources}
      selectedIds={overrides.selectedIds ?? allSelected(sources)}
      onToggle={overrides.onToggle ?? (() => {})}
      onToggleAll={overrides.onToggleAll ?? (() => {})}
      downloadStatuses={defaultDownloadStatuses}
      isDownloading={false}
    />,
  )

describe('ImageTabList', () => {
  it('renders nothing when sources is empty', () => {
    renderList([])
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('renders a list of image sources', () => {
    const sources = [
      makeSource(1, 'https://example.com/photo1.png'),
      makeSource(2, 'https://example.com/photo2.jpg'),
    ]

    renderList(sources)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://example.com/photo1.png')
    expect(links[1]).toHaveAttribute('href', 'https://example.com/photo2.jpg')
  })

  it('renders thumbnail images with imageUrl src', () => {
    const sources = [
      makeSource(1, 'https://pbs.twimg.com/media/abc?format=jpg&name=orig', 'https://x.com/user/status/123/photo/1'),
    ]

    renderList(sources)

    const img = screen.getByRole('presentation')
    expect(img).toHaveAttribute('src', 'https://pbs.twimg.com/media/abc?format=jpg&name=orig')
  })

  it('links the image-URL text to the image and adds a separate source-page link when the tab URL differs', () => {
    const sources = [
      makeSource(1, 'https://pbs.twimg.com/media/abc?format=jpg&name=orig', 'https://x.com/user/status/123/photo/1'),
    ]

    renderList(sources)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://pbs.twimg.com/media/abc?format=jpg&name=orig')
    expect(links[0]).toHaveTextContent('https://pbs.twimg.com/media/abc?format=jpg&name=orig')
    expect(links[1]).toHaveAttribute('href', 'https://x.com/user/status/123/photo/1')
    expect(links[1]).toHaveTextContent('Open source page')
    expect(links[1]).toHaveAttribute('target', '_blank')
    expect(links[1]).toHaveAttribute('rel', 'noreferrer')
  })

  it('does not render a source-page link when the tab URL equals the image URL', () => {
    const sources = [makeSource(1, 'https://example.com/photo.png')]

    renderList(sources)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', 'https://example.com/photo.png')
  })

  it('opens links in a new tab', () => {
    const sources = [makeSource(1, 'https://example.com/photo.png')]

    renderList(sources)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('renders a checkbox per source plus a select-all checkbox', () => {
    const sources = [
      makeSource(1, 'https://example.com/photo1.png'),
      makeSource(2, 'https://example.com/photo2.jpg'),
    ]

    renderList(sources)

    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    expect(screen.getByRole('checkbox', { name: 'Select all' })).toBeInTheDocument()
  })

  it('checks rows present in selectedIds and unchecks the rest', () => {
    const sources = [
      makeSource(1, 'https://example.com/photo1.png'),
      makeSource(2, 'https://example.com/photo2.jpg'),
    ]

    renderList(sources, { selectedIds: new Set([1]) })

    const [, row1, row2] = screen.getAllByRole('checkbox')
    expect(row1).toBeChecked()
    expect(row2).not.toBeChecked()
  })

  it('calls onToggle with the tab id when a row checkbox is clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    const sources = [
      makeSource(10, 'https://example.com/photo1.png'),
      makeSource(20, 'https://example.com/photo2.jpg'),
    ]

    renderList(sources, { onToggle })

    const [, row1, row2] = screen.getAllByRole('checkbox')
    await user.click(row1)
    await user.click(row2)

    expect(onToggle).toHaveBeenCalledTimes(2)
    expect(onToggle).toHaveBeenNthCalledWith(1, 10)
    expect(onToggle).toHaveBeenNthCalledWith(2, 20)
  })

  it('calls onToggleAll when the select-all checkbox is clicked', async () => {
    const user = userEvent.setup()
    const onToggleAll = vi.fn()
    const sources = [makeSource(1, 'https://example.com/photo1.png')]

    renderList(sources, { onToggleAll })

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))

    expect(onToggleAll).toHaveBeenCalledTimes(1)
  })

  it('reflects all / none / partial selection in the select-all checkbox', () => {
    const sources = [
      makeSource(1, 'https://example.com/photo1.png'),
      makeSource(2, 'https://example.com/photo2.jpg'),
    ]

    const { rerender } = renderList(sources, { selectedIds: new Set([1, 2]) })
    expect(screen.getByRole('checkbox', { name: 'Select all' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Select all' })).not.toBePartiallyChecked()

    const withProps = (selectedIds: Set<number>) => (
      <ChakraProvider value={defaultSystem}>
        <ImageTabList sources={sources} selectedIds={selectedIds} onToggle={() => {}} onToggleAll={() => {}} downloadStatuses={defaultDownloadStatuses} isDownloading={false} />
      </ChakraProvider>
    )

    rerender(withProps(new Set([1])))
    expect(screen.getByRole('checkbox', { name: 'Select all' })).toBePartiallyChecked()

    rerender(withProps(new Set()))
    const selectAll = screen.getByRole('checkbox', { name: 'Select all' })
    expect(selectAll).not.toBeChecked()
    expect(selectAll).not.toBePartiallyChecked()
  })

  it('shows the selected count', () => {
    const sources = [
      makeSource(1, 'https://example.com/photo1.png'),
      makeSource(2, 'https://example.com/photo2.jpg'),
    ]

    renderList(sources, { selectedIds: new Set([1]) })

    expect(screen.getByText('1 / 2 selected')).toBeInTheDocument()
  })
})
