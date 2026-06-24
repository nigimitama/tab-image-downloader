import { isImageURL } from "@/popup/imageUrl"

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
