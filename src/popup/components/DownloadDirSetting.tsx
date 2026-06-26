import { useState, useEffect } from "react";
import { Button, Group, Input, InputAddon } from "@chakra-ui/react";
import { FaFolderOpen } from "react-icons/fa";
import { setSyncData } from "@/popup/chromeApi";
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
    <Group attached>
      <InputAddon fontSize="xs">
        {chrome.i18n === undefined
          ? "Chrome's Download Location"
          : chrome.i18n.getMessage("chromesDownloadLocation")} /
      </InputAddon>
      <Input
        type="text"
        value={downloadDir}
        onChange={handleChange}
        placeholder={chrome.i18n === undefined
          ? "Subdirectory (optional)"
          : chrome.i18n.getMessage("subdirectoryOptional")}
        fontSize="sm"
      />
      <Button
        colorPalette="gray"
        size="sm"
        variant="outline"
        onClick={openFolder}
      >
        <FaFolderOpen />
        Open
      </Button>
    </Group>
  );
};
