import { Box, Text } from "@chakra-ui/react"
import { CloseTabAfterDownload } from "./CloseTabAfterDownload"
import { DarkModeSwitch } from "./DarkModeSwitch"
import { DownloadDirSetting } from "./DownloadDirSetting"
import { SiteParsingSetting } from "./SiteParsingSetting"

export const SettingsSection = ({
  onSiteParsingChange,
  isLoading,
}: {
  onSiteParsingChange: (enabled: boolean) => void
  isLoading: boolean
}) => (
  <Box>
    <Text fontSize="md" color="gray.500" fontWeight="semibold" textTransform="uppercase">
      Settings
    </Text>
    <Box mt={1}>
      <SiteParsingSetting onChange={onSiteParsingChange} isDisabled={isLoading} />
    </Box>
    <Box mt={2}>
      <CloseTabAfterDownload />
    </Box>
    <Box mt={2}>
      <DarkModeSwitch />
    </Box>
    <Box mt={2}>
      <DownloadDirSetting />
    </Box>
  </Box>
)
