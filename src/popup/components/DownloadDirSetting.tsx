import { useState, useEffect } from "react"
import { Button, Input, InputGroup } from "@chakra-ui/react"
import { FaFolderOpen } from "react-icons/fa"
import { setSyncData } from "@/popup/chromeApi"
import { t } from "@/popup/i18n"
import { Settings } from "@/background"

export const DownloadDirSetting = () => {
  const [downloadDir, setDownloadDir] = useState("")

  useEffect(() => {
    if (chrome.storage === undefined) return
    chrome.storage.sync.get(["downloadDir"], (result: Settings) => {
      if (result.downloadDir) setDownloadDir(result.downloadDir)
    })
  }, [])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setDownloadDir(newValue)
    if (chrome.storage === undefined) return
    setSyncData("downloadDir", newValue)
  }

  const openFolder = () => {
    if (chrome.downloads === undefined) return
    chrome.downloads.showDefaultFolder()
  }

  const downloadLocation = t("chromesDownloadLocation", "Chrome's Download Location")

  const OpenButton = (
    <Button colorPalette="gray" size="xs" variant="outline" onClick={openFolder}>
      <FaFolderOpen />
      Open
    </Button>
  )

  return (
    <InputGroup startAddon={`${downloadLocation} /`} endElement={OpenButton}>
      <Input
        type="text"
        value={downloadDir}
        onChange={handleChange}
        placeholder={t("subdirectoryOptional", "Subdirectory (optional)")}
        size="sm"
        fontSize="sm"
      />
    </InputGroup>
  )
}
