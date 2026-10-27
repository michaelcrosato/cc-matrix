// ============================================================================
// Audio — Web Audio synth: tracker music, procedural SFX, radio gibberish voices
// ============================================================================
const NOTE_IDX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const noteFreq = n => { const m = /^([A-G]#?)(\d)$/.exec(n); if (!m) return 0; return 440 * Math.pow(2, (NOTE_IDX[m[1]] + (+m[2] + 1) * 12 - 69) / 12); };
const CH = { C: ['C3', 'E4', 'G4'], G: ['G2', 'D4', 'G4', 'B4'], Dm: ['D3', 'F4', 'A4'], Am: ['A2', 'C4', 'E4', 'A4'], F: ['F2', 'A3', 'C4', 'F4'],
  D: ['D3', 'F#4', 'A4'], A: ['A2', 'C#4', 'E4', 'A4'], Bm: ['B2', 'D4', 'F#4'], Em: ['E2', 'G3', 'B3', 'E4'], B: ['B2', 'D#4', 'F#4'], Gs: ['G2', 'B3', 'D4'] };

const SONGS = {
  title: { bpm: 118, drums: 'k...s...k.k.s...', chords: ['C', 'G', 'Dm', 'C', 'Am', 'F', 'G', 'C'],
    lead: 'G4 - - C5 - - E5 - G5 - - - F5 - E5 - D5 - - - C5 - D5 - E5 - - - - - . . A4 - - D5 - - F5 - A5 - - - G5 - F5 - E5 - - - D5 - E5 - G5 - - - - - . . C5 - B4 - A4 - G4 - A4 - - - E4 - - - F4 - - - A4 - C5 - D5 - - - C5 - - - B4 - - - D5 - G5 - F5 - E5 - D5 - - - C5 - - - - - - - G4 - C5 - E5 - G5 -' },
  stage1: { bpm: 140, drums: 'x.h.o.h.x.x.o.hh', chords: ['D', 'A', 'Bm', 'A', 'Gs', 'A', 'Bm', 'D'],
    lead: 'D5 - A4 - D5 - E5 - F#5 - - - E5 - D5 - E5 - - - A4 - - - C#5 - - - E5 - - - B4 - F#4 - B4 - C#5 - D5 - - - C#5 - B4 - A4 - - - G4 - A4 - B4 - C#5 - E5 - - - G4 - B4 - D5 - G5 - F#5 - E5 - D5 - B4 - A4 - C#5 - E5 - A5 - G5 - F#5 - E5 - C#5 - F#5 - - - D5 - - - E5 - - - C#5 - - - D5 - - - - - - - D5 . D5 . A4 - - -' },
  boss: { bpm: 152, drums: 'x.hkohx.x.hko.hh', chords: ['Em', 'Em', 'C', 'B'],
    lead: 'E4 - E4 - G4 - E4 - A#4 - A4 - G4 - F#4 - E4 - - - B3 - - - E4 - F#4 - G4 - - - C5 - C5 - B4 - A4 - B4 - - - G4 - - - F#4 - - - D#4 - - - B3 - - - - - . .' },
  allrange: { bpm: 136, drums: 'x.h.o.hkx.hko.h.', chords: ['Am', 'Am', 'F', 'G'],
    lead: 'A4 - - C5 - - E5 - D5 - C5 - B4 - G4 - A4 - - - - - E4 - A4 - B4 - C5 - D5 - E5 - - F5 - - E5 - D5 - C5 - D5 - - - B4 - - - G4 - - - B4 - D5 - G5 - - -' },
  versus: { bpm: 146, drums: 'x.hkohx.xkh.o.hh', chords: ['Em', 'C', 'D', 'B'],
    lead: 'E5 - B4 - E5 - F#5 - G5 - F#5 - E5 - B4 - C5 - - - E5 - - - G5 - - - E5 - - - D5 - A4 - D5 - E5 - F#5 - E5 - D5 - A4 - B4 - - - D#5 - - - F#5 - - - B5 - - -' },
  victory: { bpm: 150, once: true, drums: 'k...k...k.k.k...', chords: ['C', 'C'],
    lead: 'G4 . G4 . G4 . C5 - - - E5 - - - D5 - C5 - - - - - - - - - - - . . . .' },
  gameover: { bpm: 84, once: true, drums: '................', chords: ['Am', 'Em'],
    lead: 'E4 - - - D#4 - - - D4 - - - C#4 - - - C4 - - - - - - - - - - - . . . .' },
};

const Sound = {
  ctx: null, master: null, musicBus: null, sfxBus: null, noise: null, song: null, songName: null, step: 0, nextTime: 0, voiceSrcs: [],
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.9;
    const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
    this.applyVolumes();
    const len = this.ctx.sampleRate * 1.5; const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    setInterval(() => this.schedule(), 25);
  },
  resume() { if (!this.ctx) this.init(); if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); },
  applyVolumes() { if (!this.ctx) return; this.musicBus.gain.value = Settings.data.music * 0.5; this.sfxBus.gain.value = Settings.data.sfx; },
  // ---------------- music ----------------
  play(name) {
    if (!this.ctx || this.songName === name) return;
    const s = SONGS[name]; if (!s) return;
    if (!s.leadArr) s.leadArr = s.lead.trim().split(/\s+/);
    this.song = s; this.songName = name; this.step = 0; this.nextTime = this.ctx.currentTime + 0.08;
  },
  stopMusic() { this.song = null; this.songName = null; },
  schedule() {
    const s = this.song; if (!s || !this.ctx) return;
    const stepDur = 60 / s.bpm / 4;
    const total = s.leadArr.length;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const i = this.step;
      if (i >= total) { if (s.once) { this.song = null; this.songName = null; return; } this.step = 0; continue; }
      const t = this.nextTime;
      const tok = s.leadArr[i];
      if (tok !== '-' && tok !== '.') {
        let len = 1; while (i + len < total && s.leadArr[i + len] === '-') len++;
        this.tone(noteFreq(tok), t, len * stepDur * 0.95, 'square', 0.16, this.musicBus, 0.01, true);
        this.tone(noteFreq(tok) * 1.004, t, len * stepDur * 0.95, 'sawtooth', 0.05, this.musicBus, 0.01);
      }
      const bar = Math.floor(i / 16), sib = i % 16;
      const ch = CH[s.chords[bar % s.chords.length]];
      if (sib % 2 === 0) this.tone(noteFreq(ch[0]) * (sib % 4 === 2 ? 2 : 1), t, stepDur * 1.6, 'sawtooth', 0.15, this.musicBus, 0.005, false, 900);
      this.tone(noteFreq(ch[1 + (sib % (ch.length - 1))]) * 2, t, stepDur * 0.8, 'triangle', 0.05, this.musicBus, 0.002);
      const d = s.drums[sib];
      if (d === 'k' || d === 'x') this.kick(t);
      if (d === 's' || d === 'o') this.snare(t);
      if (d === 'h' || d === 'x' || d === 'o') this.hat(t);
      this.step++; this.nextTime += stepDur;
    }
  },
  tone(freq, t, dur, type, vol, bus, atk = 0.01, vib = false, lp = 0) {
    if (!freq) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (vib && dur > 0.25) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = freq * 0.012; l.connect(lg); lg.connect(o.frequency); l.start(t + 0.15); l.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.setValueAtTime(vol, t + Math.max(atk, dur - 0.04)); g.gain.linearRampToValueAtTime(0, t + dur);
    let node = o;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
  },
  noiseHit(t, dur, vol, type, freq, bus = this.musicBus, q = 1) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    return { src: s, filter: f, gain: g };
  },
  kick(t) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.2); },
  snare(t) { this.noiseHit(t, 0.14, 0.28, 'bandpass', 1800, this.musicBus, 0.8); this.tone(190, t, 0.06, 'triangle', 0.15, this.musicBus, 0.001); },
  hat(t) { this.noiseHit(t, 0.04, 0.09, 'highpass', 7000); },
  // ---------------- sfx ----------------
  sfx(name, opt = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, B = this.sfxBus;
    const sweep = (f0, f1, dur, type, vol, delay = 0) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = type;
      o.frequency.setValueAtTime(f0, t + delay); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + delay + dur);
      g.gain.setValueAtTime(vol, t + delay); g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      o.connect(g); g.connect(B); o.start(t + delay); o.stop(t + delay + dur + 0.02);
    };
    const v = opt.vol ?? 1;
    switch (name) {
      case 'laser': sweep(1500, 300, 0.12, 'square', 0.07 * v); sweep(2200, 600, 0.08, 'sawtooth', 0.03 * v); break;
      case 'laser2': sweep(1200, 200, 0.14, 'square', 0.08 * v); sweep(1800, 400, 0.12, 'square', 0.05 * v, 0.015); break;
      case 'laser3': sweep(900, 120, 0.2, 'sawtooth', 0.09 * v); sweep(2600, 500, 0.12, 'square', 0.05 * v); break;
      case 'eshot': sweep(500, 180, 0.15, 'triangle', 0.08 * v); break;
      case 'charge': sweep(200, 900, 0.5, 'sawtooth', 0.04 * v); break;
      case 'lock': sweep(1800, 1800, 0.05, 'square', 0.07); sweep(2400, 2400, 0.06, 'square', 0.07, 0.07); break;
      case 'homing': sweep(300, 1400, 0.35, 'sawtooth', 0.1 * v); this.noiseHit(t, 0.4, 0.12 * v, 'bandpass', 1200, B); break;
      case 'bomb': sweep(200, 900, 0.5, 'sawtooth', 0.07); this.noiseHit(t, 0.6, 0.12, 'highpass', 2500, B); break;
      case 'boom': this.noiseHit(t, 0.7 * (opt.size || 1), 0.45 * v, 'lowpass', 900 / (opt.size || 1), B); sweep(120, 30, 0.5, 'sine', 0.5 * v); break;
      case 'bigboom': this.noiseHit(t, 2.2, 0.7, 'lowpass', 500, B); sweep(90, 20, 1.6, 'sine', 0.8); this.noiseHit(t + 0.2, 1.5, 0.4, 'lowpass', 1500, B); break;
      case 'hit': this.noiseHit(t, 0.08, 0.25 * v, 'bandpass', 3000, B, 2); sweep(900, 500, 0.06, 'square', 0.05 * v); break;
      case 'clank': sweep(2400, 2300, 0.15, 'square', 0.05); sweep(3100, 3000, 0.12, 'triangle', 0.05); break;
      case 'hurt': this.noiseHit(t, 0.35, 0.5, 'lowpass', 1400, B); sweep(300, 60, 0.3, 'sawtooth', 0.15); break;
      case 'ring': [0, 4, 7, 12].forEach((s, i) => sweep(880 * Math.pow(2, s / 12), 880 * Math.pow(2, s / 12), 0.12, 'square', 0.06, i * 0.05)); break;
      case 'goldring': [0, 4, 7, 12, 16, 19].forEach((s, i) => sweep(660 * Math.pow(2, s / 12), 660 * Math.pow(2, s / 12), 0.12, 'square', 0.07, i * 0.05)); break;
      case 'item': [0, 7, 12, 7, 12, 19].forEach((s, i) => sweep(520 * Math.pow(2, s / 12), 520 * Math.pow(2, s / 12), 0.09, 'triangle', 0.1, i * 0.045)); break;
      case 'roll': this.noiseHit(t, 0.5, 0.18, 'bandpass', 800, B, 1.5).filter.frequency.exponentialRampToValueAtTime(3000, t + 0.4); break;
      case 'deflect': sweep(3000, 1500, 0.1, 'square', 0.06); break;
      case 'boost': this.noiseHit(t, 0.7, 0.2, 'bandpass', 500, B, 0.7).filter.frequency.exponentialRampToValueAtTime(2500, t + 0.6); break;
      case 'brake': this.noiseHit(t, 0.5, 0.15, 'lowpass', 1500, B).filter.frequency.exponentialRampToValueAtTime(200, t + 0.45); break;
      case 'alarm': for (let i = 0; i < 3; i++) { sweep(880, 880, 0.15, 'square', 0.07, i * 0.3); sweep(660, 660, 0.15, 'square', 0.07, i * 0.3 + 0.15); } break;
      case 'select': sweep(900, 1300, 0.06, 'square', 0.05); break;
      case 'move': sweep(600, 600, 0.03, 'square', 0.035); break;
      case 'back': sweep(700, 350, 0.08, 'square', 0.05); break;
      case 'start': [0, 4, 7, 12].forEach((s, i) => sweep(440 * Math.pow(2, s / 12), 440 * Math.pow(2, s / 12), 0.2, 'square', 0.08, i * 0.07)); break;
      case 'warp': sweep(100, 2000, 1.5, 'sawtooth', 0.08); this.noiseHit(t, 1.6, 0.2, 'bandpass', 600, B); break;
      case 'shield': sweep(400, 1600, 0.3, 'sine', 0.12); break;
      case 'error': sweep(200, 180, 0.2, 'square', 0.08); break;
    }
  },
  // engine hum: continuous oscillator whose pitch tracks boost
  engine: null,
  setEngine(on, pitch = 1) {
    if (!this.ctx) return;
    if (on && !this.engine) {
      const c = this.ctx, o = c.createOscillator(), n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = 55; n.buffer = this.noise; n.loop = true; f.type = 'lowpass'; f.frequency.value = 400; g.gain.value = 0.0;
      o.connect(f); n.connect(f); f.connect(g); g.connect(this.sfxBus); o.start(); n.start();
      this.engine = { o, n, f, g };
    }
    if (!this.engine) return;
    const e = this.engine, t = this.ctx.currentTime;
    e.g.gain.setTargetAtTime(on ? 0.05 : 0, t, 0.1);
    e.o.frequency.setTargetAtTime(50 * pitch, t, 0.15);
    e.f.frequency.setTargetAtTime(300 + 500 * pitch, t, 0.15);
  },
  // Star-Fox-style radio gibberish: one formant blip per syllable
  voice(text, pitch) {
    if (!this.ctx || !Settings.data.voice) return;
    const c = this.ctx; let t = c.currentTime + 0.02;
    const syl = Math.min(18, Math.ceil(text.length / 3.2));
    for (let i = 0; i < syl; i++) {
      const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; const p = pitch * rand(0.85, 1.25);
      o.frequency.setValueAtTime(p, t); o.frequency.linearRampToValueAtTime(p * rand(0.8, 1.2), t + 0.09);
      f.type = 'bandpass'; f.frequency.value = rand(700, 2200); f.Q.value = 4;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.015); g.gain.linearRampToValueAtTime(0, t + 0.1);
      o.connect(f); f.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + 0.12);
      t += rand(0.08, 0.13);
    }
  },
};
