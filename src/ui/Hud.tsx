import type { GameSnapshot } from "../game/simulation/state";

interface HudProps {
  snapshot: GameSnapshot;
}

export function Hud({ snapshot }: HudProps) {
  return (
    <div className="hud" aria-live="polite">
      <div className="hud-item">
        <span className="hud-label">Score</span>
        <span className="hud-value">{snapshot.result.score}</span>
      </div>
      <div className="hud-item">
        <span className="hud-label">Power</span>
        <span className="hud-value">{Math.round(snapshot.lockedPower * 100 || snapshot.meterValue * 100)}</span>
      </div>
      <div className="hud-item">
        <span className="hud-label">Best</span>
        <span className="hud-value">{snapshot.bestScore}</span>
      </div>
    </div>
  );
}
