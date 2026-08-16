import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useDownload } from "../popup/hooks/useDownload"
import type { ImageSource } from "../popup/chromeApi"

const { downloadFileMock, waitForDownloadCompleteMock, getSyncDataMock } = vi.hoisted(() => ({
  downloadFileMock: vi.fn(),
  waitForDownloadCompleteMock: vi.fn(),
  getSyncDataMock: vi.fn(),
}))

vi.mock("../popup/chromeApi", async () => {
  const actual = await vi.importActual<typeof import("../popup/chromeApi")>("../popup/chromeApi")
  return {
    ...actual,
    downloadFile: downloadFileMock,
    waitForDownloadComplete: waitForDownloadCompleteMock,
    getSyncData: getSyncDataMock,
  }
})

const makeSource = (tabId: number, imageUrl: string): ImageSource => ({
  tab: { id: tabId, url: imageUrl } as chrome.tabs.Tab,
  imageUrl,
})

describe("useDownload - duplicate filenames across tabs", () => {
  beforeEach(() => {
    downloadFileMock.mockReset()
    waitForDownloadCompleteMock.mockReset()
    getSyncDataMock.mockReset()
    getSyncDataMock.mockResolvedValue({ isCloseTabAfterDownload: false, downloadDir: null })

    let nextId = 1
    downloadFileMock.mockImplementation(async () => nextId++)
    waitForDownloadCompleteMock.mockResolvedValue(undefined)
  })

  it("requests a download for every source even when tabs share the same filename", async () => {
    // Two different tabs each have an image whose URL ends in "image.jpg",
    // e.g. https://a.example.com/image.jpg and https://b.example.com/image.jpg.
    const sources = [
      makeSource(1, "https://a.example.com/image.jpg"),
      makeSource(2, "https://b.example.com/image.jpg"),
    ]

    const { result } = renderHook(() => useDownload())

    await act(async () => {
      await result.current.startDownload(sources)
    })

    expect(downloadFileMock).toHaveBeenCalledTimes(2)
    // Both sources resolve to the identical save path ("image.jpg"); the
    // extension itself does not disambiguate them, it downloads each in
    // its own sequential chrome.downloads.download call and relies on
    // Chrome's own filename-uniquify behavior to avoid overwriting.
    expect(downloadFileMock).toHaveBeenNthCalledWith(1, sources[0].imageUrl, "image.jpg")
    expect(downloadFileMock).toHaveBeenNthCalledWith(2, sources[1].imageUrl, "image.jpg")
  })

  it("tracks download status independently per tab/URL despite the shared filename", async () => {
    const sources = [
      makeSource(1, "https://a.example.com/image.jpg"),
      makeSource(2, "https://b.example.com/image.jpg"),
    ]

    const { result } = renderHook(() => useDownload())

    await act(async () => {
      await result.current.startDownload(sources)
    })

    await waitFor(() => {
      expect(result.current.downloadStatuses.size).toBe(2)
    })
    expect(result.current.downloadStatuses.get("1-https://a.example.com/image.jpg")).toBe(
      "completed",
    )
    expect(result.current.downloadStatuses.get("2-https://b.example.com/image.jpg")).toBe(
      "completed",
    )
  })

  it("downloads sequentially (one at a time) so same-named files never race on disk", async () => {
    const sources = [
      makeSource(1, "https://a.example.com/image.jpg"),
      makeSource(2, "https://b.example.com/image.jpg"),
    ]

    const callOrder: string[] = []
    downloadFileMock.mockImplementation(async (url: string) => {
      callOrder.push(`download-start:${url}`)
      return 1
    })
    waitForDownloadCompleteMock.mockImplementation(async (id: number) => {
      callOrder.push(`download-complete:${id}`)
    })

    const { result } = renderHook(() => useDownload())

    await act(async () => {
      await result.current.startDownload(sources)
    })

    // The second download must not start until the first has completed,
    // otherwise two in-flight downloads to the same filename could clobber
    // one another instead of being uniquified by Chrome.
    expect(callOrder).toEqual([
      "download-start:https://a.example.com/image.jpg",
      "download-complete:1",
      "download-start:https://b.example.com/image.jpg",
      "download-complete:1",
    ])
  })

  it("closes only the tabs whose downloads all succeeded, even with duplicate filenames", async () => {
    getSyncDataMock.mockResolvedValue({ isCloseTabAfterDownload: true, downloadDir: null })
    downloadFileMock.mockImplementation(async (url: string) => {
      if (url.includes("fails")) throw new Error("boom")
      return 1
    })

    const sources = [
      makeSource(1, "https://a.example.com/image.jpg"),
      makeSource(2, "https://b.example.com/image-fails.jpg"),
    ]

    const { result } = renderHook(() => useDownload())

    await act(async () => {
      await result.current.startDownload(sources)
    })

    expect(chrome.tabs.remove).toHaveBeenCalledWith(1, expect.any(Function))
    expect(chrome.tabs.remove).not.toHaveBeenCalledWith(2, expect.any(Function))
  })
})
