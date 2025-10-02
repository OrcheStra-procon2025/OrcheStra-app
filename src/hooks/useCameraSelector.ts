import { useState, useEffect, useCallback } from "react";

const useCameraSelector = () => {
  const [cameraDevices, setCameraDevices] = useState<
    { id: string; label: string }[]
  >([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(
    undefined,
  );
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, index) => ({
            id: d.deviceId,
            label: d.label || `Camera ${index + 1}`,
          }));

        setCameraDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].id);
        }
        setIsCameraReady(true);
      } catch (error) {
        console.error("カメラの列挙に失敗しました:", error);
        setIsCameraReady(false);
      }
    };
    setup();
  }, []);

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedDeviceId(e.target.value);
    },
    [],
  );

  return {
    cameraDevices,
    selectedDeviceId,
    isCameraReady,
    handleSelectChange,
  };
};

export { useCameraSelector };
