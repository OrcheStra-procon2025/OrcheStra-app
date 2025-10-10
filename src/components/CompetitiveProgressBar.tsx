import { Box, Text, Image } from "@chakra-ui/react";
import { useEffect, useState, useRef, useCallback } from "react";
import OrcheStraIon from "@/assets/OS.png";

// アニメーションにかける時間
const DURATION: number = 2000;

interface CompetitiveProgressBarProps {
  labelLeft: string;
  labelRight: string;
  value: number;
  onAnimationEnd: () => void;
  isCurrentAnimating: boolean;
}

export const CompetitiveProgressBar = ({
  labelLeft,
  labelRight,
  value,
  onAnimationEnd,
  isCurrentAnimating,
}: CompetitiveProgressBarProps) => {
  const [displayValue, setDisplayValue] = useState(50);
  const [isFinished, setIsFinished] = useState(false);

  const intervalRef = useRef<number | NodeJS.Timeout | null>(null);

  const totalDuration = DURATION;
  const stageDuration = totalDuration / 3;

  const startProgressAnimation = useCallback(() => {
    if (isFinished) return;

    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;

      if (elapsed < stageDuration) {
        // Stage 1: 50%から100%近くまで上昇
        const progress = elapsed / stageDuration;
        const newValue = 50 + 50 * progress + Math.random() * 5;
        setDisplayValue(Math.min(100, Math.max(0, newValue)));
      } else if (elapsed < stageDuration * 2) {
        // Stage 2: 100%近くから0%近くまで下降
        const stageElapsed = elapsed - stageDuration;
        const progress = stageElapsed / stageDuration;
        const newValue = 100 * (1 - progress) + Math.random() * 5;
        setDisplayValue(Math.min(100, Math.max(0, newValue)));
      } else if (elapsed < totalDuration) {
        // Stage 3: 0%近くから最終値へ収束
        const stageElapsed = elapsed - stageDuration * 2;
        const progress = stageElapsed / stageDuration;

        const startVal = 0;
        const finalVal = value;
        const newValue = startVal * (1 - progress) + finalVal * progress;

        const randomOffset = (Math.random() - 0.5) * 5 * (1 - progress);
        setDisplayValue(Math.min(100, Math.max(0, newValue + randomOffset)));
      } else {
        clearInterval(intervalRef.current as number | NodeJS.Timeout);
        intervalRef.current = null;

        setDisplayValue(value);
        setIsFinished(true);
        onAnimationEnd();
      }
    }, 20);
  }, [value, onAnimationEnd, isFinished, totalDuration, stageDuration]);

  useEffect(() => {
    if (isCurrentAnimating && !isFinished) {
      setDisplayValue(50);
      startProgressAnimation();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current as number | NodeJS.Timeout);
      }
    };
  }, [isCurrentAnimating, isFinished, startProgressAnimation]);

  const barWidth = Math.round(displayValue);

  return (
    <Box
      width="60vw"
      maxWidth="800px"
      borderRadius="md"
      boxShadow="md"
      pl="10"
      pr="10"
    >
      {/* ラベルとバーを横並びにするためのFlexコンテナ */}
      <Box display="flex" alignItems="center" mb={1}>
        {/* 左側のラベル領域 (20%) */}
        <Box width="100px" textAlign="center" flexShrink={0} mr={2}>
          <Text fontSize="sm" fontWeight="bold" color="blue.600">
            {labelLeft}
          </Text>
        </Box>

        <Box
          height="12px"
          borderRadius="full"
          width="60%"
          position="relative"
          background="linear-gradient(to right, #4299e1 0%, #63b3ed 30%, #f687b3 70%, #e53e3e 100%)"
          flexGrow={1}
        >
          <Box
            position="absolute"
            top="50%"
            transform="translate(-50%, -50%)"
            zIndex="1"
            width="55px"
            height="55px"
            left={`${barWidth}%`}
            transition={
              isFinished || (isCurrentAnimating && !intervalRef.current)
                ? "none"
                : "left 0.03s linear"
            }
          >
            <Image
              src={OrcheStraIon}
              alt="OrcheStra Icon"
              width="100%"
              height="100%"
              objectFit="contain"
            />
          </Box>
        </Box>

        <Box width="100px" textAlign="center" flexShrink={0} ml={2}>
          <Text fontSize="sm" fontWeight="bold" color="red.600">
            {labelRight}
          </Text>
        </Box>
      </Box>

      {/* 数値表示 */}
      <Text mt={2} textAlign="center" fontSize="lg" fontWeight="extrabold">
        {`${(barWidth - 50) * 2}%`}
      </Text>
    </Box>
  );
};
