// One mix module: engines, tyres, wind, rumble, world sounds, voices, menu sounds, music.
import { EngineSynth, noiseBuffer } from './enginesynth.js';
import { sayLine, SPEAKERS } from './voice.js';
import { SONGS, SONG_FOR } from '../data/songs.js';
import { CARS } from '../data/cars.js';
import { spatialize } from '../../pixel-engine.js';
const SFX = {
  tick: { wave: 'square', duty: 0.25, freq: 1400, decay: 0.022, volume: 0.1 },
  confirm: { wave: 'triangle', freq: 660, decay: 0.09, volume: 0.28, arp: [0, 7], arpRate: 0.045 },
  back: { wave: 'triangle', freq: 520, freqEnd: 330, decay: 0.09, volume: 0.22 },
  denied: { wave: 'square', duty: 0.5, freq: 150, decay: 0.14, volume: 0.2, arp: [0, -1], arpRate: 0.07 },
  register: { wave: 'square', duty: 0.25, freq: 1760, decay: 0.12, volume: 0.16, arp: [0, 4, 12], arpRate: 0.04, layers: [{ wave: 'noise', freq: 6000, decay: 0.05, volume: 0.1 }] },
  countTick: { wave: 'square', duty: 0.125, freq: 2100, decay: 0.012, volume: 0.06 },
  whirr: { wave: 'noise', freq: 1200, attack: 0.15, sustain: 0.3, decay: 0.3, volume: 0.05 },
  gearClunk: { wave: 'square', duty: 0.5, freq: 95, freqEnd: 60, decay: 0.05, volume: 0.22, layers: [{ wave: 'noise', freq: 3000, decay: 0.02, volume: 0.1 }] },
  wallThump: { wave: 'sine', freq: 90, freqEnd: 40, decay: 0.22, volume: 0.6, layers: [{ wave: 'noise', freq: 2000, decay: 0.12, volume: 0.35 }, { wave: 'square', freq: 210, freqEnd: 90, decay: 0.08, volume: 0.18 }] },
  carThump: { wave: 'sine', freq: 130, freqEnd: 70, decay: 0.14, volume: 0.45, layers: [{ wave: 'noise', freq: 3500, decay: 0.07, volume: 0.25 }] },
  landThump: { wave: 'sine', freq: 70, freqEnd: 34, decay: 0.3, volume: 0.6, layers: [{ wave: 'noise', freq: 900, decay: 0.2, volume: 0.25 }] },
  lockChirp: { wave: 'noise', freq: 7000, decay: 0.08, volume: 0.16, crush: 6 },
  ratchet: { wave: 'square', duty: 0.125, freq: 300, decay: 0.08, volume: 0.1, arp: [0, 3, 0, 3], arpRate: 0.018 },
  lapChime: { wave: 'triangle', freq: 988, decay: 0.3, volume: 0.28, arp: [0, 5], arpRate: 0.09 },
  beepLow: { wave: 'square', duty: 0.5, freq: 440, sustain: 0.18, decay: 0.05, volume: 0.22 },
  beepHigh: { wave: 'square', duty: 0.5, freq: 880, sustain: 0.5, decay: 0.15, volume: 0.28 },
  finalFlag: { wave: 'triangle', freq: 784, decay: 0.5, volume: 0.32, arp: [0, 4, 7, 12], arpRate: 0.09 },
  wheelGun: { wave: 'noise', freq: 3200, sustain: 0.32, decay: 0.03, volume: 0.22, crush: 5, vibrato: { depth: 8, rate: 70 } },
  jackUp: { wave: 'square', duty: 0.25, freq: 180, freqEnd: 300, decay: 0.25, volume: 0.1 },
  coneHit: { wave: 'triangle', freq: 500, freqEnd: 200, decay: 0.12, volume: 0.3 },
  fanfare2: { wave: 'square', duty: 0.25, freq: 523, decay: 0.7, volume: 0.22, arp: [0, 4, 7, 12, 7, 12, 16], arpRate: 0.11, layers: [{ wave: 'triangle', freq: 262, decay: 0.7, volume: 0.25, arp: [0, 0, 7, 12], arpRate: 0.2 }] },
  medal: { wave: 'triangle', freq: 660, decay: 0.45, volume: 0.32, arp: [0, 4, 7, 12], arpRate: 0.08 },
  fail: { wave: 'triangle', freq: 392, decay: 0.3, volume: 0.25, arp: [0, -2, -5], arpRate: 0.12 },
  firework: { wave: 'noise', freq: 1800, freqEnd: 500, decay: 0.5, volume: 0.25 },
  brush: { wave: 'noise', freq: 2400, sustain: 0.3, decay: 0.2, volume: 0.09 },
  otherCar: { wave: 'saw', freq: 130, sustain: 1, decay: 0.01, volume: 0.32 },
  crowd: { wave: 'noise', freq: 3000, sustain: 1, decay: 0.01, volume: 0.18 },
  rain: { wave: 'noise', freq: 9000, sustain: 1, decay: 0.01, volume: 0.1 },
  windIdle: { wave: 'noise', freq: 800, sustain: 1, decay: 0.01, volume: 0.1 },
};
export class Mix {
  constructor(app) { this.app = app; this.audio = null; this.counts = { tyre: 0, kerb: 0, voice: 0, shift: 0, engineFrames: 0 }; this.engines = []; this.built = false; this.song = null; this.lastVoice = null; this.others = []; this.silenced = false; }
  bind(ctx) {
    this.ctx = ctx; this.audio = ctx.audio;
    for (const [k, v] of Object.entries(SFX)) ctx.audio.register(k, v);
    this.others = [];
    // a scene change unloads the music and the loops
    this.song = null; this.loopsReady = false; this.worldLoops = {};
  }
  get actx() { return this.audio?.context ?? null; }
  ensureGraph() {
    if (this.built) return !!this.master;
    const c = this.actx; if (!c || !this.audio.unlocked) return false;
    this.built = true;
    this.master = c.createGain(); this.master.gain.value = 0.8;
    this.analyser = c.createAnalyser(); this.analyser.fftSize = 1024; this.master.connect(this.analyser); this.analyser.connect(c.destination);
    this.noise = noiseBuffer(c, 2);
    const noiseVoice = (type, f, q) => { const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(this.master); s.start(); return { src: s, filter: fl, gain: g }; };
    this.tyre = noiseVoice('bandpass', 1700, 6); this.tyreOsc = c.createOscillator(); this.tyreOsc.type = 'sawtooth'; this.tyreOsc.frequency.value = 880; const tg = c.createGain(); tg.gain.value = 0; const tb = c.createBiquadFilter(); tb.type = 'bandpass'; tb.frequency.value = 1500; tb.Q.value = 5; this.tyreOsc.connect(tb); tb.connect(tg); tg.connect(this.master); this.tyreOsc.start(); this.tyreOscG = tg;
    this.wind = noiseVoice('lowpass', 900, 0.5); this.gravel = noiseVoice('bandpass', 420, 0.8);
    this.kerb = c.createOscillator(); this.kerb.type = 'square'; this.kerb.frequency.value = 40; this.kerbG = c.createGain(); this.kerbG.gain.value = 0; this.kerb.connect(this.kerbG); this.kerbG.connect(this.master); this.kerb.start();
    this.voiceBus = c.createGain(); this.voiceBus.gain.value = 1; this.voiceBus.connect(this.master);
    return true;
  }
  /** Volumes each frame, respecting mute. */
  updateLevels() {
    if (!this.master) return; const v = this.audio.volume, t = this.actx.currentTime, on = this.audio.muted || this.silenced ? 0 : 1;
    this.master.gain.setTargetAtTime(v.master * v.sfx * on, t, 0.02);
    this.voiceBus.gain.setTargetAtTime(this.app.settings.voices ?? 0.8, t, 0.02);
  }
  ui(name) { this.audio?.play(name); }
  play(name, o) { this.audio?.play(name, o); }
  say(text, speakerId) {
    this.counts.voice++; this.lastVoice = { text, speaker: speakerId };
    if (!this.ensureGraph()) return;
    this.voiceBusStop?.();
    sayLine(this.actx, this.voiceBus, text, speakerId, this.noise);
  }
  music(key) {
    if (!this.audio) return; const name = SONG_FOR[key] ?? key, song = SONGS[name];
    if (this.song === name) return; this.song = name; this.audio.playMusic(song ?? null, name);
  }
  stopMusic() { this.song = null; this.audio?.playMusic(null); }
  // ---- driving sounds
  setCars(list) { this.clearEngines(); this.carList = list; this.pendingCars = true; }
  clearEngines() { for (const e of this.engines) e.synth?.dispose(); this.engines = []; this.pendingCars = false; }
  buildEngines() {
    if (!this.pendingCars || !this.ensureGraph()) return; this.pendingCars = false;
    this.engines = this.carList.map((o) => { const info = CARS[o.carId], d = o.params; return { synth: new EngineSynth(this.actx, this.master, { cylinders: info.cylinders, cut: info.exhaust.cut, bite: info.exhaust.bite, loud: info.exhaust.loud, redline: d.redline, turbo: !!d.turbo, sport: !!d.exhaustUp }), o }; });
  }
  /** Per frame while driving: heard: [{rpm, throttle, spool, pan, level}], and the world state of the nearest listener. */
  driving(heard, w = {}, dt = 1 / 60) {
    this.buildEngines();
    this.lastDrive = heard[0] ?? null;
    if (heard[0]) { this.counts.engineFrames++; this.synthLast = { rpm: heard[0].rpm, throttle: heard[0].throttle }; }
    if (w.squeal > 0.05) this.counts.tyre++; if (w.kerb > 0) this.counts.kerb++;
    if (!this.master) return;
    this.updateLevels();
    heard.forEach((s, i) => this.engines[i]?.synth.set(s, dt));
    const t = this.actx.currentTime;
    this.tyre.gain.gain.setTargetAtTime((w.squeal ?? 0) * 0.3, t, 0.04); this.tyreOscG.gain.setTargetAtTime((w.squeal ?? 0) * 0.08, t, 0.04); this.tyreOsc.frequency.setTargetAtTime(760 + (w.squeal ?? 0) * 500, t, 0.05);
    this.wind.gain.gain.setTargetAtTime(Math.min(0.32, (w.speed ?? 0) ** 2 * 0.00006) * (w.slip ? 1.6 : 1), t, 0.1);
    this.gravel.gain.gain.setTargetAtTime((w.rough ?? 0) * Math.min(1, (w.speed ?? 0) / 20) * 0.5, t, 0.04);
    this.kerbG.gain.setTargetAtTime((w.kerb ?? 0) * 0.14, t, 0.02); this.kerb.frequency.setTargetAtTime(14 + (w.speed ?? 0) * 1.6, t, 0.02);
  }
  quietDriving() { if (!this.master) return; const t = this.actx.currentTime; for (const v of [this.tyre.gain, this.wind.gain, this.gravel.gain]) v.gain.setTargetAtTime(0, t, 0.05); this.tyreOscG.gain.setTargetAtTime(0, t, 0.05); this.kerbG.gain.setTargetAtTime(0, t, 0.05); for (const e of this.engines) e.synth.set({ rpm: 900, throttle: 0, mute: true }, 0.016); }
  /** Up to three nearest other cars, through engine loops. */
  otherCars(listener, cars) {
    const audio = this.audio; if (!audio) return;
    while (this.others.length < 3) this.others.push(audio.loop('otherCar', { volume: 0 }));
    cars.slice(0, 3).forEach((c, i) => { const s = spatialize(listener, c, { ref: 5, max: 90 }), info = CARS[c.carId], base = (((c.rpm ?? 2000) / 60) * ((info?.cylinders ?? 4) / 2)) / 130; this.others[i]?.set({ volume: s.gain * 0.4, pan: s.pan, pitch: 12 * Math.log2(Math.max(0.1, base)) }); });
    for (let i = cars.length; i < 3; i++) this.others[i]?.set({ volume: 0 });
  }
  world(name, volume, pan = 0) { const a = this.audio; if (!a) return; const L = (this.worldLoops[name] ??= a.loop(name, { volume: 0 })); L.set({ volume, pan }); }
  stopEverything() { this.silenced = true; this.clearEngines(); this.quietDriving(); this.audio?.stopLoops(); this.audio?.playMusic(null); this.song = null; this.others = []; this.worldLoops = {}; if (this.master) try { this.master.gain.value = 0; } catch { /* closed */ } }
  level() { if (!this.analyser) return 0; const a = new Float32Array(this.analyser.fftSize); this.analyser.getFloatTimeDomainData(a); let s = 0; for (const v of a) s += v * v; return Math.sqrt(s / a.length); }
}
export { SPEAKERS };
