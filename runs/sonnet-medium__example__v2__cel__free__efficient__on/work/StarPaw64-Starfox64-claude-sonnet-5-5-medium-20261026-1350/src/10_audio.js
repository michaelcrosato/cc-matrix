// ---------------------------------------------------------------- Web Audio: procedural SFX + sequenced music
const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);
const A = {
  ctx: null, master: null, music: null, sfx: null, noiseBuf: null, loops: {},
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.music = c.createGain(); this.sfx = c.createGain();
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    this.music.connect(this.master); this.sfx.connect(this.master); this.master.connect(comp); comp.connect(c.destination);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf; this.applyVolumes();
  },
  unlock() { this.init(); if (this.ctx && this.ctx.state !== 'running') { this.ctx.resume(); if (!this.warned) setTimeout(() => { if (this.ctx.state !== 'running' && !this.warned) { this.warned = true; UI.toast('Sound is blocked by the browser. Click or press a key once to enable audio.'); } }, 600); } if (this.ctx && Music.pending) { const n = Music.pending; Music.pending = null; Music.play(n); } },
  applyVolumes() { if (!this.ctx) return; this.master.gain.value = Settings.master; this.music.gain.value = Settings.music * 0.55; this.sfx.gain.value = Settings.sfx; },
  tone(o) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (o.when || 0), osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'square'; osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.dur);
    if (o.det) osc.detune.value = o.det;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol || 0.2), t + (o.attack || 0.004));
    if (o.hold) g.gain.setValueAtTime(o.vol || 0.2, t + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let n = osc;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t); if (o.lp1) f.frequency.exponentialRampToValueAtTime(o.lp1, t + o.dur); osc.connect(f); n = f; }
    n.connect(g); let out = g;
    if (o.pan) { const p = c.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); out = p; }
    out.connect(o.bus || this.sfx); osc.start(t); osc.stop(t + o.dur + 0.05);
  },
  noise(o) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (o.when || 0), s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = this.noiseBuf; f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.f0 || 2000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    f.Q.value = o.q || 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol || 0.3), t + (o.attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    s.connect(f); f.connect(g); let out = g;
    if (o.pan) { const p = c.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); out = p; }
    out.connect(o.bus || this.sfx); s.start(t, Math.random() * 1.5, o.dur + 0.05);
  },
  // named sound effects; opts.pan in -1..1
  play(name, p = 0, v = 1) {
    if (!this.ctx) return; const pan = p;
    switch (name) {
      case 'laser': this.tone({ type: 'square', f0: 1500, f1: 260, dur: 0.13, vol: 0.12 * v, pan }); this.tone({ type: 'sawtooth', f0: 900, f1: 180, dur: 0.1, vol: 0.07 * v, pan }); break;
      case 'laser2': this.tone({ type: 'square', f0: 1800, f1: 300, dur: 0.12, vol: 0.1 * v, pan }); this.tone({ type: 'square', f0: 2400, f1: 500, dur: 0.14, vol: 0.06 * v, pan, when: 0.03 }); this.tone({ type: 'sawtooth', f0: 700, f1: 120, dur: 0.16, vol: 0.08 * v, pan }); break;
      case 'laser3': this.tone({ type: 'sawtooth', f0: 2200, f1: 200, dur: 0.18, vol: 0.12 * v, pan }); this.tone({ type: 'square', f0: 1200, f1: 150, dur: 0.2, vol: 0.1 * v, pan }); this.noise({ type: 'highpass', f0: 3000, dur: 0.08, vol: 0.08 * v, pan }); break;
      case 'enemyShot': this.tone({ type: 'triangle', f0: 520, f1: 190, dur: 0.18, vol: 0.12 * v, pan }); this.tone({ type: 'square', f0: 260, f1: 120, dur: 0.12, vol: 0.05 * v, pan }); break;
      case 'lock': this.tone({ type: 'square', f0: 700 + (v * 160), f1: 1200 + v * 160, dur: 0.07, vol: 0.09 }); break;
      case 'chargeShot': this.noise({ type: 'bandpass', f0: 500, f1: 4000, q: 2, dur: 0.35, vol: 0.25, pan }); this.tone({ type: 'sawtooth', f0: 300, f1: 1800, dur: 0.3, vol: 0.12, pan }); this.tone({ type: 'sine', f0: 140, f1: 60, dur: 0.35, vol: 0.3, pan }); break;
      case 'boom': this.noise({ type: 'lowpass', f0: 3200, f1: 120, dur: 0.55, vol: 0.5 * v, pan }); this.tone({ type: 'sine', f0: 130, f1: 30, dur: 0.5, vol: 0.5 * v, pan }); break;
      case 'smallboom': this.noise({ type: 'lowpass', f0: 4200, f1: 300, dur: 0.3, vol: 0.32 * v, pan }); this.tone({ type: 'sine', f0: 180, f1: 50, dur: 0.25, vol: 0.28 * v, pan }); break;
      case 'bigboom': this.noise({ type: 'lowpass', f0: 2600, f1: 60, dur: 1.5, vol: 0.7, pan, attack: 0.01 }); this.tone({ type: 'sine', f0: 90, f1: 20, dur: 1.4, vol: 0.7, pan }); this.noise({ type: 'bandpass', f0: 900, f1: 120, q: 1, dur: 1, vol: 0.3, pan, when: 0.15 }); break;
      case 'bomb': this.tone({ type: 'sawtooth', f0: 80, f1: 900, dur: 0.5, vol: 0.2 }); this.noise({ type: 'lowpass', f0: 5000, f1: 80, dur: 1.8, vol: 0.8, when: 0.35 }); this.tone({ type: 'sine', f0: 100, f1: 20, dur: 1.6, vol: 0.8, when: 0.35 }); break;
      case 'hurt': this.noise({ type: 'lowpass', f0: 1800, f1: 200, dur: 0.35, vol: 0.5 }); this.tone({ type: 'square', f0: 200, f1: 70, dur: 0.3, vol: 0.25 }); break;
      case 'clang': this.tone({ type: 'square', f0: 1400, f1: 900, dur: 0.07, vol: 0.12 * v, pan }); this.tone({ type: 'triangle', f0: 2100, f1: 1600, dur: 0.09, vol: 0.1 * v, pan }); break;
      case 'hit': this.tone({ type: 'square', f0: 330, f1: 220, dur: 0.05, vol: 0.1 * v, pan }); this.noise({ type: 'highpass', f0: 2500, dur: 0.05, vol: 0.1 * v, pan }); break;
      case 'ring': [660, 830, 990, 1320].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.18, vol: 0.18, when: i * 0.055, pan })); break;
      case 'gold': [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: 0.25, vol: 0.1, when: i * 0.06, pan })); break;
      case 'item': [440, 554, 659, 880].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: 0.14, vol: 0.1, when: i * 0.05, pan })); break;
      case 'roll': this.noise({ type: 'bandpass', f0: 600, f1: 2600, q: 1.5, dur: 0.5, vol: 0.28, pan, attack: 0.08 }); break;
      case 'boost': this.noise({ type: 'bandpass', f0: 300, f1: 2400, q: 0.8, dur: 0.7, vol: 0.3, attack: 0.1 }); break;
      case 'brake': this.noise({ type: 'bandpass', f0: 2000, f1: 250, q: 0.8, dur: 0.6, vol: 0.22, attack: 0.05 }); break;
      case 'uturn': this.noise({ type: 'bandpass', f0: 400, f1: 3000, q: 2, dur: 0.9, vol: 0.3, attack: 0.1 }); this.tone({ type: 'sawtooth', f0: 200, f1: 700, dur: 0.8, vol: 0.06 }); break;
      case 'warn': this.tone({ type: 'square', f0: 880, dur: 0.14, vol: 0.12 }); this.tone({ type: 'square', f0: 660, dur: 0.14, vol: 0.12, when: 0.18 }); break;
      case 'tail': this.tone({ type: 'square', f0: 1200, dur: 0.07, vol: 0.1 }); this.tone({ type: 'square', f0: 1200, dur: 0.07, vol: 0.1, when: 0.12 }); break;
      case 'ui_move': this.tone({ type: 'square', f0: 620, f1: 700, dur: 0.05, vol: 0.09 }); break;
      case 'ui_ok': this.tone({ type: 'square', f0: 520, dur: 0.07, vol: 0.1 }); this.tone({ type: 'square', f0: 780, dur: 0.12, vol: 0.1, when: 0.07 }); break;
      case 'ui_back': this.tone({ type: 'square', f0: 520, f1: 330, dur: 0.12, vol: 0.1 }); break;
      case 'ui_err': this.tone({ type: 'square', f0: 160, dur: 0.14, vol: 0.12 }); break;
      case 'ui_tab': this.tone({ type: 'triangle', f0: 900, f1: 1100, dur: 0.07, vol: 0.12 }); break;
      case 'radio': this.noise({ type: 'bandpass', f0: 2200, q: 3, dur: 0.07, vol: 0.12 }); this.tone({ type: 'sine', f0: 1800, dur: 0.05, vol: 0.05 }); break;
      case 'stage': [392, 523, 659, 784].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: 0.3, vol: 0.12, when: i * 0.09, lp: 3000 })); break;
      case 'respawn': this.tone({ type: 'sawtooth', f0: 200, f1: 1200, dur: 0.5, vol: 0.12 }); break;
      case 'medal': [784, 988, 1175, 1568].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.4, vol: 0.2, when: i * 0.1 })); break;
      case 'shield': this.tone({ type: 'sine', f0: 300, f1: 900, dur: 0.25, vol: 0.2 }); this.noise({ type: 'bandpass', f0: 3000, dur: 0.2, vol: 0.12 }); break;
      case 'beam': this.noise({ type: 'bandpass', f0: 1200, f1: 700, q: 4, dur: 0.7, vol: 0.4, pan }); this.tone({ type: 'sawtooth', f0: 110, f1: 100, dur: 0.7, vol: 0.2, pan }); break;
      case 'stomp': this.tone({ type: 'sine', f0: 110, f1: 25, dur: 0.6, vol: 0.7 }); this.noise({ type: 'lowpass', f0: 800, f1: 60, dur: 0.7, vol: 0.5 }); break;
    }
  },
  // voice-ish blips for the comm window; one per printed character
  blip(who, code) {
    if (!this.ctx) return;
    const base = { hop: 150, pip: 430, rook: 290, biscuit: 210, gnarl: 95, claw: 125, dottie: 350, hero: 260 }[who] || 250;
    const f = base * (1 + ((code * 37) % 9) / 14);
    this.tone({ type: who === 'gnarl' || who === 'claw' ? 'sawtooth' : 'square', f0: f, f1: f * 0.92, dur: 0.045, vol: 0.05, lp: 2400 });
  },
  // continuous loops: engine hum and charge whine
  loopStart(name, type, f, vol) {
    if (!this.ctx || this.loops[name]) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
    o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 600; g.gain.value = 0.0001;
    o.connect(fl); fl.connect(g); g.connect(this.sfx); o.start(); this.loops[name] = { o, g, fl, vol };
  },
  loopSet(name, f, gain, lp) {
    const L = this.loops[name]; if (!L) return; const t = this.ctx.currentTime;
    L.o.frequency.setTargetAtTime(f, t, 0.05); L.g.gain.setTargetAtTime(gain * L.vol, t, 0.05); if (lp) L.fl.frequency.setTargetAtTime(lp, t, 0.05);
  },
  loopStop(name) { const L = this.loops[name]; if (!L) return; L.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05); L.o.stop(this.ctx.currentTime + 0.4); delete this.loops[name]; },
};

// ---- music sequencer. Tracks are tiny data: chord-per-bar progression + pattern strings.
const CHORDS = { M: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], s: [0, 5, 7], d: [0, 3, 6], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10] };
const TRACKS = {
  title: { bpm: 104, key: 57, prog: [[45, 'm'], [41, 'M'], [48, 'M'], [43, 'M'], [45, 'm'], [41, 'M'], [40, '7'], [40, '7']],
    bass: ['x..xx..xx..xx.o.', 'x..xx..xx..xx.o.'], arp: ['0.12.1.20.12.1.2'], pad: true,
    kick: 'x...x...x...x..x', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xx',
    lead: ['0 . . . 7 . . . 12 - - - 10 . 7 .', '8 . . . 12 . . . 15 - - - 12 . 8 .', '7 . . . 12 . . . 14 - - - 12 . 7 .', '7 . 10 . 14 - - - 12 - - - . . . .',
           '0 . 3 . 7 . 12 . 15 - - - 14 . 12 .', '8 . 12 . 15 . 12 . 20 - - - 15 . 12 .', '14 - . 12 14 - . 12 16 - - - 15 . 12 .', '14 - - - 12 - - - 11 - - - . . . .'] },
  stage1: { bpm: 134, key: 52, prog: [[40, 'm'], [36, 'M'], [43, 'M'], [38, 'M'], [40, 'm'], [36, 'M'], [43, 'M'], [47, '7']],
    bass: ['x.xxx.xxx.xxx.xo', 'x.xxx.xxx.xxo.xx'], arp: ['0102.1.20102.1.2', '0120.2.10120.2.1'], pad: true,
    kick: 'x..xx..xx..xx..x', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx',
    lead: ['12 . 12 . 14 . 12 . 7 . . . 10 . 12 .', '12 . 12 . 16 . 14 . 12 . . . 7 . 9 .', '14 . 14 . 19 . 17 . 14 . . . 12 . 14 .', '14 . 12 . 11 . 14 - 12 - - - . . . .',
           '19 . 19 . 16 . 14 . 12 . . . 14 . 16 .', '19 . 17 . 16 . 12 . 9 . . . 12 . 16 .', '17 . 17 . 14 . 19 - 17 . . . 14 . 17 .', '19 - - - 18 - 16 - 14 - - - . . . .'] },
  boss: { bpm: 152, key: 50, prog: [[38, 'm'], [38, 'm'], [34, 'M'], [35, 'd'], [38, 'm'], [41, 'M'], [40, 'd'], [37, '7']],
    bass: ['xxoxxoxxxxoxxoxx', 'xxxxoxxxxxxxoxxo'], arp: ['0.1.2.1.0.1.2.12', '0.2.1.2.0.2.1.20'], pad: false,
    kick: 'x.x.x..xx.x.x..x', snare: '....x..x....x.x.', hat: 'xxxxxxxxxxxxxxxx',
    lead: ['0 . 0 . 3 . 0 . 5 . 3 . 0 . . .', '0 . 0 . 3 . 6 . 5 - 3 - 0 - . .', '-2 . -2 . 1 . -2 . 3 . 1 . -2 . . .', '-1 . 2 . 5 . 2 . 5 - - - 6 - - -'] },
  allrange: { bpm: 146, key: 55, prog: [[43, 'm'], [39, 'M'], [46, 'M'], [41, 'M'], [43, 'm'], [39, 'M'], [41, 'M'], [42, 'd']],
    bass: ['x.xx.xxox.xx.xxo', 'x.x.xx.ox.x.xx.o'], arp: ['0.12.1.20.12.1.2', '0.21.2.10.21.2.1'], pad: true,
    kick: 'x..x..x.x..x..x.', snare: '....x.......x..x', hat: 'x.x.x.x.x.x.x.xx',
    lead: ['12 . . 12 14 . 12 . 7 . . . 10 . . .', '15 . . 15 17 . 15 . 12 . . . 10 . . .', '14 . . 14 15 . 14 . 10 . . . 12 . . .', '12 . 14 . 17 . 14 - 12 - - - . . . .',
           '19 . . 19 17 . 15 . 12 . . . 15 . . .', '19 . . 19 20 . 19 . 15 . . . 12 . . .', '17 . . 17 15 . 12 . 10 . . . 14 . . .', '15 - 14 - 12 - 11 - 12 - - - . . . .'] },
  calm: { bpm: 92, key: 60, prog: [[48, 'M7'], [45, 'm7'], [41, 'M7'], [43, '7']], bass: ['x.......o.......'], arp: ['0.1.2.1.0.1.2.1.'], pad: true,
    kick: 'x.......x.......', snare: '................', hat: '..x...x...x...x.',
    lead: ['0 . . . 4 . . . 7 . . . 11 - - -', '-3 . . . 0 . . . 4 . . . 9 - - -', '-7 . . . -3 . . . 0 . . . 4 - - -', '-5 . . . -1 . . . 2 . . . 7 - - -'] },
};
const Music = {
  cur: null, run: null, timer: null, name: '',
  play(name) {
    if (!A.ctx) { this.pending = name; return; }
    if (this.name === name && this.timer) return; this.stop(true); this.name = name;
    if (!name || !TRACKS[name]) return;
    const c = A.ctx, tr = TRACKS[name], g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(1, c.currentTime, 0.15); g.connect(A.music);
    this.run = { tr, g, step: 0, next: c.currentTime + 0.08, name };
    this.timer = setInterval(() => this.tick(), 30);
  },
  stop(fade) {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.run && A.ctx) { const r = this.run; r.g.gain.setTargetAtTime(0.0001, A.ctx.currentTime, fade ? 0.2 : 0.05); setTimeout(() => r.g.disconnect(), 1500); }
    this.run = null; this.name = '';
  },
  tick() {
    const r = this.run; if (!r || !A.ctx) return; const c = A.ctx, tr = r.tr, sd = 60 / tr.bpm / 4;
    while (r.next < c.currentTime + 0.14) { this.step(r, r.step++, r.next, sd); r.next += sd; }
  },
  step(r, i, t, sd) {
    const tr = r.tr, bar = Math.floor(i / 16), s = i % 16, ch = tr.prog[bar % tr.prog.length], tones = CHORDS[ch[1]], when = t - A.ctx.currentTime, bus = r.g;
    const at = (p) => p[(bar) % p.length][s];
    if (tr.kick) { const k = tr.kick[s]; if (k === 'x') A.tone({ type: 'sine', f0: 160, f1: 40, dur: 0.18, vol: 0.55, when, bus }); }
    if (tr.snare && tr.snare[s] === 'x') { A.noise({ type: 'highpass', f0: 1500, dur: 0.14, vol: 0.28, when, bus }); A.tone({ type: 'triangle', f0: 220, f1: 130, dur: 0.1, vol: 0.2, when, bus }); }
    if (tr.hat && tr.hat[s] === 'x') A.noise({ type: 'highpass', f0: 7000, dur: 0.035, vol: s % 4 === 2 ? 0.14 : 0.08, when, bus });
    const bp = tr.bass[bar % tr.bass.length][s];
    if (bp === 'x' || bp === 'o') A.tone({ type: 'sawtooth', f0: mtof(ch[0] + (bp === 'o' ? 12 : 0)), dur: sd * 1.7, vol: 0.2, lp: 520, lp1: 220, when, bus });
    const ap = tr.arp[bar % tr.arp.length][s];
    if (ap && ap !== '.') { const n = tones[+ap % tones.length] + 24 + ch[0]; A.tone({ type: 'triangle', f0: mtof(n), dur: sd * 1.4, vol: 0.1, when, bus }); }
    if (tr.pad && s === 0) for (const iv of tones) A.tone({ type: 'sawtooth', f0: mtof(ch[0] + 24 + iv), dur: sd * 15, vol: 0.035, attack: 0.5, hold: sd * 10, lp: 1400, when, bus, det: rr(-8, 8) });
    const lead = tr.lead[bar % tr.lead.length].split(' ')[s];
    if (lead && lead !== '.' && lead !== '-') {
      let len = 1; const toks = tr.lead[bar % tr.lead.length].split(' '); while (toks[s + len] === '-') len++;
      A.tone({ type: 'square', f0: mtof(tr.key + 12 + (+lead)), dur: sd * len * 0.95, vol: 0.11, lp: 3200, when, bus });
      A.tone({ type: 'triangle', f0: mtof(tr.key + 24 + (+lead)), dur: sd * len * 0.9, vol: 0.05, when, bus });
    }
  },
  sting(name) {
    if (!A.ctx) return; const seq = name === 'win' ? [[0, 67], [0.14, 72], [0.28, 76], [0.42, 79], [0.7, 76], [0.84, 79], [1.1, 84]] : name === 'lose' ? [[0, 67], [0.3, 63], [0.6, 60], [0.9, 55], [1.4, 48]] : [[0, 60], [0.12, 64], [0.24, 67], [0.36, 72]];
    for (const [w, n] of seq) { A.tone({ type: 'square', f0: mtof(n), dur: name === 'lose' ? 0.5 : 0.35, vol: 0.14, when: w, lp: 3000 }); A.tone({ type: 'triangle', f0: mtof(n - 12), dur: 0.5, vol: 0.18, when: w }); }
  },
};
