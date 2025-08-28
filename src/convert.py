# src/convert.py

import tensorflow as tf
from pathlib import Path
# train.pyと全く同じモデル構造をここに定義する必要があります
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization

# --- 定数 ---
# train.pyからコピー
TIMESTEPS = 150
NUM_FEATURES = 12
NUM_CLASSES = 60

# --- パス設定 ---
project_root = Path(__file__).resolve().parent.parent
weights_path = project_root / 'data' / 'conducting_model.weights.h5'
savedmodel_path = project_root / 'data' / 'conducting_model_savedmodel'

# --- メイン処理 ---
def main():
    # 1. train.pyと全く同じ骨格のモデルを定義
    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(TIMESTEPS, NUM_FEATURES)),
        BatchNormalization(),
        Dropout(0.5),
        LSTM(64),
        BatchNormalization(),
        Dropout(0.5),
        Dense(64, activation='relu'),
        Dense(NUM_CLASSES, activation='softmax')
    ])
    print("モデルの骨格を定義しました。")

    # 2. 保存した「重み」をロード
    model.load_weights(weights_path)
    print(f"重みをロードしました: {weights_path}")

    # 3. モデルをSavedModel形式でエクスポート
    model.export(savedmodel_path)
    print(f"🎉 モデルをSavedModel形式でエクスポートしました！: {savedmodel_path}")

if __name__ == '__main__':
    main()