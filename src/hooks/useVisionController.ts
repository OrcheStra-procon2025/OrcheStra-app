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
const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

export const useVisionController = (
  videoElement: HTMLVideoElement | null,
): VisionController => {
  // 状態管理
  const { updatePoseDataList } = useGlobalParams();
  const isDetectingRef = useRef<boolean>(false);
  const [isDetectingState, setIsDetectingState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [poseDataRecorder, setPoseDataRecorder] = useState<
    NormalizedLandmarkList[]
  >([]);
  const [rightWrist, setRightWrist] = useState<NormalizedLandmark | null>(null);
  const [leftWrist, setLeftWrist] = useState<NormalizedLandmark | null>(null);

  // 内部インスタンス管理
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ------------------------------------------------
  // 初期化 (モデルロード)
  // ------------------------------------------------

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

    // クリーンアップ
    return () => {
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
      }
    };
  }, [videoElement]);

  const detectionLoop = useCallback(() => {
    if (!isDetectingRef.current || !videoElement || !poseLandmarkerRef.current)
      return;

    const poseResult: PoseLandmarkerResult =
      poseLandmarkerRef.current.detectForVideo(videoElement, performance.now());

    // データ記録
    if (poseResult.landmarks.length > 0) {
      const currentLandmarks = poseResult
        .landmarks[0] as NormalizedLandmarkList;
      setPoseDataRecorder((prevData) => [...prevData, currentLandmarks]);

      const rightWrist = currentLandmarks[KEY_JOINTS_MEDIAPIPE.RIGHT_WRIST];
      const leftWrist = currentLandmarks[KEY_JOINTS_MEDIAPIPE.LEFT_WRIST];
      if (
        rightWrist &&
        rightWrist.visibility !== undefined &&
        rightWrist.visibility > 0.2 &&
        rightWrist.x >= 0 &&
        rightWrist.x <= 1 &&
        rightWrist.y >= 0 &&
        rightWrist.y <= 1
      ) {
        setRightWrist(rightWrist);
      } else {
        setRightWrist(null);
      }

      if (
        leftWrist &&
        leftWrist.visibility !== undefined &&
        leftWrist.visibility > 0.2 &&
        leftWrist.x >= 0 &&
        leftWrist.x <= 1 &&
        leftWrist.y >= 0 &&
        leftWrist.y <= 1
      ) {
        setLeftWrist(leftWrist);
      } else {
        setLeftWrist(null);
      }
    }

    window.requestAnimationFrame(detectionLoop);
  }, [videoElement]);

  const startDetection = useCallback(
    async (deviceId: string) => {
      if (isLoading || error || !videoElement) return;

      try {
        // カメラ開始
        const constraints: MediaStreamConstraints = { video: { deviceId } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream; // StreamをRefに保存

        videoElement.srcObject = stream;
        videoElement.play();

        // データ記録をリセットし、検出を開始
        setPoseDataRecorder([]);
        isDetectingRef.current = true; // Refを即座にtrueにする
        setIsDetectingState(true); // 外部コンポーネントへの通知用

        // 初回ループの開始はloadeddataイベント後に行う（ビデオが準備できてから）
        videoElement.addEventListener("loadeddata", detectionLoop, {
          once: true,
        });
        if (videoElement.readyState >= 2) {
          // 2はHAVE_CURRENT_DATA
          detectionLoop();
        }
      } catch (e) {
        console.error("カメラのアクセスに失敗しました:", e);
        setError(
          "カメラの開始に失敗しました。アクセス権限を確認してください。",
        );
        isDetectingRef.current = false;
        setIsDetectingState(false);
      }
    },
    [isLoading, error, videoElement, detectionLoop],
  );

  const stopDetection = useCallback((): NormalizedLandmarkList[] => {
    isDetectingRef.current = false;
    setIsDetectingState(false);

    // カメラを停止し、Refをクリーンアップ
    const currentStream = streamRef.current;
    if (currentStream) {
      currentStream
        .getTracks()
        .forEach((track: MediaStreamTrack) => track.stop());
      if (videoElement) {
        videoElement.srcObject = null;
      }
      streamRef.current = null;
    }

    updatePoseDataList(poseDataRecorder);

    // 記録されたデータを返す
    return poseDataRecorder;
  }, [poseDataRecorder, videoElement, updatePoseDataList]);

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
