import { useState, useEffect } from "react";
import { Button, Text, ChakraProvider, Divider, Box } from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import {
  getImageTabs,
  getFileName,
  downloadFile,
  getSyncData,
  sleep,
} from "./modules";
import { Settings } from "@/background";
import { CloseTabAfterDownload } from "./components/CloseTabAfterDownload";
import { DownloadDirSetting } from "./components/DownloadDirSetting";
import { ImageTabList } from "./components/ImageTabList";

const downloadImages = async (setIsClicked: (v: boolean) => void) => {
  if (chrome.storage === undefined) return;

  setIsClicked(true);

  try {
    const storage = await getSyncData<Settings>(["isCloseTabAfterDownload", "downloadDir"]);
    const doClose = storage.isCloseTabAfterDownload;
    const downloadDir = storage.downloadDir;

    const tabs = await getImageTabs();
    for (const tab of tabs) {
      if (!tab.url || tab.id === undefined) continue;
      const fileName = getFileName(tab.url);
      const isEmpty = downloadDir === null || downloadDir === "";
      const savePath = isEmpty ? fileName : `${downloadDir}/${fileName}`;
      try {
        const downloadId = await downloadFile(tab.url, savePath);
        console.log(`File download started. Download ID: ${downloadId}`);
        if (doClose) {
          // chrome.downloads.download resolves when the download starts, not completes.
          // Wait briefly so the browser registers the download before the tab is closed.
          await sleep(0.5);
          chrome.tabs.remove(tab.id, () =>
            console.log(`Tab closed: ${tab.url}`),
          );
        }
      } catch (error) {
        console.error(`Download failed: ${error} | savePath=${savePath}, URL=${tab.url}`);
      }
    }
  } finally {
    setIsClicked(false);
  }
};

const App = () => {
  const [imageTabs, setImageTabs] = useState<chrome.tabs.Tab[] | null>(null);
  const [isClicked, setIsClicked] = useState(false);

  useEffect(() => {
    getImageTabs().then(setImageTabs);
  }, []);

  return (
    <ChakraProvider>
      <div style={{ margin: "10px", width: "500px" }}>
        <Text fontSize="md">
          {imageTabs !== null ? `${imageTabs.length} image tabs found.` : ""}
        </Text>

        <ImageTabList tabs={imageTabs ?? []} />

        <Button
          style={{ marginTop: "10px", display: "block", margin: "10px auto 0" }}
          variant="outline"
          colorScheme="blue"
          aria-label="Download"
          size="lg"
          leftIcon={<DownloadIcon />}
          onClick={() => downloadImages(setIsClicked)}
          isLoading={isClicked}
          isDisabled={imageTabs === null || imageTabs.length === 0}
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
