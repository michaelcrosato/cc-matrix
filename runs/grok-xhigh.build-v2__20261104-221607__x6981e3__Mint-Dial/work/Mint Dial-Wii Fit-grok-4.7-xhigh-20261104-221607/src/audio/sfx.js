/** Short sounds, all data. Registered once at boot. */
export const SFX = {
  tick: { wave: 'square', freq: 880, decay: 0.04, volume: 0.35 },
  chime: { wave: 'triangle', freq: 660, freqEnd: 990, decay: 0.28, volume: 0.4 },
  warn: { wave: 'square', freq: 220, freqEnd: 140, decay: 0.2, volume: 0.4 },
  rep: { wave: 'square', freq: 440, decay: 0.05, volume: 0.3 },
  perfect: { wave: 'triangle', freq: 880, freqEnd: 1320, decay: 0.12, volume: 0.4 },
  good: { wave: 'triangle', freq: 660, decay: 0.1, volume: 0.35 },
  combo: { wave: 'square', freq: 520, freqEnd: 780, decay: 0.1, volume: 0.35 },
  bonk: { wave: 'triangle', freq: 180, freqEnd: 70, decay: 0.12, volume: 0.5 },
  thwap: { wave: 'noise', freq: 800, decay: 0.08, volume: 0.4 },
  whirr: { wave: 'sawtooth', freq: 140, freqEnd: 180, decay: 0.3, volume: 0.25 },
  splash: { wave: 'noise', freq: 400, decay: 0.3, volume: 0.45 },
  gust: { wave: 'noise', freq: 200, decay: 0.4, volume: 0.35 },
  squawk: { wave: 'square', freq: 900, freqEnd: 400, decay: 0.12, volume: 0.4 },
  drip: { wave: 'sine', freq: 1200, freqEnd: 600, decay: 0.1, volume: 0.3 },
  star: { wave: 'triangle', freq: 523, freqEnd: 1046, decay: 0.2, volume: 0.4 },
  move: { wave: 'square', freq: 330, decay: 0.03, volume: 0.25 },
  confirm: { wave: 'triangle', freq: 520, freqEnd: 780, decay: 0.08, volume: 0.35 },
  back: { wave: 'triangle', freq: 400, freqEnd: 220, decay: 0.08, volume: 0.3 },
  ow: { wave: 'square', freq: 160, freqEnd: 90, decay: 0.25, volume: 0.45 },
};

export function registerSfx(audio) {
  if (!audio?.register) return;
  for (const [name, def] of Object.entries(SFX)) audio.register(name, def);
}
