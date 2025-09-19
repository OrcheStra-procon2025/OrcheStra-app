import logo from "@/assets/logo.png";
import { Flex, Box, Heading } from "@chakra-ui/react";

const Camera = () => {
  return (
    <>
      <Box>
        <Flex width="100%" alignItems="center" gap="30px" marginBottom="20px">
          <Box maxW="200px;">
            <img src={logo} alt="Logo" />
          </Box>
          <Heading as="h2" fontWeight="medium" size="xl">
            指揮しよう！
          </Heading>
        </Flex>
      </Box>
    </>
  );
};

export default Camera;
