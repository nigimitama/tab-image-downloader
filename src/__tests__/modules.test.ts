import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import {
  isImageURL,
  isImageFormat,
  isTwitterImage,
  isXPhotoPage,
  getXPhotoIndex,
  upgradeTwitterImageUrl,
  getFileName,
  sleep,
} from '../popup/imageUrl'
import { getImageTabs, getImageSources } from '../popup/chromeApi'

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

describe('isXPhotoPage', () => {
  it.each([
    'https://x.com/mitama64/status/1808838033971818871/photo/1',
    'https://x.com/user/status/123456/photo/1',
    'https://x.com/user/status/123456/photo/2',
    'https://twitter.com/user/status/123456/photo/1',
  ])('returns true for X photo page: %s', (url) => {
    expect(isXPhotoPage(url)).toBe(true)
  })

  it.each([
    'https://x.com/user/status/123456',
    'https://x.com/user',
    'https://example.com/user/status/123456/photo/1',
    'https://x.com/user/status/abc/photo/1',
    'https://x.com/user/status/123456/photo/',
  ])('returns false for non-photo page: %s', (url) => {
    expect(isXPhotoPage(url)).toBe(false)
  })
})

describe('getXPhotoIndex', () => {
  it('returns 0-based index from /photo/N', () => {
    expect(getXPhotoIndex('https://x.com/user/status/123/photo/1')).toBe(0)
    expect(getXPhotoIndex('https://x.com/user/status/123/photo/2')).toBe(1)
    expect(getXPhotoIndex('https://x.com/user/status/123/photo/4')).toBe(3)
  })
})

describe('upgradeTwitterImageUrl', () => {
  it('sets name=orig for Twitter media URLs', () => {
    expect(
      upgradeTwitterImageUrl(
        'https://pbs.twimg.com/media/abc123?format=jpg&name=small',
      ),
    ).toBe('https://pbs.twimg.com/media/abc123?format=jpg&name=orig')
  })

  it('adds name=orig when name param is missing', () => {
    expect(
      upgradeTwitterImageUrl(
        'https://pbs.twimg.com/media/abc123?format=jpg',
      ),
    ).toBe('https://pbs.twimg.com/media/abc123?format=jpg&name=orig')
  })

  it('does not modify non-Twitter URLs', () => {
    const url = 'https://example.com/photo.jpg'
    expect(upgradeTwitterImageUrl(url)).toBe(url)
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
  const queryMock = chrome.tabs.query as unknown as Mock

  beforeEach(() => {
    queryMock.mockReset()
  })

  it('filters tabs to only image tabs', async () => {
    const mockTabs = [
      { id: 1, url: 'https://example.com/photo.png' },
      { id: 2, url: 'https://example.com/page.html' },
      { id: 3, url: 'https://pbs.twimg.com/media/abc?format=jpg&name=orig' },
      { id: 4, url: undefined },
    ] as chrome.tabs.Tab[]

    queryMock.mockResolvedValue(mockTabs)

    const result = await getImageTabs()
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(1)
    expect(result[1].id).toBe(3)
  })

  it('returns empty array when no image tabs exist', async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: 'https://example.com/' },
    ] as chrome.tabs.Tab[])

    const result = await getImageTabs()
    expect(result).toHaveLength(0)
  })
})

describe('getImageSources', () => {
  const queryMock = chrome.tabs.query as unknown as Mock
  const scriptMock = chrome.scripting.executeScript as unknown as Mock

  beforeEach(() => {
    queryMock.mockReset()
    scriptMock.mockReset()
  })

  it('includes direct image tabs', async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: 'https://example.com/photo.png' },
    ] as chrome.tabs.Tab[])

    const result = await getImageSources()
    expect(result).toHaveLength(1)
    expect(result[0].imageUrl).toBe('https://example.com/photo.png')
  })

  it('extracts image URL from X photo page tabs', async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: 'https://x.com/user/status/123/photo/1' },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([
      { result: ['https://pbs.twimg.com/media/abc?format=jpg&name=large'] },
    ])

    const result = await getImageSources()
    expect(result).toHaveLength(1)
    expect(result[0].imageUrl).toBe(
      'https://pbs.twimg.com/media/abc?format=jpg&name=orig',
    )
    expect(result[0].tab.url).toBe(
      'https://x.com/user/status/123/photo/1',
    )
  })

  it('skips X photo page tabs when no image is found', async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: 'https://x.com/user/status/123/photo/1' },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([{ result: [] }])

    const result = await getImageSources()
    expect(result).toHaveLength(0)
  })

  it('skips X photo page tabs when script injection fails', async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: 'https://x.com/user/status/123/photo/1' },
    ] as chrome.tabs.Tab[])
    scriptMock.mockRejectedValue(new Error('injection failed'))

    const result = await getImageSources()
    expect(result).toHaveLength(0)
  })

  it('selects the correct image for /photo/2 with real URL example', async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: 'https://x.com/Open_BrainPad/status/1984085417163964616/photo/2' },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([
      {
        result: [
          'https://pbs.twimg.com/media/G4jcwZXbcAE4VPf?format=jpg&name=large',
          'https://pbs.twimg.com/media/G4jczQaa8Agackz?format=jpg&name=large',
          'https://pbs.twimg.com/media/G4jc1d1a4AAhxl2?format=jpg&name=large',
        ],
      },
    ])

    const result = await getImageSources()
    expect(result).toHaveLength(1)
    expect(result[0].imageUrl).toBe(
      'https://pbs.twimg.com/media/G4jczQaa8Agackz?format=jpg&name=orig',
    )
  })

  it('falls back to first image when photo index exceeds available images', async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: 'https://x.com/user/status/123/photo/4' },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([
      {
        result: [
          'https://pbs.twimg.com/media/img1?format=jpg&name=large',
        ],
      },
    ])

    const result = await getImageSources()
    expect(result).toHaveLength(1)
    expect(result[0].imageUrl).toBe(
      'https://pbs.twimg.com/media/img1?format=jpg&name=orig',
    )
  })

  it('handles mix of direct image tabs and X photo pages', async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: 'https://example.com/photo.png' },
      { id: 2, url: 'https://x.com/user/status/123/photo/1' },
      { id: 3, url: 'https://example.com/page.html' },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([
      { result: ['https://pbs.twimg.com/media/xyz?format=png&name=small'] },
    ])

    const result = await getImageSources()
    expect(result).toHaveLength(2)
    expect(result[0].imageUrl).toBe('https://example.com/photo.png')
    expect(result[1].imageUrl).toBe(
      'https://pbs.twimg.com/media/xyz?format=png&name=orig',
    )
  })
})
