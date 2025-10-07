import { useState, useEffect, useRef } from "react";
import * as Tone from "tone";
import { useGlobalParams } from "@/context/useGlobalParams";

interface MusicPlayer {
  isPlayerReady: boolean;
  player: Tone.GrainPlayer | null;
  musicPath: string | null;
  playMusic: () => Promise<void>;
  stopMusic: () => void;
  isError: boolean;
}

export const useMusicPlayer = (): MusicPlayer => {
  const { selectedMusic } = useGlobalParams();
  const playerRef = useRef<Tone.GrainPlayer | null>(null);
  const musicPathRef = useRef<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // Tone.Playerを初期化し、音楽ファイルをロードする
    const setupPlayer = () => {
      musicPathRef.current = selectedMusic?.path || null;
      try {
        const player = new Tone.GrainPlayer({
          url: selectedMusic?.path || "",
          grainSize: 0.1,
          onload: () => {
            console.log("音楽ファイルのロードが完了しました。");
            setIsPlayerReady(true);
          },
          onerror: (error) => {
            setIsError(true);
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

  return {
    isPlayerReady,
    player: playerRef.current,
    musicPath: musicPathRef.current,
    playMusic,
    stopMusic,
    isError,
  };
};
