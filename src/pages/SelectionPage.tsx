import logo from "@/assets/logo.png";
import { Flex, Text, Box, Heading, Link, Button } from "@chakra-ui/react";
import SelectableMusicList from "@/components/SelectableMusicList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";

const SelectionPage = () => {
  return (
    <>
      <Flex
        width="100%"
        bg="gray.100"
        alignItems="center"
        gap="30px"
        marginBottom="20px"
      >
        <Box maxW="200px;">
          <img src={logo} alt="Logo" />
        </Box>
        <Heading as="h2" fontWeight="medium" size="xl">
          曲の選択
        </Heading>
      </Flex>
      <Box textAlign="start">
        <Heading as="h3" fontWeight="normal" size="lg" marginBottom="10px;">
          一覧から選ぶ
        </Heading>
        <SelectableMusicList />
      </Box>
      <Text textAlign="center" fontSize="xl">
        もしくは
      </Text>
      <Box textAlign="start" marginTop="20px">
        <Heading as="h3" fontWeight="normal" size="lg" marginBottom="10px;">
          ファイルをアップロードする
        </Heading>
      </Box>
      <Box bgColor="gray.200" p="20">
        <Text fontSize="2xl">ここにファイルをドラッグ＆ドロップ</Text>
        <Link fontSize="lg" color="blue.500">
          または - ファイルを選択する
        </Link>
      </Box>
      <Button colorScheme="blue" marginTop="20px">
        <FontAwesomeIcon icon={faPlay} style={{ marginRight: "10px" }} />
        スタート！
      </Button>
    </>
  );
};

export default SelectionPage;
