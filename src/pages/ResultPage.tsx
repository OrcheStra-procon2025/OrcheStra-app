import { useState, useEffect, useCallback, useRef } from "react";
import { VStack, Heading, Text, Box, Button, Center, Spinner } from "@chakra-ui/react";
import { useGlobalParams } from "@/context/useGlobalParams";
import { useNavigate } from "react-router-dom";
import { useAiAnalyzer, type AiAnalyzerResultData } from "@/hooks/useAiAnalyzer";
import { CompetitiveProgressBar } from "@/components/CompetitiveProgressBar";

interface ProgressBarData {
  key: string;
  labelLeft: string;
  labelRight: string;
  value: number;
}

const PROGRESS_DEFINITIONS: Omit<ProgressBarData, "value">[] = [
  { key: "brightness", labelLeft: "暗い", labelRight: "明るい" },
  { key: "strength", labelLeft: "弱い", labelRight: "強い" },
  { key: "dynamics", labelLeft: "静的", labelRight: "動的" },
];

const ResultPage = () => {
  const navigate = useNavigate();
  const { poseDataList } = useGlobalParams();
  const { analyze: runAiAnalysis, isLoading: isAiLoading, isAnalyzing } = useAiAnalyzer();
  
  const [analysisResult, setAnalysisResult] = useState<AiAnalyzerResultData | null>(null);
  const [progressData, setProgressData] = useState<ProgressBarData[]>([]);
  const [progressIndex, setProgressIndex] = useState(-1);
  const [allProgressFinished, setAllProgressFinished] = useState(false);
  
  const analysisInitiated = useRef(false);

  const handleBackSelection = () => {
    analysisInitiated.current = false;
    setAnalysisResult(null);
    setProgressData([]);
    setProgressIndex(-1);
    setAllProgressFinished(false);
    navigate("/");
  };

  const handleAiAnalysis = useCallback(async () => {
    try {
      const result = await runAiAnalysis(poseDataList);
      setAnalysisResult(result);

      const newProgressData = PROGRESS_DEFINITIONS.map(def => ({
        ...def,
        value: result.metrics[def.key] ?? 50,
      }));
      setProgressData(newProgressData);
      setProgressIndex(0);
    } catch (error) {
      console.error("AI分析のハンドル中にエラーが発生しました:", error);
      setAnalysisResult({
        feedbackText: "AI分析中にエラーが発生しました。",
        metrics: {}
      });
    }
  }, [runAiAnalysis, poseDataList]);

  const handleProgressEnd = useCallback(() => {
    setProgressIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      if (nextIndex >= progressData.length) {
        setAllProgressFinished(true);
        return prevIndex;
      }
      return nextIndex;
    });
  }, [progressData.length]);

  useEffect(() => {
    if (!poseDataList || poseDataList.length === 0) {
      console.warn("ポーズデータが存在しないため、楽曲選択ページに戻ります。");
      navigate("/");
      return;
    }

    if (!isAiLoading && !isAnalyzing && !analysisInitiated.current) {
      analysisInitiated.current = true;
      handleAiAnalysis();
    }
  }, [isAiLoading, isAnalyzing, handleAiAnalysis, poseDataList, navigate]);
  
  const progressBarsToShow = progressData.slice(0, progressIndex + 1);

  return (
    <VStack id="feedback-screen" width="100%" maxWidth="640px" spacing={4}>
      <Heading as="h1" size="md" paddingTop="10">AIによるフィードバック</Heading>
      {(isAiLoading || (isAnalyzing && !analysisResult)) ? (
        <Center w="full" py={4} flexDirection="column">
          <Spinner thickness="4px" speed="1s" emptyColor="gray.200" color="blue" size="xl" />
          <Text mt={2}>分析中...</Text>
        </Center>
      ) : (
        <>
          <VStack spacing={6} width="100%" mt={4}>
            {progressBarsToShow.map((data, index) => (
              <CompetitiveProgressBar
                key={data.key}
                labelLeft={data.labelLeft}
                labelRight={data.labelRight}
                value={data.value}
                onAnimationEnd={index === progressIndex ? handleProgressEnd : () => {}}
                isCurrentAnimating={index === progressIndex && !allProgressFinished}
              />
            ))}
          </VStack>
          {allProgressFinished && analysisResult && (
            <>
              <Box id="feedbackResult" p="1.5em" bg="white" borderRadius="8px" minH="100px" textAlign="center" w="100%" display="flex" alignItems="center" justifyContent="center">
                <Text fontSize="lg" fontWeight="bold">{analysisResult.feedbackText}</Text>
              </Box>
              <Button onClick={handleBackSelection} colorScheme="blue" color="white" p="10px" fontSize="16px" borderRadius="5px">
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