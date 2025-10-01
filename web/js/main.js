import { createVisionController } from './vision_controller.js';
import { createAiAnalyzer } from './ai_analyzer.js';

document.addEventListener('DOMContentLoaded', async () => {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('overlayCanvas');
    const cameraSelect = document.getElementById('cameraSelect');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const feedbackScreen = document.getElementById('feedback-screen');
    const feedbackResult = document.getElementById('feedbackResult');
    const feedbackLoader = document.getElementById('feedback-loader');
    const retryButton = document.getElementById('retryButton');

    const vision = await createVisionController(video, canvas);
    const analyzer = await createAiAnalyzer();

    // カメラ一覧
    async function setupCameraSelector() {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        devices.filter(d => d.kind === 'videoinput').forEach(d => {
            const op = document.createElement('option');
            op.value = d.deviceId;
            op.textContent = d.label || `Camera ${cameraSelect.length + 1}`;
            cameraSelect.appendChild(op);
        });
        startButton.disabled = false;
    }

    async function start() {
        startButton.disabled = true;
        stopButton.classList.remove('hidden');
        await vision.start(cameraSelect.value);
    }

    async function stop() {
        stopButton.classList.add('hidden');
        feedbackScreen.classList.remove('hidden');
        feedbackLoader.classList.remove('hidden');

        const poseData = vision.stop();
        const feedbackText = await analyzer.analyze(poseData);

        feedbackLoader.classList.add('hidden');
        feedbackResult.textContent = feedbackText;
        retryButton.classList.remove('hidden');
    }

    retryButton.addEventListener('click', () => {
        feedbackScreen.classList.add('hidden');
        feedbackResult.textContent = '';
        retryButton.classList.add('hidden');
    });

    startButton.addEventListener('click', start);
    stopButton.addEventListener('click', stop);

    setupCameraSelector();
});
