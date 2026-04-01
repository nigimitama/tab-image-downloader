import { useState, useEffect } from "react";
import {
  Button,
  Checkbox,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightElement,
} from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import { Text, ChakraProvider, Divider, Box } from "@chakra-ui/react";
import {
  getImageTabs,
  getFileName,
  downloadFile,
  getSyncData,
  setSyncData,
  sleep,
} from "./modules";
import { Settings } from "@/background";

const CloseTabAfterDownload = () => {
  const [isChecked, setIsChecked] = useState<boolean | null>(null);

  const handleCheck = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(event.target.checked);
    setSyncData("isCloseTabAfterDownload", event.target.checked);
  };

  if (chrome.storage !== undefined && isChecked === null) {
    chrome.storage.sync.get(["isCloseTabAfterDownload"], (result: Settings) => {
      setIsChecked(result.isCloseTabAfterDownload);
    });
  }

  return (
    <Checkbox size="sm" isChecked={isChecked || false} onChange={handleCheck}>
      <Text fontSize="sm">
        {chrome.i18n === undefined
          ? "optionTabCloseDesc"
          : chrome.i18n.getMessage("optionTabCloseDesc")}
      </Text>
    </Checkbox>
  );
};

const DownloadDirSetting = () => {
  const [downloadDir, setDownloadDir] = useState("");

  useEffect(() => {
    if (chrome.storage === undefined) return;
    chrome.storage.sync.get(["downloadDir"], (result: Settings) => {
      if (result.downloadDir) setDownloadDir(result.downloadDir);
    });
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setDownloadDir(newValue);
    if (chrome.storage === undefined) return;
    setSyncData("downloadDir", newValue);
  };

  const openFolder = () => {
    if (chrome.downloads === undefined) return;
    chrome.downloads.showDefaultFolder();
  };

  return (
    <InputGroup size="sm">
      <InputLeftAddon fontSize="xs">Downloads/</InputLeftAddon>
      <Input
        type="text"
        pr="4rem"
        value={downloadDir}
        onChange={handleChange}
        placeholder="Subdirectory"
        fontSize="sm"
      />
      <InputRightElement width="4rem">
        <Button h="1.4rem" colorScheme="gray" size="xs" onClick={openFolder}>
          Open
        </Button>
      </InputRightElement>
    </InputGroup>
  );
};

const App = () => {
  const [numImages, setNumImages] = useState<number | undefined>();
  const [isClicked, setIsClicked] = useState(false);

  const downloadImages = async (setIsClicked: (v: boolean) => void) => {
    if (chrome.storage === undefined) return null;

    setIsClicked(true);

    const storage = await getSyncData([
      "isCloseTabAfterDownload",
      "downloadDir",
    ]);
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

  useEffect(() => {
    const fetch = async () => {
      const tabs = await getImageTabs();
      setNumImages(tabs.length);
    };
    fetch();
  }, []);

  return (
    <ChakraProvider>
      <div style={{ margin: "10px", width: "400px" }}>
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
