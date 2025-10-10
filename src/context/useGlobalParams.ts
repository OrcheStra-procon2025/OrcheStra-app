import { useContext, createContext } from "react";
import type { MusicDataModel, NormalizedLandmarkList } from "@/utils/models";

export type ParameterContextType = {
  selectedMusic: MusicDataModel | null;
  updateSelectedMusic: (music: MusicDataModel | null) => void;
  poseDataList: NormalizedLandmarkList[];
  updatePoseDataList: (poseList: NormalizedLandmarkList[]) => void;
  webSocketObject: WebSocket | null;
  updateWebSocketObject: (ws: WebSocket | null) => void;
};

export const ParameterContext = createContext<ParameterContextType | null>(
  null,
);

export const useGlobalParams = () => {
  const context = useContext(ParameterContext);
  if (!context) {
    throw new Error(
      "useGlobalParams は ParameterProvider の中で使用する必要があります",
    );
  }
  return context;
};
