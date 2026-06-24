import { Box } from "@chakra-ui/react";
import type { ImageSource } from "@/popup/chromeApi";

type Props = {
  sources: ImageSource[];
};

export const ImageTabList = ({ sources }: Props) => {
  if (sources.length === 0) return null;

  return (
    <Box
      mt={2}
      maxHeight="240px"
      overflowY="auto"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
    >
      {sources.map((source) => (
        <Box
          key={source.tab.id}
          display="flex"
          alignItems="center"
          gap={2}
          px={2}
          py={1}
          _notLast={{ borderBottomWidth: "1px", borderColor: "gray.100" }}
        >
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
      ))}
    </Box>
  );
};
