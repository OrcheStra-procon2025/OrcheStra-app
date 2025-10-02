import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { OrthographicCamera, useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils";
import { Object3D } from "three";

type Props = {
  id: number;
  position: [number, number, number];
  url: string;
  onDelete: (id: number) => void;
};

const rand = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

const Model = ({ id, position, url, onDelete }: Props) => {
  const { scene } = useGLTF(url);
  const randomPosition = useRef<[number, number, number]>([0, 0, 0]);
  const createdAtRef = useRef<number>(0);
  const clonedSceneRef = useRef<Object3D>(new Object3D());

  const defaultRotateY = useRef<number>(0);
  const timeToDelete = useRef<number>(0);
  const directionRef = useRef<number>(0);
  const directionPowerRef = useRef<number>(0);
  const rotateDirectionRef = useRef<number>(0);
  const randomScaleRef = useRef<number>(0);

  useEffect(() => {
    randomPosition.current = position;
    randomPosition.current[0] += rand(-0.1, 0.1);
    randomPosition.current[1] += rand(-0.1, 0.1);
    randomPosition.current[2] += rand(-0.1, 0.1);

    createdAtRef.current = performance.now();
    clonedSceneRef.current = clone(scene);

    defaultRotateY.current = rand(-90, 90);
    timeToDelete.current = rand(250, 2000);
    directionRef.current = Math.random() <= 0.5 ? 1 : -1;
    directionPowerRef.current = rand(-1, 1);
    rotateDirectionRef.current = Math.random() <= 0.5 ? 1 : -1;
    randomScaleRef.current =
      Math.random() <= 0.1 ? rand(1, 1.25) : rand(0.25, 0.5);
  }, []);

  useFrame(() => {
    if (performance.now() - createdAtRef.current > timeToDelete.current) {
      onDelete(id);
    }

    clonedSceneRef.current.rotation.x += rotateDirectionRef.current * 0.01;
    clonedSceneRef.current.rotation.y += rotateDirectionRef.current * 0.01;
    clonedSceneRef.current.position.x +=
      directionRef.current * directionPowerRef.current * rand(0.01, 0.02);
    clonedSceneRef.current.position.y -= 0.04;
    clonedSceneRef.current.scale.x -= 0.001;
    clonedSceneRef.current.scale.y -= 0.001;
    clonedSceneRef.current.scale.z -= 0.001;

    if (clonedSceneRef.current.scale.x < 0) {
      onDelete(id);
    }
  });

  return (
    <primitive
      object={clonedSceneRef.current}
      position={randomPosition.current}
      rotation={[Math.PI / 2, defaultRotateY.current, 0]}
      scale={[
        randomScaleRef.current,
        randomScaleRef.current,
        randomScaleRef.current,
      ]}
    />
  );
};

const ThreejsEffect = ({ x, y }: { x: number; y: number }) => {
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
        width: "100vw",
        height: "100vh",
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
        <Model
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

export default ThreejsEffect;
