import logo from "@/assets/logo.png";
import { Flex, Box, Button, Heading, Image } from "@chakra-ui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import { SelectTableMusicList } from "@/components/SelectTableMusicList";
import { useGlobalParams } from "@/context/useGlobalParams";
import { useNavigate } from "react-router-dom";

const SelectionPage = () => {
  const { selectedMusic } = useGlobalParams();
  const isStartButtonDisabled = !selectedMusic;
  const navigate = useNavigate();

  const handleStartClick = () => {
    if (!isStartButtonDisabled) {
      navigate("/play");
    }
  };

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
        <Button
          colorScheme="blue"
          marginTop="20px"
          isDisabled={isStartButtonDisabled}
          onClick={handleStartClick}
        >
          <FontAwesomeIcon icon={faPlay} style={{ marginRight: "10px" }} />
          スタート！
        </Button>
      </Flex>
    </>
  );
};

export default SelectionPage;
