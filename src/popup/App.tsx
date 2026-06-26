import { useState, useEffect } from "react"
import { Button, Text, Separator, Spinner, Flex, Center } from "@chakra-ui/react"
import { FiDownload } from "react-icons/fi"
import { t } from "./i18n"
import { getImageSources, getSyncData, getSourceKey, type ImageSource } from "./chromeApi"
import { Settings } from "@/background"
import { ImageTabList } from "./components/ImageTabList"
import { SettingsSection } from "./components/SettingsSection"
import { useSelection } from "./hooks/useSelection"
import { useDownload } from "./hooks/useDownload"

const App = () => {
  const [imageSources, setImageSources] = useState<ImageSource[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { selectedIds, selectAll, toggleSelected, toggleAll, selectedSources } =
    useSelection(imageSources)
  const { isClicked, isDownloading, downloadStatuses, startDownload } = useDownload()

  const loadImages = async (isSiteParsingEnabled: boolean) => {
    setIsLoading(true)
    try {
      const sources = await getImageSources({ isSiteParsingEnabled })
      setImageSources(sources)
      selectAll(sources)
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

  const visibleSources = (imageSources ?? []).filter(
    (source) => downloadStatuses.get(getSourceKey(source)) !== "completed",
  )

  return (
    <div style={{ margin: "10px", width: "600px" }}>
      {isLoading ? (
        <Flex align="center" gap={2}>
          <Spinner size="sm" color="blue.500" />
          <Text fontSize="md">Checking tabs...</Text>
        </Flex>
      ) : (
        <Text fontSize="md">
          {imageSources !== null
            ? t("imageTabsFound", `${imageSources.length} image tabs found.`, [
                String(imageSources.length),
              ])
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

      <Center>
        <Button
          style={{ marginTop: "10px" }}
          variant="outline"
          colorPalette="blue"
          aria-label="Download"
          size="lg"
          onClick={() => startDownload(selectedSources)}
          loading={isClicked}
          disabled={selectedSources.length === 0 || isDownloading}
        >
          <FiDownload />
          Download Images
        </Button>
      </Center>

      <Separator my={3} />

      <SettingsSection
        onSiteParsingChange={(enabled) => loadImages(enabled)}
        isLoading={isLoading}
      />
    </div>
  )
}

export default App
