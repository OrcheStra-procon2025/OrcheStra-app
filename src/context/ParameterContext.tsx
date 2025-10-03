import { useState, type ReactNode } from "react";
import type { MusicDataModel } from "@/utils/models";
import { type ParameterContextType, ParameterContext } from "./useGlobalParams";

export const ParameterProvider = ({ children }: { children: ReactNode }) => {
  // ページを超えて共有したいパラメータを定義
  const [selectedMusic, setSelectedMusic] = useState<MusicDataModel | null>(
    null,
  );

  const updateSelectedMusic = (music: MusicDataModel | null) => {
    console.log("call");
    setSelectedMusic(music);
  };

  const value: ParameterContextType = { selectedMusic, updateSelectedMusic };

  return (
    <ParameterContext.Provider value={value}>
      {children}
    </ParameterContext.Provider>
  );
};
