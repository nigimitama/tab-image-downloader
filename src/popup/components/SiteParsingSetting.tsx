import { useState, useEffect } from "react";
import { FormControl, FormLabel, Switch } from "@chakra-ui/react";
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
    <FormControl display="flex" alignItems="center" gap={2}>
      <Switch size="sm" isChecked={isChecked} isDisabled={isDisabled} onChange={handleCheck} />
      <FormLabel mb={0} fontSize="sm" fontWeight="normal">
        {chrome.i18n === undefined
          ? "optionSiteParsingDesc"
          : chrome.i18n.getMessage("optionSiteParsingDesc")}
      </FormLabel>
    </FormControl>
  );
};
