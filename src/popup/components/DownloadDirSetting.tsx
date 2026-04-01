import { useState, useEffect } from "react";
import {
  Button,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightElement,
} from "@chakra-ui/react";
import { FaFolderOpen } from "react-icons/fa";
import { setSyncData } from "../modules";
import { Settings } from "@/background";

export const DownloadDirSetting = () => {
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
      <InputRightElement width="4.5rem">
        <Button
          h="1.6rem"
          colorScheme="gray"
          size="xs"
          onClick={openFolder}
          leftIcon={<FaFolderOpen />}
        >
          Open
        </Button>
      </InputRightElement>
    </InputGroup>
  );
};
