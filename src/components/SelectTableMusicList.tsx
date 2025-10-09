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
      <Flex
        gap="25px"
        flexWrap="wrap"
        maxWidth="1200px"
        justifyContent="center"
      >
        {selectableMusic.map((music: MusicDataModel) => (
          <Box
            key={music.id}
            bg={selectedMusic?.id === music.id ? "blue.100" : "gray.200"}
            p="4"
            borderRadius="md"
            width="360px"
            height="120px"
            display="flex"
            flexDirection="column"
            justifyContent="space-between"
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
            <Box>
              <Text fontSize="3xl">{music.title}</Text>
            </Box>
            <Text
              fontSize="md"
              textAlign="right"
              color="#7e7d7dff"
              wordBreak="break-word"
              maxW="300px"
              alignSelf="flex-end"
            >
              {music.artist}
            </Text>
          </Box>
        ))}
      </Flex>
    </>
  );
};
