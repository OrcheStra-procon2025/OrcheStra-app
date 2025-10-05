import { useState, useEffect, useCallback } from "react";
import {
  VStack,
  Heading,
  Text,
  Box,
  Button,
  Center,
  Spinner,
} from "@chakra-ui/react";
import { useGlobalParams } from "@/context/useGlobalParams";
import { useNavigate } from "react-router-dom";
import { useAiAnalyzer } from "@/hooks/useAiAnalyzer";

const ResultPage = () => {
  const navigate = useNavigate();
  const { poseDataList } = useGlobalParams();
  const {
    analyze: runAiAnalysis,
    isLoading: isAiLoading,
    isAnalyzing,
  } = useAiAnalyzer();
  const [feedbackText, setFeedbackText] = useState<string>("");

  const handleBackSelection = () => {
    setFeedbackText("");
    navigate("/");
  };

  const handleAiAnalysis = useCallback(async () => {
    try {
      const result = await runAiAnalysis(poseDataList);
      setFeedbackText(result);
    } catch (error) {
      console.error("AI分析中にエラーが発生しました:", error);
      setFeedbackText("AI分析中に致命的なエラーが発生しました。");
    }
  }, [runAiAnalysis, poseDataList]);

  useEffect(() => {
    handleAiAnalysis();
  }, [isAiLoading, handleAiAnalysis]);

  return (
    <VStack id="feedback-screen" width="100%" maxWidth="640px" spacing={4}>
      <Heading as="h2" size="md">
        AIによるフィードバック
      </Heading>
      {isAiLoading || isAnalyzing ? (
        <Center w="full" py={4} flexDirection="column">
          <Spinner
            thickness="4px"
            speed="1s"
            emptyColor="gray.200"
            color="blue"
            size="xl"
          />
          <Text mt={2}>分析中...</Text>
        </Center>
      ) : (
        <>
          <Box
            id="feedbackResult"
            padding="1.5em"
            bg="white"
            borderRadius="8px"
            minHeight="100px"
            textAlign="center"
            width="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="lg" fontWeight="bold">
              {feedbackText}
            </Text>
          </Box>
          <Button
            onClick={handleBackSelection}
            colorScheme="blue"
            color="white"
            padding="10px"
            fontSize="16px"
            borderRadius="5px"
          >
            楽曲選択に戻る
          </Button>
        </>
      )}
    </VStack>
  );
};

export default ResultPage;
