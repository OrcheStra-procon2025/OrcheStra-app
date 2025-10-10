import { Flex, Button, Heading } from "@chakra-ui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import { SelectTableMusicList } from "@/components/SelectTableMusicList";
import { useGlobalParams } from "@/context/useGlobalParams";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect } from "react";

const SelectionPage = () => {
  const { selectedMusic } = useGlobalParams();
  const isStartButtonDisabled = !selectedMusic;
  const navigate = useNavigate();

  const { connectWebSocket } = useWebSocket();

  useEffect(() => {
    connectWebSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartClick = () => {
    if (!isStartButtonDisabled) {
      navigate("/play");
    }
  };

  return (
    <>
      <Flex direction="column" align="center" width="full" padding="6">
        <Flex
          width="100%"
          alignItems="center"
          justifyContent="center"
          gap="30px"
          marginBottom="20px"
        ></Flex>
        <Heading as="h3" fontWeight="normal" size="lg" marginBottom="30px">
          一覧から選ぶ
        </Heading>
        <SelectTableMusicList />
        <Button
          bg="#3e4f89"
          colorScheme="white"
          marginTop="50px"
          isDisabled={isStartButtonDisabled}
          onClick={handleStartClick}
          padding="20px"
          paddingLeft="40px"
          paddingRight="40px"
        >
          <FontAwesomeIcon icon={faPlay} style={{ marginRight: "10px" }} />
          スタート！
        </Button>
      </Flex>
    </>
  );
};

export default SelectionPage;
