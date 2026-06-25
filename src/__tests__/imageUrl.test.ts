import { describe, it, expect, vi } from 'vitest'
import {
  isImageURL,
  isImageFormat,
  isTwitterImage,
  isXPhotoPage,
  getXPhotoIndex,
  upgradeTwitterImageUrl,
  getFileName,
  sleep,
  isDanbooruPostPage,
  isGelbooruPostPage,
  isYanderePostPage,
  isBooruPostPage,
  isPixivArtworkPage,
} from '../popup/imageUrl'

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

describe('isDanbooruPostPage', () => {
  it.each([
    'https://danbooru.donmai.us/posts/11655837',
    'https://danbooru.donmai.us/posts/1',
    'https://safebooru.donmai.us/posts/123',
  ])('returns true for Danbooru post page: %s', (url) => {
    expect(isDanbooruPostPage(url)).toBe(true)
  })

  it.each([
    'https://danbooru.donmai.us/posts',
    'https://danbooru.donmai.us/posts/abc',
    'https://danbooru.donmai.us/posts/123/edit',
    'https://danbooru.donmai.us/',
    'https://evil-donmai.us/posts/123',
    'https://example.com/posts/123',
  ])('returns false for non post page: %s', (url) => {
    expect(isDanbooruPostPage(url)).toBe(false)
  })
})

describe('isGelbooruPostPage', () => {
  it.each([
    'https://gelbooru.com/index.php?page=post&s=view&id=14357815',
    'https://gelbooru.com/index.php?page=post&s=view&id=1&tags=foo',
  ])('returns true for Gelbooru post page: %s', (url) => {
    expect(isGelbooruPostPage(url)).toBe(true)
  })

  it.each([
    'https://gelbooru.com/index.php?page=post&s=list&tags=foo',
    'https://gelbooru.com/index.php?page=post&s=view',
    'https://gelbooru.com/index.php?page=post&s=view&id=abc',
    'https://gelbooru.com/',
    'https://example.com/index.php?page=post&s=view&id=1',
  ])('returns false for non post page: %s', (url) => {
    expect(isGelbooruPostPage(url)).toBe(false)
  })
})

describe('isYanderePostPage', () => {
  it.each([
    'https://yande.re/post/show/1253771',
    'https://yande.re/post/show/1',
    // yande.re sometimes appends a tag slug after the id
    'https://yande.re/post/show/1253771/bra',
  ])('returns true for yande.re post page: %s', (url) => {
    expect(isYanderePostPage(url)).toBe(true)
  })

  it.each([
    'https://yande.re/post/show',
    'https://yande.re/post/show/abc',
    'https://yande.re/post',
    'https://yande.re/',
    'https://yande.re/pool/show/123',
    'https://yande.re.evil.com/post/show/123',
    'https://files.yande.re/post/show/123',
    'https://example.com/post/show/123',
  ])('returns false for non post page: %s', (url) => {
    expect(isYanderePostPage(url)).toBe(false)
  })
})

describe('isBooruPostPage', () => {
  it('returns true for Danbooru, Gelbooru and yande.re post pages', () => {
    expect(isBooruPostPage('https://danbooru.donmai.us/posts/11655837')).toBe(true)
    expect(
      isBooruPostPage('https://gelbooru.com/index.php?page=post&s=view&id=14357815'),
    ).toBe(true)
    expect(isBooruPostPage('https://yande.re/post/show/1253771')).toBe(true)
  })

  it('returns false for unrelated pages', () => {
    expect(isBooruPostPage('https://example.com/page.html')).toBe(false)
  })
})

describe('isPixivArtworkPage', () => {
  it.each([
    'https://www.pixiv.net/artworks/12345678',
    'https://www.pixiv.net/en/artworks/12345678',
    'https://www.pixiv.net/ja/artworks/99999999',
    'https://pixiv.net/artworks/12345678',
  ])('returns true for Pixiv artwork page: %s', (url) => {
    expect(isPixivArtworkPage(url)).toBe(true)
  })

  it.each([
    'https://www.pixiv.net/artworks',
    'https://www.pixiv.net/artworks/',
    'https://www.pixiv.net/artworks/abc',
    'https://www.pixiv.net/users/12345',
    'https://www.pixiv.net/',
    'https://example.com/artworks/12345678',
    'https://www.pixiv.net/en/artworks/12345678/edit',
  ])('returns false for non artwork page: %s', (url) => {
    expect(isPixivArtworkPage(url)).toBe(false)
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

  it('extracts filename from a Danbooru sample URL', () => {
    expect(
      getFileName(
        'https://cdn.donmai.us/sample/ea/48/__moria_luluka_and_mashu_tan_precure_and_1_more_drawn_by_ryuhirohumi__sample-ea48f0b280a1d3f7efc3501f72a4ba9a.jpg',
      ),
    ).toBe(
      '__moria_luluka_and_mashu_tan_precure_and_1_more_drawn_by_ryuhirohumi__sample-ea48f0b280a1d3f7efc3501f72a4ba9a.jpg',
    )
  })

  it('extracts filename from a Gelbooru sample URL with a double slash', () => {
    expect(
      getFileName(
        'https://img4.gelbooru.com//samples/15/65/sample_156599b000c99a786d987fa30ab25d27.jpg',
      ),
    ).toBe('sample_156599b000c99a786d987fa30ab25d27.jpg')
  })

  it('extracts filename from a Pixiv image URL', () => {
    expect(
      getFileName(
        'https://i.pximg.net/img-master/img/2024/01/01/00/00/00/12345678_p0_master1200.jpg',
      ),
    ).toBe('12345678_p0_master1200.jpg')
  })

  it('extracts filename from a Pixiv original image URL', () => {
    expect(
      getFileName(
        'https://i.pximg.net/img-original/img/2024/01/01/00/00/00/12345678_p0.png',
      ),
    ).toBe('12345678_p0.png')
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
