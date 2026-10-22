// ===== 01_audio.js — Web Audio synth: SFX, voice chatter, procedural music sequencer =====
const NOTE = m => 440 * Math.pow(2, (m - 69) / 12);
const Audio_ = {
  ctx: null, master: null, musicGain: null, sfxGain: null, noiseBuf: null, engine: null,
  song: null, songName: '', step: 0, nextTime: 0, timer: 0, pulse: null, lastVoice: 0,
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
      this.master.connect(comp).connect(ctx.destination);
      this.musicGain = ctx.createGain(); this.musicGain.connect(this.master);
      this.sfxGain = ctx.createGain(); this.sfxGain.connect(this.master);
      const len = ctx.sampleRate * 2; this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const real = new Float32Array(32), imag = new Float32Array(32);
      for (let n = 1; n < 32; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.25);
      this.pulse = ctx.createPeriodicWave(real, imag);
      this.applyVolumes();
      this.timer = setInterval(() => this.schedule(), 25);
      if (this.pendingSong) this.playSong(this.pendingSong);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(Settings.master, t, 0.05);
    this.musicGain.gain.setTargetAtTime(Settings.music * 0.55 * (this.duck || 1), t, 0.08);
    this.sfxGain.gain.setTargetAtTime(Settings.sfx, t, 0.05);
  },
  setDuck(v) { this.duck = v; this.applyVolumes(); },
  out(pan) {
    if (pan === undefined || pan === 0) return this.sfxGain;
    const p = this.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(this.sfxGain); return p;
  },
  tone(o) {
    const ctx = this.ctx; if (!ctx) return;
    const t = (o.t || ctx.currentTime) + (o.delay || 0), dur = o.dur || 0.2;
    const osc = ctx.createOscillator();
    if (o.type === 'pulse') osc.setPeriodicWave(this.pulse); else osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain(); const v = Math.max(0.0005, o.v ?? 0.2);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.q || 1; node.connect(f); node = f; }
    if (o.bp) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = o.bp; f.Q.value = o.q || 4; node.connect(f); node = f; }
    node.connect(g).connect(o.dest || this.out(o.pan));
    osc.start(t); osc.stop(t + dur + 0.05);
    return osc;
  },
  noise(o) {
    const ctx = this.ctx; if (!ctx) return;
    const t = (o.t || ctx.currentTime) + (o.delay || 0), dur = o.dur || 0.3;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    src.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = o.ft || 'lowpass'; f.frequency.setValueAtTime(o.f || 2000, t); f.Q.value = o.q || 0.8;
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t + dur);
    const g = ctx.createGain(); const v = Math.max(0.0005, o.v ?? 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.a || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(o.dest || this.out(o.pan));
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  },
  // ---- sound effects ----
  play(name, o = {}) {
    if (!this.ctx) return;
    const pan = o.pan || 0, k = o.vol ?? 1;
    switch (name) {
      case 'laser': {
        const lv = o.level || 0;
        this.tone({ type: 'square', f: lv === 2 ? 1900 : 1500, f2: 260, dur: 0.13, v: 0.09 * k, pan, lp: 5000 });
        this.tone({ type: 'sawtooth', f: lv === 2 ? 1100 : 900, f2: 180, dur: 0.1, v: 0.05 * k, pan, detune: 12 });
        break;
      }
      case 'enemyShot': this.tone({ type: 'pulse', f: 520, f2: 300, dur: 0.12, v: 0.05 * k, pan }); break;
      case 'charge': this.tone({ type: 'sawtooth', f: 180, f2: 900, dur: 0.6, v: 0.06, lp: 2400, a: 0.05 }); break;
      case 'charged': this.tone({ type: 'sine', f: 1200, dur: 0.15, v: 0.08 }); this.tone({ type: 'sine', f: 1800, dur: 0.15, v: 0.06, delay: 0.06 }); break;
      case 'lock': this.tone({ type: 'square', f: 1760, dur: 0.06, v: 0.06 }); this.tone({ type: 'square', f: 2350, dur: 0.06, v: 0.05, delay: 0.07 }); break;
      case 'chargeShot': this.tone({ type: 'sawtooth', f: 700, f2: 90, dur: 0.45, v: 0.12, lp: 3000 }); this.noise({ f: 3000, f2: 300, dur: 0.4, v: 0.12 }); break;
      case 'hitEnemy': this.tone({ type: 'square', f: 300, f2: 120, dur: 0.07, v: 0.07 * k, pan }); this.noise({ ft: 'highpass', f: 3000, dur: 0.05, v: 0.06 * k, pan }); break;
      case 'explode': {
        const s = o.size || 1;
        this.noise({ f: 1800 / Math.sqrt(s), f2: 60, dur: 0.5 + s * 0.35, v: Math.min(0.6, 0.25 + s * 0.08) * k, pan });
        this.tone({ type: 'sine', f: 140, f2: 30, dur: 0.4 + s * 0.2, v: Math.min(0.5, 0.2 + s * 0.06) * k, pan });
        break;
      }
      case 'bigBoom':
        this.noise({ f: 900, f2: 40, dur: 2.6, v: 0.6 }); this.tone({ type: 'sine', f: 90, f2: 22, dur: 2.2, v: 0.6 });
        this.noise({ ft: 'bandpass', f: 400, f2: 80, dur: 1.5, v: 0.3, delay: 0.25, q: 2 }); break;
      case 'bombLaunch': this.tone({ type: 'sawtooth', f: 220, f2: 520, dur: 0.35, v: 0.1, lp: 1800 }); this.noise({ f: 2500, dur: 0.4, v: 0.1 }); break;
      case 'bomb':
        this.noise({ f: 1200, f2: 50, dur: 1.6, v: 0.6 }); this.tone({ type: 'sine', f: 110, f2: 25, dur: 1.4, v: 0.55 });
        this.tone({ type: 'sawtooth', f: 60, f2: 30, dur: 1.0, v: 0.2, lp: 300 }); break;
      case 'hurt': this.noise({ f: 2400, f2: 400, dur: 0.25, v: 0.35 }); this.tone({ type: 'square', f: 180, f2: 70, dur: 0.25, v: 0.12 }); break;
      case 'scrape': this.noise({ ft: 'bandpass', f: 1600, f2: 600, dur: 0.35, v: 0.3, q: 3 }); break;
      case 'deflect': this.tone({ type: 'triangle', f: 2400, f2: 3800, dur: 0.08, v: 0.08, pan }); break;
      case 'roll': this.noise({ ft: 'bandpass', f: 500, f2: 2400, dur: 0.5, v: 0.18, q: 2 }); break;
      case 'loop': this.noise({ ft: 'bandpass', f: 300, f2: 1500, dur: 1.1, v: 0.16, q: 1.5 }); this.tone({ type: 'sawtooth', f: 110, f2: 220, dur: 1.0, v: 0.05, lp: 800 }); break;
      case 'ring': [0, 4, 7, 12].forEach((n, i) => this.tone({ type: 'triangle', f: NOTE(84 + n), dur: 0.18, v: 0.09, delay: i * 0.05 })); break;
      case 'goldRing': [0, 4, 7, 12, 16, 19].forEach((n, i) => this.tone({ type: 'square', f: NOTE(84 + n), dur: 0.2, v: 0.06, delay: i * 0.045, lp: 6000 })); break;
      case 'pickup': [0, 7, 12].forEach((n, i) => this.tone({ type: 'pulse', f: NOTE(79 + n), dur: 0.16, v: 0.1, delay: i * 0.07 })); break;
      case 'oneUp': [0, 4, 7, 12, 7, 12].forEach((n, i) => this.tone({ type: 'square', f: NOTE(76 + n), dur: 0.12, v: 0.08, delay: i * 0.08, lp: 5000 })); break;
      case 'gate': this.tone({ type: 'sine', f: 660, f2: 1320, dur: 0.3, v: 0.12 }); this.tone({ type: 'triangle', f: 990, dur: 0.3, v: 0.06, delay: 0.08 }); break;
      case 'checkpoint': [0, 5, 9, 12].forEach((n, i) => this.tone({ type: 'triangle', f: NOTE(72 + n), dur: 0.3, v: 0.12, delay: i * 0.09 })); break;
      case 'alarm': for (let i = 0; i < 3; i++) { this.tone({ type: 'square', f: 880, dur: 0.18, v: 0.07, delay: i * 0.4, lp: 3000 }); this.tone({ type: 'square', f: 660, dur: 0.18, v: 0.07, delay: i * 0.4 + 0.2, lp: 3000 }); } break;
      case 'lowShield': this.tone({ type: 'square', f: 1320, dur: 0.08, v: 0.05 }); this.tone({ type: 'square', f: 1320, dur: 0.08, v: 0.05, delay: 0.14 }); break;
      case 'menuMove': this.tone({ type: 'triangle', f: 880, dur: 0.05, v: 0.07 }); break;
      case 'menuOk': this.tone({ type: 'square', f: 988, dur: 0.07, v: 0.06, lp: 4000 }); this.tone({ type: 'square', f: 1480, dur: 0.1, v: 0.06, delay: 0.06, lp: 4000 }); break;
      case 'menuBack': this.tone({ type: 'square', f: 740, f2: 440, dur: 0.12, v: 0.06, lp: 3000 }); break;
      case 'pause': this.tone({ type: 'sine', f: 660, dur: 0.1, v: 0.1 }); this.tone({ type: 'sine', f: 440, dur: 0.15, v: 0.1, delay: 0.08 }); break;
      case 'start': [0, 4, 7, 11, 12].forEach((n, i) => this.tone({ type: 'sawtooth', f: NOTE(62 + n), dur: 0.35, v: 0.06, delay: i * 0.06, lp: 2500 })); this.noise({ f: 600, f2: 4000, dur: 0.8, v: 0.12 }); break;
      case 'missile': this.noise({ ft: 'bandpass', f: 1200, f2: 500, dur: 0.6, v: 0.08, q: 3, pan }); break;
      case 'beamCharge': this.tone({ type: 'sawtooth', f: 80, f2: 600, dur: 1.4, v: 0.12, lp: 1500, a: 0.2 }); break;
      case 'beam': this.noise({ f: 700, dur: 2.4, v: 0.25, a: 0.05 }); this.tone({ type: 'sawtooth', f: 70, dur: 2.4, v: 0.12, lp: 500 }); break;
      case 'splash': this.noise({ ft: 'highpass', f: 900, f2: 3000, dur: 0.4, v: 0.18 }); break;
      case 'wingBreak': this.noise({ f: 3000, f2: 200, dur: 0.6, v: 0.4 }); this.tone({ type: 'square', f: 400, f2: 60, dur: 0.5, v: 0.15 }); break;
    }
  },
  voice(who) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime; if (now - this.lastVoice < 0.065) return; this.lastVoice = now;
    const base = { tusk: 120, wren: 420, moss: 260, hollis: 150, kraag: 95, vale: 210 }[who] || 220;
    const f = base * (0.85 + Math.random() * 0.5);
    this.tone({ type: who === 'kraag' ? 'sawtooth' : 'square', f, f2: f * (0.7 + Math.random() * 0.6), dur: 0.06, v: 0.05, bp: f * 3.2, q: 2.5 });
  },
  // ---- engine hum ----
  startEngine() {
    if (!this.ctx || this.engine) return;
    const ctx = this.ctx;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55;
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 55.7;
    const n = ctx.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 600; nf.Q.value = 0.7;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
    const g = ctx.createGain(); g.gain.value = 0;
    const ng = ctx.createGain(); ng.gain.value = 0.25;
    o1.connect(lp); o2.connect(lp); n.connect(nf).connect(ng).connect(lp); lp.connect(g).connect(this.sfxGain);
    o1.start(); o2.start(); n.start();
    this.engine = { o1, o2, lp, g, nf };
  },
  setEngine(level, speedK) {
    if (!this.engine) return; const t = this.ctx.currentTime, e = this.engine;
    e.g.gain.setTargetAtTime(level * 0.07, t, 0.1);
    e.o1.frequency.setTargetAtTime(45 + speedK * 35, t, 0.15); e.o2.frequency.setTargetAtTime(45.6 + speedK * 35, t, 0.15);
    e.lp.frequency.setTargetAtTime(250 + speedK * 900, t, 0.15); e.nf.frequency.setTargetAtTime(400 + speedK * 1400, t, 0.15);
  },
  // ---- music ----
  playSong(name) {
    if (!this.ctx) { this.pendingSong = name; return; }
    if (this.songName === name) return;
    this.songName = name; this.song = SONGS[name] || null; this.step = 0; this.nextTime = this.ctx.currentTime + 0.1;
  },
  stopSong() { this.song = null; this.songName = ''; },
  schedule() {
    if (!this.ctx || !this.song) return;
    const s = this.song, spb = 60 / s.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      if (s.oneShot && this.step >= s.length) { this.song = null; return; }
      const st = this.step % s.length;
      for (const tr of s.tracks) { const ev = tr.ev[st]; if (ev) this.inst(tr.inst, ev, this.nextTime, spb); }
      this.nextTime += spb; this.step++;
    }
  },
  inst(kind, ev, t, spb) {
    const dest = this.musicGain, dur = (ev.len || 1) * spb;
    switch (kind) {
      case 'lead':
        this.tone({ type: 'square', f: NOTE(ev.n), dur: dur * 0.95, v: 0.07, t, dest, lp: 3200, a: 0.01 });
        this.tone({ type: 'pulse', f: NOTE(ev.n), dur: dur * 0.95, v: 0.04, t, dest, detune: 9, lp: 4000 });
        break;
      case 'bass': this.tone({ type: 'sawtooth', f: NOTE(ev.n), dur: dur * 0.9, v: 0.13, t, dest, lp: 520, q: 3 }); break;
      case 'arp': this.tone({ type: 'pulse', f: NOTE(ev.n), dur: dur * 0.8, v: 0.035, t, dest, lp: 5000 }); break;
      case 'pad':
        for (const n of ev.ch) { this.tone({ type: 'sawtooth', f: NOTE(n), dur, v: 0.025, t, dest, lp: 1400, a: 0.25, detune: -7 }); this.tone({ type: 'sawtooth', f: NOTE(n), dur, v: 0.025, t, dest, lp: 1400, a: 0.25, detune: 7 }); }
        break;
      case 'kick': this.tone({ type: 'sine', f: 150, f2: 42, dur: 0.22, v: 0.4, t, dest }); break;
      case 'snare': this.noise({ ft: 'bandpass', f: 1800, dur: 0.16, v: 0.2, t, dest, q: 0.9 }); this.tone({ type: 'triangle', f: 220, f2: 140, dur: 0.08, v: 0.12, t, dest }); break;
      case 'hat': this.noise({ ft: 'highpass', f: 7000, dur: 0.04, v: 0.07 * (ev.v || 1), t, dest }); break;
      case 'tom': this.tone({ type: 'sine', f: ev.n ? NOTE(ev.n) : 180, f2: 60, dur: 0.25, v: 0.25, t, dest }); break;
    }
  },
};

// ---------- songs (generated from chord progressions + hand-written melodies) ----------
function buildSong({ bpm, chords, melody, style, oneShot }) {
  const bars = chords.length, length = bars * 16;
  const mk = () => new Array(length).fill(null);
  const lead = mk(), bass = mk(), arp = mk(), pad = mk(), kick = mk(), snare = mk(), hat = mk(), tom = mk();
  let pos = 0;
  for (const [n, len] of melody) { if (pos >= length) break; if (n) lead[pos] = { n, len }; pos += len; }
  chords.forEach((c, b) => {
    const root = c[0], tones = c, o = b * 16;
    pad[o] = { ch: tones.map(x => x + 12), len: 16 };
    for (let i = 0; i < 16; i++) {
      if (style === 'calm') { if (i % 4 === 0) bass[o + i] = { n: root - 12, len: 4 }; arp[o + i] = i % 2 === 0 ? { n: tones[(i / 2) % tones.length] + 24, len: 2 } : null; }
      else if (style === 'boss') { bass[o + i] = { n: root - 12 + (i % 4 === 2 ? 12 : 0), len: 1 }; arp[o + i] = { n: tones[i % tones.length] + 24 + (i % 8 >= 4 ? 12 : 0), len: 1 }; }
      else { if (i % 2 === 0) bass[o + i] = { n: root - 12 + (i % 4 === 2 ? 12 : 0), len: 2 }; arp[o + i] = { n: tones[i % tones.length] + 24, len: 1 }; }
      if (style !== 'calm') {
        if (i % 8 === 0 || (style === 'boss' && i % 8 === 6)) kick[o + i] = {};
        if (i % 8 === 4) snare[o + i] = {};
        hat[o + i] = i % 2 === 0 ? { v: 1 } : (style === 'boss' ? { v: 0.5 } : null);
        if (b % 4 === 3 && i >= 12) tom[o + i] = { n: 50 - (i - 12) * 3 };
      } else if (i === 0) kick[o + i] = {};
    }
  });
  const tracks = [{ inst: 'lead', ev: lead }, { inst: 'bass', ev: bass }, { inst: 'arp', ev: arp }, { inst: 'pad', ev: pad }, { inst: 'kick', ev: kick }, { inst: 'snare', ev: snare }, { inst: 'hat', ev: hat }, { inst: 'tom', ev: tom }];
  return { bpm, length, tracks, oneShot };
}
// chords as midi note triads around octave 3-4
const CH = { D: [50, 54, 57], C: [48, 52, 55], G: [43, 47, 50], A: [45, 49, 52], Bm: [47, 50, 54], Em: [52, 55, 59], Cm: [48, 51, 55], B: [47, 51, 54], Am: [45, 48, 52], F: [41, 45, 48], Dm: [50, 53, 57], Bb: [46, 50, 53] };
const SONGS = {
  title: buildSong({ bpm: 96, style: 'calm', chords: [CH.D, CH.Bm, CH.G, CH.A, CH.D, CH.Bm, CH.G, CH.A],
    melody: [[74, 8], [69, 8], [71, 8], [78, 8], [79, 12], [78, 4], [76, 16], [74, 8], [81, 8], [83, 8], [81, 4], [78, 4], [79, 8], [83, 8], [81, 16]] }),
  stage: buildSong({ bpm: 150, style: 'drive', chords: [CH.D, CH.C, CH.G, CH.A, CH.Bm, CH.G, CH.D, CH.A],
    melody: [[69, 4], [74, 4], [76, 2], [78, 6], [76, 4], [74, 2], [72, 2], [74, 8], [71, 4], [74, 4], [79, 4], [78, 2], [76, 2], [76, 8], [73, 4], [69, 4],
      [78, 4], [76, 2], [74, 2], [78, 4], [83, 4], [81, 6], [79, 2], [78, 4], [76, 4], [78, 4], [81, 4], [86, 8], [85, 4], [83, 2], [81, 2], [76, 8]] }),
  canyon: buildSong({ bpm: 156, style: 'drive', chords: [CH.Am, CH.F, CH.C, CH.G, CH.Am, CH.F, CH.Dm, CH.G],
    melody: [[69, 2], [72, 2], [76, 4], [74, 2], [72, 2], [71, 4], [69, 8], [77, 4], [76, 4], [72, 4], [71, 2], [72, 2], [74, 16], [76, 4], [79, 4], [81, 8], [77, 4], [76, 4], [74, 8], [72, 4], [74, 4], [77, 8], [79, 8], [71, 8]] }),
  boss: buildSong({ bpm: 164, style: 'boss', chords: [CH.Em, CH.C, CH.D, CH.B, CH.Em, CH.C, CH.Am, CH.B],
    melody: [[76, 2], [76, 2], [79, 2], [76, 2], [83, 4], [81, 4], [79, 4], [76, 4], [72, 4], [76, 4], [78, 2], [78, 2], [81, 2], [78, 2], [86, 4], [84, 4], [83, 8], [75, 8],
      [88, 4], [86, 2], [83, 2], [84, 4], [79, 4], [76, 4], [79, 4], [84, 8], [81, 4], [84, 4], [88, 4], [86, 4], [87, 16]] }),
  win: buildSong({ bpm: 120, style: 'calm', oneShot: true, chords: [CH.D, CH.G, CH.A, CH.D],
    melody: [[74, 2], [78, 2], [81, 2], [86, 6], [83, 4], [86, 4], [88, 8], [85, 8], [86, 16]] }),
  gameover: buildSong({ bpm: 80, style: 'calm', oneShot: true, chords: [CH.Dm, CH.Bb, CH.A],
    melody: [[74, 4], [72, 4], [70, 4], [69, 4], [67, 8], [65, 8], [64, 16]] }),
};
