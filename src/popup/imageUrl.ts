const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"]

export const isImageURL = (url: string): boolean => {
  return isImageFormat(url) || isTwitterImage(url)
}

export const isImageFormat = (url: string): boolean => {
  const u = new URL(url)
  return IMAGE_EXTENSIONS.some((ext) => u.pathname.toLowerCase().endsWith(`.${ext}`))
}

const isTwitterMediaUrl = (u: URL): boolean =>
  u.host === "pbs.twimg.com" && u.pathname.startsWith("/media/")

export const isTwitterImage = (url: string): boolean => {
  const u = new URL(url)
  if (!isTwitterMediaUrl(u)) return false
  return IMAGE_EXTENSIONS.includes(u.searchParams.get("format") ?? "")
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

export const isXPhotoPage = (url: string): boolean => {
  try {
    const u = new URL(url)
    return (
      (u.host === "x.com" || u.host === "twitter.com") &&
      /^\/[^/]+\/status\/\d+\/photo\/\d+$/.test(u.pathname)
    )
  } catch {
    return false
  }
}

export const getXPhotoIndex = (url: string): number => {
  const match = new URL(url).pathname.match(/\/photo\/(\d+)$/)
  return match ? Number(match[1]) - 1 : 0
}

// Pixiv artwork pages: /artworks/<id> (with optional language prefix like /en/)
export const isPixivArtworkPage = (url: string): boolean => {
  try {
    const u = new URL(url)
    return (
      (u.host === "www.pixiv.net" || u.host === "pixiv.net") &&
      /^(\/[a-z]{2})?\/artworks\/\d+$/.test(u.pathname)
    )
  } catch {
    return false
  }
}

export const upgradeTwitterImageUrl = (url: string): string => {
  const u = new URL(url)
  if (isTwitterMediaUrl(u)) {
    u.searchParams.set("name", "orig")
  }
  return u.toString()
}

export const sleep = async (second: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, 1000 * second))
}
