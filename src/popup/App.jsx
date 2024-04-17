import { useState, useEffect } from "react";
import { Button } from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import { Text, ChakraProvider } from "@chakra-ui/react";
import { getImageTabs, getFileName, downloadFile, getSyncData } from "./modules";

const App = () => {
  const [numImages, setNumImages] = useState();
  const [isClicked, setIsClicked] = useState(false);

  const downloadImages = async (setIsClicked) => {
    if (chrome.storage === undefined) return null;

    setIsClicked(true);

    const storage = await getSyncData(["isCloseTabAfterDownload", "downloadDir"]);
    const doClose = storage.isCloseTabAfterDownload;
    const downloadDir = storage.downloadDir;
    console.log(`doClose=${doClose} downloadDir=${downloadDir}`);

    const tabs = await getImageTabs();
    for (const tab of tabs) {
      const fileName = getFileName(tab.url);
      const isEmpty = downloadDir === null || downloadDir === "";
      const savePath = isEmpty ? fileName : `${downloadDir}/${fileName}`;
      try {
        downloadFile(tab.url, savePath);
        if (doClose) {
          chrome.tabs.remove(tab.id, () => console.log(`Tab closed: ${tab.url}`));
        }
      } catch (error) {
        console.error(`Error ${error} | savePath=${savePath}, URL=${tab.url}`);
        throw error;
      }
    }

    setIsClicked(false);
  };

  useEffect(() => {
    const fetch = async () => {
      const tabs = await getImageTabs();
      setNumImages(tabs.length);
    };
    fetch();
  }, []);

  return (
    <ChakraProvider>
      <div style={{ margin: "10px" }}>
        <Text fontSize="md">
          {numImages !== undefined ? `${numImages} image tabs found.` : ""}
        </Text>
        <Button
          style={{ marginTop: "10px" }}
          variant="outline"
          colorScheme="blue"
          aria-label="Download"
          size="lg"
          leftIcon={<DownloadIcon />}
          onClick={async () => {
            await downloadImages(setIsClicked);
          }}
          isLoading={isClicked}
          isDisabled={numImages === 0}
        >
          Download Images
        </Button>
      </div>
    </ChakraProvider>
  );
};

export default App;
