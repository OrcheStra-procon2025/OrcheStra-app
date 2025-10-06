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
import { CompetitiveProgressBar } from "@/components/CompetitiveProgressBar";

interface ProgressBarData {
  labelLeft: string;
  labelRight: string;
  value: number;
}

const MOCK_PROGRESS_DATA: ProgressBarData[] = [
  { labelLeft: "暗い", labelRight: "明るい", value: 75 },
  { labelLeft: "弱い", labelRight: "強い", value: 30 },
  { labelLeft: "静的", labelRight: "動的", value: 55 },
  { labelLeft: "ゆったり", labelRight: "速い", value: 100 },
  { labelLeft: "小さい", labelRight: "大きい", value: 0 },
];

const ResultPage = () => {
  const navigate = useNavigate();
  const { poseDataList } = useGlobalParams();
  const {
    analyze: runAiAnalysis,
    isLoading: isAiLoading,
    isAnalyzing,
  } = useAiAnalyzer();
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [progressIndex, setProgressIndex] = useState(-1);
  const [allProgressFinished, setAllProgressFinished] = useState(false);

  const handleBackSelection = () => {
    setFeedbackText("");
    setProgressIndex(-1); // リセット
    setAllProgressFinished(false); // リセット
    navigate("/");
  };

  const handleAiAnalysis = useCallback(async () => {
    try {
      const result = await runAiAnalysis(poseDataList);
      setFeedbackText(result);

      setProgressIndex(0);
    } catch (error) {
      console.error("AI分析中にエラーが発生しました:", error);
      setFeedbackText("AI分析中に致命的なエラーが発生しました。");
    }
  }, [runAiAnalysis, poseDataList]);

  const handleProgressEnd = useCallback(() => {
    setProgressIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;

      if (nextIndex >= MOCK_PROGRESS_DATA.length) {
        setAllProgressFinished(true);
        return prevIndex;
      }
      return nextIndex;
    });
  }, []);

  useEffect(() => {
    if (
      !isAiLoading &&
      !isAnalyzing &&
      progressIndex === -1 &&
      !allProgressFinished
    ) {
      handleAiAnalysis();
    }
  }, [
    isAiLoading,
    isAnalyzing,
    progressIndex,
    allProgressFinished,
    handleAiAnalysis,
  ]);

  const progressBarsToShow = MOCK_PROGRESS_DATA.slice(0, progressIndex + 1);

  return (
    <VStack id="feedback-screen" width="100%" maxWidth="640px" spacing={4}>
      <Heading as="h1" size="md" paddingTop="10">
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
          <VStack spacing={6} width="100%" mt={4}>
            {/* プログレスバーの表示エリア */}
            {progressBarsToShow.map((data, index) => (
              <CompetitiveProgressBar
                key={index}
                labelLeft={data.labelLeft}
                labelRight={data.labelRight}
                value={data.value}
                onAnimationEnd={
                  index === progressIndex ? handleProgressEnd : () => {}
                }
                isCurrentAnimating={
                  index === progressIndex && !allProgressFinished
                }
              />
            ))}
          </VStack>
          {allProgressFinished && (
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
        </>
      )}
    </VStack>
  );
};

export default ResultPage;
