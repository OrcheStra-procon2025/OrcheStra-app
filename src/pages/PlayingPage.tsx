import { useRef, useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Select,
  Button,
  Text,
  Center,
  chakra,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useVisionController } from "@/hooks/useVisionController";
import { useCameraSelector } from "@/hooks/useCameraSelector";
import { useVolumeChanger } from "@/hooks/useVolumeChanger";
import { useMusicPlayer } from "@/hooks/useMusicPlayer";
import { useMusicChanger } from "@/hooks/useMusicChanger";
import { useWebSocket } from "@/hooks/useWebSocket";
import type {
  NormalizedLandmark,
  NormalizedLandmarkList,
  AccelDataModel,
} from "@/utils/models";
import { ThreejsEffect } from "@/components/threejs/ThreejsEffect";
import { IS_DEBUG_MODE } from "@/utils/isDebugMode";

const PlayingPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // --- カスタムフック ---
  const { isPlayerReady, player, musicPath, playMusic, stopMusic } =
    useMusicPlayer();
  const { updateVolumeFromPose } = useVolumeChanger();
  const { startChanging, processAccelInfo } = useMusicChanger();
  const { connectWebSocket, registerOnMessage, removeOnMessage } =
    useWebSocket();

  const { cameraDevices, selectedDeviceId, isCameraReady, handleSelectChange } =
    useCameraSelector();

  const {
    isDetecting,
    isLoading: isVisionLoading,
    error: visionError,
    startDetection,
    stopDetection,
    rightWrist,
    leftWrist,
  } = useVisionController(
    videoRef.current,
    IS_DEBUG_MODE ? canvasRef.current : null,
  );

  // useEffectを使って、手首の座標が更新されたらテンポ更新関数を呼び出す
  useEffect(() => {
    // 検出中で、両手首のデータがある場合のみ実行
    if (isDetecting && rightWrist && leftWrist) {
      const currentPose: NormalizedLandmarkList = [];

      currentPose[15] = leftWrist;
      currentPose[16] = rightWrist;

      updateVolumeFromPose(currentPose, player!);
    }
  }, [rightWrist, leftWrist, isDetecting, updateVolumeFromPose, player]);

  useEffect(() => {
    connectWebSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isReady =
    isPlayerReady && isCameraReady && !isVisionLoading && !visionError;
  const isDisabled = !isReady || !selectedDeviceId;
  const isCountingDown = countdown !== null;

  const getScreenCoord = (landmark: NormalizedLandmark | null) => {
    if (videoRef.current && isDetecting && landmark) {
      const videoRect = videoRef.current.getBoundingClientRect();
      const xInVideo = landmark.x * videoRect.width;
      const yInVideo = landmark.y * videoRect.height;
      const screenX = videoRect.left + xInVideo;
      const screenY = videoRect.top + yInVideo;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const centeredX = centerX - screenX;
      const centeredY = screenY - centerY;
      return { screenX: centeredX, screenY: centeredY };
    }
    return { screenX: 0, screenY: 0 };
  };

  const { screenX: rightWristX, screenY: rightWristY } =
    getScreenCoord(rightWrist);
  const { screenX: leftWristX, screenY: leftWristY } =
    getScreenCoord(leftWrist);

  const disabledColor = "#A9A9A9";

  const handleStart = async () => {
    if (isDisabled || isDetecting || isCountingDown) return;

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

    await startDetection(selectedDeviceId);
    await playMusic();
    await startChanging(musicPath!);
    await registerOnMessage((data: AccelDataModel) => {
      processAccelInfo(player!, data);
    });
  };

  const handleStop = async () => {
    if (!isDetecting) return;
    stopMusic();
    stopDetection();
    await removeOnMessage();
    navigate("/result");
  };

  const renderStatus = () => {
    if (visionError)
      return <Text color="red.500">エラーが発生しました: {visionError}</Text>;
    if (isVisionLoading)
      return <Text color="gray.500">指揮検出システムを準備中...</Text>;
    if (!isCameraReady)
      return <Text color="gray.500">カメラアクセスを待機中...</Text>;
    if (!isPlayerReady)
      return <Text color="gray.500">音楽ファイルを読み込み中...</Text>;
    return null;
  };

  const getButtonText = () => {
    if (isDetecting) return "指揮中...";
    if (isCountingDown) return "開始...";
    if (isDisabled) return "準備中...";
    return "指揮を開始";
  };

  return (
    <VStack paddingTop="10px">
      <Box
        id="conducting-screen"
        display="flex"
        flexDir="column"
        alignItems="center"
        width="53vw"
      >
        <Box
          position="relative"
          width="100%"
          paddingTop="75%"
          bg="black"
          borderRadius="8px"
        >
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
            transform="scaleX(-1)"
          />
          {IS_DEBUG_MODE && (
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
              transform="scaleX(-1)"
            />
          )}
          {isDetecting && rightWristX !== 0 && rightWristY !== 0 && (
            <ThreejsEffect x={rightWristX} y={rightWristY} />
          )}
          {isDetecting && leftWristX !== 0 && leftWristY !== 0 && (
            <ThreejsEffect x={leftWristX} y={leftWristY} />
          )}
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
              colorScheme={
                isDisabled || isDetecting || isCountingDown ? "none" : "blue"
              }
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
              display={isDetecting ? "block" : "none"}
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
    </VStack>
  );
};

export default PlayingPage;
