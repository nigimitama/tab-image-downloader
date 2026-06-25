import { Box, Checkbox, Flex, Text } from "@chakra-ui/react";
import type { ImageSource } from "@/popup/chromeApi";

type Props = {
  sources: ImageSource[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
};

export const ImageTabList = ({
  sources,
  selectedIds,
  onToggle,
  onToggleAll,
}: Props) => {
  if (sources.length === 0) return null;

  const selectableIds = sources
    .map((source) => source.tab.id)
    .filter((id): id is number => id !== undefined);
  const selectedCount = selectableIds.filter((id) => selectedIds.has(id)).length;
  const allSelected =
    selectableIds.length > 0 && selectedCount === selectableIds.length;
  const someSelected = selectedCount > 0;

  return (
    <Box
      mt={2}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      overflow="hidden"
    >
      <Flex
        align="center"
        justify="space-between"
        px={2}
        py={1}
        borderBottomWidth="1px"
        borderColor="gray.200"
        bg="gray.50"
      >
        <Checkbox
          size="sm"
          isChecked={allSelected}
          isIndeterminate={someSelected && !allSelected}
          onChange={onToggleAll}
        >
          <Text fontSize="xs">Select all</Text>
        </Checkbox>
        <Text fontSize="xs" color="gray.500">
          {selectedCount} / {selectableIds.length} selected
        </Text>
      </Flex>

      <Box maxHeight="240px" overflowY="auto">
        {sources.map((source) => {
          const id = source.tab.id;
          const isChecked = id !== undefined && selectedIds.has(id);
          return (
            <Box
              key={id}
              display="flex"
              alignItems="center"
              gap={2}
              px={2}
              py={1}
              _notLast={{ borderBottomWidth: "1px", borderColor: "gray.100" }}
            >
              <Checkbox
                size="sm"
                isChecked={isChecked}
                isDisabled={id === undefined}
                onChange={() => id !== undefined && onToggle(id)}
                aria-label={`Toggle ${source.imageUrl}`}
                flexShrink={0}
              />
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
              <a
                href={source.tab.url}
                target="_blank"
                rel="noreferrer"
                title={source.imageUrl}
                style={{
                  fontSize: "12px",
                  color: "#3182ce",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  display: "block",
                  minWidth: 0,
                }}
              >
                {source.imageUrl}
              </a>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
