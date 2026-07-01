import { FiSearch } from "react-icons/fi"
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
    icon={FiSearch}
    iconColor="blue.500"
    uncheckedIconColor="gray.400"
  />
)
