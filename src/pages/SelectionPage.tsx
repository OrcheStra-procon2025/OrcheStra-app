import logo from "@/assets/logo.png";
import { useState } from "react";
import { Flex, Box, Link, Button, Heading, Image } from "@chakra-ui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import { SelectTableMusicList } from "@/components/SelectTableMusicList";

const SelectionPage = () => {
  const [selectedPath, setSelectedPath] = useState<string>("");

  // ★ SelectTableMusicListから呼び出される、パスを更新する関数
  const handleSelectMusic = (path: string) => {
    setSelectedPath(path);
  };

  const isStartButtonDisabled = !selectedPath;
  return (
    <>
      <Flex direction="column" align="center" width="100%" padding="6">
        <Flex
          width="100%"
          alignItems="center"
          justifyContent="center"
          gap="30px"
          marginBottom="20px"
        >
          <Box maxW="200px;">
            <Image src={logo} alt="Logo" />
          </Box>
        </Flex>
        <Heading as="h3" fontWeight="normal" size="lg" marginBottom="10px;">
          一覧から選ぶ
        </Heading>
        <SelectTableMusicList
          onSelect={handleSelectMusic}
          currentSelectedPath={selectedPath}
        />
        <Link href="/play" about="_blank">
          <Button
            colorScheme="blue"
            marginTop="20px"
            isDisabled={isStartButtonDisabled}
          >
            <FontAwesomeIcon icon={faPlay} style={{ marginRight: "10px" }} />
            スタート！
          </Button>
        </Link>
      </Flex>
    </>
  );
};

export default SelectionPage;
