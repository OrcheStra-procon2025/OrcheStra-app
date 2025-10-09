import { Box, Flex, Heading, Image } from "@chakra-ui/react";
import logo from "@/assets/OS.png";
import { useNavigate } from "react-router-dom";
import { useGlobalParams } from "@/context/useGlobalParams";

const Header = () => {
  const navigate = useNavigate();
  const { updateSelectedMusic, updatePoseDataList } = useGlobalParams();
  const handleClick = () => {
    updateSelectedMusic(null);
    updatePoseDataList([]);
    navigate("/");
  };

  return (
    <Box bg="#3e4f89" color="white" px={4} py={2}>
      <Flex alignItems="center" justify="space-between">
        <Flex
          alignItems="center"
          gap={4}
          onClick={handleClick}
          cursor="pointer"
        >
          <Image src={logo} alt="Logo" maxH="40px" />
          <Heading as="h1" size="lg">
            OrcheStra
          </Heading>
        </Flex>
      </Flex>
    </Box>
  );
};

export default Header;
