import {
  isImageURL,
  isXPhotoPage,
  getXPhotoIndex,
  upgradeTwitterImageUrl,
  isBooruPostPage,
  isGelbooruPostPage,
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

// Gelbooru's CDN (img*.gelbooru.com) rejects requests without a Referer from
// *.gelbooru.com.  chrome.downloads.download() sends no Referer, so direct
// downloads silently receive an HTML page instead of the image.
//
// Workaround: create a hidden iframe on the Gelbooru page that loads the image
// URL.  The iframe request carries the correct Referer (from gelbooru.com), so
// the CDN serves the real image.  Once the iframe has loaded, we inject a
// script into it that re-fetches the image (same-origin at img*.gelbooru.com)
// and returns a data-URL that chrome.downloads.download() can use.
export const fetchGelbooruImageAsDataUrl = async (
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
    .map(async (tab): Promise<ImageSource | null> => {
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
              const downloadUrl = await fetchGelbooruImageAsDataUrl(tab.id, imageUrl)
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
      return null
    })

  const results = await Promise.all(sourcePromises)
  const sources = results.filter((s): s is ImageSource => s !== null)
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
