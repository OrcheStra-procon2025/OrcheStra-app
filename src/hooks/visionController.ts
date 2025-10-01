import type { NormalizedLandmarkList } from "@/utils/models";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

export const createVisionController = async (
  videoElement: HTMLVideoElement,
  canvasElement: HTMLCanvasElement,
) => {
  const canvasCtx: CanvasRenderingContext2D | null =
    canvasElement.getContext("2d");
  const poseLandmarker = await createPoseLandmarker();
  let isDetecting: boolean = false;
  let poseDataRecorder: NormalizedLandmarkList[] = [];

  if (!canvasCtx) {
    throw new Error("Canvas context is null.");
  }

  async function createPoseLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
    );
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  }

  const detectionLoop = () => {
    if (!isDetecting) return;

    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    const poseResult = poseLandmarker.detectForVideo(
      videoElement,
      performance.now(),
    );

    if (poseResult.landmarks.length > 0) {
      poseDataRecorder.push(poseResult.landmarks[0]);
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const drawingUtils = new DrawingUtils(canvasCtx);
    for (const landmarks of poseResult.landmarks) {
      drawingUtils.drawLandmarks(landmarks, { color: "#E1D319", radius: 5 });
      drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
        color: "#4A5E76",
        lineWidth: 3,
      });
    }

    window.requestAnimationFrame(detectionLoop);
  };

  return {
    async start(deviceId: string) {
      isDetecting = true;
      poseDataRecorder = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId },
      });
      videoElement.srcObject = stream;
      videoElement.play();
      videoElement.addEventListener("loadeddata", detectionLoop);
    },
    stop() {
      isDetecting = false;
      if (videoElement.srcObject) {
        const mediaStream = videoElement.srcObject as MediaStream;

        mediaStream
          .getTracks()
          .forEach((track: MediaStreamTrack) => track.stop());

        videoElement.srcObject = null;
      }
      return poseDataRecorder;
    },
  };
};
