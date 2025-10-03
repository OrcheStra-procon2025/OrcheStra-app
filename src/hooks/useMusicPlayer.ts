import { useState, useEffect, useRef } from "react";
import * as Tone from "tone";
import { useGlobalParams } from "@/context/useGlobalParams";

interface MusicPlayer {
  isPlayerReady: boolean;
  playMusic: () => Promise<void>;
  stopMusic: () => void;
}

export const useMusicPlayer = (): MusicPlayer => {
  const { selectedMusic } = useGlobalParams();
  const playerRef = useRef<Tone.Player | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useEffect(() => {
    // Tone.Playerを初期化し、音楽ファイルをロードする
    const setupPlayer = () => {
      try {
        const player = new Tone.Player({
          url: selectedMusic?.path || "",
          onload: () => {
            console.log("音楽ファイルのロードが完了しました。");
            setIsPlayerReady(true);
          },
          onerror: (error) => {
            console.error(
              "音楽ファイルのロード中にエラーが発生しました:",
              error,
            );
          },
        }).toDestination();
        playerRef.current = player;
      } catch (error) {
        console.error("Tone.Playerの作成に失敗しました:", error);
      }
    };

    setupPlayer();

    // コンポーネントのアンマウント時にプレイヤーを破棄
    return () => {
      playerRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playMusic = async () => {
    // ブラウザの自動再生ポリシーに対応するため、Tone.start()を呼び出す
    if (Tone.context.state !== "running") {
      await Tone.start();
    }

    if (playerRef.current && isPlayerReady) {
      playerRef.current.start();
    }
  };

  const stopMusic = () => {
    if (playerRef.current) {
      playerRef.current.stop();
    }
  };

  return { isPlayerReady, playMusic, stopMusic };
};
