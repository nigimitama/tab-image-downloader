import { useState } from "react";
import { Checkbox, Text } from "@chakra-ui/react";
import { setSyncData } from "../modules";
import { Settings } from "@/background";

export const CloseTabAfterDownload = () => {
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
