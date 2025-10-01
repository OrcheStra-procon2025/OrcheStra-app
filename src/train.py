# Procon/src/train.py (LSTM対応版)

import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from sklearn.model_selection import train_test_split
from pathlib import Path

# --- パス設定 ---
script_path = Path(__file__).resolve()
project_root = script_path.parent.parent
data_path = project_root / 'data' / 'lstm_data.npy'
labels_path = project_root / 'data' / 'lstm_labels.npy'
# 保存先をファイルではなく、フォルダ名に変更
model_save_path = project_root / 'data' / 'conducting_model_savedmodel'

# --- メイン処理 ---
def main():
    # 1. .npyファイルからデータを読み込み
    print(f"データセットを読み込んでいます: {data_path}")
    X = np.load(data_path)
    y = np.load(labels_path)
    
    # データの形状とクラス数を取得
    num_samples, timesteps, num_features = X.shape
    num_classes = len(np.unique(y))
    print(f"データ読み込み完了。形状: ({num_samples}, {timesteps}, {num_features}), クラス数: {num_classes}")

    # 2. データの前処理 (訓練データとテストデータに分割)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 3. LSTMモデルの構築
    model = Sequential([
        # 入力層: (タイムステップ数, 1フレームあたりの特徴量数)
        LSTM(64, return_sequences=True, input_shape=(timesteps, num_features)),
        BatchNormalization(),
        Dropout(0.5),
        
        LSTM(64),
        BatchNormalization(),
        Dropout(0.5),
        
        Dense(64, activation='relu'),
        # 出力層: クラス数に合わせる
        Dense(num_classes, activation='softmax')
    ])

    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    model.summary()

    # 4. モデルの学習
    print("\nLSTMモデルの学習を開始します...")
    # (EarlyStoppingは過学習を防ぎ、最適なモデルを保存するのに役立ちます)
    callbacks = [tf.keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True)]
    history = model.fit(
        X_train, y_train,
        epochs=50,  # エポック数は調整が必要
        batch_size=32,
        validation_split=0.2,
        callbacks=callbacks
    )

    # 5. モデルの評価
    loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
    print("-" * 30)
    print(f"テストデータでの正解率 (Accuracy): {accuracy:.4f}")

    # 6. モデルの「重み」のみを保存
    weights_save_path = project_root / 'data' / 'conducting_model.weights.h5'
    model.save_weights(weights_save_path)
    print(f"🎉 学習済みの重みを保存しました！: {weights_save_path}")

if __name__ == '__main__':
    main()