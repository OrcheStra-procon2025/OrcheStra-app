import type { NormalizedLandmark } from "@mediapipe/pose";

export type MotionData = {
  distance: number;
  speed: number;
  rawLandmarks: NormalizedLandmark[];
};
