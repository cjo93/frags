"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line, PerspectiveCamera } from "@react-three/drei";
import { useMemo } from "react";

type EphemerisPoint = { timestamp: string; ra: number; dec: number };

function raDecToPosition(point: EphemerisPoint, radius: number) {
  const raRad = (point.ra * Math.PI) / 180;
  const decRad = (point.dec * Math.PI) / 180;
  const x = radius * Math.cos(decRad) * Math.cos(raRad);
  const y = radius * Math.sin(decRad);
  const z = radius * Math.cos(decRad) * Math.sin(raRad);
  return [x, y, z] as [number, number, number];
}

export function EphemerisScene({ points }: { points: EphemerisPoint[] }) {
  const positions = useMemo(() => {
    const radius = 4;
    return points.map((p) => ({
      position: raDecToPosition(p, radius),
      timestamp: p.timestamp
    }));
  }, [points]);

  const linePoints = positions.map((p) => p.position);

  return (
    <div className="h-80 w-full overflow-hidden rounded border bg-black/60">
      <Canvas>
        <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={45} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <mesh>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color="#f0b429" />
        </mesh>

        {positions.map((p, idx) => (
          <mesh key={idx} position={p.position}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#7dd3fc" />
          </mesh>
        ))}

        {linePoints.length > 1 && (
          <Line points={linePoints} color="#38bdf8" lineWidth={2} />
        )}

        <OrbitControls enablePan enableZoom />
      </Canvas>
    </div>
  );
}
