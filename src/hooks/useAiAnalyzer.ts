import { useState, useEffect, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import type { NormalizedLandmarkList, ScalerInfoModel } from "@/utils/models";
import {
  analyzeSequence,
  segmentSequence,
  generateFeedbackText,
} from "@/utils/aiInference";

export interface AiAnalyzerResultData {
  feedbackText: string;
  metrics: {
    [key: string]: number;
  };
}

interface AiAnalyzerResult {
  analyze: (fullPoseData: NormalizedLandmarkList[]) => Promise<AiAnalyzerResultData>;
  isLoading: boolean;
  isAnalyzing: boolean;
  error: string | null;
}

const MODEL_URL = "/predictModel/tfjs_model/model.json";
const SCALER_URL = "/predictModel/scaler.json";

/**
 * 文字列のシーケンスから各指標の数値を計算する
 * @param sequence AIが分析した指揮の特徴の配列
 * @returns 各指標のパーセンテージ
 */
const calculateMetrics = (sequence: string[]): { [key: string]: number } => {
  const metrics: { [key: string]: number } = {};
  if (sequence.length === 0) return {};

  const counts = sequence.reduce((acc, label) => {
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });
  
  // ★デバッグ用に集計結果をコンソールに出力
  console.log("Counted features:", counts);

  const brightFrames = counts["明るい"] || 0;
  const darkFrames = counts["暗い"] || 0;
  if (brightFrames + darkFrames > 0) {
    metrics["brightness"] = Math.round((brightFrames / (brightFrames + darkFrames)) * 100);
  }

  const strongFrames = counts["強い"] || 0;
  const weakFrames = counts["弱い"] || 0;
  if (strongFrames + weakFrames > 0) {
    metrics["strength"] = Math.round((strongFrames / (strongFrames + weakFrames)) * 100);
  }

  const dynamicFrames = counts["動的"] || 0;
  const staticFrames = counts["静的"] || 0;
  if (dynamicFrames + staticFrames > 0) {
    metrics["dynamics"] = Math.round((dynamicFrames / (dynamicFrames + staticFrames)) * 100);
  }

  return metrics;
};

export const useAiAnalyzer = (): AiAnalyzerResult => {
  const [aiModel, setAiModel] = useState<tf.LayersModel | null>(null);
  const [scalerInfo, setScalerInfo] = useState<ScalerInfoModel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const model = await tf.loadLayersModel(MODEL_URL);
        const scaler = await (await fetch(SCALER_URL)).json();
        setAiModel(model);
        setScalerInfo(scaler);
      } catch (err) {
        console.error("AIアセットの読み込み中にエラーが発生しました:", err);
        setError("AIモデルの読み込みに失敗しました。");
      } finally {
        setIsLoading(false);
      }
    };
    loadAssets();
    return () => { if (aiModel) aiModel.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const analyze = useCallback(
    async (fullPoseData: NormalizedLandmarkList[]): Promise<AiAnalyzerResultData> => {
      if (isLoading || error || !aiModel || !scalerInfo) {
        throw new Error("AIシステムエラー：モデルが見つからないか、準備中です。");
      }
      
      console.log("1. 'analyze'関数を開始しました。");
      setIsAnalyzing(true);

      try {
        console.log("2. 'analyzeSequence' (AI推論) を呼び出します...");
        const styleSequence: string[] = await analyzeSequence(
          fullPoseData,
          aiModel,
          scalerInfo,
        );
        console.log("3. 'analyzeSequence'が完了しました。");
        
        // ★デバッグ用に生のシーケンスデータをコンソールに出力
        console.log("Raw analysis sequence:", styleSequence);

        console.log("4. 'calculateMetrics' (数値計算) を呼び出します...");
        const metrics = calculateMetrics(styleSequence);
        console.log("5. 'calculateMetrics'が完了しました。");

        console.log("6. テキスト生成を呼び出します...");
        const segments: string[] = segmentSequence(styleSequence);
        const feedbackText = generateFeedbackText(segments);
        console.log("7. テキスト生成が完了しました。");
        
        setIsAnalyzing(false);
        console.log("8. 'analyze'関数が正常に終了しました。");
        return { feedbackText, metrics };

      } catch (e) {
        console.error("AI分析の内部でエラーが発生しました:", e);
        setError("AI分析中に内部エラーが発生しました。");
        setIsAnalyzing(false);
        throw e;
      }
    },
    [isLoading, error, aiModel, scalerInfo],
  );

  return { analyze, isLoading, isAnalyzing, error };
};