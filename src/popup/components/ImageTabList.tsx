import { Box } from "@chakra-ui/react";

type Props = {
  tabs: chrome.tabs.Tab[];
};

export const ImageTabList = ({ tabs }: Props) => {
  if (tabs.length === 0) return null;

  return (
    <Box
      mt={2}
      maxHeight="240px"
      overflowY="auto"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
    >
      {tabs.map((tab) => (
        <Box
          key={tab.id}
          display="flex"
          alignItems="center"
          gap={2}
          px={2}
          py={1}
          _notLast={{ borderBottomWidth: "1px", borderColor: "gray.100" }}
        >
          <img
            src={tab.url}
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
            href={tab.url}
            target="_blank"
            rel="noreferrer"
            title={tab.url}
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
            {tab.url}
          </a>
        </Box>
      ))}
    </Box>
  );
};
