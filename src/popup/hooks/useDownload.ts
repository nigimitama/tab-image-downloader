import { useState, useEffect } from "react"
import { getFileName } from "@/popup/imageUrl"
import {
  downloadFile,
  waitForDownloadComplete,
  getSyncData,
  getSourceKey,
  type ImageSource,
  type DownloadStatus,
} from "@/popup/chromeApi"
import { Settings } from "@/background"

export const useDownload = () => {
  const [isClicked, setIsClicked] = useState(false)
  const [downloadStatuses, setDownloadStatuses] = useState<Map<string, DownloadStatus>>(new Map())

  const isDownloading = Array.from(downloadStatuses.values()).some((s) => s === "downloading")

  useEffect(() => {
    if (!isDownloading) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDownloading])

  const updateStatus = (key: string, status: DownloadStatus) => {
    setDownloadStatuses((prev) => {
      const next = new Map(prev)
      next.set(key, status)
      return next
    })
  }

  const startDownload = async (sources: ImageSource[]) => {
    if (chrome.storage === undefined) return

    setIsClicked(true)

    try {
      const storage = await getSyncData<Settings>(["isCloseTabAfterDownload", "downloadDir"])
      const doClose = storage.isCloseTabAfterDownload
      const downloadDir = storage.downloadDir

      const tabDownloadCounts = new Map<number, { total: number; succeeded: number }>()
      for (const source of sources) {
        const tabId = source.tab.id
        if (tabId === undefined) continue
        const entry = tabDownloadCounts.get(tabId) ?? { total: 0, succeeded: 0 }
        entry.total++
        tabDownloadCounts.set(tabId, entry)
      }

      for (const source of sources) {
        const tabId = source.tab.id
        if (tabId === undefined) continue
        const key = getSourceKey(source)
        const fileName = getFileName(source.imageUrl)
        const isEmpty = downloadDir === null || downloadDir === ""
        const savePath = isEmpty ? fileName : `${downloadDir}/${fileName}`

        updateStatus(key, "downloading")

        try {
          const downloadId = await downloadFile(source.imageUrl, savePath)
          console.log(`File download started. Download ID: ${downloadId}`)
          await waitForDownloadComplete(downloadId)
          tabDownloadCounts.get(tabId)!.succeeded++
          updateStatus(key, "completed")
        } catch (error) {
          console.error(`Download failed: ${error} | savePath=${savePath}, URL=${source.imageUrl}`)
          updateStatus(key, "failed")
        }
      }

      if (doClose) {
        for (const [tabId, counts] of tabDownloadCounts) {
          if (counts.succeeded === counts.total) {
            chrome.tabs.remove(tabId, () => console.log(`Tab closed: ${tabId}`))
          }
        }
      }
    } finally {
      setIsClicked(false)
    }
  }

  return { isClicked, isDownloading, downloadStatuses, startDownload }
}
