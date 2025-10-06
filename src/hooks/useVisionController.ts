import { useState, useEffect, useRef, useCallback } from "react";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import type {
  NormalizedLandmarkList,
  NormalizedLandmark,
} from "@/utils/models";
import { KEY_JOINTS_MEDIAPIPE } from "@/utils/mediapipeJoint";
import { useGlobalParams } from "@/context/useGlobalParams";

interface VisionController {
  isDetecting: boolean;
  isLoading: boolean;
  error: string | null;
  startDetection: (deviceId: string) => Promise<void>;
  stopDetection: () => NormalizedLandmarkList[];
  rightWrist: NormalizedLandmark | null;
  leftWrist: NormalizedLandmark | null;
}

const MODEL_PATH = `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`;
const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

export const useVisionController = (
  videoElement: HTMLVideoElement | null,
): VisionController => {
  const { updatePoseDataList } = useGlobalParams();
  const [isDetectingState, setIsDetectingState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rightWrist, setRightWrist] = useState<NormalizedLandmark | null>(null);
  const [leftWrist, setLeftWrist] = useState<NormalizedLandmark | null>(null);

  const poseDataRecorderRef = useRef<NormalizedLandmarkList[]>([]);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isDetectingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!videoElement) return;

    const loadLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        poseLandmarkerRef.current = landmarker;
      } catch (err) {
        console.error("MediaPipeのロードに失敗しました:", err);
        setError("検出システムの初期化に失敗しました。");
      } finally {
        setIsLoading(false);
      }
    };
    loadLandmarker();

    return () => {
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
      }
    };
  }, [videoElement]);

  const detectionLoop = useCallback(() => {
    if (!isDetectingRef.current || !videoElement || !poseLandmarkerRef.current) return;

    const poseResult = poseLandmarkerRef.current.detectForVideo(videoElement, performance.now());

    if (poseResult.landmarks.length > 0) {
      const currentLandmarks = poseResult.landmarks[0] as NormalizedLandmarkList;
      poseDataRecorderRef.current.push(currentLandmarks);

      const rightWristData = currentLandmarks[KEY_JOINTS_MEDIAPIPE.RIGHT_WRIST];
      if (rightWristData?.visibility && rightWristData.visibility > 0.5) {
        setRightWrist(rightWristData);
      } else {
        setRightWrist(null);
      }

      const leftWristData = currentLandmarks[KEY_JOINTS_MEDIAPIPE.LEFT_WRIST];
      if (leftWristData?.visibility && leftWristData.visibility > 0.5) {
        setLeftWrist(leftWristData);
      } else {
        setLeftWrist(null);
      }
    }

    window.requestAnimationFrame(detectionLoop);
  }, [videoElement]);

  const startDetection = useCallback(async (deviceId: string) => {
    if (isLoading || error || !videoElement) return;

    try {
      const constraints: MediaStreamConstraints = { video: { deviceId } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      videoElement.srcObject = stream;
      videoElement.play();

      poseDataRecorderRef.current = [];
      isDetectingRef.current = true;
      setIsDetectingState(true);

      const startLoop = () => {
        if (isDetectingRef.current) {
          detectionLoop();
        }
      };
      
      videoElement.addEventListener("loadeddata", startLoop, { once: true });
      if (videoElement.readyState >= 2) {
        startLoop();
      }
    } catch (e) {
      console.error("カメラのアクセスに失敗しました:", e);
      setError("カメラの開始に失敗しました。アクセス権限を確認してください。");
      isDetectingRef.current = false;
      setIsDetectingState(false);
    }
  }, [isLoading, error, videoElement, detectionLoop]);

  const stopDetection = useCallback((): NormalizedLandmarkList[] => {
    isDetectingRef.current = false;
    setIsDetectingState(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      if (videoElement) {
        videoElement.srcObject = null;
      }
      streamRef.current = null;
    }

    updatePoseDataList(poseDataRecorderRef.current);
    return poseDataRecorderRef.current;
  }, [videoElement, updatePoseDataList]);

  return {
    isDetecting: isDetectingState,
    isLoading,
    error,
    startDetection,
    stopDetection,
    rightWrist,
    leftWrist,
  };
};