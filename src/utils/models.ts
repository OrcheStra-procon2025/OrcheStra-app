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

type AccelDataModel = {
  acc_x: number;
  acc_y: number;
  acc_z: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
};

export type {
  NormalizedLandmark,
  NormalizedLandmarkList,
  ScalerInfoModel,
  MusicDataModel,
  AccelDataModel,
};
