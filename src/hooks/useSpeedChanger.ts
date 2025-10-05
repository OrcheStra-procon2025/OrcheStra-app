import type { GrainPlayer } from "tone";
import { analyzeFileBPM, calculatePlaybackRate } from "@/utils/speedChanger";

interface SpeedChanger {
    startChanging: (musicPath: string) => Promise<void>;
    processAccelInfo: (player: GrainPlayer, accel_info: any) => void;
}

const THRESHOLD = 1.5;

let before_accel = { acc_x: 0, acc_y: 0, acc_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 };
const accelQueue: number[] = [];
let isProcessingAccelQueue = false;
let after_beat = 0;
let orig_bpm: number | null = null;
let detectingBeat: boolean = false;

const onBeatDetected = (accelDelta: number, player: GrainPlayer) => {
    const playbackRate = calculatePlaybackRate(orig_bpm!);
    if (playbackRate) {
        player.playbackRate = playbackRate;
    }
};

const processAccelQueue = async (player: GrainPlayer): Promise<void> => {
    if (!isProcessingAccelQueue && accelQueue.length > 0) {
        isProcessingAccelQueue = true;

        while (accelQueue.length > 0) {
            const currentAccelDelta = accelQueue.shift()!;

            if (currentAccelDelta > THRESHOLD) {
                if (!detectingBeat) {
                    detectingBeat = true;
                    onBeatDetected(currentAccelDelta, player);
                }
            } else {
                after_beat += 1;
                if (after_beat > 4) {
                    after_beat = 0;
                    detectingBeat = false;
                }
            }

            // 他の処理がブロックされないよう、少し待機
            await new Promise((resolve) => setTimeout(resolve, 0));
        }

        isProcessingAccelQueue = false;
    }
};

export const useSpeedChanger = (): SpeedChanger => {

    const startChanging = async (musicPath: string) => {
        orig_bpm = await analyzeFileBPM(musicPath);
    };

    const processAccelInfo = (player: GrainPlayer, accel_info: any) => {
        const sum_acc_delta =
            Math.abs(accel_info.acc_x - before_accel.acc_x) +
            Math.abs(accel_info.acc_y - before_accel.acc_y) +
            Math.abs(accel_info.acc_z - before_accel.acc_z);

        accelQueue.push(sum_acc_delta);
        processAccelQueue(player);
        before_accel = accel_info;
    };

    return { startChanging, processAccelInfo: processAccelInfo };
};