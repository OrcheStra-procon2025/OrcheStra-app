import { useRef, useState, useEffect, useCallback } from "react";
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
import type { NormalizedLandmarkList } from "@/utils/models"; // 型をインポート

const useCameraSelector = () => {
  // ... (useCameraSelectorのコードをそのままここに含めるか、外部ファイルからインポートしてください) ...
  const [cameraDevices, setCameraDevices] = useState<
    { id: string; label: string }[]
  >([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(
    undefined,
  );
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, index) => ({
            id: d.deviceId,
            label: d.label || `Camera ${index + 1}`,
          }));

        setCameraDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].id);
        }
        setIsCameraReady(true);
      } catch (error) {
        console.error("カメラの列挙に失敗しました:", error);
        setIsCameraReady(false);
      }
    };
    setup();
  }, []);

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedDeviceId(e.target.value);
    },
    [],
  );

  return {
    cameraDevices,
    selectedDeviceId,
    isCameraReady,
    handleSelectChange,
  };
};

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

  // カスタムフック
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
    isCameraReady &&
    !isVisionLoading &&
    !isAiLoading &&
    !visionError &&
    !aiError;
  const isDisabled = !isReady || !selectedDeviceId;

  const primaryColor = "skyblue";
  const disabledColor = "#A9A9A9"; // ボタンの無効色

  const handleStart = async () => {
    if (isDisabled || isDetecting || !selectedDeviceId) return;

    setShowFeedback(false);
    setFeedbackText("");

    await startDetection(selectedDeviceId);
  };

  const handleStop = async () => {
    if (!isDetecting) return;

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

  // --- エラー/ロード状態の表示 ---
  const renderStatus = () => {
    if (visionError || aiError) {
      return (
        <Text color="red.500">
          エラーが発生しました: {visionError || aiError}
        </Text>
      );
    }
    if (isVisionLoading || isAiLoading) {
      // ローディングインジケータをボタンエリアに表示
      return <Text color="gray.500">AI/検出システムを準備中...</Text>;
    }
    if (!isCameraReady) {
      return <Text color="gray.500">カメラアクセスを待機中...</Text>;
    }
    return null;
  };

  // --- レンダリング ---
  return (
    // bodyのスタイルをVStackとBoxで再現
    <VStack spacing="20px" p="20px" minH="100vh">
      <Heading as="h1" size="lg">
        Orchestra - 指揮者体験システム
      </Heading>

      {/* ===== 指揮画面 ===== */}
      <Box
        id="conducting-screen"
        display={showFeedback ? "none" : "flex"}
        flexDir="column"
        alignItems="center"
        width="100%"
      >
        {/* 映像エリア (.vision-container) */}
        <Box
          className="vision-container" // 元のCSSと同じように参照できるように className は残す（ただし、Chakraプロパティで上書き）
          position="relative"
          width="100%"
          maxWidth="640px"
          paddingTop="75%" // 4:3のアスペクト比を再現 (3/4 * 100 = 75)
          bg="black"
          borderRadius="8px"
        >
          {/* video, canvas (position: absolute, width/height: 100%を再現) */}
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

        {/* 操作エリア (.controls) */}
        <VStack spacing={2} mt={4} width="100%" maxWidth="640px">
          {renderStatus()}

          <HStack
            spacing="10px"
            className="controls"
            width="100%"
            justifyContent="center"
          >
            <Select
              id="cameraSelect"
              title="使用するカメラを選択"
              onChange={handleSelectChange}
              value={selectedDeviceId || ""}
              disabled={isDetecting || !isCameraReady}
              // 元の select スタイルを再現
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

            {/* 開始ボタン */}
            <Button
              id="startButton"
              onClick={handleStart}
              disabled={isDisabled || isDetecting}
              // 元の button スタイルを再現
              colorScheme="blue"
              color="white"
              _disabled={{ bg: disabledColor, cursor: "not-allowed" }}
              padding="10px"
              fontSize="16px"
              borderRadius="5px"
            >
              {isDetecting
                ? "指揮中..."
                : isDisabled
                  ? "準備中..."
                  : "指揮を開始"}
            </Button>

            {/* 停止ボタン (isDetecting時のみ表示) */}
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

        {/* ローディングスピナー (.loader) の再現 */}
        {isAnalyzing && (
          <Center w="full" py={4} flexDirection="column">
            {/* 元のCSSに近い色のChakra Spinnerを使用 */}
            <Spinner
              thickness="4px"
              speed="1s"
              emptyColor="gray.200"
              color={primaryColor} // #4A5E76
              size="xl"
            />
            <Text mt={2}>分析中...</Text>
          </Center>
        )}

        {/* フィードバック結果 (#feedbackResult) の再現 */}
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

        {/* もう一度試すボタン */}
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
