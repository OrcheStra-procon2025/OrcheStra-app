import { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import type { NormalizedLandmarkList } from "@/utils/models";
import { KEY_JOINTS_MEDIAPIPE } from "@/utils/aiConstants";

interface ConductingMusicPlayer {
  isPlayerReady: boolean;
  playMusic: () => Promise<void>;
  stopMusic: () => void;
  updateTempoFromPose: (pose: NormalizedLandmarkList) => void;
}

export const useConductingMusicPlayer = (musicPath: string | null): ConductingMusicPlayer => {
  const playerRef = useRef<Tone.Player | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  const lastPoseRef = useRef<NormalizedLandmarkList | null>(null);
  const lastVelocityRef = useRef<number>(0);
  const accelerationsRef = useRef<number[]>([]);

  useEffect(() => {
    playerRef.current?.dispose();
    setIsPlayerReady(false);
    if (!musicPath) return;

    try {
      const player = new Tone.Player({
        url: musicPath,
        loop: true,
        onload: () => setIsPlayerReady(true),
      }).toDestination();
      playerRef.current = player;
    } catch (error) {
      console.error("Tone.Playerの作成に失敗しました:", error);
    }

    // ▼▼▼ 変更点 ▼▼▼
    return () => {
      playerRef.current?.dispose();
    };
    // ▲▲▲ 変更点 ▲▲▲
  }, [musicPath]);

  const playMusic = useCallback(async () => {
    if (Tone.context.state !== "running") await Tone.start();
    if (playerRef.current && isPlayerReady) playerRef.current.start();
  }, [isPlayerReady]);

  const stopMusic = useCallback(() => {
    if (playerRef.current) playerRef.current.stop();
  }, []);

  const updateTempoFromPose = useCallback((currentPose: NormalizedLandmarkList) => {
    const player = playerRef.current;
    if (!player || player.state !== "started" || !lastPoseRef.current) {
      lastPoseRef.current = currentPose;
      return;
    }

    let currentVelocity = 0;
    const keyJoints = [KEY_JOINTS_MEDIAPIPE.RIGHT_WRIST, KEY_JOINTS_MEDIAPIPE.LEFT_WRIST];
    for (const jointId of keyJoints) {
        const p1 = lastPoseRef.current[jointId];
        const p2 = currentPose[jointId];
        if (p1 && p2) {
            currentVelocity += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        }
    }
    currentVelocity /= keyJoints.length;

    const currentAcceleration = Math.abs(currentVelocity - lastVelocityRef.current);

    accelerationsRef.current.push(currentAcceleration);
    if (accelerationsRef.current.length > 30) {
        accelerationsRef.current.shift();
    }
    const avgAcceleration = accelerationsRef.current.reduce((a, b) => a + b, 0) / accelerationsRef.current.length;
    
    const MIN_ACCELERATION = 0.001;
    const MAX_ACCELERATION = 0.01;
    const MIN_VOLUME_DB = -15;
    const MAX_VOLUME_DB = 0;

    let targetVolume = MAX_VOLUME_DB;
    if (avgAcceleration < MIN_ACCELERATION) {
      targetVolume = MIN_VOLUME_DB;
    } else if (avgAcceleration > MAX_ACCELERATION) {
      targetVolume = MAX_VOLUME_DB;
    } else {
      const ratio = (avgAcceleration - MIN_ACCELERATION) / (MAX_ACCELERATION - MIN_ACCELERATION);
      targetVolume = MIN_VOLUME_DB + ratio * (MAX_VOLUME_DB - MIN_VOLUME_DB);
    }

    const smoothingFactor = 0.05;
    player.volume.value = player.volume.value * (1 - smoothingFactor) + targetVolume * smoothingFactor;

    lastPoseRef.current = currentPose;
    lastVelocityRef.current = currentVelocity;
  }, []);

  return { isPlayerReady, playMusic, stopMusic, updateTempoFromPose };
};