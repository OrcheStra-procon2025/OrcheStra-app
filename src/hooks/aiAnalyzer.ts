import { KEY_JOINTS_MEDIAPIPE } from "@/utils/mediapipeJoint";
import { ID_TO_STYLE_MAP } from "@/utils/aiStypeMap";
import type { NormalizedLandmarkList, ScalerInfoModel } from "@/utils/models";
import * as tf from '@tensorflow/tfjs'; 

const MAX_TIMESTEPS = 150;
const NUM_FEATURES = 12;


// ---------- 内部処理 ----------

const analyzeSequence = async (fullPoseData: NormalizedLandmarkList[], aiModel: tf.LayersModel, scalerInfo: ScalerInfoModel) => {
    console.log("--- AI分析開始 ---");
    const styleSequence = [];

    if (!fullPoseData || fullPoseData.length === 0) {
        console.error("骨格データが空です");
        return [];
    }

    for (let i = 0; i < fullPoseData.length; i += MAX_TIMESTEPS) {
        const chunk = fullPoseData.slice(i, i + MAX_TIMESTEPS);

        // 関節データ抽出
        const sequence = chunk.map((frame: NormalizedLandmarkList) => {
            if (!frame) return Array(NUM_FEATURES).fill(0);
            const rh = frame[KEY_JOINTS_MEDIAPIPE.RIGHT_WRIST];
            const lh = frame[KEY_JOINTS_MEDIAPIPE.LEFT_WRIST];
            const re = frame[KEY_JOINTS_MEDIAPIPE.RIGHT_ELBOW];
            const le = frame[KEY_JOINTS_MEDIAPIPE.LEFT_ELBOW];
            if (!rh || !lh || !re || !le) return Array(NUM_FEATURES).fill(0);
            return [
                rh.x, rh.y, rh.z,
                lh.x, lh.y, lh.z,
                re.x, re.y, re.z,
                le.x, le.y, le.z
            ];
        });

        // パディング
        const paddedSequence = Array.from({ length: MAX_TIMESTEPS }, (_, idx) =>
            idx < sequence.length ? sequence[idx] : Array(NUM_FEATURES).fill(0)
        );

        // スケーリング
        for (let j = 0; j < paddedSequence.length; j++) {
            for (let k = 0; k < NUM_FEATURES; k++) {
                paddedSequence[j][k] =
                    (paddedSequence[j][k] - scalerInfo.mean[k]) / scalerInfo.scale[k];
            }
        }

        // 推論
        const inputTensor = tf.tensor3d([paddedSequence]); // shape [1,150,12]
        const predictionTensor = aiModel.predict(inputTensor) as tf.Tensor;

        // const predictionArray = await predictionTensor.array();
        const predictedIndex = predictionTensor.argMax(-1).dataSync()[0];

        const style = ID_TO_STYLE_MAP[predictedIndex] || '特徴的な';
        console.log("予測ID:", predictedIndex, "スタイル:", style);

        styleSequence.push(style);
        tf.dispose([inputTensor, predictionTensor]);
    }

    console.log("--- AI分析完了 ---");
    return styleSequence;
}

function segmentSequence(styleSequence: string[]) {
    return styleSequence; // 必要に応じて分割処理を追加
}

function generateFeedbackText(segments: string[]) {
    if (segments.length === 0) return "データが不足しています。";
    const unique = [...new Set(segments)];
    return `今回の指揮は「${unique.join('・')}」の傾向が見られました。`;
}


const analyze = async(fullPoseData: NormalizedLandmarkList[]) => {
    // LayersModel として読み込む
    const aiModel = await tf.loadLayersModel("@/predictModel/tfjs_model/model.json");
    const scalerInfo = await (await fetch("@/predictModel/scaler.json")).json();
    const styleSequence = await analyzeSequence(fullPoseData, aiModel, scalerInfo);
    const segments = segmentSequence(styleSequence);

    return generateFeedbackText(segments);
}

export { analyze }
