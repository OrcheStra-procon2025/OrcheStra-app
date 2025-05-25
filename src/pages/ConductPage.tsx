import { PoseAudioController } from "@/components/PoseAudioControler";
import { Box, Heading } from "@chakra-ui/react";

const ConductPage = () => {
  return (
    <Box>
      <Heading mt={4}>指揮演奏</Heading>
      <Box mt={4}>
        <PoseAudioController />
      </Box>
    </Box>
  );
};

export default ConductPage;
