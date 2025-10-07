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
// ProgressBarDataのインポートを削除
// import type { ProgressBarData } from "@/utils/models";

// --- ここに ProgressBarData の定義を追加 ---
interface ProgressBarData {
  labelLeft: string;
  labelRight: string;
  value: number;
}
// -----------------------------------------

const ResultPage = () => {
  const navigate = useNavigate();
  const { poseDataList } = useGlobalParams();
  const {
    analyze: runAiAnalysis,
    isLoading: isAiLoading,
    isAnalyzing,
  } = useAiAnalyzer();

  const [feedbackText, setFeedbackText] = useState<string>("");
  const [progressBarData, setProgressBarData] = useState<ProgressBarData[]>([]);
  const [progressIndex, setProgressIndex] = useState(-1);
  const [allProgressFinished, setAllProgressFinished] = useState(false);

  const handleBackSelection = () => {
    setFeedbackText("");
    setProgressBarData([]);
    setProgressIndex(-1);
    setAllProgressFinished(false);
    navigate("/");
  };

  const handleAiAnalysis = useCallback(async () => {
    try {
      const { feedbackText: resultText, progressBarData: resultData } =
        await runAiAnalysis(poseDataList);

      setFeedbackText(resultText);
      setProgressBarData(resultData);

      if (resultData.length > 0) {
        setProgressIndex(0);
      } else {
        setAllProgressFinished(true);
      }
    } catch (error) {
      console.error("AI分析中にエラーが発生しました:", error);
      setFeedbackText("AI分析中に致命的なエラーが発生しました。");
    }
  }, [runAiAnalysis, poseDataList]);

  const handleProgressEnd = useCallback(() => {
    setProgressIndex((prevIndex) => {
      if (!progressBarData || prevIndex + 1 >= progressBarData.length) {
        setAllProgressFinished(true);
        return prevIndex;
      }
      return prevIndex + 1;
    });
  }, [progressBarData]);

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

  const progressBarsToShow = progressBarData.slice(0, progressIndex + 1);

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