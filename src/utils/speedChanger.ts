import { analyze } from "web-audio-beat-detector";

export async function analyzeFileBPM(musicPath: string) {
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(await (await fetch(musicPath)).arrayBuffer());
    console.log("Analyzing BPM...");
    const orig_bpm = await analyze(audioBuffer);
    console.log("Detected BPM: " + orig_bpm);
    audioContext.close();
    return orig_bpm;
}

const beatIntervals: Array<number> = []; // 単位: ms
let lastBeat: Date | null = null;
let beat_count: number = 0;

export function calculatePlaybackRate(orig_bpm: number): number|void {
    console.debug("Beat detected!");
    const now = new Date();
    beat_count += 1;
    console.log(lastBeat, beat_count);
    if (lastBeat && beat_count >= 8) {
        console.log("pushing!");
        beatIntervals.push(now.getTime() - lastBeat.getTime());
        lastBeat = now;
    } else {
        lastBeat = now;
    }
    if (beatIntervals.length > 2) {
        beatIntervals.shift();
        lastBeat = now;
    }
    if (beatIntervals.length > 1) {
        const averageInterval =
            beatIntervals.reduce((prev, curr) => prev + curr, 0) /
            beatIntervals.length;
        lastBeat = now;
        return (60 / (averageInterval / 1000)) / orig_bpm;
    }
}
