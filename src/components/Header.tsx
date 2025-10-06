import { Box, Flex, Heading, Image } from "@chakra-ui/react";
import logo from "@/assets/OS.png";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();
  const HandleClick= () =>{
     navigate("/"); 
    }

  return (
    <Box bg="#3e4f89" color="white" px={4} py={2}>
      <Flex alignItems="center" justify="space-between">
        <Flex alignItems="center" gap={4}>
          <Image src={logo} alt="Logo" maxH="40px" onClick={HandleClick} />
          <Heading as="h1" size="lg">
            OrcheStra
          </Heading>
        </Flex>
      </Flex>
    </Box>
  );
};

export default Header;