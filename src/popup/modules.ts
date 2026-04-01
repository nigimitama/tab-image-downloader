export const getSyncData = async (keys: string[]): Promise<Record<string, unknown>> => {
  try {
    const items = await new Promise<Record<string, unknown>>((resolve, reject) => {
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
        } else {
          resolve(result)
        }
      })
    })
    return items
  } catch (error) {
    console.error("Error retrieving data:", error)
    throw error
  }
}

export const sleep = async (second: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, 1000 * second))
}

const isImageURL = (url: string): boolean => {
  return isImageFormat(url) || isTwitterImage(url)
}

const isImageFormat = (url: string): boolean => {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"]
  const u = new URL(url)

  for (const ext of imageExtensions) {
    if (u.pathname.toLowerCase().endsWith(ext)) {
      return true
    }
  }
  return false
}

const isTwitterImage = (url: string): boolean => {
  // twitterは https://pbs.twimg.com/media/Glfh8q2awAA8nXq?format=png&name=small のようになっている
  const u = new URL(url)
  const isTwitterMedia = u.host === "pbs.twimg.com" && u.pathname.startsWith("/media/")
  if (!isTwitterMedia) return false

  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"]
  for (const ext of imageExtensions) {
    if (u.searchParams.get("format") === ext) return true
  }
  return false
}

export const getImageTabs = async (): Promise<chrome.tabs.Tab[]> => {
  const tabs = await chrome.tabs.query({ currentWindow: true })
  const imageTabs = tabs.filter((tab) => tab.url !== undefined && isImageURL(tab.url))
  console.log(`${imageTabs.length} image tabs found.`)
  return imageTabs
}

export const downloadFile = (url: string, filename: string): Promise<number> => {
  const downloading = chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false,
  })
  return downloading
}

export const getFileName = (url: string): string => {
  const u = new URL(url)
  const fileName = u.pathname.split("/").pop() ?? ""

  if (isTwitterImage(url)) {
    const extension = `.${u.searchParams.get("format")}`
    return `${fileName}${extension}`
  }

  return fileName
}
