import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isImageURL,
  isImageFormat,
  isTwitterImage,
  getFileName,
  sleep,
  getImageTabs,
} from '../popup/modules'

describe('isImageFormat', () => {
  it.each([
    'https://example.com/photo.jpg',
    'https://example.com/photo.jpeg',
    'https://example.com/photo.png',
    'https://example.com/photo.gif',
    'https://example.com/photo.bmp',
    'https://example.com/photo.webp',
    'https://example.com/photo.svg',
  ])('returns true for image URL: %s', (url) => {
    expect(isImageFormat(url)).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isImageFormat('https://example.com/photo.JPG')).toBe(true)
    expect(isImageFormat('https://example.com/photo.Png')).toBe(true)
  })

  it('returns false for non-image URLs', () => {
    expect(isImageFormat('https://example.com/page.html')).toBe(false)
    expect(isImageFormat('https://example.com/doc.pdf')).toBe(false)
    expect(isImageFormat('https://example.com/')).toBe(false)
  })

  it('ignores query parameters when checking extension', () => {
    expect(isImageFormat('https://example.com/photo.jpg?w=100')).toBe(true)
  })
})

describe('isTwitterImage', () => {
  it('returns true for Twitter media URLs with image format', () => {
    expect(
      isTwitterImage(
        'https://pbs.twimg.com/media/Glfh8q2awAA8nXq?format=png&name=small',
      ),
    ).toBe(true)
  })

  it.each(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'])(
    'supports format=%s',
    (format) => {
      expect(
        isTwitterImage(
          `https://pbs.twimg.com/media/abc123?format=${format}&name=orig`,
        ),
      ).toBe(true)
    },
  )

  it('returns false for non-Twitter URLs', () => {
    expect(
      isTwitterImage('https://example.com/media/img?format=png'),
    ).toBe(false)
  })

  it('returns false for Twitter URLs without media path', () => {
    expect(
      isTwitterImage('https://pbs.twimg.com/profile/abc?format=png'),
    ).toBe(false)
  })

  it('returns false for unsupported format', () => {
    expect(
      isTwitterImage(
        'https://pbs.twimg.com/media/abc?format=mp4&name=orig',
      ),
    ).toBe(false)
  })
})

describe('isImageURL', () => {
  it('returns true for standard image URLs', () => {
    expect(isImageURL('https://example.com/photo.png')).toBe(true)
  })

  it('returns true for Twitter image URLs', () => {
    expect(
      isImageURL(
        'https://pbs.twimg.com/media/abc?format=jpg&name=orig',
      ),
    ).toBe(true)
  })

  it('returns false for non-image URLs', () => {
    expect(isImageURL('https://example.com/page.html')).toBe(false)
  })
})

describe('getFileName', () => {
  it('extracts filename from a simple URL', () => {
    expect(getFileName('https://example.com/images/photo.png')).toBe(
      'photo.png',
    )
  })

  it('extracts filename with query parameters', () => {
    expect(getFileName('https://example.com/photo.jpg?w=100')).toBe(
      'photo.jpg',
    )
  })

  it('adds extension for Twitter image URLs', () => {
    expect(
      getFileName(
        'https://pbs.twimg.com/media/Glfh8q2awAA8nXq?format=png&name=small',
      ),
    ).toBe('Glfh8q2awAA8nXq.png')
  })

  it('returns empty string for root URL', () => {
    expect(getFileName('https://example.com/')).toBe('')
  })
})

describe('sleep', () => {
  it('resolves after the specified duration', async () => {
    vi.useFakeTimers()
    const promise = sleep(1)
    vi.advanceTimersByTime(1000)
    await expect(promise).resolves.toBeUndefined()
    vi.useRealTimers()
  })
})

describe('getImageTabs', () => {
  beforeEach(() => {
    vi.mocked(chrome.tabs.query).mockReset()
  })

  it('filters tabs to only image tabs', async () => {
    const mockTabs = [
      { id: 1, url: 'https://example.com/photo.png' },
      { id: 2, url: 'https://example.com/page.html' },
      { id: 3, url: 'https://pbs.twimg.com/media/abc?format=jpg&name=orig' },
      { id: 4, url: undefined },
    ] as chrome.tabs.Tab[]

    vi.mocked(chrome.tabs.query).mockResolvedValue(mockTabs)

    const result = await getImageTabs()
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(1)
    expect(result[1].id).toBe(3)
  })

  it('returns empty array when no image tabs exist', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 1, url: 'https://example.com/' },
    ] as chrome.tabs.Tab[])

    const result = await getImageTabs()
    expect(result).toHaveLength(0)
  })
})
