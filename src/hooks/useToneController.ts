import * as Tone from "tone";
import { useRef, useState } from "react";

export const useToneController = () => {
  const playerRef = useRef<Tone.Player | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const load = async (file: File) => {
    await Tone.start();
    const url = URL.createObjectURL(file);
    playerRef.current = new Tone.Player({ url, loop: false }).toDestination();
  };

  const play = () => {
    if (playerRef.current && !isPlaying) {
      playerRef.current.start();
      setIsPlaying(true);
    }
  };

  const stop = () => {
    if (playerRef.current && isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
    }
  };

  const adjustPlayback = (volumeDb: number, rate: number) => {
    if (!playerRef.current) return;
    playerRef.current.volume.value = volumeDb;
    playerRef.current.playbackRate = rate;
  };

  return { load, play, stop, adjustPlayback, isPlaying };
};
