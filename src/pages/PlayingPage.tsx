import { useRef, useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Select,
  Button,
  Text,
  Spinner,
  Center,
  chakra,
} from "@chakra-ui/react";
import { useVisionController } from "@/hooks/useVisionController";
import { useAiAnalyzer } from "@/hooks/useAiAnalyzer";
import { useCameraSelector } from "@/hooks/useCameraSelector";
import { useMusicPlayer } from "@/hooks/useMusicPlayer";
import type { NormalizedLandmarkList } from "@/utils/models";

const PlayingPage = () => {
  useEffect(() => {
    const socket = new WebSocket("ws://10.76.190.56"); // 仮
    socket.addEventListener("open", () => {
      console.log("WS connected!");
    });
    socket.addEventListener("message", (event) => {
      const accel_info = JSON.parse(event.data);
      console.log(accel_info);
    });
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 状態
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null); // カウントダウン表示用のstate

  // カスタムフック
  const { isPlayerReady, playMusic, stopMusic } = useMusicPlayer();
  const { cameraDevices, selectedDeviceId, isCameraReady, handleSelectChange } =
    useCameraSelector();
  const {
    isDetecting,
    isLoading: isVisionLoading,
    error: visionError,
    startDetection,
    stopDetection,
  } = useVisionController(videoRef.current, canvasRef.current);
  const {
    analyze: runAiAnalysis,
    isLoading: isAiLoading,
    error: aiError,
  } = useAiAnalyzer();

  const isReady =
    isPlayerReady &&
    isCameraReady &&
    !isVisionLoading &&
    !isAiLoading &&
    !visionError &&
    !aiError;
  const isDisabled = !isReady || !selectedDeviceId;
  const isCountingDown = countdown !== null;

  const primaryColor = "skyblue";
  const disabledColor = "#A9A9A9";

  const handleStart = async () => {
    if (isDisabled || isDetecting || isCountingDown) return;

    setShowFeedback(false);
    setFeedbackText("");

    // 3秒のカウントダウン処理
    await new Promise<void>((resolve) => {
      setCountdown(3);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            resolve();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    });

    // カウントダウン後に検出と音楽再生を開始
    await startDetection(selectedDeviceId);
    await playMusic();
  };

  const handleStop = async () => {
    if (!isDetecting) return;
    stopMusic();
    const poseData: NormalizedLandmarkList[] = stopDetection();

    setShowFeedback(true);
    setIsAnalyzing(true);
    setFeedbackText("");

    try {
      const result = await runAiAnalysis(poseData);
      setFeedbackText(result);
    } catch (error) {
      console.error("AI分析中にエラーが発生しました:", error);
      setFeedbackText("AI分析中に致命的なエラーが発生しました。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetry = () => {
    setShowFeedback(false);
    setFeedbackText("");
  };

  const renderStatus = () => {
    if (visionError || aiError) {
      return (
        <Text color="red.500">
          エラーが発生しました: {visionError || aiError}
        </Text>
      );
    }
    if (isVisionLoading || isAiLoading) {
      return <Text color="gray.500">AI/検出システムを準備中...</Text>;
    }
    if (!isCameraReady) {
      return <Text color="gray.500">カメラアクセスを待機中...</Text>;
    }
    if (!isPlayerReady) {
      return <Text color="gray.500">音楽ファイルを読み込み中...</Text>;
    }
    return null;
  };

  const getButtonText = () => {
    if (isDetecting) return "指揮中...";
    if (isCountingDown) return "開始...";
    if (isDisabled) return "準備中...";
    return "指揮を開始";
  };

  return (
    <VStack spacing="20px" p="20px" minH="100vh">
      <Heading as="h1" size="lg">
        Orchestra - 指揮者体験システム
      </Heading>

      <Box
        id="conducting-screen"
        display={showFeedback ? "none" : "flex"}
        flexDir="column"
        alignItems="center"
        width="55vw"
      >
        <Box
          position="relative"
          width="100%"
          paddingTop="75%"
          bg="black"
          borderRadius="8px"
        >
          {/* カウントダウン表示UI */}
          {isCountingDown && (
            <Center
              position="absolute"
              top="0"
              left="0"
              width="100%"
              height="100%"
              bg="rgba(0, 0, 0, 0.5)"
              zIndex="10"
              borderRadius="8px"
            >
              <Text fontSize="9xl" color="white" fontWeight="bold">
                {countdown}
              </Text>
            </Center>
          )}

          <chakra.video
            id="webcam"
            ref={videoRef}
            autoPlay
            playsInline
            muted
            position="absolute"
            top="0"
            left="0"
            width="100%"
            height="100%"
            borderRadius="8px"
          />
          <chakra.canvas
            id="overlayCanvas"
            ref={canvasRef}
            position="absolute"
            top="0"
            left="0"
            width="100%"
            height="100%"
            borderRadius="8px"
            bg="transparent"
          />
        </Box>

        <VStack spacing={2} mt={4} width="100%" maxWidth="640px">
          {renderStatus()}
          <HStack spacing="10px" width="100%" justifyContent="center">
            <Select
              id="cameraSelect"
              title="使用するカメラを選択"
              onChange={handleSelectChange}
              value={selectedDeviceId || ""}
              disabled={isDetecting || !isCameraReady || isCountingDown}
              padding="10px"
              fontSize="16px"
              borderRadius="5px"
              border="1px solid"
              borderColor="gray.300"
              width={{ base: "100%", sm: "auto" }}
            >
              {cameraDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </Select>
            <Button
              id="startButton"
              onClick={handleStart}
              disabled={isDisabled || isDetecting || isCountingDown}
              colorScheme="blue"
              color="white"
              _disabled={{ bg: disabledColor, cursor: "not-allowed" }}
              padding="10px"
              fontSize="16px"
              borderRadius="5px"
            >
              {getButtonText()}
            </Button>
            <Button
              id="stopButton"
              onClick={handleStop}
              style={{ display: isDetecting ? "block" : "none" }}
              colorScheme="blue"
              color="white"
              padding="10px"
              fontSize="16px"
              borderRadius="5px"
            >
              指揮を終了
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* ===== フィードバック画面 ===== */}
      <VStack
        id="feedback-screen"
        display={showFeedback ? "flex" : "none"}
        width="100%"
        maxWidth="640px"
        spacing={4}
      >
        <Heading as="h2" size="md">
          AIによるフィードバック
        </Heading>
        {isAnalyzing && (
          <Center w="full" py={4} flexDirection="column">
            <Spinner
              thickness="4px"
              speed="1s"
              emptyColor="gray.200"
              color={primaryColor}
              size="xl"
            />
            <Text mt={2}>分析中...</Text>
          </Center>
        )}
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
            {!isAnalyzing ? feedbackText : ""}
          </Text>
        </Box>
        <Button
          id="retryButton"
          onClick={handleRetry}
          style={{ display: !isAnalyzing && showFeedback ? "block" : "none" }}
          colorScheme="blue"
          color="white"
          padding="10px"
          fontSize="16px"
          borderRadius="5px"
        >
          もう一度試す
        </Button>
      </VStack>
    </VStack>
  );
};

export default PlayingPage;
