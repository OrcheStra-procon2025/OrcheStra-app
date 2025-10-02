import { Flex, Text, Box } from "@chakra-ui/react";
import { selectableMusic } from "@/utils/selectableMusic";

export const SelectTableMusicList = ({
  onSelect,
  currentSelectedPath,
}: {
  onSelect: (path: string) => void;
  currentSelectedPath: string;
}) => {
  const handleSelect = (musicPath: string) => {
    // 親から渡された onSelect 関数を呼び出し、選択されたパスを渡す
    onSelect(musicPath);
  };

  const musicElements = selectableMusic.map((music) => {
    // ★ Propsで渡された選択パスと現在のmusic.pathを比較して選択状態をチェック
    const isSelected = currentSelectedPath === music.path;

    return (
      <Box
        key={music.id}
        bg={isSelected ? "blue.100" : "gray.200"}
        p="4"
        borderRadius="md"
        minWidth="200px"
        cursor="pointer"
        border={isSelected ? "2px solid" : "none"}
        borderColor={isSelected ? "blue.500" : "transparent"}
        transition="all 0.2s"
        _hover={{
          opacity: 0.8,
          boxShadow: isSelected ? "lg" : "md",
        }}
        onClick={() => handleSelect(music.path)} // ★ クリック時に music.path を親に渡す
      >
        <Text fontSize="2xl">{music.title}</Text>
        <Box as="span" style={{ textAlign: "right" }}>
          <Text fontSize="md">{music.artist}</Text>
        </Box>
      </Box>
    );
  });
  return (
    <>
      <Flex gap="25px" flexWrap="wrap">
        {musicElements}
      </Flex>
    </>
  );
};
