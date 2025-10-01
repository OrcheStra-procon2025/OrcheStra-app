// MediaPipe Visionライブラリから必要なモジュールをインポート
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js";

// ★★★ DOMContentLoadedイベントを待ってから、すべての処理を開始する ★★★
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM要素の取得 (イベントリスナーの中に移動) ---
    const video = document.getElementById("webcam");
    const canvasElement = document.getElementById("overlayCanvas");
    const canvasCtx = canvasElement.getContext("2d");
    const cameraSelect = document.getElementById("cameraSelect");
    const startButton = document.getElementById("startButton");
    const stopButton = document.getElementById("stopButton");
    const feedbackDiv = document.getElementById("feedbackResult");

    // --- グローバル変数 ---
    let poseLandmarker;
    let isDetecting = false;
    let poseDataRecorder = [];
    let lastVideoTime = -1;

    // --- 関数定義 (ここから下は変更ありません) ---

    /**
     * カメラ選択メニューをセットアップする
     */
    async function setupCameraSelector() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (videoDevices.length === 0) {
            alert("カメラが見つかりません。");
            return;
        }

        videoDevices.forEach(device => {
            const option = document.createElement("option");
            option.value = device.deviceId;
            option.innerText = device.label || `Camera ${cameraSelect.children.length + 1}`;
            cameraSelect.appendChild(option);
        });
    }

    /**
     * メインの初期化関数
     */
    async function initialize() {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
                delegate: "GPU",
            },
            runningMode: "VIDEO",
            numPoses: 1
        });

        await setupCameraSelector();

        feedbackDiv.textContent = "準備完了！使用するカメラを選んで「指揮を開始」ボタンを押してください。";
        startButton.disabled = false;
        console.log("初期化完了");
    }

    /**
     * Webカメラの起動と骨格推定の開始
     */
    async function startWebcamAndDetection() {
        // (この関数の中身は変更ありません)
        const selectedDeviceId = cameraSelect.value;
        const constraints = { video: { deviceId: { exact: selectedDeviceId } } };
        
        isDetecting = true;
        startButton.disabled = true;
        stopButton.disabled = false;
        cameraSelect.disabled = true;
        feedbackDiv.textContent = "指揮をしてください...";
        poseDataRecorder = [];

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.addEventListener("loadeddata", () => {
            canvasElement.width = video.videoWidth;
            canvasElement.height = video.videoHeight;
            detectionLoop();
        });
    }

    /**
 * 骨格推定と描画のメインループ (タイミング問題対策版)
 */
function detectionLoop() {
    if (!isDetecting) return;

    // 現在のビデオ再生時間を取得
    const videoTime = video.currentTime;

    // ★ 新しいフレームが利用可能な場合のみ、処理を実行
    if (videoTime !== lastVideoTime) {
        lastVideoTime = videoTime;

        // MediaPipeの処理を実行
        const poseLandmarkerResult = poseLandmarker.detectForVideo(video, performance.now());

        // 骨格データを記録
        if (poseLandmarkerResult.landmarks && poseLandmarkerResult.landmarks.length > 0) {
            poseDataRecorder.push(poseLandmarkerResult.landmarks[0]);
        }

        // 描画処理
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        const drawingUtils = new DrawingUtils(canvasCtx);
        for (const landmarks of poseLandmarkerResult.landmarks) {
            drawingUtils.drawLandmarks(landmarks, { color: '#E1D319', radius: 5 });
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: '#4A5E76', lineWidth: 3 });
        }
    }

    // 次のフレームでこの関数を再度呼び出す
    window.requestAnimationFrame(detectionLoop);
}
    /**
     * 骨格推定を停止し、UIをリセット
     */
    function stopAndReset() {
        // (この関数の中身は getAIFeedback 以外は同じ)
        isDetecting = false;
        startButton.disabled = false;
        stopButton.disabled = true;
        cameraSelect.disabled = false; 
        feedbackDiv.textContent = "AIからのフィードバック待機中...";
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }

    // --- イベントリスナーの設定 ---
    startButton.addEventListener("click", startWebcamAndDetection);
    stopButton.addEventListener("click", stopAndReset);

    // --- 初期化処理の実行 ---
    initialize();

}); // ★★★ DOMContentLoadedの閉じカッコ ★★★