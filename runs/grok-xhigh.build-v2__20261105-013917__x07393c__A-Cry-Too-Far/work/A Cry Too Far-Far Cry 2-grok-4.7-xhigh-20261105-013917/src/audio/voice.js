/** Animalese. A word always picks the same syllables. */

export const SYLLABLES = [
  { wave: 'saw', freq: 190, freqEnd: 170, attack: 0.005, decay: 0.09, volume: 0.3, layers: [{ wave: 'sine', freq: 760, decay: 0.08, volume: 0.18 }, { wave: 'sine', freq: 1220, decay: 0.07, volume: 0.1 }, { wave: 'noise', freq: 6000, decay: 0.012, volume: 0.08 }] },
  { wave: 'saw', freq: 210, freqEnd: 240, attack: 0.005, decay: 0.08, volume: 0.28, layers: [{ wave: 'sine', freq: 820, decay: 0.07, volume: 0.16 }, { wave: 'sine', freq: 1400, decay: 0.06, volume: 0.08 }] },
  { wave: 'triangle', freq: 160, freqEnd: 150, attack: 0.004, decay: 0.1, volume: 0.3, layers: [{ wave: 'sine', freq: 640, decay: 0.08, volume: 0.16 }, { wave: 'noise', freq: 4000, decay: 0.01, volume: 0.06 }] },
  { wave: 'saw', freq: 240, freqEnd: 200, attack: 0.005, decay: 0.07, volume: 0.26, layers: [{ wave: 'sine', freq: 900, decay: 0.06, volume: 0.14 }, { wave: 'sine', freq: 1500, decay: 0.05, volume: 0.08 }] },
  { wave: 'square', freq: 170, freqEnd: 190, attack: 0.004, decay: 0.08, volume: 0.2, layers: [{ wave: 'sine', freq: 700, decay: 0.07, volume: 0.15 }] },
  { wave: 'saw', freq: 130, freqEnd: 120, attack: 0.006, decay: 0.11, volume: 0.32, layers: [{ wave: 'sine', freq: 520, decay: 0.09, volume: 0.16 }, { wave: 'noise', freq: 3000, decay: 0.015, volume: 0.07 }] },
  { wave: 'triangle', freq: 280, freqEnd: 260, attack: 0.004, decay: 0.07, volume: 0.24, layers: [{ wave: 'sine', freq: 1100, decay: 0.06, volume: 0.12 }] },
  { wave: 'saw', freq: 200, freqEnd: 230, attack: 0.005, decay: 0.08, volume: 0.27, layers: [{ wave: 'sine', freq: 860, decay: 0.07, volume: 0.14 }, { wave: 'sine', freq: 1600, decay: 0.05, volume: 0.07 }] },
  { wave: 'square', freq: 150, freqEnd: 140, attack: 0.005, decay: 0.09, volume: 0.22, layers: [{ wave: 'sine', freq: 600, decay: 0.08, volume: 0.14 }, { wave: 'noise', freq: 5000, decay: 0.01, volume: 0.05 }] },
  { wave: 'saw', freq: 260, freqEnd: 220, attack: 0.004, decay: 0.06, volume: 0.25, layers: [{ wave: 'sine', freq: 980, decay: 0.05, volume: 0.12 }] },
  { wave: 'triangle', freq: 180, freqEnd: 200, attack: 0.005, decay: 0.1, volume: 0.26, layers: [{ wave: 'sine', freq: 740, decay: 0.08, volume: 0.15 }, { wave: 'sine', freq: 1300, decay: 0.06, volume: 0.08 }] },
  { wave: 'saw', freq: 220, freqEnd: 180, attack: 0.005, decay: 0.08, volume: 0.28, layers: [{ wave: 'sine', freq: 880, decay: 0.07, volume: 0.13 }, { wave: 'noise', freq: 4500, decay: 0.012, volume: 0.06 }] },
];

export const VOICES = {
  bakr: { pitch: 0.85, rate: 0.07 },
  odile: { pitch: 1.15, rate: 0.06 },
  vance: { pitch: 0.8, rate: 0.075 },
  ansa: { pitch: 1.2, rate: 0.065 },
  tibor: { pitch: 0.95, rate: 0.07 },
  ines: { pitch: 1.05, rate: 0.06 },
  dov: { pitch: 0.75, rate: 0.08 },
  mags: { pitch: 1.1, rate: 0.055 },
  harrow: { pitch: 0.7, rate: 0.09 },
  soldier: { pitch: 0.9, rate: 0.06 },
};

function hashWord(word) {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619);
  return h >>> 0;
}

function vowels(word) {
  const n = (word.match(/[AEIOU]/g) || []).length;
  return Math.max(1, Math.min(4, n || 1));
}

export function say(audio, character, text, volume = 1) {
  const who = VOICES[character] || VOICES.soldier;
  const words = String(text || '').toUpperCase().split(/\s+/).filter(Boolean);
  words.forEach((word, wi) => {
    const n = vowels(word);
    const h = hashWord(word);
    for (let i = 0; i < n; i++) {
      const syl = SYLLABLES[(h + i * 3) % SYLLABLES.length];
      const rise = word.endsWith('?') ? 1.12 : word.endsWith('.') ? 0.9 : 1;
      audio.play(syl, { pitch: who.pitch * rise * (1 + (i - n / 2) * 0.04), volume: 0.35 * volume, delay: (wi * 3 + i) * who.rate });
    }
  });
}
