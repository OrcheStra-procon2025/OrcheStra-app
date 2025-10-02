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

export type { NormalizedLandmark, NormalizedLandmarkList, ScalerInfoModel };
