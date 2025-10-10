import { useState, useEffect, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import type { NormalizedLandmarkList, ScalerInfoModel } from "@/utils/models";

interface ProgressBarData {
  labelLeft: string;
  labelRight: string;
  value: number;
}

// --- 定数定義 ---
const KEY_JOINTS_MEDIAPIPE = {
  RIGHT_WRIST: 16,
  LEFT_WRIST: 15,
  RIGHT_ELBOW: 14,
  LEFT_ELBOW: 13,
};

const ID_TO_STYLE_MAP: { [key: number]: string } = {
  0: "穏やか", 1: "穏やか", 2: "細やか", 3: "細やか", 4: "激しい", 5: "滑らか",
  6: "細やか", 7: "細やか", 8: "細やか", 9: "細やか", 10: "細やか", 11: "細やか",
  12: "力強い", 13: "穏やか", 14: "穏やか", 15: "リズミカル", 16: "リズミカル",
  17: "激しい", 18: "細やか", 19: "細やか", 20: "細やか", 21: "細やか", 22: "細やか",
  23: "細やか", 24: "滑らか", 25: "切迫した", 26: "切迫した", 27: "細やか", 28: "穏やか",
  29: "リズミカル", 30: "力強い", 31: "切迫した", 32: "滑らか", 33: "切迫した",
  34: "切迫した", 35: "切迫した", 36: "切迫した", 37: "切迫した", 38: "滑らか",
  39: "激しい", 40: "激しい", 41: "力強い", 42: "穏やか", 43: "力強い", 44: "滑らか",
  45: "穏やか", 46: "細やか", 47: "滑らか", 48: "力強い", 49: "細やか", 50: "リズミカル",
  51: "リズミカル", 52: "細やか", 53: "細やか", 54: "細やか", 55: "力強い",
  56: "切迫した", 57: "切迫した", 58: "切迫した", 59: "特徴的な",
};

const ID_TO_STYLE_REMAP: { [key: number]: string } = {};
for (const id in ID_TO_STYLE_MAP) {
  const style = ID_TO_STYLE_MAP[parseInt(id)];
  if (["穏やか", "細やか", "滑らか"].includes(style))
    ID_TO_STYLE_REMAP[id] = "soft";
  else if (["激しい", "力強い"].includes(style))
    ID_TO_STYLE_REMAP[id] = "strong";
  else if (["リズミカル", "切迫した"].includes(style))
    ID_TO_STYLE_REMAP[id] = "fast";
  else ID_TO_STYLE_REMAP[id] = "unique";
}

const STYLE_TO_CATEGORY_MAP: { [key: string]: string[] } = {
  soft: ["slow", "small"],
  strong: ["large"],
  fast: ["fast"],
  unique: [],
};

// --- ヘルパー関数群 ---

const computeLabelWeights = (): number[] => {
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
const LABEL_WEIGHTS = computeLabelWeights();

const computeWeightedAverageProbs = (allProbs: number[][]): number[] => {
  if (!allProbs.length) return [];
  const numLabels = allProbs[0].length;
  const summed = new Array(numLabels).fill(0);

  for (const probs of allProbs) {
    for (let i = 0; i < numLabels; i++) {
      summed[i] += probs[i] * LABEL_WEIGHTS[i];
    }
  }

  const numChunks = allProbs.length;
  const averaged = summed.map((s) => s / numChunks);

  const totalProb = averaged.reduce((a, b) => a + b, 0);
  if (totalProb === 0) return averaged;
  return averaged.map(p => p / totalProb);
};

// ★ 変更点: 物理的な動きを計算する関数を追加
const calculateDynamics = (poseData: NormalizedLandmarkList[]): { movement: number } => {
  if (poseData.length < 3) {
    return { movement: 0 };
  }

  const keyJoints = [
    KEY_JOINTS_MEDIAPIPE.RIGHT_WRIST,
    KEY_JOINTS_MEDIAPIPE.LEFT_WRIST,
  ];

  const velocities: number[] = [];
  let totalDistance = 0;

  for (let i = 1; i < poseData.length; i++) {
    const prevFrame = poseData[i - 1];
    const currentFrame = poseData[i];
    let frameDistance = 0;
    for (const jointId of keyJoints) {
      const p1 = prevFrame[jointId];
      const p2 = currentFrame[jointId];
      if (p1 && p2) {
        frameDistance += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      }
    }
    const frameVelocity = frameDistance / keyJoints.length;
    velocities.push(frameVelocity);
    totalDistance += frameDistance;
  }

  let totalAcceleration = 0;
  for (let i = 1; i < velocities.length; i++) {
    totalAcceleration += Math.abs(velocities[i] - velocities[i - 1]);
  }

  const avgVelocity = totalDistance / velocities.length / keyJoints.length;
  const avgAcceleration = totalAcceleration / (velocities.length - 1);
  
  const MOVEMENT_VELOCITY_WEIGHT = 1.0;
  const MOVEMENT_ACCELERATION_WEIGHT = 1.5;
  const movementScore = (avgVelocity * MOVEMENT_VELOCITY_WEIGHT) + (avgAcceleration * MOVEMENT_ACCELERATION_WEIGHT);

  const NORMALIZATION_SCALE = 0.05; 
  const normalizedMovement = Math.min(1.0, movementScore / NORMALIZATION_SCALE);

  return { movement: normalizedMovement * 100 };
};

// --- スコア算出 ---
// ★ 変更点: 引数にdynamicsScoreを追加し、ロジックを全面的に見直し
const calculateScoresAndProgressBarData = (
  probs: number[],
  dynamicsScore: number
): ProgressBarData[] => {
  let slowSum = 0,
    fastSum = 0,
    smallSum = 0,
    largeSum = 0;
  for (let i = 0; i < probs.length; i++) {
    const style = ID_TO_STYLE_REMAP[i];
    const categories = STYLE_TO_CATEGORY_MAP[style] || [];
    const prob = probs[i];
    if (categories.includes("slow")) slowSum += prob;
    if (categories.includes("fast")) fastSum += prob;
    if (categories.includes("small")) smallSum += prob;
    if (categories.includes("large")) largeSum += prob;
  }
  
  // 1. テンポの評価 (AI)
  const tempoTotal = slowSum + fastSum;
  const tempoScore = tempoTotal > 0 ? (fastSum / tempoTotal) * 100 : 50;

  // 2. 表現の評価 (AI)
  const expressionTotal = smallSum + largeSum;
  const expressionScore = expressionTotal > 0 ? (largeSum / expressionTotal) * 100 : 50;
  
  // 3. 動きの評価 (物理) - dynamicsScoreをそのまま使用

  const applyContrast = (value: number): number => {
    const normalized = value / 100;
    const adjusted = 0.5 + 1.5 * (normalized - 0.5);
    const result = Math.max(0, Math.min(1, adjusted)) * 100;
    return 50 + (result - 50);
  };

  const bars: ProgressBarData[] = [
    {
      labelLeft: "流麗な",
      labelRight: "リズミカルな",
      value: applyContrast(tempoScore),
    },
    { 
      labelLeft: "単調な表現",
      labelRight: "豊かな表現", 
      value: applyContrast(expressionScore) 
    },
    { 
      labelLeft: "小さな動き",
      labelRight: "大きな動き", 
      value: applyContrast(dynamicsScore)
    },
  ];

  return bars;
};

// ★ 変更点: 3つの指標を基にしたフィードバックに変更
const generateFeedbackText = (bars: ProgressBarData[]): string => {
  const expression = bars[1]?.value || 50;
  const dynamics = bars[2]?.value || 50;

  if (expression > 60 && dynamics > 60) {
      return "表現力豊かで、動きもダイナミックな素晴らしい指揮です！";
  } else if (expression > 60 && dynamics < 40) {
      return "細やかな表現は素晴らしいですが、もう少し動きを大きくすると情熱がより伝わります。";
  } else if (expression < 40 && dynamics > 60) {
      return "動きは非常にエネルギッシュです。表現にもっと抑揚をつけるとさらに良くなります。";
  } else if (expression < 40 && dynamics < 40) {
      return "全体的にコンパクトな指揮です。もっと自信を持って、表現も動きも大きくしてみましょう！";
  } else {
    return "全体としてバランスの取れた指揮でした。";
  }
};

const preprocessData = (
  landmarks: NormalizedLandmarkList,
  scaler: ScalerInfoModel,
): number[] => {
  const rh = landmarks[16],
    lh = landmarks[15],
    re = landmarks[14],
    le = landmarks[13];
  if (!rh || !lh || !re || !le) return Array(12).fill(0);
  const raw = [ rh.x, rh.y, rh.z, lh.x, lh.y, lh.z, re.x, re.y, re.z, le.x, le.y, le.z ];
  return raw.map((v, i) => (v - scaler.mean[i]) / scaler.scale[i]);
};

const smoothLandmarks = (poseData: NormalizedLandmarkList[], windowSize = 5) => {
  if (poseData.length < windowSize) return poseData;
  const indices = [16, 15, 14, 13];
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

interface AiAnalyzerResult {
  analyze: (
    poseData: NormalizedLandmarkList[],
  ) => Promise<{ feedbackText: string; progressBarData: ProgressBarData[] }>;
  isLoading: boolean;
  isAnalyzing: boolean;
  error: string | null;
}

const MODEL_URL = "/predictModel/tfjs_model/model.json";
const SCALER_URL = "/predictModel/scaler.json";

export const useAiAnalyzer = (): AiAnalyzerResult => {
  const [aiModel, setAiModel] = useState<tf.LayersModel | null>(null);
  const [scalerInfo, setScalerInfo] = useState<ScalerInfoModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const model = await tf.loadLayersModel(MODEL_URL);
        const scaler = await (await fetch(SCALER_URL)).json();
        setAiModel(model);
        setScalerInfo(scaler);
      } catch (err) {
        console.error(err);
        setError("AIモデル読み込み失敗");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);
  
  const analyze = useCallback(async (fullPoseData: NormalizedLandmarkList[]) => {
    if (isLoading || error || !aiModel || !scalerInfo)
      return { feedbackText: "AIシステムエラー", progressBarData: [] };
    if (fullPoseData.length === 0)
      return { feedbackText: "データがありません。", progressBarData: [] };
      
    setIsAnalyzing(true);
    
    try {
      const smoothed = smoothLandmarks(fullPoseData);
      
      // ★ 変更点: 物理的な動きを計算
      const dynamics = calculateDynamics(smoothed);

      const SEQ_LEN = 60;
      const STRIDE = 30;
      const allProbs: number[][] = [];

      for (let i = 0; i <= smoothed.length - SEQ_LEN; i += STRIDE) {
        const chunk = smoothed.slice(i, i + SEQ_LEN);
        const processedChunk = chunk.map(frame => preprocessData(frame, scalerInfo));

        const probs = tf.tidy(() => {
          const input = tf.tensor3d([processedChunk]);
          const output = aiModel.predict(input) as tf.Tensor;
          return Array.from(output.dataSync());
        });
        allProbs.push(probs);
      }
      
      if (smoothed.length < SEQ_LEN && smoothed.length > 0) {
        const paddedChunk = [...smoothed];
        while(paddedChunk.length < SEQ_LEN) {
            paddedChunk.push(smoothed[smoothed.length - 1]);
        }
        const processedPaddedChunk = paddedChunk.map(frame => preprocessData(frame, scalerInfo));
        
        const probs = tf.tidy(() => {
          const input = tf.tensor3d([processedPaddedChunk]);
          const output = aiModel.predict(input) as tf.Tensor;
          return Array.from(output.dataSync());
        });
        allProbs.push(probs);
      }

      if (allProbs.length === 0) {
          return { feedbackText: "分析可能なデータがありませんでした。", progressBarData: [] };
      }

      const weightedProbs = computeWeightedAverageProbs(allProbs);
      // ★ 変更点: dynamics.movementを渡す
      const progressBarData = calculateScoresAndProgressBarData(weightedProbs, dynamics.movement);
      const feedbackText = generateFeedbackText(progressBarData);

      return { feedbackText, progressBarData };
    } catch (e) {
      console.error(e);
      return { feedbackText: "分析中にエラーが発生しました。", progressBarData: [] };
    } finally {
      setIsAnalyzing(false);
    }
  }, [isLoading, error, aiModel, scalerInfo]);

  return { analyze, isLoading, isAnalyzing, error };
};