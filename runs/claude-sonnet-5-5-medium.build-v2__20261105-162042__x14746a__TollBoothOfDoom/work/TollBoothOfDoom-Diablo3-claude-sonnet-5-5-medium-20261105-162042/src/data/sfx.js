// Sound effects as SoundDef data. Everything is synthesised; no audio files.
const sine = (freq, decay, volume = 0.3, extra = {}) => ({ wave: 'sine', freq, decay, volume, ...extra });
const noise = (freq, decay, volume = 0.3, extra = {}) => ({ wave: 'noise', freq, decay, volume, ...extra });
const sq = (freq, decay, volume = 0.2, extra = {}) => ({ wave: 'square', freq, decay, volume, duty: 0.25, ...extra });
const tri = (freq, decay, volume = 0.3, extra = {}) => ({ wave: 'triangle', freq, decay, volume, ...extra });

/** A bell: sine partials at 0.5, 1, 1.2, 1.5, 2, 2.67, 3 times the base, long decays, slight detune. */
export const bell = (base, decay = 2.4, volume = 0.5, cracked = false) => {
  const parts = [0.5, 1, 1.2, 1.5, 2, 2.67, 3];
  const amps = [0.9, 1, 0.5, 0.35, 0.4, 0.2, 0.15];
  const layers = parts.map((p, i) => sine(base * p * (1 + (i % 2 ? 0.002 : -0.002)), decay * (1 - i * 0.08), volume * amps[i] * 0.55, { attack: 0.002 }));
  if (cracked) layers.push(sine(base * 1.012, decay * 0.9, volume * 0.5, { vibrato: { depth: 0.3, rate: 7 } }));
  return { ...layers[1], layers: [layers[0], ...layers.slice(2)] };
};

export const SFX = {
  // combat
  swing: { ...noise(900, 0.12, 0.25, { freqEnd: 300 }), layers: [sine(220, 0.1, 0.12, { freqEnd: 120 })] },
  swing_heavy: { ...noise(600, 0.2, 0.3, { freqEnd: 150 }), layers: [sine(150, 0.2, 0.2, { freqEnd: 70 })] },
  whoosh: noise(1400, 0.22, 0.2, { freqEnd: 400, sweepTime: 0.2 }),
  zap: { ...sq(1400, 0.12, 0.18, { freqEnd: 300 }), layers: [noise(3000, 0.06, 0.08)] },
  flare: { ...noise(2500, 0.4, 0.25, { freqEnd: 600 }), layers: [sine(900, 0.4, 0.15, { freqEnd: 200 })] },
  smash: { ...noise(1500, 0.18, 0.3, { freqEnd: 200 }), layers: [sine(300, 0.15, 0.2, { freqEnd: 90 })] },
  bone: { ...noise(3500, 0.08, 0.25), layers: [sq(700, 0.08, 0.12, { freqEnd: 400 })] },
  bone_burst: { ...noise(2600, 0.2, 0.3), layers: [sq(500, 0.15, 0.15, { freqEnd: 120 }), noise(5000, 0.1, 0.1)] },
  raise: { ...sine(90, 0.5, 0.3, { freqEnd: 180 }), layers: [noise(500, 0.4, 0.15, { freqEnd: 1500 })] },
  coffin: { ...sine(70, 0.5, 0.5, { freqEnd: 40 }), layers: [noise(800, 0.3, 0.3, { freqEnd: 100 }), sq(120, 0.25, 0.2, { freqEnd: 50 })] },
  curse: { ...tri(260, 0.6, 0.25, { freqEnd: 90, vibrato: { depth: 1, rate: 8 } }), layers: [noise(400, 0.5, 0.1)] },
  sink: { ...sine(300, 0.3, 0.3, { freqEnd: 60 }), layers: [noise(700, 0.3, 0.15, { freqEnd: 100 })] },
  blink: { ...sine(900, 0.12, 0.2, { freqEnd: 1800 }), layers: [noise(4000, 0.08, 0.08)] },
  boom: { ...noise(400, 0.5, 0.45, { freqEnd: 80 }), layers: [sine(100, 0.5, 0.45, { freqEnd: 40 })] },
  slam: { ...noise(500, 0.35, 0.4, { freqEnd: 80 }), layers: [sine(90, 0.35, 0.45, { freqEnd: 40 }), sq(70, 0.3, 0.15, { freqEnd: 40 })] },
  burst: { ...noise(900, 0.3, 0.35, { freqEnd: 150 }), layers: [sine(140, 0.25, 0.25, { freqEnd: 50 })] },
  roar: { ...sq(90, 0.8, 0.28, { freqEnd: 60, vibrato: { depth: 1.5, rate: 14 }, crush: 8 }), layers: [noise(300, 0.7, 0.2)] },
  telegraph: { ...sq(520, 0.35, 0.1, { freqEnd: 780, arp: [0, 7], arpRate: 0.08 }) },
  sour_note: { ...tri(330, 0.5, 0.2, { freqEnd: 310, vibrato: { depth: 0.6, rate: 9 } }), layers: [sq(349, 0.4, 0.06)] },
  wind_up: sine(160, 0.3, 0.2, { freqEnd: 320 }),
  shatter: { ...noise(3000, 0.28, 0.3, { freqEnd: 700 }), layers: [sq(900, 0.1, 0.08, { freqEnd: 300 }), noise(1200, 0.25, 0.15)] },
  chunk: noise(1800, 0.06, 0.12),
  hit_flesh: { ...noise(700, 0.1, 0.3, { freqEnd: 200 }), layers: [sine(160, 0.1, 0.25, { freqEnd: 80 })] },
  hit_bone: { ...noise(2200, 0.09, 0.28), layers: [sq(600, 0.07, 0.12, { freqEnd: 300 })] },
  hit_stone: { ...noise(1200, 0.1, 0.3, { freqEnd: 400 }), layers: [sine(240, 0.1, 0.2, { freqEnd: 120 })] },
  hit_wood: { ...noise(900, 0.1, 0.25, { freqEnd: 300 }), layers: [tri(200, 0.1, 0.15, { freqEnd: 100 })] },
  crit: { ...sq(1600, 0.12, 0.15, { arp: [0, 12], arpRate: 0.03 }), layers: [noise(5000, 0.08, 0.1)] },
  hurt: { ...sine(200, 0.25, 0.35, { freqEnd: 80 }), layers: [noise(500, 0.2, 0.2)] },
  hero_death: { ...tri(300, 0.9, 0.35, { freqEnd: 50 }), layers: [noise(300, 0.8, 0.15, { freqEnd: 60 })] },
  revive: { ...tri(220, 0.5, 0.25, { arp: [0, 4, 7, 12], arpRate: 0.08 }) },
  mattack: noise(1100, 0.12, 0.12, { freqEnd: 500 }),
  wake_bone: { ...sq(420, 0.15, 0.1, { arp: [0, 3, 0], arpRate: 0.05 }), layers: [noise(2500, 0.1, 0.08)] },
  wake_low: { ...sq(110, 0.3, 0.12, { freqEnd: 90, crush: 8 }), layers: [noise(300, 0.25, 0.06)] },
  death_flesh: { ...noise(500, 0.35, 0.3, { freqEnd: 80 }), layers: [sine(120, 0.3, 0.3, { freqEnd: 50 })] },
  death_bone: { ...noise(3000, 0.35, 0.28), layers: [sq(500, 0.25, 0.1, { freqEnd: 100 }), noise(1500, 0.3, 0.2)] },
  death_big: { ...noise(350, 0.7, 0.45, { freqEnd: 60 }), layers: [sine(80, 0.7, 0.45, { freqEnd: 35 }), sq(100, 0.5, 0.15, { freqEnd: 40 })] },
  // loot and economy
  coin: { ...sq(1400, 0.15, 0.14, { arp: [0, 7], arpRate: 0.05 }) },
  coin_spray: { ...noise(6000, 0.25, 0.12), layers: [sq(1600, 0.2, 0.08, { arp: [0, 5, 9], arpRate: 0.04 })] },
  plop: sine(380, 0.12, 0.25, { freqEnd: 160 }),
  drop: sine(500, 0.12, 0.2, { freqEnd: 250 }),
  drop_good: { ...tri(700, 0.4, 0.25, { arp: [0, 7, 12], arpRate: 0.06 }) },
  pickup: { ...sq(900, 0.1, 0.12, { arp: [0, 4], arpRate: 0.04 }) },
  chest: { ...tri(500, 0.5, 0.3, { arp: [0, 4, 7, 12, 16], arpRate: 0.06 }), layers: [noise(2000, 0.15, 0.1)] },
  equip: { ...sq(600, 0.12, 0.15, { arp: [0, 5, 9], arpRate: 0.04 }), layers: [noise(1800, 0.06, 0.1)] },
  salvage: { ...noise(1800, 0.22, 0.25, { freqEnd: 300 }), layers: [sine(200, 0.2, 0.2, { freqEnd: 70 })] },
  forge: { ...noise(900, 0.25, 0.3, { freqEnd: 200 }), layers: [bell(740, 1.2, 0.3)] },
  potion: { ...sine(300, 0.4, 0.3, { freqEnd: 700, vibrato: { depth: 1, rate: 12 } }), layers: [noise(1500, 0.3, 0.1)] },
  dodge: { ...noise(1000, 0.2, 0.22, { freqEnd: 250 }), layers: [sine(300, 0.15, 0.1, { freqEnd: 120 })] },
  levelup: { ...tri(440, 1.0, 0.3, { arp: [0, 4, 7, 12, 16, 19], arpRate: 0.09 }), layers: [bell(523, 1.8, 0.4)] },
  requiem: { ...tri(220, 0.8, 0.25, { arp: [0, 3, 7, 12], arpRate: 0.1 }), layers: [bell(294, 1.5, 0.3)] },
  lever: { ...noise(600, 0.3, 0.3, { freqEnd: 150 }), layers: [sq(180, 0.25, 0.18, { freqEnd: 90 })] },
  // bells
  bell_small: bell(880, 1.6, 0.4),
  bell_mid: bell(440, 2.4, 0.5),
  bell_bright: bell(659, 2.6, 0.55),
  bell_big: { ...bell(196, 3.2, 0.75), layers: [...bell(196, 3.2, 0.75).layers, noise(250, 0.3, 0.3, { freqEnd: 60 })] },
  bell_clemency: bell(98, 5, 0.9),
  bell_cracked: bell(98, 4.5, 0.85, true),
  // ui
  ui_move: sq(880, 0.04, 0.1),
  ui_ok: { ...sq(660, 0.08, 0.14, { arp: [0, 7], arpRate: 0.04 }) },
  ui_back: sq(440, 0.08, 0.12, { freqEnd: 330 }),
  ui_tab: sq(740, 0.05, 0.1, { freqEnd: 900 }),
  error: sq(150, 0.18, 0.18, { freqEnd: 110, crush: 6 }),
  // ambience loops
  amb_rain: noise(5200, 1.0, 0.1, { attack: 0.1, sustain: 1 }),
  amb_fire: noise(900, 0.5, 0.06, { attack: 0.05, sustain: 0.5, vibrato: { depth: 3, rate: 9 } }),
  amb_wind: noise(1400, 1.2, 0.08, { attack: 0.3, sustain: 1.0, vibrato: { depth: 5, rate: 0.5 } }),
  step_stone: noise(900, 0.05, 0.06), step_mud: noise(400, 0.07, 0.06), step_wood: noise(1200, 0.05, 0.05),
};
export const SFX_NAMES = Object.keys(SFX);
