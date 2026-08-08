/**
 * Tiny WebAudio helper. Browsers refuse to make noise before the first touch,
 * so the context is created lazily on the first call and reused after that.
 */
let ac: AudioContext | null = null;
let enabled = true;

export function setAudioEnabled(v: boolean) { enabled = v; }

function context(): AudioContext | null {
  if (!enabled) return null;
  if (typeof window === 'undefined') return null;
  try {
    if (!ac) ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ac.state === 'suspended') void ac.resume();
    return ac;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12) {
  const a = context();
  if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g); g.connect(a.destination);
  const t0 = a.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

const R = (a: number, b: number) => a + Math.random() * (b - a);

/* ----------------------------------------------------------------- music */

/**
 * A slow underwater pad with the occasional bell, built from oscillators
 * rather than an audio file — it never repeats, and it costs no download.
 */
let band: { master: GainNode; stop: () => void } | null = null;

/** Notes the bells pick from: a pentatonic scale, so nothing can clash. */
const BELLS = [523.25, 587.33, 659.25, 783.99, 880];

export function musicPlaying() {
  return band !== null;
}

export function startMusic() {
  const a = context();
  // enabled === false means she turned all sound off; music rides along with it
  if (!a || band) return;

  const master = a.createGain();
  master.gain.setValueAtTime(0.0001, a.currentTime);
  master.gain.exponentialRampToValueAtTime(0.055, a.currentTime + 4);
  master.connect(a.destination);

  const warm = a.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 620;
  warm.Q.value = 0.6;
  warm.connect(master);

  // four voices of an A-minor-ish chord, each breathing at its own pace
  const voices: OscillatorNode[] = [];
  [110, 164.81, 220, 246.94].forEach((freq, i) => {
    const o = a.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    o.detune.value = (i - 1.5) * 7;

    const g = a.createGain();
    g.gain.value = 0.17;

    const breath = a.createOscillator();
    breath.type = 'sine';
    breath.frequency.value = 0.042 + i * 0.019;
    const depth = a.createGain();
    depth.gain.value = 0.12;
    breath.connect(depth);
    depth.connect(g.gain);

    o.connect(g);
    g.connect(warm);
    o.start();
    breath.start();
    voices.push(o, breath);
  });

  // a bell every so often, so it never settles into wallpaper
  const ring = () => {
    if (!band) return;
    const t0 = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'triangle';
    o.frequency.value = BELLS[Math.floor(Math.random() * BELLS.length)];
    o.connect(g);
    g.connect(master);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
    o.start(t0);
    o.stop(t0 + 3.4);
  };
  const timer = setInterval(() => { if (Math.random() < 0.55) ring(); }, 5200);

  band = {
    master,
    stop: () => {
      clearInterval(timer);
      const t0 = a.currentTime;
      master.gain.cancelScheduledValues(t0);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t0);
      master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
      for (const v of voices) v.stop(t0 + 1.5);
      setTimeout(() => master.disconnect(), 1800);
    }
  };
}

export function stopMusic() {
  band?.stop();
  band = null;
}

export const sfx = {
  plop() { tone(R(420, 540), 0.16, 'sine', 0.1); setTimeout(() => tone(R(680, 820), 0.1, 'sine', 0.06), 60); },
  pop() { tone(R(900, 1300), 0.07, 'sine', 0.05); },
  chime() {
    const b = [523, 587, 659, 784, 880][Math.floor(Math.random() * 5)];
    tone(b, 0.22, 'triangle', 0.11);
    setTimeout(() => tone(b * 1.5, 0.26, 'triangle', 0.07), 90);
  },
  sing() { [659, 784, 880, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.08), i * 120)); },
  wrong() { tone(300, 0.18, 'sine', 0.07); setTimeout(() => tone(230, 0.22, 'sine', 0.06), 120); }
};
