/* AUDIO: every song, sound and voice is made in code. Songs in the engine's format (layers by name), sound effects by
 * audio.define, the Animalese/Simlish-style gibberish voice (formant-filtered syllables), a crowd bed of pink noise whose
 * level follows the excitement, and the announcers' captions. */
const SONGS = {
  title: { bpm: 108, steps: 4, tracks: [
    { name: 'bass', wave: 'square', vol: .2, notes: 'E2 . E3 . . E2 G2 . A2 . . B2 . A2 G2 . | E2 . E3 . . E2 G2 . D3 . C3 . B2 . G2 A2 |' },
    { name: 'stabs', wave: 'saw', vol: .055, notes: '. . . . E4 . . . . . . . G4 - . . | . . . . E4 . . . . . . . A4 - B4 . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h k . k h . s . h h | k . h . s . h k . k h . s h o . |' },
    { name: 'hype', wave: 'pulse', vol: .06, notes: 'B4 - - . A4 G4 . E4 - . . . . . . . | D5 - - . B4 A4 . G4 - . A4 . B4 - - . |' }] },
  menu: { bpm: 108, steps: 4, tracks: [
    { wave: 'square', vol: .18, notes: 'E2 . E3 . . E2 G2 . A2 . . B2 . A2 G2 . | E2 . E3 . . E2 G2 . D3 . C3 . B2 . G2 A2 |' },
    { wave: 'drums', vol: .08, notes: 'k . h . s . h k . k h . s . h h |' },
    { wave: 'triangle', vol: .08, notes: 'E4 . . . G4 . . . A4 . . . B4 . . . | E4 . . . G4 . . . D5 . . . B4 . . . |' }] },
  skybox: { bpm: 116, steps: 4, tracks: [
    { wave: 'square', vol: .2, notes: 'A2 . A2 A3 . A2 . G2 | A2 . A2 A3 . C3 . E3 | F2 . F2 F3 . F2 . E2 | G2 . G2 G3 . B2 . D3 |' },
    { wave: 'pulse12', vol: .05, notes: 'A4 C5 E5 A5 E5 C5 A4 C5 | A4 C5 E5 A5 E5 C5 A4 C5 | F4 A4 C5 F5 C5 A4 F4 A4 | G4 B4 D5 G5 D5 B4 G4 B4 |' },
    { wave: 'drums', vol: .1, notes: 'k . h k s . h . | k . h k s . h h |' },
    { name: 'nova', wave: 'saw', vol: .05, on: false, notes: 'E5 - - . D5 - C5 - | A4 - - - . . . . |' }] },
  pier: { bpm: 124, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'D3 . A2 . D3 . F#3 . | G2 . D3 . G2 . B2 . | A2 . E3 . A2 . C#3 . | D3 . A2 . D3 . A2 . |' },
    { wave: 'pulse', vol: .06, notes: 'F#4 . A4 . D5 . A4 . | G4 . B4 . D5 - - . | E4 . A4 . C#5 . A4 . | D5 - - . . . . . |' },
    { wave: 'drums', vol: .09, notes: 'k . h . s h h . | k k h . s . h o |' },
    { name: 'nova', wave: 'saw', vol: .05, on: false, notes: 'A5 - F#5 - D5 - . . | B5 - G5 - D5 - . . |' }] },
  scrapyard: { bpm: 92, steps: 4, tracks: [
    { wave: 'saw', vol: .14, notes: 'C2 . . C2 . . Eb2 . | . . G1 . Bb1 . C2 . |' },
    { wave: 'drums', vol: .12, notes: 'k . . k s . . . | k . k . s . c . |' },
    { wave: 'square', vol: .05, notes: '. . G4 . . . Eb4 . | . . F4 . G4 . . . | . . C5 . . . Bb4 . | G4 - - . . . . . |' },
    { name: 'nova', wave: 'pulse', vol: .05, on: false, notes: 'C5 Eb5 G5 C6 G5 Eb5 C5 G4 |' }] },
  caldera: { bpm: 128, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'G2 . G2 . Bb2 . C3 . | D3 . C3 . Bb2 . F2 . |' },
    { wave: 'drums', vol: .11, notes: 'k . t . k t . t | k . t t s . t . |' },
    { wave: 'triangle', vol: .09, notes: 'G4 Bb4 D5 . F5 D5 . C5 | Bb4 . G4 . F4 G4 . . |' },
    { name: 'nova', wave: 'saw', vol: .05, on: false, notes: 'D5 - F5 - G5 - Bb5 - |' }] },
  dome: { bpm: 132, steps: 4, tracks: [
    { wave: 'saw', vol: .1, notes: 'E2 E2 E3 E2 G2 G2 G3 G2 | A2 A2 A3 A2 B2 B2 B3 D3 |' },
    { wave: 'drums', vol: .12, notes: 'k . s . k k s . | k . s . k k s s |' },
    { wave: 'square', vol: .06, notes: 'E4 - G4 - B4 - . . | A4 - G4 - F#4 - D4 - |' },
    { name: 'nova', wave: 'pulse', vol: .05, on: false, notes: 'B5 - G5 - E5 - G5 - |' },
    { name: 'overclock', wave: 'pulse12', vol: .05, on: false, notes: 'E5 G5 B5 E6 B5 G5 E5 B4 |' },
    { name: 'clutch', wave: 'drums', vol: .09, on: false, notes: 'h h h h h h h h |' }] },
  halftime: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: .07, notes: 'Bb4 . D5 . F5 . D5 . | Eb5 . C5 . A4 . F4 . |' },
    { wave: 'triangle', vol: .25, notes: 'Bb2 . F2 . Bb2 . F2 . | Eb2 . Bb2 . F2 . C3 . |' },
    { wave: 'drums', vol: .09, notes: 's . s s s . s . |' }] },
  tourmap: { bpm: 100, steps: 4, tracks: [
    { wave: 'triangle', vol: .26, notes: 'F2 . C3 . F2 . A2 . | Bb2 . F3 . Bb2 . D3 . | C3 . G2 . C3 . E3 . | F2 . C3 . F2 . . . |' },
    { wave: 'pulse', vol: .05, notes: 'A4 . C5 . F5 - . . | F5 . D5 . Bb4 - . . | G4 . C5 . E5 - . . | F5 - - - . . . . |' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h . |' }] },
  story: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .22, notes: 'D2 - - - - - - - | A1 - - - - - - - | Bb1 - - - - - - - | A1 - - - C2 - - - |' },
    { wave: 'pulse12', vol: .04, notes: 'D4 . . A4 . . F4 . | E4 . . A4 . . C#5 . |' },
    { name: 'villain', wave: 'saw', vol: .04, on: false, notes: 'D3 - F3 - A3 - G#3 - |' }] },
  camp: { bpm: 104, steps: 4, tracks: [
    { wave: 'triangle', vol: .24, notes: 'C3 . G2 . C3 . E3 . | F2 . C3 . G2 . B2 . |' },
    { wave: 'square', vol: .045, notes: 'E5 . G5 . C6 . G5 . | F5 . A5 . G5 . D5 . |' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h h |' }] },
  credits: { bpm: 112, steps: 4, tracks: [
    { wave: 'square', vol: .18, notes: 'E2 . E3 . . E2 G#2 . A2 . . B2 . A2 G#2 . | E2 . E3 . . E2 G#2 . B2 . A2 . G#2 . E2 F#2 |' },
    { wave: 'pulse', vol: .06, notes: 'G#4 - - . F#4 E4 . B4 - . . . . . . . | C#5 - - . B4 A4 . G#4 - . F#4 . E4 - - . |' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h k . k h . s . h h |' }] }
};
const STINGS = {
  buzzer: { bpm: 120, steps: 4, tracks: [{ wave: 'saw', vol: .12, notes: 'A2 - - - - - - - . . . . . . . .' }, { wave: 'saw', vol: .1, notes: 'A#2 - - - - - - - . . . . . . . .' }] },
  victory: { bpm: 150, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'C5 E5 G5 C6 - - G5 C6 - - - - . . . .' }, { wave: 'triangle', vol: .25, notes: 'C3 - - - G2 - - - C3 - - - . . . .' }, { wave: 'drums', vol: .1, notes: 'k . s . k k s . o . . . . . . .' }] },
  defeat: { bpm: 90, steps: 4, tracks: [{ wave: 'square', vol: .08, notes: 'G4 - F#4 - F4 - E4 - - - - - . . . .' }] },
  nova: { bpm: 160, steps: 4, tracks: [{ wave: 'saw', vol: .07, notes: 'C5 E5 G5 C6 E6 G6 - - . . . . . . . .' }] },
  sponsor: { bpm: 140, steps: 4, tracks: [{ wave: 'pulse', vol: .08, notes: 'C5 . E5 . G5 . E5 . F5 . A5 . G5 - - . | E5 . C5 . D5 . G4 . C5 - - - . . . . |' }, { wave: 'triangle', vol: .2, notes: 'C3 . G2 . C3 . G2 . F2 . C3 . G2 . . . | C3 . A2 . G2 . G2 . C3 - - - . . . . |' }] },
  unlock: { bpm: 160, steps: 4, tracks: [{ wave: 'square', vol: .09, notes: 'G4 C5 E5 G5 C6 - - - . . . . . . . .' }] },
  tip: { bpm: 140, steps: 4, tracks: [{ wave: 'pulse', vol: .08, notes: 'C5 G5 C6 - . . . .' }] }
};
const SFX = {
  dribble_asphalt: [{ wave: 'sine', freq: 150, to: 60, dur: .07, vol: .35 }, { wave: 'noise', freq: 3000, to: 1500, dur: .02, vol: .12, filter: 'highpass' }],
  dribble_planks: [{ wave: 'sine', freq: 120, to: 50, dur: .09, vol: .35 }, { wave: 'triangle', freq: 220, to: 160, dur: .05, vol: .12 }],
  dribble_concrete: [{ wave: 'sine', freq: 130, to: 55, dur: .07, vol: .38 }, { wave: 'noise', freq: 900, to: 400, dur: .03, vol: .1, filter: 'lowpass' }],
  dribble_stone: [{ wave: 'sine', freq: 160, to: 70, dur: .06, vol: .33 }, { wave: 'square', freq: 1800, to: 1600, dur: .015, vol: .05 }],
  dribble_maple: [{ wave: 'sine', freq: 140, to: 60, dur: .08, vol: .36 }, { wave: 'triangle', freq: 300, to: 200, dur: .04, vol: .1 }],
  bounce: { wave: 'sine', freq: 130, to: 60, dur: .08, vol: .3 },
  catch: { wave: 'noise', freq: 1200, to: 600, dur: .04, vol: .15, filter: 'lowpass' },
  release: { wave: 'noise', freq: 600, to: 2400, dur: .1, vol: .08, filter: 'bandpass' },
  swish: { wave: 'noise', freq: 2000, to: 6000, dur: .25, vol: .16, filter: 'bandpass' },
  rim: [{ wave: 'square', freq: 620, to: 560, dur: .12, vol: .1 }, { wave: 'triangle', freq: 1240, to: 1100, dur: .2, vol: .1 }],
  backboard: [{ wave: 'triangle', freq: 160, to: 110, dur: .12, vol: .3 }, { wave: 'noise', freq: 400, to: 200, dur: .06, vol: .15, filter: 'lowpass' }],
  slam: [{ wave: 'sine', freq: 90, to: 38, dur: .35, vol: .5 }, { wave: 'square', freq: 520, to: 420, dur: .2, vol: .08 }, { wave: 'noise', freq: 800, to: 200, dur: .3, vol: .2, filter: 'lowpass' }],
  shatter: [{ wave: 'noise', freq: 6000, to: 2000, dur: .5, vol: .3, filter: 'highpass' }, { wave: 'sine', freq: 3200, to: 2800, dur: .3, vol: .06 }, { wave: 'sine', freq: 4800, to: 4400, dur: .4, vol: .05 }, { wave: 'sine', freq: 2400, to: 2100, dur: .5, vol: .05 }],
  squeak: { wave: 'sine', freq: 2600, to: 3400, dur: .09, vol: .07, vib: [40, .04] },
  jump: { wave: 'square', freq: 220, to: 420, dur: .08, vol: .06 },
  land_heavy: { wave: 'sine', freq: 110, to: 40, dur: .16, vol: .35 },
  turbo: { wave: 'noise', freq: 300, to: 700, dur: .18, vol: .06, filter: 'lowpass' },
  shove: [{ wave: 'noise', freq: 500, to: 150, dur: .14, vol: .28, filter: 'lowpass' }, { wave: 'sine', freq: 120, to: 60, dur: .12, vol: .3 }],
  fall: [{ wave: 'sine', freq: 90, to: 40, dur: .18, vol: .4 }, { wave: 'noise', freq: 600, to: 200, dur: .2, vol: .15, filter: 'lowpass' }],
  steal: [{ wave: 'noise', freq: 1500, to: 3000, dur: .08, vol: .12, filter: 'bandpass' }, { wave: 'square', freq: 880, to: 1320, dur: .08, vol: .06 }],
  block: [{ wave: 'noise', freq: 1200, to: 300, dur: .12, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 140, to: 60, dur: .2, vol: .4 }],
  spin: { wave: 'noise', freq: 400, to: 2000, dur: .25, vol: .1, filter: 'bandpass' },
  dizzy: { wave: 'sine', freq: 2400, to: 2800, dur: .3, vol: .05, arp: [0, 4, 0, 7], step: .07 },
  whistle: { wave: 'square', freq: 2200, vib: [30, .05], dur: .32, vol: .1 },
  buzzer: [{ wave: 'square', freq: 220, dur: .9, vol: .12 }, { wave: 'square', freq: 230, dur: .9, vol: .1 }],
  shotclock_beep: { wave: 'square', freq: 1400, dur: .06, vol: .08 },
  horn: [{ wave: 'saw', freq: 196, dur: .7, vol: .1 }, { wave: 'saw', freq: 247, dur: .7, vol: .08 }],
  crowd_roar: { wave: 'noise', freq: 500, to: 1100, dur: 1.4, vol: .22, filter: 'bandpass' },
  crowd_ooh: { wave: 'noise', freq: 900, to: 500, dur: .8, vol: .14, filter: 'bandpass' },
  camera_flash: { wave: 'noise', freq: 5000, dur: .02, vol: .05, filter: 'highpass' },
  pu_spawn: { wave: 'pulse', freq: 'C5', dur: .3, vol: .08, arp: [0, 4, 7, 12], step: .06 },
  pu_end: { wave: 'triangle', freq: 600, to: 300, dur: .2, vol: .1 },
  jackpot: { wave: 'square', freq: 'G5', dur: .5, vol: .08, arp: [0, 4, 7, 12, 7, 12], step: .06 },
  nova_on: [{ wave: 'saw', freq: 200, to: 1600, dur: .6, vol: .1 }, { wave: 'noise', freq: 3000, dur: .4, vol: .06, filter: 'highpass' }],
  wind_gust: { wave: 'noise', freq: 300, to: 900, dur: 1.6, vol: .12, filter: 'bandpass' },
  oil_slip: { wave: 'saw', freq: 600, to: 120, dur: .3, vol: .08 },
  rumble: { wave: 'noise', freq: 120, to: 60, dur: 1.5, vol: .3, filter: 'lowpass' },
  bomb_whistle: { wave: 'sine', freq: 1200, to: 400, dur: 1.1, vol: .08 },
  vent_puff: { wave: 'noise', freq: 2000, to: 600, dur: .5, vol: .12, filter: 'highpass' },
  pyro: { wave: 'noise', freq: 400, to: 100, dur: .4, vol: .2, filter: 'lowpass' },
  servo: { wave: 'saw', freq: 300, to: 500, dur: .18, vol: .05, vib: [20, .05] },
  reboot: { wave: 'square', freq: 800, to: 100, dur: .7, vol: .08, vib: [24, .2] },
  code_ok: { wave: 'square', freq: 'E5', dur: .3, vol: .08, arp: [0, 7, 12], step: .05 },
  stamp: { wave: 'sine', freq: 120, to: 50, dur: .15, vol: .4 },
  tick: { wave: 'square', freq: 900, dur: .03, vol: .05 }
};
for (const [k, v] of Object.entries(SFX)) A.define(k, v);

/** play a sound, quieter the further its world point is from the camera's centre */
function sfxAt(name, x, o = {}) {
  if (S.net && S.net.role === 'server') return;
  const cx = game.cam && game.cam.x !== undefined ? game.cam.x : XM, d = x === undefined ? 0 : Math.abs(x - cx);
  A.sfx(name, Object.assign({}, o, { vol: (o.vol === undefined ? 1 : o.vol) * clamp(1.15 - d / 500, .35, 1) }));
}
let musicName = null;
function music(name, o = {}) {
  if (S.net && S.net.role === 'server') return;
  if (name === musicName && !o.restart) return; musicName = name;
  A.music(name ? SONGS[name] : null, Object.assign({ fade: .6 }, o));
}
function sting(name) { if (S.net && S.net.role === 'server') return; A.sting(STINGS[name], { at: 'beat' }); }
function layer(name, v, fade = 1) { const C = A.song; if (C && C.tracks.some(t => t.name === name)) A.layer(name, v, fade); }

/* ---- the gibberish voice: text -> syllables (consonant cluster + vowel), each a formant-filtered oscillator burst ---- */
const FORMANTS = { a: [800, 1200], e: [400, 2000], i: [300, 2500], o: [500, 900], u: [350, 700], y: [300, 2200] };
const Voice = {
  /** the syllable plan for a line: [{ t, dur, f0, vowel, cons, loud }] (headless tests read it) */
  plan(text, prof) {
    const out = [], rnd = E.rng(hashStr(text) || 1), rate = prof.rate || 12, step = 1 / rate, words = String(text);
    let t = 0, cons = '', semis = 0;
    const loud = words.includes('!'), ask = /\?\s*$/.test(words), N = words.replace(/[^a-z]/gi, '').length || 1;
    let k = 0;
    for (let i = 0; i < words.length; i++) {
      const ch = words[i].toLowerCase();
      if (ch >= 'a' && ch <= 'z') {
        if ('aeiouy'.includes(ch)) {
          k++; const drift = -2 * k / N, rise = ask && i > words.length - 6 ? 4 : 0;
          semis = clamp(semis + (rnd() - .5) * 3, -3, 3);
          const f0 = prof.pitch * Math.pow(2, (semis + drift + rise + (loud ? 3 : 0)) / 12);
          out.push({ t, dur: step * .85, f0, vowel: ch, cons, loud }); t += step; cons = '';
        } else cons += ch;
      } else if (ch === ' ') { if (cons) { out.push({ t, dur: step * .5, f0: prof.pitch, vowel: 'a', cons, loud }); t += step * .7; cons = ''; } t += step * .25; }
      else if ('.,!?;:'.includes(ch)) t += step * 1.4;
    }
    return { syl: out, dur: t };
  },
  _ctx() { if (typeof window === 'undefined') return null; const bus = A.sfxBus; return bus && A.ctx && A.ctx.state === 'running' && !A.muted ? bus : null; },
  _node: null,
  /** speak a whole line; returns its duration in seconds */
  say(text, prof, o = {}) {
    const pl = this.plan(text, prof), bus = this._ctx(); if (!bus) return pl.dur;
    const c = A.ctx, t0 = c.currentTime + .02, vol = setting('voiceVol') * (o.vol || 1);
    if (vol <= 0) return pl.dur;
    const out = c.createGain(); out.gain.value = vol * .5; out.connect(bus);
    for (const s of pl.syl.slice(0, 80)) this._syl(c, out, t0 + s.t, s, prof);
    return pl.dur;
  },
  _letterAt: 0,
  /** one letter typed by a Dialog (engine change 3): a syllable on each vowel */
  letter(ch, prof) {
    const bus = this._ctx(); if (!bus) return; ch = String(ch).toLowerCase();
    if (!'aeiouy'.includes(ch)) return;
    const c = A.ctx, now = c.currentTime; if (now - this._letterAt < .055) return; this._letterAt = now;
    const out = c.createGain(); out.gain.value = setting('voiceVol') * .45; out.connect(bus);
    this._syl(c, out, now + .01, { dur: .07, f0: prof.pitch * Math.pow(2, (Math.random() - .5) * 4 / 12), vowel: ch, cons: 'b', loud: false }, prof);
  },
  _syl(c, out, t, s, prof) {
    const osc = c.createOscillator(), g = c.createGain(), f = FORMANTS[s.vowel] || FORMANTS.a, sh = prof.nasal ? 1.25 : 1;
    osc.type = prof.wave === 'triangle' ? 'triangle' : prof.wave === 'pulse' || prof.wave === 'square' ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(s.f0, t); osc.frequency.linearRampToValueAtTime(s.f0 * (prof.robot ? 1 : .94), t + s.dur);
    if (prof.robot) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 50; lg.gain.value = s.f0 * .3; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + s.dur + .02); }
    const b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(); b1.type = b2.type = 'bandpass'; b1.frequency.value = f[0] * sh; b2.frequency.value = f[1] * sh; b1.Q.value = 5; b2.Q.value = 7;
    const peak = (s.loud ? .9 : .65);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + .012); g.gain.setValueAtTime(peak, t + s.dur * .6); g.gain.linearRampToValueAtTime(0, t + s.dur);
    osc.connect(b1); osc.connect(b2); b1.connect(g); b2.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + s.dur + .03);
    if (s.cons || prof.growl) {   // the consonant: a short burst of noise (hiss for s/f/z, a thump for b/d/g, a click for t/k/p)
      const ns = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain(), cc = (s.cons || 'h').slice(-1);
      ns.buffer = A._noise; nf.type = 'sfzx'.includes(cc) ? 'highpass' : 'bdgm'.includes(cc) ? 'lowpass' : 'bandpass'; nf.frequency.value = 'sfzx'.includes(cc) ? 4000 : 'bdgm'.includes(cc) ? 400 : 2500;
      ng.gain.setValueAtTime(.25 + (prof.growl || 0) * .4, t - .025); ng.gain.linearRampToValueAtTime(0, t + (prof.growl ? s.dur : .02));
      ns.connect(nf); nf.connect(ng); ng.connect(out); ns.start(Math.max(c.currentTime, t - .025)); ns.stop(t + s.dur);
    }
  }
};
const voiceOf = id => { const p = get('player', id) || get('npc', id); return (p && p.voice) || { pitch: 160, wave: 'square', rate: 12 }; };

/* ---- the crowd bed: looping pink noise through a band-pass; excitement 0..1 sets its level ---- */
const Crowd = {
  ex: .3, node: null, gain: null, filt: null,
  start() {
    if (this.node || !Voice._ctx() || (S.net && S.net.role === 'server')) return;
    const c = A.ctx, len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * .1848) * .2; }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    this.filt = c.createBiquadFilter(); this.filt.type = 'bandpass'; this.filt.frequency.value = 600; this.filt.Q.value = .7;
    this.gain = c.createGain(); this.gain.gain.value = 0; src.connect(this.filt); this.filt.connect(this.gain); this.gain.connect(A.sfxBus); src.start(); this.node = src;
  },
  stop() { if (this.node) { try { this.node.stop(); } catch (e) { /* already stopped */ } this.node = null; } },
  update(dt, on) {
    this.ex = approach(this.ex, .25, dt * .05);
    if (!this.node) { if (on) this.start(); return; }
    const target = on ? .05 + this.ex * .22 : 0;
    this.gain.gain.value = approach(this.gain.gain.value, target, dt * .5);
    this.filt.frequency.value = 450 + this.ex * 700;
  },
  hype(v) { this.ex = clamp(this.ex + v, 0, 1); }
};

/* ---- the announcers: a lower-third caption (portrait, name, the line) with its gibberish voice; not modal ---- */
const Caption = {
  cur: null, recent: [], cool: {}, alt: 0,
  /** say a line from a bank; ctx fills {NAME} {VICTIM} {TEAM}. big plays interrupt small ones */
  call(bank, ctx = {}, o = {}) {
    const mode = setting('commentary'); if (mode === 'off' && !o.story) return;
    const big = BIG_BANKS.has(bank) || o.big;
    if (mode === 'big' && !big && !o.story) return;
    const list = LINES[bank]; if (!list) return;
    const now = game.real || 0; if (!o.force && this.cool[bank] && now < this.cool[bank]) return;
    if (this.cur && this.cur.big && !big && this.cur.left > 1) return;
    let line = null; for (let k = 0; k < 6; k++) { line = pick(list); if (!this.recent.includes(line)) break; }
    this.recent.push(line); if (this.recent.length > 8) this.recent.shift(); this.cool[bank] = now + (big ? 1.5 : 4);
    const speaker = o.speaker || (this.alt++ % 2 ? 'deedee' : 'vinnie');
    this.show(speaker, fill(line, ctx), { big });
  },
  show(speaker, text, o = {}) {
    const dur = Voice.say(text, voiceOf(speaker), { vol: .8 });
    this.cur = { speaker, name: (get('npc', speaker) || get('player', speaker) || { name: speaker.toUpperCase() }).name, text, left: Math.max(2.4, Math.min(5, dur + 1)), big: !!o.big, t: 0 };
    emit('caption', { speaker, text });
  },
  update(dt) { if (this.cur) { this.cur.t += dt; if ((this.cur.left -= dt) <= 0) this.cur = null; } },
  clear() { this.cur = null; }
};
function fill(s, ctx) { return String(s).replace(/\{NAME\}/g, ctx.name || 'SOMEBODY').replace(/\{VICTIM\}/g, ctx.victim || 'SOMEBODY').replace(/\{TEAM\}/g, ctx.team || 'THE HOME TEAM').replace(/\{REPLY\}/g, ctx.reply || '').replace(/\{CAPTAIN\}/g, ctx.captain || ''); }
