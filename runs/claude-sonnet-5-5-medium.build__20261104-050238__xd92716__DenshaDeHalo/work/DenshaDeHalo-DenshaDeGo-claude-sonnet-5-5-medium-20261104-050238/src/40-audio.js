/* Sound: a continuous train soundscape, sound effects, station melodies, music and Animalese-style gibberish voices.
 * Everything is synthesised in code. Nothing is loaded. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH;
const A = () => E.current && E.current.audio;
const ok = () => { const a = A(); return a && a.ctx && a.ctx.state === 'running' ? a : null; };

/* ---------- voices ---------- */
const VOICES = {
  hoshino: { f: 118, wob: .10, dur: .07, wave: 'triangle', q: 5 },
  rookie: { f: 215, wob: .16, dur: .06, wave: 'square', q: 4 },
  control: { f: 190, wob: .08, dur: .06, wave: 'sawtooth', q: 7, radio: true },
  conductor: { f: 160, wob: .12, dur: .065, wave: 'triangle', q: 5 },
  mimi: { f: 300, wob: .2, dur: .055, wave: 'square', q: 4 },
  kid: { f: 380, wob: .22, dur: .05, wave: 'triangle', q: 3 },
  halo: { f: 260, wob: .3, dur: .08, wave: 'sine', q: 3 }
};
DH.VOICES = VOICES;
const VOW = { a: [800, 1200], e: [550, 1800], i: [320, 2200], o: [520, 900], u: [350, 700] };
let _lastBlip = 0;
function blip(a, who, ch, when) {
  const v = VOICES[who] || VOICES.rookie, c = a.ctx, t0 = when || c.currentTime, lc = ch.toLowerCase();
  const code = lc.charCodeAt(0) || 97, vow = VOW['aeiou'.includes(lc) ? lc : 'aeiou'[code % 5]];
  const o = c.createOscillator(), f = c.createBiquadFilter(), gn = c.createGain();
  o.type = v.wave; const pitch = v.f * (1 + ((code * 7) % 13 - 6) * v.wob / 6);
  o.frequency.setValueAtTime(pitch * 1.06, t0); o.frequency.exponentialRampToValueAtTime(pitch, t0 + v.dur * .6);
  f.type = 'bandpass'; f.frequency.value = vow[0] * (v.radio ? 1.3 : 1); f.Q.value = v.q;
  gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(v.radio ? 1.1 : .2, t0 + .008); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + v.dur);
  o.connect(f); f.connect(gn); gn.connect(a.bus('sfx'));
  if (v.radio) { const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 600; f.disconnect(); f.connect(hp); hp.connect(gn); }
  o.start(t0); o.stop(t0 + v.dur + .02);
}
// one letter at a time (Dialog calls this as it types)
DH.voiceChar = (ch, who) => { const a = ok(); if (!a || !/[a-z]/i.test(ch)) return; if (DH._vc = (DH._vc || 0) + 1, DH._vc % 2) return; blip(a, who || 'rookie', ch); };
// a whole line, scheduled
DH.babble = (text, who, rate = 13) => {
  const a = ok(); if (!a) return 0; let t = a.ctx.currentTime + .02, n = 0;
  for (const ch of text) { if (/[a-z]/i.test(ch)) { if (n++ % 2 === 0) blip(a, who, ch, t); t += 1 / rate; } else if (/[,.!?]/.test(ch)) t += .12; }
  return t - a.ctx.currentTime;
};

/* ---------- continuous train sound ---------- */
let L = null;
function ensureLoop() {
  const a = ok(); if (!a) return null; if (L && L.ctx === a.ctx) return L;
  const c = a.ctx, out = c.createGain(); out.gain.value = 0; out.connect(a.bus('sfx'));
  const nb = a.noiseBuffer();
  const mk = (type, freq, q) => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 1; const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(out); s.start(); return { f, g }; };
  L = { ctx: c, out, rumble: mk('lowpass', 160, 1), wind: mk('bandpass', 900, .6), rail: mk('bandpass', 2200, 1.2), rain: mk('highpass', 3500, .5), squeal: mk('bandpass', 4200, 8), drone: null };
  const osc = c.createOscillator(), og = c.createGain(), of = c.createBiquadFilter(); osc.type = 'sawtooth'; osc.frequency.value = 90; of.type = 'lowpass'; of.frequency.value = 500; og.gain.value = 0; osc.connect(of); of.connect(og); og.connect(out); osc.start();
  L.motor = { o: osc, g: og, f: of };
  const hn1 = c.createOscillator(), hn2 = c.createOscillator(), hg = c.createGain(); hn1.type = 'sawtooth'; hn2.type = 'square'; hn1.frequency.value = 392; hn2.frequency.value = 494; hg.gain.value = 0;
  const hf = c.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 1800; hn1.connect(hf); hn2.connect(hf); hf.connect(hg); hg.connect(a.bus('sfx')); hn1.start(); hn2.start(); L.horn = hg;
  return L;
}
let clackAt = 0;
DH.soundUpdate = (st) => {   // st: { v (m/s), s, power (0..1), brake (0..1), horn, tunnel, rain, active }
  const a = ok(); const l = ensureLoop(); if (!l) return; const t = a.ctx.currentTime, k = .06;
  const on = st.active ? 1 : 0, v = st.v, vn = Math.min(1, v / 30);
  l.out.gain.setTargetAtTime(on * (st.tunnel ? 1.3 : 1), t, .1);
  l.rumble.g.gain.setTargetAtTime(.35 * vn + .05, t, k); l.rumble.f.frequency.setTargetAtTime(110 + 220 * vn, t, k);
  l.wind.g.gain.setTargetAtTime(.22 * vn * vn, t, k); l.wind.f.frequency.setTargetAtTime(500 + 1500 * vn, t, k);
  l.rail.g.gain.setTargetAtTime(.12 * vn + (st.tunnel ? .08 * vn : 0), t, k); l.rail.f.frequency.setTargetAtTime(1600 + 2200 * vn, t, k);
  l.rain.g.gain.setTargetAtTime(st.rain ? .11 * st.rain : 0, t, .3);
  l.squeal.g.gain.setTargetAtTime(st.brake > .3 && v > .4 && v < 9 ? .08 * st.brake * (1 - v / 9) : 0, t, .05); l.squeal.f.frequency.setTargetAtTime(3200 + 1600 * (1 - v / 9), t, .05);
  l.motor.o.frequency.setTargetAtTime(70 + v * 9 + st.power * 40, t, .08); l.motor.g.gain.setTargetAtTime(st.power * .06 * (.4 + vn), t, .08); l.motor.f.frequency.setTargetAtTime(400 + v * 40, t, .08);
  l.horn.gain.setTargetAtTime(st.horn ? .17 : 0, t, .03);
  if (v > .5 && st.s > clackAt + 12.5) { clackAt = st.s; const g = A(); if (g) g.sfx({ wave: 'noise', freq: 1500, dur: .03, vol: .07 * (.4 + vn) }); }
  if (st.s < clackAt - 100) clackAt = st.s;
};
DH.soundStop = () => { if (L && L.out) { const a = ok(); if (a) { L.out.gain.setTargetAtTime(0, a.ctx.currentTime, .05); L.horn.gain.setTargetAtTime(0, a.ctx.currentTime, .03); } } };

/* ---------- effects ---------- */
const note = (n, dur, wave = 'square', vol = .16, extra) => Object.assign({ wave, freq: n, dur, vol }, extra);
function seq(list, gap, vol) { const a = A(); if (!a) return; list.forEach((n, i) => { E.current.after(i * gap, () => a.sfx(note(n, gap * 1.6, 'triangle', vol || .2))); }); }
DH.sfx = {
  atsWarn: () => { const a = A(); if (!a) return; for (let i = 0; i < 4; i++) E.current.after(i * .18, () => a.sfx(note('E6', .1, 'square', .12))); },
  atsAck: () => A() && A().sfx(note('C6', .12, 'square', .1)),
  ats: () => { const a = A(); if (!a) return; for (let i = 0; i < 6; i++) E.current.after(i * .09, () => a.sfx(note(i % 2 ? 'A5' : 'D6', .09, 'square', .13))); },
  doorChime: () => { seq(['E5', 'C5'], .22, .22); },
  doorsClose: () => { const a = A(); if (a) { a.sfx(note('C4', .25, 'sawtooth', .1, { to: 'C3' })); E.current.after(.3, () => a.sfx({ wave: 'noise', freq: 400, dur: .12, vol: .12 })); } },
  call: () => { const a = A(); if (a) a.sfx(note('A5', .06, 'square', .1)); },
  judge: (grade) => { if (grade === 'PERFECT') seq(['C5', 'E5', 'G5', 'C6'], .09, .22); else if (grade === 'GREAT') seq(['C5', 'E5', 'G5'], .09, .2); else if (grade === 'GOOD') seq(['C5', 'G5'], .1, .18); else if (grade === 'OK') seq(['C5'], .1, .16); else seq(['E4', 'C4', 'A3'], .16, .2); },
  penalty: () => { const a = A(); if (a) { a.sfx(note('E3', .16, 'sawtooth', .16, { to: 'C3' })); } },
  eb: () => { const a = A(); if (a) { a.sfx({ wave: 'noise', freq: 800, dur: .5, vol: .18 }); a.sfx(note('A2', .5, 'sawtooth', .14)); } },
  notch: () => { const a = A(); if (a) a.sfx({ wave: 'noise', freq: 2600, dur: .02, vol: .09 }); },
  hornOk: () => seq(['G5', 'C6'], .07, .12),
  fail: () => seq(['G4', 'E4', 'C4', 'G3'], .22, .26),
  win: () => seq(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], .11, .22)
};
// each station's departure melody (short, ascending/descending pairs, all different)
const MELODY = [['C5', 'E5', 'G5', 'E5', 'C5'], ['D5', 'F#5', 'A5', 'F#5', 'D5'], ['E5', 'G5', 'B5', 'A5', 'G5'], ['F5', 'A5', 'C6', 'A5', 'F5'], ['G5', 'B5', 'D6', 'B5', 'G5', 'D5'], ['A5', 'C#6', 'E6', 'C#6', 'A5'],
  ['C5', 'D5', 'E5', 'G5', 'E5', 'D5'], ['E5', 'C5', 'D5', 'G4', 'C5'], ['G5', 'E5', 'C5', 'E5', 'G5'], ['A5', 'G5', 'E5', 'D5', 'C5'], ['B4', 'D5', 'F#5', 'D5', 'B4'], ['C5', 'G5', 'E5', 'G5', 'C6']];
DH.melody = (stationIdx) => seq(MELODY[stationIdx % 12], .2, .2);

/* ---------- music ---------- */
DH.SONGS = {
  title: { bpm: 108, steps: 4, tracks: [
    { wave: 'square', vol: .07, notes: 'E5 - G5 - A5 - G5 E5 | D5 - F5 - A5 - F5 D5 | C5 - E5 - G5 - E5 C5 | D5 - E5 - G5 - - - -' },
    { wave: 'triangle', vol: .24, notes: 'C3 . G3 . C3 . G3 . | D3 . A3 . D3 . A3 . | A2 . E3 . A2 . E3 . | G2 . D3 . G2 . D3 .' },
    { wave: 'drums', vol: .06, notes: 'k . h . s . h . k . h . s . h h' }] },
  drive: { bpm: 96, steps: 4, tracks: [
    { wave: 'pulse12', vol: .045, notes: 'A4 - - C5 - - E5 - | G4 - - B4 - - D5 - | F4 - - A4 - - C5 - | G4 - - B4 - - D5 - - -' },
    { wave: 'triangle', vol: .18, notes: 'A2 . . . E3 . . . | G2 . . . D3 . . . | F2 . . . C3 . . . | G2 . . . D3 . . .' },
    { wave: 'drums', vol: .035, notes: 'k . . . h . . . s . . . h . . .' }] },
  night: { bpm: 80, steps: 4, tracks: [
    { wave: 'sine', vol: .08, notes: 'D5 - - - F5 - - - | E5 - - - G5 - - - | C5 - - - E5 - - - | D5 - - - A4 - - -' },
    { wave: 'triangle', vol: .18, notes: 'D3 . . . . . . . | C3 . . . . . . . | A2 . . . . . . . | B2 . . . . . . .' }] },
  results: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: .06, notes: 'C5 E5 G5 C6 - - G5 - | A5 - F5 - A5 - C6 - | G5 E5 C5 E5 G5 - - - | F5 - - - G5 - C6 - -' },
    { wave: 'triangle', vol: .2, notes: 'C3 . G3 . C3 . G3 . | F3 . C4 . F3 . C4 . | C3 . G3 . C3 . G3 . | F3 . G3 . C3 . . .' },
    { wave: 'drums', vol: .05, notes: 'k . h . s . h . k . h . s . h k' }] },
  ending: { bpm: 72, steps: 4, tracks: [
    { wave: 'triangle', vol: .16, notes: 'C5 - E5 - G5 - E5 - | A4 - C5 - F5 - C5 - | G4 - B4 - D5 - B4 - | C5 - - - - - - -' },
    { wave: 'sine', vol: .1, notes: 'C3 - - - G3 - - - | F2 - - - C3 - - - | G2 - - - D3 - - - | C3 - - - - - - -' }] }
};
})();
