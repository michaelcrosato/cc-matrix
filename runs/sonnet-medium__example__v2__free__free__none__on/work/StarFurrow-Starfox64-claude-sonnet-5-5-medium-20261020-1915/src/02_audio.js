// ===== 02_audio: fully procedural Web Audio (SFX, engine, voice blips, adaptive sequenced music) =====
const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], harm: [0, 2, 3, 5, 7, 8, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10], phryg: [0, 1, 4, 5, 7, 8, 10], mixo: [0, 2, 4, 5, 7, 9, 10],
};
const degNote = (root, scale, deg) => {
  const sc = SCALES[scale];
  const oct = Math.floor(deg / 7); const idx = ((deg % 7) + 7) % 7;
  return root + 12 * oct + sc[idx];
};
const CH = (c) => (c === '.' || c === undefined || c === ' ' ? null : parseInt(c, 36));

const TRACKS = {
  title: {
    bpm: 88, root: 57, scale: 'major', swing: 0,
    prog: [0, 4, 5, 3], bassWave: 'triangle', leadWave: 'triangle',
    bass: ['x.......x.x.....', 'x.......x.x.....', 'x.......x...x...', 'x.......x.x.....'],
    arp: ['0.1.2.1.0.1.2.1.', '0.1.2.1.0.1.2.1.', '0.1.2.1.0.1.2.1.', '0.1.2.1.0.1.2.1.'],
    lead: ['4...5.4.2...0...', '4...5.7.9.....7.', '9...7.5.4...2...', '4.2.0...2.......'],
    drums: { k: 'x.......x.......', s: '........x.......', h: 'x.x.x.x.x.x.x.x.' }, drumFrom: 4,
  },
  stage1: {
    bpm: 132, root: 52, scale: 'dorian', prog: [0, 0, 5, 3, 0, 0, 6, 4], bassWave: 'sawtooth', leadWave: 'square',
    bass: ['x.xxx.xxx.xxx.xx'],
    arp: ['0.2.4.2.0.2.4.2.', '0.2.4.2.0.2.4.2.'],
    lead: ['7...9.7.5...4...', '7...9.b.9.....7.', 'b...9.7.5...7...', '9.7.5.4.2.......', '7.9.b.9.7.5.7...', 'b...d.b.9...b...', 'd...b.9.7...9...', '9.7.5.4.5.......'],
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx' }, drumFrom: 0,
  },
  stage2: {
    bpm: 118, root: 50, scale: 'phryg', prog: [0, 0, 1, 0, 0, 5, 1, 0], bassWave: 'sawtooth', leadWave: 'sawtooth',
    bass: ['x..x..x.x..x..x.', 'x..x..x.x.x.x.x.'],
    arp: ['0.2.4.7.4.2.0.2.'],
    lead: ['4...5.4.1...0...', '4...5.7.8.....7.', '8...7.5.4...1...', '4.5.4.1.0.......', '7.8.7.4.5.4.1...', '8...a.8.7...5...', 'a...8.7.5...4...', '4.1.0.1.4.......'],
    drums: { k: 'x..x..x...x.x...', s: '....x.......x..x', h: 'x.x.x.x.x.x.x.xx' }, drumFrom: 0,
  },
  boss: {
    bpm: 150, root: 45, scale: 'harm', prog: [0, 0, 5, 4, 0, 0, 5, 6], bassWave: 'sawtooth', leadWave: 'square',
    bass: ['xxxxxxxxxxxxxxxx'],
    arp: ['0.3.5.3.0.3.5.3.', '0.3.5.7.5.3.0.3.'],
    lead: ['7.7.7...8.7.5...', '7.7.7...a.8.7...', '8.8.8...a.8.7...', '5.7.8.a.c.a.8.7.'],
    drums: { k: 'x.x.x.x.x.x.x.xx', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' }, drumFrom: 0,
  },
  calm: {
    bpm: 76, root: 55, scale: 'minor', prog: [0, 5, 3, 4], bassWave: 'sine', leadWave: 'sine',
    bass: ['x.......x.......'], arp: ['0.1.2.1.0.1.2.1.'], lead: ['4.......2.......', '3.......1.......', '2.......0.......', '1.......2.......'],
    drums: { k: '', s: '', h: '' }, drumFrom: 99,
  },
};

const Sfx = {
  ctx: null, engine: null, charge: null, voiceTimer: 0,
  init() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const c = this.ctx = new C();
    this.master = c.createGain();
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 6;
    this.master.connect(this.comp); this.comp.connect(c.destination);
    this.sfxBus = c.createGain(); this.musicBus = c.createGain(); this.voiceBus = c.createGain();
    this.sfxBus.connect(this.master); this.musicBus.connect(this.master); this.voiceBus.connect(this.master);
    const len = c.sampleRate * 2; const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    this.applyVolumes();
    Settings.listeners.push(() => this.applyVolumes());
  },
  resume() {
    this.init();
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
  },
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(S().masterVol, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(S().sfxVol, t, 0.02);
    this.musicBus.gain.setTargetAtTime(S().musicVol * 0.55, t, 0.02);
    this.voiceBus.gain.setTargetAtTime(S().voiceVol, t, 0.02);
  },
  ok() { return this.ctx && this.ctx.state === 'running'; },
  // oscillator with pitch sweep + envelope
  osc(type, f0, f1, dur, vol, o = {}) {
    if (!this.ok()) return;
    const c = this.ctx; const t = c.currentTime + (o.delay || 0);
    const g = c.createGain(); const osc = c.createOscillator();
    osc.type = type; osc.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const a = o.attack || 0.004;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.filter) { const f = c.createBiquadFilter(); f.type = o.filter; f.frequency.value = o.ff || 1000; f.Q.value = o.q || 1; osc.connect(f); node = f; }
    node.connect(g); g.connect(o.bus || this.sfxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  },
  noise(dur, vol, ftype, f0, f1, q = 1, o = {}) {
    if (!this.ok()) return;
    const c = this.ctx; const t = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = ftype; f.Q.value = q;
    f.frequency.setValueAtTime(Math.max(20, f0), t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || this.sfxBus);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  },
  play(name, a, b) { const f = this[name]; if (f) f.call(this, a, b); },
  // --- gameplay effects
  laser(lv = 1) { this.osc('square', 1100, 260, 0.13, 0.09); this.osc('sawtooth', 2200 + lv * 200, 500, 0.08, 0.05); },
  eLaser() { this.osc('triangle', 420, 140, 0.18, 0.08); this.osc('square', 220, 90, 0.14, 0.04); },
  lock(n = 1) { this.osc('sine', 700 + n * 140, 700 + n * 140, 0.07, 0.1); this.osc('triangle', 1400 + n * 280, 1400 + n * 280, 0.05, 0.05, { delay: 0.04 }); },
  missile() { this.noise(0.45, 0.12, 'bandpass', 500, 2400, 1.5); this.osc('sawtooth', 300, 800, 0.3, 0.05); },
  explosion(size = 1) {
    this.noise(0.5 + size * 0.5, 0.3 * Math.min(size, 2.2), 'lowpass', 2400, 70, 0.8);
    this.osc('sine', 120, 28, 0.5 + size * 0.4, 0.3 * Math.min(size, 2));
    if (size > 1) this.noise(1.2, 0.18, 'lowpass', 600, 40, 0.5, { delay: 0.12 });
  },
  hit() { this.noise(0.07, 0.1, 'bandpass', 2500, 900, 2); this.osc('square', 520, 240, 0.06, 0.05); },
  deflect() { this.osc('sine', 1800, 3200, 0.12, 0.08); this.osc('triangle', 2400, 4200, 0.1, 0.05, { delay: 0.03 }); },
  hurt() { this.osc('sawtooth', 240, 50, 0.4, 0.2); this.noise(0.3, 0.25, 'lowpass', 1800, 150); },
  pickup() { [660, 880, 1320].forEach((f, i) => this.osc('sine', f, f, 0.18, 0.1, { delay: i * 0.06 })); },
  ring() { [523, 659, 784, 1047, 1319].forEach((f, i) => { this.osc('sine', f, f, 0.35, 0.09, { delay: i * 0.05 }); this.osc('triangle', f * 2, f * 2, 0.2, 0.03, { delay: i * 0.05 }); }); },
  bombPickup() { [440, 554, 659, 880].forEach((f, i) => this.osc('square', f, f, 0.12, 0.06, { delay: i * 0.05 })); },
  bomb() { this.noise(1.6, 0.4, 'lowpass', 200, 4000, 0.6, { attack: 0.3 }); this.osc('sine', 60, 30, 1.5, 0.4, { delay: 0.25 }); this.noise(1.4, 0.35, 'lowpass', 3000, 60, 0.6, { delay: 0.3 }); },
  roll() { this.noise(0.45, 0.14, 'bandpass', 400, 2600, 2); },
  boost() { this.noise(0.8, 0.14, 'highpass', 600, 3000, 0.8, { attack: 0.15 }); this.osc('sawtooth', 80, 240, 0.7, 0.07); },
  brake() { this.noise(0.5, 0.1, 'bandpass', 2400, 500, 1.2); },
  alarm() { for (let i = 0; i < 3; i++) this.osc('square', 880, 880, 0.12, 0.05, { delay: i * 0.2 }); },
  warn() { for (let i = 0; i < 4; i++) { this.osc('square', 700, 700, 0.15, 0.06, { delay: i * 0.3 }); this.osc('square', 520, 520, 0.15, 0.06, { delay: i * 0.3 + 0.15 }); } },
  clear() { this.osc('triangle', 784, 784, 0.15, 0.1); this.osc('triangle', 1047, 1047, 0.3, 0.1, { delay: 0.12 }); },
  stomp() { this.osc('sine', 90, 24, 0.9, 0.5); this.noise(0.8, 0.3, 'lowpass', 500, 40); },
  beam() { this.osc('sawtooth', 200, 900, 0.9, 0.12, { filter: 'lowpass', ff: 1500 }); },
  uiMove() { this.osc('triangle', 520, 560, 0.05, 0.07); },
  uiOk() { this.osc('square', 520, 520, 0.06, 0.06); this.osc('square', 780, 780, 0.1, 0.06, { delay: 0.06 }); },
  uiBack() { this.osc('square', 520, 520, 0.06, 0.06); this.osc('square', 330, 330, 0.1, 0.06, { delay: 0.06 }); },
  uiError() { this.osc('sawtooth', 160, 120, 0.15, 0.08); },
  uiSlide() { this.osc('triangle', 440, 440, 0.03, 0.05); },
  go() { this.osc('square', 440, 440, 0.12, 0.07); this.osc('square', 660, 660, 0.12, 0.07, { delay: 0.13 }); this.osc('square', 880, 880, 0.35, 0.08, { delay: 0.26 }); },

  // continuous engine hum
  engineStart() {
    if (!this.ok() || this.engine) return;
    const c = this.ctx;
    const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55;
    const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 82;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
    const g = c.createGain(); g.gain.value = 0.0001;
    const n = c.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true;
    const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.6;
    const ng = c.createGain(); ng.gain.value = 0.0001;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxBus);
    n.connect(nf); nf.connect(ng); ng.connect(this.sfxBus);
    o1.start(); o2.start(); n.start();
    this.engine = { o1, o2, f, g, n, nf, ng };
  },
  engineUpdate(speed, boost, on) {
    if (!this.engine) this.engineStart();
    const e = this.engine; if (!e || !this.ctx) return;
    const t = this.ctx.currentTime;
    e.o1.frequency.setTargetAtTime(45 + speed * 40 + boost * 40, t, 0.1);
    e.o2.frequency.setTargetAtTime(68 + speed * 60 + boost * 50, t, 0.1);
    e.f.frequency.setTargetAtTime(300 + speed * 500 + boost * 700, t, 0.1);
    e.g.gain.setTargetAtTime(on ? 0.05 : 0.0001, t, 0.15);
    e.nf.frequency.setTargetAtTime(700 + speed * 900 + boost * 1500, t, 0.1);
    e.ng.gain.setTargetAtTime(on ? 0.03 + boost * 0.05 : 0.0001, t, 0.15);
  },
  engineStop() {
    const e = this.engine; if (!e) return;
    const t = this.ctx.currentTime;
    e.g.gain.setTargetAtTime(0.0001, t, 0.1); e.ng.gain.setTargetAtTime(0.0001, t, 0.1);
  },
  // charge-up hum for lock-on shot
  chargeUpdate(level, on) {
    if (!this.ok()) return;
    const c = this.ctx; const t = c.currentTime;
    if (!this.charge) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 200;
      const g = c.createGain(); g.gain.value = 0.0001;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
      o.connect(f); f.connect(g); g.connect(this.sfxBus); o.start();
      this.charge = { o, g };
    }
    this.charge.o.frequency.setTargetAtTime(180 + level * 700, t, 0.05);
    this.charge.g.gain.setTargetAtTime(on ? 0.05 : 0.0001, t, 0.05);
  },
  // babble "voice" for comm chatter; each character gets its own pitch/timbre
  voice(pitch, dur, kind = 0) {
    if (!this.ok()) return;
    clearInterval(this.voiceTimer);
    const end = performance.now() + dur * 1000;
    const blip = () => {
      if (performance.now() > end) { clearInterval(this.voiceTimer); return; }
      const f = pitch * (0.8 + Math.random() * 0.6);
      this.osc(kind === 1 ? 'square' : 'sawtooth', f, f * rr(0.8, 1.3), 0.07, 0.07, { bus: this.voiceBus, filter: 'bandpass', ff: rr(500, 2200), q: 3 });
    };
    this.voiceTimer = setInterval(blip, 85); blip();
  },
  voiceStop() { clearInterval(this.voiceTimer); },
};

const Music = {
  track: null, name: '', step: 0, next: 0, timer: 0, intensity: 1, stopped: true,
  play(name) {
    if (this.name === name && !this.stopped) return;
    Sfx.init();
    this.name = name; this.track = TRACKS[name]; this.step = 0; this.stopped = false;
    if (!Sfx.ctx) return;
    this.next = Sfx.ctx.currentTime + 0.1;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 30);
  },
  stop() { this.stopped = true; this.name = ''; clearInterval(this.timer); },
  tick() {
    const c = Sfx.ctx; if (!c || c.state !== 'running' || !this.track) { if (c && this.track) this.next = c.currentTime + 0.1; return; }
    const sd = 60 / this.track.bpm / 4;
    while (this.next < c.currentTime + 0.25) { this.sched(this.step, this.next, sd); this.next += sd; this.step++; }
  },
  sched(step, t, sd) {
    const T = this.track; const s = step % 16; const barN = Math.floor(step / 16);
    const bar = barN % T.prog.length;
    const root = T.root; const sc = T.scale;
    const chordDeg = T.prog[bar];
    const dly = t - Sfx.ctx.currentTime;
    // drums
    const useDrums = barN >= T.drumFrom;
    if (useDrums) {
      if (T.drums.k[s] === 'x') this.kick(dly);
      if (T.drums.s[s] === 'x') this.snare(dly);
      if (T.drums.h[s] === 'x') this.hat(dly, s % 4 === 2);
    }
    // bass
    const bp = T.bass[barN % T.bass.length];
    if (bp[s] === 'x') this.note(T.bassWave, NOTE(degNote(root - 12, sc, chordDeg)), sd * 0.9, 0.16, dly, 520);
    // chord pad on bar start
    if (s === 0) for (const k of [0, 2, 4]) this.note('triangle', NOTE(degNote(root, sc, chordDeg + k)), sd * 15, 0.045, dly, 1400, 0.08);
    // arpeggio
    const ap = T.arp[barN % T.arp.length]; const av = CH(ap[s]);
    if (av !== null) this.note('square', NOTE(degNote(root + 12, sc, chordDeg + av)), sd * 1.5, 0.03, dly, 2600);
    // lead
    const lp = T.lead[barN % T.lead.length]; const lv = CH(lp[s]);
    if (lv !== null) this.note(T.leadWave, NOTE(degNote(root + 12, sc, lv)), sd * 2.2, 0.07, dly, 3000, 0.01, true);
  },
  note(type, f, dur, vol, delay, cutoff, attack = 0.005, vib = false) {
    const c = Sfx.ctx; const t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.value = f;
    if (vib) { const l = c.createOscillator(); l.frequency.value = 5.5; const lg = c.createGain(); lg.gain.value = f * 0.006; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.1); }
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(Sfx.musicBus); o.start(t); o.stop(t + dur + 0.05);
  },
  kick(delay) { Sfx.osc('sine', 150, 42, 0.18, 0.5, { delay, bus: Sfx.musicBus }); },
  snare(delay) { Sfx.noise(0.14, 0.22, 'highpass', 1800, 1200, 0.7, { delay, bus: Sfx.musicBus }); Sfx.osc('triangle', 220, 140, 0.08, 0.12, { delay, bus: Sfx.musicBus }); },
  hat(delay, open) { Sfx.noise(open ? 0.12 : 0.04, 0.08, 'highpass', 7000, 7000, 0.5, { delay, bus: Sfx.musicBus }); },
  // one-shot melodic stinger: notes as [midi, startBeat, beats]
  sting(notes, bpm = 120, wave = 'square', vol = 0.1) {
    if (!Sfx.ok()) return;
    const bd = 60 / bpm;
    for (const [m, s, d] of notes) this.note(wave, NOTE(m), d * bd, vol, s * bd, 3500, 0.01, true);
  },
  victory() { this.sting([[72, 0, 0.5], [76, 0.5, 0.5], [79, 1, 0.5], [84, 1.5, 1.5], [79, 3, 0.5], [84, 3.5, 2]], 132, 'square', 0.09); this.sting([[48, 0, 1], [55, 1, 1], [60, 2, 1.5], [53, 3, 1], [60, 4, 2.5]], 132, 'sawtooth', 0.06); },
  defeat() { this.sting([[67, 0, 0.8], [63, 0.8, 0.8], [60, 1.6, 0.8], [55, 2.4, 2.5]], 70, 'triangle', 0.12); },
};
