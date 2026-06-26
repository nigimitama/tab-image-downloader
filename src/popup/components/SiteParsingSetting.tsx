import { useState, useEffect } from "react";
import { Switch, Text } from "@chakra-ui/react";
import { setSyncData } from "@/popup/chromeApi";
import { Settings } from "@/background";

export const SiteParsingSetting = ({
  onChange,
  isDisabled = false,
}: {
  onChange?: (enabled: boolean) => void;
  isDisabled?: boolean;
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
    <Switch size="sm" isChecked={isChecked} isDisabled={isDisabled} onChange={handleCheck}>
      <Text fontSize="sm">
        {chrome.i18n === undefined
          ? "optionSiteParsingDesc"
          : chrome.i18n.getMessage("optionSiteParsingDesc")}
      </Text>
    </Switch>
  );
};
