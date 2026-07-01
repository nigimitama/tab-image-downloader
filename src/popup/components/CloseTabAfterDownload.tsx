import { FiX } from "react-icons/fi"
import { SyncSwitch } from "./SyncSwitch"

export const CloseTabAfterDownload = () => (
  <SyncSwitch
    storageKey="isCloseTabAfterDownload"
    messageKey="optionTabCloseDesc"
    fallbackLabel="optionTabCloseDesc"
    icon={FiX}
    iconColor="red.500"
    uncheckedIconColor="gray.400"
  />
)
