import numpy as np
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
file_path = project_root / 'data' / 'lstm_data.npy'

try:
    # ここに allow_pickle=True を追加
    data = np.load(file_path, allow_pickle=True)
    
    print("--- ファイルの中身 (最初の5件) ---")
    print(data[:5]) # データが巨大なので最初の5件だけ表示
    
    print("\n--- データの情報 ---")
    print(f"形状 (Shape): {data.shape}")
    print(f"データ型 (Dtype): {data.dtype}")

except FileNotFoundError:
    print(f"エラー: ファイルが見つかりません: {file_path}")