/// <reference types="vite/client" />

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }

  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

export {};
