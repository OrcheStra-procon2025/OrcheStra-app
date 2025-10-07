import { useState, useEffect, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import type {
  NormalizedLandmark,
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

const KEY_JOINTS_MEDIAPIPE = {
  RIGHT_WRIST: 16, LEFT_WRIST: 15, RIGHT_ELBOW: 14, LEFT_ELBOW: 13,
};

// 元のラベルマッピング
const ID_TO_STYLE_MAP: { [key: number]: string } = {
  0: '穏やか', 1: '穏やか', 2: '細やか', 3: '細やか', 4: '激しい', 5: '滑らか',
  6: '細やか', 7: '細やか', 8: '細やか', 9: '細やか', 10: '細やか', 11: '細やか',
  12: '力強い', 13: '穏やか', 14: '穏やか', 15: 'リズミカル', 16: 'リズミカル',
  17: '激しい', 18: '細やか', 19: '細やか', 20: '細やか', 21: '細やか',
  22: '細やか', 23: '細やか', 24: '滑らか', 25: '切迫した', 26: '切迫した',
  27: '細やか', 28: '穏やか', 29: 'リズミカル', 30: '力強い', 31: '切迫した',
  32: '滑らか', 33: '切迫した', 34: '切迫した', 35: '切迫した', 36: '切迫した',
  37: '切迫した', 38: '滑らか', 39: '激しい', 40: '激しい', 41: '力強い',
  42: '穏やか', 43: '力強い', 44: '滑らか', 45: '穏やか', 46: '細やか',
  47: '滑らか', 48: '力強い', 49: '細やか', 50: 'リズミカル', 51: 'リズミカル',
  52: '細やか', 53: '細やか', 54: '細やか', 55: '力強い', 56: '切迫した',
  57: '切迫した', 58: '切迫した', 59: '特徴的な'
};

// --- 偏りを抑えたラベルマッピング ---
const ID_TO_STYLE_REMAP: { [key: number]: string } = {};
for (const id in ID_TO_STYLE_MAP) {
  const style = ID_TO_STYLE_MAP[parseInt(id)];
  if (['穏やか', '細やか', '滑らか'].includes(style)) ID_TO_STYLE_REMAP[id] = 'soft';
  else if (['激しい', '力強い'].includes(style)) ID_TO_STYLE_REMAP[id] = 'strong';
  else if (['リズミカル', '切迫した'].includes(style)) ID_TO_STYLE_REMAP[id] = 'fast';
  else ID_TO_STYLE_REMAP[id] = 'unique';
}

// --- STYLE_TO_CATEGORY_MAP (従来のまま) ---
const STYLE_TO_CATEGORY_MAP: { [key: string]: string[] } = {
  '強め': ['large'],
  'soft': ['slow', 'small'],
  'strong': ['large'],
  'fast': ['fast'],
  'unique': [],
};

// --- STYLE_GROUPS_REMAP ---
const STYLE_GROUPS_REMAP: { [styleName: string]: number[] } = {};
for (const id in ID_TO_STYLE_REMAP) {
  const style = ID_TO_STYLE_REMAP[id];
  if (!STYLE_GROUPS_REMAP[style]) STYLE_GROUPS_REMAP[style] = [];
  STYLE_GROUPS_REMAP[style].push(parseInt(id));
}

// --- Dominant Style Group (リマップ版) ---
const getDominantStyleGroupRemap = (probabilities: number[]): string => {
  let maxProbSum = -1;
  let dominantStyle = 'unique';
  for (const style in STYLE_GROUPS_REMAP) {
    const ids = STYLE_GROUPS_REMAP[style];
    const sum = ids.reduce((s, id) => s + probabilities[id], 0);
    if (sum > maxProbSum) {
      maxProbSum = sum;
      dominantStyle = style;
    }
  }
  return dominantStyle;
};

// --- Style Sequence セグメント化 ---
const segmentStyleSequence = (sequence: string[]): StyleSegment[] => {
  if (!sequence.length) return [];
  const segments: StyleSegment[] = [];
  let current: StyleSegment = { style: sequence[0], duration: 1 };
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i] === current.style) current.duration++;
    else {
      segments.push(current);
      current = { style: sequence[i], duration: 1 };
    }
  }
  segments.push(current);
  return segments;
};

// --- フィードバック文生成 ---
const generateTimeSeriesFeedback = (segments: StyleSegment[]): string => {
  if (!segments.length) return "分析結果がありません。";
  if (segments.length === 1) return `指揮は全体を通して「${segments[0].style}」で一貫しています。`;
  if (segments.length === 2) return `序盤は「${segments[0].style}」、途中から「${segments[1].style}」に変化しました。`;

  const startStyle = segments[0].style;
  const endStyle = segments[segments.length - 1].style;
  const middleSegments = segments.slice(1, -1);
  const middleStyle = middleSegments.sort((a, b) => b.duration - a.duration)[0].style;
  if (startStyle === endStyle && startStyle !== middleStyle) {
    return `「${startStyle}」で始まり、中盤は「${middleStyle}」、再び「${endStyle}」で締めくくられました。`;
  }
  return `序盤は「${startStyle}」、中盤は「${middleStyle}」、終盤は「${endStyle}」へと変化しました。`;
};

// --- コントラスト調整 ---
const applyContrast = (value: number, factor: number = 1.5): number => {
  const normalized = value / 100;
  const adjusted = 0.5 + factor * (normalized - 0.5);
  return Math.max(0, Math.min(1, adjusted)) * 100;
};

// --- スコア計算 ---
const calculateScoresAndProgressBarData = (probs: number[]) => {
  let slowSum = 0, fastSum = 0, smallSum = 0, largeSum = 0;
  for (let i = 0; i < probs.length; i++) {
    const style = ID_TO_STYLE_REMAP[i];
    const categories = STYLE_TO_CATEGORY_MAP[style] || [];
    const prob = probs[i];
    if (categories.includes('slow')) slowSum += prob;
    if (categories.includes('fast')) fastSum += prob;
    if (categories.includes('small')) smallSum += prob;
    if (categories.includes('large')) largeSum += prob;
  }
  const tempoTotal = slowSum + fastSum;
  const sizeTotal = smallSum + largeSum;
  const tempo = tempoTotal > 0 ? (fastSum / tempoTotal) * 100 : 50;
  const size = sizeTotal > 0 ? (largeSum / sizeTotal) * 100 : 50;
  return {
    scores: { tempo, size },
    progressBarData: [
      { labelLeft: "ゆったり", labelRight: "速い", value: applyContrast(tempo) },
      { labelLeft: "小さい", labelRight: "大きい", value: applyContrast(size) },
    ],
  };
};

// --- データ前処理 ---
const preprocessData = (landmarks: NormalizedLandmarkList, scaler: ScalerInfoModel): number[] => {
  const rh = landmarks[KEY_JOINTS_MEDIAPIPE.RIGHT_WRIST];
  const lh = landmarks[KEY_JOINTS_MEDIAPIPE.LEFT_WRIST];
  const re = landmarks[KEY_JOINTS_MEDIAPIPE.RIGHT_ELBOW];
  const le = landmarks[KEY_JOINTS_MEDIAPIPE.LEFT_ELBOW];
  if (!rh || !lh || !re || !le) return Array(12).fill(0);
  const flattened = [rh.x, rh.y, rh.z, lh.x, lh.y, lh.z, re.x, re.y, re.z, le.x, le.y, le.z];
  return flattened.map((val, i) => (val - scaler.mean[i]) / scaler.scale[i]);
};

// --- 平滑化 ---
const smoothLandmarks = (poseData: NormalizedLandmarkList[], windowSize: number = 5) => {
  if (poseData.length < windowSize) return poseData;
  const smoothed: NormalizedLandmarkList[] = [];
  const indices = [
    KEY_JOINTS_MEDIAPIPE.RIGHT_WRIST, KEY_JOINTS_MEDIAPIPE.LEFT_WRIST,
    KEY_JOINTS_MEDIAPIPE.RIGHT_ELBOW, KEY_JOINTS_MEDIAPIPE.LEFT_ELBOW
  ];
  for (let i = 0; i < poseData.length; i++) {
    const newLandmarks = JSON.parse(JSON.stringify(poseData[i]));
    const start = Math.max(0, i - windowSize + 1);
    const window = poseData.slice(start, i + 1);
    for (const idx of indices) {
      if (!newLandmarks[idx]) continue;
      const sumX = window.reduce((s, f) => s + (f[idx]?.x || 0), 0);
      const sumY = window.reduce((s, f) => s + (f[idx]?.y || 0), 0);
      const sumZ = window.reduce((s, f) => s + (f[idx]?.z || 0), 0);
      newLandmarks[idx].x = sumX / window.length;
      newLandmarks[idx].y = sumY / window.length;
      newLandmarks[idx].z = sumZ / window.length;
    }
    smoothed.push(newLandmarks);
  }
  return smoothed;
};

interface AiAnalyzerResult {
  analyze: (fullPoseData: NormalizedLandmarkList[]) => Promise<{ feedbackText: string; progressBarData: ProgressBarData[] }>;
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
    const loadAssets = async () => {
      try {
        const model = await tf.loadLayersModel(MODEL_URL);
        const scaler = await (await fetch(SCALER_URL)).json();
        setAiModel(model);
        setScalerInfo(scaler);
      } catch (err) {
        console.error(err);
        setError("AIモデルの読み込みに失敗しました。");
      } finally {
        setIsLoading(false);
      }
    };
    loadAssets();
    return () => { aiModel?.dispose(); };
  }, []);

  const analyze = useCallback(async (fullPoseData: NormalizedLandmarkList[]) => {
    if (isLoading || error || !aiModel || !scalerInfo) return { feedbackText: "AIシステムエラー", progressBarData: [] };
    setIsAnalyzing(true);
    try {
      const smoothed = smoothLandmarks(fullPoseData);
      const SEQ_LEN = 150;
      const styleSequence: string[] = [];
      const chunkScores: { tempo: number; size: number; brightness: number; weight: number }[] = [];

      for (let i = 0; i < smoothed.length; i += SEQ_LEN) {
        const chunk = smoothed.slice(i, i + SEQ_LEN);
        const padded = Array.from({ length: SEQ_LEN }, (_, idx) =>
          idx < chunk.length ? preprocessData(chunk[idx], scalerInfo) : Array(12).fill(0)
        );

        const probs = tf.tidy(() => {
          const input = tf.tensor3d([padded]);
          const output = aiModel.predict(input) as tf.Tensor;
          return Array.from(output.dataSync());
        });

        const dominant = getDominantStyleGroupRemap(probs);
        styleSequence.push(dominant);

        const { scores } = calculateScoresAndProgressBarData(probs);
        const brightness = (scores.tempo + scores.size) / 2;
        const weight = Math.max(...probs);
        chunkScores.push({ ...scores, brightness, weight });
      }

      if (!chunkScores.length) return { feedbackText: "データが短すぎます。", progressBarData: [] };

      const totalWeight = chunkScores.reduce((s, c) => s + c.weight, 0) || 1;
      const overallTempo = chunkScores.reduce((s, c) => s + c.tempo * c.weight, 0) / totalWeight;
      const overallSize = chunkScores.reduce((s, c) => s + c.size * c.weight, 0) / totalWeight;
      const overallBrightness = chunkScores.reduce((s, c) => s + c.brightness * c.weight, 0) / totalWeight;

      const progressBarData: ProgressBarData[] = [
        { labelLeft: "暗い", labelRight: "明るい", value: overallBrightness },
        { labelLeft: "ゆったり", labelRight: "速い", value: overallTempo },
        { labelLeft: "小さい", labelRight: "大きい", value: overallSize },
      ];

      const segments = segmentStyleSequence(styleSequence);
      const feedbackText = generateTimeSeriesFeedback(segments);

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
