# ベースイメージを、MediaPipeと互換性のある安定バージョンに変更
FROM tensorflow/tensorflow:2.15.0-gpu-jupyter

# (これ以降の内容は変更ありません)
WORKDIR /app
COPY requirements.txt .
RUN pip install --default-timeout=600 --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8888