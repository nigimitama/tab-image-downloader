import { useState, useEffect } from "react"
import { Switch, Text } from "@chakra-ui/react"
import { setSyncData } from "@/popup/chromeApi"
import { t } from "@/popup/i18n"
import { Settings } from "@/background"

export const SyncSwitch = ({
  storageKey,
  messageKey,
  fallbackLabel,
  defaultValue = false,
  onChange,
  disabled = false,
}: {
  storageKey: keyof Settings
  messageKey: string
  fallbackLabel: string
  defaultValue?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
}) => {
  const [isChecked, setIsChecked] = useState(defaultValue)

  useEffect(() => {
    if (chrome.storage === undefined) return
    chrome.storage.sync.get([storageKey], (result: Settings) => {
      setIsChecked((result[storageKey] as boolean) ?? defaultValue)
    })
  }, [])

  const handleCheck = (details: { checked: boolean }) => {
    setIsChecked(details.checked)
    setSyncData(storageKey, details.checked)
    onChange?.(details.checked)
  }

  return (
    <Switch.Root size="sm" checked={isChecked} disabled={disabled} onCheckedChange={handleCheck}>
      <Switch.HiddenInput />
      <Switch.Control />
      <Switch.Label>
        <Text fontSize="sm">{t(messageKey, fallbackLabel)}</Text>
      </Switch.Label>
    </Switch.Root>
  )
}
