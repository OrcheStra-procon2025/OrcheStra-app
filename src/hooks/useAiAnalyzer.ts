import { useState, useEffect, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import type {
  NormalizedLandmarkList,
  ScalerInfoModel,
} from "@/utils/models";

interface ProgressBarData {
  labelLeft: string;
  labelRight: string;
  value: number;
}

interface StyleSegment {
  style: string;
  duration: number;
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
const STYLE_GROUPS_REMAP: { [styleName: string]: number[] } = {};
for (const id in ID_TO_STYLE_REMAP) {
  const style = ID_TO_STYLE_REMAP[id];
  if (!STYLE_GROUPS_REMAP[style]) STYLE_GROUPS_REMAP[style] = [];
  STYLE_GROUPS_REMAP[style].push(parseInt(id));
}

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
  let totalWeight = 0;
  for (const probs of allProbs) {
    for (let i = 0; i < numLabels; i++) {
      summed[i] += probs[i] * LABEL_WEIGHTS[i];
    }
    totalWeight += LABEL_WEIGHTS.reduce((a, b) => a + b, 0);
  }
  return summed.map((s) => s / totalWeight);
};

const calculateScoresAndProgressBarData = (probs: number[]): ProgressBarData[] => {
  let slowSum = 0, fastSum = 0, smallSum = 0, largeSum = 0;
  for (let i = 0; i < probs.length; i++) {
    const style = ID_TO_STYLE_REMAP[i];
    const categories = STYLE_TO_CATEGORY_MAP[style] || [];
    const prob = Math.pow(Math.log1p(probs[i] * 15), 2.5);
    if (categories.includes("slow")) slowSum += prob;
    if (categories.includes("fast")) fastSum += prob;
    if (categories.includes("small")) smallSum += prob;
    if (categories.includes("large")) largeSum += prob;
  }
  
  const TEMPO_BALANCE_FACTOR = 0.7; 
  const SIZE_BALANCE_FACTOR = 0.8;

  fastSum *= TEMPO_BALANCE_FACTOR;
  largeSum *= SIZE_BALANCE_FACTOR;
  
  const tempoTotal = slowSum + fastSum;
  const sizeTotal = smallSum + largeSum;

  const tempo = tempoTotal > 0 ? (fastSum / tempoTotal) * 100 : 50;
  const size = sizeTotal > 0 ? (largeSum / sizeTotal) * 100 : 50;

  const applyContrast = (value: number): number => {
    const normalized = value / 100;
    const adjusted = 0.5 + 1.5 * (normalized - 0.5);
    const result = Math.max(0, Math.min(1, adjusted)) * 100;
    return 50 + (result - 50);
  };

  const bars: ProgressBarData[] = [
    { labelLeft: "落ち着き", labelRight: "華やか", value: applyContrast(tempo) },
    { labelLeft: "穏やか", labelRight: "速い", value: applyContrast((tempo + size) / 2) },
    { labelLeft: "繊細", labelRight: "力強い", value: applyContrast(size) },
  ];

  bars.forEach((b) => {
    const jitter = (Math.random() - 0.5) * 10;
    b.value = Math.min(100, Math.max(0, b.value + jitter));
  });

  return bars;
};

const generateFeedbackText = (bars: ProgressBarData[]): string => {
  const tempo = bars[1]?.value || 50;
  const size = bars[2]?.value || 50;
  if (tempo > 60 && size > 60) return "全体的に力強くテンポ感のある指揮でした。";
  if (tempo < 40 && size < 40) return "全体的に穏やかで繊細な指揮でした。";
  if (tempo > 60 && size < 40) return "速いテンポながらも繊細さが際立っていました。";
  if (tempo < 40 && size > 60) return "ゆったりしながらも力強さを感じる指揮でした。";
  return "全体としてバランスの取れた指揮でした。";
};

const preprocessData = (
  landmarks: NormalizedLandmarkList,
  scaler: ScalerInfoModel
): number[] => {
  const rh = landmarks[16], lh = landmarks[15], re = landmarks[14], le = landmarks[13];
  if (!rh || !lh || !re || !le) return Array(12).fill(0);
  const raw = [rh.x, rh.y, rh.z, lh.x, lh.y, lh.z, re.x, re.y, re.z, le.x, le.y, le.z];
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
  analyze: (poseData: NormalizedLandmarkList[]) => Promise<{ feedbackText: string; progressBarData: ProgressBarData[] }>;
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
      
      const SEQ_LEN = 60;  // 150から60に変更
      const STRIDE = 30;   // 75から30に変更 (SEQ_LENの半分)

      const allProbs: number[][] = [];
      let lastProcessedIndex = -1;

      for (let i = 0; i <= smoothed.length - SEQ_LEN; i += STRIDE) {
        const chunk = smoothed.slice(i, i + SEQ_LEN);
        const processedChunk = chunk.map(frame => preprocessData(frame, scalerInfo));

        const probs = tf.tidy(() => {
          const input = tf.tensor3d([processedChunk]);
          const output = aiModel.predict(input) as tf.Tensor;
          return Array.from(output.dataSync());
        });
        allProbs.push(probs);
        lastProcessedIndex = i;
      }

      if (smoothed.length > SEQ_LEN && lastProcessedIndex + SEQ_LEN < smoothed.length) {
        const finalChunk = smoothed.slice(smoothed.length - SEQ_LEN);
        const processedFinalChunk = finalChunk.map(frame => preprocessData(frame, scalerInfo));

        const probs = tf.tidy(() => {
          const input = tf.tensor3d([processedFinalChunk]);
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
      const progressBarData = calculateScoresAndProgressBarData(weightedProbs);
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