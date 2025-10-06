import { useRef, useState, useEffect } from "react";
import { Box, VStack, HStack, Select, Button, Text, Center, chakra } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber"; // ★ Canvasをインポート
import { useVisionController } from "@/hooks/useVisionController";
import { useCameraSelector } from "@/hooks/useCameraSelector";
import { useMusicPlayer } from "@/hooks/useMusicPlayer";
import type { NormalizedLandmark } from "@/utils/models";
import { Effects } from "@/components/threejs/Effects"; // ★ 新しいEffectsコンポーネントをインポート

const PlayingPage = () => {
  const navigate = useNavigate();
  // ... (useEffect for WebSocketは変更なし)

  const videoRef = useRef<HTMLVideoElement>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // ... (カスタムフックの呼び出しは変更なし)
  const { isPlayerReady, playMusic, stopMusic, isError: musicError } = useMusicPlayer();
  const { cameraDevices, selectedDeviceId, isCameraReady, handleSelectChange } = useCameraSelector();
  const { isDetecting, isLoading: isVisionLoading, error: visionError, startDetection, stopDetection, rightWrist, leftWrist } = useVisionController(videoRef.current);

  // ... (isReady, isDisabled, isCountingDownの定義は変更なし)

  // ... (getScreenCoord, handleStart, handleStop, renderStatus, getButtonTextの定義は変更なし)
  const getScreenCoord = (landmark: NormalizedLandmark | null) => {
    if (videoRef.current && isDetecting && landmark) {
      const videoRect = videoRef.current.getBoundingClientRect();
      const xInVideo = landmark.x * videoRect.width;
      const yInVideo = landmark.y * videoRect.height;
      const screenX = videoRect.left + xInVideo;
      const screenY = videoRect.top + yInVideo;
      // 3D空間の座標に合わせるため、少し調整
      const viewScale = 25;
      const centeredX = (screenX - window.innerWidth / 2) / viewScale;
      const centeredY = -(screenY - window.innerHeight / 2) / viewScale;
      return { x: centeredX, y: centeredY };
    }
    return null;
  };

  const rightPosition = getScreenCoord(rightWrist);
  const leftPosition = getScreenCoord(leftWrist);

  return (
    <VStack spacing="20px" p="20px" minH="100vh">
      <Box id="conducting-screen" display="flex" flexDir="column" alignItems="center" width="60vw">
        <Box position="relative" width="100%" paddingTop="75%" bg="black" borderRadius="8px">
          {/* ... (カウントダウンUIは変更なし) */}

          <chakra.video
            id="webcam"
            ref={videoRef}
            // ... (videoタグの他のpropsは変更なし)
          />
          
          {/* ▼▼▼ エフェクト表示部分をここに集約 ▼▼▼ */}
          <Canvas
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none', // 背景として操作を透過させる
            }}
            camera={{ position: [0, 0, 100], fov: 50 }}
          >
            {/* 検出中のみエフェクトコンポーネントを呼び出す */}
            {isDetecting && (
              <Effects 
                rightPosition={rightPosition}
                leftPosition={leftPosition}
              />
            )}
          </Canvas>
        </Box>

        {/* ... (下部のボタンやステータス表示部分は変更なし) */}
      </Box>
    </VStack>
  );
};

export default PlayingPage;