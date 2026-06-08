import type { InputFrame } from "../input/actions";
import type { BreakableState, GameState, StrikeResult, Vector3State } from "./state";
import {
  DUMMY_START,
  GRAVITY,
  METER_SPEED,
  REPLAY_DURATION_MS,
  STRIKE_DURATION_MS,
  cloneBreakables,
  createDummy,
  gradeForPower,
  labelForGrade,
} from "./state";

export function updateSimulation(
  state: GameState,
  input: InputFrame,
  deltaMs: number,
): GameState {
  const delta = Math.min(deltaMs, 100);

  if (input.restart) {
    return startRun(state);
  }

  if (input.confirm && state.mode === "menu") {
    return startRun(state);
  }

  if (input.confirm && state.mode === "aiming") {
    return beginStrike(state);
  }

  let next = {
    ...state,
    elapsedMs: state.elapsedMs + delta,
    modeTimeMs: state.modeTimeMs + delta,
  };

  if (next.mode === "aiming") {
    const meterPhase = next.meterPhase + delta * METER_SPEED;
    const meterValue = (Math.sin(meterPhase) + 1) / 2;

    return {
      ...next,
      meterPhase,
      meterValue,
    };
  }

  if (next.mode === "striking") {
    const progress = clamp(next.modeTimeMs / STRIKE_DURATION_MS, 0, 1);
    const swing = easeOutBack(progress);
    next = {
      ...next,
      drumstick: {
        ...next.drumstick,
        swing,
      },
    };

    if (progress >= 1) {
      return beginReplay(next);
    }

    return next;
  }

  if (next.mode === "replay") {
    return updateReplay(next, delta);
  }

  return next;
}

export function startRun(previous: GameState): GameState {
  return {
    ...previous,
    mode: "aiming",
    modeTimeMs: 0,
    meterPhase: 0,
    meterValue: 0.5,
    lockedPower: 0,
    drumstick: {
      ...previous.drumstick,
      swing: 0,
    },
    dummy: createDummy(),
    breakables: cloneBreakables(previous.breakables).map((item) => ({
      ...item,
      broken: false,
      impactPower: 0,
    })),
    replayTimeMs: 0,
    result: {
      grade: "none",
      power: 0,
      distance: 0,
      score: 0,
      brokenCount: 0,
      label: "Aim",
      echo: "Hit space at the top",
    },
  };
}

function beginStrike(state: GameState): GameState {
  const power = state.meterValue;
  const grade = gradeForPower(power);
  const copy = labelForGrade(grade);
  const score = Math.round(power * 800);

  return {
    ...state,
    mode: "striking",
    modeTimeMs: 0,
    lockedPower: power,
    drumstick: {
      ...state.drumstick,
      swing: 0,
    },
    result: {
      grade,
      power,
      distance: 0,
      score,
      brokenCount: 0,
      ...copy,
    },
  };
}

function beginReplay(state: GameState): GameState {
  const power = state.lockedPower;
  const grade = gradeForPower(power);
  const normalized = Math.pow(power, 1.35);
  const lateral = grade === "maximum" ? 0.18 : power < 0.55 ? -0.32 : -0.08;
  const perfectBonus = grade === "maximum" ? 1.22 : 1;
  const velocity = {
    x: lateral + normalized * 0.28,
    y: (3.2 + normalized * 7.4) * perfectBonus,
    z: -(8.8 + normalized * 17.8) * perfectBonus,
  };

  return {
    ...state,
    mode: "replay",
    modeTimeMs: 0,
    replayTimeMs: 0,
    dummy: {
      position: { ...DUMMY_START },
      velocity,
      spin: {
        x: 2.4 + normalized * 7.2,
        y: 1.7 + normalized * 3.7,
        z: 1.4 + normalized * 5.6,
      },
      launched: true,
    },
  };
}

function updateReplay(state: GameState, deltaMs: number): GameState {
  const dt = deltaMs / 1000;
  const velocity = {
    ...state.dummy.velocity,
    y: state.dummy.velocity.y + GRAVITY * dt,
  };
  const position = {
    x: state.dummy.position.x + velocity.x * dt,
    y: state.dummy.position.y + velocity.y * dt,
    z: state.dummy.position.z + velocity.z * dt,
  };

  if (position.y < 0.5) {
    position.y = 0.5;
    velocity.y = Math.abs(velocity.y) * 0.32;
    velocity.x *= 0.84;
    velocity.z *= 0.84;
  }

  const distance = Math.max(0, DUMMY_START.z - position.z);
  const breakables = updateBreakables(state.breakables, position, state.lockedPower);
  const brokenCount = breakables.filter((item) => item.broken).length;
  const breakScore = breakables.reduce((total, item) => total + (item.broken ? item.points : 0), 0);
  const score = Math.round(distance * 135 + state.lockedPower * 1_150 + breakScore);
  const replayDone = state.modeTimeMs >= REPLAY_DURATION_MS;
  const result: StrikeResult = {
    ...state.result,
    distance,
    score,
    brokenCount,
  };
  const bestScore = Math.max(state.bestScore, score);

  if (replayDone) {
    return {
      ...state,
      mode: "aiming",
      modeTimeMs: 0,
      replayTimeMs: 0,
      meterPhase: 0,
      meterValue: 0.5,
      lockedPower: 0,
      drumstick: {
        ...state.drumstick,
        swing: 0,
      },
      dummy: createDummy(),
      breakables: cloneBreakables(state.breakables).map((item) => ({
        ...item,
        broken: false,
        impactPower: 0,
      })),
      result: {
        grade: "none",
        power: 0,
        distance: 0,
        score: 0,
        brokenCount: 0,
        label: "Aim",
        echo: "Hit space at the top",
      },
      bestScore,
    };
  }

  return {
    ...state,
    mode: state.mode,
    modeTimeMs: state.modeTimeMs,
    replayTimeMs: state.replayTimeMs + deltaMs,
    meterPhase: state.meterPhase,
    meterValue: state.meterValue,
    drumstick: {
      ...state.drumstick,
      swing: Math.max(0, state.drumstick.swing - dt * 0.85),
    },
    dummy: {
      ...state.dummy,
      position,
      velocity,
    },
    breakables,
    result,
    bestScore,
  };
}

function updateBreakables(
  items: BreakableState[],
  dummyPosition: Vector3State,
  strikePower: number,
): BreakableState[] {
  return items.map((item) => {
    if (item.broken) return item;

    const distance = Math.hypot(dummyPosition.x - item.position.x, dummyPosition.z - item.position.z);
    const canHitHeight = dummyPosition.y < item.position.y + item.size.y + 2.4;
    return {
      ...item,
      broken: distance < item.hitRadius && canHitHeight,
      impactPower: distance < item.hitRadius && canHitHeight ? strikePower : 0,
    };
  });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function easeOutBack(value: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
}
