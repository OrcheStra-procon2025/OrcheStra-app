import { Flex, Text, Box } from "@chakra-ui/react";
import { selectableMusic } from "@/utils/selectableMusic";

export const SelectTableMusicList = ({
  setSelectedPath,
  currentSelectedPath,
}: {
  setSelectedPath: (path: string) => void;
  currentSelectedPath: string;
}) => {
  const handleSelect = (musicPath: string) => {
    setSelectedPath(musicPath);
  };

  return (
    <>
      <Flex gap="25px" flexWrap="wrap">
        {selectableMusic.map((music) => (
          <Box // ← ここから JSX を記述
            key={music.id}
            bg={currentSelectedPath === music.path ? "blue.100" : "gray.200"}
            p="4"
            borderRadius="md"
            minWidth="200px"
            cursor="pointer"
            border={currentSelectedPath === music.path ? "2px solid" : "none"}
            borderColor={
              currentSelectedPath === music.path ? "blue.500" : "transparent"
            }
            transition="all 0.2s"
            _hover={{
              opacity: 0.8,
              boxShadow: currentSelectedPath === music.path ? "lg" : "md",
            }}
            onClick={() => handleSelect(music.path)}
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
