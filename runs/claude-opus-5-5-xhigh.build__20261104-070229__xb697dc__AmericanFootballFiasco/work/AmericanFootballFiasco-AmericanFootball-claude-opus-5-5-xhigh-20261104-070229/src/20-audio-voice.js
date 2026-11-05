// Voices: a formant babble synth. Animalese (the story cast, refs, mascots) is letter-driven: each vowel group of the
// typed text is a syllable, its onset from the consonants before it. Simlish (the announcers, the crowd's chants) counts
// a line's syllables and speaks that many from a gibberish bank, picked by a hash of each word, so a line always sounds
// the same. Every syllable is an oscillator through two formant filters, with a noise or hum onset. Headless (no audio
// context) it plans and schedules nothing, and the plan is returned for tests.
(() => {
'use strict';
const FF = window.FF, game = FF.game, u = FF.u;
const VOWELS = { a: [800, 1200], e: [500, 1900], i: [320, 2300], o: [500, 900], u: [350, 800], y: [320, 2300] };
const BANK = ['ba', 'do', 'zee', 'ka', 'fla', 'nu', 'ree', 'bo', 'shma', 'gli', 'va', 'tor', 'mip', 'zub', 'lo', 'neh', 'gub', 'wee', 'pa', 'chee'];
// { base Hz, rate syllables a second, wave, formant scale, breath, style, contour, vibrato }
const P = FF.VOICES = {
  chet: { base: 125, rate: 13, wave: 'sawtooth', formant: .95, breath: .05, style: 'simlish', contour: 'excited', vol: .5 },
  lou: { base: 105, rate: 9, wave: 'triangle', formant: .9, breath: .08, style: 'simlish', contour: 'fall', vol: .55 },
  bluster: { base: 140, rate: 14, wave: 'square', formant: 1, breath: .15, style: 'animalese', contour: 'shout', vol: .38 },
  pearl: { base: 210, rate: 10, wave: 'triangle', formant: 1.15, breath: .05, style: 'animalese', vol: .55 },
  hap: { base: 165, rate: 12, wave: 'sawtooth', formant: 1.05, breath: .03, style: 'animalese', vol: .45 },
  brock: { base: 150, rate: 11, wave: 'pulse', formant: 1, breath: .02, style: 'animalese', contour: 'smug', vol: .42 },
  sterling: { base: 115, rate: 8, wave: 'sawtooth', formant: .92, breath: .06, style: 'animalese', contour: 'fall', vol: .45 },
  bertha: { base: 190, rate: 9, wave: 'square', formant: 1.1, breath: .1, style: 'animalese', vol: .38 },
  gator: { base: 120, rate: 10, wave: 'sawtooth', formant: .95, breath: .12, style: 'animalese', vol: .45 },
  lumen: { base: 140, rate: 11, wave: 'pulse', formant: 1, breath: .02, style: 'animalese', vol: .42 },
  zap: { base: 190, rate: 16, wave: 'pulse12', formant: 1.1, breath: 0, style: 'animalese', vol: .38 },
  djhoot: { base: 130, rate: 12, wave: 'pulse', formant: 1, breath: .04, style: 'animalese', vib: [6, .03], vol: .42 },
  iceberg: { base: 100, rate: 6, wave: 'sine', formant: .85, breath: .05, style: 'animalese', contour: 'fall', vol: .65 },
  avalanche: { base: 70, rate: 3, wave: 'growl', formant: .7, breath: .2, style: 'growl', vol: .6 },
  mountain: { base: 90, rate: 7, wave: 'square', formant: .8, breath: .1, style: 'animalese', vol: .4 },
  primrose: { base: 135, rate: 10, wave: 'triangle', formant: 1, breath: .02, style: 'animalese', contour: 'smug', vol: .5 },
  ref: { base: 150, rate: 12, wave: 'square', formant: 1, breath: 0, style: 'animalese', vol: .35 },
  mascot: { base: 240, rate: 14, wave: 'square', formant: 1.3, breath: .1, style: 'animalese', vol: .3 },
  wheels: { base: 160, rate: 13, wave: 'sawtooth', formant: 1, breath: .02, style: 'animalese', vol: .42 },
  qb: { base: 150, rate: 10, wave: 'square', formant: 1, breath: .05, style: 'animalese', contour: 'shout', vol: .4 },
  crowd: { base: 170, rate: 6, wave: 'sawtooth', formant: 1, breath: .3, style: 'simlish', vol: .2, chorus: 6 }
};
/** split a line into syllables: [{ onset: 'pl' | 'fr' | 'na' | 'li' | '', vowel, caps, word }] */
function syllables(text, prof) {
  const out = [], words = String(text).split(/\s+/).filter(Boolean);
  if (prof.style === 'simlish' || prof.style === 'growl') {
    for (const w0 of words) {
      const w = w0.replace(/[^A-Za-z']/g, ''); if (!w) continue;
      const n = Math.max(1, (w.toLowerCase().match(/[aeiouy]+/g) || []).length), h = u.hash(w.toLowerCase()), caps = w.length > 1 && w === w.toUpperCase();
      for (let k = 0; k < n; k++) { const b = BANK[(h + k * 7) % BANK.length], v = (b.match(/[aeiouy]/) || ['a'])[0]; out.push({ onset: cls(b[0]), vowel: v, caps, word: w, k, h: (h + k * 31) >>> 0, end: k === n - 1 }); }
    }
  } else {
    for (const w0 of words) {
      const w = w0.replace(/[^A-Za-z']/g, ''); if (!w) continue;
      const caps = w.length > 1 && w === w.toUpperCase(), lw = w.toLowerCase(), re = /([^aeiouy]*)([aeiouy]+)/g; let m, k = 0;
      while ((m = re.exec(lw))) { out.push({ onset: cls(m[1].slice(-1)), vowel: m[2][0], caps, word: w, k, h: u.hash(lw + k) >>> 0, end: false }); k++; }
      if (out.length) out[out.length - 1].end = true;
    }
  }
  return out;
}
function cls(c) { if (!c) return ''; c = c.toLowerCase(); if ('pbtdkgcq'.includes(c)) return 'pl'; if ('fszvhxj'.includes(c)) return 'fr'; if ('mn'.includes(c)) return 'na'; if ('lrwy'.includes(c)) return 'li'; return ''; }
const voice = FF.voice = { active: {}, lastPlan: null, live: {} };
/** plan a line: [{ t, dur, f, f1, f2, onset, vol }] */
voice.plan = (text, prof) => {
  const syl = syllables(text, prof), out = [], q = /\?\s*$/.test(text), ex = /!\s*$/.test(text), n = syl.length; let t = 0;
  syl.forEach((s, i) => {
    const jit = ((s.h % 1000) / 1000 * 4 - 2) * (prof.style === 'simlish' ? .6 : 1);
    let ct = 0; const tail = n - i;
    if (q && tail <= 2) ct += 4; else if (ex) ct += i === 0 ? 3 : 1.5; else if (tail <= 1) ct -= 2;
    if (prof.contour === 'excited') ct += Math.sin(i * 1.3) * 1.5 + 1; if (prof.contour === 'fall') ct -= i / Math.max(1, n) * 2; if (prof.contour === 'smug') ct += i < n / 2 ? 1.5 : -1.5;
    if (s.caps) ct += 2;
    const dur = (1 / prof.rate) * (.6 + ((s.h >> 8) % 100) / 250) * (s.end ? 1.25 : 1), [f1, f2] = VOWELS[s.vowel] || VOWELS.a;
    out.push({ t, dur, f: prof.base * Math.pow(2, (jit + ct) / 12), f1: f1 * prof.formant, f2: f2 * prof.formant, onset: s.onset, vol: (prof.vol || .4) * (ex || s.caps ? 1.3 : 1) });
    t += dur + (s.end ? .04 : 0);
  });
  return out;
};
/** speak a line now (or plan it headless); returns the plan */
voice.say = (text, id, o = {}) => {
  const prof = P[id] || P.ref, plan = voice.plan(text, prof); voice.lastPlan = { id, text, plan };
  if (o.mute || game.settings.voices <= 0) return plan;
  const A = game.audio, ctx = A.ctx; if (!ctx || A.muted || ctx.state !== 'running') return plan;
  const now = ctx.currentTime + .02;
  voice.stop(id);
  const nodes = []; voice.active[id] = nodes;
  for (const s of plan) syllable(ctx, A, prof, s, now + s.t, nodes, o.detune || 0);
  if (prof.chorus) for (let c = 1; c < Math.min(prof.chorus, 6); c++) for (const s of plan) syllable(ctx, A, prof, Object.assign({}, s, { f: s.f * Math.pow(2, ((c * 37) % 30 - 15) / 1200), vol: s.vol * .7 }), now + s.t + c * .006, nodes, 0);
  return plan;
};
voice.stop = id => { const L = voice.active[id]; if (L) { for (const n of L) try { n.stop(); } catch (e) { /* done */ } voice.active[id] = null; } };
/** the E5 dialog hook: letters typed one by one, grouped into syllables live */
voice.letter = (ch, id) => {
  const st = voice.live[id] || (voice.live[id] = { buf: '', t: 0 }), c = String(ch).toLowerCase();
  if (/[aeiouy]/.test(c)) { if (!/[aeiouy]/.test(st.buf.slice(-1))) { const on = st.buf.replace(/[^a-z]/g, '').slice(-1); voice.say(on + c, id, { single: true }); } st.buf += c; }
  else st.buf = /[a-z]/.test(c) ? st.buf + c : '';
  if (st.buf.length > 8) st.buf = st.buf.slice(-4);
};
function bus(A) {
  if (!A._voiceLP) { const b = A.bus('voices'); if (!b) return null; const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3500; lp.connect(b); A._voiceLP = lp; }
  return A._voiceLP;
}
function syllable(ctx, A, prof, s, t, nodes, detune) {
  const out = bus(A); if (!out) return;
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(s.vol * .5, t + .006); g.gain.setValueAtTime(s.vol * .5, t + Math.max(.01, s.dur - .025)); g.gain.linearRampToValueAtTime(0, t + s.dur); g.connect(out);
  if (prof.wave === 'growl') {
    const n = ctx.createBufferSource(); n.buffer = A._noise; n.loop = true; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; n.connect(lp); lp.connect(g); n.start(t); n.stop(t + s.dur + .05); nodes.push(n);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(55, t + s.dur); const og = ctx.createGain(); og.gain.value = .6; o.connect(og); og.connect(g); o.start(t); o.stop(t + s.dur + .05); nodes.push(o); return;
  }
  const o = ctx.createOscillator();
  if (prof.wave === 'pulse' || prof.wave === 'pulse12') o.setPeriodicWave(A._pulse(prof.wave === 'pulse' ? .25 : .125)); else o.type = prof.wave;
  o.frequency.setValueAtTime(s.f, t); o.frequency.linearRampToValueAtTime(s.f * .97, t + s.dur); if (detune) o.detune.value = detune;
  if (prof.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = prof.vib[0]; lg.gain.value = s.f * prof.vib[1]; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + s.dur + .05); nodes.push(l); }
  for (const [f, q] of [[s.f1, 6], [s.f2, 10]]) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; o.connect(b); b.connect(g); }
  const dry = ctx.createGain(); dry.gain.value = .12; o.connect(dry); dry.connect(g);
  o.start(t); o.stop(t + s.dur + .05); nodes.push(o);
  if (s.onset === 'pl' || s.onset === 'fr' || prof.breath > .1) {
    const n = ctx.createBufferSource(); n.buffer = A._noise; const f = ctx.createBiquadFilter(), ng = ctx.createGain();
    f.type = s.onset === 'fr' ? 'highpass' : 'bandpass'; f.frequency.value = s.onset === 'fr' ? 3500 : 1800; const d = s.onset === 'pl' ? .008 : s.onset === 'fr' ? .03 : .02;
    ng.gain.setValueAtTime(s.vol * (s.onset ? .35 : prof.breath), t); ng.gain.linearRampToValueAtTime(0, t + d); n.connect(f); f.connect(ng); ng.connect(out); n.start(t, Math.random() * .5); n.stop(t + d + .02); nodes.push(n);
  }
}
voice.syllables = syllables;
})();
