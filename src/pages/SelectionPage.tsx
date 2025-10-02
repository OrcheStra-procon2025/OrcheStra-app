import logo from "@/assets/logo.png";
import { Flex, Box, Link, Button, Heading, Image } from "@chakra-ui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import { SelectTableMusicList } from "@/components/SelectTableMusicList";

const SelectionPage = () => {
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
        <SelectTableMusicList />
        <Link href="/play" about="_blank">
          <Button colorScheme="blue" marginTop="20px">
            <FontAwesomeIcon icon={faPlay} style={{ marginRight: "10px" }} />
            スタート！
          </Button>
        </Link>
      </Flex>
    </>
  );
};

export default SelectionPage;
