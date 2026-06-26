import { describe, it, expect, beforeEach, type Mock } from "vitest"
import { getImageSources } from "../popup/chromeApi"

describe("getImageSources", () => {
  const queryMock = chrome.tabs.query as unknown as Mock
  const scriptMock = chrome.scripting.executeScript as unknown as Mock

  beforeEach(() => {
    queryMock.mockReset()
    scriptMock.mockReset()
  })

  it("includes direct image tabs", async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: "https://example.com/photo.png" },
    ] as chrome.tabs.Tab[])

    const result = await getImageSources()
    expect(result).toHaveLength(1)
    expect(result[0].imageUrl).toBe("https://example.com/photo.png")
  })

  it("extracts image URL from X photo page tabs", async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: "https://x.com/user/status/123/photo/1" },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([
      { result: ["https://pbs.twimg.com/media/abc?format=jpg&name=large"] },
    ])

    const result = await getImageSources()
    expect(result).toHaveLength(1)
    expect(result[0].imageUrl).toBe("https://pbs.twimg.com/media/abc?format=jpg&name=orig")
    expect(result[0].tab.url).toBe("https://x.com/user/status/123/photo/1")
  })

  it("skips X photo page tabs when no image is found", async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: "https://x.com/user/status/123/photo/1" },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([{ result: [] }])

    const result = await getImageSources()
    expect(result).toHaveLength(0)
  })

  it("skips X photo page tabs when script injection fails", async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: "https://x.com/user/status/123/photo/1" },
    ] as chrome.tabs.Tab[])
    scriptMock.mockRejectedValue(new Error("injection failed"))

    const result = await getImageSources()
    expect(result).toHaveLength(0)
  })

  it("selects the correct image for /photo/2 with real URL example", async () => {
    queryMock.mockResolvedValue([
      {
        id: 1,
        url: "https://x.com/Open_BrainPad/status/1984085417163964616/photo/2",
      },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([
      {
        result: [
          "https://pbs.twimg.com/media/G4jcwZXbcAE4VPf?format=jpg&name=large",
          "https://pbs.twimg.com/media/G4jczQaa8Agackz?format=jpg&name=large",
          "https://pbs.twimg.com/media/G4jc1d1a4AAhxl2?format=jpg&name=large",
        ],
      },
    ])

    const result = await getImageSources()
    expect(result).toHaveLength(1)
    expect(result[0].imageUrl).toBe(
      "https://pbs.twimg.com/media/G4jczQaa8Agackz?format=jpg&name=orig",
    )
  })

  it("falls back to first image when photo index exceeds available images", async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: "https://x.com/user/status/123/photo/4" },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([
      {
        result: ["https://pbs.twimg.com/media/img1?format=jpg&name=large"],
      },
    ])

    const result = await getImageSources()
    expect(result).toHaveLength(1)
    expect(result[0].imageUrl).toBe("https://pbs.twimg.com/media/img1?format=jpg&name=orig")
  })

  it("extracts the sample image URL from a Danbooru post page", async () => {
    // Real example: visiting the post page below, the displayed <img id="image">
    // points at the sample image that should be downloaded.
    queryMock.mockResolvedValue([
      { id: 1, url: "https://danbooru.donmai.us/posts/11655837" },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([
      {
        result:
          "https://cdn.donmai.us/sample/ea/48/__moria_luluka_and_mashu_tan_precure_and_1_more_drawn_by_ryuhirohumi__sample-ea48f0b280a1d3f7efc3501f72a4ba9a.jpg",
      },
    ])

    const result = await getImageSources()
    expect(result).toHaveLength(1)
    expect(result[0].imageUrl).toBe(
      "https://cdn.donmai.us/sample/ea/48/__moria_luluka_and_mashu_tan_precure_and_1_more_drawn_by_ryuhirohumi__sample-ea48f0b280a1d3f7efc3501f72a4ba9a.jpg",
    )
    expect(result[0].tab.url).toBe("https://danbooru.donmai.us/posts/11655837")
  })

  it("extracts the sample image URL from a Gelbooru post page", async () => {
    // Real example: visiting the post page below, the displayed <img id="image">
    // points at the sample image that should be downloaded.
    queryMock.mockResolvedValue([
      {
        id: 1,
        url: "https://gelbooru.com/index.php?page=post&s=view&id=14357815",
      },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([
      {
        result:
          "https://img4.gelbooru.com//samples/15/65/sample_156599b000c99a786d987fa30ab25d27.jpg",
      },
    ])

    const result = await getImageSources()
    expect(result).toHaveLength(1)
    expect(result[0].imageUrl).toBe(
      "https://img4.gelbooru.com//samples/15/65/sample_156599b000c99a786d987fa30ab25d27.jpg",
    )
    expect(result[0].tab.url).toBe("https://gelbooru.com/index.php?page=post&s=view&id=14357815")
  })

  it("extracts the sample image URL from a yande.re post page", async () => {
    // Real example: visiting https://yande.re/post/show/1253771, the displayed
    // <img id="image"> points at the sample image that should be downloaded.
    queryMock.mockResolvedValue([
      { id: 1, url: "https://yande.re/post/show/1253771" },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([
      {
        result:
          "https://files.yande.re/sample/6cbcc2f97d722a85ec6db3af7a7c8093/yande.re%201253771%20sample%20bra%20danimaru%20lingerie%20open_shirt%20see_through%20seifuku.jpg",
      },
    ])

    const result = await getImageSources()
    expect(result).toHaveLength(1)
    expect(result[0].imageUrl).toBe(
      "https://files.yande.re/sample/6cbcc2f97d722a85ec6db3af7a7c8093/yande.re%201253771%20sample%20bra%20danimaru%20lingerie%20open_shirt%20see_through%20seifuku.jpg",
    )
    expect(result[0].tab.url).toBe("https://yande.re/post/show/1253771")
  })

  it("skips Booru post page tabs when no image is found", async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: "https://danbooru.donmai.us/posts/11655837" },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([{ result: null }])

    const result = await getImageSources()
    expect(result).toHaveLength(0)
  })

  it("skips Booru post page tabs when script injection fails", async () => {
    queryMock.mockResolvedValue([
      {
        id: 1,
        url: "https://gelbooru.com/index.php?page=post&s=view&id=14357815",
      },
    ] as chrome.tabs.Tab[])
    scriptMock.mockRejectedValue(new Error("injection failed"))

    const result = await getImageSources()
    expect(result).toHaveLength(0)
  })

  it("extracts image URL from a Pixiv artwork page", async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: "https://www.pixiv.net/artworks/12345678" },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([
      {
        result: [
          "https://i.pximg.net/img-master/img/2024/01/01/00/00/00/12345678_p0_master1200.jpg",
        ],
      },
    ])

    const result = await getImageSources()
    expect(result).toHaveLength(1)
    expect(result[0].imageUrl).toBe(
      "https://i.pximg.net/img-master/img/2024/01/01/00/00/00/12345678_p0_master1200.jpg",
    )
    expect(result[0].tab.url).toBe("https://www.pixiv.net/artworks/12345678")
  })

  it("extracts multiple image URLs from a multi-page Pixiv artwork", async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: "https://www.pixiv.net/artworks/12345678" },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([
      {
        result: [
          "https://i.pximg.net/img-master/img/2024/01/01/00/00/00/12345678_p0_master1200.jpg",
          "https://i.pximg.net/img-master/img/2024/01/01/00/00/00/12345678_p1_master1200.jpg",
        ],
      },
    ])

    const result = await getImageSources()
    expect(result).toHaveLength(2)
    expect(result[0].imageUrl).toBe(
      "https://i.pximg.net/img-master/img/2024/01/01/00/00/00/12345678_p0_master1200.jpg",
    )
    expect(result[1].imageUrl).toBe(
      "https://i.pximg.net/img-master/img/2024/01/01/00/00/00/12345678_p1_master1200.jpg",
    )
    expect(result[0].tab.url).toBe("https://www.pixiv.net/artworks/12345678")
    expect(result[1].tab.url).toBe("https://www.pixiv.net/artworks/12345678")
  })

  it("skips Pixiv artwork page tabs when no image is found", async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: "https://www.pixiv.net/artworks/12345678" },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([{ result: [] }])

    const result = await getImageSources()
    expect(result).toHaveLength(0)
  })

  it("skips Pixiv artwork page tabs when script injection fails", async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: "https://www.pixiv.net/artworks/12345678" },
    ] as chrome.tabs.Tab[])
    scriptMock.mockRejectedValue(new Error("injection failed"))

    const result = await getImageSources()
    expect(result).toHaveLength(0)
  })

  it("handles mix of direct image tabs and X photo pages", async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: "https://example.com/photo.png" },
      { id: 2, url: "https://x.com/user/status/123/photo/1" },
      { id: 3, url: "https://example.com/page.html" },
    ] as chrome.tabs.Tab[])
    scriptMock.mockResolvedValue([
      { result: ["https://pbs.twimg.com/media/xyz?format=png&name=small"] },
    ])

    const result = await getImageSources()
    expect(result).toHaveLength(2)
    expect(result[0].imageUrl).toBe("https://example.com/photo.png")
    expect(result[1].imageUrl).toBe("https://pbs.twimg.com/media/xyz?format=png&name=orig")
  })

  it("skips site parsing when isSiteParsingEnabled is false", async () => {
    queryMock.mockResolvedValue([
      { id: 1, url: "https://example.com/photo.png" },
      { id: 2, url: "https://x.com/user/status/123/photo/1" },
      { id: 3, url: "https://danbooru.donmai.us/posts/11655837" },
      { id: 4, url: "https://www.pixiv.net/artworks/12345678" },
    ] as chrome.tabs.Tab[])

    const result = await getImageSources({ isSiteParsingEnabled: false })
    expect(result).toHaveLength(1)
    expect(result[0].imageUrl).toBe("https://example.com/photo.png")
    expect(scriptMock).not.toHaveBeenCalled()
  })
})
