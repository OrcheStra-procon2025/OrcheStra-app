// src/utils/aiHelper.ts
import type { NormalizedLandmarkList, ScalerInfoModel } from "@/utils/models";
import { ID_TO_STYLE_REMAP, KEY_JOINTS_MEDIAPIPE } from "./aiConstants";

export const computeLabelWeights = (): number[] => {
  const counts: { [key: string]: number } = {};
  Object.values(ID_TO_STYLE_REMAP).forEach((s) => {
    counts[s] = (counts[s] || 0) + 1;
  });
  const weights: number[] = [];
  for (const id in ID_TO_STYLE_REMAP) {
    const style = ID_TO_STYLE_REMAP[id];
    weights.push(1 / counts[style]);
  }
  return weights;
};

export const computeWeightedAverageProbs = (
  allProbs: number[][],
  labelWeights: number[],
): number[] => {
  if (!allProbs.length) return [];
  const numLabels = allProbs[0].length;
  const summed = new Array(numLabels).fill(0);

  for (const probs of allProbs) {
    for (let i = 0; i < numLabels; i++) {
      summed[i] += probs[i] * labelWeights[i];
    }
  }

  const numChunks = allProbs.length;
  const averaged = summed.map((s) => s / numChunks);
  const totalProb = averaged.reduce((a, b) => a + b, 0);
  if (totalProb === 0) return averaged;
  return averaged.map((p) => p / totalProb);
};

export const calculateAllDynamics = (
  poseData: NormalizedLandmarkList[],
): { movement: number; rhythm: number } => {
  if (poseData.length < 3) return { movement: 0, rhythm: 0 };
  const keyJoints = [
    KEY_JOINTS_MEDIAPIPE.RIGHT_WRIST,
    KEY_JOINTS_MEDIAPIPE.LEFT_WRIST,
  ];
  const velocities: number[] = [];
  let totalDistance = 0;

  for (let i = 1; i < poseData.length; i++) {
    let frameDistance = 0;
    for (const jointId of keyJoints) {
      const p1 = poseData[i - 1][jointId];
      const p2 = poseData[i][jointId];
      if (p1 && p2)
        frameDistance += Math.sqrt(
          Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2),
        );
    }
    velocities.push(frameDistance / keyJoints.length);
    totalDistance += frameDistance;
  }

  let totalAcceleration = 0;
  for (let i = 1; i < velocities.length; i++)
    totalAcceleration += Math.abs(velocities[i] - velocities[i - 1]);

  if (velocities.length === 0) return { movement: 0, rhythm: 0 };

  const avgVelocity = totalDistance / velocities.length / keyJoints.length;
  const avgAcceleration = totalAcceleration / (velocities.length - 1);

  const movementScore = avgVelocity * 1.0 + avgAcceleration * 1.5;
  const normalizedMovement = Math.min(1.0, movementScore / 0.05);

  const ACCELERATION_SCALE = 0.01;
  const normalizedRhythm = Math.min(1.0, avgAcceleration / ACCELERATION_SCALE);

  return {
    movement: normalizedMovement * 100,
    rhythm: normalizedRhythm * 100,
  };
};

export const preprocessData = (
  landmarks: NormalizedLandmarkList,
  scaler: ScalerInfoModel,
): number[] => {
  const rh = landmarks[KEY_JOINTS_MEDIAPIPE.RIGHT_WRIST],
    lh = landmarks[KEY_JOINTS_MEDIAPIPE.LEFT_WRIST],
    re = landmarks[KEY_JOINTS_MEDIAPIPE.RIGHT_ELBOW],
    le = landmarks[KEY_JOINTS_MEDIAPIPE.LEFT_ELBOW];
  if (!rh || !lh || !re || !le) return Array(12).fill(0);
  const raw = [
    rh.x,
    rh.y,
    rh.z,
    lh.x,
    lh.y,
    lh.z,
    re.x,
    re.y,
    re.z,
    le.x,
    le.y,
    le.z,
  ];
  return raw.map((v, i) => (v - scaler.mean[i]) / scaler.scale[i]);
};

export const smoothLandmarks = (
  poseData: NormalizedLandmarkList[],
  windowSize = 5,
): NormalizedLandmarkList[] => {
  if (poseData.length < windowSize) return poseData;
  const indices = [
    KEY_JOINTS_MEDIAPIPE.RIGHT_WRIST,
    KEY_JOINTS_MEDIAPIPE.LEFT_WRIST,
    KEY_JOINTS_MEDIAPIPE.RIGHT_ELBOW,
    KEY_JOINTS_MEDIAPIPE.LEFT_ELBOW,
  ];
  return poseData.map((frame, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const window = poseData.slice(start, i + 1);
    const newFrame = structuredClone(frame);
    for (const idx of indices) {
      if (!newFrame[idx]) continue;
      const mean = { x: 0, y: 0, z: 0 };
      for (const w of window) {
        mean.x += w[idx]?.x || 0;
        mean.y += w[idx]?.y || 0;
        mean.z += w[idx]?.z || 0;
      }
      mean.x /= window.length;
      mean.y /= window.length;
      mean.z /= window.length;
      newFrame[idx] = mean;
    }
    return newFrame;
  });
};
