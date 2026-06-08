import { describe, expect, it } from "vitest";
import { emptyInputFrame } from "../input/actions";
import { createInitialState, DUMMY_GROUND_Y, DUMMY_START, REPLAY_DURATION_MS, STRIKE_DURATION_MS } from "./state";
import type { GameState } from "./state";
import { updateSimulation } from "./update";

describe("updateSimulation", () => {
  it("starts aiming from the menu", () => {
    const input = emptyInputFrame();
    input.confirm = true;

    const state = updateSimulation(createInitialState(), input, 16);

    expect(state.mode).toBe("aiming");
    expect(state.meterValue).toBe(0.5);
  });

  it("charges the timing meter while aiming", () => {
    const input = emptyInputFrame();
    const aiming = updateSimulation(createInitialState(), { ...input, confirm: true }, 16);
    const charged = updateSimulation(aiming, input, 240);

    expect(charged.meterValue).toBeGreaterThan(aiming.meterValue);
  });

  it("locks power and enters strike mode on space", () => {
    const input = emptyInputFrame();
    let state = updateSimulation(createInitialState(), { ...input, confirm: true }, 16);
    state = updateSimulation(state, input, 240);

    const struck = updateSimulation(state, { ...input, confirm: true }, 16);

    expect(struck.mode).toBe("striking");
    expect(struck.lockedPower).toBeGreaterThan(0);
    expect(struck.result.score).toBeGreaterThan(0);
  });

  it("winds up before the drumstick follow-through", () => {
    const input = emptyInputFrame();
    let state = updateSimulation(createInitialState(), { ...input, confirm: true }, 16);
    state = updateSimulation(state, input, 240);
    state = updateSimulation(state, { ...input, confirm: true }, 16);

    const windup = stepFor(state, STRIKE_DURATION_MS * 0.12);
    const followThrough = stepFor(state, STRIKE_DURATION_MS * 0.58);

    expect(windup.drumstick.swing).toBeLessThan(0);
    expect(followThrough.drumstick.swing).toBeGreaterThan(0.85);
  });

  it("launches the dummy into replay after the swing finishes", () => {
    const input = emptyInputFrame();
    let state = updateSimulation(createInitialState(), { ...input, confirm: true }, 16);
    state = updateSimulation(state, input, 240);
    state = updateSimulation(state, { ...input, confirm: true }, 16);

    const replay = stepFor(state, STRIKE_DURATION_MS + 20);

    expect(replay.mode).toBe("replay");
    expect(replay.dummy.launched).toBe(true);
    expect(replay.dummy.velocity.z).toBeLessThan(0);
  });

  it("updates distance and best score during replay", () => {
    const input = emptyInputFrame();
    let state = updateSimulation(createInitialState(), { ...input, confirm: true }, 16);
    state = updateSimulation(state, input, 240);
    state = updateSimulation(state, { ...input, confirm: true }, 16);
    state = stepFor(state, STRIKE_DURATION_MS + 20);

    const replaying = updateSimulation(state, input, 500);

    expect(replaying.result.distance).toBeGreaterThan(0);
    expect(replaying.bestScore).toBeGreaterThan(0);
  });

  it("marks maximum strikes at the top of the meter", () => {
    const input = emptyInputFrame();
    let state = updateSimulation(createInitialState(), { ...input, confirm: true }, 16);
    state = {
      ...state,
      meterValue: 0.97,
    };

    const struck = updateSimulation(state, { ...input, confirm: true }, 16);

    expect(struck.result.grade).toBe("maximum");
    expect(struck.result.label).toBe("MAXIMUM DRUMSTRIKE");
  });

  it("breaks a scenery object during a strong replay launch", () => {
    const input = emptyInputFrame();
    let state = updateSimulation(createInitialState(), { ...input, confirm: true }, 16);
    state = {
      ...state,
      meterValue: 0.96,
    };
    state = updateSimulation(state, { ...input, confirm: true }, 16);
    state = stepFor(state, STRIKE_DURATION_MS + 20);

    const replaying = stepFor(state, 900);

    expect(replaying.result.brokenCount).toBeGreaterThan(0);
    expect(replaying.breakables.some((item) => item.broken)).toBe(true);
  });

  it("keeps the dummy sliding after it reaches the floor", () => {
    const input = emptyInputFrame();
    let state = updateSimulation(createInitialState(), { ...input, confirm: true }, 16);
    state = {
      ...state,
      meterValue: 0.96,
    };
    state = updateSimulation(state, { ...input, confirm: true }, 16);
    state = stepFor(state, STRIKE_DURATION_MS + 20);

    const grounded = stepUntilGrounded(state);
    const sliding = stepFor(grounded, 1_200);

    expect(grounded.dummy.position.y).toBe(DUMMY_GROUND_Y);
    expect(Math.abs(sliding.dummy.velocity.z)).toBeGreaterThan(1);
    expect(sliding.result.distance).toBeGreaterThan(grounded.result.distance + 2);
    expect(sliding.dummy.spin.x).toBeGreaterThan(grounded.dummy.spin.x);
  });

  it("resets the dummy and breakables when replay ends", () => {
    const input = emptyInputFrame();
    let state = updateSimulation(createInitialState(), { ...input, confirm: true }, 16);
    state = {
      ...state,
      meterValue: 0.96,
    };
    state = updateSimulation(state, { ...input, confirm: true }, 16);
    state = stepFor(state, STRIKE_DURATION_MS + 20);
    state = stepFor(state, 900);

    const reset = stepFor(state, REPLAY_DURATION_MS);

    expect(reset.mode).toBe("aiming");
    expect(reset.dummy.launched).toBe(false);
    expect(reset.dummy.position).toEqual(DUMMY_START);
    expect(reset.breakables.every((item) => !item.broken)).toBe(true);
    expect(reset.bestScore).toBeGreaterThan(0);
  });
});

function stepFor(state: GameState, totalMs: number) {
  let next = state;
  const input = emptyInputFrame();
  for (let elapsed = 0; elapsed < totalMs; elapsed += 1000 / 60) {
    next = updateSimulation(next, input, 1000 / 60);
  }
  return next;
}

function stepUntilGrounded(state: GameState) {
  let next = state;
  const input = emptyInputFrame();
  for (let elapsed = 0; elapsed < REPLAY_DURATION_MS; elapsed += 1000 / 60) {
    next = updateSimulation(next, input, 1000 / 60);
    if (next.mode === "replay" && next.replayTimeMs > 200 && next.dummy.position.y === DUMMY_GROUND_Y) {
      return next;
    }
  }
  return next;
}
