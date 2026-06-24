export { setSyncData, getSyncData } from "@/popup/storage";

export const sleep = async (second: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, 1000 * second))
}

export const isImageURL = (url: string): boolean => {
  return isImageFormat(url) || isTwitterImage(url)
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"]

export const isImageFormat = (url: string): boolean => {
  const u = new URL(url)
  return IMAGE_EXTENSIONS.some((ext) => u.pathname.toLowerCase().endsWith(`.${ext}`))
}

export const isTwitterImage = (url: string): boolean => {
  const u = new URL(url)
  const isTwitterMedia = u.host === "pbs.twimg.com" && u.pathname.startsWith("/media/")
  if (!isTwitterMedia) return false
  return IMAGE_EXTENSIONS.includes(u.searchParams.get("format") ?? "")
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
