import { useState, type ReactNode } from "react";
import type { MusicDataModel, NormalizedLandmarkList } from "@/utils/models";
import { type ParameterContextType, ParameterContext } from "./useGlobalParams";

export const ParameterProvider = ({ children }: { children: ReactNode }) => {
  // ページを超えて共有したいパラメータを定義
  const [selectedMusic, setSelectedMusic] = useState<MusicDataModel | null>(
    null,
  );
  const [webSocketObject, setWebSocketObject] = useState<WebSocket | null>(
    null,
  );
  const [poseDataList, setPoseDataList] = useState<NormalizedLandmarkList[]>(
    [],
  );

  const updateSelectedMusic = (music: MusicDataModel | null) => {
    setSelectedMusic(music);
  };
  const updatePoseDataList = (poseList: NormalizedLandmarkList[]) => {
    setPoseDataList(poseList);
  };
  const updateWebSocketObject = (ws: WebSocket | null) => {
    setWebSocketObject(ws);
  };

  const value: ParameterContextType = {
    selectedMusic,
    updateSelectedMusic,
    poseDataList,
    updatePoseDataList,
    webSocketObject,
    updateWebSocketObject,
  };

  return (
    <ParameterContext.Provider value={value}>
      {children}
    </ParameterContext.Provider>
  );
};
