export type GameMode = "menu" | "aiming" | "striking" | "replay";

export type StrikeGrade = "none" | "soft" | "solid" | "maximum";

export interface Vector3State {
  x: number;
  y: number;
  z: number;
}

export interface DrumstickState {
  length: number;
  mass: number;
  swing: number;
}

export interface DummyState {
  position: Vector3State;
  velocity: Vector3State;
  spin: Vector3State;
  launched: boolean;
}

export interface BreakableState {
  id: string;
  position: Vector3State;
  size: Vector3State;
  points: number;
  hitRadius: number;
  broken: boolean;
  impactPower: number;
}

export interface StrikeResult {
  grade: StrikeGrade;
  power: number;
  distance: number;
  score: number;
  brokenCount: number;
  label: string;
  echo: string;
}

export interface GameState {
  mode: GameMode;
  elapsedMs: number;
  modeTimeMs: number;
  meterPhase: number;
  meterValue: number;
  lockedPower: number;
  drumstick: DrumstickState;
  dummy: DummyState;
  breakables: BreakableState[];
  result: StrikeResult;
  bestScore: number;
  replayTimeMs: number;
}

export interface GameSnapshot {
  coordinateSystem: string;
  mode: GameMode;
  meterValue: number;
  lockedPower: number;
  drumstick: DrumstickState;
  dummy: DummyState;
  breakables: BreakableState[];
  result: StrikeResult;
  bestScore: number;
  replayTimeMs: number;
}

export const STRIKE_DURATION_MS = 560;
export const REPLAY_DURATION_MS = 6_500;
export const REPLAY_IMPACT_PAUSE_MS = 420;
export const METER_SPEED = 0.0094;
export const GRAVITY = -12.8;
export const PERFECT_POWER = 0.94;
export const SOLID_POWER = 0.7;
export const DUMMY_GROUND_Y = 0.45;
export const DUMMY_START: Vector3State = { x: 0, y: DUMMY_GROUND_Y, z: -4.2 };

const initialBreakables: BreakableState[] = [
  {
    id: "brick-wall",
    position: { x: 0, y: 1.05, z: -7.05 },
    size: { x: 4.8, y: 2.1, z: 0.42 },
    points: 950,
    hitRadius: 2.45,
    broken: false,
    impactPower: 0,
  },
  {
    id: "hay-left",
    position: { x: -1.7, y: 0.35, z: -8.2 },
    size: { x: 0.95, y: 0.62, z: 0.9 },
    points: 180,
    hitRadius: 1.15,
    broken: false,
    impactPower: 0,
  },
  {
    id: "crate-mid",
    position: { x: -0.15, y: 0.48, z: -9.25 },
    size: { x: 1.05, y: 0.78, z: 0.95 },
    points: 300,
    hitRadius: 1.55,
    broken: false,
    impactPower: 0,
  },
  {
    id: "shed-right",
    position: { x: 2.1, y: 0.7, z: -11.6 },
    size: { x: 1.35, y: 1.15, z: 1.1 },
    points: 450,
    hitRadius: 1.45,
    broken: false,
    impactPower: 0,
  },
];

export function createInitialState(): GameState {
  return {
    mode: "menu",
    elapsedMs: 0,
    modeTimeMs: 0,
    meterPhase: 0,
    meterValue: 0,
    lockedPower: 0,
    drumstick: {
      length: 2.4,
      mass: 1,
      swing: 0,
    },
    dummy: createDummy(),
    breakables: cloneBreakables(initialBreakables),
    result: {
      grade: "none",
      power: 0,
      distance: 0,
      score: 0,
      brokenCount: 0,
      label: "Ready",
      echo: "Time the meter. Spacebar swings.",
    },
    bestScore: 0,
    replayTimeMs: 0,
  };
}

export function createDummy(): DummyState {
  return {
    position: { ...DUMMY_START },
    velocity: { x: 0, y: 0, z: 0 },
    spin: { x: 0, y: 0, z: 0 },
    launched: false,
  };
}

export function toSnapshot(state: GameState): GameSnapshot {
  return {
    coordinateSystem: "Three.js world: x right, y up, z toward camera; target launches along negative z",
    mode: state.mode,
    meterValue: round(state.meterValue),
    lockedPower: round(state.lockedPower),
    drumstick: {
      ...state.drumstick,
      swing: round(state.drumstick.swing),
    },
    dummy: {
      position: roundVector(state.dummy.position),
      velocity: roundVector(state.dummy.velocity),
      spin: roundVector(state.dummy.spin),
      launched: state.dummy.launched,
    },
    breakables: state.breakables.map((item) => ({
      ...item,
      position: roundVector(item.position),
    })),
    result: {
      ...state.result,
      power: round(state.result.power),
      distance: round(state.result.distance),
    },
    bestScore: state.bestScore,
    replayTimeMs: Math.round(state.replayTimeMs),
  };
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(toSnapshot(state));
}

export function gradeForPower(power: number): StrikeGrade {
  if (power >= PERFECT_POWER) return "maximum";
  if (power >= SOLID_POWER) return "solid";
  return "soft";
}

export function labelForGrade(grade: StrikeGrade): Pick<StrikeResult, "label" | "echo"> {
  if (grade === "maximum") {
    return {
      label: "MAXIMUM DRUMSTRIKE",
      echo: "PWND!",
    };
  }

  if (grade === "solid") {
    return {
      label: "Clean Drumstrike",
      echo: "Nice thwack",
    };
  }

  return {
    label: "Rubber Chicken Energy",
    echo: "Try the top of the meter",
  };
}

export function cloneBreakables(items: BreakableState[]): BreakableState[] {
  return items.map((item) => ({
    ...item,
    position: { ...item.position },
  }));
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundVector(vector: Vector3State): Vector3State {
  return {
    x: round(vector.x),
    y: round(vector.y),
    z: round(vector.z),
  };
}
