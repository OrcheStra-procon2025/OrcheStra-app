import { useRef, useState } from "react";
import type { FC, ChangeEvent } from "react";
import { Box, Button, Input, Text } from "@chakra-ui/react";
import { usePoseTracker } from "../hooks/usePoseTracker";
import { useToneController } from "@/hooks/useToneController";
import type { MotionData } from "@/models/motion";
import { POSE_CONNECTIONS } from "@/utils/poseConnection";

export const PoseAudioController: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState<number>(0);
  const [bpm, setBpm] = useState<number>(0);
  const { load, play, stop, adjustPlayback, isPlaying } = useToneController();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const drawLandmarks = (landmarks: MotionData["rawLandmarks"]) => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks || landmarks.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // const audioRef = useRef<HTMLAudioElement>(null);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "cyan";
    ctx.strokeStyle = "magenta";
    ctx.lineWidth = 2;

    // 点を描く
    for (const point of landmarks) {
      ctx.beginPath();
      ctx.arc(
        point.x * canvas.width,
        point.y * canvas.height,
        5,
        0,
        2 * Math.PI,
      );
      ctx.fill();
    }

    // 正しい骨格に基づいて線を描く
    for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
        ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
        ctx.stroke();
      }
    }
  };

  const handleMotion = (motion: MotionData): void => {
    drawLandmarks(motion.rawLandmarks);
    const vol = Math.min(1, motion.speed * 2);
    const bpmRate = Math.min(2, motion.distance * 5);
    setVolume(vol);
    setBpm(bpmRate);
    adjustPlayback(vol, bpmRate);
  };

  usePoseTracker(videoRef, handleMotion);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setAudioUrl(url);
      load(e.target.files[0]);
    }
  };

  return (
    <Box textAlign="center">
      <Box position="relative" w="fit-content">
        {/* カメラ映像をcanvasの下に重ねて表示 */}
        <Box
          as="video"
          ref={videoRef}
          width={640}
          height={480}
          autoPlay
          muted
          playsInline
          position="absolute"
          top={0}
          left={0}
          zIndex={0}
          objectFit="cover"
          borderRadius="md"
          boxShadow="md"
        />
        <Box
          as="canvas"
          ref={canvasRef}
          width={640}
          height={480}
          position="absolute"
          top={0}
          left={0}
          zIndex={1}
          border="1px solid"
          borderColor="gray.300"
          borderRadius="md"
          boxShadow="md"
          pointerEvents="none"
        />
        {/* Wrapperの高さを確保 */}
        <Box width={640} height={480} visibility="hidden" />
      </Box>
      <Input
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        width="300px"
        m={2}
      />
      <Button
        onClick={() => (isPlaying ? stop() : play())}
        colorScheme="blue"
        m={2}
        disabled={!audioUrl}
      >
        {isPlaying ? "Stop" : "Play"}
      </Button>
      <Text fontSize="30">音量: {volume.toFixed(3)} dB</Text>
      <Text fontSize="30">速度: {bpm.toFixed(3)} 倍速</Text>
    </Box>
  );
};
