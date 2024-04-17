import { useState } from "react";
import { ChakraProvider, Checkbox, Button, Box, Icon, Text, Heading } from "@chakra-ui/react";
import { LuFolderCog } from "react-icons/lu";
import { MdTab } from "react-icons/md";
import { Input, InputLeftAddon, InputRightElement, InputGroup } from "@chakra-ui/react";
import { setSyncData } from "./modules";

const Header = () => {
  return (
    <Box bg="blue.600" w="100%" p={2} color="white">
      <Heading fontSize="3xl" style={{ margin: "10px" }}>
        Option
      </Heading>
    </Box>
  );
};

const CloseTabAfterDownload = () => {
  const [isChecked, setIsChecked] = useState(null);

  const handleCheck = (event) => {
    console.log(`set(${event.target.checked})`);
    setIsChecked(event.target.checked);
    setSyncData("isCloseTabAfterDownload", event.target.checked);
  };

  // init isChecked
  if (chrome.storage !== undefined && isChecked === null) {
    chrome.storage.sync.get(["isCloseTabAfterDownload"], (result) => {
      setIsChecked(result.isCloseTabAfterDownload);
    });
  }

  return (
    <Checkbox isChecked={isChecked} onChange={(event) => handleCheck(event)}>
      {chrome.i18n === undefined ? "optionTabCloseDesc" : chrome.i18n.getMessage("optionTabCloseDesc")}
    </Checkbox>
  );
};

const DownloadDirSetting = () => {
  /*
    showDirectoryPicker() などを使ってもパスは取得できなかったので、
    ディレクトリのパスを指定してもらうのではなく、
    Chromeに設定している保存先の下にディレクトリを作りたい人向けの機能とする
  */
  const [downloadDir, setDownloadDir] = useState("");
  const saveValue = () => {
    const input = document.getElementById("subdirectoryInput");

    if (chrome.storage === undefined) return null;
    setSyncData("downloadDir", input.value);
    setDownloadDir(input.value);
  };

  // init isDefault
  if (chrome.storage !== undefined && downloadDir === "") {
    chrome.storage.sync.get(["downloadDir"], (result) => {
      setDownloadDir(result.downloadDir);
    });
  }

  return (
    <InputGroup size="md" style={{ width: "50em", marginTop: "1em" }}>
      <InputLeftAddon>Downloads/</InputLeftAddon>
      <Input id="subdirectoryInput" type="text" pr="5rem" defaultValue={downloadDir} placeholder="Subdirectory Name" />
      <InputRightElement width="5rem">
        <Button h="1.75rem" colorScheme="blue" aria-label="DownloadPath" size="sm" onClick={saveValue}>
          Save
        </Button>
      </InputRightElement>
    </InputGroup>
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
            {chrome.i18n === undefined ? "optionDownloadDirDesc" : chrome.i18n.getMessage("optionDownloadDirDesc")}
          </Text>

          <DownloadDirSetting />
        </div>
      </div>
    </ChakraProvider>
  );
};

export default App;
