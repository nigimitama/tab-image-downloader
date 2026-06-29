import {
  isImageURL,
  isXPhotoPage,
  getXPhotoIndex,
  upgradeTwitterImageUrl,
  isPixivArtworkPage,
} from "@/popup/imageUrl"

export const setSyncData = (key: string, value: unknown) => {
  if (chrome.storage === undefined) return null
  chrome.storage.sync.set({ [key]: value })
}

export const getSyncData = async <T = Record<string, unknown>>(keys: string[]): Promise<T> => {
  try {
    const items = await new Promise<T>((resolve, reject) => {
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
        } else {
          resolve(result as T)
        }
      })
    })
    return items
  } catch (error) {
    console.error("Error retrieving data:", error)
    throw error
  }
}

export type ImageSource = {
  tab: chrome.tabs.Tab
  imageUrl: string
}

export type DownloadStatus = "downloading" | "completed" | "failed"

export const getSourceKey = (source: ImageSource): string =>
  `${source.tab.id ?? ""}-${source.imageUrl}`

export const extractImageUrlsFromTab = async (tabId: number): Promise<string[]> => {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const imgs = document.querySelectorAll<HTMLImageElement>('img[src*="pbs.twimg.com/media/"]')
      return [...new Set(Array.from(imgs).map((img) => img.src))]
    },
  })
  return results?.[0]?.result ?? []
}

// Pixiv artwork pages render images from i.pximg.net.  Multi-page works
// lazy-load images, so DOM extraction alone misses pages below the fold.
// Use Pixiv's AJAX API to reliably get all page URLs, with DOM fallback.
export const extractPixivImageUrls = async (tabId: number): Promise<string[]> => {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: async () => {
      const match = location.pathname.match(/\/artworks\/(\d+)/)
      if (!match) return []
      const id = match[1]
      try {
        const res = await fetch(`/ajax/illust/${id}/pages`)
        const data = await res.json()
        if (!data.error && Array.isArray(data.body)) {
          return data.body.map((p: { urls: { regular: string } }) => p.urls.regular)
        }
      } catch {
        /* fall through to DOM extraction */
      }
      // Fallback: extract from visible <img> elements
      const imgs = document.querySelectorAll<HTMLImageElement>('img[src*="i.pximg.net"]')
      const urls: string[] = []
      for (const img of imgs) {
        const path = new URL(img.src).pathname
        if (path.startsWith("/img-master/") || path.startsWith("/img-original/")) {
          urls.push(img.src)
        }
      }
      return urls
    },
  })
  return results?.[0]?.result ?? []
}

export const getImageSources = async (
  options: { isSiteParsingEnabled?: boolean } = {},
): Promise<ImageSource[]> => {
  const { isSiteParsingEnabled = true } = options
  const tabs = await chrome.tabs.query({ currentWindow: true })

  const sourcePromises = tabs
    .filter(
      (tab): tab is chrome.tabs.Tab & { url: string; id: number } =>
        tab.url !== undefined && tab.id !== undefined,
    )
    .map(async (tab): Promise<ImageSource | ImageSource[] | null> => {
      if (isImageURL(tab.url)) {
        return { tab, imageUrl: tab.url }
      }
      if (!isSiteParsingEnabled) return null
      if (isXPhotoPage(tab.url)) {
        try {
          const urls = await extractImageUrlsFromTab(tab.id)
          const index = getXPhotoIndex(tab.url)
          const imageUrl = urls[index] ?? urls[0]
          if (imageUrl) {
            return { tab, imageUrl: upgradeTwitterImageUrl(imageUrl) }
          }
        } catch (e) {
          console.error(`Failed to extract image from tab ${tab.id}:`, e)
        }
      }
      if (isPixivArtworkPage(tab.url)) {
        try {
          const imageUrls = await extractPixivImageUrls(tab.id)
          if (imageUrls.length > 0) {
            return imageUrls.map((imageUrl) => ({ tab, imageUrl }))
          }
        } catch (e) {
          console.error(`Failed to extract image from tab ${tab.id}:`, e)
        }
      }
      return null
    })

  const results = await Promise.all(sourcePromises)
  const sources = results.flat().filter((s): s is ImageSource => s !== null)
  console.log(`${sources.length} image sources found.`)
  return sources
}

export const downloadFile = async (url: string, filename: string): Promise<number> => {
  const response = await chrome.runtime.sendMessage({
    type: "downloadImage",
    url,
    filename,
  })
  if (response.error) throw new Error(response.error)
  return response.downloadId
}

export const waitForDownloadComplete = (downloadId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (success: boolean, error?: string) => {
      if (settled) return
      settled = true
      chrome.downloads.onChanged.removeListener(listener)
      success ? resolve() : reject(new Error(error))
    }

    const listener = (delta: chrome.downloads.DownloadDelta) => {
      if (delta.id !== downloadId) return
      if (!delta.state) return
      if (delta.state.current === "complete") {
        settle(true)
      } else if (delta.state.current === "interrupted") {
        settle(false, `Download interrupted: ${delta.id}`)
      }
    }
    chrome.downloads.onChanged.addListener(listener)

    chrome.downloads.search({ id: downloadId }, (items) => {
      if (items.length === 0) return
      const state = items[0].state
      if (state === "complete") settle(true)
      else if (state === "interrupted") settle(false, `Download interrupted: ${downloadId}`)
    })
  })
}
