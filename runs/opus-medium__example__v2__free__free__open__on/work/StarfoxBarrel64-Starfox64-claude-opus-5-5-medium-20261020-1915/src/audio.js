// Web Audio: synthesized SFX, procedural music tracker, radio voice blips.
import { settings } from './config.js';

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function midi(n) { const m = /^([A-G][#b]?)(-?\d)$/.exec(n); return m ? NOTE[m[1]] + (parseInt(m[2]) + 1) * 12 : null; }
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// parse "E5 - - . A5" into [{step,len,midi}]
function parseLine(str) {
  const toks = str.replace(/\|/g, ' ').trim().split(/\s+/);
  const out = [];
  let cur = null;
  toks.forEach((t, i) => {
    if (t === '-') { if (cur) cur.len++; return; }
    cur = null;
    if (t === '.') return;
    const m = midi(t);
    if (m !== null) { cur = { step: i, len: 1, midi: m }; out.push(cur); }
  });
  return { notes: out, steps: toks.length };
}
function chordNotes(name, oct = 4) {
  const m = /^([A-G][#b]?)(m?)$/.exec(name);
  const root = NOTE[m[1]] + (oct + 1) * 12;
  return m[2] ? [root, root + 3, root + 7] : [root, root + 4, root + 7];
}

const SONGS = {
  title: {
    bpm: 104, chords: ['C', 'G', 'Am', 'F', 'C', 'F', 'G', 'G'], bassPat: 'r...r...r...o...', drums: 'k...s...k.k.s...',
    lead: `G4 - - - C5 - - - E5 - - - G5 - - - | G5 - - - F5 - E5 - D5 - - - - - - - | E5 - - - A5 - - - G5 - E5 - C5 - - - | F5 - - - - - - - A5 - - - C6 - - -
           C6 - - - G5 - - - E5 - G5 - C6 - - - | A5 - - - F5 - - - A5 - C6 - F6 - - - | E6 - - - D6 - - - C6 - - - B5 - - - | D6 - - - - - - - - - - - . . . .`,
    leadGain: 0.13,
  },
  stage: {
    bpm: 140, chords: ['Am', 'F', 'G', 'Em', 'Am', 'F', 'C', 'G'], bassPat: 'r.o.r.o.r.o.r.o.', drums: 'k.h.s.h.k.hks.h.',
    lead: `E5 - - . A5 - - . B5 - C6 - B5 - A5 - | F5 - - - - - A5 - C6 - - - A5 - - - | G5 - - . B5 - - . D6 - C6 - B5 - G5 - | E5 - - - - - - - B4 - D5 - E5 - - -
           A5 - - - G5 - E5 - C5 - D5 - E5 - - - | F5 - - - E5 - C5 - A4 - C5 - F5 - - - | E5 - G5 - C6 - - - B5 - G5 - E5 - G5 - | D6 - - - B5 - - - G5 - A5 - B5 - - -`,
    leadGain: 0.11,
  },
  boss: {
    bpm: 156, chords: ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'C', 'Bb', 'A'], bassPat: 'rrorrorrrrorrorr', drums: 'k.hsk.hsk.hsk.ss',
    lead: `D5 - - . D5 - F5 - E5 - - . C5 - D5 - | A4 - - - - - - - . . . . A4 - C5 - | D5 - - . F5 - - . A5 - G5 - F5 - D5 - | E5 - - - - - C#5 - - - - - A4 - - -
           D6 - - . A5 - - . F5 - - . D5 - F5 - | E5 - - - G5 - - - C6 - - - G5 - - - | F5 - - - D5 - - - Bb4 - D5 - F5 - - - | E5 - - - C#5 - - - A4 - - - - - - -`,
    leadGain: 0.1,
  },
  space: {
    bpm: 132, chords: ['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B'], bassPat: 'r..rr.o.r..rr.o.', drums: 'k.h.s.hkk.h.s.hh',
    lead: `B4 - E5 - G5 - B5 - - - A5 - G5 - - - | E5 - - - G5 - - - C6 - - - B5 - G5 - | F#5 - - - A5 - - - D6 - - - C6 - A5 - | B5 - - - - - - - D#5 - F#5 - B5 - - -
           G5 - - - B5 - E6 - - - D6 - B5 - - - | C6 - - - B5 - G5 - E5 - - - G5 - - - | A5 - - - C6 - - - E6 - - - D6 - C6 - | B5 - - - - - - - D#6 - - - F#5 - - -`,
    leadGain: 0.1,
  },
  briefing: {
    bpm: 90, chords: ['F', 'G', 'Em', 'Am'], bassPat: 'r.......o.......', drums: '................',
    lead: `A4 - C5 - E5 - - - . . . . . . . . | B4 - D5 - G5 - - - . . . . . . . . | G4 - B4 - E5 - - - . . . . . . . . | A4 - C5 - E5 - A5 - - - - - - - - -`,
    leadGain: 0.07,
  },
  results: {
    bpm: 120, once: true, chords: ['C', 'G', 'F', 'C'], bassPat: 'r...r...r...r...', drums: 'k...s...k.k.s.ss',
    lead: `C5 - E5 - G5 - C6 - - - G5 - C6 - - - | D6 - - - B5 - - - G5 - - - B5 - D6 - | C6 - - - A5 - - - F5 - A5 - C6 - F6 - | E6 - - - - - - - - - - - . . . .`,
    leadGain: 0.12,
  },
  gameover: {
    bpm: 80, once: true, chords: ['Am', 'F', 'Dm', 'E'], bassPat: 'r.......r.......', drums: '................',
    lead: `E5 - - - C5 - - - A4 - - - - - - - | F5 - - - C5 - - - A4 - - - - - - - | D5 - - - F5 - - - A4 - - - D5 - - - | B4 - - - G#4 - - - E4 - - - - - - -`,
    leadGain: 0.1,
  },
};
for (const k in SONGS) SONGS[k].leadParsed = parseLine(SONGS[k].lead);

class Audio {
  constructor() {
    this.ctx = null;
    this.song = null; this.songName = null;
    this.loops = {};
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      this.ctx = new C();
    } catch (e) { return false; }
    const c = this.ctx;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 4;
    this.master = c.createGain(); this.master.connect(this.comp); this.comp.connect(c.destination);
    this.musicBus = c.createGain(); this.musicBus.connect(this.master);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
    this.voiceBus = c.createGain(); this.voiceBus.connect(this.master);
    // shared noise buffer
    const len = c.sampleRate * 2;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // simple reverb impulse for music/sfx
    this.reverb = c.createConvolver();
    const ir = c.createBuffer(2, c.sampleRate * 1.6, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const a = ir.getChannelData(ch); for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / a.length, 3); }
    this.reverb.buffer = ir;
    this.revGain = c.createGain(); this.revGain.gain.value = 0.18;
    this.reverb.connect(this.revGain); this.revGain.connect(this.master);
    this.applyVolumes();
    this._timer = setInterval(() => this._schedule(), 25);
    return true;
  }
  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = settings.masterVol;
    this.musicBus.gain.value = settings.musicVol * 0.55;
    this.sfxBus.gain.value = settings.sfxVol;
    this.voiceBus.gain.value = settings.voiceVol;
  }
  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  // ---------- primitives ----------
  _env(g, t, a, peak, d, sus = 0) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + d);
  }
  tone({ type = 'square', f0 = 440, f1 = null, dur = 0.15, gain = 0.2, attack = 0.005, bus = null, pan = 0, filter = null, when = 0, detune = 0 }) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.detune.value = detune;
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); this._env(g, t, attack, gain, dur);
    let node = o;
    if (filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; node.connect(f); node = f; }
    node.connect(g);
    const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p); p.connect(bus || this.sfxBus);
    o.start(t); o.stop(t + attack + dur + 0.05);
  }
  noiseBurst({ dur = 0.3, gain = 0.3, f0 = 3000, f1 = 200, q = 1, type = 'lowpass', pan = 0, when = 0, bus = null, attack = 0.005, rev = 0 }) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + when;
    const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = c.createGain(); this._env(g, t, attack, gain, dur);
    const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    s.connect(f); f.connect(g); g.connect(p); p.connect(bus || this.sfxBus);
    if (rev) { const rg = c.createGain(); rg.gain.value = rev; g.connect(rg); rg.connect(this.reverb); }
    s.start(t, Math.random()); s.stop(t + attack + dur + 0.05);
  }

  // ---------- SFX ----------
  laser(level = 0, pan = 0) {
    const base = [1400, 1700, 2200][level];
    this.tone({ type: 'square', f0: base, f1: base * 0.22, dur: 0.13, gain: 0.07, pan, filter: 5000 });
    if (level >= 1) this.tone({ type: 'sawtooth', f0: base * 1.01, f1: base * 0.25, dur: 0.12, gain: 0.04, pan, detune: 15, filter: 4000 });
    if (level >= 2) this.tone({ type: 'sine', f0: base * 2, f1: base * 0.5, dur: 0.16, gain: 0.05, pan });
  }
  enemyLaser(pan = 0) { this.tone({ type: 'sawtooth', f0: 600, f1: 200, dur: 0.15, gain: 0.04, pan, filter: 2200 }); }
  chargeStart() {
    if (!this.ctx || this.loops.charge) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.6);
    const l = c.createOscillator(); l.frequency.value = 18; const lg = c.createGain(); lg.gain.value = 40; l.connect(lg); lg.connect(o.frequency);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2000;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.3);
    o.connect(f); f.connect(g); g.connect(this.sfxBus); o.start(t); l.start(t);
    this.loops.charge = { o, l, g };
  }
  chargeStop() {
    const L = this.loops.charge; if (!L) return;
    const t = this.ctx.currentTime; L.g.gain.cancelScheduledValues(t); L.g.gain.setTargetAtTime(0.0001, t, 0.03);
    L.o.stop(t + 0.2); L.l.stop(t + 0.2); this.loops.charge = null;
  }
  lockOn() { this.tone({ type: 'square', f0: 1800, dur: 0.05, gain: 0.06 }); this.tone({ type: 'square', f0: 2400, dur: 0.06, gain: 0.06, when: 0.07 }); }
  chargeShot() { this.tone({ type: 'sawtooth', f0: 300, f1: 1600, dur: 0.25, gain: 0.1, filter: 3000 }); this.noiseBurst({ dur: 0.3, gain: 0.12, f0: 800, f1: 4000, type: 'bandpass', q: 3 }); }
  explosion(size = 1, pan = 0) {
    const s = Math.min(3, size);
    this.noiseBurst({ dur: 0.35 + s * 0.35, gain: 0.18 + s * 0.08, f0: 2400, f1: 80, pan, rev: 0.4 });
    this.tone({ type: 'sine', f0: 140, f1: 35, dur: 0.3 + s * 0.25, gain: 0.25 + s * 0.08, pan });
  }
  bigExplosion() {
    for (let i = 0; i < 5; i++) this.noiseBurst({ dur: 1.2, gain: 0.25, f0: 3000, f1: 60, when: i * 0.18, pan: Math.random() * 2 - 1, rev: 0.6 });
    this.tone({ type: 'sine', f0: 100, f1: 25, dur: 2.0, gain: 0.45 });
  }
  enemyHit(pan = 0) { this.tone({ type: 'triangle', f0: 900, f1: 500, dur: 0.06, gain: 0.08, pan }); this.noiseBurst({ dur: 0.05, gain: 0.05, f0: 6000, f1: 3000, type: 'highpass', pan }); }
  armorPing(pan = 0) { this.tone({ type: 'square', f0: 2200, f1: 1800, dur: 0.05, gain: 0.05, pan }); }
  playerHit() { this.noiseBurst({ dur: 0.4, gain: 0.3, f0: 5000, f1: 300 }); this.tone({ type: 'square', f0: 220, f1: 60, dur: 0.3, gain: 0.15, filter: 1500 }); }
  bombLaunch() { this.noiseBurst({ dur: 0.6, gain: 0.15, f0: 600, f1: 3000, type: 'bandpass', q: 2 }); this.tone({ type: 'sawtooth', f0: 120, f1: 500, dur: 0.6, gain: 0.07, filter: 1200 }); }
  bombBlast() {
    this.noiseBurst({ dur: 2.2, gain: 0.4, f0: 4000, f1: 40, rev: 0.8 });
    this.tone({ type: 'sine', f0: 90, f1: 20, dur: 2.2, gain: 0.5 });
    this.tone({ type: 'sawtooth', f0: 1200, f1: 60, dur: 1.0, gain: 0.07, filter: 2500 });
  }
  ring(gold = false) {
    const seq = gold ? [72, 76, 79, 84, 88] : [76, 79, 84];
    seq.forEach((m, i) => this.tone({ type: 'triangle', f0: mtof(m), dur: 0.25, gain: 0.1, when: i * 0.06 }));
    seq.forEach((m, i) => this.tone({ type: 'sine', f0: mtof(m + 12), dur: 0.3, gain: 0.05, when: i * 0.06 + 0.03 }));
  }
  powerUp() { [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => this.tone({ type: 'square', f0: mtof(m), dur: 0.12, gain: 0.06, when: i * 0.05, filter: 3500 })); }
  oneUp() { [72, 79, 84, 88, 91, 96].forEach((m, i) => this.tone({ type: 'square', f0: mtof(m), dur: 0.16, gain: 0.07, when: i * 0.08, filter: 4000 })); }
  barrelRoll(pan = 0) { this.noiseBurst({ dur: 0.45, gain: 0.14, f0: 500, f1: 2500, type: 'bandpass', q: 4, pan }); }
  deflect(pan = 0) { this.tone({ type: 'square', f0: 2600, f1: 3400, dur: 0.06, gain: 0.07, pan }); this.tone({ type: 'sine', f0: 5200, dur: 0.1, gain: 0.04, pan, when: 0.02 }); }
  boost() { this.noiseBurst({ dur: 0.8, gain: 0.16, f0: 300, f1: 2400, type: 'bandpass', q: 1.5 }); this.tone({ type: 'sawtooth', f0: 90, f1: 220, dur: 0.6, gain: 0.08, filter: 900 }); }
  brake() { this.noiseBurst({ dur: 0.5, gain: 0.12, f0: 2000, f1: 300, type: 'bandpass', q: 1.5 }); }
  loopWhoosh() { this.noiseBurst({ dur: 1.2, gain: 0.14, f0: 300, f1: 1800, type: 'bandpass', q: 2 }); this.tone({ type: 'sawtooth', f0: 110, f1: 330, dur: 1.0, gain: 0.06, filter: 900 }); }
  alarm() { this.tone({ type: 'square', f0: 880, dur: 0.12, gain: 0.05 }); this.tone({ type: 'square', f0: 660, dur: 0.12, gain: 0.05, when: 0.15 }); }
  warning() { for (let i = 0; i < 3; i++) { this.tone({ type: 'sawtooth', f0: 440, f1: 880, dur: 0.35, gain: 0.07, when: i * 0.5, filter: 2000 }); } }
  menuMove() { this.tone({ type: 'square', f0: 1200, dur: 0.03, gain: 0.04, filter: 3000 }); }
  menuConfirm() { this.tone({ type: 'square', f0: 880, dur: 0.06, gain: 0.05 }); this.tone({ type: 'square', f0: 1320, dur: 0.08, gain: 0.05, when: 0.06 }); }
  menuBack() { this.tone({ type: 'square', f0: 660, dur: 0.06, gain: 0.05 }); this.tone({ type: 'square', f0: 440, dur: 0.08, gain: 0.05, when: 0.06 }); }
  radioOpen() { this.noiseBurst({ dur: 0.15, gain: 0.06, f0: 4000, f1: 1500, type: 'bandpass', q: 2, bus: this.voiceBus }); this.tone({ type: 'sine', f0: 1500, dur: 0.05, gain: 0.04, bus: this.voiceBus }); }
  voiceBlip(pitch = 300, ch = '') {
    if (!this.ctx) return;
    const v = 'aeiouy'.includes(ch.toLowerCase()) ? 1.25 : 1;
    this.tone({ type: 'square', f0: pitch * v * (0.9 + Math.random() * 0.25), f1: pitch * 0.85, dur: 0.05, gain: 0.05, bus: this.voiceBus, filter: 2200 });
  }
  checkpoint() { [67, 72, 76, 79].forEach((m, i) => this.tone({ type: 'triangle', f0: mtof(m), dur: 0.3, gain: 0.1, when: i * 0.09 })); }

  // ---------- engine hum ----------
  engineStart() {
    if (!this.ctx || this.loops.engine) return;
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 70;
    const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 35;
    const n = c.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.7;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(0.05, c.currentTime, 0.4);
    const ng = c.createGain(); ng.gain.value = 0.35;
    o.connect(f); o2.connect(f); n.connect(nf); nf.connect(ng); ng.connect(f); f.connect(g); g.connect(this.sfxBus);
    o.start(); o2.start(); n.start();
    this.loops.engine = { o, o2, n, f, g, nf };
  }
  engineSet(speed01, boosting) {
    const L = this.loops.engine; if (!L) return;
    const t = this.ctx.currentTime;
    L.o.frequency.setTargetAtTime(60 + speed01 * 80, t, 0.1);
    L.o2.frequency.setTargetAtTime(30 + speed01 * 40, t, 0.1);
    L.f.frequency.setTargetAtTime(350 + speed01 * 900 + (boosting ? 800 : 0), t, 0.1);
    L.nf.frequency.setTargetAtTime(700 + speed01 * 1500, t, 0.1);
  }
  engineStop() {
    const L = this.loops.engine; if (!L) return;
    const t = this.ctx.currentTime; L.g.gain.setTargetAtTime(0.0001, t, 0.15);
    L.o.stop(t + 0.6); L.o2.stop(t + 0.6); L.n.stop(t + 0.6); this.loops.engine = null;
  }

  // ---------- music ----------
  playMusic(name) {
    if (!this.ctx) return;
    if (this.songName === name) return;
    this.songName = name;
    if (!name) { this.song = null; return; }
    const s = SONGS[name];
    this.song = { def: s, step: 0, next: this.ctx.currentTime + 0.1, done: false };
  }
  stopMusic() { this.songName = null; this.song = null; }
  _schedule() {
    if (!this.song || !this.ctx) return;
    const S = this.song, d = S.def;
    const stepDur = 60 / d.bpm / 4;
    const total = d.chords.length * 16;
    while (S.next < this.ctx.currentTime + 0.15) {
      if (S.done) return;
      const st = S.step % total;
      const bar = Math.floor(st / 16), sib = st % 16;
      const t = S.next;
      // chord pad on bar start
      if (sib === 0) {
        chordNotes(d.chords[bar], 4).forEach((m) => this._musNote(t, mtof(m), stepDur * 16, 'triangle', 0.035, 1800));
        chordNotes(d.chords[bar], 3).forEach((m) => this._musNote(t, mtof(m) * 1.003, stepDur * 16, 'sawtooth', 0.012, 900));
      }
      // bass
      const bc = d.bassPat[sib];
      if (bc !== '.') {
        const root = chordNotes(d.chords[bar], 2)[0];
        const m = bc === 'o' ? root + 12 : root;
        this._musNote(t, mtof(m), stepDur * 0.9, 'sawtooth', 0.09, 700, true);
      }
      // drums
      const dc = d.drums[sib];
      if (dc === 'k') this._kick(t);
      if (dc === 's') this._snare(t);
      if (dc === 'h' || dc === 'k' && d.bpm > 120) this._hat(t, dc === 'h' ? 0.03 : 0.015);
      // lead
      const L = d.leadParsed;
      const lst = st % L.steps;
      for (const n of L.notes) if (n.step === lst) this._lead(t, mtof(n.midi), n.len * stepDur, d.leadGain);
      S.step++; S.next += stepDur;
      if (d.once && S.step >= total) { S.done = true; }
    }
  }
  _musNote(t, f, dur, type, gain, cutoff, pluck = false) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type; o.frequency.value = f;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cutoff;
    if (pluck) { fl.frequency.setValueAtTime(cutoff * 2.5, t); fl.frequency.exponentialRampToValueAtTime(cutoff * 0.6, t + dur); }
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + (pluck ? 0.005 : 0.08));
    g.gain.setValueAtTime(gain, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    o.connect(fl); fl.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + dur + 0.1);
  }
  _lead(t, f, dur, gain) {
    const c = this.ctx;
    const o1 = c.createOscillator(); o1.type = 'square'; o1.frequency.value = f;
    const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f; o2.detune.value = 9;
    const vib = c.createOscillator(); vib.frequency.value = 5.5; const vg = c.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.008, t + Math.min(0.4, dur));
    vib.connect(vg); vg.connect(o1.frequency); vg.connect(o2.frequency);
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 2600;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.015);
    g.gain.setTargetAtTime(gain * 0.7, t + 0.05, 0.1);
    g.gain.setValueAtTime(gain * 0.7, t + Math.max(0.03, dur - 0.03)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    o1.connect(fl); o2.connect(fl); fl.connect(g); g.connect(this.musicBus);
    const rg = c.createGain(); rg.gain.value = 0.5; g.connect(rg); rg.connect(this.reverb);
    [o1, o2, vib].forEach((o) => { o.start(t); o.stop(t + dur + 0.12); });
  }
  _kick(t) {
    const c = this.ctx; const o = c.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    const g = c.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.25);
  }
  _snare(t) {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200;
    const g = c.createGain(); g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    s.connect(f); f.connect(g); g.connect(this.musicBus); s.start(t, Math.random()); s.stop(t + 0.2);
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.12, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g2); g2.connect(this.musicBus); o.start(t); o.stop(t + 0.12);
  }
  _hat(t, gain) {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(this.musicBus); s.start(t, Math.random()); s.stop(t + 0.06);
  }
}

export const audio = new Audio();
