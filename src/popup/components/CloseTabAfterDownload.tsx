import { useState, useEffect } from "react";
import { Switch, Text } from "@chakra-ui/react";
import { setSyncData } from "@/popup/chromeApi";
import { Settings } from "@/background";

export const CloseTabAfterDownload = () => {
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    if (chrome.storage === undefined) return;
    chrome.storage.sync.get(["isCloseTabAfterDownload"], (result: Settings) => {
      setIsChecked(result.isCloseTabAfterDownload);
    });
  }, []);

  const handleCheck = (details: { checked: boolean }) => {
    setIsChecked(details.checked);
    setSyncData("isCloseTabAfterDownload", details.checked);
  };

  return (
    <Switch.Root size="sm" checked={isChecked} onCheckedChange={handleCheck}>
      <Switch.HiddenInput />
      <Switch.Control />
      <Switch.Label>
        <Text fontSize="sm">
          {chrome.i18n === undefined
            ? "optionTabCloseDesc"
            : chrome.i18n.getMessage("optionTabCloseDesc")}
        </Text>
      </Switch.Label>
    </Switch.Root>
  );
};
