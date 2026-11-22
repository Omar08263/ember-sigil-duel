// Ember Sigils — the sounds.
// One job: every sound the game makes, synthesised live with WebAudio.
// No audio files, no network: a few oscillators and a noise burst, muted
// until the player first interacts (browsers block sound before that).
let context = null;
let muted = false;

/** True while sound is on. */
export function soundOn() {
  return !muted;
}

/** Toggle the mute; returns the new state. */
export function toggleMute() {
  muted = !muted;
  return muted;
}

/** Create the audio context lazily, on the first user gesture. */
export function ensureAudio() {
  if (typeof window === 'undefined') return null;
  if (context === null) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
  }
  if (context && context.state === 'suspended') context.resume();
  return context;
}

/** One short tone: frequency, length in seconds, waveform and volume. */
function tone(freq, seconds, type = 'sine', volume = 0.12, when = 0) {
  const ctx = ensureAudio();
  if (!ctx || muted) return;
  const start = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + seconds + 0.05);
}

/** A card slides onto the table. */
export function soundPlayCard() {
  tone(392, 0.12, 'triangle', 0.14);
  tone(523, 0.16, 'triangle', 0.12, 0.07);
}

/** A creature attacks: a low thud. */
export function soundAttack() {
  tone(160, 0.18, 'sawtooth', 0.12);
  tone(90, 0.22, 'square', 0.08, 0.02);
}

/** A spell resolves: a rising shimmer. */
export function soundSpell() {
  tone(659, 0.1, 'sine', 0.1);
  tone(880, 0.14, 'sine', 0.1, 0.08);
  tone(1174, 0.2, 'sine', 0.08, 0.16);
}

/** A creature falls. */
export function soundFall() {
  tone(220, 0.2, 'triangle', 0.1);
  tone(147, 0.3, 'triangle', 0.1, 0.1);
}

/** The turn passes to the other side. */
export function soundTurn() {
  tone(330, 0.1, 'sine', 0.08);
}

/** Victory: a short rising fanfare. */
export function soundWin() {
  tone(523, 0.15, 'triangle', 0.14);
  tone(659, 0.15, 'triangle', 0.14, 0.12);
  tone(784, 0.2, 'triangle', 0.14, 0.24);
  tone(1046, 0.35, 'triangle', 0.14, 0.36);
}

/** Defeat: a short falling phrase. */
export function soundLoss() {
  tone(392, 0.2, 'triangle', 0.12);
  tone(311, 0.2, 'triangle', 0.12, 0.16);
  tone(233, 0.4, 'triangle', 0.12, 0.32);
}
