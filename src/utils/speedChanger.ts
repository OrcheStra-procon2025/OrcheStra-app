import { analyze } from "web-audio-beat-detector";
import type { GrainPlayer } from "tone";

const THRESHOLD = 1.2; // 加速度しきい値

export async function changeSpeed(player: GrainPlayer, musicPath: string) {
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(await (await fetch(musicPath)).arrayBuffer());
    console.log("Analyzing BPM...");
    const orig_bpm = await analyze(audioBuffer);
    console.log("Detected BPM: " + orig_bpm);
    audioContext.close();

    var beatIntervals: Array<number> = []; // 単位: ms
    var lastBeat: Date | null = null;
    var beat_count: number = 0;

    function onBeatDetected(beatStrong: number) {
        // 拍が検出されたときの処理
        console.log("Detected beat: " + beatStrong);
        const now = new Date();
        beat_count += 1;
        if (lastBeat && beat_count >= 8) {
            beatIntervals.push(now.getTime() - lastBeat.getTime());
        }
        if (beatIntervals.length > 2) {
            beatIntervals.shift();
        }
        if (beatIntervals.length > 1) {
            const averageInterval =
                beatIntervals.reduce((prev, curr) => prev + curr, 0) /
                beatIntervals.length;
            console.log("Speed change: " + (60 / (averageInterval / 1000)) / orig_bpm + "x");
            player.playbackRate = (60 / (averageInterval / 1000)) / orig_bpm;
            console.log(beatIntervals);
        }
        lastBeat = now;
    }

    const socket = new WebSocket("ws://10.71.170.56"); // 仮
    let before_accel = {
        acc_x: 0,
        acc_y: 0,
        acc_z: 0,
        gyro_x: 0,
        gyro_y: 0,
        gyro_z: 0,
    };
    let now_beat = 0;
    let beat_strong = 0;
    let after_beat = 0;

    // 加速度のキュー処理
    const beatQueue: number[] = [];
    let isProcessing = false;

    const processBeatQueue = async () => {
        if (isProcessing || beatQueue.length === 0) {
            return;
        }

        isProcessing = true;

        while (beatQueue.length > 0) {
            const currentBeatStrong = beatQueue.shift()!;

            after_beat += 1;
            if (after_beat == 1) {
                onBeatDetected(currentBeatStrong);
            }
            if (after_beat > 10) {
                now_beat += 1;
                beat_strong = 0;
                after_beat = 0;
            }

            // 他の処理がブロックされないよう、少し待機
            await new Promise((resolve) => setTimeout(resolve, 0));
        }

        isProcessing = false;
    };

    socket.addEventListener("open", () => {
        console.log("WS connected!");
    });

    socket.addEventListener("message", (event) => {
        const accel_info = JSON.parse(event.data);
        // const sum_gyro_delta = Math.abs(accel_info.gyro_x - before_accel.gyro_x) + Math.abs(accel_info.gyro_y - before_accel.gyro_y) + Math.abs(accel_info.gyro_z - before_accel.gyro_z);
        const sum_acc_delta =
            Math.abs(accel_info.acc_x - before_accel.acc_x) +
            Math.abs(accel_info.acc_y - before_accel.acc_y) +
            Math.abs(accel_info.acc_z - before_accel.acc_z);

        if (sum_acc_delta > THRESHOLD) {
        beat_strong += sum_acc_delta;
        } else {
            if (beat_strong > 0) {
                beatQueue.push(beat_strong);
                processBeatQueue();
            }
        }
        before_accel = accel_info;
    });
}
