
import { Box, Text, Button, VStack,  } from "@chakra-ui/react";

import { testWS } from "../hooks/connection";

const ChakraTest = () => {
  return (
    <Box>
      <VStack>
        <Text p="10" fontSize="20px">
          WS接続テスト
        </Text>
        <Button
          color="black"
          colorScheme="teal"
          size="lg"
          onClick={testWS}
        >
          接続する
        </Button>
      </VStack>
    </Box>
  );
};

export default ChakraTest;
