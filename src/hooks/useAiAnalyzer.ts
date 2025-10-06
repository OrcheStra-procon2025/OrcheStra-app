import { useState, useEffect, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import type {
  NormalizedLandmarkList,
  ScalerInfoModel,
  ProgressBarData,
} from "@/utils/models";

// AI出力IDとプログレスバー指標のマッピング定義
const LABEL_MAPPINGS = {
  brightness: {
    labelLeft: "暗い",
    labelRight: "明るい",
    ids: Array.from({ length: 12 }, (_, i) => i), // ID 0-11
  },
  strength: {
    labelLeft: "弱い",
    labelRight: "強い",
    ids: Array.from({ length: 12 }, (_, i) => i + 12), // ID 12-23
  },
  dynamism: {
    labelLeft: "静的",
    labelRight: "動的",
    ids: Array.from({ length: 12 }, (_, i) => i + 24), // ID 24-35
  },
  tempo: {
    labelLeft: "ゆったり",
    labelRight: "速い",
    ids: Array.from({ length: 12 }, (_, i) => i + 36), // ID 36-47
  },
  size: {
    labelLeft: "小さい",
    labelRight: "大きい",
    ids: Array.from({ length: 12 }, (_, i) => i + 48), // ID 48-59
  },
};

// --- ここから追加・修正 ---

// IDから対応するラベル名を取得する関数
const getLabelFromId = (id: number): string => {
  for (const key in LABEL_MAPPINGS) {
    const mapping = LABEL_MAPPINGS[key as keyof typeof LABEL_MAPPINGS];
    if (mapping.ids.includes(id)) {
      const indexInIds = mapping.ids.indexOf(id);
      // ids配列の前半(0-5)ならlabelLeft、後半(6-11)ならlabelRight
      return indexInIds < 6 ? mapping.labelLeft : mapping.labelRight;
    }
  }
  return "不明なスタイル";
};

// フィードバック生成ロジックを修正
const generateFeedbackText = (segments: number[][]): string => {
  if (segments.length === 0) {
    return "分析結果がありません。";
  }
  // 最も長く続いたセグメントのスタイルIDを取得
  const mainStyleId = segments.sort((a, b) => b.length - a.length)[0][0];
  const styleLabel = getLabelFromId(mainStyleId);

  return `あなたの指揮は、全体的に「${styleLabel}」の特徴が強く見られました。`;
};

// --- ここまで追加・修正 ---

// ユーティリティ関数
const preprocessData = (
  landmarks: NormalizedLandmarkList,
  scaler: ScalerInfoModel,
): number[] => {
  const flattened = [
    landmarks[15].x, landmarks[15].y, landmarks[15].z,
    landmarks[16].x, landmarks[16].y, landmarks[16].z,
    landmarks[17].x, landmarks[17].y, landmarks[17].z,
    landmarks[18].x, landmarks[18].y, landmarks[18].z,
  ];
  return flattened.map((val, i) => (val - scaler.mean[i]) / scaler.scale[i]);
};

const segmentSequence = (sequence: number[]): number[][] => {
  if (sequence.length === 0) return [];
  const segments: number[][] = [[sequence[0]]];
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i] === sequence[i - 1]) {
      segments[segments.length - 1].push(sequence[i]);
    } else {
      segments.push([sequence[i]]);
    }
  }
  return segments;
};

const calculateProgressBarData = (
  averageProbabilities: number[],
): ProgressBarData[] => {
  return Object.values(LABEL_MAPPINGS).map(
    ({ labelLeft, labelRight, ids }) => {
      const leftIds = ids.slice(0, 6);
      const rightIds = ids.slice(6, 12);

      const leftValue = leftIds.reduce(
        (sum, id) => sum + averageProbabilities[id],
        0,
      );
      const rightValue = rightIds.reduce(
        (sum, id) => sum + averageProbabilities[id],
        0,
      );

      const total = leftValue + rightValue;
      const value = total > 0 ? (rightValue / total) * 100 : 50;

      return { labelLeft, labelRight, value };
    },
  );
};


interface AiAnalyzerResult {
  analyze: (
    fullPoseData: NormalizedLandmarkList[],
  ) => Promise<{
    feedbackText: string;
    progressBarData: ProgressBarData[];
  }>;
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
        const model: tf.LayersModel = await tf.loadLayersModel(MODEL_URL);
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
    async (fullPoseData: NormalizedLandmarkList[]) => {
      if (isLoading || error || !aiModel || !scalerInfo) {
        console.warn("AIモデルがまだ準備できていません。");
        return {
          feedbackText: "AIシステムエラー：モデルが見つからないか、準備中です。",
          progressBarData: [],
        };
      }

      setIsAnalyzing(true);

      try {
        const SEQUENCE_LENGTH = 150;
        const allPredictions: number[][] = [];
        const styleSequence: number[] = [];

        for (let i = 0; i <= fullPoseData.length - SEQUENCE_LENGTH; i += 30) {
          const sequence = fullPoseData.slice(i, i + SEQUENCE_LENGTH);
          const processedSequence = sequence.map((landmarks) =>
            preprocessData(landmarks, scalerInfo),
          );

          const prediction = tf.tidy(() => {
            const inputTensor = tf.tensor3d([processedSequence]);
            const output = aiModel.predict(inputTensor) as tf.Tensor;
            return output.dataSync();
          });

          allPredictions.push(Array.from(prediction));
          styleSequence.push(
            prediction.indexOf(Math.max(...Array.from(prediction))),
          );
        }

        if (allPredictions.length === 0) {
          return {
            feedbackText: "分析するにはデータが短すぎます。",
            progressBarData: [],
          };
        }

        const numClasses = allPredictions[0].length;
        const averageProbabilities = Array(numClasses).fill(0);
        for (const preds of allPredictions) {
          for (let i = 0; i < numClasses; i++) {
            averageProbabilities[i] += preds[i];
          }
        }
        for (let i = 0; i < numClasses; i++) {
          averageProbabilities[i] /= allPredictions.length;
        }

        const progressBarData = calculateProgressBarData(averageProbabilities);
        const segments = segmentSequence(styleSequence);
        const feedbackText = generateFeedbackText(segments.map(s => s.map(id => id)));


        return { feedbackText, progressBarData };
      } catch (e) {
        console.error("AI分析中にエラーが発生しました:", e);
        return {
          feedbackText: "分析中にエラーが発生しました。",
          progressBarData: [],
        };
      } finally {
        setIsAnalyzing(false);
      }
    },
    [isLoading, error, aiModel, scalerInfo],
  );

  return { analyze, isLoading, isAnalyzing, error };
};