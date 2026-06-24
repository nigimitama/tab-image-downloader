import { useState, useEffect } from "react";
import { Button, Text, ChakraProvider, Divider, Box } from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import { getFileName, sleep } from "./imageUrl";
import { getImageSources, downloadFile, getSyncData, type ImageSource } from "./chromeApi";
import { Settings } from "@/background";
import { CloseTabAfterDownload } from "./components/CloseTabAfterDownload";
import { DownloadDirSetting } from "./components/DownloadDirSetting";
import { ImageTabList } from "./components/ImageTabList";

const downloadImages = async (
  sources: ImageSource[],
  setIsClicked: (v: boolean) => void,
) => {
  if (chrome.storage === undefined) return;

  setIsClicked(true);

  try {
    const storage = await getSyncData<Settings>(["isCloseTabAfterDownload", "downloadDir"]);
    const doClose = storage.isCloseTabAfterDownload;
    const downloadDir = storage.downloadDir;

    for (const source of sources) {
      const tabId = source.tab.id;
      if (tabId === undefined) continue;
      const fileName = getFileName(source.imageUrl);
      const isEmpty = downloadDir === null || downloadDir === "";
      const savePath = isEmpty ? fileName : `${downloadDir}/${fileName}`;
      try {
        const downloadId = await downloadFile(source.imageUrl, savePath);
        console.log(`File download started. Download ID: ${downloadId}`);
        if (doClose) {
          // chrome.downloads.download resolves when the download starts, not completes.
          // Wait briefly so the browser registers the download before the tab is closed.
          await sleep(0.5);
          chrome.tabs.remove(tabId, () =>
            console.log(`Tab closed: ${source.tab.url}`),
          );
        }
      } catch (error) {
        console.error(`Download failed: ${error} | savePath=${savePath}, URL=${source.imageUrl}`);
      }
    }
  } finally {
    setIsClicked(false);
  }
};

const App = () => {
  const [imageSources, setImageSources] = useState<ImageSource[] | null>(null);
  const [isClicked, setIsClicked] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    getImageSources().then((sources) => {
      setImageSources(sources);
      // Select every found image by default; the user can uncheck the ones to skip.
      setSelectedIds(
        new Set(
          sources
            .map((source) => source.tab.id)
            .filter((id): id is number => id !== undefined),
        ),
      );
    });
  }, []);

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    const ids = (imageSources ?? [])
      .map((source) => source.tab.id)
      .filter((id): id is number => id !== undefined);
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  };

  const selectedSources = (imageSources ?? []).filter(
    (source) => source.tab.id !== undefined && selectedIds.has(source.tab.id),
  );

  return (
    <ChakraProvider>
      <div style={{ margin: "10px", width: "500px" }}>
        <Text fontSize="md">
          {imageSources !== null ? `${imageSources.length} image tabs found.` : ""}
        </Text>

        <ImageTabList
          sources={imageSources ?? []}
          selectedIds={selectedIds}
          onToggle={toggleSelected}
          onToggleAll={toggleAll}
        />

        <Button
          style={{ marginTop: "10px", display: "block", margin: "10px auto 0" }}
          variant="outline"
          colorScheme="blue"
          aria-label="Download"
          size="lg"
          leftIcon={<DownloadIcon />}
          onClick={() => downloadImages(selectedSources, setIsClicked)}
          isLoading={isClicked}
          isDisabled={selectedSources.length === 0}
        >
          Download Images
        </Button>

        <Divider my={3} />

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
          <CloseTabAfterDownload />
          <Box mt={2}>
            <DownloadDirSetting />
          </Box>
        </Box>
      </div>
    </ChakraProvider>
  );
};

export default App;
