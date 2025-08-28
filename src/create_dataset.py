# Procon/src/create_lstm_dataset.py

import numpy as np
import os
from pathlib import Path
from sklearn.preprocessing import StandardScaler

# --- 定数定義 ---
# NTU RGB+Dの関節インデックス
# 指揮で重要そうな関節に絞る (右手、左手、右肘、左肘)
# (4関節 x 3座標 = 12特徴量/フレーム)
KEY_JOINTS_INDICES = [11, 7, 10, 6] 

# 1つの動画の最大フレーム数（タイムステップ）
# これより長い動画は切り捨て、短い動画はゼロで埋める
MAX_TIMESTEPS = 150

# --- パス設定 ---
script_path = Path(__file__).resolve()
project_root = script_path.parent.parent
skeleton_folder = project_root / 'data' / 'skeletons'
# 出力ファイルはNumpy専用形式(.npy)で保存（CSVより高速で大容量向き）
output_data_path = project_root / 'data' / 'lstm_data.npy'
output_labels_path = project_root / 'data' / 'lstm_labels.npy'
output_scaler_path = project_root / 'data' / 'lstm_scaler.gz' # joblibはそのまま使える

# --- 関数定義 ---
# (parse_ntu_skeleton関数は前回と同じなのでここに含めます)
def parse_ntu_skeleton(filepath):
    # ... (前回の応答と同じコード) ...
    try:
        with open(filepath, 'r') as f: lines = f.readlines()
        frame_count = int(lines[0])
        all_frames_data, line_idx = [], 1
        for _ in range(frame_count):
            if line_idx >= len(lines): break
            body_count = int(lines[line_idx]); line_idx += 1
            frame_data = np.zeros((25, 3))
            if body_count > 0:
                line_idx += 1
                joint_count = int(lines[line_idx]); line_idx += 1
                for j in range(joint_count):
                    joint_info = lines[line_idx].split()
                    frame_data[j] = [float(coord) for coord in joint_info[0:3]]
                    line_idx += 1
                if body_count > 1: line_idx += (body_count - 1) * (1 + 1 + joint_count)
            all_frames_data.append(frame_data)
        return np.array(all_frames_data)
    except (IOError, ValueError): return None

# --- メイン処理 ---
def main():
    skeleton_files = [f for f in os.listdir(skeleton_folder) if f.endswith('.skeleton')]
    
    all_sequences = []
    all_labels = []

    for i, filename in enumerate(skeleton_files):
        print(f"処理中 ({i+1}/{len(skeleton_files)}): {filename}")
        filepath = skeleton_folder / filename
        
        skeleton_data = parse_ntu_skeleton(filepath)
        if skeleton_data is None or len(skeleton_data) == 0: continue

        # 1. 重要な関節のデータだけを抽出
        key_joints_data = skeleton_data[:, KEY_JOINTS_INDICES, :]
        # (フレーム数, 4関節, 3座標) -> (フレーム数, 12特徴量) に変形
        sequence = key_joints_data.reshape(len(key_joints_data), -1)

        # 2. パディング/トランケーションで長さをMAX_TIMESTEPSに揃える
        padded_sequence = np.zeros((MAX_TIMESTEPS, sequence.shape[1]))
        length = min(len(sequence), MAX_TIMESTEPS)
        padded_sequence[:length, :] = sequence[:length, :]
        
        all_sequences.append(padded_sequence)

        # 3. ラベルの作成 (アクションID - 1)
        try:
            label = int(filename.split('A')[1][:3]) - 1
            all_labels.append(label)
        except (IndexError, ValueError):
            del all_sequences[-1] # ラベルが作れなかったデータを削除

    X = np.array(all_sequences)
    y = np.array(all_labels)

    # 4. データ全体をスケーリング
    # (サンプル数, タイムステップ, 特徴量) -> (サンプル数*タイムステップ, 特徴量)
    X_reshaped = X.reshape(-1, X.shape[2])
    scaler = StandardScaler()
    X_scaled_reshaped = scaler.fit_transform(X_reshaped)
    # 元の3次元形状に戻す
    X_scaled = X_scaled_reshaped.reshape(X.shape)

    # 5. ファイルに保存
    np.save(output_data_path, X_scaled)
    np.save(output_labels_path, y)
    import joblib
    joblib.dump(scaler, output_scaler_path)

    print("-" * 30)
    print(f"🎉 LSTM用データセットの作成が完了！")
    print(f"データ保存先: {output_data_path}")
    print(f"ラベル保存先: {output_labels_path}")

if __name__ == '__main__':
    main()