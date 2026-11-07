/** Tiny synthesised sound effects (WebAudio, no asset files). */

let context = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

/** Must be first called from a user gesture (browsers block audio before that). */
function audio() {
  if (muted) return null;
  if (!context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
  }
  if (context.state === "suspended") context.resume();
  return context;
}

function tone(frequency, duration, { type = "sine", gain = 0.12, delay = 0 } = {}) {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

const semitone = (base, steps) => base * 2 ** (steps / 12);

export const sfx = {
  unlock() {
    audio();
  },
  select() {
    tone(660, 0.07, { type: "triangle", gain: 0.07 });
  },
  match(combo) {
    const base = semitone(523.25, Math.min(combo - 1, 10) * 2);
    tone(base, 0.1, { type: "triangle" });
    tone(semitone(base, 7), 0.14, { type: "triangle", delay: 0.06 });
  },
  wrong() {
    tone(180, 0.12, { type: "square", gain: 0.035 });
  },
  shuffle() {
    [0, 1, 2, 3].forEach((i) => tone(semitone(392, i * 3), 0.06, { gain: 0.06, delay: i * 0.04 }));
  },
  hint() {
    tone(880, 0.12, { gain: 0.06 });
  },
  clear() {
    [0, 4, 7, 12].forEach((step, i) =>
      tone(semitone(523.25, step), 0.22, { type: "triangle", delay: i * 0.1 }),
    );
  },
  over() {
    [0, -3, -7].forEach((step, i) =>
      tone(semitone(392, step), 0.3, { type: "sawtooth", gain: 0.05, delay: i * 0.18 }),
    );
  },
};
