// MediaPipe Visionライブラリから必要なモジュールをインポート
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js";

// --- DOM要素の取得 ---
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("overlayCanvas");
const canvasCtx = canvasElement.getContext("2d");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const feedbackDiv = document.getElementById("feedbackResult");

// --- グローバル変数 ---
let poseLandmarker;
let isDetecting = false;
let poseDataRecorder = []; // 骨格データを記録する配列
let aiModel;
let scalerInfo;

// --- AI関連の定数 (学習時と全く同じ値) ---
const MAX_TIMESTEPS = 150;
const NUM_FEATURES = 12;
const KEY_JOINTS_MEDIAPIPE = {
    RIGHT_WRIST: 16, LEFT_WRIST: 15,
    RIGHT_ELBOW: 14, LEFT_ELBOW: 13
};
// ★★★★★ TODO: あなたのscaler.jsonの値をここに貼り付け ★★★★★
const SCALER_MEAN = [0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5]; // 仮の値
const SCALER_SCALE = [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2]; // 仮の値

/**
 * メインの初期化関数
 */
async function initialize() {
    // MediaPipeのモデルを初期化
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1
    });

    // AIモデルを読み込み
    aiModel = await tf.loadLayersModel('./data/tfjs_model/model.json');
    // スケーラー情報を読み込み
    const response = await fetch('./data/scaler.json');
    scalerInfo = await response.json();

    SCALER_MEAN = scalerInfo.mean;
    SCALER_SCALE = scalerInfo.scale;

    feedbackDiv.textContent = "準備完了！「指揮を開始」ボタンを押してください。";
    startButton.disabled = false;

    console.log("初期化完了");
}

/**
 * 骨格推定と描画のループ
 */
function detectionLoop() {
    if (!isDetecting) return;

    const startTimeMs = performance.now();
    const poseLandmarkerResult = poseLandmarker.detectForVideo(video, startTimeMs);

    // 骨格データを記録
    if (poseLandmarkerResult.landmarks.length > 0) {
        poseDataRecorder.push(poseLandmarkerResult.landmarks[0]);
    }

    // 描画処理
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const drawingUtils = new DrawingUtils(canvasCtx);
    for (const landmarks of poseLandmarkerResult.landmarks) {
        drawingUtils.drawLandmarks(landmarks, { radius: 5 });
        drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);
    }

    // 次のフレームでループを継続
    window.requestAnimationFrame(detectionLoop);
}

/**
 * Webカメラの起動と骨格推定の開始
 */
async function startWebcamAndDetection() {
    if (!navigator.mediaDevices?.getUserMedia) {
        alert("お使いのブラウザはカメラ機能に対応していません。");
        return;
    }
    
    isDetecting = true;
    startButton.disabled = true;
    stopButton.disabled = false;
    poseDataRecorder = []; // 記録をリセット

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.addEventListener("loadeddata", () => {
            canvasElement.width = video.videoWidth;
            canvasElement.height = video.videoHeight;
            detectionLoop();
        });

        // 5秒後に評価を実行
        setTimeout(stopAndGetFeedback, 5000);

    } catch (err) {
        console.error("カメラの起動に失敗しました:", err);
        isDetecting = false;
        startButton.disabled = false;
        stopButton.disabled = true;
    }
}

/**
 * 骨格推定を停止し、AIフィードバックを取得
 */
async function stopAndGetFeedback() {
    isDetecting = false;
    stopButton.disabled = true;
    feedbackDiv.textContent = "AIがあなたの指揮を分析中です...";

    if (poseDataRecorder.length < 10) {
        feedbackDiv.textContent = "動きが短すぎたため、評価できませんでした。";
        startButton.disabled = false;
        return;
    }

    // AIによる予測を実行
    const feedback = await getAIFeedback(poseDataRecorder);
    feedbackDiv.textContent = feedback;

    // カメラを停止
    video.srcObject.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    startButton.disabled = false;
}

/**
 * AIに入力するデータを前処理する関数
 */
function preprocessData(livePoseData) {
    const sequence = livePoseData.map(frame => {
        const rh = frame[KEY_JOINTS_MEDIAPIPE.RIGHT_WRIST];
        const lh = frame[KEY_JOINTS_MEDIAPIPE.LEFT_WRIST];
        const re = frame[KEY_JOINTS_MEDIAPIPE.RIGHT_ELBOW];
        const le = frame[KEY_JOINTS_MEDIAPIPE.LEFT_ELBOW];
        return [rh.x, rh.y, rh.z, lh.x, lh.y, lh.z, re.x, re.y, re.z, le.x, le.y, le.z];
    });

    let paddedSequence = Array.from({ length: MAX_TIMESTEPS }, () => Array(NUM_FEATURES).fill(0));
    const length = Math.min(sequence.length, MAX_TIMESTEPS);
    for (let i = 0; i < length; i++) {
        paddedSequence[i] = sequence[i];
    }

    for (let i = 0; i < paddedSequence.length; i++) {
        for (let j = 0; j < paddedSequence[i].length; j++) {
            // ★★★★★ TODO: scalerInfoから読み込んだ値を使うように修正 ★★★★★
            paddedSequence[i][j] = (paddedSequence[i][j] - SCALER_MEAN[j]) / SCALER_SCALE[j];
        }
    }
    return paddedSequence;
}

/**
 * AIによる予測を実行し、結果を返すメイン関数
 */
async function getAIFeedback(livePoseData) {
    const processedData = preprocessData(livePoseData);
    const inputTensor = tf.tensor3d([processedData]);
    const prediction = aiModel.predict(inputTensor);
    const predictedIndex = prediction.argMax(-1).dataSync()[0];

    // ★★★★★ TODO: あなたの学習済みラベルに合わせてフィードバック内容を定義 ★★★★★
    const feedbackLabels = {
        5: "手を振るような、滑らかな動きでしたね！",
        48: "応援するような、元気な動きでした！",
        // ... 他のラベル (0から59まで) もここに追加 ...
    };
    
    const feedbackText = feedbackLabels[predictedIndex] || `認識ID ${predictedIndex + 1} の動きです。`;
    
    inputTensor.dispose();
    prediction.dispose();
    return feedbackText;
}

// --- イベントリスナーの設定 ---
startButton.addEventListener("click", startWebcamAndDetection);
stopButton.addEventListener("click", stopAndGetFeedback);

// --- 初期化処理の実行 ---
initialize();