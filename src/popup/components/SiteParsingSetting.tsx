import { SyncSwitch } from "./SyncSwitch"

export const SiteParsingSetting = ({
  onChange,
  isDisabled = false,
}: {
  onChange?: (enabled: boolean) => void
  isDisabled?: boolean
}) => (
  <SyncSwitch
    storageKey="isSiteParsingEnabled"
    messageKey="optionSiteParsingDesc"
    fallbackLabel="optionSiteParsingDesc"
    defaultValue={true}
    onChange={onChange}
    disabled={isDisabled}
  />
)
