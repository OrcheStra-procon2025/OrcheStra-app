import { analyze } from "web-audio-beat-detector";

export async function analyzeFileBPM(musicPath: string) {
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(
    await (await fetch(musicPath)).arrayBuffer(),
  );
  console.log("Analyzing BPM...");
  const orig_bpm = await analyze(audioBuffer);
  console.log("Detected BPM: " + orig_bpm);
  audioContext.close();
  return orig_bpm;
}

const beatIntervals: Array<number> = []; // 単位: ms
let lastBeat: Date | null = null;
let lastBPM: number | null = null;
let lastVolume: number | null = null;
let beat_count: number = 0;

export function calculatePlaybackRate(orig_bpm: number): number | void {
  const now = new Date();
  if (lastBeat && now.getTime() - lastBeat.getTime() < 100) {
    return;
  }
  console.debug("Beat detected!");
  beat_count += 1;
  console.log(lastBeat, beat_count);
  if (lastBeat && beat_count >= 8) {
    beatIntervals.push(now.getTime() - lastBeat.getTime());
    lastBeat = now;
  } else {
    lastBeat = now;
  }
  if (beatIntervals.length > 4) {
    beatIntervals.shift();
    lastBeat = now;
  }
  if (beatIntervals.length > 1) {
    const averageInterval =
      beatIntervals.reduce((prev, curr) => prev + curr, 0) /
      beatIntervals.length;
    lastBeat = now;
    const baseBPM = 60 / (averageInterval / 1000);
    let calculatedBPM;
    if (lastBPM) {
      calculatedBPM = baseBPM + (baseBPM - lastBPM) * 0.25;
    } else {
      calculatedBPM = baseBPM;
    }
    console.log("BPM: " + calculatedBPM);
    console.log(calculatedBPM / orig_bpm);
    return calculatedBPM / orig_bpm;
  }
}

export function calculateVolumeRate(detectingSumAcc: number[]): number {
  const detectingSumAccAvg =
    detectingSumAcc.reduce((prev, curr) => prev + curr, 0) /
    detectingSumAcc.length;
  const baseVolume = (detectingSumAccAvg - 4.0) / 3.0; // sumAccは4.0以上しか想定されない
  let calculatedVolume: number;
  console.debug("base vol.: " + baseVolume);
  if (lastVolume) {
    calculatedVolume = baseVolume + (baseVolume - lastVolume) * 0.25;
  } else {
    calculatedVolume = baseVolume;
  }
  lastVolume = calculatedVolume;
  console.log("Volume: " + calculatedVolume * 100 + "%");
  return calculatedVolume;
}
