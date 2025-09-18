import logo from "@/assets/logo.png";
import { Flex, Text, Box, Heading, Link, Button } from "@chakra-ui/react";
import SelectableMusicList from "@/components/SelectableMusicList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";

const SelectionPage = () => {
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

export default SelectionPage;
