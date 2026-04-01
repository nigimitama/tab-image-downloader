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
import { CloseTabAfterDownload } from "./components/CloseTabAfterDownload";
import { DownloadDirSetting } from "./components/DownloadDirSetting";
import { ImageTabList } from "./components/ImageTabList";

const downloadImages = async (setIsClicked: (v: boolean) => void) => {
  if (chrome.storage === undefined) return;

  setIsClicked(true);

  const storage = await getSyncData(["isCloseTabAfterDownload", "downloadDir"]);
  const doClose = storage.isCloseTabAfterDownload;
  const downloadDir = storage.downloadDir;

  const tabs = await getImageTabs();
  for (const tab of tabs) {
    if (!tab.url) continue;
    const fileName = getFileName(tab.url);
    const isEmpty = downloadDir === null || downloadDir === "";
    const savePath = isEmpty ? fileName : `${downloadDir}/${fileName}`;
    try {
      const downloading = downloadFile(tab.url, savePath);
      downloading.then(
        async (downloadId) => {
          console.log(`File download started. Download ID: ${downloadId}`);
          await sleep(0.5);
          if (doClose) {
            chrome.tabs.remove(tab.id!, () =>
              console.log(`Tab closed: ${tab.url}`),
            );
          }
        },
        (error) => {
          console.log(`Download failed: ${error}`);
        },
      );
    } catch (error) {
      console.error(`Error ${error} | savePath=${savePath}, URL=${tab.url}`);
      throw error;
    }
  }

  setIsClicked(false);
};

const App = () => {
  const [imageTabs, setImageTabs] = useState<chrome.tabs.Tab[]>([]);
  const [numImages, setNumImages] = useState<number | undefined>();
  const [isClicked, setIsClicked] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const tabs = await getImageTabs();
      setImageTabs(tabs);
      setNumImages(tabs.length);
    };
    fetch();
  }, []);

  return (
    <ChakraProvider>
      <div style={{ margin: "10px", width: "500px" }}>
        <Text fontSize="md">
          {numImages !== undefined ? `${numImages} image tabs found.` : ""}
        </Text>

        <ImageTabList tabs={imageTabs} />

        <Button
          style={{ marginTop: "10px", display: "block", margin: "10px auto 0" }}
          variant="outline"
          colorScheme="blue"
          aria-label="Download"
          size="lg"
          leftIcon={<DownloadIcon />}
          onClick={() => downloadImages(setIsClicked)}
          isLoading={isClicked}
          isDisabled={numImages === 0}
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
