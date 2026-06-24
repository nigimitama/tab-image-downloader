import {
  ChakraProvider,
  Box,
  Icon,
  Text,
  Heading,
} from "@chakra-ui/react";
import { LuFolderCog } from "react-icons/lu";
import { MdTab } from "react-icons/md";
import { CloseTabAfterDownload } from "@/popup/components/CloseTabAfterDownload";
import { DownloadDirSetting } from "@/popup/components/DownloadDirSetting";

const Header = () => {
  return (
    <Box bg="blue.600" w="100%" p={2} color="white">
      <Heading fontSize="3xl" style={{ margin: "10px" }}>
        Option
      </Heading>
    </Box>
  );
};

const App = () => {
  return (
    <ChakraProvider>
      <Header />
      <div style={{ padding: "20px" }}>
        <Heading fontSize="2xl">
          <Icon as={MdTab} style={{ marginRight: "4px" }} />
          Tab Option
        </Heading>
        <div style={{ margin: "15px" }}>
          <CloseTabAfterDownload />
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        <Heading fontSize="2xl">
          <Icon as={LuFolderCog} style={{ marginRight: "4px" }} />
          Download Location
        </Heading>
        <div style={{ margin: "15px" }}>
          <Text fontSize="lg">
            {chrome.i18n === undefined
              ? "optionDownloadDirDesc"
              : chrome.i18n.getMessage("optionDownloadDirDesc")}
          </Text>

          <DownloadDirSetting />
        </div>
      </div>
    </ChakraProvider>
  );
};

export default App;
