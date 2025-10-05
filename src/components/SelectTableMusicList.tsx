import { Flex, Text, Box } from "@chakra-ui/react";
import { selectableMusic } from "@/utils/selectableMusic";
import type { MusicDataModel } from "@/utils/models";
import { useGlobalParams } from "@/context/useGlobalParams";

export const SelectTableMusicList = () => {
  const { selectedMusic, updateSelectedMusic } = useGlobalParams();

  const handleSelect = (music: MusicDataModel) => {
    updateSelectedMusic(music);
  };

  return (
    <>
      <Flex gap="25px" flexWrap="wrap">
        {selectableMusic.map((music: MusicDataModel) => (
          <Box // ← ここから JSX を記述
            key={music.id}
            bg={selectedMusic?.id === music.id ? "blue.100" : "gray.200"}
            p="4"
            borderRadius="md"
            minWidth="200px"
            cursor="pointer"
            border={selectedMusic?.id === music.id ? "2px solid" : "none"}
            borderColor={
              selectedMusic?.id === music.id ? "blue.500" : "transparent"
            }
            transition="all 0.2s"
            _hover={{
              opacity: 0.8,
              boxShadow: selectedMusic?.id === music.id ? "lg" : "md",
            }}
            onClick={() => handleSelect(music)}
          >
            <Text fontSize="2xl">{music.title}</Text>
            <Box as="span" style={{ textAlign: "right" }}>
              <Text fontSize="md">{music.artist}</Text>
            </Box>
          </Box>
        ))}
      </Flex>
    </>
  );
};
