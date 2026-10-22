'use strict';
/* ===== Audio: fully procedural WebAudio synth (SFX, voice blips, step-sequenced music) ===== */
const MUSIC = {
  title:  { bpm: 92,  root: 45, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 3, 4], arp: [0, 2, 4, 2, 7, 4, 2, 4, 0, 2, 4, 7, 9, 7, 4, 2], kick: 'x...x...x...x..x', snare: '....x.......x...', hat: '..x...x...x...x.', wave: 'triangle', lead: [7, 0, 0, 9, 0, 7, 0, 4, 5, 0, 0, 7, 0, 4, 0, 0] },
  canyon: { bpm: 138, root: 40, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 4, 5, 3], arp: [0, 4, 7, 4, 2, 5, 9, 5, 0, 4, 7, 11, 9, 7, 4, 2], kick: 'x...x...x..xx...', snare: '....x.......x..x', hat: 'x.x.x.x.x.x.x.xx', wave: 'sawtooth', lead: [7, 0, 9, 0, 11, 0, 9, 7, 4, 0, 7, 0, 9, 0, 7, 0] },
  space:  { bpm: 126, root: 38, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 0, 5, 6], arp: [0, 3, 7, 10, 7, 3, 0, 3, 5, 8, 12, 8, 7, 5, 3, 2], kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: '.xx..xx..xx..xx.', wave: 'square', lead: [0, 0, 12, 0, 0, 10, 0, 7, 0, 0, 8, 0, 7, 0, 5, 0] },
  boss:   { bpm: 152, root: 38, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 0, 1, 0, 5, 5, 1, 6], arp: [0, 7, 0, 7, 3, 10, 3, 10, 0, 7, 0, 8, 7, 5, 3, 1], kick: 'x.x.x.x.x.x.x.xx', snare: '....x.......x.x.', hat: 'xxxxxxxxxxxxxxxx', wave: 'sawtooth', lead: [12, 0, 0, 12, 13, 0, 12, 0, 10, 0, 0, 8, 7, 0, 8, 0] },
  win:    { bpm: 110, root: 48, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 3, 4, 0], arp: [0, 4, 7, 12, 7, 4, 0, 4, 2, 5, 9, 14, 9, 5, 2, 5], kick: 'x...x...x...x...', snare: '................', hat: '..x...x...x...x.', wave: 'triangle', lead: [12, 0, 11, 0, 9, 0, 7, 0, 9, 0, 11, 0, 12, 0, 0, 0] },
};
const Audio = {
  ctx: null, master: null, musicGain: null, sfxGain: null, noiseBuf: null, track: null, step: 0, nextT: 0, timer: null, charge: null, alarmT: 0,
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.9;
      const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
      this.master.connect(comp); comp.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master); this.sfxGain.connect(this.master);
      const n = this.ctx.sampleRate * 1.5, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b;
      this.applyVolumes();
    } catch (e) { this.ctx = null; return false; }
    if (this.trackName) { const n = this.trackName; this.trackName = null; this.music(n); }
    return true;
  },
  applyVolumes() { if (!this.ctx) return; this.musicGain.gain.value = Settings.music * 0.35; this.sfxGain.gain.value = Settings.sfx; },
  tone(o) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + (o.atk || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(o.dest || this.sfxGain);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  },
  noise(o) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = o.ftype || 'lowpass';
    f.frequency.setValueAtTime(o.f0 || 2000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    const g = c.createGain();
    g.gain.setValueAtTime(o.vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.dest || this.sfxGain);
    src.start(t, Math.random()); src.stop(t + o.dur + 0.05);
  },
  sfx(name, v = 1) {
    if (!this.ctx) return;
    switch (name) {
      case 'laser': this.tone({ type: 'sawtooth', f0: 1400, f1: 260, dur: 0.14, vol: 0.12 * v }); this.tone({ type: 'square', f0: 700, f1: 200, dur: 0.1, vol: 0.06 * v }); break;
      case 'laser2': this.tone({ type: 'sawtooth', f0: 1800, f1: 300, dur: 0.16, vol: 0.13 * v }); this.tone({ type: 'sawtooth', f0: 1500, f1: 240, dur: 0.16, vol: 0.08 * v, delay: 0.02 }); break;
      case 'laser3': this.tone({ type: 'sawtooth', f0: 2200, f1: 200, dur: 0.2, vol: 0.14 * v }); this.noise({ dur: 0.12, vol: 0.1 * v, f0: 6000, f1: 800, ftype: 'bandpass' }); break;
      case 'enemyShot': this.tone({ type: 'square', f0: 520, f1: 130, dur: 0.18, vol: 0.06 * v }); break;
      case 'lock': this.tone({ type: 'sine', f0: 1100 + 80 * v, dur: 0.07, vol: 0.12 }); break;
      case 'chargeFire': this.tone({ type: 'sawtooth', f0: 300, f1: 2400, dur: 0.1, vol: 0.12 }); this.tone({ type: 'sawtooth', f0: 2400, f1: 120, dur: 0.4, vol: 0.14, delay: 0.1 }); this.noise({ dur: 0.35, vol: 0.12, f0: 5000, f1: 300, delay: 0.05 }); break;
      case 'bomb': this.noise({ dur: 1.6, vol: 0.7, f0: 900, f1: 40 }); this.tone({ type: 'sine', f0: 120, f1: 30, dur: 1.2, vol: 0.5 }); this.tone({ type: 'sawtooth', f0: 60, f1: 900, dur: 0.5, vol: 0.12 }); break;
      case 'explode': this.noise({ dur: 0.5 + 0.2 * v, vol: 0.3 * Math.min(v, 1.6), f0: 1800, f1: 60 }); this.tone({ type: 'sine', f0: 140, f1: 35, dur: 0.4, vol: 0.25 * Math.min(v, 1.6) }); break;
      case 'bigExplode': this.noise({ dur: 2, vol: 0.7, f0: 1200, f1: 30 }); this.tone({ type: 'sine', f0: 90, f1: 20, dur: 1.5, vol: 0.6 }); break;
      case 'hit': this.noise({ dur: 0.3, vol: 0.4, f0: 3000, f1: 200, ftype: 'bandpass' }); this.tone({ type: 'square', f0: 200, f1: 60, dur: 0.25, vol: 0.2 }); break;
      case 'deflect': this.tone({ type: 'triangle', f0: 900, f1: 1800, dur: 0.12, vol: 0.14 }); this.tone({ type: 'sine', f0: 2400, f1: 1200, dur: 0.2, vol: 0.1, delay: 0.04 }); break;
      case 'ping': this.tone({ type: 'square', f0: 300, f1: 180, dur: 0.05, vol: 0.05 }); break;
      case 'roll': this.noise({ dur: 0.5, vol: 0.2, f0: 500, f1: 4000, ftype: 'bandpass' }); break;
      case 'ring': this.tone({ type: 'triangle', f0: 880, dur: 0.12, vol: 0.2 }); this.tone({ type: 'triangle', f0: 1320, dur: 0.25, vol: 0.2, delay: 0.09 }); break;
      case 'pickup': for (let i = 0; i < 4; i++) this.tone({ type: 'square', f0: 520 * Math.pow(1.26, i), dur: 0.12, vol: 0.12, delay: i * 0.06 }); break;
      case 'boost': this.noise({ dur: 0.8, vol: 0.25, f0: 300, f1: 3000 }); break;
      case 'brake': this.noise({ dur: 0.5, vol: 0.18, f0: 3000, f1: 300 }); break;
      case 'alarm': this.tone({ type: 'square', f0: 880, dur: 0.12, vol: 0.12 }); this.tone({ type: 'square', f0: 660, dur: 0.12, vol: 0.12, delay: 0.16 }); break;
      case 'squad': for (let i = 0; i < 6; i++) this.tone({ type: 'sawtooth', f0: 400 + i * 160, f1: 200, dur: 0.18, vol: 0.1, delay: i * 0.05 }); break;
      case 'menuMove': this.tone({ type: 'square', f0: 660, dur: 0.045, vol: 0.07 }); break;
      case 'menuOk': this.tone({ type: 'square', f0: 660, dur: 0.07, vol: 0.1 }); this.tone({ type: 'square', f0: 990, dur: 0.14, vol: 0.1, delay: 0.06 }); break;
      case 'menuBack': this.tone({ type: 'square', f0: 520, f1: 330, dur: 0.12, vol: 0.09 }); break;
      case 'launch': this.noise({ dur: 2.5, vol: 0.4, f0: 200, f1: 2500 }); this.tone({ type: 'sawtooth', f0: 70, f1: 400, dur: 2, vol: 0.2 }); break;
      case 'win': for (let i = 0; i < 6; i++) this.tone({ type: 'triangle', f0: 440 * Math.pow(2, [0, 4, 7, 12, 16, 19][i] / 12), dur: 0.4, vol: 0.14, delay: i * 0.12 }); break;
      case 'lose': for (let i = 0; i < 4; i++) this.tone({ type: 'sawtooth', f0: 330 * Math.pow(0.84, i), f1: 100, dur: 0.6, vol: 0.14, delay: i * 0.25 }); break;
    }
  },
  startCharge() { if (!this.ctx || this.charge) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 180; g.gain.value = 0.0001; o.connect(g); g.connect(this.sfxGain); o.start(); this.charge = { o, g }; },
  setCharge(k) { if (!this.charge) return; this.charge.o.frequency.value = 180 + k * 900; this.charge.g.gain.value = 0.03 + k * 0.05; },
  stopCharge() { if (!this.charge) return; try { this.charge.o.stop(); } catch (e) { /* */ } this.charge = null; },
  /** character "animalese" blips for comms */
  voice(pitch) {
    if (!this.ctx || !Settings.voice) return;
    this.tone({ type: 'square', f0: pitch * rand(0.85, 1.25), dur: 0.05, vol: 0.05, dest: this.sfxGain });
  },
  music(name) {
    if (name === this.trackName) return;
    this.trackName = name; this.track = name ? MUSIC[name] : null; this.step = 0;
    if (!this.ctx) return;
    this.nextT = this.ctx.currentTime + 0.1;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 40);
  },
  schedule() {
    if (!this.ctx || !this.track) return;
    const tr = this.track, spb = 60 / tr.bpm / 4;
    while (this.nextT < this.ctx.currentTime + 0.2) {
      const s = this.step % 16, bar = Math.floor(this.step / 16) % tr.prog.length, t = this.nextT - this.ctx.currentTime;
      const deg = tr.prog[bar], sc = tr.scale;
      const note = (d) => { const o = Math.floor(d / 7); return tr.root + 12 * o + sc[((d % 7) + 7) % 7]; };
      const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
      if (tr.kick[s] === 'x') { this.tone({ type: 'sine', f0: 150, f1: 40, dur: 0.18, vol: 0.5, delay: t, dest: this.musicGain }); }
      if (tr.snare[s] === 'x') { this.noise({ dur: 0.14, vol: 0.25, f0: 3500, f1: 1500, ftype: 'highpass', delay: t, dest: this.musicGain }); }
      if (tr.hat[s] === 'x') { this.noise({ dur: 0.04, vol: 0.1, f0: 8000, ftype: 'highpass', delay: t, dest: this.musicGain }); }
      if (s % 2 === 0) { this.tone({ type: 'sawtooth', f0: hz(note(deg) - 12), dur: spb * 1.8, vol: 0.2, delay: t, dest: this.musicGain }); }
      this.tone({ type: tr.wave, f0: hz(note(deg + tr.arp[s] % 7) + 12 * Math.floor(tr.arp[s] / 7) + 12), dur: spb * 0.9, vol: 0.09, delay: t, dest: this.musicGain });
      const l = tr.lead[s];
      if (l) this.tone({ type: 'triangle', f0: hz(note(deg + l % 7) + 24 + 12 * Math.floor(l / 7)), dur: spb * 2.2, vol: 0.13, delay: t, atk: 0.02, dest: this.musicGain });
      this.nextT += spb; this.step++;
    }
  },
};
