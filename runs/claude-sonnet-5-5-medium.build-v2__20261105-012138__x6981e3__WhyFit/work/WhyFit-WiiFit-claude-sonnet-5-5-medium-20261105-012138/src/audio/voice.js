// Animalese/Simlish gibberish. syllabify() is pure (Node-testable); renderVoice() works on any BaseAudioContext.
export const SPEAKERS = {
  ounce: { f0: 340, rate: 13, shift: 1.25, tick: true },
  coach: { f0: 165, rate: 7.5, shift: 0.9, flat: true, pause: 1.8 },
  marguerite: { f0: 230, rate: 9, shift: 1, vib: true },
  dennis: { f0: 120, rate: 11, shift: 0.95, lastUp: true },
  june: { f0: 300, rate: 10, shift: 1.15, flat: true, noContour: true },
  kevin: { f0: 600, rate: 6, shift: 1, squawk: true },
  you: { f0: 200, rate: 9, shift: 1 },
};
const FORMANTS = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800] };
const VOWELS = 'aeiou';
const CONS = ['none', 'plosive', 'fricative', 'nasal'];
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function splitWord(w) {
  // Split a word into pseudo-syllables at vowel groups.
  const out = []; let cur = ''; let sawV = false;
  for (const ch of w.toLowerCase()) {
    const isV = VOWELS.includes(ch) || ch === 'y';
    if (isV) { if (!sawV || cur === '') { cur += ch; sawV = true; } else if (cur.length && !VOWELS.includes(cur[cur.length - 1]) && cur[cur.length - 1] !== 'y') { out.push(cur); cur = ch; sawV = true; } else cur += ch; }
    else { if (sawV) { out.push(cur); cur = ''; sawV = false; } cur += ch; }
  }
  if (cur) out.push(cur);
  const merged = [];
  for (const s of out) { if (merged.length && !/[aeiouy]/.test(s)) merged[merged.length - 1] += s; else merged.push(s); }
  return merged.length ? merged : [w];
}
/** text -> [{ t, dur, f0, vowel, cons, charIndex, tick? }]. The same word always gives the same syllables. */
export function syllabify(text, speaker = 'ounce') {
  const sp = SPEAKERS[speaker] ?? SPEAKERS.ounce;
  const out = []; let t = 0;
  const base = 1 / sp.rate;
  // sentences by terminal punctuation
  const re = /[^\s]+/g; let m; const words = [];
  while ((m = re.exec(text))) words.push({ w: m[0], at: m.index });
  // sentence boundaries
  const sentences = []; let cur = [];
  for (const w of words) { cur.push(w); if (/[.!?]+["')\]]*$/.test(w.w)) { sentences.push(cur); cur = []; } }
  if (cur.length) sentences.push(cur);
  for (const s of sentences) {
    const first = out.length;
    const lastW = s[s.length - 1].w;
    const q = /\?\W*$/.test(lastW), ex = /!\W*$/.test(lastW), dots = /\.\.\.|…/.test(lastW);
    s.forEach((wd, wi) => {
      const letters = wd.w.replace(/[^A-Za-z]/g, '');
      const isLastWord = wi === s.length - 1;
      if (letters.length) {
        const syls = splitWord(letters);
        syls.forEach((sy, si) => {
          const h = hash(letters.toLowerCase() + ':' + si);
          const vm = sy.match(/[aeiouy]/); const vch = vm ? (vm[0] === 'y' ? 'i' : vm[0]) : VOWELS[h % 5];
          const cons = CONS[(h >>> 3) % 4];
          const sd = base * (0.8 + ((h >>> 7) % 5) * 0.1) * (dots && isLastWord ? 1.6 : 1);
          out.push({ t, dur: sd * 0.9, f0: sp.f0, vowel: vch, cons, charIndex: wd.at + Math.min(wd.w.length - 1, Math.floor((si / syls.length) * wd.w.length)), tick: false, lastWord: isLastWord });
          t += sd;
        });
      }
      const end = wd.w[wd.w.length - 1];
      let gap = base * 0.6;
      if (/[,;:]/.test(end)) gap = base * (sp.pause ?? 1.2) * 1.5;
      if (/[.!?]/.test(end)) gap = base * (sp.pause ?? 1.2) * 2.5;
      if (sp.tick && /[.,!?;:]/.test(end) && out.length) out[out.length - 1].tick = true;
      t += gap;
    });
    // contour
    const n = out.length - first;
    for (let i = 0; i < n; i++) {
      const sy = out[first + i]; const pos = n > 1 ? i / (n - 1) : 0;
      let f = sp.f0;
      if (!sp.flat && !sp.noContour) f *= 1 - 0.15 * pos;
      if (q && !sp.noContour) f *= 1 + 0.25 * Math.max(0, (pos - 0.6) / 0.4);
      if (ex && !sp.noContour) f *= 1.15;
      if (sp.lastUp && sy.lastWord) f *= 1.12;
      if (sp.flat && !sp.noContour && q) f *= 1 + 0.08 * pos;
      sy.f0 = f;
    }
  }
  return out;
}
export const voiceDuration = (syls) => (syls.length ? syls[syls.length - 1].t + syls[syls.length - 1].dur : 0);
const noiseCache = new WeakMap();
function noiseBuf(ac) {
  let b = noiseCache.get(ac);
  if (!b) { b = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.1), ac.sampleRate); const d = b.getChannelData(0); let s = 12345; for (let i = 0; i < d.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1; } noiseCache.set(ac, b); }
  return b;
}
/** Schedule syllables on any BaseAudioContext. Returns the end time. */
export function renderVoice(ac, destination, syls, when, speaker = 'ounce', level = 0.5) {
  const sp = SPEAKERS[speaker] ?? SPEAKERS.ounce;
  let end = when;
  for (const sy of syls) {
    const t0 = when + sy.t, dur = Math.max(0.04, sy.dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(level, t0 + 0.006);
    g.gain.setValueAtTime(level, t0 + Math.max(0.007, dur - 0.03));
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    g.connect(destination);
    const osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(sy.f0, t0);
    if (sp.vib) { const lfo = ac.createOscillator(); lfo.frequency.value = 5.5; const lg = ac.createGain(); lg.gain.value = sy.f0 * 0.02; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.05); }
    const [f1, f2] = FORMANTS[sy.vowel] ?? FORMANTS.a;
    for (const f of [f1, f2]) { const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * sp.shift; bp.Q.value = 6; const fg = ac.createGain(); fg.gain.value = f === f1 ? 1 : 0.7; osc.connect(bp); bp.connect(fg); fg.connect(g); }
    osc.start(t0); osc.stop(t0 + dur + 0.05);
    if (sy.cons === 'plosive' || sy.cons === 'fricative') {
      const nd = sy.cons === 'plosive' ? 0.008 : 0.04;
      const ns = ac.createBufferSource(); ns.buffer = noiseBuf(ac);
      const nf = ac.createBiquadFilter(); nf.type = sy.cons === 'plosive' ? 'lowpass' : 'highpass'; nf.frequency.value = sy.cons === 'plosive' ? 1800 : 4500;
      const ng = ac.createGain(); ng.gain.setValueAtTime(level * 0.8, t0); ng.gain.linearRampToValueAtTime(0, t0 + nd);
      ns.connect(nf); nf.connect(ng); ng.connect(destination); ns.start(t0); ns.stop(t0 + nd + 0.01);
    }
    if (sy.tick) { const o2 = ac.createOscillator(); o2.type = 'square'; o2.frequency.value = 1900; const g2 = ac.createGain(); g2.gain.setValueAtTime(level * 0.35, t0 + dur); g2.gain.linearRampToValueAtTime(0, t0 + dur + 0.03); o2.connect(g2); g2.connect(destination); o2.start(t0 + dur); o2.stop(t0 + dur + 0.04); }
    end = Math.max(end, t0 + dur);
  }
  return end;
}
/** Mean f0 of a line, for tests. */
export const meanPitch = (syls) => (syls.length ? syls.reduce((a, s) => a + s.f0, 0) / syls.length : 0);
