export type ActionName =
  | "confirm"
  | "restart"
  | "fullscreen";

export type InputFrame = Record<ActionName, boolean>;

export const keyBindings: Readonly<Record<string, ActionName>> = {
  Enter: "confirm",
  Space: "confirm",
  KeyR: "restart",
  KeyF: "fullscreen",
};

export function emptyInputFrame(): InputFrame {
  return {
    confirm: false,
    restart: false,
    fullscreen: false,
  };
}

export function inputFrameFromKeys(
  keysDown: ReadonlySet<string>,
  transients: ReadonlySet<ActionName>,
): InputFrame {
  const frame = emptyInputFrame();

  for (const key of keysDown) {
    const action = keyBindings[key];
    if (action) {
      frame[action] = true;
    }
  }

  for (const action of transients) {
    frame[action] = true;
  }

  return frame;
}
