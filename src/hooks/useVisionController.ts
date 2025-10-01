import { useState, useEffect, useRef, useCallback } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import type { NormalizedLandmarkList } from "@/utils/models";

interface VisionController {
  /** 骨格検出が有効かどうか */
  isDetecting: boolean;
  /** MediaPipeとカメラのロード状態 */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 検出を開始し、ポーズデータの記録を開始する */
  startDetection: (deviceId: string) => Promise<void>;
  /** 検出を停止し、記録されたポーズデータを返す */
  stopDetection: () => NormalizedLandmarkList[];
}

const MODEL_PATH = `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`;
const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

export const useVisionController = (
  videoElement: HTMLVideoElement | null,
  canvasElement: HTMLCanvasElement | null,
): VisionController => {
  // 状態管理
  const isDetectingRef = useRef<boolean>(false);
  const [isDetectingState, setIsDetectingState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [poseDataRecorder, setPoseDataRecorder] = useState<
    NormalizedLandmarkList[]
  >([]);

  // 内部インスタンス管理
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ------------------------------------------------
  // 初期化 (モデルロード)
  // ------------------------------------------------

  useEffect(() => {
    if (!canvasElement || !videoElement) return;

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
  }, [canvasElement, videoElement]);

  const detectionLoop = useCallback(() => {
    if (
      !isDetectingRef.current ||
      !videoElement ||
      !canvasElement ||
      !poseLandmarkerRef.current
    )
      return;
    if (!canvasElement) return;

    const canvasCtx = canvasElement.getContext("2d");
    if (!canvasCtx) return;

    // 検出処理
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    const poseResult: PoseLandmarkerResult =
      poseLandmarkerRef.current.detectForVideo(videoElement, performance.now());

    // データ記録
    if (poseResult.landmarks.length > 0) {
      setPoseDataRecorder((prevData) => [
        ...prevData,
        poseResult.landmarks[0] as NormalizedLandmarkList,
      ]);
    }

    // 描画処理
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
  }, [videoElement, canvasElement]);

  const startDetection = useCallback(
    async (deviceId: string) => {
      if (isLoading || error || !videoElement || !canvasElement) return;

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
    [isLoading, error, videoElement, canvasElement, detectionLoop],
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

    // 記録されたデータを返す
    return poseDataRecorder;
  }, [poseDataRecorder, videoElement]);

  return {
    isDetecting: isDetectingState,
    isLoading,
    error,
    startDetection,
    stopDetection,
  };
};
