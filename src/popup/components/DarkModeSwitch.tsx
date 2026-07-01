import { useState, useEffect } from "react"
import { Switch, Icon, Text } from "@chakra-ui/react"
import { FaSun, FaMoon } from "react-icons/fa"
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
    <Switch.Root size="md" checked={isChecked} onCheckedChange={handleCheck}>
      <Switch.HiddenInput />
      <Switch.Control>
        <Switch.Thumb />
        <Switch.Indicator fallback={<Icon as={FaSun} color="gray.400" />}>
          <Icon as={FaMoon} color="yellow.400" />
        </Switch.Indicator>
      </Switch.Control>
      <Switch.Label>
        <Text fontSize="sm">{t("optionDarkModeDesc", "Dark mode")}</Text>
      </Switch.Label>
    </Switch.Root>
  )
}
