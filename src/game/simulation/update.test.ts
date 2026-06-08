import { describe, expect, it } from "vitest";
import { emptyInputFrame } from "../input/actions";
import { createInitialState, STRIKE_DURATION_MS } from "./state";
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
});

function stepFor(state: GameState, totalMs: number) {
  let next = state;
  const input = emptyInputFrame();
  for (let elapsed = 0; elapsed < totalMs; elapsed += 1000 / 60) {
    next = updateSimulation(next, input, 1000 / 60);
  }
  return next;
}
