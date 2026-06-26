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

  const handleCheck = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(event.target.checked);
    setSyncData("isCloseTabAfterDownload", event.target.checked);
  };

  return (
    <Switch size="sm" isChecked={isChecked} onChange={handleCheck}>
      <Text fontSize="sm">
        {chrome.i18n === undefined
          ? "optionTabCloseDesc"
          : chrome.i18n.getMessage("optionTabCloseDesc")}
      </Text>
    </Switch>
  );
};
