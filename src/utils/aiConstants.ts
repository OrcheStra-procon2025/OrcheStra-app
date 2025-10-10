// src/utils/aiConstants.ts

export const KEY_JOINTS_MEDIAPIPE = {
  RIGHT_WRIST: 16, LEFT_WRIST: 15, RIGHT_ELBOW: 14, LEFT_ELBOW: 13,
};

export const ID_TO_STYLE_MAP: { [key: number]: string } = {
  0: "穏やか", 1: "穏やか", 2: "細やか", 3: "細やか", 4: "激しい", 5: "滑らか",
  6: "細やか", 7: "細やか", 8: "細やか", 9: "細やか", 10: "細やか", 11: "細やか",
  12: "力強い", 13: "穏やか", 14: "穏やか", 15: "リズミカル", 16: "リズミカル",
  17: "激しい", 18: "細やか", 19: "細やか", 20: "細やか", 21: "細やか", 22: "細やか",
  23: "細やか", 24: "滑らか", 25: "切迫した", 26: "切迫した", 27: "細やか", 28: "穏やか",
  29: "リズミカル", 30: "力強い", 31: "切迫した", 32: "滑らか", 33: "切迫した",
  34: "切迫した", 35: "切迫した", 36: "切迫した", 37: "切迫した", 38: "滑らか",
  39: "激しい", 40: "激しい", 41: "力強い", 42: "穏やか", 43: "力強い", 44: "滑らか",
  45: "穏やか", 46: "細やか", 47: "滑らか", 48: "力強い", 49: "細やか", 50: "リズミカル",
  51: "リズミカル", 52: "細やか", 53: "細やか", 54: "細やか", 55: "力強い",
  56: "切迫した", 57: "切迫した", 58: "切迫した", 59: "特徴的な",
};

export const ID_TO_STYLE_REMAP: { [key: number]: string } = {};
for (const id in ID_TO_STYLE_MAP) {
  const style = ID_TO_STYLE_MAP[parseInt(id)];
  if (["穏やか", "細やか", "滑らか"].includes(style)) ID_TO_STYLE_REMAP[id] = "soft";
  else if (["激しい", "力強い"].includes(style)) ID_TO_STYLE_REMAP[id] = "strong";
  else if (["リズミカル", "切迫した"].includes(style)) ID_TO_STYLE_REMAP[id] = "fast";
  else ID_TO_STYLE_REMAP[id] = "unique";
}

export const STYLE_TO_CATEGORY_MAP: { [key: string]: string[] } = {
  soft: ["slow"],
  strong: [],
  fast: ["fast"],
  unique: [],
};