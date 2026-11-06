// Animalese-style gibberish: a syllable is a layered SoundDef (formant pair over a noise tick). Same word, same sound.
const VOWELS = [[760, 1220], [530, 1840], [300, 2290], [570, 840], [310, 870], [660, 1700]];
export const SYLLABLES = VOWELS.flatMap(([f1, f2], i) => [0, 1].map((c) => ({ wave: 'saw', freq: 190, freqEnd: 170, attack: 0.005, decay: c ? 0.07 : 0.09, volume: 0.3,
  layers: [{ wave: 'sine', freq: f1, decay: 0.08, volume: 0.18 }, { wave: 'sine', freq: f2, decay: 0.07, volume: 0.1 }, { wave: 'noise', freq: c ? 3000 : 6000, decay: c ? 0.02 : 0.012, volume: 0.08 }] })));
/** pitch is in semitones from the base syllable; rate in syllables per second */
export const VOICES = {
  player: { pitch: -2, rate: 8 }, vance: { pitch: -5, rate: 6 }, ansa: { pitch: 2, rate: 9 }, odile: { pitch: 0, rate: 8 }, tibor: { pitch: -4, rate: 7 }, bakr: { pitch: -3, rate: 10 },
  ines: { pitch: 1, rate: 10 }, dov: { pitch: -7, rate: 5 }, mags: { pitch: 4, rate: 12 }, harrow: { pitch: -3, rate: 6 }, pell: { pitch: 1, rate: 8 }, concord: { pitch: -3, rate: 9 }, harvest: { pitch: 0, rate: 10 }, radio: { pitch: 1, rate: 9 },
};
const hash = (w) => { let h = 7; for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) >>> 0; return h; };
/** the syllable plan for a line: [{ def, pitch, at }] so a test can read it without a speaker */
export function plan(who, text, secs = 3) {
  const v = VOICES[who] || VOICES.player; const words = String(text).toLowerCase().split(/\s+/).filter(Boolean); const out = [];
  let t = 0; const total = words.reduce((n, w) => n + Math.max(1, (w.match(/[aeiouy]/g) || []).length), 0);
  const gap = Math.max(0.07, Math.min(1 / v.rate, secs / Math.max(1, total + words.length * 0.5)));
  words.forEach((w, wi) => {
    const clean = w.replace(/[^a-z]/g, ''); const n = Math.max(1, (clean.match(/[aeiouy]/g) || []).length); let h = hash(clean);
    for (let s = 0; s < n; s++) {
      const rise = /\?/.test(w) ? s / n * 4 : /[.!]/.test(w) ? -s / n * 4 : 0;
      out.push({ idx: h % SYLLABLES.length, pitch: v.pitch + ((h >> 4) % 5) - 2 + rise, at: t }); t += gap; h = (h * 1103515245 + 12345) >>> 0;
    }
    t += /,/.test(w) ? gap * 2 : /[.?!]/.test(w) ? gap * 2.5 : gap * 0.5;
  });
  return out;
}
