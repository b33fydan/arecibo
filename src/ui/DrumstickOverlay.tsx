import type { GameSnapshot } from "../game/simulation/state";

interface DrumstickOverlayProps {
  snapshot: GameSnapshot;
  onStart: () => void;
  onRestart: () => void;
}

export function DrumstickOverlay({ snapshot, onStart, onRestart }: DrumstickOverlayProps) {
  const showPanel = snapshot.mode === "menu";
  const showStrikeBanner =
    snapshot.result.grade !== "none" &&
    snapshot.mode === "replay" &&
    snapshot.replayTimeMs < 1_600;
  const meterPercent = `${Math.max(4, snapshot.meterValue * 100)}%`;

  return (
    <div className="hud-layer">
      <div className="objective-chip">
        <span>{snapshot.mode === "replay" ? "Instant replay" : "FPS Drumstick Lab"}</span>
        <strong>{snapshot.result.label}</strong>
      </div>

      {snapshot.mode === "aiming" && (
        <div className="meter-panel">
          <div className="meter-label">
            <span>Timing</span>
            <strong>{Math.round(snapshot.meterValue * 100)}</strong>
          </div>
          <div className="meter-track">
            <div className="perfect-zone" />
            <div className="meter-fill" style={{ width: meterPercent }} />
          </div>
        </div>
      )}

      {showStrikeBanner && (
        <div className={`strike-banner strike-banner-${snapshot.result.grade}`}>
          <span>{snapshot.result.echo}</span>
          <strong>{snapshot.result.label}</strong>
        </div>
      )}

      {snapshot.mode === "replay" && (
        <div className="replay-stats">
          <span>{snapshot.result.distance.toFixed(1)}m</span>
          <strong>{snapshot.result.score} pts</strong>
          <em>{snapshot.result.brokenCount} broken</em>
        </div>
      )}

      {showPanel && (
        <div className="overlay">
          <div className="overlay-panel">
            <p className="eyebrow">Drumstick</p>
            <h2>Bonk the balloon dummy</h2>
            <p>
              First-person timing prototype. Hit the top of the meter for a maximum
              drumstrike and watch the replay launch.
            </p>
            <button className="primary-button" type="button" onClick={onStart}>
              Start
            </button>
            <div className="key-row" aria-hidden="true">
              <span className="key-badge">Space</span>
              <span className="key-badge">R</span>
              <span className="key-badge">F</span>
            </div>
          </div>
        </div>
      )}

      {snapshot.mode !== "menu" && (
        <button className="restart-button" type="button" onClick={onRestart}>
          Restart
        </button>
      )}
    </div>
  );
}
