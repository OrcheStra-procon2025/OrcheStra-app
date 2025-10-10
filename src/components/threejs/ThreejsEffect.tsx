import { Canvas } from "@react-three/fiber";
import { useEffect, useState, useCallback } from "react"; // useCallback をインポート
import { OrthographicCamera } from "@react-three/drei";
import { StarEffect } from "./SterEffect";

const objectList: string[] = [
  "objects/star.glb",
  "objects/star_deepskyblue.glb",
  "objects/star_white.glb",
  "objects/star_pink2.glb",
  "objects/star_green.glb",
];

// (中略)
export const ThreejsEffect = ({ x, y }: { x: number; y: number }) => {
  const [components, setComponents] = useState<
    { id: number; position: [number, number, number]; objectPath: string }[]
  >([]);

  useEffect(() => {
    setComponents((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        position: [
          (x * 20) / window.innerWidth,
          (-y /
            (document.getElementById("webcam")?.getBoundingClientRect().height /
              2)) *
            3.796875,
          0,
        ],
        objectPath: objectList[Math.floor(Math.random() * 5)],
      },
    ]);
    return;
  }, [x, y]);

  // 変更前
  // const handleDelete = (id: number) => {
  //   setComponents((prev) => prev.filter((c) => c.id !== id));
  // };

  // 変更後
  const handleDelete = useCallback((id: number) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, []); // 依存配列は空でOK

  return (
    <Canvas
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: "0px",
        left: "0px",
      }}
      shadows={true}
    >
      <OrthographicCamera
        position={[0, 0, 1000]}
        left={0}
        right={window.innerWidth}
        top={window.innerHeight}
        bottom={0}
        near={-100}
        far={100}
      />
      <directionalLight position={[1, 1, 1]} intensity={2} />

      {components.map(({ id, position, objectPath }) => (
        <StarEffect
          key={id}
          id={id}
          position={position}
          url={objectPath}
          onDelete={handleDelete}
        />
      ))}
    </Canvas>
  );
};
