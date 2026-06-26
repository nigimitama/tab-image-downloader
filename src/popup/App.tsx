import { useState, useEffect } from "react"
import {
  Button,
  Text,
  ChakraProvider,
  Separator,
  Box,
  Spinner,
  Flex,
  defaultSystem,
} from "@chakra-ui/react"
import { FiDownload } from "react-icons/fi"
import { getFileName } from "./imageUrl"
import {
  getImageSources,
  downloadFile,
  waitForDownloadComplete,
  getSyncData,
  getSourceKey,
  type ImageSource,
  type DownloadStatus,
} from "./chromeApi"
import { Settings } from "@/background"
import { CloseTabAfterDownload } from "./components/CloseTabAfterDownload"
import { DownloadDirSetting } from "./components/DownloadDirSetting"
import { SiteParsingSetting } from "./components/SiteParsingSetting"
import { ImageTabList } from "./components/ImageTabList"

const downloadImages = async (
  sources: ImageSource[],
  setIsClicked: (v: boolean) => void,
  updateStatus: (key: string, status: DownloadStatus) => void,
) => {
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

const App = () => {
  const [imageSources, setImageSources] = useState<ImageSource[] | null>(null)
  const [isClicked, setIsClicked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
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

  const loadImages = async (isSiteParsingEnabled: boolean) => {
    setIsLoading(true)
    try {
      const sources = await getImageSources({ isSiteParsingEnabled })
      setImageSources(sources)
      setSelectedIds(
        new Set(
          sources.map((source) => source.tab.id).filter((id): id is number => id !== undefined),
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      let isSiteParsingEnabled = true
      try {
        const settings = await getSyncData<Settings>(["isSiteParsingEnabled"])
        isSiteParsingEnabled = settings.isSiteParsingEnabled ?? true
      } catch {
        /* use default */
      }
      await loadImages(isSiteParsingEnabled)
    }
    load()
  }, [])

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    const ids = (imageSources ?? [])
      .map((source) => source.tab.id)
      .filter((id): id is number => id !== undefined)
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id))
      return allSelected ? new Set() : new Set(ids)
    })
  }

  const selectedSources = (imageSources ?? []).filter(
    (source) => source.tab.id !== undefined && selectedIds.has(source.tab.id),
  )

  const updateStatus = (key: string, status: DownloadStatus) => {
    setDownloadStatuses((prev) => {
      const next = new Map(prev)
      next.set(key, status)
      return next
    })
  }

  const visibleSources = (imageSources ?? []).filter(
    (source) => downloadStatuses.get(getSourceKey(source)) !== "completed",
  )

  return (
    <ChakraProvider value={defaultSystem}>
      <div style={{ margin: "10px", width: "500px" }}>
        {isLoading ? (
          <Flex align="center" gap={2}>
            <Spinner size="sm" color="blue.500" />
            <Text fontSize="md">Checking tabs...</Text>
          </Flex>
        ) : (
          <Text fontSize="md">
            {imageSources !== null
              ? chrome.i18n === undefined
                ? `${imageSources.length} image tabs found.`
                : chrome.i18n.getMessage("imageTabsFound", [String(imageSources.length)])
              : ""}
          </Text>
        )}

        <ImageTabList
          sources={visibleSources}
          selectedIds={selectedIds}
          onToggle={toggleSelected}
          onToggleAll={toggleAll}
          downloadStatuses={downloadStatuses}
          isDownloading={isDownloading}
        />

        <Button
          style={{ marginTop: "10px", display: "block", margin: "10px auto 0" }}
          variant="outline"
          colorPalette="blue"
          aria-label="Download"
          size="lg"
          onClick={() => downloadImages(selectedSources, setIsClicked, updateStatus)}
          loading={isClicked}
          disabled={selectedSources.length === 0 || isDownloading}
        >
          <FiDownload />
          Download Images
        </Button>

        <Separator my={3} />

        <Box>
          <Text
            fontSize="xs"
            color="gray.500"
            mb={2}
            fontWeight="semibold"
            textTransform="uppercase"
          >
            Settings
          </Text>
          <SiteParsingSetting onChange={(enabled) => loadImages(enabled)} isDisabled={isLoading} />
          <Box mt={1}>
            <CloseTabAfterDownload />
          </Box>
          <Box mt={2}>
            <DownloadDirSetting />
          </Box>
        </Box>
      </div>
    </ChakraProvider>
  )
}

export default App
