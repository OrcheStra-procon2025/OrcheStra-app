import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";

type Props = {
  id: number;
  position: [number, number, number];
  onDelete: (id: number) => void;
};

const Sphere = ({ id, position, onDelete }: Props) => {
  const createdAtRef = useRef(performance.now());
  useFrame(() => {
    if (performance.now() - createdAtRef.current > 500) {
      onDelete(id);
    }
  });

  return (
    <mesh position={position}>
      <sphereGeometry />
      <meshStandardMaterial color={"blue"} />
    </mesh>
  );
};

const ThreejsSphere = () => {
  const [components, setComponents] = useState<
    { id: number; position: [number, number, number] }[]
  >([]);
  const nextIdRef = useRef(1);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      setComponents((prev) => [
        ...prev,
        {
          id: nextIdRef.current,
          position: [
            (event.clientX - window.innerWidth / 2) / 100,
            -(event.clientY - window.innerHeight / 2) / 100,
            0,
          ],
        },
      ]);
      nextIdRef.current += 1;
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

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
        <Sphere
          key={id}
          id={id}
          position={position}
          onDelete={handleDelete}
        ></Sphere>
      ))}
    </Canvas>
  );
};

export default ThreejsSphere;
