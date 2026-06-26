import { SyncSwitch } from "./SyncSwitch"

export const CloseTabAfterDownload = () => (
  <SyncSwitch
    storageKey="isCloseTabAfterDownload"
    messageKey="optionTabCloseDesc"
    fallbackLabel="optionTabCloseDesc"
  />
)
