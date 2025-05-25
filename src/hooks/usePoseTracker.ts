import { useEffect, useRef } from "react";
import { Pose } from "@mediapipe/pose";
import * as cam from "@mediapipe/camera_utils";
import type { MotionData } from "@/models/motion";
import type { NormalizedLandmark } from "@mediapipe/pose";

export const usePoseTracker = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onMotion: (motion: MotionData) => void,
) => {
  const lastWrist = useRef<NormalizedLandmark | null>(null);
  const lastTimestamp = useRef(performance.now());

  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results) => {
      const wrist = results.poseLandmarks?.[16];
      const now = performance.now();

      if (wrist && lastWrist.current) {
        const dx = wrist.x - lastWrist.current.x;
        const dy = wrist.y - lastWrist.current.y;
        const dz = wrist.z - lastWrist.current.z;
        const distance = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
        const deltaTime = (now - lastTimestamp.current) / 1000;
        const speed = distance / deltaTime;

        onMotion({
          distance,
          speed,
          rawLandmarks: results.poseLandmarks as NormalizedLandmark[],
        });
      }

      if (wrist) {
        lastWrist.current = wrist;
        lastTimestamp.current = now;
      }
    });

    if (videoRef.current) {
      const camera = new cam.Camera(videoRef.current, {
        onFrame: async () => {
          await pose.send({ image: videoRef.current! });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }, [videoRef, onMotion]);
};
