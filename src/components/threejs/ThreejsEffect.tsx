import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils";

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
  const randomPosition = useRef(position);
  randomPosition.current[0] += rand(-0.5, 0.5);
  randomPosition.current[1] += rand(-0.5, 0.5);
  randomPosition.current[2] += rand(-0.5, 0.5);

  const createdAtRef = useRef(performance.now());
  const { scene } = useGLTF(url);
  const clonedSceneRef = useRef(clone(scene));

  const defaultRotateY = useRef(rand(-90, 90));
  const timeToDelete = useRef(rand(250, 2000));
  const directionRef = useRef(Math.random() <= 0.5 ? 1 : -1);
  const directionPowerRef = useRef(rand(-1, 1));
  const rotateDirectionRef = useRef(Math.random() <= 0.5 ? 1 : -1);
  const randomScaleRef = useRef(
    Math.random() <= 0.1 ? rand(1, 1.25) : rand(0.25, 0.5),
  );

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
        position: [x / 100, -y / 100, 0],
      },
    ]);
  }, [x, y]);

  /*const isMouseDownRef = useRef(false)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if(isMouseDownRef.current == true){
        setComponents((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            position: [
              (event.clientX - window.innerWidth / 2) / 100,
              -(event.clientY - window.innerHeight / 2) / 100,
              0,
            ],
          },
        ]);
      }
    };

    document.addEventListener("pointerdown", ()=>{isMouseDownRef.current = true});
    document.addEventListener("pointermove", handleClick);
    document.addEventListener("pointerup", ()=>{isMouseDownRef.current = false});

    return () => {
      document.removeEventListener("pointerdown", ()=>{isMouseDownRef.current = true});
      document.removeEventListener("pointermove", handleClick);
      document.removeEventListener("pointerup", ()=>{isMouseDownRef.current = false});
    };
  }, []);*/

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
      camera={{
        fov: 45,
        position: [0, 0, 10],
      }}
      shadows={true}
    >
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
