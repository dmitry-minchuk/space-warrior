// 80s-style synthwave/electro engine.
// Procedural synthesis via Web Audio — no audio files needed.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicHpf: BiquadFilterNode | null = null;
let uiGain: GainNode | null = null;
let unlocked = false;

function ensure(): AudioContext {
  if (!ctx) {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.7;
    sfxGain.connect(masterGain);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.4;
    musicHpf = ctx.createBiquadFilter();
    musicHpf.type = 'highpass';
    musicHpf.frequency.value = 40;
    musicGain.connect(musicHpf).connect(masterGain);
    uiGain = ctx.createGain();
    uiGain.gain.value = 0.7;
    uiGain.connect(masterGain);
  }
  return ctx;
}

export function unlockAudio(): void {
  ensure();
  if (ctx && ctx.state === 'suspended') ctx.resume();
  unlocked = true;
}

// One second of white noise, generated once — every consumer plays a random
// slice of it. Filling a fresh Float32Array with Math.random() per SFX was a
// measurable main-thread spike on TV boxes (a boss death fired 3 large booms
// = ~92k samples synthesized inside a single frame).
const NOISE_LEN_S = 1.0;
let sharedNoise: AudioBuffer | null = null;

function noiseBuf(c: AudioContext): AudioBuffer {
  if (!sharedNoise) {
    sharedNoise = c.createBuffer(1, Math.ceil(c.sampleRate * NOISE_LEN_S), c.sampleRate);
    const data = sharedNoise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return sharedNoise;
}

/** Random start offset so reused noise slices don't sound identical. */
function noiseOffset(duration: number): number {
  return Math.random() * Math.max(0, NOISE_LEN_S - duration - 0.02);
}

// Explosions cap: past a few overlapping booms the extra ones are inaudible,
// but each still costs nodes — a boss death used to stack 3 in one frame.
const MAX_CONCURRENT_BOOMS = 3;
const boomEnds: number[] = [];

function boomSlot(duration: number): boolean {
  const now = ensure().currentTime;
  for (let i = boomEnds.length - 1; i >= 0; i--) {
    if (boomEnds[i] <= now) {
      boomEnds[i] = boomEnds[boomEnds.length - 1];
      boomEnds.pop();
    }
  }
  if (boomEnds.length >= MAX_CONCURRENT_BOOMS) return false;
  boomEnds.push(now + duration);
  return true;
}

interface PlayOpts {
  volume?: number;
  pitch?: number;
}

type SoundFn = (opts: PlayOpts) => void;

const sounds: Record<string, SoundFn> = {};

function envOsc(type: OscillatorType, freqA: number, freqB: number, duration: number, vol: number, target: GainNode): void {
  const c = ensure();
  const osc = c.createOscillator();
  osc.type = type;
  const g = c.createGain();
  osc.frequency.setValueAtTime(freqA, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqB), c.currentTime + duration);
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(g).connect(target);
  osc.start();
  osc.stop(c.currentTime + duration + 0.02);
}

function envNoise(duration: number, vol: number, target: GainNode, lp = 4000, hp = 100): void {
  const c = ensure();
  const src = c.createBufferSource();
  src.buffer = noiseBuf(c);
  const g = c.createGain();
  const lpf = c.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = lp;
  const hpf = c.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = hp;
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  src.connect(hpf).connect(lpf).connect(g).connect(target);
  src.start(c.currentTime, noiseOffset(duration), duration + 0.02);
}

sounds.pulse = (o) => envOsc('square', 1400 * (o.pitch ?? 1), 320, 0.08, 0.15 * (o.volume ?? 1), sfxGain!);
sounds.spread = (o) => {
  envOsc('sawtooth', 900 * (o.pitch ?? 1), 220, 0.1, 0.18 * (o.volume ?? 1), sfxGain!);
  envNoise(0.07, 0.06 * (o.volume ?? 1), sfxGain!, 3000);
};
sounds.plasma = (o) => {
  envOsc('triangle', 220, 80, 0.25, 0.3 * (o.volume ?? 1), sfxGain!);
  envOsc('sawtooth', 640, 220, 0.15, 0.18 * (o.volume ?? 1), sfxGain!);
};
sounds.laser_loop = (o) => {
  envOsc('square', 900, 1100, 0.08, 0.05 * (o.volume ?? 1), sfxGain!);
};
sounds.missile = (o) => {
  envNoise(0.25, 0.12 * (o.volume ?? 1), sfxGain!, 1800, 120);
  envOsc('square', 200, 540, 0.18, 0.08 * (o.volume ?? 1), sfxGain!);
};
sounds.wave = (o) => envOsc('sine', 440, 1200, 0.12, 0.18 * (o.volume ?? 1), sfxGain!);
sounds.lightning = (o) => {
  envNoise(0.12, 0.18 * (o.volume ?? 1), sfxGain!, 6000, 1500);
  envOsc('square', 1800, 600, 0.1, 0.07 * (o.volume ?? 1), sfxGain!);
};
sounds.bomb = (o) => {
  envOsc('triangle', 180, 30, 0.7, 0.6 * (o.volume ?? 1), sfxGain!);
  envNoise(0.7, 0.4 * (o.volume ?? 1), sfxGain!, 1200, 50);
};
sounds.enemy_fire = (o) => envOsc('sawtooth', 700 * (o.pitch ?? 1), 220, 0.08, 0.12 * (o.volume ?? 1), sfxGain!);
sounds.sniper_fire = (o) => envOsc('sawtooth', 2200, 400, 0.2, 0.18 * (o.volume ?? 1), sfxGain!);
sounds.boom_sm = (o) => {
  if (!boomSlot(0.25)) return;
  envNoise(0.25, 0.22 * (o.volume ?? 1), sfxGain!, 1800, 80);
  envOsc('triangle', 220, 50, 0.18, 0.18 * (o.volume ?? 1), sfxGain!);
};
sounds.boom_md = (o) => {
  if (!boomSlot(0.45)) return;
  envNoise(0.45, 0.32 * (o.volume ?? 1), sfxGain!, 1500, 60);
  envOsc('triangle', 140, 35, 0.4, 0.3 * (o.volume ?? 1), sfxGain!);
};
sounds.boom_lg = (o) => {
  if (!boomSlot(0.7)) return;
  envNoise(0.7, 0.45 * (o.volume ?? 1), sfxGain!, 1200, 40);
  envOsc('triangle', 90, 22, 0.6, 0.45 * (o.volume ?? 1), sfxGain!);
  envOsc('sine', 200, 50, 0.5, 0.2 * (o.volume ?? 1), sfxGain!);
};
sounds.pickup = (o) => {
  envOsc('triangle', 880, 1320, 0.1, 0.15 * (o.volume ?? 1), uiGain!);
  envOsc('sine', 1760, 2200, 0.08, 0.1 * (o.volume ?? 1), uiGain!);
};
sounds.extra_life = (o) => {
  // Classic 1-up: rising triplet with a sparkly overlay so it cuts through
  // combat without being abrasive.
  const v = (o.volume ?? 1) * 0.32;
  envOsc('triangle', 660, 990, 0.10, v, uiGain!);
  setTimeout(() => envOsc('triangle', 990, 1320, 0.10, v, uiGain!), 110);
  setTimeout(() => envOsc('triangle', 1320, 1980, 0.22, v, uiGain!), 230);
  setTimeout(() => envOsc('sine', 2640, 3000, 0.12, v * 0.7, uiGain!), 230);
};
sounds.player_hit = (o) => {
  envNoise(0.15, 0.25 * (o.volume ?? 1), sfxGain!, 800, 80);
  envOsc('square', 320, 80, 0.12, 0.18 * (o.volume ?? 1), sfxGain!);
};
sounds.boss_warning = (o) => {
  envOsc('square', 220, 220, 0.12, 0.18 * (o.volume ?? 1), uiGain!);
  setTimeout(() => envOsc('square', 220, 220, 0.12, 0.18 * (o.volume ?? 1), uiGain!), 200);
  setTimeout(() => envOsc('square', 440, 440, 0.16, 0.18 * (o.volume ?? 1), uiGain!), 420);
};
sounds.ui_select = (o) => envOsc('square', 800, 1100, 0.06, 0.18 * (o.volume ?? 1), uiGain!);
sounds.ui_move = (o) => envOsc('square', 600, 700, 0.04, 0.12 * (o.volume ?? 1), uiGain!);
sounds.level_clear = (o) => {
  const v = (o.volume ?? 1) * 0.3;
  envOsc('triangle', 440, 660, 0.15, v, uiGain!);
  setTimeout(() => envOsc('triangle', 660, 880, 0.15, v, uiGain!), 160);
  setTimeout(() => envOsc('triangle', 880, 1320, 0.3, v, uiGain!), 320);
};
sounds.game_over = (o) => {
  const v = (o.volume ?? 1) * 0.3;
  envOsc('triangle', 440, 220, 0.25, v, uiGain!);
  setTimeout(() => envOsc('triangle', 330, 165, 0.25, v, uiGain!), 240);
  setTimeout(() => envOsc('triangle', 220, 110, 0.55, v, uiGain!), 500);
};

export const Sfx = {
  play(name: string, opts: PlayOpts = {}): void {
    if (!unlocked) return;
    const fn = sounds[name];
    if (!fn) return;
    try {
      fn(opts);
    } catch (e) {
      console.warn('audio play failed', name, e);
    }
  },
  setVolumes(opts: { music?: number; sfx?: number; ui?: number }): void {
    ensure();
    if (opts.music !== undefined && musicGain) musicGain.gain.value = opts.music;
    if (opts.sfx !== undefined && sfxGain) sfxGain.gain.value = opts.sfx;
    if (opts.ui !== undefined && uiGain) uiGain.gain.value = opts.ui;
  },
};

// ===== 80s synthwave/electro music engine ================================
// Each theme is an 8-bar composition (16 steps per bar) with its own chord
// progression and melody, so the music actually develops rather than looping
// the same handful of notes.

// Note offsets in semitones from the track root. `null` = rest.
type Step = number | null;
interface Bar {
  bass: Step[];        // 16 sixteenth-notes
  lead: Step[];        // 16 sixteenth-notes
  chord: number;       // pad root offset for the whole bar (semitones from rootHz)
  kick?: number[];     // override default
  hat?: number[];      // override default
  snare?: number[];    // override default
}
interface Track {
  bpm: number;
  rootHz: number;
  bars: Bar[];
  defaultKick: number[];
  defaultHat: number[];
  defaultSnare: number[];
  bassOctave?: number;
  leadOctave?: number;
}

const A = 220.00, C = 130.81, D = 146.83, E_ = 164.81, F = 174.61, G = 196.00, Eflat = 155.56;

function hzFromSemi(root: number, semi: number): number {
  return root * Math.pow(2, semi / 12);
}

const _ = null;

// --- 8-bar compositions ---------------------------------------------------
//
// Each theme follows a 4-chord progression repeated with melodic variation
// across bars 1/3/5/7 vs 2/4/6/8 so it never sounds the same on consecutive
// passes. Bar 4 and bar 8 carry snare/kick fills to mark the half/full cycle.

// Earth — A minor, classic Tron descending progression Am - F - C - G.
const earth: Track = {
  bpm: 112,
  rootHz: A,
  bassOctave: -12,
  defaultKick:  [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0],
  defaultHat:   [0, 0, 1, 0,  0, 0, 1, 0,  0, 0, 1, 0,  0, 0, 1, 0],
  defaultSnare: [0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0],
  bars: [
    // 1: Am intro
    { chord: 0, bass: [0, _, 0, _, _, _, 0, _, 0, _, _, 0, _, 0, _, _],
                lead: [_, _, 12, _, 15, _, _, 12, _, _, 17, _, 15, _, 12, _] },
    // 2: Am ascending variation
    { chord: 0, bass: [0, _, 0, _, _, _, 0, _, 0, _, _, 0, _, 0, _, 7],
                lead: [10, _, 12, _, _, 15, _, _, 19, _, 17, _, 15, _, _, _] },
    // 3: F (–4)
    { chord: -4, bass: [-4, _, -4, _, _, _, -4, _, -4, _, _, -4, _, -4, _, _],
                 lead: [_, _, 8, _, 12, _, _, 15, _, _, 12, _, 8, _, _, 5] },
    // 4: F → fill into bridge
    { chord: -4, bass: [-4, _, -4, _, _, _, -4, _, -4, _, _, -4, _, -4, -4, -4],
                 lead: [15, _, 12, _, 8, _, 5, _, 8, _, 12, _, 15, _, 17, _],
                 snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1] },
    // 5: C (+3) — brighter half
    { chord: 3, bass: [3, _, 3, _, _, _, 3, _, 3, _, _, 3, _, 3, _, _],
                lead: [_, _, 15, _, 19, _, _, 15, _, _, 22, _, 19, _, 15, _] },
    // 6: C variation
    { chord: 3, bass: [3, _, 3, _, _, _, 3, _, 3, _, _, 3, _, 3, _, 3],
                lead: [22, _, 19, _, _, 17, _, _, 15, _, 17, _, 19, _, _, _] },
    // 7: G (–2) — building
    { chord: -2, bass: [-2, _, -2, _, _, _, -2, _, -2, _, _, -2, _, -2, _, _],
                 lead: [_, _, 14, _, 17, _, _, 14, _, _, 19, _, 17, _, 14, _] },
    // 8: G turnaround (fill, leads back to bar 1)
    { chord: -2, bass: [-2, _, -2, _, _, _, -2, _, -2, -2, _, -2, _, -2, -2, -2],
                 lead: [19, _, 17, _, 14, _, 12, _, 10, _, _, 7, _, 12, _, _],
                 snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1] },
  ],
};

// Industrial — C minor, slower and darker. Cm - Ab - Eb - G7.
const industrial: Track = {
  bpm: 104,
  rootHz: C,
  bassOctave: -12,
  defaultKick:  [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0],
  defaultHat:   [0, 1, 0, 0,  0, 1, 0, 0,  0, 1, 0, 0,  0, 1, 0, 1],
  defaultSnare: [0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0],
  bars: [
    // 1: Cm
    { chord: 0, bass: [0, _, 0, _, _, 0, _, _, 0, _, _, 0, _, 0, _, _],
                lead: [_, _, _, 12, _, 13, _, 15, _, _, _, 12, _, 17, _, 15] },
    // 2: Cm variation
    { chord: 0, bass: [0, _, 0, _, _, 0, _, _, 0, _, -2, _, 0, _, -2, _],
                lead: [12, _, _, 10, _, 12, _, _, 15, _, 12, _, 10, _, _, _] },
    // 3: Ab (-4)
    { chord: -4, bass: [-4, _, -4, _, _, -4, _, _, -4, _, _, -4, _, -4, _, _],
                 lead: [_, _, 8, _, 12, _, _, 13, _, _, 12, _, 8, _, _, 5] },
    // 4: Ab fill
    { chord: -4, bass: [-4, _, -4, _, _, -4, _, _, -4, _, _, -4, -4, _, -4, -4],
                 lead: [13, _, 12, _, 8, _, 5, _, 8, _, 12, _, 13, _, 15, _],
                 snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1] },
    // 5: Eb (+3)
    { chord: 3, bass: [3, _, 3, _, _, 3, _, _, 3, _, _, 3, _, 3, _, _],
                lead: [_, _, 15, _, 17, _, _, 19, _, _, 22, _, 19, _, 17, _] },
    // 6: Eb variation
    { chord: 3, bass: [3, _, 3, _, _, 3, _, _, 3, _, 5, _, 3, _, 5, _],
                lead: [19, _, 22, _, _, 19, _, _, 17, _, 19, _, 22, _, _, _] },
    // 7: G7 (+7)
    { chord: 7, bass: [7, _, 7, _, _, 7, _, _, 7, _, _, 7, _, 7, _, _],
                lead: [_, _, 19, _, 22, _, _, 19, _, _, 22, _, 24, _, 22, _] },
    // 8: G7 fill turnaround
    { chord: 7, bass: [7, _, 7, _, _, 7, _, _, 7, _, 5, _, 3, _, 0, _],
                lead: [22, _, 19, _, 17, _, 15, _, 12, _, _, 10, _, 12, _, _],
                snare: [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1] },
  ],
};

// Dark sector — slow, ominous, Phrygian-flavoured. Em - C - G - D.
const darksector: Track = {
  bpm: 96,
  rootHz: E_,
  bassOctave: -12,
  defaultKick:  [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 1, 0],
  defaultHat:   [0, 1, 0, 1,  0, 1, 0, 1,  0, 1, 0, 1,  0, 1, 0, 1],
  defaultSnare: [0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0],
  bars: [
    // 1: Em (root)
    { chord: 0, bass: [0, _, _, 0, _, _, 0, _, 0, _, _, 0, _, _, 0, _],
                lead: [_, _, 12, _, 15, _, 12, _, _, _, 10, _, 12, _, _, _] },
    // 2: Em / phrygian colour
    { chord: 0, bass: [0, _, _, 0, _, _, 1, _, 0, _, _, 0, _, _, 1, _],
                lead: [_, _, 13, _, 15, _, 13, _, 12, _, 10, _, 13, _, _, _] },
    // 3: C (-4)
    { chord: -4, bass: [-4, _, _, -4, _, _, -4, _, -4, _, _, -4, _, _, -4, _],
                 lead: [_, _, 8, _, 12, _, 15, _, _, _, 12, _, 8, _, _, _] },
    // 4: C fill
    { chord: -4, bass: [-4, _, _, -4, _, _, -4, _, -4, _, -4, -4, _, -4, -4, -4],
                 lead: [12, _, 8, _, 5, _, 3, _, 5, _, 8, _, 12, _, 15, _],
                 snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1] },
    // 5: G (+3)
    { chord: 3, bass: [3, _, _, 3, _, _, 3, _, 3, _, _, 3, _, _, 3, _],
                lead: [_, _, 15, _, 19, _, 15, _, _, _, 14, _, 15, _, _, _] },
    // 6: G variation
    { chord: 3, bass: [3, _, _, 3, _, _, 3, _, 3, _, 5, _, 3, _, 5, _],
                lead: [_, _, 17, _, 19, _, 17, _, 15, _, 14, _, 17, _, _, _] },
    // 7: D (-2)
    { chord: -2, bass: [-2, _, _, -2, _, _, -2, _, -2, _, _, -2, _, _, -2, _],
                 lead: [_, _, 10, _, 14, _, 10, _, _, _, 9, _, 10, _, _, _] },
    // 8: D fill turnaround
    { chord: -2, bass: [-2, _, _, -2, _, _, -2, _, -2, _, -2, -2, _, -2, -2, -2],
                 lead: [14, _, 12, _, 10, _, 7, _, 5, _, _, 3, _, 5, _, _],
                 snare: [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1] },
  ],
};

// Anomaly — D minor, faster syncopated. Dm - Bb - F - A7.
const anomaly: Track = {
  bpm: 122,
  rootHz: D,
  bassOctave: -12,
  defaultKick:  [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 1,  1, 0, 0, 0],
  defaultHat:   [0, 1, 1, 0,  0, 1, 1, 0,  0, 1, 1, 0,  0, 1, 1, 0],
  defaultSnare: [0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0],
  bars: [
    // 1: Dm
    { chord: 0, bass: [0, _, 0, _, _, 5, _, 0, _, _, 0, _, _, 5, _, 0],
                lead: [12, _, 15, _, 19, _, 15, _, 14, _, 17, _, 19, _, _, _] },
    // 2: Dm variation
    { chord: 0, bass: [0, _, 0, _, _, 7, _, 0, _, _, 0, _, _, 7, _, 5],
                lead: [_, 17, _, 14, _, 17, _, 19, _, 22, _, 19, _, 17, _, _] },
    // 3: Bb (-4)
    { chord: -4, bass: [-4, _, -4, _, _, 1, _, -4, _, _, -4, _, _, 1, _, -4],
                 lead: [_, _, 8, _, 12, _, 15, _, 17, _, 15, _, 12, _, _, _] },
    // 4: Bb fill
    { chord: -4, bass: [-4, _, -4, _, _, 1, _, -4, _, _, -4, _, 1, _, -4, -4],
                 lead: [15, _, 12, _, 8, _, 5, _, 8, _, 12, _, 15, _, 17, _],
                 snare: [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1] },
    // 5: F (+3)
    { chord: 3, bass: [3, _, 3, _, _, 8, _, 3, _, _, 3, _, _, 8, _, 3],
                lead: [_, _, 15, _, 19, _, 15, _, 17, _, 19, _, 22, _, _, _] },
    // 6: F variation
    { chord: 3, bass: [3, _, 3, _, _, 7, _, 3, _, _, 3, _, _, 7, _, 5],
                lead: [22, _, 19, _, 17, _, 15, _, 12, _, 15, _, 19, _, _, _] },
    // 7: A7 (+7)
    { chord: 7, bass: [7, _, 7, _, _, 12, _, 7, _, _, 7, _, _, 12, _, 7],
                lead: [_, _, 19, _, 22, _, 19, _, 24, _, 22, _, 19, _, _, _] },
    // 8: A7 turnaround
    { chord: 7, bass: [7, _, 7, _, _, 12, _, 7, _, 10, _, 7, _, 5, _, 0],
                lead: [22, _, 19, _, 15, _, 12, _, 10, _, 7, _, 5, _, _, _],
                snare: [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1] },
  ],
};

// Hive — F minor, weird alien arpeggios. Fm - Db - Bb - C.
const hive: Track = {
  bpm: 118,
  rootHz: F,
  bassOctave: -12,
  defaultKick:  [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 1],
  defaultHat:   [0, 1, 0, 1,  0, 1, 0, 1,  0, 1, 0, 1,  0, 1, 0, 1],
  defaultSnare: [0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0],
  bars: [
    // 1: Fm
    { chord: 0, bass: [0, _, 0, _, _, _, 0, _, 0, _, _, 0, _, 0, _, _],
                lead: [_, 7, _, 12, _, 15, _, 12, _, 7, _, 9, _, 14, _, 12] },
    // 2: Fm variation
    { chord: 0, bass: [0, _, 0, _, _, 5, _, 0, 0, _, _, 0, _, 0, _, 5],
                lead: [15, _, 12, _, 9, _, 7, _, 12, _, 15, _, 17, _, _, _] },
    // 3: Db (-4)
    { chord: -4, bass: [-4, _, -4, _, _, _, -4, _, -4, _, _, -4, _, -4, _, _],
                 lead: [_, 3, _, 8, _, 11, _, 8, _, 3, _, 5, _, 11, _, 8] },
    // 4: Db fill
    { chord: -4, bass: [-4, _, -4, _, _, _, -4, _, -4, _, _, -4, _, -4, -4, -4],
                 lead: [11, _, 8, _, 5, _, 3, _, 5, _, 8, _, 11, _, 13, _],
                 snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1] },
    // 5: Bb (-7 → +5 via octave)
    { chord: 5, bass: [5, _, 5, _, _, _, 5, _, 5, _, _, 5, _, 5, _, _],
                lead: [_, 12, _, 17, _, 20, _, 17, _, 12, _, 14, _, 20, _, 17] },
    // 6: Bb variation
    { chord: 5, bass: [5, _, 5, _, _, 10, _, 5, 5, _, _, 5, _, 5, _, 10],
                lead: [20, _, 17, _, 14, _, 12, _, 17, _, 20, _, 22, _, _, _] },
    // 7: C (-5 → +7 via octave)
    { chord: 7, bass: [7, _, 7, _, _, _, 7, _, 7, _, _, 7, _, 7, _, _],
                lead: [_, 14, _, 19, _, 22, _, 19, _, 14, _, 17, _, 22, _, 19] },
    // 8: C turnaround
    { chord: 7, bass: [7, _, 7, _, _, _, 7, _, 7, _, 5, _, 3, _, 0, _],
                lead: [22, _, 19, _, 17, _, 14, _, 12, _, 9, _, 7, _, _, _],
                snare: [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1] },
  ],
};

// Final — A minor, epic and faster. Am - F - C - E (half-cadence).
const finalTrk: Track = {
  bpm: 128,
  rootHz: A,
  bassOctave: -12,
  defaultKick:  [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 1, 0,  1, 0, 0, 0],
  defaultHat:   [0, 1, 1, 1,  0, 1, 1, 1,  0, 1, 1, 1,  0, 1, 1, 1],
  defaultSnare: [0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0,  1, 0, 1, 0],
  bars: [
    // 1: Am driving
    { chord: 0, bass: [0, 0, _, 0, _, 0, _, 0, 0, _, _, 0, _, 0, _, 0],
                lead: [12, _, 15, _, 19, _, 22, _, 19, _, 15, _, 12, _, 17, _] },
    // 2: Am variation
    { chord: 0, bass: [0, 0, _, 0, _, 0, _, 0, 0, _, 7, _, 0, _, 7, _],
                lead: [22, _, 24, _, 22, _, 19, _, 17, _, 19, _, 22, _, 24, _] },
    // 3: F (-4)
    { chord: -4, bass: [-4, -4, _, -4, _, -4, _, -4, -4, _, _, -4, _, -4, _, -4],
                 lead: [_, 8, _, 12, _, 15, _, 19, _, 15, _, 12, _, 8, _, 12] },
    // 4: F fill
    { chord: -4, bass: [-4, -4, _, -4, _, -4, _, -4, -4, _, -4, _, -4, -4, -4, -4],
                 lead: [15, _, 12, _, 8, _, 5, _, 8, _, 12, _, 15, _, 17, 19],
                 snare: [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1] },
    // 5: C (+3)
    { chord: 3, bass: [3, 3, _, 3, _, 3, _, 3, 3, _, _, 3, _, 3, _, 3],
                lead: [_, 15, _, 19, _, 22, _, 24, _, 22, _, 19, _, 15, _, 12] },
    // 6: C variation
    { chord: 3, bass: [3, 3, _, 3, _, 3, _, 3, 3, _, 10, _, 3, _, 10, _],
                lead: [24, _, 22, _, 19, _, 17, _, 22, _, 24, _, 27, _, _, _] },
    // 7: E (+7) — half-cadence climb
    { chord: 7, bass: [7, 7, _, 7, _, 7, _, 7, 7, _, _, 7, _, 7, _, 7],
                lead: [_, 19, _, 22, _, 24, _, 27, _, 24, _, 22, _, 19, _, 22] },
    // 8: E turnaround back to Am — big fill
    { chord: 7, bass: [7, 7, _, 7, _, 7, _, 7, 5, _, 3, _, 0, _, -2, _],
                lead: [27, _, 24, _, 22, _, 19, _, 15, _, 12, _, 10, _, 7, _],
                snare: [0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1] },
  ],
};

const TRACKS: Record<string, Track> = {
  earth,
  industrial,
  darksector,
  anomaly,
  hive,
  final: finalTrk,
};

let stepTimer: number | null = null;
let currentTrack: Track | null = null;
let stepIndex = 0;
let barIndex = 0;

function playBassNote(freq: number, at: number): void {
  const c = ensure();
  const target = musicGain!;
  const o1 = c.createOscillator();
  o1.type = 'sawtooth';
  o1.frequency.value = freq;
  const o2 = c.createOscillator();
  o2.type = 'sawtooth';
  o2.frequency.value = freq * 1.005; // detune
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2200, at);
  lp.frequency.exponentialRampToValueAtTime(400, at + 0.25);
  lp.Q.value = 6;
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.18, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
  o1.connect(lp); o2.connect(lp);
  lp.connect(g).connect(target);
  o1.start(at); o2.start(at);
  o1.stop(at + 0.30);
  o2.stop(at + 0.30);
}

function playLeadNote(freq: number, at: number): void {
  const c = ensure();
  const target = musicGain!;
  const o = c.createOscillator();
  o.type = 'square';
  o.frequency.value = freq;
  const o2 = c.createOscillator();
  o2.type = 'sawtooth';
  o2.frequency.value = freq * 0.5; // sub
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  lp.Q.value = 3;
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.12, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
  o.connect(lp); o2.connect(lp);
  lp.connect(g).connect(target);
  o.start(at); o2.start(at);
  o.stop(at + 0.40);
  o2.stop(at + 0.40);
}

function playPadNote(freq: number, duration: number, at: number): void {
  const c = ensure();
  const target = musicGain!;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = freq;
  const o2 = c.createOscillator();
  o2.type = 'sawtooth';
  o2.frequency.value = freq * 1.498; // fifth (close to 3/2)
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1100;
  lp.Q.value = 1;
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.06, at + Math.min(0.3, duration * 0.25));
  g.gain.setValueAtTime(0.06, at + duration * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  o.connect(lp); o2.connect(lp);
  lp.connect(g).connect(target);
  o.start(at); o2.start(at);
  o.stop(at + duration + 0.05);
  o2.stop(at + duration + 0.05);
}

function playKick(at: number): void {
  const c = ensure();
  const target = musicGain!;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, at);
  o.frequency.exponentialRampToValueAtTime(40, at + 0.12);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0, at);
  g.gain.linearRampToValueAtTime(0.55, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
  o.connect(g).connect(target);
  o.start(at);
  o.stop(at + 0.25);
  // Click for snap
  const click = c.createBufferSource();
  click.buffer = noiseBuf(c);
  const clickG = c.createGain();
  clickG.gain.setValueAtTime(0.16, at);
  clickG.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
  click.connect(clickG).connect(target);
  click.start(at, noiseOffset(0.05), 0.05);
}

function playSnare(at: number): void {
  const c = ensure();
  const target = musicGain!;
  const noise = c.createBufferSource();
  noise.buffer = noiseBuf(c);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 1.2;
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.18, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.15);
  noise.connect(bp).connect(g).connect(target);
  noise.start(at, noiseOffset(0.18), 0.18);
  // Tone body
  const o = c.createOscillator();
  o.type = 'triangle';
  o.frequency.value = 220;
  const og = c.createGain();
  og.gain.setValueAtTime(0, at);
  og.gain.linearRampToValueAtTime(0.08, at + 0.005);
  og.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
  o.connect(og).connect(target);
  o.start(at);
  o.stop(at + 0.13);
}

function playHat(at: number): void {
  const c = ensure();
  const target = musicGain!;
  const noise = c.createBufferSource();
  noise.buffer = noiseBuf(c);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.07, at + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);
  noise.connect(hp).connect(g).connect(target);
  noise.start(at, noiseOffset(0.05), 0.05);
}

function step(at: number): void {
  if (!currentTrack) return;
  const t = currentTrack;
  const bar = t.bars[barIndex];
  const i = stepIndex;

  // Pad on bar start
  if (i === 0) {
    const barDuration = (60 / t.bpm) * 4 * 0.98; // ≈ one bar of 4 beats
    playPadNote(hzFromSemi(t.rootHz, bar.chord), barDuration, at);
  }
  // Bass
  const b = bar.bass[i];
  if (b !== null && b !== undefined) {
    playBassNote(hzFromSemi(t.rootHz, b + (t.bassOctave ?? 0)), at);
  }
  // Lead
  const lead = bar.lead[i];
  if (lead !== null && lead !== undefined) {
    playLeadNote(hzFromSemi(t.rootHz, lead + (t.leadOctave ?? 0)), at);
  }
  // Drums: bar overrides → defaults
  const kick = bar.kick ?? t.defaultKick;
  const hat = bar.hat ?? t.defaultHat;
  const snare = bar.snare ?? t.defaultSnare;
  if (kick[i]) playKick(at);
  if (snare[i]) playSnare(at);
  if (hat[i]) playHat(at);

  stepIndex++;
  if (stepIndex >= 16) {
    stepIndex = 0;
    barIndex = (barIndex + 1) % t.bars.length;
  }
}

// Lookahead scheduling: notes are placed on the AudioContext clock ahead of
// real time, so timer jitter and main-thread work never bend the rhythm.
// Playing notes "now" audibly stuttered on TVs with 100 ms audio buffers
// (Sony Bravia), where the note-to-note spacing quantized to buffer edges.
const MUSIC_LOOKAHEAD_S = 0.3;
const MUSIC_TICK_MS = 80;
let nextStepAt = 0;

export function startMusic(theme: string): void {
  stopMusic();
  const c = ensure();
  if (!musicGain) return;
  const track = TRACKS[theme] ?? TRACKS.earth;
  currentTrack = track;
  stepIndex = 0;
  barIndex = 0;
  const stepS = (60 / track.bpm) / 4; // 16th notes
  nextStepAt = c.currentTime + 0.08;
  stepTimer = window.setInterval(() => {
    if (!currentTrack) return;
    // If the main thread was frozen past the lookahead window, jump the
    // grid forward instead of firing a burst of catch-up notes.
    while (nextStepAt < c.currentTime - 0.05) {
      nextStepAt += stepS;
      stepIndex++;
      if (stepIndex >= 16) {
        stepIndex = 0;
        barIndex = (barIndex + 1) % currentTrack.bars.length;
      }
    }
    while (nextStepAt < c.currentTime + MUSIC_LOOKAHEAD_S) {
      step(nextStepAt);
      nextStepAt += stepS;
    }
  }, MUSIC_TICK_MS);
}

export function stopMusic(): void {
  if (stepTimer !== null) {
    window.clearInterval(stepTimer);
    stepTimer = null;
  }
  currentTrack = null;
  stepIndex = 0;
  barIndex = 0;
}
