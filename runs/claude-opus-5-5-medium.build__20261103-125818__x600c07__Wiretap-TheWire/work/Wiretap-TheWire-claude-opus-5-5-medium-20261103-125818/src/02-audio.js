// WIRETAP: audio, all written in code. Songs (engine music format, layered), effects, ambience beds and the gibberish
// voice synth (formant grains in time with the text, a phone filter for the wire).
const H15 = '- - - - - - - - - - - - - - -', BAR = '- - - - - - - - - - - - - - - -';
const SONGS = {
  theme: { bpm: 84, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: 0.2, notes: 'k . h . s . h k . h k . s . h . | k . h . s . h k . k h . s . o .' },
    { name: 'bass', wave: 'triangle', vol: 0.3, notes: 'A2 . . . . . A2 . C3 . . . E3 . D3 . | A2 . . . . . A2 . G2 . . . E2 . G2 . | D3 . . . . . D3 . F3 . . . A3 . G3 . | D3 . . . . . D3 . C3 . . . A2 . C3 . | F2 . . . . . F2 . A2 . . . C3 . A2 . | E2 . . . . . E2 . G#2 . . . B2 . D3 . | A2 . . . . . A2 . C3 . . . E3 . C3 . | E2 . . . G#2 . . . B2 . . . D3 . B2 .' },
    { name: 'padA', wave: 'sine', vol: 0.07, notes: `C4 ${H15} | ${BAR} | F4 ${H15} | ${BAR} | A4 ${H15} | G#4 ${H15} | C4 ${H15} | G#4 ${H15}` },
    { name: 'padB', wave: 'sine', vol: 0.06, notes: `G4 ${H15} | ${BAR} | C5 ${H15} | ${BAR} | E4 ${H15} | D5 ${H15} | G4 ${H15} | D5 ${H15}` },
    { name: 'lead', wave: 'pulse12', vol: 0.06, notes: '. . . . E5 . . G5 . . A5 - - . . . | C6 . A5 . G5 . E5 - - - - . . . . . | . . . . D5 . . F5 . . A5 - - . . . | G5 . F5 . D5 . C5 - - - - . . . . . | . . A4 . C5 . . D5 . D#5 . E5 - - . . | G#4 - - - . . B4 . . D5 . . . . . . | . . . . E5 . . G5 . A5 . C6 . A5 . . | B5 - - - G#5 - - - E5 - - - . . . .' }] },
  field: { bpm: 92, steps: 4, tracks: [
    { name: 'hats', wave: 'drums', vol: 0.05, notes: 'h . . h . . h . h . . h . . h .' },
    { name: 'bass', wave: 'triangle', vol: 0.26, notes: 'D2 . . . . . . . D2 . . . . . F2 . | C2 . . . . . . . C2 . . . . . E2 . | A#1 . . . . . . . A#1 . . . . . D2 . | A1 . . . . . . . A1 . . . C#2 . E2 .' },
    { name: 'keys', wave: 'sine', vol: 0.05, notes: '. . . . F4 . . . . . . . A4 . . . | . . . . E4 . . . . . . . G4 . . . | . . . . D4 . . . . . . . F4 . . . | . . . . C#4 . . . . . . . E4 . . .' },
    { name: 'tension', wave: 'saw', vol: 0.04, on: false, notes: `D4 ${H15} | C4 ${H15} | A#3 ${H15} | A3 ${H15}` },
    { name: 'pulse', wave: 'drums', vol: 0.1, on: false, notes: 'k . . . . . k . k . . . . . . .' },
    { name: 'alarm', wave: 'drums', vol: 0.14, on: false, notes: 'k . k . s . . k k . . k s . k .' },
    { name: 'stab', wave: 'square', vol: 0.05, on: false, notes: 'D5 . . D5 . . F5 . E5 . . C5 . . A4 .' }] },
  corner: { bpm: 95, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: 0.22, notes: 'k . . k s . . . k . k . s . . h | k . . k s . . k . . k . s . h h' },
    { name: 'bass', wave: 'triangle', vol: 0.32, notes: 'G2 . . G2 . . A#2 . C3 . . . A#2 . G2 . | G2 . . G2 . . A#2 . D3 . . . C3 . A#2 . | D#2 . . D#2 . . G2 . A#2 . . . G2 . D#2 . | D2 . . D2 . . F#2 . A2 . . . D3 . C3 .' },
    { name: 'keys', wave: 'pulse12', vol: 0.06, notes: 'G4 . A#4 . D5 . . . . . . . C5 . A#4 . | . . . . . . . . . . . . . . . . | D#4 . G4 . A#4 . . . . . . . A4 . G4 . | F#4 - - - . . . . . . . . . . . .' },
    { name: 'lead', wave: 'square', vol: 0.04, on: false, notes: 'D5 . . . D5 . C5 . A#4 . . . G4 . . . | . . . . . . . . . . . . . . . .' }] },
  wire: { bpm: 70, steps: 4, tracks: [
    { name: 'tick', wave: 'drums', vol: 0.04, notes: 't . . . t . . . t . . . t . . .' },
    { name: 'pad', wave: 'sine', vol: 0.06, notes: `E3 ${H15} | ${BAR} | C3 ${H15} | D3 ${H15}` },
    { name: 'bell', wave: 'triangle', vol: 0.04, notes: '. . . . . . . . B4 . . . . . . . | . . . . . . . . . . . . G4 . . . | . . . . . . . . E5 . . . . . . . | . . . . . . . . F#4 . . . . . . .' },
    { name: 'pulse', wave: 'drums', vol: 0.08, on: false, notes: 'k . . . . . . . k . . . . . . .' }] },
  chase: { bpm: 132, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: 0.22, notes: 'k . h k s . h . k k h . s . h h' },
    { name: 'bass', wave: 'saw', vol: 0.12, notes: 'E2 E2 . E2 G2 . E2 . A2 . G2 . E2 . D2 . | E2 E2 . E2 G2 . E2 . B2 . A2 . G2 . F#2 .' },
    { name: 'stab', wave: 'square', vol: 0.05, notes: 'E4 . . . . . E4 . G4 . . . F#4 . . . | E4 . . . . . E4 . B4 . . . A4 . G4 .' }] },
  montage: { bpm: 68, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: 0.08, notes: 'k . . . . . . . s . . . . . h .' },
    { name: 'bass', wave: 'triangle', vol: 0.26, notes: `A2 ${H15} | F2 ${H15} | C3 ${H15} | G2 ${H15}` },
    { name: 'chords', wave: 'sine', vol: 0.06, notes: 'A3 . C4 . E4 . C4 . A3 . C4 . E4 . C4 . | F3 . A3 . C4 . A3 . F3 . A3 . C4 . A3 . | C4 . E4 . G4 . E4 . C4 . E4 . G4 . E4 . | G3 . B3 . D4 . B3 . G3 . B3 . D4 . B3 .' },
    { name: 'lead', wave: 'triangle', vol: 0.07, notes: 'E5 - - - . . D5 . C5 - - - . . . . | . . . . A4 . C5 . D5 - - - . . . . | E5 - - - . . G5 . E5 - - - D5 . C5 . | D5 - - - - - - - . . . . . . . . | E5 - - - . . D5 . C5 - - - . . A4 . | C5 - - - . . D5 . E5 - - - . . . . | G5 - - - E5 - - - D5 - - - C5 - - - | B4 - - - - - - - - - - - . . . .' }] },
  versus: { bpm: 104, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: 0.2, notes: 'k . . . s . . k . k . . s . . .' },
    { name: 'bass', wave: 'triangle', vol: 0.3, notes: 'C2 . . C2 . . D#2 . F2 . . . D#2 . C2 . | G#1 . . G#1 . . C2 . D#2 . . . D2 . A#1 .' },
    { name: 'pressure', wave: 'saw', vol: 0.04, on: false, notes: `C4 ${H15} | G#3 ${H15}` },
    { name: 'clock', wave: 'drums', vol: 0.06, on: false, notes: 'h h h h h h h h h h h h h h h h' },
    { name: 'cash', wave: 'pulse12', vol: 0.05, on: false, notes: 'G4 . . G4 . . A#4 . C5 . . . A#4 . G4 . | D#4 . . D#4 . . F4 . G4 . . . F4 . D#4 .' }] },
  gospel: { bpm: 72, steps: 4, tracks: [   // Odessa's kitchen radio: I-IV-I-V in C
    { name: 'organ', wave: 'sine', vol: 0.05, notes: 'C4 . E4 . G4 . E4 . C4 . E4 . G4 . E4 . | F4 . A4 . C5 . A4 . F4 . A4 . C5 . A4 . | C4 . E4 . G4 . E4 . C4 . E4 . G4 . E4 . | G3 . B3 . D4 . B3 . G3 . B3 . D4 . F4 .' },
    { name: 'bass', wave: 'triangle', vol: 0.12, notes: `C3 ${H15} | F2 ${H15} | C3 ${H15} | G2 ${H15}` }] }
};
const STINGS = {
  made: { bpm: 120, steps: 4, tracks: [{ wave: 'square', vol: .08, notes: 'A4 . F4 . D4 - . .' }] },
  photoGood: { bpm: 150, steps: 4, tracks: [{ wave: 'triangle', vol: .1, notes: 'E5 . B5 - - .' }] },
  casePoint: { bpm: 160, steps: 4, tracks: [{ wave: 'triangle', vol: .08, notes: 'C5 E5 G5 - . .' }] },
  beatDone: { bpm: 84, steps: 4, tracks: [{ wave: 'pulse12', vol: .07, notes: 'B5 - - - G#5 - - - E5 - - - . . . .' }, { wave: 'triangle', vol: .2, notes: 'E2 . . . G#2 . . . B2 . . . E2 - - -' }] }
};
const Music = {
  cur: null, fieldMul: 1,
  play(name, o = {}) { if (this.cur === name && !o.force) return; this.cur = name; try { game.audio.music(name ? SONGS[name] : null, { fade: o.fade === undefined ? .8 : o.fade }); } catch (e) { game.fail('music', e); } },
  layer(n, v, f = .6) { try { game.audio.layer(n, v, f); } catch (e) {} },
  sting(n) { try { game.audio.sting(STINGS[n], { at: 'beat' }); } catch (e) {} }
};

function defineSounds(A) {
  const d = (n, v) => A.define(n, v);
  d('shutter', [{ wave: 'noise', freq: 3000, dur: .03, vol: .25 }, { wave: 'square', freq: 1800, to: 900, dur: .05, vol: .08 }]);
  d('whirr', { wave: 'saw', freq: 220, to: 320, dur: .18, vol: .04 });
  d('pagerBeep', { wave: 'square', freq: 'A6', dur: .07, vol: .08 });
  d('pagerLow', { wave: 'square', freq: 'E6', dur: .07, vol: .08 });
  d('phonering', [{ wave: 'square', freq: 1250, vib: [22, .06], dur: .9, vol: .05 }]);
  d('reel', { wave: 'noise', freq: 900, dur: .02, vol: .12 });
  d('radio', [{ wave: 'noise', freq: 1500, dur: .08, vol: .08 }, { wave: 'square', freq: 1200, dur: .015, vol: .05 }]);
  d('cuffs', { wave: 'square', freq: 2400, to: 1800, dur: .03, vol: .12 });
  d('fence', { wave: 'noise', freq: 2400, vib: [30, .4], dur: .22, vol: .18 });
  d('gunshot', [{ wave: 'noise', freq: 600, dur: .18, vol: .45 }, { wave: 'sine', freq: 90, to: 40, dur: .3, vol: .3 }]);
  d('dog', { wave: 'saw', freq: 320, to: 180, dur: .12, vol: .1 });
  d('coo', { wave: 'sine', freq: 420, to: 380, vib: [6, .03], dur: .35, vol: .06 });
  d('flap', { wave: 'noise', freq: 800, dur: .06, vol: .06 });
  d('busbrake', [{ wave: 'noise', freq: 3000, dur: .9, vol: .06 }, { wave: 'sine', freq: 2200, dur: .3, vol: .02 }]);
  d('typekey', { wave: 'noise', freq: 4000, dur: .015, vol: .09 });
  d('stamp', [{ wave: 'noise', freq: 300, dur: .08, vol: .3 }, { wave: 'sine', freq: 120, to: 60, dur: .12, vol: .25 }]);
  d('pin', { wave: 'square', freq: 900, to: 700, dur: .03, vol: .08 });
  d('string', { wave: 'noise', freq: 1600, dur: .08, vol: .05 });
  d('cashflick', { wave: 'noise', freq: 5000, dur: .01, vol: .08 });
  d('ui_tick', { wave: 'triangle', freq: 1400, dur: .02, vol: .05 });
  d('whistle', [{ wave: 'sine', freq: 1900, dur: .14, vol: .07 }, { wave: 'sine', freq: 1500, dur: .2, vol: .07, delay: .16 }]);
  d('siren', { wave: 'sine', freq: 650, to: 1300, dur: 1.8, vol: .03 });
  d('yelp', { wave: 'square', freq: 700, to: 1500, vib: [8, .3], dur: 1.2, vol: .03 });
  d('doorRam', [{ wave: 'noise', freq: 200, dur: .25, vol: .5 }, { wave: 'sine', freq: 70, to: 35, dur: .35, vol: .4 }]);
  d('rustle', { wave: 'noise', freq: 2200, dur: .25, vol: .07 });
  d('engine', { wave: 'saw', freq: 55, to: 70, dur: .6, vol: .04 });
  d('tick', { wave: 'square', freq: 3000, dur: .008, vol: .05 });
  for (const [k, f] of Object.entries(DTMF)) d('dtmf' + k, [{ wave: 'sine', freq: f[0], dur: .12, vol: .07 }, { wave: 'sine', freq: f[1], dur: .12, vol: .07 }]);
}
const DTMF = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], 0: [941, 1336] };
const sfx = (n, o) => { try { game.audio.sfx(n, o); } catch (e) {} };
function pagerSound() { sfx('pagerLow'); for (let i = 1; i <= 3; i++) game.after(i * .11, () => sfx('pagerBeep')); }
function shutterSound() { sfx('shutter'); game.after(.04, () => sfx('whirr')); }

/* ---- voices: Animalese-style gibberish, in time with the text (App. I) ---- */
const VOICES = {
  dana: [205, .22, 'triangle', 1.05, .10], lou: [118, .18, 'sawtooth', .90, .25], hal: [142, .15, 'sine', .95, .12], ren: [255, .30, 'square', 1.12, .08],
  navarre: [135, .16, 'triangle', .97, .08], pruitt: [112, .25, 'square', .90, .10], ostrowski: [108, .20, 'square', .88, .10], vance: [220, .20, 'triangle', 1.08, .06],
  halloway: [98, .14, 'sawtooth', .88, .20], easy: [108, .10, 'sine', .90, .18], lonnie: [125, .18, 'sawtooth', .92, .20], tee: [158, .20, 'triangle', 1.0, .10],
  rook: [102, .30, 'sawtooth', .87, .30], corey: [188, .35, 'square', 1.05, .12, 'stammer'], pigeon: [330, .30, 'square', 1.2, .05], moe: [350, .30, 'square', 1.22, .05],
  dink: [200, .25, 'triangle', 1.05, .08], tavon: [175, .25, 'triangle', 1.0, .08], pockets: [172, .40, 'sawtooth', 1.0, .35], odessa: [238, .18, 'sine', 1.08, .15, 'vibrato'],
  sunday: [128, .12, 'triangle', .93, .15], dale: [132, .15, 'square', .95, .10], dukes: [150, .18, 'square', .96, .1], keisha: [230, .25, 'triangle', 1.1, .08],
  smokey: [110, .2, 'sawtooth', .9, .3], gloria: [225, .2, 'sine', 1.06, .12], man: [140, .2, 'triangle', .95, .15], woman: [225, .22, 'triangle', 1.08, .1], kid: [320, .3, 'square', 1.2, .05]
};
const FORM = { a: [800, 1200], e: [400, 2300], i: [300, 2700], o: [450, 800], u: [325, 700], y: [300, 2500] };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) / 4294967295; };
const Voice = {
  bus: null, phoneIn: null, st: {},
  ctx() {
    const A = game.audio; if (!A || !A.ctx || !A._sfxBus || A.muted) return null;
    if (!this.bus) {
      const c = A.ctx; this.bus = c.createGain(); this.bus.connect(A._sfxBus);
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
      const ws = c.createWaveShaper(); const cur = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cur[i] = Math.tanh(x * 2.2); } ws.curve = cur;
      hp.connect(lp); lp.connect(ws); ws.connect(this.bus); this.phoneIn = hp;
      const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = nb;
    }
    this.bus.gain.value = (game.settings.voices === undefined ? .8 : game.settings.voices);
    return A.ctx;
  },
  /** a typed character: vowels start a syllable grain, consonants a burst; who is a profile id */
  char(ch, who, o = {}) {
    const c = this.ctx(); if (!c) return;
    const p = VOICES[who] || VOICES.man, low = ch.toLowerCase(), key = who + (o.phone ? 'p' : '');
    const s = this.st[key] = this.st[key] || { prevV: false, word: '', n: 0 };
    if (!/[a-z']/.test(low)) { s.prevV = false; if (low === ' ') s.word = ''; if (/[?]/.test(low)) s.q = 1; return; }
    s.word += low; const out = o.phone ? this.phoneIn : this.bus, t = c.currentTime + .02;
    if ('aeiouy'.includes(low)) {
      if (s.prevV) return; s.prevV = true; s.n++;
      if (p[5] === 'stammer' && s.word.length <= 2 && hashStr(s.word + s.n) < .3) this.grain(c, out, p, low, s.word, t - .01, .5);
      this.grain(c, out, p, low, s.word, t, 1, s.q ? .4 : 0); s.q = 0;
    } else {
      s.prevV = false;
      if ('bdgkptcq'.includes(low)) this.burst(c, out, t, .012, 1800, p[4] * .6 + .1);
      else if ('fszhxjv'.includes(low)) this.burst(c, out, t, .035, 4200, .12);
      else if ('mn'.includes(low)) this.hum(c, out, p, t);
    }
  },
  grain(c, out, p, v, word, t, k = 1, rise = 0) {
    const [base, range, wave, form, breath] = p, h = hashStr(word) * 2 - 1, f = base * (1 + range * (h * .6 + rise)) * (p[5] === 'vibrato' ? 1 + Math.sin(t * 30) * .03 : 1);
    const o = c.createOscillator(); o.type = wave; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * .96, t + .07);
    const g = c.createGain(), env = c.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(.32 * k, t + .006); env.gain.exponentialRampToValueAtTime(.001, t + .075);
    const [f1, f2] = FORM[v] || FORM.a;
    const b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(); b1.type = b2.type = 'bandpass'; b1.Q.value = b2.Q.value = 6; b1.frequency.value = f1 * form; b2.frequency.value = f2 * form;
    o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g); g.gain.value = wave === 'sine' ? 2.2 : 1.4; g.connect(env); env.connect(out);
    o.start(t); o.stop(t + .09);
    if (breath > .15) this.burst(c, out, t, .05, 1500, breath * .25);
  },
  burst(c, out, t, dur, f, vol) {
    const s = c.createBufferSource(); s.buffer = this.noise; const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 1.2;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(b); b.connect(g); g.connect(out); s.start(t, Math.random() * .5); s.stop(t + dur + .01);
  },
  hum(c, out, p, t) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = p[0] * .9; const g = c.createGain(); g.gain.setValueAtTime(.08, t); g.gain.exponentialRampToValueAtTime(.001, t + .05); o.connect(g); g.connect(out); o.start(t); o.stop(t + .06); },
  /** a 1 kHz bleep over a cut word */
  bleep() { const c = this.ctx(); if (!c) return; const t = c.currentTime + .01, o = c.createOscillator(); o.frequency.value = 1000; const g = c.createGain(); g.gain.value = .05; g.gain.setValueAtTime(0, t + .25); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + .26); },
  /** the voiceprint glyph: 16 bar heights 1..8, from the profile (App. I) */
  print(who) { const p = VOICES[who] || VOICES.man, wi = ['sine', 'triangle', 'square', 'sawtooth'].indexOf(p[2]); return Array.from({ length: 16 }, (_, i) => Math.max(1, Math.round(8 * (.5 + .5 * Math.sin(p[0] / 37 * (i + 1) + p[3] * 3 + wi))))); }
};

/* ---- ambience beds: looped noise through filters on the effects bus ---- */
const Amb = {
  beds: {}, want: [],
  set(list) { this.want = list; this.apply(); },
  apply() {
    const A = game.audio; if (!A || !A.ctx || !A._sfxBus) return; const c = A.ctx;
    if (!this.buf) { const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); let br = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; br = (br + .02 * w) / 1.02; d[i] = w * .5 + br * 3; } this.buf = b; }
    const SPEC = { street: ['lowpass', 380, .09], night: ['lowpass', 260, .06], rain: ['bandpass', 2600, .07], hum: ['bandpass', 120, .12], hiss: ['highpass', 5000, .025], hvac: ['lowpass', 200, .06] };
    for (const k of Object.keys(SPEC)) {
      const on = this.want.includes(k);
      if (on && !this.beds[k]) {
        const [type, f, v] = SPEC[k], s = c.createBufferSource(); s.buffer = this.buf; s.loop = true;
        const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; if (type === 'bandpass') fl.Q.value = k === 'hum' ? 12 : .8;
        const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(v, c.currentTime + 1.2);
        s.connect(fl); fl.connect(g); g.connect(A._sfxBus); s.start(); this.beds[k] = { s, g };
      } else if (!on && this.beds[k]) { const b = this.beds[k]; b.g.gain.linearRampToValueAtTime(0, c.currentTime + .8); try { b.s.stop(c.currentTime + .9); } catch (e) {} delete this.beds[k]; }
    }
  },
  tick() { if (game.audio && game.audio.ctx && Object.keys(this.beds).length !== this.want.length) this.apply(); }
};
