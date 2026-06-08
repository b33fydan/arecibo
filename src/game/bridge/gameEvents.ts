import type { GameSnapshot } from "../simulation/state";

export const STATE_EVENT = "arecibo:state";
export const COMMAND_EVENT = "arecibo:command";

export type GameCommand = "start" | "restart";

export function publishGameState(snapshot: GameSnapshot) {
  window.dispatchEvent(new CustomEvent<GameSnapshot>(STATE_EVENT, { detail: snapshot }));
}

export function sendGameCommand(command: GameCommand) {
  window.dispatchEvent(new CustomEvent<GameCommand>(COMMAND_EVENT, { detail: command }));
}
