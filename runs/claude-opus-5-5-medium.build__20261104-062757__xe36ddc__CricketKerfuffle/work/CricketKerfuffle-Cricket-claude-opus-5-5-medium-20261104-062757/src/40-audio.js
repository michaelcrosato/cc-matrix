// ---- audio, all synthesized in code (5.13): the sound effects (engine voices), the crowd engine and the gibberish
// voices (our own Web Audio graphs on the engine's context and its effects bus), and the music (the engine's step
// notation, songs in layers: base, drums when the Hype is up, fire when ON FIRE).
const SFX_DEFS = {
  bat: [{ wave: 'noise', freq: 2400, to: 900, dur: .04, vol: .35 }, { wave: 'sine', freq: 620, to: 380, dur: .09, vol: .4 }, { wave: 'triangle', freq: 1240, dur: .05, vol: .15 }],
  batSweet: [{ wave: 'noise', freq: 2400, to: 900, dur: .04, vol: .35 }, { wave: 'sine', freq: 620, to: 380, dur: .09, vol: .45 }, { wave: 'sine', freq: 880, to: 1320, dur: .14, vol: .22 }],
  edge: [{ wave: 'noise', freq: 5200, dur: .02, vol: .25 }, { wave: 'square', freq: 1800, to: 1400, dur: .02, vol: .08 }],
  pitchThud: [{ wave: 'sine', freq: 140, to: 80, dur: .06, vol: .3 }, { wave: 'noise', freq: 400, dur: .03, vol: .08 }],
  stumps: [{ wave: 'triangle', freq: 700, to: 500, dur: .05, vol: .3 }, { wave: 'triangle', freq: 540, to: 420, dur: .06, vol: .25 }, { wave: 'triangle', freq: 860, to: 600, dur: .05, vol: .2 }, { wave: 'noise', freq: 1600, dur: .08, vol: .2 }],
  bails: [{ wave: 'square', freq: 2400, dur: .02, vol: .1 }, { wave: 'square', freq: 2900, dur: .02, vol: .08 }],
  gloves: [{ wave: 'noise', freq: 300, to: 120, dur: .06, vol: .3 }, { wave: 'sine', freq: 110, to: 70, dur: .06, vol: .2 }],
  throwWhoosh: [{ wave: 'noise', freq: 600, to: 2400, dur: .18, vol: .12 }],
  dive: [{ wave: 'noise', freq: 900, to: 200, dur: .3, vol: .14 }],
  board: [{ wave: 'triangle', freq: 220, to: 160, dur: .08, vol: .3 }, { wave: 'noise', freq: 500, dur: .05, vol: .12 }],
  glass: [{ wave: 'noise', freq: 4000, to: 1200, dur: .25, vol: .3 }, { wave: 'sine', freq: 2600, dur: .12, vol: .12 }, { wave: 'sine', freq: 3400, dur: .1, vol: .1 }],
  splash: [{ wave: 'noise', freq: 3000, to: 400, dur: .35, vol: .25 }, { wave: 'sine', freq: 90, to: 60, dur: .15, vol: .25 }],
  gull: [{ wave: 'saw', freq: 1400, to: 900, dur: .18, vol: .1, vib: [22, .06] }, { wave: 'saw', freq: 1300, to: 800, dur: .14, vol: .08, vib: [20, .05] }],
  moo: [{ wave: 'saw', freq: 110, to: 95, dur: .9, vol: .2, vib: [5, .03] }, { wave: 'triangle', freq: 220, to: 190, dur: .9, vol: .1 }],
  bees: [{ wave: 'saw', freq: 220, to: 240, dur: .8, vol: .08, vib: [30, .04] }],
  steam: [{ wave: 'noise', freq: 2000, to: 800, dur: .5, vol: .15 }, { wave: 'sine', freq: 70, to: 50, dur: .1, vol: .3 }],
  firework: [{ wave: 'sine', freq: 600, to: 2400, dur: .4, vol: .08 }, { wave: 'noise', freq: 200, to: 60, dur: .5, vol: .35 }],
  hypeFull: { wave: 'square', freq: 'C5', dur: .4, vol: .2, arp: [0, 4, 7, 12], step: .07 },
  fireOn: { wave: 'saw', freq: 'G4', dur: .5, vol: .2, arp: [0, 7, 12, 19], step: .06 },
  special: { wave: 'pulse', freq: 'E5', dur: .5, vol: .2, arp: [0, 5, 9, 12, 17], step: .05 },
  bell: [{ wave: 'sine', freq: 660, dur: .9, vol: .15 }, { wave: 'sine', freq: 1320, dur: .6, vol: .06 }],
  coin: [{ wave: 'square', freq: 1800, to: 2200, dur: .05, vol: .1 }, { wave: 'triangle', freq: 1200, dur: .3, vol: .08, vib: [16, .05] }],
  whistle: [{ wave: 'sine', freq: 2400, to: 2600, dur: .35, vol: .12, vib: [30, .02] }],
  tick: { wave: 'square', freq: 1400, dur: .015, vol: .06 },
  stamp: [{ wave: 'noise', freq: 600, to: 100, dur: .12, vol: .35 }, { wave: 'square', freq: 90, to: 60, dur: .12, vol: .25 }],
  thunder: [{ wave: 'noise', freq: 200, to: 50, dur: 1.4, vol: .35 }]
};
function sfx(name, o) { if (game && game.audio) game.audio.sfx(name, o); }
function defineSfx() { for (const k in SFX_DEFS) game.audio.define(k, SFX_DEFS[k]); }

// ---- our own Web Audio: a voice bus (with its own volume and a compressor) and the crowd engine
const AU = { ready: false, voiceGain: null, crowd: null, voices: [], busyUntil: 0 };
function auCtx() { const A = game && game.audio; return A && A.ctx && !A.failed ? A.ctx : null; }
function auInit() {
  const c = auCtx(); if (!c || AU.ready) return !!c;
  try {
    const out = game.audio._sfxBus || c.destination;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; comp.connect(out);
    AU.voiceGain = c.createGain(); AU.voiceGain.connect(comp); AU.comp = comp;
    // a second of pink-ish noise, looped: the crowd's bed, applause and roars
    const len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * .1848) * .2; }
    AU.noise = buf;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const bed = c.createGain(); bed.gain.value = 0;
    for (const f of [200, 800, 2000]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = .8; src.connect(bp); bp.connect(bed); }
    bed.connect(out); src.start();
    AU.crowd = { bed, level: 0, target: 0 };
    AU.ready = true;
  } catch (e) { AU.ready = false; }
  return AU.ready;
}
function voiceVol() { if (!S('voices')) return 0; const v = game.settings ? game.settings.voiceVolume : '100%'; return (parseInt(v, 10) || 100) / 100; }
// the crowd's mood follows events: a six roars for 2 s and keeps an excited murmur for a while
const CROWD = { size: .6, excite: 0, rain: false };
function crowdStep(dt) {
  if (!AU.ready) { if (auCtx()) auInit(); return; }
  CROWD.excite = Math.max(0, CROWD.excite - dt * .05);
  const lvl = (CROWD.size * .12 + CROWD.excite * .2) * (CROWD.rain ? .3 : 1) * (game.audio.muted ? 0 : 1);
  try { AU.crowd.bed.gain.setTargetAtTime(lvl, auCtx().currentTime, .4); } catch (e) { /* ignore */ }
}
function crowdSilence() { if (AU.ready) try { AU.crowd.bed.gain.setTargetAtTime(0, auCtx().currentTime, .05); } catch (e) { /* ignore */ } }
// a roar ('ah'), an 'ooh', a groan: detuned saws through two formant filters
function crowdVoice(kind, dur = 1.6, vol = .18) {
  const c = auCtx(); if (!c || !auInit() || game.audio.muted) return;
  const F = { roar: [750, 1250, 180], ooh: [400, 800, 160], groan: [500, 900, 110], chant: [700, 1150, 200] }[kind] || [750, 1250, 180];
  const t0 = c.currentTime, g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol * game.audio.sfxVolume, t0 + .15); g.gain.setTargetAtTime(0, t0 + dur * .6, dur * .3);
  const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = F[0]; f2.frequency.value = F[1]; f1.Q.value = f2.Q.value = 5;
  f1.connect(g); f2.connect(g); g.connect(AU.comp);
  for (let k = 0; k < 6; k++) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = F[2] * (1 + (k - 3) * .045) * (kind === 'groan' ? 1 : 1 + Math.random() * .05); if (kind === 'groan') o.frequency.linearRampToValueAtTime(F[2] * .7, t0 + dur); o.connect(f1); o.connect(f2); o.start(t0); o.stop(t0 + dur + .5); }
  const n = c.createBufferSource(); n.buffer = AU.noise; n.loop = true; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1200; nf.Q.value = .6; n.connect(nf); nf.connect(g); n.start(t0); n.stop(t0 + dur + .5);
}
// applause: dense short noise grains (hand claps)
function applause(dur = 2, rate = 60, vol = .14) {
  const c = auCtx(); if (!c || !auInit() || game.audio.muted) return;
  const t0 = c.currentTime, n = c.createBufferSource(); n.buffer = AU.noise; n.loop = true;
  const hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 1800; hp.Q.value = 1.2;
  const g = c.createGain(); g.gain.value = 0; n.connect(hp); hp.connect(g); g.connect(AU.comp);
  const R = RNG.cosmetic;
  for (let t = 0; t < dur; t += 1 / rate) { const a = vol * game.audio.sfxVolume * (1 - t / dur * .7) * (.5 + R() * .5); g.gain.setValueAtTime(a, t0 + t); g.gain.setTargetAtTime(0, t0 + t + .004, .01); }
  n.start(t0); n.stop(t0 + dur + .2);
}
// ---- gibberish voices (Animalese / Simlish style): each syllable a saw through two vowel formants, plosive onsets
const VOWELS = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 700], y: [300, 2100] };
function syllables(text) {
  const out = [], words = String(text).replace(/\{[^}]*\}/g, '').split(/(\s+|[,.!?;:\u2026\u2014-]+)/);
  let k = 0;
  for (const w of words) {
    if (!w) continue;
    if (/^\s+$/.test(w)) { out.push({ gap: .04 }); continue; }
    if (/^[,.!?;:\u2026\u2014-]+$/.test(w)) { out.push({ gap: .15, q: w.includes('?'), ex: w.includes('!') }); continue; }
    const caps = w === w.toUpperCase() && /[A-Z]/.test(w);
    const parts = w.toLowerCase().match(/[^aeiouy]*[aeiouy]+[^aeiouy]*?(?=[^aeiouy]*[aeiouy]|$)|[^aeiouy]+$/g) || [w];
    for (const p of parts) { const v = (p.match(/[aeiouy]/) || ['a'])[0], on = p.match(/^[^aeiouy]+/); out.push({ v, plosive: on && /[pbtdkgcq]/.test(on[0]), fric: on && /[sfzhvxj]/.test(on[0]), caps, i: k++ }); }
  }
  // the pitch contour: a declination across the phrase, a rise at a question, up and louder for '!' and CAPS
  const n = Math.max(1, k); let last = null;
  for (const s of out) { if (s.gap) { if (s.q && last) last.rise = 1.25; if (s.ex && last) last.ex = true; continue; } s.pitch = 1 - .12 * (s.i / n); last = s; }
  for (const s of out) if (!s.gap) { if (s.rise) s.pitch *= s.rise; if (s.caps || s.ex) s.pitch *= 1.3; }
  return out;
}
function say(text, who, o = {}) {
  const c = auCtx(); const prof = typeof who === 'string' ? (VOICES[who] || VOICES.aubrey) : (who || VOICES.aubrey);
  const syl = syllables(text);
  let dur = 0; for (const s of syl) dur += s.gap || (.055 + .055 * (s.caps ? 1.2 : 1)) * (prof.speed || 1);
  if (!c || !auInit() || game.audio.muted || voiceVol() <= 0) return dur;
  const now = c.currentTime;
  if (AU.busyUntil > now + 1.5 && !o.urgent) return dur;   // at most a phrase or two queued
  let t = Math.max(now + .02, o.urgent ? now + .02 : AU.busyUntil);
  const R = RNG.cosmetic, base = prof.base * (o.pitch || 1), vol = .2 * voiceVol() * (o.vol || 1);
  for (const s of syl) {
    if (s.gap) { t += s.gap * (prof.speed || 1); continue; }
    const L = (.055 + R() * .055) * (prof.speed || 1) * (o.shout ? 1.4 : 1), f0 = base * s.pitch * (1 + (R() - .5) * .08) * (o.shout ? 1.25 : 1);
    const F = VOWELS[s.v] || VOWELS.a, nk = prof.nasal ? 1.2 : 1;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * (s.ex || s.caps ? 1.3 : 1), t + .008); g.gain.setValueAtTime(vol, t + L * .7); g.gain.linearRampToValueAtTime(0, t + L + .03);
    const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = F[0] * nk; f2.frequency.value = F[1] * nk; f1.Q.value = f2.Q.value = prof.name === 'MRS CRUMB' ? 3 : 6;
    f1.connect(g); f2.connect(g); g.connect(AU.voiceGain);
    if (prof.whisper) { const n = c.createBufferSource(); n.buffer = AU.noise; n.connect(f1); n.connect(f2); n.start(t); n.stop(t + L + .05); }
    else {
      const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(f0, t); osc.frequency.linearRampToValueAtTime(f0 * (prof.nasal ? .92 : .97), t + L);
      if (prof.vib || prof.trem) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = prof.vib || prof.trem; lg.gain.value = f0 * .03; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + L + .05); }
      if (prof.ring) { const rm = c.createOscillator(), rg = c.createGain(); rm.frequency.value = prof.ring; rg.gain.value = .5; rm.connect(rg); rg.connect(g.gain); rm.start(t); rm.stop(t + L + .05); }
      osc.connect(f1); osc.connect(f2); osc.start(t); osc.stop(t + L + .05);
    }
    if (s.plosive || s.fric) { const n = c.createBufferSource(); n.buffer = AU.noise; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = s.fric ? 3000 : 1200; const ng = c.createGain(); ng.gain.setValueAtTime(vol * .6, t); ng.gain.linearRampToValueAtTime(0, t + (s.fric ? .05 : .02)); n.connect(hp); hp.connect(ng); ng.connect(AU.voiceGain); n.start(t); n.stop(t + .06); }
    t += L + .01;
  }
  AU.busyUntil = t;
  return dur;
}
function shout(text, who, o = {}) { return say(text, who, Object.assign({ shout: true, urgent: true }, o)); }

// ---- music: original songs in the engine's step notation, in layers
const SONGS = {
  title: { bpm: 120, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .1, notes: 'Bb4 . D5 . F5 - D5 . | Eb5 . G5 . F5 - - . | D5 . F5 . Bb5 - A5 G5 | F5 - Eb5 - D5 - . . | C5 . Eb5 . G5 - F5 . | Eb5 . D5 . C5 - Bb4 . | A4 . C5 . F5 - E5 Eb5 | D5 - C5 - Bb4 - . . ' },
    { name: 'base', wave: 'triangle', vol: .14, notes: 'Bb2 . F2 . Bb2 . F2 . | Eb2 . Bb2 . Eb2 . Bb2 . | Bb2 . F2 . Bb2 . F2 . | Bb2 . F2 . Bb2 . D3 . | Eb2 . Bb2 . Eb2 . G2 . | F2 . C3 . F2 . A2 . | F2 . C3 . F2 . A2 . | Bb2 . F2 . Bb2 . . . ' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . s . k k s . | k . s . k . s s ' }] },
  green: { bpm: 96, steps: 2, tracks: [
    { name: 'base', wave: 'pulse12', vol: .08, notes: 'G5 - E5 - . . G5 - E5 - . . C5 D5 E5 - | F5 - D5 - . . F5 - D5 - . . B4 C5 D5 - | E5 - C5 - G4 - A4 B4 C5 - E5 - D5 - . - | C5 - - - . . . . . . . . . . . . ' },
    { name: 'base', wave: 'triangle', vol: .12, notes: 'C3 . G2 . C3 . G2 . | G2 . D3 . G2 . D3 . | A2 . E3 . F2 . C3 . | C3 . G2 . C3 . . . ' },
    { name: 'drums', wave: 'drums', vol: .08, on: false, notes: 'k . h . s . h . | k k h . s . h h ' },
    { name: 'fire', wave: 'saw', vol: .06, on: false, notes: 'C4 C4 . C4 E4 . G4 . | D4 D4 . D4 F4 . A4 . ' }] },
  hall: { bpm: 108, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .07, notes: 'D5 A4 F#4 A4 D5 A4 | E5 A4 G4 A4 E5 A4 | F#5 D5 A4 D5 F#5 D5 | E5 C#5 A4 C#5 E5 - | D5 - - - . . ' },
    { name: 'base', wave: 'triangle', vol: .12, notes: 'D3 . . A2 . . | A2 . . E3 . . | D3 . . F#3 . . | A2 . . C#3 . . | D3 . . . . . ' },
    { name: 'drums', wave: 'drums', vol: .07, on: false, notes: 'k . . h . h ' },
    { name: 'fire', wave: 'saw', vol: .05, on: false, notes: 'D4 . F#4 . A4 . ' }] },
  bay: { bpm: 150, steps: 2, tracks: [
    { name: 'base', wave: 'saw', vol: .07, notes: 'E4 E4 G4 A4 B4 . A4 G4 | E4 E4 G4 A4 D5 . B4 . | E4 E4 G4 A4 B4 . A4 G4 | A4 G4 E4 D4 E4 - - . ' },
    { name: 'base', wave: 'triangle', vol: .13, notes: 'E2 E2 E3 E2 E2 E2 E3 E2 | A2 A2 A3 A2 B2 B2 B3 B2 ' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k h s h k k s h ' },
    { name: 'fire', wave: 'square', vol: .05, on: false, notes: 'B5 . B5 . A5 . G5 . ' }] },
  downs: { bpm: 100, steps: 2, tracks: [
    { name: 'base', wave: 'triangle', vol: .12, notes: 'A4 - C5 E5 - D5 | C5 - B4 A4 - . | F4 - A4 C5 - B4 | G#4 - - E4 - . ' },
    { name: 'base', wave: 'square', vol: .05, notes: 'A2 . E3 . E3 . | A2 . E3 . E3 . | F2 . C3 . C3 . | E2 . B2 . G#2 . ' },
    { name: 'drums', wave: 'drums', vol: .07, on: false, notes: 'k . h . h . ' },
    { name: 'fire', wave: 'saw', vol: .05, on: false, notes: 'A5 . G#5 . E5 . ' }] },
  dome: { bpm: 128, steps: 2, tracks: [
    { name: 'base', wave: 'saw', vol: .07, notes: 'A4 . A4 . C5 . A4 . | G4 . G4 . E4 . G4 . | F4 . F4 . A4 . F4 . | E4 . G4 . B4 - - . ' },
    { name: 'base', wave: 'square', vol: .08, notes: 'A2 A2 . A2 A2 . A2 . | G2 G2 . G2 G2 . G2 . | F2 F2 . F2 F2 . F2 . | E2 E2 . E2 E2 . G#2 . ' },
    { name: 'drums', wave: 'drums', vol: .11, notes: 'k . s . k . s . | k k s . k . s s ' },
    { name: 'fire', wave: 'pulse', vol: .05, on: false, notes: 'E5 E5 . E5 G5 . A5 . ' }] },
  tea: { bpm: 90, steps: 1, tracks: [
    { name: 'base', wave: 'triangle', vol: .12, notes: 'G4 B4 D5 | C5 - B4 | A4 C5 E5 | D5 - - | G4 B4 D5 | E5 D5 C5 | B4 A4 F#4 | G4 - - ' },
    { name: 'base', wave: 'sine', vol: .1, notes: 'G2 D3 D3 | C3 G3 G3 | A2 E3 E3 | D3 A3 A3 | G2 D3 D3 | C3 G3 G3 | D3 A3 A3 | G2 D3 D3 ' }] },
  map: { bpm: 112, steps: 3, tracks: [
    { name: 'base', wave: 'square', vol: .08, notes: 'C5 . E5 G5 . E5 | F5 . A5 G5 . E5 | D5 . F5 E5 . C5 | D5 . B4 C5 - - ' },
    { name: 'base', wave: 'triangle', vol: .12, notes: 'C3 . . G2 . . | F2 . . C3 . . | G2 . . C3 . . | G2 . . C3 . . ' }] },
  showdown: { bpm: 140, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .06, notes: 'E4 . E4 . E4 . F4 . | E4 . E4 . E4 . D4 . ' },
    { name: 'base', wave: 'triangle', vol: .13, notes: 'E2 E2 E2 E2 E2 E2 F2 F2 | E2 E2 E2 E2 E2 E2 D2 D2 ' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h h ' },
    { name: 'fire', wave: 'saw', vol: .05, on: false, notes: 'B4 . . B4 . . C5 . ' }] }
};
SONGS.attract = Object.assign({}, SONGS.title, { bpm: 132 });
const STINGS = {
  four: { bpm: 200, steps: 2, tracks: [{ wave: 'square', vol: .14, notes: 'C5 E5 G5 C6 - - . . ' }] },
  six: { bpm: 200, steps: 2, tracks: [{ wave: 'square', vol: .15, notes: 'G4 C5 E5 G5 C6 E6 G6 - - - ' }, { wave: 'drums', vol: .12, notes: 'k . s . k s s s ' }] },
  wicket: { bpm: 180, steps: 2, tracks: [{ wave: 'saw', vol: .12, notes: 'A5 . E5 . A4 - - - ' }, { wave: 'drums', vol: .12, notes: 'k . . . k . . . ' }] },
  over: { bpm: 160, steps: 2, tracks: [{ wave: 'triangle', vol: .12, notes: 'C5 G4 C5 - ' }] },
  win: { bpm: 140, steps: 2, tracks: [{ wave: 'square', vol: .14, notes: 'C5 . C5 . C5 . E5 - G5 - - . E5 . G5 - - - C6 - - - ' }, { wave: 'triangle', vol: .14, notes: 'C3 . G2 . C3 . E3 - G3 - - . C3 . G2 - - - C3 - - - ' }] },
  lose: { bpm: 90, steps: 2, tracks: [{ wave: 'saw', vol: .12, notes: 'G4 - F#4 - F4 - E4 - - - - - ' }] },
  toss: { bpm: 220, steps: 2, tracks: [{ wave: 'pulse', vol: .1, notes: 'C5 D5 E5 F5 G5 A5 B5 C6 ' }] },
  chapter: { bpm: 120, steps: 2, tracks: [{ wave: 'square', vol: .12, notes: 'Bb4 D5 F5 Bb5 - - A5 - Bb5 - - - ' }] }
};
let musicNow = null;
function music(id) { if (!game || !game.audio) return; if (musicNow === id) return; musicNow = id; game.audio.music(id ? SONGS[id] : null, { fade: .6 }); }
function sting(id) { if (game && game.audio && STINGS[id]) game.audio.sting(STINGS[id], { at: 'now', duck: .4 }); }
function musicLayers(m) {
  if (!game || !game.audio || !musicNow) return;
  const A = game.audio, song = SONGS[musicNow]; if (!song) return;
  const has = n => song.tracks.some(t => t.name === n);
  try {
    if (has('drums')) A.layer('drums', m && (m.hype[m.batT] > 50 || m.hype[m.bowlT] > 50 || m.state === 'inPlay') ? 1 : 0, .8);
    if (has('fire')) A.layer('fire', m && (m.fire.batOn || m.fire.bowlOn) ? 1 : 0, .5);
  } catch (e) { /* a song without layers */ }
}
