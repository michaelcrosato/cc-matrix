/* 03-audio: every sound is code. Songs (App. H) on the engine's music clock with layers, effects as engine voices,
   ambience beds on Web Audio, and an Animalese/"Simlish" formant voice with a telephone filter. Headless: all no-ops. */
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
  // Odessa's kitchen radio: four bars of gospel in C (I-IV-I-V), soft sines
  gospel: { bpm: 72, steps: 4, tracks: [
    { name: 'organ', wave: 'sine', vol: 0.05, notes: `C4 ${H15} | F4 ${H15} | C4 ${H15} | G4 ${H15}` },
    { name: 'third', wave: 'sine', vol: 0.04, notes: `E4 ${H15} | A4 ${H15} | E4 ${H15} | B4 ${H15}` },
    { name: 'bass', wave: 'triangle', vol: 0.12, notes: 'C3 . . . . . . . G2 . . . . . . . | F2 . . . . . . . C3 . . . . . . . | C3 . . . . . . . G2 . . . . . . . | G2 . . . . . . . D3 . . . . . . .' },
    { name: 'tune', wave: 'triangle', vol: 0.05, notes: 'E5 - - . G5 - - . C6 - - - A5 - G5 . | A5 - - . F5 - - . A5 - - - C6 - - . | G5 - - . E5 - - . C5 - - - D5 - E5 . | D5 - - - - - - - B4 - - - . . . .' }] }
};
// stings (audio.sting over the music)
const STINGS = {
  made: { bpm: 125, steps: 1, tracks: [{ wave: 'square', vol: .1, notes: 'A4 F4 D4 .' }] },
  photoGood: { bpm: 200, steps: 1, tracks: [{ wave: 'triangle', vol: .12, notes: 'E5 B5 - .' }] },
  casePoint: { bpm: 360, steps: 1, tracks: [{ wave: 'triangle', vol: .1, notes: 'C5 E5 G5 - .' }] },
  beatDone: { bpm: 84, steps: 4, tracks: [{ wave: 'pulse12', vol: .08, notes: '. . . . E5 . . G5 . A5 . C6 . A5 . . | B5 - - - G#5 - - - E5 - - - - - . .' }, { wave: 'triangle', vol: .2, notes: 'A2 . . . . . . . E2 . . . . . . . | E2 . . . . . . . A2 - - - - - . .' }] }
};

const SFX = {
  shutter: [{ wave: 'noise', freq: 3000, dur: .03, vol: .25 }, { wave: 'square', freq: 1800, to: 900, dur: .05, vol: .08 }],
  whirr: { wave: 'saw', freq: 220, to: 320, dur: .18, vol: .04 },
  pagerA: { wave: 'square', freq: 'E6', dur: .07, vol: .09 }, pagerB: { wave: 'square', freq: 'A6', dur: .07, vol: .1 },
  phonering: [{ wave: 'square', freq: 1250, vib: [22, .06], dur: .9, vol: .05 }],
  reel: { wave: 'noise', freq: 1800, dur: .02, vol: .12 },
  yelp: { wave: 'sine', freq: 700, to: 1500, dur: .3, vol: .07, vib: [8, .2] },
  wail: { wave: 'sine', freq: 650, to: 1300, dur: 1.8, vol: .05 },
  radio: [{ wave: 'noise', freq: 1500, dur: .08, vol: .12 }, { wave: 'square', freq: 2400, dur: .015, vol: .06 }],
  cuffs: { wave: 'square', freq: 2400, to: 1800, dur: .03, vol: .12 },
  fence: { wave: 'noise', freq: 900, dur: .22, vol: .2, vib: [30, .4] },
  gunshot: [{ wave: 'noise', freq: 600, dur: .18, vol: .45 }, { wave: 'noise', freq: 200, dur: .5, vol: .2 }],
  dog: { wave: 'saw', freq: 320, to: 180, dur: .12, vol: .1 },
  coo: { wave: 'sine', freq: 420, to: 380, dur: .35, vol: .05, vib: [7, .05] },
  flap: { wave: 'noise', freq: 700, dur: .06, vol: .08 },
  busbrake: [{ wave: 'noise', freq: 4000, dur: .9, vol: .06 }, { wave: 'sine', freq: 2200, dur: .3, vol: .03 }],
  typekey: { wave: 'noise', freq: 4000, dur: .015, vol: .1 },
  stamp: [{ wave: 'noise', freq: 300, dur: .08, vol: .3 }, { wave: 'sine', freq: 90, to: 50, dur: .12, vol: .3 }],
  pin: { wave: 'square', freq: 900, to: 700, dur: .03, vol: .07 },
  string: { wave: 'noise', freq: 2400, dur: .08, vol: .05 },
  cashflick: { wave: 'noise', freq: 5000, dur: .012, vol: .07 },
  ui_tick: { wave: 'triangle', freq: 1400, dur: .02, vol: .05 },
  shush: { wave: 'noise', freq: 5000, dur: .25, vol: .05 },
  whistle: [{ wave: 'sine', freq: 1800, to: 2300, dur: .18, vol: .08 }, { wave: 'sine', freq: 1500, dur: .2, vol: .07 }],
  rustle: { wave: 'noise', freq: 2600, dur: .3, vol: .07 },
  knock: [{ wave: 'noise', freq: 400, dur: .04, vol: .25 }],
  rumble: { wave: 'triangle', freq: 55, to: 40, dur: 1.2, vol: .12 },
  dial: { wave: 'sine', freq: 440, dur: .4, vol: .04 },
  hangup: { wave: 'square', freq: 300, to: 120, dur: .06, vol: .08 },
  ring2: [{ wave: 'sine', freq: 440, dur: 1.2, vol: .03 }, { wave: 'sine', freq: 480, dur: 1.2, vol: .03 }]
};
const DTMF = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], '*': [941, 1209], 0: [941, 1336], '#': [941, 1477] };

const Snd = {
  defined: false,
  define() {
    if (this.defined) return; this.defined = true;
    for (const k in SFX) game.audio.define(k, SFX[k]);
    for (const d in DTMF) game.audio.define('dtmf' + d, [{ wave: 'sine', freq: DTMF[d][0], dur: .12, vol: .07 }, { wave: 'sine', freq: DTMF[d][1], dur: .12, vol: .07 }]);
  },
  play(n, o) { try { game.audio.sfx(n, o); } catch (e) { /* no sound here */ } },
  shutter() { this.play('shutter'); game.after(.04, () => this.play('whirr')); },
  pager() { this.play('pagerA'); [.11, .22, .33].forEach(t => game.after(t, () => this.play('pagerB'))); },
  gunshot() { this.play('gunshot'); game.after(.13, () => this.play('gunshot', { vol: .3 })); },
  dog() { this.play('dog'); game.after(.18, () => this.play('dog', { pitch: .95 })); },
  siren() { this.play('wail'); game.after(1.8, () => this.play('wail', { pitch: .9 })); },
  whistle() { this.play('whistle'); },
  sting(n) { try { game.audio.sting(STINGS[n], { at: 'beat' }); } catch (e) { /* none */ } },
  music(name, o = {}) {
    if (!name) { game.audio.music(null); this.cur = null; return; }
    if (this.cur === name && !o.restart) return; this.cur = name;
    try { game.audio.music(SONGS[name], Object.assign({ sync: true, fade: .8 }, o)); } catch (e) { game.fail('music', e); }
  },
  layer(n, v, f = .6) { try { game.audio.layer(n, v, f); } catch (e) { /* layer of another song */ } },
  /** field missions: the street carries the scene; the music sits at 0.6 of the player's setting */
  musicScale(k) { const a = game.audio; a.musicVolume = (game.settings.music || .5) * k; a.applyVolume(); }
};

/* ---- ambience beds: looping noise through filters, on the engine's effects bus ---- */
const Amb = {
  cur: null, nodes: [], t: 0, next: 0,
  out() { const a = game.audio; return a.ctx ? (a._sfxBus || a._master || a.ctx.destination) : null; },
  noise() { const a = game.audio, c = a.ctx; if (this._buf) return this._buf; const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); let s = 1; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; } return (this._buf = b); },
  bed(type, freq, q, vol) {
    const c = game.audio.ctx, src = c.createBufferSource(); src.buffer = this.noise(); src.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(vol, c.currentTime + 1.2);
    src.connect(f); f.connect(g); g.connect(this.out()); src.start(); this.nodes.push({ src, g });
  },
  hum(freq, vol) {
    const c = game.audio.ctx, o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(vol, c.currentTime + 1);
    o.connect(g); g.connect(this.out()); o.start(); this.nodes.push({ src: o, g });
  },
  set(name, rain) {
    const key = name + (rain ? '+rain' : '');
    if (key === this.cur) return; this.want = key;
    const c = game.audio.ctx; if (!c || !this.out()) return;
    this.stop(); this.cur = key;
    if (name === 'streetDay') { this.bed('lowpass', 260, .7, .05); this.bed('bandpass', 900, .5, .012); }
    else if (name === 'streetNight') { this.bed('lowpass', 200, .7, .04); this.bed('bandpass', 1400, .6, .006); }
    else if (name === 'annex') { this.hum(60, .012); this.bed('lowpass', 400, .5, .02); }
    else if (name === 'wire') { this.bed('highpass', 5000, .5, .012); this.hum(50, .006); }
    else if (name === 'box') { this.hum(120, .02); this.hum(240, .006); }
    else if (name === 'chambers') this.bed('lowpass', 300, .5, .01);
    else if (name === 'kitchen') this.bed('lowpass', 500, .5, .01);
    else if (name === 'car') { this.bed('lowpass', 160, .8, .06); this.hum(48, .01); }
    if (rain) this.bed('bandpass', 2400, .4, .05);
  },
  stop() { const c = game.audio.ctx; for (const n of this.nodes) { try { n.g.gain.cancelScheduledValues(c.currentTime); n.g.gain.setValueAtTime(n.g.gain.value, c.currentTime); n.g.gain.linearRampToValueAtTime(0, c.currentTime + .6); n.src.stop(c.currentTime + .7); } catch (e) { /* gone */ } } this.nodes = []; this.cur = null; },
  /** occasional sounds of the place (cosmetic randomness) */
  tick(dt) {
    if (this.want && this.want !== this.cur && game.audio.ctx) { const [n, r] = this.want.split('+'); this.set(n, !!r); }
    if (!this.cur) return; this.t += dt; if (this.t < this.next) return;
    const r = RNG.cos, n = this.cur.split('+')[0];
    this.next = this.t + 40 + r() * 50;
    if (n === 'streetNight') { if (r() < .5) Snd.siren(); else Snd.dog(); }
    else if (n === 'streetDay') { if (r() < .5) Snd.play('busbrake'); else Snd.dog(); }
    else if (n === 'wire') { Snd.play('knock', { pitch: .6 }); this.next = this.t + 20; }
    else if (n === 'annex') Snd.play('phonering', { vol: .3 });
    else if (n === 'chambers') { Snd.play('knock', { vol: .3, pitch: 1.6 }); this.next = this.t + 1; }
  }
};

/* ---- the voice: Animalese / "Simlish" formant babble, synced to the text as it types ---- */
const VOICES = {
  dana: [205, .22, 13, 'triangle', 1.05, .10], lou: [118, .18, 10.5, 'sawtooth', .90, .25], hal: [142, .15, 9.5, 'sine', .95, .12],
  ren: [255, .30, 15, 'square', 1.12, .08], navarre: [135, .16, 12, 'triangle', .97, .08], pruitt: [112, .25, 12.5, 'square', .90, .10],
  ostrowski: [108, .20, 11, 'square', .88, .10], vance: [220, .20, 14, 'triangle', 1.08, .06], halloway: [98, .14, 9, 'sawtooth', .88, .20],
  easy: [108, .10, 9, 'sine', .90, .18], lonnie: [125, .18, 11, 'sawtooth', .92, .20], tee: [158, .20, 13.5, 'triangle', 1.00, .10],
  rook: [102, .30, 12, 'sawtooth', .87, .30], corey: [188, .35, 15.5, 'square', 1.05, .12], pigeon: [330, .30, 15, 'square', 1.20, .05],
  moe: [350, .30, 16, 'square', 1.22, .05], dink: [200, .25, 14, 'triangle', 1.05, .08], tavon: [175, .25, 14, 'triangle', 1.0, .08],
  pockets: [172, .40, 16, 'sawtooth', 1.00, .35], odessa: [238, .18, 10, 'sine', 1.08, .15], sunday: [128, .12, 10, 'triangle', .93, .15],
  dale: [132, .15, 11, 'square', .95, .10], dukes: [140, .2, 12, 'square', .95, .1], keisha: [230, .25, 14, 'triangle', 1.1, .08],
  gloria: [215, .2, 11, 'sine', 1.06, .1], smokey: [110, .2, 11, 'sawtooth', .9, .25], harstad: [120, .15, 11, 'square', .92, .1]
};
const voiceOf = id => {
  if (VOICES[id]) { const [base, range, rate, wave, formant, breath] = VOICES[id]; return { id, base, range, rate, wave, formant, breath, stammer: id === 'corey' ? .3 : 0, vib: id === 'odessa' ? .03 : 0, gain: id === 'pruitt' ? 1.2 : id === 'easy' ? .8 : 1 }; }
  const h = hashStr(id || 'x'), r = n => ((h >>> n) & 255) / 255, kid = /kid|boy|girl/.test(id), woman = /woman|girl|lady|ms|mrs|sister|teen2/.test(id);
  return { id, base: kid ? 300 + r(3) * 60 : woman ? 190 + r(5) * 90 : 100 + r(7) * 70, range: .15 + r(9) * .2, rate: 10 + r(11) * 5, wave: ['triangle', 'square', 'sawtooth', 'sine'][h % 4], formant: .9 + r(13) * .3, breath: .05 + r(15) * .25, stammer: 0, vib: 0, gain: 1 };
};
const FORMANTS = { a: [800, 1200], e: [400, 2300], i: [300, 2700], o: [450, 800], u: [325, 700], y: [300, 2500] };
const Voice = {
  bus: null, phoneIn: null, hiss: null, phoneOn: false, last: 0,
  ctx() {
    const a = game.audio, c = a.ctx; if (!c || !(a._sfxBus || a._master)) return null;
    if (!this.bus) {
      this.bus = c.createGain(); this.bus.connect(a._sfxBus || a._master);
      // the telephone: high-pass 300, low-pass 3400, a soft saturation
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
      const ws = c.createWaveShaper(), curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); } ws.curve = curve;
      hp.connect(lp); lp.connect(ws); ws.connect(this.bus); this.phoneIn = hp;
      this.direct = c.createGain(); this.direct.connect(this.bus);
    }
    this.bus.gain.value = game.settings.voices === undefined ? .8 : game.settings.voices;
    return c;
  },
  /** the line hiss while a wire call plays */
  phone(on) {
    this.phoneOn = on; const c = this.ctx(); if (!c) return;
    if (on && !this.hiss) { const s = c.createBufferSource(); s.buffer = Amb.noise(); s.loop = true; const g = c.createGain(); g.gain.value = .006; s.connect(g); g.connect(this.phoneIn); s.start(); this.hiss = { s, g }; }
    if (!on && this.hiss) { try { this.hiss.s.stop(); } catch (e) { /* stopped */ } this.hiss = null; }
  },
  grain(c, t, f0, vow, p, out, dur) {
    const o = c.createOscillator(); o.type = p.wave; o.frequency.setValueAtTime(f0, t);
    if (p.vib) { o.frequency.linearRampToValueAtTime(f0 * (1 + p.vib), t + dur * .5); o.frequency.linearRampToValueAtTime(f0 * (1 - p.vib), t + dur); }
    const [F1, F2] = FORMANTS[vow] || FORMANTS.a, g = c.createGain();
    for (const [ff, gg] of [[F1, .7], [F2, .35]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff * p.formant; bp.Q.value = 9; const bg = c.createGain(); bg.gain.value = gg * 4; o.connect(bp); bp.connect(bg); bg.connect(g); }
    const peak = .22 * p.gain; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + .005); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    g.connect(out); o.start(t); o.stop(t + dur + .02);
    if (p.breath > .12) this.noiseBurst(c, t, dur * .8, 1800, 1, p.breath * .05, out);
  },
  noiseBurst(c, t, dur, freq, q, vol, out) {
    const s = c.createBufferSource(); s.buffer = Amb.noise(); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0005, t + dur); s.connect(f); f.connect(g); g.connect(out);
    s.start(t, (hashStr(String(t)) % 100) / 100); s.stop(t + dur + .01);
  },
  bleep(c, t, out) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 1000; const g = c.createGain(); g.gain.setValueAtTime(.05, t); g.gain.setValueAtTime(0, t + .14); o.connect(g); g.connect(out); o.start(t); o.stop(t + .15); },
  /** one letter typed: a vowel starts a grain, consonants click or hiss. text is the whole line (for the contour) */
  char(text, i, prof, filter) {
    const c = this.ctx(); if (!c || !prof) return;
    const ch = (text[i] || '').toLowerCase(), prev = (text[i - 1] || ' ').toLowerCase(), t = c.currentTime + .03, out = filter === 'phone' ? this.phoneIn : this.direct;
    if (ch === '—' || (ch === '-' && text[i + 1] === '-')) { this.bleep(c, t, out); return; }
    const vowel = 'aeiouy'.includes(ch), was = 'aeiouy'.includes(prev);
    if (vowel && !was) {
      if (c.currentTime - this.last < .045) return; this.last = c.currentTime;
      const ws = text.lastIndexOf(' ', i) + 1, we = text.indexOf(' ', i), word = text.slice(ws, we < 0 ? text.length : we).toLowerCase();
      const pos = i / Math.max(1, text.length), q = /\?\s*$/.test(text);
      const contour = (.5 - pos) * .55 + (((hashStr(word + i % 3) % 100) / 100) - .5) * .5 + (q && pos > .78 ? .9 : 0);
      const f0 = prof.base * (1 + prof.range * contour), dur = .06 + .02 * ((hashStr(word) % 10) / 10);
      this.grain(c, t, f0, ch, prof, out, dur);
      if (prof.stammer && ws === i - (i - ws) && i - ws < 2 && (hashStr(word) % 100) / 100 < prof.stammer) this.grain(c, t + .08, f0 * 1.02, ch, prof, out, dur * .8);
    } else if ('bdgkptcq'.includes(ch)) this.noiseBurst(c, t, .012, 2500, 1.2, .05 * prof.gain, out);
    else if ('fszhxjv'.includes(ch)) this.noiseBurst(c, t, .04, 4500, 1.5, .025 * prof.gain, out);
    else if ('mn'.includes(ch)) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = prof.base * .9; const g = c.createGain(); g.gain.setValueAtTime(.05 * prof.gain, t); g.gain.exponentialRampToValueAtTime(.0005, t + .06); o.connect(g); g.connect(out); o.start(t); o.stop(t + .07); }
  }
};
/** a DOM/HTML typewriter that speaks as it types: Typer(text, speaker, { filter, cps, onChar, onDone }); update(dt) each step */
class Typer {
  constructor(text, who, o = {}) { this.text = clean(text); this.who = who; this.prof = voiceOf(who); this.o = o; this.i = 0; this.acc = 0; this.done = !this.text.length; this.cps = o.cps || textCps(); this.paused = false; }
  get shown() { return this.text.slice(0, this.i); }
  finish() { this.i = this.text.length; this.done = true; if (this.o.onDone) this.o.onDone(); }
  update(dt) {
    if (this.done || this.paused) return;
    this.acc += dt * this.cps;
    while (this.acc >= 1 && this.i < this.text.length) {
      this.acc -= 1; const ch = this.text[this.i];
      if (!this.o.mute) Voice.char(this.text, this.i, this.prof, this.o.filter);
      this.i++; if (this.o.onChar) this.o.onChar(this.i);
      if (',.?!'.includes(ch)) { this.acc -= ch === ',' ? this.cps * .12 : this.cps * .26; }
    }
    if (this.i >= this.text.length) this.finish();
  }
}
