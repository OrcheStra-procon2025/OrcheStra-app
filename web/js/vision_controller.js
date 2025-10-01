import { PoseLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js";

export async function createVisionController(videoElement, canvasElement) {
    const canvasCtx = canvasElement.getContext("2d");
    const poseLandmarker = await createPoseLandmarker();
    let isDetecting = false;
    let poseDataRecorder = [];
    
    async function createPoseLandmarker() {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        return await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`, delegate: "GPU" },
            runningMode: "VIDEO", numPoses: 1
        });
    }

    function detectionLoop() {
        if (!isDetecting) return;
        
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        const poseResult = poseLandmarker.detectForVideo(videoElement, performance.now());
        
        if (poseResult.landmarks.length > 0) {
            poseDataRecorder.push(poseResult.landmarks[0]);
        }
        
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        const drawingUtils = new DrawingUtils(canvasCtx);
        for (const landmarks of poseResult.landmarks) {
            drawingUtils.drawLandmarks(landmarks, { color: '#E1D319', radius: 5 });
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: '#4A5E76', lineWidth: 3 });
        }
        
        window.requestAnimationFrame(detectionLoop);
    }

    return {
        async start(deviceId) {
            isDetecting = true;
            poseDataRecorder = [];
            const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId } });
            videoElement.srcObject = stream;
            videoElement.play();
            videoElement.addEventListener("loadeddata", detectionLoop);
        },
        stop() {
            isDetecting = false;
            if (videoElement.srcObject) {
                videoElement.srcObject.getTracks().forEach(track => track.stop());
                videoElement.srcObject = null;
            }
            return poseDataRecorder;
        }
    };
}