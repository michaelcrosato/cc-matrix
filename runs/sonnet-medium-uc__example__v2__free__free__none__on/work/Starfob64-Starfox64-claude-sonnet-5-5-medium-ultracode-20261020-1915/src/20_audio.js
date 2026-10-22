// ===================================================================
//  AUDIO  -  100% synthesized with Web Audio (sfx, radio babble, procedural music)
// ===================================================================
const Snd = {
  ctx: null, master: null, musicBus: null, sfxBus: null, voiceBus: null, noise: null, ready: false,
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain();
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 5;
      this.master.connect(comp); comp.connect(c.destination);
      this.musicBus = c.createGain(); this.sfxBus = c.createGain(); this.voiceBus = c.createGain();
      this.musicBus.connect(this.master); this.sfxBus.connect(this.master); this.voiceBus.connect(this.master);
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.ready = true;
      this.applyVolumes();
      Music.resumePending();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  applyVolumes() {
    if (!this.ready) return;
    this.master.gain.value = S.master;
    this.musicBus.gain.value = S.music * 0.55;
    this.sfxBus.gain.value = S.sfx;
    this.voiceBus.gain.value = S.voice;
  },
  // ---- primitives
  osc(type, f0, f1, t, dur, vol, dest, pan = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.01, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    o.connect(g);
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); out = p; }
    out.connect(dest || this.sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  },
  noiseBurst(t, dur, vol, f0, f1, type = 'lowpass', q = 1, dest, pan = 0) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; s.loop = true;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.015, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g);
    let out = g;
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); out = p; }
    out.connect(dest || this.sfxBus);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  play(name, o = {}) {
    if (!this.ready || this.ctx.state !== 'running') return;
    const fn = SFX[name];
    if (fn) fn(this.ctx.currentTime + 0.001, o.vol === undefined ? 1 : o.vol, o.pan || 0, o);
  },
  // spatial pan from a world position (uses active camera)
  panFor(p) {
    if (!R.camera) return 0;
    const v = p.clone().project(R.camera);
    return clamp(v.x, -1, 1) * 0.8;
  },
  charge() {
    if (!this.ready) return null;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sawtooth'; o2.type = 'square';
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(900, t + 1.6);
    o2.frequency.setValueAtTime(121, t); o2.frequency.exponentialRampToValueAtTime(1810, t + 1.6);
    f.type = 'lowpass'; f.frequency.value = 2400;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.2);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxBus);
    o.start(t); o2.start(t);
    return { stop: () => { const n = c.currentTime; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.08); o.stop(n + 0.1); o2.stop(n + 0.1); } };
  },
  engine() {
    if (!this.ready) return null;
    const c = this.ctx, o = c.createOscillator(), n = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(), ng = c.createGain(), nf = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = 55;
    f.type = 'lowpass'; f.frequency.value = 260;
    g.gain.value = 0.0;
    n.buffer = this.noise; n.loop = true; nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.6; ng.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(this.sfxBus);
    n.connect(nf); nf.connect(ng); ng.connect(this.sfxBus);
    o.start(); n.start();
    return {
      set(level, boost) {
        const t = c.currentTime;
        o.frequency.setTargetAtTime(48 + level * 30 + boost * 40, t, 0.1);
        f.frequency.setTargetAtTime(220 + boost * 700, t, 0.1);
        g.gain.setTargetAtTime(0.07 + boost * 0.05, t, 0.1);
        ng.gain.setTargetAtTime(0.012 + boost * 0.06, t, 0.1);
      },
      stop() { try { g.gain.setTargetAtTime(0, c.currentTime, 0.05); ng.gain.setTargetAtTime(0, c.currentTime, 0.05); o.stop(c.currentTime + 0.3); n.stop(c.currentTime + 0.3); } catch (e) { /* ignore */ } },
    };
  },
  voice(pitch, t0 = 0) {
    if (!this.ready || this.ctx.state !== 'running') return;
    const c = this.ctx, t = c.currentTime + t0;
    const forms = [[730, 1090], [270, 2290], [300, 870], [660, 1720], [520, 1190]];
    const fm = pick(forms), dur = rnd(0.05, 0.09);
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(pitch * rnd(0.9, 1.25), t);
    o.frequency.linearRampToValueAtTime(pitch * rnd(0.85, 1.3), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.01); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    for (const f of fm) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 6;
      o.connect(bp); bp.connect(g);
    }
    g.connect(this.voiceBus);
    o.start(t); o.stop(t + dur + 0.02);
  },
};

const SFX = {
  laser(t, v, p) { Snd.osc('square', 1500, 260, t, 0.13, 0.10 * v, null, p); Snd.osc('sawtooth', 900, 200, t, 0.09, 0.05 * v, null, p); },
  laser2(t, v, p) { Snd.osc('square', 1700, 300, t, 0.13, 0.09 * v, null, p); Snd.osc('square', 1420, 240, t + 0.012, 0.13, 0.08 * v, null, p); },
  hyper(t, v, p) { Snd.osc('sawtooth', 2200, 140, t, 0.2, 0.12 * v, null, p); Snd.osc('sine', 700, 90, t, 0.22, 0.16 * v, null, p); Snd.noiseBurst(t, 0.1, 0.06 * v, 5000, 800, 'highpass', 1, null, p); },
  enemyShot(t, v, p) { Snd.osc('triangle', 520, 180, t, 0.18, 0.09 * v, null, p); Snd.osc('square', 260, 120, t, 0.12, 0.04 * v, null, p); },
  chargeFire(t, v, p) { Snd.osc('sawtooth', 1200, 80, t, 0.5, 0.14 * v, null, p); Snd.noiseBurst(t, 0.4, 0.1 * v, 6000, 300, 'bandpass', 2, null, p); },
  lock(t, v, p, o) { const n = o.n || 0; Snd.osc('sine', 700 + n * 90, 1100 + n * 90, t, 0.07, 0.12 * v); Snd.osc('square', 1400 + n * 120, 1400 + n * 120, t, 0.04, 0.04 * v); },
  explosion(t, v, p) { Snd.noiseBurst(t, 0.45, 0.35 * v, 3200, 120, 'lowpass', 1, null, p); Snd.osc('sine', 150, 38, t, 0.35, 0.3 * v, null, p); },
  bigExplosion(t, v, p) { Snd.noiseBurst(t, 1.3, 0.5 * v, 2800, 60, 'lowpass', 1, null, p); Snd.osc('sine', 110, 25, t, 1.0, 0.5 * v, null, p); Snd.noiseBurst(t + 0.15, 0.8, 0.25 * v, 900, 90, 'bandpass', 1.5, null, p); },
  nova(t, v) { Snd.osc('sine', 90, 20, t, 1.6, 0.55 * v); Snd.noiseBurst(t, 1.5, 0.5 * v, 6000, 80, 'lowpass', 0.8); Snd.osc('sawtooth', 2400, 100, t, 0.7, 0.1 * v); },
  bombLaunch(t, v) { Snd.osc('sawtooth', 300, 900, t, 0.4, 0.12 * v); Snd.noiseBurst(t, 0.4, 0.1 * v, 800, 4000, 'bandpass', 2); },
  hit(t, v) { Snd.noiseBurst(t, 0.35, 0.4 * v, 4000, 200, 'lowpass', 1); Snd.osc('sawtooth', 220, 60, t, 0.3, 0.2 * v); Snd.osc('square', 90, 50, t, 0.25, 0.15 * v); },
  clink(t, v, p) { Snd.osc('triangle', 2400, 1800, t, 0.08, 0.1 * v, null, p); Snd.osc('square', 3200, 2800, t, 0.04, 0.04 * v, null, p); },
  hitEnemy(t, v, p) { Snd.osc('square', 420, 200, t, 0.06, 0.08 * v, null, p); Snd.noiseBurst(t, 0.06, 0.06 * v, 3000, 800, 'bandpass', 1, null, p); },
  roll(t, v) { Snd.noiseBurst(t, 0.5, 0.18 * v, 400, 3200, 'bandpass', 2); Snd.osc('sine', 380, 900, t, 0.45, 0.08 * v); },
  reflect(t, v, p) { Snd.osc('triangle', 1800, 3200, t, 0.12, 0.12 * v, null, p); Snd.osc('sine', 900, 1500, t, 0.12, 0.1 * v, null, p); },
  boost(t, v) { Snd.noiseBurst(t, 0.9, 0.22 * v, 300, 4500, 'bandpass', 1.5); Snd.osc('sawtooth', 80, 320, t, 0.8, 0.12 * v); },
  brake(t, v) { Snd.noiseBurst(t, 0.5, 0.15 * v, 3000, 300, 'bandpass', 1.5); },
  pickup(t, v) { [523, 659, 784, 1046].forEach((f, i) => Snd.osc('triangle', f, f, t + i * 0.06, 0.18, 0.14 * v)); },
  ring(t, v) { [880, 1175, 1568].forEach((f, i) => Snd.osc('sine', f, f * 1.01, t + i * 0.05, 0.2, 0.14 * v)); },
  goldRing(t, v) { [784, 988, 1175, 1568, 1976].forEach((f, i) => { Snd.osc('triangle', f, f, t + i * 0.07, 0.3, 0.15 * v); Snd.osc('sine', f * 2, f * 2, t + i * 0.07, 0.3, 0.05 * v); }); },
  heal(t, v) { [392, 523, 659, 784, 1046].forEach((f, i) => Snd.osc('sine', f, f, t + i * 0.05, 0.25, 0.14 * v)); },
  wing(t, v) { Snd.noiseBurst(t, 0.6, 0.35 * v, 5000, 300, 'bandpass', 1); Snd.osc('sawtooth', 600, 70, t, 0.5, 0.2 * v); Snd.osc('square', 300, 40, t + 0.1, 0.4, 0.12 * v); },
  alarm(t, v) { Snd.osc('square', 880, 880, t, 0.1, 0.08 * v); Snd.osc('square', 660, 660, t + 0.14, 0.1, 0.08 * v); },
  warning(t, v) { for (let i = 0; i < 3; i++) { Snd.osc('sawtooth', 440, 440, t + i * 0.45, 0.3, 0.14 * v); Snd.osc('sawtooth', 330, 330, t + i * 0.45 + 0.2, 0.22, 0.12 * v); } },
  radioOn(t, v) { Snd.noiseBurst(t, 0.09, 0.1 * v, 5000, 2500, 'bandpass', 3, Snd.voiceBus); Snd.osc('sine', 1900, 1900, t, 0.05, 0.06 * v, Snd.voiceBus); },
  radioOff(t, v) { Snd.noiseBurst(t, 0.08, 0.1 * v, 2500, 5000, 'bandpass', 3, Snd.voiceBus); Snd.osc('sine', 1400, 1400, t, 0.05, 0.05 * v, Snd.voiceBus); },
  uiMove(t, v) { Snd.osc('triangle', 660, 740, t, 0.05, 0.1 * v); },
  uiConfirm(t, v) { Snd.osc('square', 880, 1320, t, 0.09, 0.1 * v); Snd.osc('triangle', 1320, 1760, t + 0.06, 0.12, 0.1 * v); },
  uiBack(t, v) { Snd.osc('square', 520, 330, t, 0.1, 0.09 * v); },
  uiError(t, v) { Snd.osc('square', 180, 120, t, 0.16, 0.12 * v); },
  uturn(t, v) { Snd.noiseBurst(t, 0.9, 0.2 * v, 500, 3500, 'bandpass', 2); Snd.osc('sine', 300, 1200, t, 0.9, 0.08 * v); },
  stageStart(t, v) { [392, 523, 659, 784].forEach((f, i) => Snd.osc('sawtooth', f, f, t + i * 0.12, 0.4, 0.07 * v)); },
  fanfare(t, v) { [523, 523, 523, 659, 523, 659, 784].forEach((f, i) => { Snd.osc('square', f, f, t + i * 0.16, 0.22, 0.07 * v); Snd.osc('triangle', f / 2, f / 2, t + i * 0.16, 0.22, 0.09 * v); }); },
  gameOver(t, v) { [392, 349, 311, 262].forEach((f, i) => Snd.osc('sawtooth', f, f * 0.97, t + i * 0.4, 0.5, 0.09 * v)); },
  missile(t, v, p) { Snd.noiseBurst(t, 0.25, 0.14 * v, 1200, 5000, 'bandpass', 2, null, p); Snd.osc('sawtooth', 500, 1400, t, 0.25, 0.07 * v, null, p); },
  stomp(t, v, p) { Snd.osc('sine', 80, 28, t, 0.5, 0.5 * v, null, p); Snd.noiseBurst(t, 0.4, 0.2 * v, 600, 80, 'lowpass', 1, null, p); },
  beam(t, v, p) { Snd.osc('sawtooth', 220, 330, t, 1.2, 0.1 * v, null, p); Snd.osc('square', 110, 165, t, 1.2, 0.08 * v, null, p); },
};

// ---------------------------------------------------------------- procedural music
const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  mixo: [0, 2, 4, 5, 7, 9, 10], phryg: [0, 1, 3, 5, 7, 8, 10], lyd: [0, 2, 4, 6, 7, 9, 11],
};
const N = null;
const TRACKS = {
  title: {
    bpm: 88, root: 50, scale: 'minor', prog: [0, -4, -2, -5], lw: 'triangle', bw: 'sawtooth',
    bass: [0, N, N, N, 0, N, 7, N, 0, N, N, N, 0, N, 7, N],
    lead: [4, N, N, N, 5, N, 4, N, 2, N, N, N, 0, N, N, N, 4, N, N, N, 7, N, 6, N, 4, N, N, N, 2, N, N, N],
    arp: [0, 2, 4, 7], drums: { k: 'x.......x.......', s: '........x.......', h: 'x.x.x.x.x.x.x.x.' },
  },
  map: {
    bpm: 100, root: 53, scale: 'dorian', prog: [0, 3, -2, 5], lw: 'sine', bw: 'triangle',
    bass: [0, N, N, N, N, N, 0, N, 5, N, N, N, N, N, 3, N],
    lead: [N, N, 4, N, N, N, 2, N, 0, N, N, N, 2, N, N, N, N, N, 4, N, N, N, 5, N, 7, N, N, N, 4, N, N, N],
    arp: [0, 2, 4, 6], drums: { k: 'x.....x.x.......', s: '....x.......x...', h: '..x...x...x...x.' },
  },
  stage1: {
    bpm: 142, root: 50, scale: 'mixo', prog: [0, 0, 5, 7], lw: 'square', bw: 'sawtooth',
    bass: [0, 0, N, 0, 7, N, 0, N, 0, 0, N, 0, 5, N, 7, N],
    lead: [7, N, 9, N, 11, N, 9, 7, 9, N, N, N, 4, N, 5, 7, 9, N, 11, N, 14, N, 11, 9, 7, N, N, N, 4, N, 2, N],
    arp: [0, 2, 4, 2], drums: { k: 'x...x...x..x.x..', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx' },
  },
  stage2: {
    bpm: 148, root: 45, scale: 'minor', prog: [0, 0, -4, -2], lw: 'sawtooth', bw: 'square',
    bass: [0, N, 0, 0, N, 0, 12, N, 0, N, 0, 0, N, 7, N, 5],
    lead: [N, N, 7, N, 7, 8, 7, N, 5, N, 3, N, 2, N, N, N, 7, N, 10, N, 9, 8, 7, N, 8, N, 7, N, 5, N, N, N],
    arp: [0, 2, 4, 7], drums: { k: 'x..xx..xx..x.x..', s: '....x.......x..x', h: 'x.x.x.x.x.x.xxxx' },
  },
  stage2b: {
    bpm: 154, root: 47, scale: 'phryg', prog: [0, 1, 0, -2], lw: 'sawtooth', bw: 'sawtooth',
    bass: [0, 0, N, 12, 0, N, 1, N, 0, 0, N, 12, 0, N, 3, N],
    lead: [4, N, N, 3, N, N, 1, N, 0, N, 1, N, 3, N, N, N, 4, N, N, 5, N, N, 4, N, 3, N, 1, N, 0, N, N, N],
    arp: [0, 3, 4, 6], drums: { k: 'x.x...x.x.x...x.', s: '....x..x....x...', h: 'xxxxxxxxxxxxxxxx' },
  },
  stage3: {
    bpm: 150, root: 48, scale: 'dorian', prog: [0, 3, 5, 3], lw: 'sawtooth', bw: 'square',
    bass: [0, N, 0, 7, 0, N, 0, 5, 0, N, 0, 7, 0, N, 3, 5],
    lead: [7, N, N, 9, 10, N, 9, N, 7, N, 5, N, 4, N, N, N, 9, N, N, 10, 12, N, 10, N, 9, N, 7, N, 5, N, 4, N],
    arp: [0, 2, 4, 6], drums: { k: 'x...x...x...x..x', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xx' },
  },
  boss: {
    bpm: 168, root: 43, scale: 'minor', prog: [0, 0, 1, -2], lw: 'sawtooth', bw: 'square',
    bass: [0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 0, 5, 5, 7, 7],
    lead: [N, N, N, N, 7, N, 7, N, 8, N, 7, N, 4, N, N, N, N, N, N, N, 7, N, 7, N, 10, N, 9, N, 8, N, N, N],
    arp: [0, 2, 4, 6], drums: { k: 'x.x.x.x.x.x.x.xx', s: '....x.......x.x.', h: 'xxxxxxxxxxxxxxxx' },
  },
  victory: {
    bpm: 120, root: 55, scale: 'major', prog: [0, 5, 7, 0], lw: 'square', bw: 'triangle', once: true,
    bass: [0, N, N, N, 7, N, N, N, 0, N, N, N, 7, N, N, N],
    lead: [7, N, 9, N, 11, N, 14, N, N, N, 11, N, 14, N, N, N, 12, N, 11, N, 9, N, 7, N, 9, N, 14, N, N, N, N, N],
    arp: [0, 2, 4, 2], drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  },
  gameover: {
    bpm: 70, root: 45, scale: 'minor', prog: [0, -2, -4, -5], lw: 'triangle', bw: 'sine', once: true,
    bass: [0, N, N, N, N, N, N, N, 0, N, N, N, N, N, N, N],
    lead: [4, N, N, N, N, N, 2, N, N, N, 0, N, N, N, N, N],
    arp: [0, 2, 4], drums: { k: 'x...............', s: '................', h: '................' },
  },
};

const Music = {
  cur: null, name: null, step: 0, nextT: 0, timer: null, pending: null, gain: null, intensity: 1,
  resumePending() { if (this.pending) { const p = this.pending; this.pending = null; this.play(p); } },
  stop(fade = 0.4) {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.gain && Snd.ready) { const g = this.gain, t = Snd.ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, fade / 3); setTimeout(() => { try { g.disconnect(); } catch (e) { /* ignore */ } }, fade * 1000 + 300); }
    this.gain = null; this.cur = null; this.name = null;
  },
  play(name) {
    if (this.name === name) return;
    if (!Snd.ready) { this.pending = name; return; }
    this.stop(0.5);
    const tr = TRACKS[name];
    if (!tr) return;
    this.name = name; this.cur = tr; this.step = 0;
    this.gain = Snd.ctx.createGain(); this.gain.gain.value = 1; this.gain.connect(Snd.musicBus);
    this.nextT = Snd.ctx.currentTime + 0.12;
    this.timer = setInterval(() => this.tick(), 30);
  },
  tick() {
    const tr = this.cur;
    if (!tr || !Snd.ready) return;
    const spb = 60 / tr.bpm / 4;
    while (this.nextT < Snd.ctx.currentTime + 0.15) {
      this.sched(tr, this.step, this.nextT, spb);
      this.nextT += spb; this.step++;
      if (tr.once && this.step >= 64) { this.stop(1.5); return; }
    }
  },
  sched(tr, step, t, spb) {
    const sc = SCALES[tr.scale], bar = Math.floor(step / 16) % tr.prog.length, s16 = step % 16, root = tr.root + tr.prog[bar];
    const deg = (d) => sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    const out = this.gain;
    const d = tr.drums;
    if (d.k[s16] === 'x') this.kick(t, out);
    if (d.s[s16] === 'x') this.snare(t, out);
    if (d.h[s16] === 'x' && (this.intensity > 0.3 || tr.once)) this.hat(t, out, s16 % 4 === 2 ? 0.07 : 0.045);
    const b = tr.bass[s16];
    if (b !== N && b !== undefined) this.note(tr.bw, midiHz(root - 12 + b), t, spb * 1.7, 0.22, out, 600);
    const ln = tr.lead.length, l = tr.lead[step % ln];
    if (l !== N && l !== undefined && (this.intensity > 0.2 || tr.once)) {
      const f = midiHz(root + 12 + deg(l) + (tr.prog[bar] ? 0 : 0));
      this.note(tr.lw, f, t, spb * 2.2, 0.11, out, 3200);
      this.note(tr.lw, f * 1.006, t, spb * 2.2, 0.05, out, 3200);
    }
    if (tr.arp && this.intensity > 0.5) {
      const a = tr.arp[s16 % tr.arp.length];
      this.note('triangle', midiHz(root + 24 + deg(a)), t, spb * 0.9, 0.05, out, 4000);
    }
  },
  note(type, f, t, dur, vol, out, cutoff) {
    const c = Snd.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
    o.type = type; o.frequency.value = f;
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(cutoff, t); fl.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff * 0.3), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  },
  kick(t, out) { Snd.osc('sine', 150, 42, t, 0.22, 0.55, out); },
  snare(t, out) { Snd.noiseBurst(t, 0.16, 0.22, 3500, 1200, 'bandpass', 0.8, out); Snd.osc('triangle', 220, 140, t, 0.1, 0.12, out); },
  hat(t, out, v) { Snd.noiseBurst(t, 0.04, v, 9000, 7000, 'highpass', 1, out); },
};
