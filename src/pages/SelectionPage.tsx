import logo from "@/assets/logo.png";
import { Flex, Box, Link, Button } from "@chakra-ui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";

const SelectionPage = () => {
  return (
    <>
      <Flex width="100%" alignItems="center" gap="30px" marginBottom="20px">
        <Box maxW="200px;">
          <img src={logo} alt="Logo" />
        </Box>
      </Flex>
      <Link href="/camera" about="_blank">
        <Button colorScheme="blue" marginTop="20px">
          <FontAwesomeIcon icon={faPlay} style={{ marginRight: "10px" }} />
          スタート！
        </Button>
      </Link>
    </>
  );
};

export default SelectionPage;
