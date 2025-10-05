import type { GrainPlayer } from "tone";
import { analyzeFileBPM, calculatePlaybackRate } from "@/utils/speedChanger";

interface SpeedChanger {
    startChanging: (musicPath: string) => Promise<void>;
    processAccelInfo: (player: GrainPlayer, accel_info: any) => void;
}

// const THRESHOLD = 1.5;

let before_accel = { acc_x: 0, acc_y: 0, acc_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 };
const accelQueue: number[][] = [];
let isProcessingAccelQueue = false;
let after_beat = 0;
let orig_bpm: number | null = null;
let detectingBeat: boolean = false;

const onBeatDetected = (player: GrainPlayer) => {
    const playbackRate = calculatePlaybackRate(orig_bpm!);
    if (playbackRate) {
        player.playbackRate = playbackRate;
    }
};

const processAccelQueue = async (player: GrainPlayer): Promise<void> => {
    if (!isProcessingAccelQueue && accelQueue.length > 0) {
        isProcessingAccelQueue = true;

        while (accelQueue.length > 0) {
            const currentAccelInfo = accelQueue.shift()!;

            if (currentAccelInfo[0] > currentAccelInfo[1] * 1.3) {
                if (!detectingBeat) {
                    detectingBeat = true;
                    onBeatDetected(player);
                }
            } else {
                after_beat += 1;
                if (after_beat > 5) {
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
        const sum_acc =
            Math.abs(accel_info.acc_x) +
            Math.abs(accel_info.acc_y) +
            Math.abs(accel_info.acc_z);

        const before_sum_acc = 
            Math.abs(before_accel.acc_x) +
            Math.abs(before_accel.acc_y) +
            Math.abs(before_accel.acc_z);

        accelQueue.push([sum_acc, before_sum_acc]);
        processAccelQueue(player);
        before_accel = accel_info;
    };

    return { startChanging, processAccelInfo: processAccelInfo };
};