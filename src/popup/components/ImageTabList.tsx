import { Box, Checkbox, Flex, Spinner, Text } from "@chakra-ui/react"
import { FiAlertTriangle } from "react-icons/fi"
import { getSourceKey, type DownloadStatus, type ImageSource } from "@/popup/chromeApi"

type Props = {
  sources: ImageSource[]
  selectedIds: Set<number>
  onToggle: (id: number) => void
  onToggleAll: () => void
  downloadStatuses: Map<string, DownloadStatus>
  isDownloading: boolean
}

export const ImageTabList = ({
  sources,
  selectedIds,
  onToggle,
  onToggleAll,
  downloadStatuses,
  isDownloading,
}: Props) => {
  if (sources.length === 0) return null

  const selectableIds = sources
    .map((source) => source.tab.id)
    .filter((id): id is number => id !== undefined)
  const selectedCount = selectableIds.filter((id) => selectedIds.has(id)).length
  const allSelected = selectableIds.length > 0 && selectedCount === selectableIds.length
  const someSelected = selectedCount > 0

  return (
    <Box mt={2} borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
      <Flex
        align="center"
        justify="space-between"
        px={2}
        py={1}
        borderBottomWidth="1px"
        borderColor="gray.200"
        bg="gray.50"
      >
        <Checkbox.Root
          size="sm"
          checked={someSelected && !allSelected ? "indeterminate" : allSelected}
          onCheckedChange={onToggleAll}
          disabled={isDownloading}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>
            <Text fontSize="xs">Select all</Text>
          </Checkbox.Label>
        </Checkbox.Root>
        <Text fontSize="xs" color="gray.500">
          {selectedCount} / {selectableIds.length} selected
        </Text>
      </Flex>

      <Box maxHeight="240px" overflowY="auto">
        {sources.map((source, index) => {
          const id = source.tab.id
          const isChecked = id !== undefined && selectedIds.has(id)
          const status = downloadStatuses.get(getSourceKey(source))
          const isFailed = status === "failed"
          const isDownloadingThis = status === "downloading"

          return (
            <Box
              key={`${id}-${index}`}
              display="flex"
              alignItems="center"
              gap={2}
              px={2}
              py={1}
              _notLast={{ borderBottomWidth: "1px", borderColor: "gray.100" }}
              bg={isFailed ? "red.50" : undefined}
            >
              <Checkbox.Root
                size="sm"
                checked={isChecked}
                disabled={id === undefined || isDownloading}
                onCheckedChange={() => id !== undefined && onToggle(id)}
                aria-label={`Toggle ${source.imageUrl}`}
                flexShrink={0}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
              </Checkbox.Root>
              <img
                src={source.imageUrl}
                alt=""
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "cover",
                  flexShrink: 0,
                  borderRadius: "4px",
                  background: "#eee",
                }}
              />
              <Box flex="1" minWidth={0} display="flex" flexDirection="column">
                <a
                  href={source.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={source.imageUrl}
                  style={{
                    fontSize: "12px",
                    color: isFailed ? "#E53E3E" : "#3182ce",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    display: "block",
                    minWidth: 0,
                  }}
                >
                  {source.imageUrl}
                </a>
                {isFailed && (
                  <Text
                    fontSize="11px"
                    color="red.500"
                    display="flex"
                    alignItems="center"
                    gap="4px"
                  >
                    <FiAlertTriangle size="10px" />
                    {chrome.i18n === undefined
                      ? "Download failed"
                      : chrome.i18n.getMessage("downloadFailed")}
                  </Text>
                )}
                {!isFailed && source.tab.url && source.tab.url !== source.imageUrl && (
                  <a
                    href={source.tab.url}
                    target="_blank"
                    rel="noreferrer"
                    title={source.tab.url}
                    style={{
                      fontSize: "11px",
                      color: "#718096",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      display: "block",
                      minWidth: 0,
                    }}
                  >
                    Open source page
                  </a>
                )}
              </Box>
              {isDownloadingThis && <Spinner size="sm" color="blue.500" flexShrink={0} />}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
