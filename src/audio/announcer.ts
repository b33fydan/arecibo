import type { StrikeGrade } from "../game/simulation/state";

let audioContext: AudioContext | null = null;

export function playStrikeCue(grade: StrikeGrade, label: string) {
  if (grade === "none") return;

  const context = getAudioContext();
  if (context) {
    void context.resume();
    playImpact(context, grade);
    playEchoPings(context, grade);
  }

  speakAnnouncer(label, grade);
}

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;

  audioContext = new AudioContextCtor();
  return audioContext;
}

function playImpact(context: AudioContext, grade: StrikeGrade) {
  const now = context.currentTime;
  const gain = context.createGain();
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(grade === "maximum" ? 340 : 190, now);

  oscillator.type = grade === "maximum" ? "sawtooth" : "triangle";
  oscillator.frequency.setValueAtTime(grade === "maximum" ? 104 : 64, now);
  oscillator.frequency.exponentialRampToValueAtTime(grade === "maximum" ? 28 : 34, now + 0.22);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(grade === "maximum" ? 0.68 : 0.28, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (grade === "maximum" ? 0.48 : 0.34));

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + (grade === "maximum" ? 0.5 : 0.36));
}

function playEchoPings(context: AudioContext, grade: StrikeGrade) {
  const now = context.currentTime;
  const count = grade === "maximum" ? 7 : 2;

  for (let index = 0; index < count; index += 1) {
    const start = now + 0.1 + index * (grade === "maximum" ? 0.13 : 0.16);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime((grade === "maximum" ? 760 : 340) - index * (grade === "maximum" ? 58 : 46), start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime((grade === "maximum" ? 0.24 : 0.07) / (index + 1), start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + (grade === "maximum" ? 0.38 : 0.28));
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + (grade === "maximum" ? 0.4 : 0.3));
  }
}

function speakAnnouncer(label: string, grade: StrikeGrade) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(label);
  utterance.rate = grade === "maximum" ? 0.76 : 0.95;
  utterance.pitch = grade === "maximum" ? 0.58 : 0.78;
  utterance.volume = grade === "maximum" ? 1 : 0.55;
  window.speechSynthesis.speak(utterance);

  if (grade === "maximum") {
    window.setTimeout(() => {
      const echo = new SpeechSynthesisUtterance(label);
      echo.rate = 0.68;
      echo.pitch = 0.46;
      echo.volume = 0.46;
      window.speechSynthesis.speak(echo);
    }, 240);
  }
}
