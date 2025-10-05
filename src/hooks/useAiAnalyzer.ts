// src/hooks/useAiAnalyzer.ts (カスタムフックとしてリファクタリング)

import { useState, useEffect, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import type { NormalizedLandmarkList, ScalerInfoModel } from "@/utils/models";
import {
  analyzeSequence,
  segmentSequence,
  generateFeedbackText,
} from "@/utils/aiInference"; // ユーティリティをインポート

interface AiAnalyzerResult {
  analyze: (fullPoseData: NormalizedLandmarkList[]) => Promise<string>;
  isLoading: boolean;
  isAnalyzing: boolean;
  error: string | null;
}

const MODEL_URL = "/predictModel/tfjs_model/model.json";
const SCALER_URL = "/predictModel/scaler.json";

export const useAiAnalyzer = (): AiAnalyzerResult => {
  const [aiModel, setAiModel] = useState<tf.LayersModel | null>(null);
  const [scalerInfo, setScalerInfo] = useState<ScalerInfoModel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        // モデルのロード
        const model: tf.LayersModel = await tf.loadLayersModel(MODEL_URL);

        // スケーラー情報のロード
        const scaler: ScalerInfoModel = await (await fetch(SCALER_URL)).json();

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

    return () => {
      if (aiModel) {
        aiModel.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const analyze = useCallback(
    async (fullPoseData: NormalizedLandmarkList[]): Promise<string> => {
      if (isLoading || error || !aiModel || !scalerInfo) {
        console.warn("AIモデルがまだ準備できていません。");
        return "AIシステムエラー：モデルが見つからないか、準備中です。";
      }

      setIsAnalyzing(true);

      const styleSequence: string[] = await analyzeSequence(
        fullPoseData,
        aiModel,
        scalerInfo,
      );
      const segments: string[] = segmentSequence(styleSequence);
      setIsAnalyzing(false);
      return generateFeedbackText(segments);
    },
    [isLoading, error, aiModel, scalerInfo],
  );

  return { analyze, isLoading, isAnalyzing, error };
};
