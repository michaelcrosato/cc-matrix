// Animalese/Simlish-style gibberish: each letter triggers a short syllable made of stacked sine harmonics shaped by vowel formants.
export function vowel(f0, f1, f2, f3, dur = 0.09, noise = 0) {
  const amp = (h) => { const f = f0 * h, g = (c, w, a) => a * Math.exp(-((f - c) ** 2) / (2 * w * w)); return g(f1, 90, 1) + g(f2, 120, 0.6) + g(f3, 180, 0.25); };
  const layers = [];
  for (let h = 2; h * f0 < 4000; h++) { const v = amp(h) * 0.3; if (v > 0.01) layers.push({ wave: 'sine', freq: f0 * h, attack: 0.008, sustain: dur * 0.55, decay: dur * 0.45, volume: v }); }
  if (noise) layers.push({ wave: 'noise', freq: 9000, attack: 0.001, sustain: 0.012, decay: 0.02, volume: noise });
  return { wave: 'sine', freq: f0, attack: 0.008, sustain: dur * 0.55, decay: dur * 0.45, volume: Math.max(0.06, amp(1) * 0.3), vibrato: { depth: 0.2, rate: 18 }, layers };
}
const FORM = { a: [800, 1200, 2500], e: [500, 1800, 2500], i: [320, 2200, 3000], o: [500, 900, 2400], u: [320, 800, 2300] };
const SYL = { a: ['a'], e: ['e'], i: ['i'], o: ['o'], u: ['u'], b: ['o', 0.05], d: ['a', 0.1], f: ['i', 0.14], s: ['e', 0.18], m: ['u', 0.0] };
const LETTER = {}; for (const [k, v] of Object.entries({ a: 'a', e: 'e', i: 'i', o: 'o', u: 'u', b: 'b', p: 'b', d: 'd', t: 'd', g: 'd', k: 'd', c: 'd', f: 'f', v: 'f', s: 's', z: 's', x: 's', m: 'm', n: 'm', l: 'm', r: 'm', h: 's', w: 'u', y: 'i', j: 'e', q: 'o' })) LETTER[k] = v;
export const ARCHETYPES = ['warm', 'bright', 'gruff', 'squeak', 'flute', 'nasal'];
const ARCH = { warm: { f0: 150, k: 1 }, bright: { f0: 230, k: 1.1 }, gruff: { f0: 95, k: 0.9 }, squeak: { f0: 330, k: 1.25 }, flute: { f0: 260, k: 1 }, nasal: { f0: 190, k: 1.2 } };
export function registerVoices(audio) {
  for (const a of ARCHETYPES) {
    const { f0, k } = ARCH[a];
    for (const [syl, [v, nz]] of Object.entries(SYL).map(([s, x]) => [s, x.length === 1 ? [x[0], 0] : x])) {
      const [a1, a2, a3] = FORM[v].map(x => x * k);
      audio.register(`v_${a}_${syl}`, vowel(f0, a1, a2, a3, a === 'flute' ? 0.12 : 0.085, nz));
    }
  }
  audio.register('v_beep', { wave: 'square', duty: 0.25, freq: 520, attack: 0.002, sustain: 0.02, decay: 0.04, volume: 0.25 });
}
const ARCH_OF = { hearth: 'warm', sunshine: 'bright', grouch: 'gruff', diva: 'flute', gogetter: 'nasal', dreamer: 'squeak', schemer: 'nasal', auntie: 'warm', hustler: 'bright' };
export const archetypeFor = (who) => who?.voice ?? ARCH_OF[who?.type] ?? 'warm';
/** Speak one character of a line. who: { type|voice, pitch, loud }. Returns the sound name played or ''. */
export function speakChar(audio, settings, ch, who, i, state = {}) {
  if (settings.voiceStyle === 'off' || !who) return '';
  const l = ch.toLowerCase(); if (!/[a-z]/.test(l)) { if (ch === '?' ) state.q = true; return ''; }
  if (i % 2 === 1 && !/[aeiou]/.test(l)) return '';
  const vol = (settings.voices ?? 0.7) * (ch !== l ? 1 : 0.8) * (who.loud ?? 1);
  const semis = 12 * Math.log2(who.pitch ?? 1) + ((i * 7) % 5 - 2) * 0.9 + (state.q ? 2 : 0);
  if (settings.voiceStyle === 'beep') { audio.play('v_beep', { pitch: semis, volume: vol * 0.5 }); return 'v_beep'; }
  const name = `v_${archetypeFor(who)}_${LETTER[l]}`;
  audio.play(name, { pitch: semis, volume: vol * (who.slow ? 0.8 : 1) }); return name;
}
export function singNote(audio, settings, who, semis, vowelCh = 'a') {
  if (settings.voiceStyle === 'off') return;
  audio.play(settings.voiceStyle === 'beep' ? 'v_beep' : `v_${archetypeFor(who)}_${LETTER[vowelCh] ?? 'a'}`, { pitch: semis, volume: (settings.voices ?? 0.7) });
}
