/**
 * Synthesised sound effects and background music (WebAudio, no asset files).
 * The music loops are original, written as semitone steps over a root note.
 */

let context = null;
let master = null;
let musicBus = null;
let muted = false;
let musicOn = true;

const MASTER_GAIN = 1;
const MUSIC_GAIN = 0.3;

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : MASTER_GAIN;
}

export function isMuted() {
  return muted;
}

export function setMusic(value) {
  musicOn = value;
  if (musicBus) musicBus.gain.value = musicOn ? MUSIC_GAIN : 0;
}

export function isMusicOn() {
  return musicOn;
}

/** Must be first called from a user gesture (browsers block audio before that). */
function audio() {
  if (muted) return null;
  if (!context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(context.destination);
    musicBus = context.createGain();
    musicBus.gain.value = musicOn ? MUSIC_GAIN : 0;
    musicBus.connect(master);
  }
  if (context.state === "suspended") context.resume();
  return context;
}

function tone(frequency, duration, { type = "sine", gain = 0.12, delay = 0, bus = null } = {}) {
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
  oscillator.connect(envelope).connect(bus || master);
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

// Background music -------------------------------------------------------------------------

const hz = (semitones) => 440 * 2 ** (semitones / 12);

// Each song: root (semitones from A4), tempo (steps per second), lead (16-step loop of
// semitone offsets, null = rest) and bass (one note per 2 steps). All original, kept soft
// and bright so they sit under the match sounds.
export const SONGS = [
  { root: -9, tempo: 5, lead: [0, 4, 7, null, 9, 7, 4, null, 5, 7, 9, 12, 9, null, 7, null], bass: [-12, -5, -7, -3, -10, -5, -7, -5] },
  { root: -7, tempo: 5.5, lead: [7, null, 4, 5, 7, null, 12, null, 9, 7, 5, null, 4, 2, 0, null], bass: [-12, -8, -5, -8, -10, -7, -5, -7] },
  { root: -5, tempo: 4.5, lead: [0, null, 2, 4, null, 7, null, 4, 2, null, 0, null, -3, null, 0, null], bass: [-12, -12, -7, -7, -15, -15, -10, -10] },
  { root: -8, tempo: 6, lead: [0, 3, 7, 3, 10, 7, 3, null, 5, 8, 12, 8, 7, null, 3, null], bass: [-12, -9, -7, -4, -12, -9, -5, -7] },
];

let timer = null;
let current = -1;
let step = 0;
let nextTime = 0;

/** Starts song `index` (cycled), or keeps it playing if it already is. */
export function playMusic(index) {
  const song = ((index % SONGS.length) + SONGS.length) % SONGS.length;
  if (song === current && timer) return;
  stopMusic();
  current = song;
  step = 0;
  nextTime = 0;
  timer = setInterval(() => schedule(SONGS[song]), 60);
}

export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  current = -1;
}

/** Look-ahead scheduler: queues the notes of the next ~0.25 s on the audio clock. */
function schedule(song) {
  if (!context || muted || !musicOn || context.state !== "running") return;
  const length = 1 / song.tempo;
  const now = context.currentTime;
  if (nextTime < now) nextTime = now + 0.05;
  while (nextTime < now + 0.25) {
    const delay = nextTime - now;
    const lead = song.lead[step % song.lead.length];
    if (lead !== null) tone(hz(song.root + lead + 12), length * 0.85, { type: "triangle", gain: 0.08, delay, bus: musicBus });
    if (step % 2 === 0) {
      const bass = song.bass[(step / 2) % song.bass.length];
      tone(hz(song.root + bass), length * 1.7, { type: "sine", gain: 0.14, delay, bus: musicBus });
    }
    step += 1;
    nextTime += length;
  }
}
