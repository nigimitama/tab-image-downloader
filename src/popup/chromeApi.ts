import {
  isImageURL,
  isXPhotoPage,
  getXPhotoIndex,
  upgradeTwitterImageUrl,
  isBooruPostPage,
  isGelbooruPostPage,
  isPixivArtworkPage,
} from "@/popup/imageUrl"

export const setSyncData = (key: string, value: unknown) => {
  if (chrome.storage === undefined) return null;
  chrome.storage.sync.set({ [key]: value });
};

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
  downloadUrl?: string
}

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

// Booru post pages (Danbooru, Gelbooru, ...) render the displayed image in an
// <img id="image"> element. Extract its src to download the shown image.
export const extractBooruImageUrl = async (tabId: number): Promise<string | null> => {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const img = document.querySelector<HTMLImageElement>("#image")
      return img?.src ?? null
    },
  })
  return results?.[0]?.result ?? null
}

// Pixiv artwork pages render images from i.pximg.net. Extract all artwork
// image URLs from the DOM (a multi-page work shows all pages on one page).
export const extractPixivImageUrls = async (tabId: number): Promise<string[]> => {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      // Prefer links to original-quality images
      const originalLinks = document.querySelectorAll<HTMLAnchorElement>('a[href*="i.pximg.net/img-original/"]')
      if (originalLinks.length > 0) {
        return Array.from(originalLinks).map((a) => a.href)
      }
      // Fall back to displayed master/regular images
      const imgs = document.querySelectorAll<HTMLImageElement>('img[src*="i.pximg.net"]')
      const urls: string[] = []
      for (const img of imgs) {
        if (img.src.includes("/img-master/") || img.src.includes("/img-original/")) {
          urls.push(img.src)
        }
      }
      return urls
    },
  })
  return results?.[0]?.result ?? []
}

// Some CDNs (Gelbooru's img*.gelbooru.com, Pixiv's i.pximg.net) reject requests
// without a proper Referer header.  chrome.downloads.download() sends no
// Referer, so direct downloads may silently fail.
//
// Workaround: create a hidden iframe on the source page that loads the image
// URL.  The iframe request carries the correct Referer (from the parent page),
// so the CDN serves the real image.  Once the iframe has loaded, we inject a
// script into it that re-fetches the image (same-origin) and returns a
// data-URL that chrome.downloads.download() can use.
export const fetchImageAsDataUrl = async (
  tabId: number,
  imageUrl: string,
): Promise<string | null> => {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: (url: string) => {
      const existing = document.getElementById("__tid_loader")
      if (existing) existing.remove()
      const iframe = document.createElement("iframe")
      iframe.id = "__tid_loader"
      iframe.src = url
      iframe.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0"
      document.body.appendChild(iframe)
    },
    args: [imageUrl],
  })

  let dataUrl: string | null = null
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise((r) => setTimeout(r, 500))
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        world: "MAIN",
        func: async () => {
          if (!document.contentType?.startsWith("image/")) return null
          try {
            const res = await fetch(document.URL)
            if (!res.ok) return null
            const blob = await res.blob()
            return await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
          } catch {
            return null
          }
        },
      })
      for (const r of results) {
        if (r.result) {
          dataUrl = r.result as string
          break
        }
      }
      if (dataUrl) break
    } catch {
      // iframe not ready or injection failed — retry
    }
  }

  chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => document.getElementById("__tid_loader")?.remove(),
    })
    .catch(() => {})

  return dataUrl
}

export const getImageSources = async (): Promise<ImageSource[]> => {
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
      if (isBooruPostPage(tab.url)) {
        try {
          const imageUrl = await extractBooruImageUrl(tab.id)
          if (imageUrl) {
            if (isGelbooruPostPage(tab.url)) {
              const downloadUrl = await fetchImageAsDataUrl(tab.id, imageUrl)
              if (downloadUrl) {
                return { tab, imageUrl, downloadUrl }
              }
            }
            return { tab, imageUrl }
          }
        } catch (e) {
          console.error(`Failed to extract image from tab ${tab.id}:`, e)
        }
      }
      if (isPixivArtworkPage(tab.url)) {
        try {
          const imageUrls = await extractPixivImageUrls(tab.id)
          if (imageUrls.length > 0) {
            const sources: ImageSource[] = []
            for (const imageUrl of imageUrls) {
              const downloadUrl = await fetchImageAsDataUrl(tab.id, imageUrl)
              sources.push(downloadUrl ? { tab, imageUrl, downloadUrl } : { tab, imageUrl })
            }
            return sources
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

export const downloadFile = (url: string, filename: string): Promise<number> => {
  const downloading = chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false,
  })
  return downloading
}
