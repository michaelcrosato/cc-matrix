// Animalese-style voice (PLAN section 15). syllabify is pure and testable.
const VOWELS = ['a','e','i','o','u'];
const CONS = ['b','d','f','g','h','k','l','m','n','p','r','s','t','v','w','y','z','th','sh','ch'];
const FORMANTS = { a:[800,1200], e:[500,1900], i:[300,2300], o:[500,900], u:[350,800] };
export const SPEAKERS = {
  Ounce: { f0: 340, rate: 13, shift: 1.25 },
  Coach: { f0: 165, rate: 7.5, shift: 0.9 },
  Marguerite: { f0: 230, rate: 9, shift: 1.0 },
  Dennis: { f0: 120, rate: 11, shift: 0.95 },
  June: { f0: 300, rate: 10, shift: 1.15 },
};
function hashWord(w) { let h = 2166136261; for (let i = 0; i < w.length; i++) { h ^= w.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function syllabify(text, speaker = 'Ounce') {
  const sp = SPEAKERS[speaker] || SPEAKERS.Ounce;
  const out = []; let t = 0; let charIndex = 0;
  const words = String(text).split(/(\s+)/);
  const totalChars = Math.max(1, String(text).length);
  for (const tok of words) {
    if (/^\s+$/.test(tok)) { t += 0.06; charIndex += tok.length; continue; }
    if (!tok) continue;
    const h = hashWord(tok.toLowerCase());
    const nSyl = Math.max(1, Math.min(4, Math.ceil(tok.replace(/[^a-zA-Z]/g, '').length / 3) || 1));
    for (let s = 0; s < nSyl; s++) {
      const hh = hashWord(tok.toLowerCase() + ':' + s);
      const cons = CONS[hh % CONS.length];
      const vowel = VOWELS[(hh >> 5) % VOWELS.length];
      const dur = 1 / sp.rate;
      const progress = charIndex / totalChars;
      let f0 = sp.f0 * (1 - 0.15 * progress);
      if (text.trim().endsWith('?')) f0 *= 1 + 0.25 * progress;
      if (text.trim().endsWith('!')) f0 *= 1.15;
      out.push({ t, dur, f0, vowel, cons, charIndex });
      t += dur;
    }
    charIndex += tok.length;
  }
  return out;
}
// Render onto any BaseAudioContext. No-op without a context.
export function renderVoice(audioCtx, destination, syllables, speaker = 'Ounce', when = 0) {
  if (!audioCtx || !destination || !syllables?.length) return false;
  try {
    const sp = SPEAKERS[speaker] || SPEAKERS.Ounce;
    const start = when || audioCtx.currentTime;
    for (const s of syllables) {
      const t0 = start + s.t;
      const osc = audioCtx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = s.f0;
      const [f1, f2] = FORMANTS[s.vowel] || FORMANTS.a;
      const bp1 = audioCtx.createBiquadFilter(); bp1.type = 'bandpass'; bp1.frequency.value = f1 * sp.shift; bp1.Q.value = 6;
      const bp2 = audioCtx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = f2 * sp.shift; bp2.Q.value = 8;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.12, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + Math.max(0.04, s.dur));
      osc.connect(bp1); osc.connect(bp2); bp1.connect(g); bp2.connect(g); g.connect(destination);
      osc.start(t0); osc.stop(t0 + s.dur + 0.05);
    }
    return true;
  } catch { return false; }
}
