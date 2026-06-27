import { useState, useEffect } from "react"
import { Switch, Text } from "@chakra-ui/react"
import { setSyncData } from "@/popup/chromeApi"
import { t } from "@/popup/i18n"

export const DarkModeSwitch = () => {
  const [isChecked, setIsChecked] = useState(() => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  useEffect(() => {
    if (chrome.storage === undefined) return
    chrome.storage.sync.get(["isDarkMode"], (result) => {
      const pref = result.isDarkMode as boolean | null | undefined
      if (pref != null) {
        setIsChecked(pref)
      }
    })
  }, [])

  const handleCheck = (details: { checked: boolean }) => {
    setIsChecked(details.checked)
    setSyncData("isDarkMode", details.checked)
  }

  return (
    <Switch.Root size="sm" checked={isChecked} onCheckedChange={handleCheck}>
      <Switch.HiddenInput />
      <Switch.Control />
      <Switch.Label>
        <Text fontSize="sm">{t("optionDarkModeDesc", "Dark mode")}</Text>
      </Switch.Label>
    </Switch.Root>
  )
}
