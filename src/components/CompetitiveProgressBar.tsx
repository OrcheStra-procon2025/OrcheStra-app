import { Box, Text } from "@chakra-ui/react";
import { useEffect, useState, useRef, useCallback } from "react";

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
        const progress = elapsed / stageDuration;
        const newValue = 50 + 50 * progress + Math.random() * 5;
        setDisplayValue(Math.min(100, Math.max(0, newValue)));
      } else if (elapsed < stageDuration * 2) {
        const stageElapsed = elapsed - stageDuration;
        const progress = stageElapsed / stageDuration;
        const newValue = 100 * (1 - progress) + Math.random() * 5;
        setDisplayValue(Math.min(100, Math.max(0, newValue)));
      } else if (elapsed < totalDuration) {
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
        clearInterval(intervalRef.current);
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
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Text fontSize="sm" fontWeight="bold" color="blue.600">
          {labelLeft}
        </Text>
        <Text fontSize="sm" fontWeight="bold" color="red.600">
          {labelRight}
        </Text>
      </Box>
      <Box
        height="12px"
        bg="gray.300"
        borderRadius="full"
        overflow="hidden"
        width="100%"
        position="relative"
      >
        <Box
          height="100%"
          width={`${barWidth}%`}
          background="linear-gradient(to right, #4299e1 0%, #63b3ed 30%, #f687b3 70%, #e53e3e 100%)"
          backgroundSize={`${(100 / barWidth) * 100}% 100%`}
          transition={
            isFinished || (isCurrentAnimating && !intervalRef.current)
              ? "none"
              : "width 0.03s linear"
          }
          style={{
            transformOrigin: "left",
          }}
        />
      </Box>
      <Text mt={2} textAlign="center" fontSize="lg" fontWeight="extrabold">
        {`${barWidth}%`}
      </Text>
    </Box>
  );
};
