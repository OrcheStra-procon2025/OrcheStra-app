import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { OrthographicCamera } from "@react-three/drei";
import { StarEffect } from "./SterEffect";


export const ThreejsEffect = ({ x, y }: { x: number; y: number }) => {
  const [components, setComponents] = useState<
    { id: number; position: [number, number, number] }[]
  >([]);

  useEffect(() => {
    setComponents((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        position: [
          (x * 3.796875 * 2) / window.innerHeight,
          -(y * 3.796875 * 2) / window.innerHeight,
          0,
        ],
      },
    ]);
    return;
  }, [x, y]);

  const handleDelete = (id: number) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  };

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

      {components.map(({ id, position }) => (
        <StarEffect
          key={id}
          id={id}
          position={position}
          url={"objects/star.glb"}
          onDelete={handleDelete}
        />
      ))}
    </Canvas>
  );
};

