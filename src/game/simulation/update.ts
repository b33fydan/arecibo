import type { InputFrame } from "../input/actions";
import type { BreakableState, GameState, StrikeResult, Vector3State } from "./state";
import {
  DUMMY_GROUND_Y,
  DUMMY_START,
  GRAVITY,
  REPLAY_BLAST_DELAY_MS,
  METER_SPEED,
  REPLAY_DURATION_MS,
  STRIKE_DURATION_MS,
  cloneBreakables,
  createDummy,
  gradeForPower,
  labelForGrade,
  replayPhaseForTime,
} from "./state";

const FLOOR_BOUNCE_MIN_SPEED = 1.35;
const FLOOR_BOUNCE = 0.2;
const SLIDE_FRICTION_PER_SECOND = 0.66;
const STOP_SPEED = 0.18;

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
    const progress = clamp(next.modeTimeMs / strikeDurationForGrade(next.result.grade), 0, 1);
    const swing = swingForProgress(progress, next.result.grade);
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
      launched: false,
    },
  };
}

function updateReplay(state: GameState, deltaMs: number): GameState {
  const replayTimeMs = state.replayTimeMs + deltaMs;
  const phase = replayPhaseForTime(replayTimeMs);
  if (phase !== "blast") {
    return updateReplayPrelude(state, replayTimeMs);
  }

  const dt = deltaMs / 1000;
  const wasBlasting = state.replayTimeMs >= REPLAY_BLAST_DELAY_MS;
  const effectiveDt = wasBlasting ? dt : Math.max(0, (replayTimeMs - REPLAY_BLAST_DELAY_MS) / 1000);
  const velocity = {
    ...state.dummy.velocity,
    y: state.dummy.velocity.y + GRAVITY * effectiveDt,
  };
  const position = {
    x: state.dummy.position.x + velocity.x * effectiveDt,
    y: state.dummy.position.y + velocity.y * effectiveDt,
    z: state.dummy.position.z + velocity.z * effectiveDt,
  };
  let grounded = false;

  if (position.y <= DUMMY_GROUND_Y) {
    grounded = true;
    position.y = DUMMY_GROUND_Y;

    const impactSpeed = Math.abs(velocity.y);
    velocity.y = impactSpeed > FLOOR_BOUNCE_MIN_SPEED ? impactSpeed * FLOOR_BOUNCE : 0;

    const slideDamping = Math.pow(SLIDE_FRICTION_PER_SECOND, effectiveDt);
    velocity.x *= slideDamping;
    velocity.z *= slideDamping;

    const slideSpeed = Math.hypot(velocity.x, velocity.z);
    if (slideSpeed > STOP_SPEED) {
      const replaySeconds = replayTimeMs / 1000;
      const jitter = Math.sin(replaySeconds * 8.5) * state.lockedPower * 0.72 * effectiveDt;
      const weave = Math.cos(replaySeconds * 5.2) * state.lockedPower * 0.28 * effectiveDt;
      velocity.x += jitter + weave;
    } else {
      velocity.x = 0;
      velocity.z = 0;
    }
  }

  const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
  const spin = grounded && horizontalSpeed > STOP_SPEED
    ? {
        x: clamp(state.dummy.spin.x + horizontalSpeed * 0.018, 0, 20),
        y: clamp(
          state.dummy.spin.y + Math.sin(replayTimeMs * 0.01) * 0.045,
          -10,
          12,
        ),
        z: clamp(state.dummy.spin.z + (Math.abs(velocity.x) + horizontalSpeed * 0.35) * 0.016, 0, 18),
      }
    : state.dummy.spin;

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
    replayTimeMs,
    meterPhase: state.meterPhase,
    meterValue: state.meterValue,
    drumstick: {
      ...state.drumstick,
      swing: Math.max(0, state.drumstick.swing - dt * 0.85),
    },
    dummy: {
      ...state.dummy,
      launched: true,
      position,
      velocity,
      spin,
    },
    breakables,
    result,
    bestScore,
  };
}

function updateReplayPrelude(state: GameState, replayTimeMs: number): GameState {
  const replayDone = state.modeTimeMs >= REPLAY_DURATION_MS;
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
      bestScore: state.bestScore,
    };
  }

  return {
    ...state,
    replayTimeMs,
    drumstick: {
      ...state.drumstick,
      swing: 0,
    },
    dummy: {
      ...state.dummy,
      position: { ...DUMMY_START },
      launched: false,
    },
    result: {
      ...state.result,
      distance: 0,
      brokenCount: state.breakables.filter((item) => item.broken).length,
    },
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
    const canBreakPower = item.id !== "brick-wall" || strikePower >= 0.18;
    return {
      ...item,
      broken: distance < item.hitRadius && canHitHeight && canBreakPower,
      impactPower: distance < item.hitRadius && canHitHeight && canBreakPower ? strikePower : 0,
    };
  });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function strikeDurationForGrade(grade: StrikeResult["grade"]): number {
  return grade === "maximum" ? 820 : STRIKE_DURATION_MS;
}

function swingForProgress(value: number, grade: StrikeResult["grade"]): number {
  if (grade === "maximum") {
    return maximumSwingForProgress(value);
  }

  if (value < 0.18) {
    return -0.22 * easeOutQuad(value / 0.18);
  }

  if (value < 0.68) {
    const snap = easeOutCubic((value - 0.18) / 0.5);
    return -0.22 + snap * 1.46;
  }

  const settle = easeOutQuad((value - 0.68) / 0.32);
  return 1.24 - settle * 0.18;
}

function maximumSwingForProgress(value: number): number {
  if (value < 0.56) {
    const charge = easeOutQuad(value / 0.56);
    const tremble = Math.sin(value * 92) * 0.06 + Math.sin(value * 47) * 0.035;
    return -0.18 - charge * 0.15 + tremble;
  }

  if (value < 0.8) {
    const snap = easeOutCubic((value - 0.56) / 0.24);
    return -0.22 + snap * 1.74;
  }

  const settle = easeOutQuad((value - 0.8) / 0.2);
  return 1.52 - settle * 0.34;
}

function easeOutQuad(value: number): number {
  return 1 - Math.pow(1 - clamp(value, 0, 1), 2);
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
}
