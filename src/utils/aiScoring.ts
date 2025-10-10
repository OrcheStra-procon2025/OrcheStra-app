// src/utils/aiScoring.ts
import type { ProgressBarData } from "@/utils/models";
import { ID_TO_STYLE_REMAP, STYLE_TO_CATEGORY_MAP } from "./aiConstants";

export const calculateScoresAndProgressBarData = (
  probs: number[],
  movementScore: number,
  rhythmScore: number,
): ProgressBarData[] => {
  let slowSum = 0, fastSum = 0;
  for (let i = 0; i < probs.length; i++) {
    const style = ID_TO_STYLE_REMAP[i];
    const categories = STYLE_TO_CATEGORY_MAP[style] || [];
    const prob = probs[i];
    if (categories.includes("slow")) slowSum += prob;
    if (categories.includes("fast")) fastSum += prob;
  }
  
  const aiTempoTotal = slowSum + fastSum;
  const aiTempoScore = aiTempoTotal > 0 ? (fastSum / aiTempoTotal) * 100 : 50;

  const AI_TEMPO_WEIGHT = 0.3;
  const DYNAMICS_TEMPO_WEIGHT = 0.5;
  const combinedTempoScore = (aiTempoScore * AI_TEMPO_WEIGHT) + (rhythmScore * DYNAMICS_TEMPO_WEIGHT);

  const expressionScore = (combinedTempoScore + movementScore) / 2;
  
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
      value: applyContrast(combinedTempoScore),
    },
    { 
      labelLeft: "小さな動き",
      labelRight: "大きな動き", 
      value: applyContrast(movementScore)
    },
    { 
      labelLeft: "単調な表現",
      labelRight: "豊かな表現", 
      value: applyContrast(expressionScore) 
    },
  ];

  return bars;
};

export const generateFeedbackText = (bars: ProgressBarData[]): string => {
  const movement = bars[1]?.value || 50;
  const expression = bars[2]?.value || 50;

  if (expression > 60 && movement > 60) {
      return "表現力豊かで、動きもダイナミックな素晴らしい指揮です！";
  } else if (expression > 60 && movement < 40) {
      return "指揮の表現はニュアンスに富んでいますが、もう少し動きを大きくすると情熱がより伝わります。";
  } else if (expression < 40 && movement > 60) {
      return "動きは非常にエネルギッシュです。表現にもっと抑揚やリズムの変化をつけるとさらに良くなります。";
  } else if (expression < 40 && movement < 40) {
      return "全体的にコンパクトな指揮です。もっと自信を持って、表現も動きも大きくしてみましょう！";
  } else {
    return "全体としてバランスの取れた指揮でした。";
  }
};