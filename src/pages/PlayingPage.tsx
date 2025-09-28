// App.jsx
import { useEffect, useRef, useState } from "react";
import "./style.css";

// MediaPipe Visionライブラリ
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraSelectRef = useRef(null);

  const [poseLandmarker, setPoseLandmarker] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [poseDataRecorder, setPoseDataRecorder] = useState([]);
  const [lastVideoTime, setLastVideoTime] = useState(-1);
  const [feedback, setFeedback] = useState(
    "準備完了！使用するカメラを選んで「指揮を開始」ボタンを押してください。"
  );

  const [startDisabled, setStartDisabled] = useState(true);
  const [stopDisabled, setStopDisabled] = useState(true);

  // カメラ選択セットアップ
  async function setupCameraSelector() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === "videoinput");
    if (videoDevices.length === 0) {
      alert("カメラが見つかりません。");
      return;
    }
    const select = cameraSelectRef.current;
    select.innerHTML = "";
    videoDevices.forEach((device, idx) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.innerText = device.label || `Camera ${idx + 1}`;
      select.appendChild(option);
    });
  }

  // 初期化処理
  async function initialize() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });
    setPoseLandmarker(landmarker);
    await setupCameraSelector();
    setFeedback(
      "準備完了！使用するカメラを選んで「指揮を開始」ボタンを押してください。"
    );
    setStartDisabled(false);
    console.log("初期化完了");
  }

  // Webカメラ開始 & 検出開始
  async function startWebcamAndDetection() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const select = cameraSelectRef.current;

    const constraints = {
      video: { deviceId: { exact: select.value } },
    };

    setIsDetecting(true);
    setStartDisabled(true);
    setStopDisabled(false);
    select.disabled = true;
    setFeedback("指揮をしてください...");
    setPoseDataRecorder([]);

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    video.onloadeddata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      detectionLoop();
    };
  }

  // 骨格推定ループ
  function detectionLoop() {
    if (!isDetecting || !poseLandmarker) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const videoTime = video.currentTime;
    if (videoTime !== lastVideoTime) {
      setLastVideoTime(videoTime);

      const result = poseLandmarker.detectForVideo(video, performance.now());

      if (result.landmarks && result.landmarks.length > 0) {
        setPoseDataRecorder((prev) => [...prev, result.landmarks[0]]);
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const drawingUtils = new DrawingUtils(ctx);
      for (const landmarks of result.landmarks) {
        drawingUtils.drawLandmarks(landmarks, { color: "#E1D319", radius: 5 });
        drawingUtils.drawConnectors(
          landmarks,
          PoseLandmarker.POSE_CONNECTIONS,
          { color: "#4A5E76", lineWidth: 3 }
        );
      }
    }

    requestAnimationFrame(detectionLoop);
  }

  // 停止処理
  function stopAndReset() {
    setIsDetecting(false);
    setStartDisabled(false);
    setStopDisabled(true);
    cameraSelectRef.current.disabled = false;
    setFeedback("AIからのフィードバック待機中...");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.srcObject) {
      video.srcObject.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  useEffect(() => {
    initialize();
  }, []);

  return (
    <div>
      <h1>Orchestra - 指揮者体験システム</h1>

      <div className="vision-container">
        <video ref={videoRef} autoPlay playsInline muted />
        <canvas ref={canvasRef}></canvas>
      </div>

      <div className="controls">
        <select ref={cameraSelectRef}></select>
        <button onClick={startWebcamAndDetection} disabled={startDisabled}>
          指揮を開始
        </button>
        <button onClick={stopAndReset} disabled={stopDisabled}>
          評価を実行
        </button>
      </div>

      <div className="feedback-container">
        <h2>AIによるフィードバック</h2>
        <div id="feedbackResult">{feedback}</div>
        <button onClick={initialize}>もう一度試す</button>
      </div>
    </div>
  );
}
