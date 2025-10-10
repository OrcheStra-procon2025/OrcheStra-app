// src/hooks/useAiAnalyzer.ts
import { useState, useEffect, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import type { NormalizedLandmarkList, ScalerInfoModel, ProgressBarData } from "@/utils/models";
import { computeLabelWeights, computeWeightedAverageProbs, calculateAllDynamics, preprocessData, smoothLandmarks } from "@/utils/aiHelper";
import { calculateScoresAndProgressBarData, generateFeedbackText } from "@/utils/aiScoring";

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

const LABEL_WEIGHTS = computeLabelWeights();

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
        setAiModel(model); setScalerInfo(scaler);
      } catch (err) {
        console.error(err); setError("AIモデル読み込み失敗");
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
      const dynamics = calculateAllDynamics(smoothed);
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

      const weightedProbs = computeWeightedAverageProbs(allProbs, LABEL_WEIGHTS);
      const progressBarData = calculateScoresAndProgressBarData(
          weightedProbs, 
          dynamics.movement,
          dynamics.rhythm
      );
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