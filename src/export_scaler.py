import joblib
import json
from pathlib import Path
import numpy as np

# パス設定
project_root = Path(__file__).resolve().parent.parent
scaler_input_path = project_root / 'data' / 'lstm_scaler.gz'
json_output_path = project_root / 'data' / 'scaler.json'

print(f"'{scaler_input_path}' を読み込んでいます...")

# .gz形式のスケーラーを読み込む
try:
    scaler = joblib.load(scaler_input_path)

    # JavaScriptで使えるように、データを辞書形式にまとめる
    scaler_info = {
        'mean': scaler.mean_.tolist(),   # 平均値のリスト
        'scale': scaler.scale_.tolist()  # スケール値（標準偏差）のリスト
    }

    # jsonファイルとして書き出す
    with open(json_output_path, 'w') as f:
        json.dump(scaler_info, f, indent=2)
    
    print(f"🎉 成功: '{json_output_path}' を作成しました。")

except FileNotFoundError:
    print(f"エラー: '{scaler_input_path}' が見つかりません。先に `create_lstm_dataset.py` を実行してください。")
except Exception as e:
    print(f"エラーが発生しました: {e}")