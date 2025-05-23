import { Box, Text, Button, VStack, useDisclosure } from "@chakra-ui/react";
import { TestModal } from "@/components/test/TestModal";

const ChakraTest = () => {
  const {
    isOpen: isModalOpen,
    onOpen: onModalOpen,
    onClose: onModalClose,
  } = useDisclosure();
  return (
    <Box>
      <VStack>
        <Text p="10" fontSize="20px">
          test page
        </Text>
        <Button
          color="black"
          colorScheme="teal"
          size="lg"
          onClick={onModalOpen}
        >
          Open Modal
        </Button>
      </VStack>
      <TestModal isModalOpen={isModalOpen} onModalClose={onModalClose} />
    </Box>
  );
};

export default ChakraTest;
