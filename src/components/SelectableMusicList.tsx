import { Flex, Text, Box } from "@chakra-ui/react";
import { selectableMusic } from "@/utils/selectableMusic";

const SelectableMusicList = () => {
  const musicElements = selectableMusic.map((music) => (
    <Box key={music.id} bg="gray.200" p="4" borderRadius="md" minWidth="200px">
      <Text fontSize="2xl">{music.title}</Text>
      <span style={{ textAlign: "right" }}>
        <Text fontSize="md">{music.artist}</Text>
      </span>
    </Box>
  ));
  return (
    <>
      <Flex gap="25px" flexWrap="wrap">
        {musicElements}
      </Flex>
    </>
  );
};
export default SelectableMusicList;
