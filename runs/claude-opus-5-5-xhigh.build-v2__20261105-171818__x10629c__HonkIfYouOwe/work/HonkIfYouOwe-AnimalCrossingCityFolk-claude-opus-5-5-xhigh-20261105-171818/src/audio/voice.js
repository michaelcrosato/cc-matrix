// Gibberish voices: each letter triggers a very short syllable, stacked harmonics shaped by vowel
// formants, with a noise layer for the consonant. Six archetypes, a pitch per character.
const FORMANTS = { a: [730, 1090, 2440], e: [530, 1840, 2480], i: [290, 2290, 3010], o: [570, 840, 2410], u: [300, 870, 2240], y: [400, 1700, 2600] };
function vowel(f0, [f1, f2, f3], dur = 0.09, cons = null) {
  const amp = (h) => { const f = f0 * h, g = (c, w, a) => a * Math.exp(-((f - c) ** 2) / (2 * w * w)); return g(f1, 90, 1) + g(f2, 120, 0.6) + g(f3, 180, 0.25); };
  const layers = [];
  for (let h = 2; h * f0 < 4000; h++) { const v = amp(h) * 0.45; if (v > 0.01) layers.push({ wave: 'sine', freq: f0 * h, attack: 0.008, sustain: dur * 0.55, decay: dur * 0.45, volume: v }); }
  if (cons) layers.push({ wave: 'noise', freq: cons.freq, attack: 0.001, sustain: 0, decay: cons.dur, volume: cons.vol });
  return { wave: 'sine', freq: f0, attack: 0.008, sustain: dur * 0.55, decay: dur * 0.45, volume: Math.max(0.08, amp(1) * 0.45), vibrato: { depth: 0.2, rate: 18 }, layers };
}
export const ARCHETYPES = {
  round: { f0: 130, dur: 0.1 }, bright: { f0: 280, dur: 0.075 }, nasal: { f0: 210, dur: 0.08 }, gruff: { f0: 100, dur: 0.09 }, warm: { f0: 180, dur: 0.09 }, reedy: { f0: 340, dur: 0.065 },
};
const SYLLABLES = [['ba', 'a', 1500], ['ka', 'a', 5000], ['me', 'e', 400], ['ti', 'i', 7000], ['lo', 'o', 700], ['nu', 'u', 800], ['ra', 'a', 2000], ['se', 'e', 8000], ['do', 'o', 2500], ['wi', 'i', 600]];
const LETTER_MAP = {};
for (const [i, ch] of 'abcdefghijklmnopqrstuvwxyz'.split('').entries()) LETTER_MAP[ch] = i % SYLLABLES.length;
const VOWEL_LETTERS = { a: 0, e: 2, i: 3, o: 4, u: 5, y: 9 };
for (const [v, idx] of Object.entries(VOWEL_LETTERS)) LETTER_MAP[v] = idx;

/** All syllable SoundDefs, for registration and tests. */
export function voiceDefs() {
  const out = {};
  for (const [arch, { f0, dur }] of Object.entries(ARCHETYPES)) {
    SYLLABLES.forEach(([name, v, consFreq], i) => {
      out[`v_${arch}_${i}`] = vowel(f0, FORMANTS[v], dur, { freq: consFreq, dur: 0.018, vol: 0.14 });
    });
    out[`beep_${arch}`] = { wave: 'square', duty: 0.25, freq: f0 * 2, attack: 0.002, sustain: 0.03, decay: 0.03, volume: 0.2 };
  }
  return out;
}
/** Everyone's voice: archetype, base pitch in semitones, speed, lilt. */
export const VOICES = {
  player: { a: 'warm', p: 2, s: 1, lilt: 2 },
  gander: { a: 'nasal', p: 0, s: 1, lilt: 1 }, dorrit: { a: 'round', p: 2, s: 0.8, lilt: 2 }, tavi: { a: 'bright', p: 2, s: 1.3, lilt: 5 }, bartleby: { a: 'gruff', p: -4, s: 0.7, lilt: 0.5 },
  ottoline: { a: 'nasal', p: 5, s: 0.9, lilt: 4 }, rocco: { a: 'gruff', p: 3, s: 1.2, lilt: 3 }, nib: { a: 'reedy', p: -3, s: 0.8, lilt: 3 }, ozzie: { a: 'nasal', p: -3, s: 1.2, lilt: 1 }, yolanda: { a: 'warm', p: -2, s: 1, lilt: 2 }, fitch: { a: 'reedy', p: -6, s: 1.5, lilt: 1 },
  clementine: { a: 'round', p: 5, s: 0.7, lilt: 0.5 }, trundle: { a: 'gruff', p: -2, s: 0.45, lilt: 0.5 }, quill: { a: 'reedy', p: 2, s: 1.2, lilt: 4 }, mothwick: { a: 'bright', p: -2, s: 0.8, lilt: 5 }, rind: { a: 'gruff', p: 7, s: 0.6, lilt: 0.5 }, vesper: { a: 'warm', p: 4, s: 0.85, lilt: 3 }, hester: { a: 'warm', p: 0, s: 1.05, lilt: 3 },
  fleece: { a: 'nasal', p: 3, s: 1.1, lilt: 4 }, flavia: { a: 'bright', p: -1, s: 0.9, lilt: 3 }, magda: { a: 'reedy', p: -5, s: 1.0, lilt: 2 }, bellows: { a: 'round', p: -5, s: 0.8, lilt: 5 }, pemberton: { a: 'reedy', p: 5, s: 2, lilt: 2 }, brisket: { a: 'gruff', p: 0, s: 0.95, lilt: 0.5 }, lou: { a: 'gruff', p: -8, s: 0.4, lilt: 0.3 }, nibbles: { a: 'nasal', p: 2, s: 0.9, lilt: 3 }, pimm: { a: 'reedy', p: -8, s: 1.0, lilt: 0.5 },
  crowd: { a: 'warm', p: 0, s: 1, lilt: 4 },
};
export class VoicePlayer {
  constructor(g) { this.g = g; this.counter = 0; this.spoken = 0; this.lastText = null; }
  install(audio) { for (const [n, d] of Object.entries(voiceDefs())) audio.register(n, d); }
  /** One typed letter. */
  syllable(ch, voiceId, text) {
    const g = this.g;
    const style = g.settings.voiceStyle ?? 'gibberish';
    const vol = g.settings.voices ?? 1;
    this.counter++;
    this.spoken++;
    if (style === 'off' || vol <= 0) return;
    const v = VOICES[voiceId] ?? VOICES.crowd;
    if ((this.counter % Math.max(1, Math.round(v.s * 1.7))) !== 0 && v.s > 0.6 && !/[aeiou]/i.test(ch)) return;
    const lower = ch.toLowerCase();
    const idx = LETTER_MAP[lower];
    if (idx === undefined) return;
    const question = text && text.trimEnd().endsWith('?');
    const lilt = Math.sin(this.counter * 1.7) * v.lilt;
    let pitch = v.p + lilt + (question && this.counter % 8 === 0 ? 3 : 0);
    if (question) pitch += 1;
    const loud = ch !== lower ? 1.2 : 1;
    const name = style === 'beeps' ? `beep_${v.a}` : `v_${v.a}_${idx}`;
    g.ctx.audio.play(name, { pitch, volume: Math.min(1, vol * loud) });
  }
  /** One sung syllable at a MIDI note (Hester, Vesper, the crowd). */
  sing(ch, voiceId, midi) {
    const g = this.g;
    const style = g.settings.voiceStyle ?? 'gibberish';
    const vol = g.settings.voices ?? 1;
    this.spoken++;
    if (style === 'off' || vol <= 0) return;
    const v = VOICES[voiceId] ?? VOICES.crowd;
    const base = ARCHETYPES[v.a].f0;
    const baseMidi = 69 + 12 * Math.log2(base / 440);
    const idx = LETTER_MAP[ch.toLowerCase()] ?? 0;
    const name = style === 'beeps' ? `beep_${v.a}` : `v_${v.a}_${idx}`;
    g.ctx.audio.play(name, { pitch: midi - baseMidi, volume: vol });
  }
}
