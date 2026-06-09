import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { REPLAY_IMPACT_PAUSE_MS } from "../game/simulation/state";
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
  z: -1.94,
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
      const horizontalSpeed = Math.hypot(snapshot.dummy.velocity.x, snapshot.dummy.velocity.z);
      const isGroundedRoll = snapshot.dummy.position.y <= 0.55 && horizontalSpeed > 0.18;
      const target = new THREE.Vector3(
        snapshot.dummy.position.x,
        snapshot.dummy.position.y + (isGroundedRoll ? 0.38 : 0.8),
        snapshot.dummy.position.z,
      );
      const openingCam = new THREE.Vector3(1.9, 1.85, 1.6);
      const chaseCam = new THREE.Vector3(target.x + 4.2, 2.9, target.z + 6.8);
      const wideCam = new THREE.Vector3(target.x + 6.8, 4.1, target.z + 8.6);
      const slideCam = new THREE.Vector3(target.x + 3.2, 1.35, target.z + 4.6);
      const isImpactPause = snapshot.replayTimeMs < REPLAY_IMPACT_PAUSE_MS;
      const desired =
        isImpactPause
          ? openingCam
          : isGroundedRoll
            ? slideCam
            : replaySeconds < 2.4
              ? chaseCam
              : wideCam;
      const cutSpeed =
        isImpactPause
          ? 0.24
          : isGroundedRoll
            ? 0.45
            : 0.08;
      camera.position.lerp(desired, cutSpeed);
      camera.lookAt(target);
      return;
    }

    camera.position.lerp(new THREE.Vector3(0, 1.55, 3.6), 0.18);
    camera.lookAt(Math.sin(viewYaw) * 3.5, 1.02, -4.3 + Math.abs(viewYaw) * 0.4);
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault fov={58} position={[0, 1.55, 3.6]}>
        {(snapshot.mode !== "replay" || snapshot.replayTimeMs < REPLAY_IMPACT_PAUSE_MS) && <DrumstickView snapshot={snapshot} />}
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
      [-6.4, -7.4, 1.25],
      [-4.9, -13.4, 1.55],
      [5.6, -8.8, 1.35],
      [7.6, -14.4, 1.75],
      [-8.8, -18.6, 1.6],
      [4.9, -22.4, 1.65],
      [-10.8, -27, 1.9],
      [9.6, -27.8, 1.85],
      [-13.6, -35, 2.05],
      [13.2, -36, 2.15],
    ],
    [],
  );

  return (
    <>
      {trees.map(([x, z, scale], index) => (
        <group key={`${x}-${z}`} position={[x, 0, z]} scale={scale}>
          <mesh castShadow position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.13, 0.21, 1.18, 6]} />
            <meshStandardMaterial color="#9a6841" roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, 1.35, 0]} rotation-y={(index * Math.PI) / 5}>
            <coneGeometry args={[0.78, 1.85, 7]} />
            <meshStandardMaterial color={index % 2 ? "#287c4a" : "#31945a"} roughness={0.75} />
          </mesh>
          <mesh castShadow position={[0, 2.08, 0]} rotation-y={(index * Math.PI) / 7}>
            <coneGeometry args={[0.58, 1.45, 7]} />
            <meshStandardMaterial color={index % 2 ? "#1f6f43" : "#287f4d"} roughness={0.78} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Breakables({ snapshot }: SnapshotProps) {
  return (
    <>
      {snapshot.breakables.map((item, index) =>
        item.id === "brick-wall" ? (
          <BrickWall key={item.id} item={item} snapshot={snapshot} />
        ) : (
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
        ),
      )}
    </>
  );
}

function BrickWall({ item, snapshot }: { item: GameSnapshot["breakables"][number]; snapshot: GameSnapshot }) {
  const columns = 8;
  const rows = 5;
  const brickWidth = item.size.x / columns;
  const brickHeight = item.size.y / rows;
  const replayBurst = snapshot.mode === "replay" ? Math.min(1.6, snapshot.replayTimeMs / 850) : 0;
  const breakForce = item.broken ? 0.45 + item.impactPower * 1.2 : 0;
  const brickColor = ["#a73f2d", "#c55338", "#8f3328", "#d16b45"];

  return (
    <group position={[item.position.x, item.position.y, item.position.z]}>
      {Array.from({ length: rows * columns }).map((_, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        const stagger = row % 2 ? brickWidth * 0.5 : 0;
        const x = (column - (columns - 1) / 2) * brickWidth + stagger - (row % 2 ? brickWidth * 0.25 : 0);
        const y = (row - (rows - 1) / 2) * brickHeight;
        const seed = (index * 12.9898) % 1;
        const side = x >= 0 ? 1 : -1;
        const burst = item.broken ? replayBurst * breakForce : 0;
        const outward = item.broken
          ? [
              x + side * burst * (0.32 + Math.abs(x) * 0.16),
              y + burst * (0.2 + row * 0.08) - replayBurst * 0.18,
              burst * (-1.15 - row * 0.12 - seed * 0.45),
            ]
          : [x, y, 0];
        const rotation = item.broken
          ? [burst * (0.9 + seed), burst * side * (0.7 + row * 0.12), burst * side * (0.6 + column * 0.05)]
          : [0, 0, 0];

        return (
          <mesh key={`${item.id}-${index}`} castShadow position={outward as [number, number, number]} rotation={rotation as [number, number, number]}>
            <boxGeometry args={[brickWidth * 0.9, brickHeight * 0.8, item.size.z]} />
            <meshStandardMaterial color={brickColor[index % brickColor.length]} roughness={0.8} />
          </mesh>
        );
      })}
      {!item.broken && (
        <>
          <mesh position={[0, item.size.y * 0.52, 0]} castShadow>
            <boxGeometry args={[item.size.x + 0.16, 0.1, item.size.z + 0.08]} />
            <meshStandardMaterial color="#6d332a" roughness={0.84} />
          </mesh>
          <mesh position={[0, -item.size.y * 0.52, 0]} castShadow>
            <boxGeometry args={[item.size.x + 0.16, 0.1, item.size.z + 0.08]} />
            <meshStandardMaterial color="#6d332a" roughness={0.84} />
          </mesh>
        </>
      )}
    </group>
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
  const isImpactReplay = snapshot.mode === "replay" && snapshot.replayTimeMs < 1_350;
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
      {isMaximum && isImpactReplay && <MaximumImpactSmoke replayTimeMs={snapshot.replayTimeMs} />}
    </group>
  );
}

function MaximumImpactSmoke({ replayTimeMs }: { replayTimeMs: number }) {
  const burst = Math.min(1, replayTimeMs / 900);
  const opacity = Math.max(0, 0.62 - burst * 0.34);
  const puffs = [
    [-0.72, 0.28, -0.08, 0.42],
    [-0.32, 0.52, -0.22, 0.54],
    [0.24, 0.44, 0.05, 0.48],
    [0.78, 0.24, -0.12, 0.38],
    [0.05, 0.72, -0.28, 0.5],
  ] as const;

  return (
    <>
      <mesh position={[0, 0, 0]} rotation-x={Math.PI / 2} scale={1 + burst * 1.8}>
        <torusGeometry args={[1.05, 0.035, 8, 54]} />
        <meshStandardMaterial color="#fff2a6" emissive="#ffdf62" emissiveIntensity={0.8} transparent opacity={0.78 - burst * 0.36} />
      </mesh>
      {puffs.map(([x, y, z, radius], index) => (
        <mesh
          key={`smoke-${index}`}
          position={[x * (1 + burst * 1.8), y * (1 + burst * 0.9), z - burst * 0.55]}
          scale={1 + burst * (1.2 + index * 0.12)}
        >
          <sphereGeometry args={[radius, 12, 8]} />
          <meshStandardMaterial color={index % 2 ? "#d7d2c8" : "#f0eadf"} transparent opacity={opacity} roughness={1} />
        </mesh>
      ))}
    </>
  );
}

function BalloonDummy({ snapshot }: SnapshotProps) {
  const group = useRef<THREE.Group>(null);
  const replaySeconds = snapshot.replayTimeMs / 1000;
  const isReplay = snapshot.mode === "replay" && snapshot.dummy.launched;
  const horizontalSpeed = Math.hypot(snapshot.dummy.velocity.x, snapshot.dummy.velocity.z);
  const isGroundedRoll = isReplay && snapshot.dummy.position.y <= 0.5 && horizontalSpeed > 0.18;
  const ragdoll = isReplay ? Math.min(1.25, 0.28 + horizontalSpeed * 0.055) : 0;
  const armFlail = Math.sin(replaySeconds * 13.5) * ragdoll;
  const legFlail = Math.cos(replaySeconds * 11.2) * ragdoll;
  const footRoll = Math.sin(replaySeconds * 17.5) * ragdoll;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const spinTime = replaySeconds;
    const wobble = Math.sin(clock.elapsedTime * 4) * 0.04;
    const rollBoost = isGroundedRoll ? 0.3 + horizontalSpeed * 0.012 : 0.16;
    const groundLean = isGroundedRoll ? Math.PI * 0.42 : 0;
    group.current.rotation.set(
      groundLean + snapshot.dummy.spin.x * spinTime * rollBoost + wobble,
      snapshot.dummy.spin.y * spinTime * (isGroundedRoll ? 0.24 : 0.14) + Math.sin(spinTime * 9) * ragdoll * 0.1,
      groundLean * 0.7 +
        snapshot.dummy.spin.z * spinTime * (isGroundedRoll ? 0.31 : 0.18) +
        Math.cos(spinTime * 8) * ragdoll * 0.12,
    );
  });

  return (
    <group
      ref={group}
      position={[snapshot.dummy.position.x, snapshot.dummy.position.y, snapshot.dummy.position.z]}
    >
      <mesh castShadow position={[0, 0.45, 0]} scale={[0.76, 1, 0.72]}>
        <sphereGeometry args={[0.58, 18, 14]} />
        <meshStandardMaterial color="#ff7ab5" roughness={0.5} metalness={0.02} />
      </mesh>
      <mesh castShadow position={[0, 1.12, 0]} scale={[0.78, 1, 0.74]}>
        <sphereGeometry args={[0.38, 18, 14]} />
        <meshStandardMaterial color="#ffd0e6" roughness={0.55} />
      </mesh>
      <mesh castShadow position={[-0.36, 0.5, 0]} rotation={[0.15 * ragdoll, 0.2 * ragdoll, 0.65 + armFlail * 0.55]}>
        <capsuleGeometry args={[0.11, 0.55, 4, 8]} />
        <meshStandardMaterial color="#ff96c8" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0.36, 0.5, 0]} rotation={[-0.12 * ragdoll, -0.18 * ragdoll, -0.65 + armFlail * 0.5]}>
        <capsuleGeometry args={[0.11, 0.55, 4, 8]} />
        <meshStandardMaterial color="#ff96c8" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[-0.18, -0.05, 0]} rotation={[0.18 * ragdoll, -0.1 * ragdoll, 0.18 + legFlail * 0.35]}>
        <capsuleGeometry args={[0.12, 0.55, 4, 8]} />
        <meshStandardMaterial color="#8fc2ff" roughness={0.65} />
      </mesh>
      <mesh castShadow position={[0.18, -0.05, 0]} rotation={[-0.16 * ragdoll, 0.12 * ragdoll, -0.18 - legFlail * 0.32]}>
        <capsuleGeometry args={[0.12, 0.55, 4, 8]} />
        <meshStandardMaterial color="#8fc2ff" roughness={0.65} />
      </mesh>
      <mesh castShadow position={[-0.2, -0.38, 0.07]} rotation={[0, footRoll * 0.24, footRoll * 0.18]} scale={[1.25, 0.42, 0.75]}>
        <sphereGeometry args={[0.15, 10, 8]} />
        <meshStandardMaterial color="#6da7e8" roughness={0.68} />
      </mesh>
      <mesh castShadow position={[0.2, -0.38, 0.07]} rotation={[0, -footRoll * 0.22, -footRoll * 0.16]} scale={[1.25, 0.42, 0.75]}>
        <sphereGeometry args={[0.15, 10, 8]} />
        <meshStandardMaterial color="#6da7e8" roughness={0.68} />
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
    const windup = Math.min(0, swing);
    const followThrough = Math.max(0, swing);
    const isMaximumCharge = snapshot.mode === "striking" && snapshot.result.grade === "maximum" && swing < 0;
    const tremble = isMaximumCharge
      ? Math.sin(clock.elapsedTime * 82) * 0.055 + Math.sin(clock.elapsedTime * 131) * 0.026
      : 0;
    group.current.rotation.set(
      -0.24 + windup * 0.75 - followThrough * 1.72 + idle + tremble,
      0.06 + windup * 0.26 - followThrough * 0.2 + tremble * 0.42,
      -0.42 - windup * 0.5 + followThrough * 0.92 - tremble * 0.7,
    );
    group.current.position.set(
      DRUMSTICK_BASE_POSITION.x + windup * 0.24 - followThrough * 0.18 + tremble * 0.08,
      DRUMSTICK_BASE_POSITION.y - Math.abs(windup) * 0.06 + followThrough * 0.12 - tremble * 0.05,
      DRUMSTICK_BASE_POSITION.z + Math.abs(windup) * 0.48 - followThrough * 1.42 + tremble * 0.16,
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
