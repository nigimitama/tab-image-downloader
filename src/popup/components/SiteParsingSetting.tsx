import { useState, useEffect } from "react"
import { Switch, Text } from "@chakra-ui/react"
import { setSyncData } from "@/popup/chromeApi"
import { t } from "@/popup/i18n"
import { Settings } from "@/background"

export const SiteParsingSetting = ({
  onChange,
  isDisabled = false,
}: {
  onChange?: (enabled: boolean) => void
  isDisabled?: boolean
}) => {
  const [isChecked, setIsChecked] = useState(true)

  useEffect(() => {
    if (chrome.storage === undefined) return
    chrome.storage.sync.get(["isSiteParsingEnabled"], (result: Settings) => {
      setIsChecked(result.isSiteParsingEnabled ?? true)
    })
  }, [])

  const handleCheck = (details: { checked: boolean }) => {
    setIsChecked(details.checked)
    setSyncData("isSiteParsingEnabled", details.checked)
    onChange?.(details.checked)
  }

  return (
    <Switch.Root size="sm" checked={isChecked} disabled={isDisabled} onCheckedChange={handleCheck}>
      <Switch.HiddenInput />
      <Switch.Control />
      <Switch.Label>
        <Text fontSize="sm">
          {t("optionSiteParsingDesc", "optionSiteParsingDesc")}
        </Text>
      </Switch.Label>
    </Switch.Root>
  )
}
