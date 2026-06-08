import { useEffect, useMemo, useRef, useState } from "react";
import { playStrikeCue } from "./audio/announcer";
import { createInitialState, serializeGameState, toSnapshot } from "./game/simulation/state";
import type { GameSnapshot } from "./game/simulation/state";
import { COMMAND_EVENT, sendGameCommand } from "./game/bridge/gameEvents";
import type { GameCommand } from "./game/bridge/gameEvents";
import { emptyInputFrame, keyBindings } from "./game/input/actions";
import type { ActionName } from "./game/input/actions";
import { updateSimulation } from "./game/simulation/update";
import { DrumstickScene } from "./render/DrumstickScene";
import { DrumstickOverlay } from "./ui/DrumstickOverlay";
import { Hud } from "./ui/Hud";

function App() {
  const stateRef = useRef(createInitialState());
  const transientsRef = useRef(new Set<ActionName>());
  const lastTimeRef = useRef<number | null>(null);
  const lastSerializedRef = useRef("");
  const frameRef = useRef<number | null>(null);
  const lastCueRef = useRef("");
  const dragViewRef = useRef({ active: false, lastX: 0 });
  const viewYawRef = useRef(0);
  const initialSnapshot = useMemo(() => toSnapshot(stateRef.current), []);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(initialSnapshot);
  const [viewYaw, setViewYaw] = useState(0);

  useEffect(() => {
    const publish = () => {
      const serialized = serializeGameState(stateRef.current);
      if (serialized === lastSerializedRef.current) return;
      lastSerializedRef.current = serialized;
      setSnapshot(toSnapshot(stateRef.current));
    };

    const step = (deltaMs: number) => {
      const input = emptyInputFrame();
      for (const action of transientsRef.current) {
        input[action] = true;
      }
      transientsRef.current.clear();

      if (input.fullscreen) {
        toggleFullscreen();
      }

      stateRef.current = updateSimulation(stateRef.current, input, deltaMs);
      publish();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const action = keyBindings[event.code];
      if (!action) return;
      event.preventDefault();
      transientsRef.current.add(action);
    };

    const onCommand = (event: Event) => {
      const command = (event as CustomEvent<GameCommand>).detail;
      transientsRef.current.add(command === "restart" ? "restart" : "confirm");
    };

    const tick = (time: number) => {
      const lastTime = lastTimeRef.current ?? time;
      lastTimeRef.current = time;
      step(time - lastTime);
      frameRef.current = requestAnimationFrame(tick);
    };

    window.render_game_to_text = () =>
      JSON.stringify({
        ...toSnapshot(stateRef.current),
        view: {
          yaw: Math.round(viewYawRef.current * 100) / 100,
        },
      });
    window.advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let index = 0; index < steps; index += 1) {
        step(1000 / 60);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(COMMAND_EVENT, onCommand);
    frameRef.current = requestAnimationFrame(tick);
    publish();

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(COMMAND_EVENT, onCommand);
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, []);

  useEffect(() => {
    if (snapshot.mode !== "striking" || snapshot.result.grade === "none") {
      return;
    }

    const cueKey = `${snapshot.result.grade}:${snapshot.result.power}`;
    if (cueKey === lastCueRef.current) {
      return;
    }

    lastCueRef.current = cueKey;
    playStrikeCue(snapshot.result.grade, snapshot.result.label);
  }, [snapshot.mode, snapshot.result.grade, snapshot.result.label, snapshot.result.power]);

  return (
    <main className="app-shell">
      <section className="game-stage" aria-label="Drumstick FPS mini game">
        <div className="game-header">
          <div>
            <p className="eyebrow">Arecibo Arcade</p>
            <h1>Drumstick</h1>
          </div>
          <Hud snapshot={snapshot} />
        </div>

        <div
          className="game-frame"
          onPointerDown={(event) => {
            if (snapshot.mode === "menu" || event.button !== 0) return;
            if ((event.target as HTMLElement).closest("button")) return;
            dragViewRef.current = { active: true, lastX: event.clientX };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragViewRef.current.active) return;
            const deltaX = event.clientX - dragViewRef.current.lastX;
            dragViewRef.current.lastX = event.clientX;
            setViewYaw((current) => {
              const next = clamp(current + deltaX * 0.004, -0.62, 0.62);
              viewYawRef.current = next;
              return next;
            });
          }}
          onPointerUp={(event) => {
            dragViewRef.current.active = false;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={() => {
            dragViewRef.current.active = false;
          }}
        >
          <DrumstickScene snapshot={snapshot} viewYaw={viewYaw} />
          <DrumstickOverlay
            snapshot={snapshot}
            onStart={() => sendGameCommand("start")}
            onRestart={() => sendGameCommand("restart")}
          />
        </div>
      </section>
    </main>
  );
}

export default App;

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.querySelector(".game-frame")?.requestFullscreen().catch(() => undefined);
    return;
  }

  document.exitFullscreen().catch(() => undefined);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
