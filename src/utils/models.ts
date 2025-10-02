type NormalizedLandmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

type NormalizedLandmarkList = NormalizedLandmark[];

type ScalerInfoModel = {
  mean: number[];
  scale: number[];
};

type MusicDataModel = {
  id: number;
  title: string;
  artist: string;
  path: string;
};

export type {
  NormalizedLandmark,
  NormalizedLandmarkList,
  ScalerInfoModel,
  MusicDataModel,
};
