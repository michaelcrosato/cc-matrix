// Sound effects as data (floor 40). Names are played with audio.play(name).
const sq = (freq, freqEnd, decay, volume = 0.3, extra = {}) => ({ wave: 'square', duty: 0.25, freq, freqEnd, decay, volume, ...extra });
const noise = (freq, decay, volume = 0.3, extra = {}) => ({ wave: 'noise', freq, decay, volume, ...extra });
export const SFX_DEFS = {
  tick: { wave: 'square', duty: 0.5, freq: 900, decay: 0.03, volume: 0.15 }, confirm: sq(660, 990, 0.1, 0.25, { arp: [0, 7], arpRate: 0.05 }), cancel: sq(500, 300, 0.1, 0.2),
  step_grass: noise(700, 0.05, 0.12), step_path: noise(1400, 0.04, 0.12), step_sand: noise(500, 0.07, 0.12), step_wood: { wave: 'square', duty: 0.125, freq: 160, decay: 0.05, volume: 0.15 }, step_snow: noise(300, 0.09, 0.1), step_floor: { wave: 'triangle', freq: 220, decay: 0.05, volume: 0.15 },
  net_ready: { wave: 'triangle', freq: 300, freqEnd: 450, decay: 0.1, volume: 0.2 }, net_swing: noise(2500, 0.14, 0.25, { freq: 2500 }), net_hit: sq(400, 120, 0.1, 0.3),
  cast: noise(1800, 0.2, 0.25), bobber: { wave: 'sine', freq: 700, freqEnd: 300, decay: 0.12, volume: 0.3 }, nibble: { wave: 'sine', freq: 420, freqEnd: 380, decay: 0.07, volume: 0.25 }, bite: sq(180, 60, 0.25, 0.4, { layers: [noise(900, 0.2, 0.35)] }), splash: noise(900, 0.3, 0.3, { layers: [{ wave: 'sine', freq: 300, freqEnd: 120, decay: 0.2, volume: 0.25 }] }), reel: { wave: 'saw', freq: 220, freqEnd: 440, decay: 0.2, volume: 0.15 },
  dig: { wave: 'noise', freq: 400, decay: 0.12, volume: 0.35, layers: [{ wave: 'sine', freq: 140, freqEnd: 70, decay: 0.1, volume: 0.3 }] }, chop: { wave: 'square', duty: 0.125, freq: 220, freqEnd: 90, decay: 0.12, volume: 0.35, layers: [noise(600, 0.1, 0.3)] },
  shake: noise(1200, 0.25, 0.3, { layers: [{ wave: 'triangle', freq: 150, decay: 0.2, volume: 0.2, vibrato: { depth: 1, rate: 22 } }] }), water: noise(3000, 0.4, 0.15, { attack: 0.05 }), pick: sq(600, 900, 0.07, 0.25),
  pickup: sq(700, 1100, 0.08, 0.3, { arp: [0, 5], arpRate: 0.04 }), reveal: { wave: 'square', duty: 0.25, freq: 523, decay: 0.45, volume: 0.3, arp: [0, 4, 7, 12, 16], arpRate: 0.08, layers: [{ wave: 'triangle', freq: 262, decay: 0.5, volume: 0.25 }] },
  coin: { wave: 'square', duty: 0.5, freq: 988, decay: 0.28, volume: 0.28, arp: [0, 5], arpRate: 0.07 }, cash: { wave: 'square', duty: 0.25, freq: 1318, decay: 0.35, volume: 0.28, arp: [0, 5, 12], arpRate: 0.06 },
  door: { wave: 'triangle', freq: 200, freqEnd: 120, decay: 0.15, volume: 0.3, layers: [noise(500, 0.08, 0.2)] }, mail: sq(880, 1320, 0.12, 0.22, { arp: [0, 7, 12], arpRate: 0.08 }),
  bus: { wave: 'saw', freq: 60, freqEnd: 50, sustain: 0.5, decay: 0.2, volume: 0.25, vibrato: { depth: 0.5, rate: 8 } }, honk: { wave: 'square', duty: 0.5, freq: 320, freqEnd: 560, sustain: 0.1, decay: 0.2, volume: 0.35, layers: [{ wave: 'saw', freq: 160, freqEnd: 280, sustain: 0.1, decay: 0.2, volume: 0.25 }] },
  paddle: sq(900, 1400, 0.1, 0.25), smell: { wave: 'saw', freq: 90, freqEnd: 70, decay: 0.4, volume: 0.25, vibrato: { depth: 2, rate: 6 } }, firework: { wave: 'noise', freq: 600, decay: 0.6, volume: 0.35, layers: [{ wave: 'sine', freq: 90, freqEnd: 35, decay: 0.5, volume: 0.4 }, { wave: 'sine', freq: 1800, freqEnd: 900, decay: 0.3, delay: 0.1, volume: 0.15 }] },
  bell: { wave: 'sine', freq: 660, decay: 1.2, volume: 0.35, layers: [{ wave: 'sine', freq: 1320, decay: 0.8, volume: 0.15 }, { wave: 'sine', freq: 990, decay: 1.0, volume: 0.12 }] },
  thunder: noise(120, 1.2, 0.4, { layers: [{ wave: 'sine', freq: 60, freqEnd: 30, decay: 1.0, volume: 0.4 }] }), sting: sq(500, 100, 0.3, 0.35), wish: { wave: 'sine', freq: 1200, freqEnd: 2400, decay: 0.8, volume: 0.25, arp: [0, 7, 12, 19], arpRate: 0.1 },
  laugh: { wave: 'square', duty: 0.25, freq: 500, decay: 0.3, volume: 0.25, arp: [0, 3, 0, 3, 0], arpRate: 0.06 }, flush: noise(1200, 0.7, 0.25, { freqEnd: 400, attack: 0.1 }), stomp: sq(160, 70, 0.1, 0.35), snow: noise(2200, 0.15, 0.15), sparkle: { wave: 'sine', freq: 1568, decay: 0.25, volume: 0.2, arp: [0, 7, 12], arpRate: 0.05 },
  fanfare: { wave: 'square', duty: 0.25, freq: 392, decay: 0.7, volume: 0.28, arp: [0, 4, 7, 12, 7, 12, 16], arpRate: 0.1, layers: [{ wave: 'triangle', freq: 196, decay: 0.8, volume: 0.28 }] },
  slurp: { wave: 'sine', freq: 300, freqEnd: 700, decay: 0.3, volume: 0.25, vibrato: { depth: 1, rate: 14 } }, chew: noise(500, 0.1, 0.25),
};
export const AMB_DEFS = {
  river: { wave: 'noise', freq: 1600, sustain: 2.2, decay: 0.01, attack: 0.01, volume: 0.1 }, surf: { wave: 'noise', freq: 500, sustain: 2.6, decay: 0.02, attack: 0.6, volume: 0.12, vibrato: { depth: 2, rate: 0.4 } },
  rain: { wave: 'noise', freq: 4500, sustain: 1.6, decay: 0.01, attack: 0.01, volume: 0.12 }, wind: { wave: 'noise', freq: 300, sustain: 2.4, decay: 0.02, attack: 0.5, volume: 0.1, vibrato: { depth: 3, rate: 0.3 } },
  crickets: { wave: 'square', duty: 0.125, freq: 4200, sustain: 1.4, decay: 0.01, volume: 0.04, vibrato: { depth: 0.2, rate: 9 } }, city: { wave: 'noise', freq: 220, sustain: 2.0, decay: 0.01, attack: 0.3, volume: 0.1 }, neon: { wave: 'saw', freq: 120, sustain: 1.5, decay: 0.01, volume: 0.025, vibrato: { depth: 0.1, rate: 100 } },
  birds: { wave: 'sine', freq: 3000, freqEnd: 3600, sustain: 0.6, decay: 0.2, volume: 0.04, arp: [0, 4, 0], arpRate: 0.12 },
};
export function registerSfx(audio) { for (const [k, v] of Object.entries(SFX_DEFS)) audio.register(k, v); for (const [k, v] of Object.entries(AMB_DEFS)) audio.register('amb_' + k, v); }
