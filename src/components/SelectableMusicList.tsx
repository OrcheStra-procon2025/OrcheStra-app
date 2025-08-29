import { Link } from "react-router-dom";
import { Flex, Text, Box } from "@chakra-ui/react";
import { selectableMusic } from "@/utils/selectableMusic";

export default function SelectableMusicList() {
  const musicElements = selectableMusic.map((music) => (
    <Link key={music.id} to="/play" state={{selectedMusic: music.id}}>
      <Box bg="gray.200" p="4" borderRadius="md" minWidth="200px">
        <Text fontSize="2xl">{music.title}</Text>
        <span style={{ textAlign: "right" }}>
          <Text fontSize="md">{music.artist}</Text>
        </span>
      </Box>
    </Link>
  ));
  return (
    <>
      <Flex gap="25px" flexWrap="wrap">
        {musicElements}
      </Flex>
    </>
  );
};
