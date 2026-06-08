import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { GameSnapshot } from "../game/simulation/state";

interface DrumstickSceneProps {
  snapshot: GameSnapshot;
  viewYaw: number;
}

interface SnapshotProps {
  snapshot: GameSnapshot;
}

const DRUMSTICK_BASE_POSITION = {
  x: 0.4116,
  y: -0.82,
  z: -2.28,
};

const DRUMSTICK_SHAFT_LENGTH = 0.975;

export function DrumstickScene({ snapshot, viewYaw }: DrumstickSceneProps) {
  return (
    <Canvas
      className="game-canvas"
      shadows
      gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      dpr={[1, 1.6]}
    >
      <color attach="background" args={["#8fd3ff"]} />
      <fog attach="fog" args={["#bfe8ff", 24, 150]} />
      <SceneContents snapshot={snapshot} viewYaw={viewYaw} />
    </Canvas>
  );
}

function SceneContents({ snapshot, viewYaw }: DrumstickSceneProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame(() => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (snapshot.mode === "replay") {
      const replaySeconds = snapshot.replayTimeMs / 1000;
      const target = new THREE.Vector3(
        snapshot.dummy.position.x,
        snapshot.dummy.position.y + 0.8,
        snapshot.dummy.position.z,
      );
      const openingCam = new THREE.Vector3(1.9, 1.85, 1.6);
      const chaseCam = new THREE.Vector3(target.x + 4.2, 2.9, target.z + 6.8);
      const wideCam = new THREE.Vector3(target.x + 6.8, 4.1, target.z + 8.6);
      const desired = replaySeconds < 0.55 ? openingCam : replaySeconds < 2.4 ? chaseCam : wideCam;
      camera.position.lerp(desired, replaySeconds < 0.55 ? 0.18 : 0.08);
      camera.lookAt(target);
      return;
    }

    camera.position.lerp(new THREE.Vector3(0, 1.55, 3.6), 0.18);
    camera.lookAt(Math.sin(viewYaw) * 3.5, 1.2, -4.3 + Math.abs(viewYaw) * 0.4);
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault fov={58} position={[0, 1.55, 3.6]}>
        {snapshot.mode !== "replay" && <DrumstickView snapshot={snapshot} />}
      </PerspectiveCamera>
      <ambientLight intensity={0.72} />
      <directionalLight
        castShadow
        intensity={1.3}
        position={[4, 8, 4]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight intensity={0.55} color="#bfe8ff" groundColor="#6bbd6f" />
      <Field />
      <Trees />
      <Breakables snapshot={snapshot} />
      <BalloonDummy snapshot={snapshot} />
      <StrikeBurst snapshot={snapshot} />
    </>
  );
}

function Field() {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[260, 260, 26, 26]} />
        <meshStandardMaterial color="#6dbb5f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.01, -8]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[5, 5.08, 64]} />
        <meshStandardMaterial color="#f5d070" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.02, -4.2]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.1, 32]} />
        <meshStandardMaterial color="#f7efa6" roughness={0.85} />
      </mesh>
    </>
  );
}

function Trees() {
  const trees = useMemo(
    () => [
      [-6, -7, 0.9],
      [-4.2, -13, 1.1],
      [5.3, -8.5, 0.95],
      [7.2, -14, 1.25],
      [-8, -18, 1.2],
      [0, -20, 1.4],
    ],
    [],
  );

  return (
    <>
      {trees.map(([x, z, scale], index) => (
        <group key={`${x}-${z}`} position={[x, 0, z]} scale={scale}>
          <mesh castShadow position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 1.1, 6]} />
            <meshStandardMaterial color="#9a6841" roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, 1.35, 0]} rotation-y={(index * Math.PI) / 5}>
            <coneGeometry args={[0.72, 1.55, 7]} />
            <meshStandardMaterial color={index % 2 ? "#287c4a" : "#31945a"} roughness={0.75} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Breakables({ snapshot }: SnapshotProps) {
  return (
    <>
      {snapshot.breakables.map((item, index) => (
        <group key={item.id} position={[item.position.x, item.position.y, item.position.z]}>
          <mesh
            castShadow
            position={item.broken ? [-0.18, -0.1, 0.08] : [0, 0, 0]}
            rotation-z={item.broken ? -0.9 : 0}
          >
            <boxGeometry args={[item.size.x, item.size.y, item.size.z]} />
            <meshStandardMaterial color={item.broken ? "#b77845" : "#d99b54"} roughness={0.72} />
          </mesh>
          {item.broken && (
            <>
              <mesh
                castShadow
                position={[0.32 + item.impactPower * 0.25, -0.2, -0.16]}
                rotation={[0.8, 0.3 + item.impactPower, 0.5]}
              >
                <boxGeometry args={[item.size.x * 0.52, item.size.y * 0.28, item.size.z * 0.42]} />
                <meshStandardMaterial color="#8e5a35" roughness={0.8} />
              </mesh>
              <mesh
                castShadow
                position={[-0.42 - item.impactPower * 0.18, -0.25, 0.22]}
                rotation={[0.2, -0.6, -0.7 - item.impactPower]}
              >
                <boxGeometry args={[item.size.x * 0.38, item.size.y * 0.2, item.size.z * 0.5]} />
                <meshStandardMaterial color="#f0bd72" roughness={0.78} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </>
  );
}

function StrikeBurst({ snapshot }: SnapshotProps) {
  const isActive =
    snapshot.result.grade !== "none" &&
    (snapshot.mode === "striking" || (snapshot.mode === "replay" && snapshot.replayTimeMs < 1_500));

  if (!isActive) {
    return null;
  }

  const power = snapshot.lockedPower || snapshot.result.power;
  const isMaximum = snapshot.result.grade === "maximum";
  const scale = 0.65 + power * 0.75;
  const confetti = [
    ["#ffdf62", -0.9, 0.9, -4.15, 0.5],
    ["#ff5f7e", -0.35, 1.25, -4.35, -0.7],
    ["#4ee0b8", 0.38, 1.1, -4.3, 0.95],
    ["#7fb4ff", 0.88, 0.78, -4.1, -0.35],
    ["#ffffff", 0.05, 1.55, -4.55, 1.4],
  ] as const;

  return (
    <group position={[0, 1.18, -4.05]} scale={scale}>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.92, 0.025, 8, 48]} />
        <meshStandardMaterial
          emissive={isMaximum ? "#ffdf62" : "#ffffff"}
          emissiveIntensity={isMaximum ? 0.8 : 0.35}
          color={isMaximum ? "#ffdf62" : "#fff5ce"}
          transparent
          opacity={0.74}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, Math.PI / 5]}>
        <torusGeometry args={[1.25, 0.018, 8, 48]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.42} />
      </mesh>
      {isMaximum &&
        confetti.map(([color, x, y, z, rotation], index) => (
          <mesh key={`${color}-${index}`} position={[x, y - 1.18, z + 4.05]} rotation={[0.7, rotation, 0.3]}>
            <boxGeometry args={[0.12, 0.34, 0.04]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} roughness={0.55} />
          </mesh>
        ))}
    </group>
  );
}

function BalloonDummy({ snapshot }: SnapshotProps) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const spinTime = snapshot.replayTimeMs / 1000;
    const wobble = Math.sin(clock.elapsedTime * 4) * 0.04;
    group.current.rotation.set(
      snapshot.dummy.spin.x * spinTime * 0.16 + wobble,
      snapshot.dummy.spin.y * spinTime * 0.14,
      snapshot.dummy.spin.z * spinTime * 0.18,
    );
  });

  return (
    <group
      ref={group}
      position={[snapshot.dummy.position.x, snapshot.dummy.position.y, snapshot.dummy.position.z]}
    >
      <mesh castShadow position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.58, 18, 14]} />
        <meshStandardMaterial color="#ff7ab5" roughness={0.5} metalness={0.02} />
      </mesh>
      <mesh castShadow position={[0, 1.13, 0]}>
        <sphereGeometry args={[0.38, 18, 14]} />
        <meshStandardMaterial color="#ffd0e6" roughness={0.55} />
      </mesh>
      <mesh castShadow position={[-0.46, 0.5, 0]} rotation-z={0.65}>
        <capsuleGeometry args={[0.11, 0.55, 4, 8]} />
        <meshStandardMaterial color="#ff96c8" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0.46, 0.5, 0]} rotation-z={-0.65}>
        <capsuleGeometry args={[0.11, 0.55, 4, 8]} />
        <meshStandardMaterial color="#ff96c8" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[-0.18, -0.05, 0]} rotation-z={0.18}>
        <capsuleGeometry args={[0.12, 0.55, 4, 8]} />
        <meshStandardMaterial color="#8fc2ff" roughness={0.65} />
      </mesh>
      <mesh castShadow position={[0.18, -0.05, 0]} rotation-z={-0.18}>
        <capsuleGeometry args={[0.12, 0.55, 4, 8]} />
        <meshStandardMaterial color="#8fc2ff" roughness={0.65} />
      </mesh>
    </group>
  );
}

function DrumstickView({ snapshot }: SnapshotProps) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const idle = Math.sin(clock.elapsedTime * 2.2) * 0.025;
    const swing = snapshot.drumstick.swing;
    group.current.rotation.set(-0.24 - swing * 1.52 + idle, 0.06 - swing * 0.18, -0.42 + swing * 0.78);
    group.current.position.set(
      DRUMSTICK_BASE_POSITION.x - swing * 0.18,
      DRUMSTICK_BASE_POSITION.y + swing * 0.12,
      DRUMSTICK_BASE_POSITION.z - swing * 1.25,
    );
  });

  return (
    <group
      ref={group}
      position={[DRUMSTICK_BASE_POSITION.x, DRUMSTICK_BASE_POSITION.y, DRUMSTICK_BASE_POSITION.z]}
      rotation={[-0.24, 0.06, -0.42]}
    >
      <mesh castShadow rotation-z={Math.PI / 2}>
        <capsuleGeometry args={[0.14, DRUMSTICK_SHAFT_LENGTH, 8, 14]} />
        <meshStandardMaterial color="#c86f3d" roughness={0.58} />
      </mesh>
      <mesh castShadow position={[-1.08, 0, 0]} rotation-z={Math.PI / 2}>
        <capsuleGeometry args={[0.34, 0.52, 10, 16]} />
        <meshStandardMaterial color="#e6a05b" roughness={0.62} />
      </mesh>
      <mesh castShadow position={[-1.34, 0.05, 0.03]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshStandardMaterial color="#f0c38a" roughness={0.7} />
      </mesh>
    </group>
  );
}
