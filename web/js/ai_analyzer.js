// web/js/ai_analyzer.js  (CDN版 完全動作)

const MAX_TIMESTEPS = 150;
const NUM_FEATURES = 12;

// Mediapipe関節インデックス
const KEY_JOINTS_MEDIAPIPE = {
    RIGHT_WRIST: 16,
    LEFT_WRIST: 15,
    RIGHT_ELBOW: 14,
    LEFT_ELBOW: 13
};

// クラスID → スタイル名
const ID_TO_STYLE_MAP = {
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

// ---------- 内部処理 ----------

async function analyzeSequence(fullPoseData, aiModel, scalerInfo) {
    console.log("--- AI分析開始 ---");
    const styleSequence = [];

    if (!fullPoseData || fullPoseData.length === 0) {
        console.error("骨格データが空です");
        return [];
    }

    for (let i = 0; i < fullPoseData.length; i += MAX_TIMESTEPS) {
        const chunk = fullPoseData.slice(i, i + MAX_TIMESTEPS);

        // 関節データ抽出
        const sequence = chunk.map(frame => {
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
        const predictionTensor = aiModel.predict(inputTensor);

        const predictionArray = await predictionTensor.array();
        const predictedIndex = predictionTensor.argMax(-1).dataSync()[0];

        const style = ID_TO_STYLE_MAP[predictedIndex] || '特徴的な';
        console.log("予測ID:", predictedIndex, "スタイル:", style);

        styleSequence.push(style);
        tf.dispose([inputTensor, predictionTensor]);
    }

    console.log("--- AI分析完了 ---");
    return styleSequence;
}

function segmentSequence(styleSequence) {
    return styleSequence; // 必要に応じて分割処理を追加
}

function generateFeedbackText(segments) {
    if (segments.length === 0) return "データが不足しています。";
    const unique = [...new Set(segments)];
    return `今回の指揮は「${unique.join('・')}」の傾向が見られました。`;
}

// ---------- 公開関数 ----------

export async function createAiAnalyzer() {
    // ✅ LayersModel として読み込む
    const aiModel = await tf.loadLayersModel('../data/tfjs_model/model.json');
    const scalerInfo = await (await fetch('../data/scaler.json')).json();

    return {
        async analyze(fullPoseData) {
            const styleSequence = await analyzeSequence(fullPoseData, aiModel, scalerInfo);
            const segments = segmentSequence(styleSequence);
            return generateFeedbackText(segments);
        }
    };
}
