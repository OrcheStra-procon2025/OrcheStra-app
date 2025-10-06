import type { GrainPlayer } from "tone";
import { analyzeFileBPM, calculatePlaybackRate } from "@/utils/speedChanger";

interface SpeedChanger {
    startChanging: (musicPath: string) => Promise<void>;
    processAccelInfo: (player: GrainPlayer, accel_info: any) => void;
}

const STOPBEAT_THRESHOLD = 1.4;
const STARTBEAT_THRESHOLD = 2.0;

let accelQueue: number[][] = [];
let isProcessingAccelQueue: boolean = false;
let origBPM: number | null = null;
let detectingBeat: boolean = false;
let beforeAccel = { acc_x: 0, acc_y: 0, acc_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 };

export const useSpeedChanger = (): SpeedChanger => {
    const onBeatDetected = (player: GrainPlayer) => {
        console.log(origBPM);
        const playbackRate = calculatePlaybackRate(origBPM!);
        if (playbackRate) {
            if (playbackRate < 0.5) {
                player.grainSize = 0.01;
            } else {
                player.grainSize = 0.1;
            }
            player.playbackRate = playbackRate;
        }
    };

    const processAccelQueue = async (player: GrainPlayer): Promise<void> => {
        if (!isProcessingAccelQueue && accelQueue.length > 0) {
            isProcessingAccelQueue = true;

            while (accelQueue.length > 0) {
                const currentAccelInfo = accelQueue.shift()!;
                //console.log(currentAccelInfo[0]);
                //console.log(currentAccelInfo[0] > STARTBEAT_THRESHOLD);
                if (currentAccelInfo[0] > STARTBEAT_THRESHOLD) {
                    if (!detectingBeat) {
                        console.log("Detected Beat!");
                        detectingBeat = true;
                        onBeatDetected(player);
                    }
                } else if (currentAccelInfo[0] < STOPBEAT_THRESHOLD) {
                    detectingBeat = false;
                }

                // 他の処理がブロックされないよう、少し待機
                await new Promise((resolve) => setTimeout(resolve, 0));
            }

            isProcessingAccelQueue = false;
        }
};

    const startChanging = async (musicPath: string) => {
        origBPM = await analyzeFileBPM(musicPath);
        console.debug("updated origBPM!")
    };

    const processAccelInfo = (player: GrainPlayer, accel_info: any) => {
        const sum_acc =
            Math.abs(accel_info.acc_x) +
            Math.abs(accel_info.acc_y) +
            Math.abs(accel_info.acc_z);

        const before_sum_acc = 
            Math.abs(beforeAccel.acc_x) +
            Math.abs(beforeAccel.acc_y) +
            Math.abs(beforeAccel.acc_z);

        accelQueue.push([sum_acc, before_sum_acc]);
        processAccelQueue(player);
        beforeAccel = accel_info;
    };

    return { startChanging, processAccelInfo: processAccelInfo };
};
