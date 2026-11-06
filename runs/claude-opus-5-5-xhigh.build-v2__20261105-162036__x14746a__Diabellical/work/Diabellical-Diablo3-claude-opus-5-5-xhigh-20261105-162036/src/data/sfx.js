// Every sound in the game, as data. No audio files anywhere.
const bell = (base, { vol = 0.34, decay = 1.8, bright = 1, cracked = false, detune = 1.004 } = {}) => {
  const partial = (ratio, v, d) => ({ wave: 'sine', freq: base * ratio, decay: decay * d, volume: vol * v });
  const layers = [partial(0.5, 0.6, 1.3), partial(1.2 * detune, 0.42 * bright, 0.8), partial(1.5, 0.3 * bright, 0.7), partial(2, 0.3 * bright, 0.55), partial(2.67, 0.16 * bright, 0.4), partial(3 * detune, 0.12 * bright, 0.3)];
  if (cracked) layers.push({ wave: 'sine', freq: base * 1.03, decay: decay * 0.9, volume: vol * 0.45 }, { wave: 'sine', freq: base * 1.47, decay: decay * 0.5, volume: vol * 0.3 }, { wave: 'noise', freq: 900, decay: 0.2, volume: vol * 0.3 });
  layers.push({ wave: 'noise', freq: 4000, decay: 0.03, volume: vol * 0.3 });
  return { wave: 'sine', freq: base, decay, volume: vol * 0.7, layers };
};
const thud = (freq, vol = 0.5, decay = 0.2, noise = 0.3) => ({ wave: 'sine', freq, freqEnd: freq * 0.35, decay, volume: vol, layers: [{ wave: 'noise', freq: 1600, decay: decay * 0.5, volume: noise }] });
const swish = (from, to, dur, vol = 0.22) => ({ wave: 'noise', freq: from, freqEnd: to, decay: dur, volume: vol });
const clink = (freq, vol = 0.22, decay = 0.08) => ({ wave: 'square', duty: 0.25, freq, decay, volume: vol });

export const SFX_DEFS = {
  // The bell is the game's signature.
  bell_small: bell(880, { vol: 0.26, decay: 0.9 }),
  bell_mid: bell(330, { vol: 0.3, decay: 1.4 }),
  bell_big: bell(147, { vol: 0.42, decay: 2.2 }),
  bell_loot: bell(659, { vol: 0.34, decay: 2.2, bright: 1.4 }),
  bell_cracked: bell(98, { vol: 0.42, decay: 2.8, cracked: true }),
  bell_true: bell(73.4, { vol: 0.48, decay: 3.6, bright: 0.8 }),
  // Combat.
  swing_heavy: swish(400, 2200, 0.13, 0.2),
  chain: { wave: 'noise', freq: 5000, freqEnd: 1800, decay: 0.16, volume: 0.15, layers: [clink(1400, 0.08, 0.06), { ...clink(1760, 0.07, 0.05), delay: 0.05 }, { ...clink(1320, 0.06, 0.05), delay: 0.1 }] },
  hit_flesh: thud(150, 0.4, 0.09, 0.28),
  hit_bone: { wave: 'square', duty: 0.125, freq: 620, freqEnd: 240, decay: 0.07, volume: 0.22, layers: [{ wave: 'noise', freq: 5000, decay: 0.04, volume: 0.2 }] },
  hit_stone: { wave: 'triangle', freq: 220, freqEnd: 90, decay: 0.1, volume: 0.4, layers: [{ wave: 'noise', freq: 2500, decay: 0.06, volume: 0.25 }] },
  hit_metal: { wave: 'square', duty: 0.25, freq: 1100, freqEnd: 900, decay: 0.09, volume: 0.15, layers: [{ wave: 'sine', freq: 2300, decay: 0.12, volume: 0.1 }] },
  hit_wood: { wave: 'triangle', freq: 300, freqEnd: 140, decay: 0.07, volume: 0.35, layers: [{ wave: 'noise', freq: 1200, decay: 0.04, volume: 0.2 }] },
  crit: { wave: 'square', duty: 0.25, freq: 1500, freqEnd: 2400, decay: 0.09, volume: 0.13, layers: [{ wave: 'noise', freq: 7000, decay: 0.05, volume: 0.14 }] },
  shatter: { wave: 'noise', freq: 3200, freqEnd: 700, decay: 0.2, volume: 0.32, layers: [{ wave: 'triangle', freq: 260, freqEnd: 90, decay: 0.12, volume: 0.3 }, { ...clink(980, 0.06, 0.05), delay: 0.04 }, { ...clink(760, 0.06, 0.05), delay: 0.09 }] },
  blast: thud(120, 0.5, 0.3, 0.4),
  stone_hit: thud(90, 0.5, 0.22, 0.4),
  coffin_slam: { wave: 'triangle', freq: 110, freqEnd: 45, decay: 0.3, volume: 0.55, layers: [{ wave: 'noise', freq: 1000, decay: 0.18, volume: 0.35 }, { wave: 'square', duty: 0.5, freq: 70, decay: 0.08, volume: 0.12 }] },
  whoosh: swish(300, 3000, 0.22, 0.2),
  whip: swish(5000, 900, 0.1, 0.25),
  dodge: { ...swish(900, 2400, 0.18, 0.2), layers: [{ wave: 'triangle', freq: 140, freqEnd: 90, decay: 0.08, volume: 0.22, delay: 0.18 }] },
  charge: { wave: 'saw', freq: 90, freqEnd: 220, decay: 0.3, volume: 0.14, layers: [swish(500, 3000, 0.3, 0.2)] },
  // Skills.
  spark: { wave: 'square', duty: 0.125, freq: 1400, freqEnd: 420, decay: 0.1, volume: 0.13, layers: [{ wave: 'noise', freq: 6000, decay: 0.06, volume: 0.1 }] },
  flare: { wave: 'noise', freq: 7000, freqEnd: 2200, decay: 0.32, volume: 0.28, layers: [{ wave: 'sine', freq: 520, freqEnd: 1700, decay: 0.3, volume: 0.14 }] },
  lob: swish(600, 1400, 0.2, 0.14),
  dig: { wave: 'noise', freq: 900, freqEnd: 300, decay: 0.2, volume: 0.3, layers: [{ wave: 'triangle', freq: 130, decay: 0.1, volume: 0.25 }] },
  blink: { wave: 'sine', freq: 300, freqEnd: 1800, decay: 0.16, volume: 0.2, layers: [{ wave: 'noise', freq: 8000, decay: 0.08, volume: 0.1 }] },
  snuff: { wave: 'noise', freq: 2500, freqEnd: 200, decay: 0.4, volume: 0.3, layers: [{ wave: 'sine', freq: 200, freqEnd: 60, decay: 0.3, volume: 0.3 }] },
  beacon: { wave: 'saw', freq: 110, freqEnd: 440, decay: 0.6, volume: 0.12, layers: [{ wave: 'noise', freq: 1800, decay: 0.5, volume: 0.15 }, { wave: 'sine', freq: 440, decay: 0.8, volume: 0.12, delay: 0.3 }] },
  comet: { wave: 'noise', freq: 1200, freqEnd: 5000, decay: 0.42, volume: 0.14 },
  raise: { wave: 'triangle', freq: 90, freqEnd: 260, decay: 0.35, volume: 0.28, vibrato: { depth: 2, rate: 12 }, layers: [{ wave: 'noise', freq: 700, decay: 0.3, volume: 0.15 }] },
  rise: { wave: 'noise', freq: 500, freqEnd: 1100, decay: 0.28, volume: 0.13 },
  exhume: { wave: 'triangle', freq: 170, freqEnd: 50, decay: 0.3, volume: 0.45, layers: [{ wave: 'noise', freq: 1400, decay: 0.2, volume: 0.28 }] },
  curse: { wave: 'saw', freq: 220, freqEnd: 110, decay: 0.5, volume: 0.1, vibrato: { depth: 1, rate: 7 }, layers: [{ wave: 'sine', freq: 233, freqEnd: 117, decay: 0.5, volume: 0.14 }] },
  bone_hit: { wave: 'square', duty: 0.125, freq: 800, freqEnd: 300, decay: 0.08, volume: 0.17, layers: [{ wave: 'noise', freq: 4000, decay: 0.05, volume: 0.16 }] },
  crossbow: { wave: 'square', duty: 0.25, freq: 520, freqEnd: 260, decay: 0.05, volume: 0.16, layers: [swish(4000, 1200, 0.1, 0.12)] },
  hymn: { wave: 'sine', freq: 293.7, decay: 1, volume: 0.18, vibrato: { depth: 0.2, rate: 5 }, layers: [{ wave: 'sine', freq: 440, decay: 1, volume: 0.13 }, { wave: 'sine', freq: 587, decay: 1, volume: 0.08, delay: 0.1 }] },
  fire_start: { wave: 'noise', freq: 1200, freqEnd: 3200, decay: 0.3, volume: 0.18 },
  // Hazards and monsters.
  telegraph: { wave: 'square', duty: 0.5, freq: 330, freqEnd: 247, decay: 0.15, volume: 0.09 },
  telegraph_big: { wave: 'saw', freq: 196, decay: 0.7, volume: 0.12, vibrato: { depth: 0.6, rate: 9 }, layers: [{ wave: 'saw', freq: 207, decay: 0.7, volume: 0.08 }] },
  wave: { wave: 'sine', freq: 180, freqEnd: 90, decay: 0.5, volume: 0.28, layers: [swish(400, 1200, 0.4, 0.12)] },
  sour_note: { wave: 'triangle', freq: 466, freqEnd: 440, decay: 0.4, volume: 0.16, vibrato: { depth: 0.5, rate: 6 }, layers: [{ wave: 'triangle', freq: 494, decay: 0.4, volume: 0.1 }] },
  coins: { wave: 'square', duty: 0.25, freq: 1800, decay: 0.05, volume: 0.1, layers: [{ ...clink(2300, 0.09, 0.05), delay: 0.04 }, { ...clink(1900, 0.09, 0.05), delay: 0.09 }, { ...clink(2500, 0.08, 0.05), delay: 0.13 }, { ...clink(2100, 0.08, 0.05), delay: 0.19 }] },
  burst_wet: { wave: 'noise', freq: 700, freqEnd: 200, decay: 0.32, volume: 0.42, layers: [{ wave: 'sine', freq: 120, freqEnd: 40, decay: 0.25, volume: 0.4 }] },
  swell: { wave: 'sine', freq: 80, freqEnd: 240, decay: 0.9, volume: 0.25, vibrato: { depth: 1, rate: 14 } },
  stone_crack: { wave: 'noise', freq: 1800, freqEnd: 500, decay: 0.2, volume: 0.28, layers: [{ wave: 'square', duty: 0.125, freq: 120, decay: 0.1, volume: 0.1 }] },
  roar: { wave: 'saw', freq: 90, freqEnd: 60, decay: 0.8, volume: 0.22, vibrato: { depth: 3, rate: 18 }, crush: 8, layers: [{ wave: 'noise', freq: 400, decay: 0.7, volume: 0.2 }] },
  wing: swish(300, 900, 0.14, 0.15),
  jackpot: { wave: 'square', duty: 0.25, freq: 660, decay: 0.5, volume: 0.13, arp: [0, 4, 7, 12, 16, 19], arpRate: 0.06, layers: [{ wave: 'sine', freq: 1320, decay: 0.5, volume: 0.1 }] },
  plate_escape: { wave: 'square', duty: 0.25, freq: 900, freqEnd: 300, decay: 0.3, volume: 0.12, arp: [0, -3, -7], arpRate: 0.08 },
  boss_death: { wave: 'saw', freq: 200, freqEnd: 30, decay: 1.5, volume: 0.2, crush: 6, layers: [{ wave: 'noise', freq: 600, freqEnd: 100, decay: 1.2, volume: 0.3 }, { wave: 'sine', freq: 100, freqEnd: 30, decay: 1.5, volume: 0.3 }] },
  // Loot and pickups.
  gold: { wave: 'square', duty: 0.25, freq: 1760, decay: 0.05, volume: 0.09, layers: [{ ...clink(2640, 0.08, 0.06), delay: 0.04 }] },
  gold_drop: { ...clink(2100, 0.07, 0.04), layers: [{ ...clink(1700, 0.06, 0.04), delay: 0.05 }] },
  tallow: { wave: 'sine', freq: 500, freqEnd: 800, decay: 0.18, volume: 0.2, layers: [{ wave: 'sine', freq: 750, freqEnd: 1100, decay: 0.2, volume: 0.1, delay: 0.05 }] },
  tallow_drop: { wave: 'sine', freq: 300, freqEnd: 150, decay: 0.08, volume: 0.22 },
  drop_item: { wave: 'triangle', freq: 500, freqEnd: 300, decay: 0.1, volume: 0.24 },
  drop_rare: { wave: 'triangle', freq: 880, decay: 0.3, volume: 0.18, arp: [0, 7, 12], arpRate: 0.06 },
  pickup: { wave: 'triangle', freq: 660, freqEnd: 880, decay: 0.08, volume: 0.2 },
  potion: { wave: 'sine', freq: 300, freqEnd: 700, decay: 0.28, volume: 0.22, vibrato: { depth: 1, rate: 22 }, layers: [{ wave: 'sine', freq: 900, decay: 0.2, volume: 0.1, delay: 0.1 }] },
  levelup: { wave: 'square', duty: 0.25, freq: 294, decay: 0.7, volume: 0.14, arp: [0, 7, 12, 15, 19, 24], arpRate: 0.09, layers: [bell(587, { vol: 0.2, decay: 1.3 })] },
  quest: { wave: 'triangle', freq: 440, decay: 0.5, volume: 0.2, arp: [0, 5, 7, 12], arpRate: 0.1 },
  shrine: { wave: 'sine', freq: 440, decay: 1, volume: 0.18, layers: [{ wave: 'sine', freq: 660, decay: 1, volume: 0.12, delay: 0.12 }, { wave: 'sine', freq: 880, decay: 1, volume: 0.1, delay: 0.24 }] },
  chest: { wave: 'triangle', freq: 130, freqEnd: 200, decay: 0.2, volume: 0.3, layers: [{ ...clink(900, 0.07, 0.3), delay: 0.14, arp: [0, 4, 7], arpRate: 0.07 }] },
  lever: { wave: 'square', duty: 0.5, freq: 200, freqEnd: 100, decay: 0.09, volume: 0.2, layers: [{ wave: 'noise', freq: 900, decay: 0.2, volume: 0.15, delay: 0.05 }] },
  gate: { wave: 'sine', freq: 392, decay: 0.8, volume: 0.15, layers: [{ wave: 'sine', freq: 587, decay: 0.8, volume: 0.1, delay: 0.08 }] },
  portcullis: { wave: 'noise', freq: 1000, freqEnd: 500, decay: 0.7, volume: 0.22, layers: [{ wave: 'square', duty: 0.125, freq: 60, decay: 0.7, volume: 0.1 }] },
  spikes: { wave: 'noise', freq: 4000, freqEnd: 1500, decay: 0.09, volume: 0.25, layers: [{ wave: 'square', duty: 0.125, freq: 400, decay: 0.05, volume: 0.1 }] },
  cart: { wave: 'noise', freq: 300, decay: 0.3, volume: 0.2 },
  salvage: { wave: 'noise', freq: 3000, freqEnd: 900, decay: 0.2, volume: 0.25, layers: [{ wave: 'triangle', freq: 180, decay: 0.15, volume: 0.25 }] },
  forge: { wave: 'square', duty: 0.25, freq: 1200, decay: 0.2, volume: 0.13, layers: [{ wave: 'sine', freq: 2400, decay: 0.35, volume: 0.1 }, { wave: 'noise', freq: 2500, decay: 0.08, volume: 0.2 }] },
  socket: { wave: 'sine', freq: 1100, decay: 0.25, volume: 0.18, layers: [{ wave: 'sine', freq: 1650, decay: 0.25, volume: 0.1 }, { ...clink(2100, 0.06, 0.04) }] },
  hurt_hero: { wave: 'square', duty: 0.25, freq: 240, freqEnd: 120, decay: 0.12, volume: 0.15, layers: [{ wave: 'noise', freq: 1000, decay: 0.08, volume: 0.15 }] },
  hero_death: { wave: 'triangle', freq: 220, freqEnd: 55, decay: 1, volume: 0.28, layers: [bell(98, { vol: 0.24, decay: 2, cracked: true })] },
  revive: { wave: 'sine', freq: 330, freqEnd: 660, decay: 0.4, volume: 0.2, layers: [bell(660, { vol: 0.14, decay: 0.8 })] },
  // Interface.
  ui_move: { wave: 'square', duty: 0.25, freq: 660, decay: 0.03, volume: 0.07 },
  ui_confirm: { wave: 'square', duty: 0.25, freq: 660, decay: 0.09, volume: 0.1, arp: [0, 7], arpRate: 0.04 },
  ui_back: { wave: 'square', duty: 0.25, freq: 494, freqEnd: 330, decay: 0.08, volume: 0.09 },
  ui_error: { wave: 'square', duty: 0.5, freq: 150, decay: 0.14, volume: 0.1, layers: [{ wave: 'square', duty: 0.5, freq: 159, decay: 0.14, volume: 0.08 }] },
  ui_tab: { wave: 'triangle', freq: 523, decay: 0.05, volume: 0.15 },
  ui_equip: { wave: 'noise', freq: 1600, decay: 0.05, volume: 0.15, layers: [{ wave: 'triangle', freq: 300, freqEnd: 500, decay: 0.08, volume: 0.25 }] },
  // Footfalls, by floor.
  step_stone: { wave: 'noise', freq: 1400, decay: 0.03, volume: 0.05 },
  step_mud: { wave: 'noise', freq: 500, freqEnd: 250, decay: 0.05, volume: 0.07 },
  step_wood: { wave: 'triangle', freq: 170, decay: 0.03, volume: 0.1 },
  // Ambience loops.
  rain_loop: { wave: 'noise', freq: 7000, sustain: 2, decay: 0.01, attack: 0.01, volume: 0.06 },
  fire_loop: { wave: 'noise', freq: 900, sustain: 1.5, decay: 0.01, attack: 0.01, volume: 0.06 },
  wind_loop: { wave: 'noise', freq: 300, freqEnd: 700, sustain: 3, decay: 0.01, attack: 0.01, volume: 0.06 },
  cart_loop: { wave: 'noise', freq: 180, sustain: 0.5, decay: 0.01, attack: 0.01, volume: 0.07 },
};

const VOICES = {
  peat: { f: 90, w: 'saw', noise: 0.15 }, bone: { f: 520, w: 'square', noise: 0.25, clack: true }, skull: { f: 620, w: 'triangle', noise: 0.05, vib: true }, big: { f: 70, w: 'saw', noise: 0.2 },
  crawl: { f: 900, w: 'square', noise: 0.25 }, bloat: { f: 110, w: 'triangle', noise: 0.15, vib: true }, imp: { f: 480, w: 'saw', noise: 0.2 }, moan: { f: 170, w: 'triangle', noise: 0.08, vib: true }, beast: { f: 75, w: 'saw', noise: 0.3 }, plate: { f: 1200, w: 'square', noise: 0.08 },
  bursar: { f: 80, w: 'saw', noise: 0.15 }, ambrose: { f: 180, w: 'triangle', noise: 0.06 }, malison: { f: 58, w: 'saw', noise: 0.2, vib: true },
};
for (const [id, v] of Object.entries(VOICES)) {
  const base = (freq, freqEnd, decay, volume) => ({ wave: v.w, duty: 0.25, freq, freqEnd, decay, volume, ...(v.vib ? { vibrato: { depth: 1, rate: 10 } } : {}), layers: [{ wave: 'noise', freq: freq * 8, decay: decay * 0.5, volume: v.noise }] });
  SFX_DEFS[`mon_${id}_wake`] = base(v.f, v.f * 1.4, 0.2, 0.11);
  SFX_DEFS[`mon_${id}_attack`] = base(v.f * 1.5, v.f, 0.13, 0.13);
  SFX_DEFS[`mon_${id}_hurt`] = base(v.f * 1.3, v.f * 1.8, 0.08, 0.09);
  SFX_DEFS[`mon_${id}_death`] = base(v.f * 1.2, v.f * 0.4, 0.3, 0.15);
}

// Skill-specific hero grunts.
SFX_DEFS.grunt_low = { wave: 'saw', freq: 120, freqEnd: 90, decay: 0.09, volume: 0.1 };
SFX_DEFS.grunt_mid = { wave: 'saw', freq: 190, freqEnd: 140, decay: 0.08, volume: 0.08 };

export const SFX_NAMES = Object.keys(SFX_DEFS);
