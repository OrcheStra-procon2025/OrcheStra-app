import { Flex, Text, Box } from "@chakra-ui/react";
import { selectableMusic } from "@/utils/selectableMusic";

export const SelectTableMusicList = () => {
  const musicElements = selectableMusic.map((music) => (
    <Box key={music.id} bg="gray.200" p="4" borderRadius="md" minWidth="200px">
      <Text fontSize="2xl">{music.title}</Text>
      <Box as="span" style={{ textAlign: "right" }}>
        <Text fontSize="md">{music.artist}</Text>
      </Box>
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
