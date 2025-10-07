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

// --- 元のラベルマップ ---
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

// --- スタイルカテゴリマップ ---
const STYLE_TO_CATEGORY_MAP: { [key: string]: string[] } = {
  soft: ['slow', 'small'],
  strong: ['large'],
  fast: ['fast'],
  unique: [],
};

// --- グループ再構築 ---
const STYLE_GROUPS_REMAP: { [styleName: string]: number[] } = {};
for (const id in ID_TO_STYLE_REMAP) {
  const style = ID_TO_STYLE_REMAP[id];
  if (!STYLE_GROUPS_REMAP[style]) STYLE_GROUPS_REMAP[style] = [];
  STYLE_GROUPS_REMAP[style].push(parseInt(id));
}

// --- 支配スタイル判定 ---
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

// --- スコア変動強化版 ---
const amplifyScore = (value: number, intensity: number = 1.8): number => {
  // 平均50からの偏差を強調
  const amplified = (value - 50) * intensity + 50;
  return Math.max(0, Math.min(100, amplified));
};

// --- スコア計算 + プログレスバー構築 ---
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

  const tempoAmp = amplifyScore(tempo);
  const sizeAmp = amplifyScore(size);
  const brightness = amplifyScore((tempoAmp + sizeAmp) / 2);

  return {
    scores: { tempo: tempoAmp, size: sizeAmp },
    progressBarData: [
      { labelLeft: "落ち着き", labelRight: "華やか", value: brightness },
      { labelLeft: "穏やか", labelRight: "速い", value: tempoAmp },
      { labelLeft: "繊細", labelRight: "力強い", value: sizeAmp },
    ],
  };
};

// --- 残りのロジック（smoothLandmarks, preprocess, useAiAnalyzer）は従来通り ---
// ※ここは上記のまま置き換えてOK（改変なし）
