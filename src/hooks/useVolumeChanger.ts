import { useRef, useCallback } from "react";
import * as Tone from "tone";
import type { NormalizedLandmarkList } from "@/utils/models";
import { KEY_JOINTS_MEDIAPIPE } from "@/utils/aiConstants";

interface VolumeChanger {
  updateVolumeFromPose: (pose: NormalizedLandmarkList, player: Tone.GrainPlayer) => void;
}

export const useVolumeChanger = (): VolumeChanger => {

  const lastPoseRef = useRef<NormalizedLandmarkList | null>(null);
  const lastVelocityRef = useRef<number>(0);
  const accelerationsRef = useRef<number[]>([]);

  const updateVolumeFromPose = useCallback((currentPose: NormalizedLandmarkList, player: Tone.GrainPlayer) => {
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

  return { updateVolumeFromPose };
};