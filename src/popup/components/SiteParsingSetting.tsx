import { useState, useEffect } from "react";
import { Checkbox, Text } from "@chakra-ui/react";
import { setSyncData } from "@/popup/chromeApi";
import { Settings } from "@/background";

export const SiteParsingSetting = ({
  onChange,
}: {
  onChange?: (enabled: boolean) => void;
}) => {
  const [isChecked, setIsChecked] = useState(true);

  useEffect(() => {
    if (chrome.storage === undefined) return;
    chrome.storage.sync.get(["isSiteParsingEnabled"], (result: Settings) => {
      setIsChecked(result.isSiteParsingEnabled ?? true);
    });
  }, []);

  const handleCheck = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(event.target.checked);
    setSyncData("isSiteParsingEnabled", event.target.checked);
    onChange?.(event.target.checked);
  };

  return (
    <Checkbox size="sm" isChecked={isChecked} onChange={handleCheck}>
      <Text fontSize="sm">
        {chrome.i18n === undefined
          ? "optionSiteParsingDesc"
          : chrome.i18n.getMessage("optionSiteParsingDesc")}
      </Text>
    </Checkbox>
  );
};
