import type { GrainPlayer } from "tone";
import {
  analyzeFileBPM,
  calculatePlaybackRate,
  calculateVolumeRate,
} from "@/utils/musicChanger";

interface MusicChanger {
  startChanging: (musicPath: string) => Promise<void>;
  processAccelInfo: (player: GrainPlayer, accel_info: any) => void;
}

const STOPBEAT_THRESHOLD = 2.8;
const STARTBEAT_THRESHOLD = 4.0;

let pendingSumAcc: any[] = []; // 今回検出した拍についてのSumAcc
let beforeSumAcc: number | null = null; // 前回に検出した拍についてのSumAcc
let detectingSumAcc: number[] = []; // 現在検出中（継続中）の拍についてのSumAcc
let accelQueue: number[][] = []; // 加速度情報処理用のキュー
let isProcessingAccelQueue: boolean = false; // ↑のロック
let origBPM: number | null = null; // 原曲のBPM（再生前に算出）
let detectingBeat: boolean = false; // 現在拍が検出中（継続中）であるかどうか

export const useMusicChanger = (): MusicChanger => {
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
  const onBeatFinished = (player: GrainPlayer) => {
    player.volume.value = calculateVolumeRate(detectingSumAcc);
  };

  const processAccelQueue = async (player: GrainPlayer): Promise<void> => {
    if (!isProcessingAccelQueue && accelQueue.length > 0) {
      isProcessingAccelQueue = true;

      while (accelQueue.length > 0) {
        const currentAccelInfo = accelQueue.shift()!;
        //console.log(currentAccelInfo[0]);
        //console.log(currentAccelInfo[0] > STARTBEAT_THRESHOLD);
        if (currentAccelInfo[0] > STARTBEAT_THRESHOLD) {
          detectingSumAcc.push(currentAccelInfo[0]);
          if (!detectingBeat) {
            console.log("Detected Beat!");
            detectingBeat = true;
            onBeatDetected(player);
          }
        } else if (currentAccelInfo[0] < STOPBEAT_THRESHOLD) {
          if (detectingBeat) {
            onBeatFinished(player);
          }
          detectingBeat = false;
          detectingSumAcc = [];
        }

        // 他の処理がブロックされないよう、少し待機
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      isProcessingAccelQueue = false;
    }
  };

  const startChanging = async (musicPath: string) => {
    origBPM = await analyzeFileBPM(musicPath);
    console.debug("updated origBPM!");
  };

  const processAccelInfo = (player: GrainPlayer, accel_info: any) => {
    const sum_acc =
      Math.abs(accel_info.acc_x) +
      Math.abs(accel_info.acc_y) +
      Math.abs(accel_info.acc_z);

    pendingSumAcc.push(sum_acc);

    if (pendingSumAcc.length >= 2) {
      const sumAcc = pendingSumAcc.reduce((prev, curr) => prev + curr);
      accelQueue.push([sumAcc, beforeSumAcc]);
      pendingSumAcc = [];
      processAccelQueue(player);
      beforeSumAcc = sumAcc;
    }
  };

  return { startChanging, processAccelInfo };
};
