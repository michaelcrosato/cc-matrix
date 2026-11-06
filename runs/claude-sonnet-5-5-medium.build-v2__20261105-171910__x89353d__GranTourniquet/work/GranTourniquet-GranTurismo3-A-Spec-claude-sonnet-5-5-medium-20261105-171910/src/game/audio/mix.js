// The one audio mix: engine voices, tyres, wind, kerbs, effects, voices, music. All code, no files. Plan section 10.
import { EngineSynth } from './enginesynth.js';
import { say as sayVoice, SPEAKERS } from './voice.js';
import { SONGS, SONG_FOR } from '../data/songs.js';
import { CAR_INFO } from '../data/cars.js';
const SFX = {
  tick: { wave: 'square', duty: 0.25, freq: 1400, freqEnd: 1000, decay: 0.03, volume: 0.12 }, confirm: { wave: 'triangle', freq: 660, decay: 0.12, volume: 0.25, arp: [0, 7], arpRate: 0.06 }, back: { wave: 'triangle', freq: 440, freqEnd: 330, decay: 0.1, volume: 0.2 }, denied: { wave: 'square', duty: 0.5, freq: 180, freqEnd: 120, decay: 0.18, volume: 0.2 },
  cash: { wave: 'triangle', freq: 1500, decay: 0.08, volume: 0.15, arp: [0, 5, 12], arpRate: 0.03 }, whirr: { wave: 'sawtooth', freq: 120, freqEnd: 260, decay: 0.5, volume: 0.05 },
  lap: { wave: 'sine', freq: 880, decay: 0.3, volume: 0.25, arp: [0, 7, 12], arpRate: 0.07 }, beep: { wave: 'square', duty: 0.5, freq: 440, decay: 0.15, volume: 0.2 }, green: { wave: 'square', duty: 0.5, freq: 880, decay: 0.45, volume: 0.25 }, finish: { wave: 'triangle', freq: 523, decay: 0.8, volume: 0.3, arp: [0, 4, 7, 12, 16], arpRate: 0.09 },
  clunk: { wave: 'square', duty: 0.5, freq: 110, freqEnd: 60, decay: 0.06, volume: 0.14 }, kerb: { wave: 'square', duty: 0.5, freq: 90, decay: 0.08, volume: 0.1 }, wall: { wave: 'noise', freq: 300, decay: 0.3, volume: 0.45, layers: [{ wave: 'sine', freq: 90, freqEnd: 40, decay: 0.3, volume: 0.5 }] },
  car: { wave: 'noise', freq: 500, decay: 0.2, volume: 0.3, layers: [{ wave: 'sine', freq: 130, freqEnd: 70, decay: 0.2, volume: 0.35 }] }, thump: { wave: 'sine', freq: 100, freqEnd: 40, decay: 0.25, volume: 0.35, layers: [{ wave: 'noise', freq: 200, decay: 0.15, volume: 0.2 }] },
  chirp: { wave: 'square', duty: 0.25, freq: 1800, freqEnd: 2400, decay: 0.07, volume: 0.1 }, ratchet: { wave: 'square', duty: 0.125, freq: 600, decay: 0.03, volume: 0.1, arp: [0, 0, 0], arpRate: 0.03 }, pop: { wave: 'noise', freq: 900, decay: 0.05, volume: 0.15 },
  cone: { wave: 'square', duty: 0.5, freq: 300, freqEnd: 150, decay: 0.1, volume: 0.15 }, wrench: { wave: 'noise', freq: 1500, decay: 0.05, volume: 0.15, arp: [0, 3, 0, 3], arpRate: 0.04 }, jack: { wave: 'sawtooth', freq: 200, freqEnd: 330, decay: 0.3, volume: 0.1 },
  medal: { wave: 'triangle', freq: 523, decay: 0.9, volume: 0.3, arp: [0, 4, 7, 12], arpRate: 0.1 }, reveal: { wave: 'sawtooth', freq: 130, freqEnd: 520, decay: 1.2, volume: 0.12 }, buy: { wave: 'triangle', freq: 392, decay: 0.3, volume: 0.25, arp: [0, 5, 9, 14], arpRate: 0.06 }, dyno: { wave: 'sawtooth', freq: 80, freqEnd: 400, decay: 2, volume: 0.1 },
};
export class Mix {
  constructor(engine) {
    this.e = engine; this.audio = engine.audio; this.voiceVol = 0.8; this.nodes = null; this.engines = new Map(); this.counts = { shift: 0, kerb: 0, tyre: 0, voice: 0, say: 0 }; this.lastRpm = 0; this.lastSay = null; this.subtitle = null; this.stopped = false; this.song = ''; this.sayEnd = 0;
    for (const [n, d] of Object.entries(SFX)) this.audio.register(n, d);
  }
  get ready() { return !!this.audio.context && this.audio.unlocked; }
  gain() { const v = this.audio.volume; return v.muted ? 0 : v.master * v.sfx; }
  init() { // build the loop graph once the context exists
    if (this.nodes || !this.ready) return; const c = this.audio.context; const bus = c.createGain(); bus.connect(c.destination); this.analyser = c.createAnalyser(); this.analyser.fftSize = 1024; bus.connect(this.analyser); this.abuf = new Float32Array(1024); const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0); let s = 987654; for (let i = 0; i < d.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
    const loop = (type, f, q, g0 = 0) => { const n = c.createBufferSource(); n.buffer = buf; n.loop = true; const bp = c.createBiquadFilter(); bp.type = type; bp.frequency.value = f; bp.Q.value = q; const g = c.createGain(); g.gain.value = g0; n.connect(bp).connect(g).connect(bus); n.start(); return { n, bp, g }; };
    this.nodes = { bus, c, squeal: loop('bandpass', 1800, 6), wind: loop('lowpass', 700, 0.5), gravel: loop('lowpass', 500, 0.7), rain: loop('highpass', 3000, 0.3), crowd: loop('bandpass', 700, 0.4), kerb: (() => { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 40; const g = c.createGain(); g.gain.value = 0; o.connect(g).connect(bus); o.start(); return { o, g }; })() };
  }
  level() { if (!this.analyser) return 0; this.analyser.getFloatTimeDomainData(this.abuf); let e = 0; for (let i = 0; i < this.abuf.length; i++) e += this.abuf[i] * this.abuf[i]; return Math.sqrt(e / this.abuf.length); }
  sfx(name, o) { if (this.stopped) return; this.audio.play(name, o); if (name === 'clunk') this.counts.shift++; if (name === 'kerb') this.counts.kerb++; }
  tick() { this.sfx('tick'); } confirm() { this.sfx('confirm'); } back() { this.sfx('back'); } denied() { this.sfx('denied'); }
  say(text, speaker = 'arai') { // gibberish with a subtitle; same words always sound the same
    this.subtitle = { text, speaker, t: 0, len: Math.min(8, 1 + text.length * 0.07) }; this.counts.say++; this.lastSay = text; if (!this.ready || this.stopped) return; this.init(); const c = this.audio.context, g = c.createGain(); g.gain.value = this.voiceVol * this.gain() * 1.2; g.connect(c.destination);
    const r = sayVoice(c, g, text, speaker, c.currentTime, 1); this.counts.voice += r.syllables; this.sayEnd = c.currentTime + r.duration;
  }
  music(name) { const key = SONG_FOR[name] ?? name, song = SONGS[key]; if (!song) return; if (this.song === key) return; this.song = key; this.audio.playMusic(song, key); }
  stopMusic() { this.song = ''; this.audio.stopMusic(); }
  clear() { this.stopEngines(); this.subtitle = null; }
  stopEngines() { for (const s of this.engines.values()) s.synth.stop(); this.engines.clear(); if (this.nodes) { for (const k of ['squeal', 'wind', 'gravel', 'rain', 'crowd']) this.nodes[k].g.gain.value = 0; this.nodes.kerb.g.gain.value = 0; } }
  raceStart(sc) { this.stopped = false; this.init(); }
  raceStop() { this.stopEngines(); }
  stopAll() { this.stopped = true; this.stopEngines(); this.audio.stopMusic(); this.song = ''; }
  engineFor(key, car, volumeMul = 1) { let s = this.engines.get(key); if (!s && this.ready) { const info = CAR_INFO[car.carId]; s = { synth: new EngineSynth(this.audio.context, this.nodes.bus, { cyl: info.cyl, exh: Math.min(1, info.exh + (car.p.exhaust ? 0.25 : 0)), turbo: !!car.p.turbo, gain: volumeMul }), car }; this.engines.set(key, s); } return s; }
  // per-frame race sound: the player's engine, up to 3 nearest others, tyres, wind, kerbs
  raceFrame(sc, dt) {
    if (this.stopped) return; this.init(); if (!this.nodes) return; const N = this.nodes, c = N.c, f = sc.focus, fc = f.c, G = this.gain(), t = c.currentTime; N.bus.gain.value = G;
    const live = new Set(); const near = sc.sim.cars.filter((x) => x !== f).map((x) => [x, (x.c.x - fc.x) ** 2 + (x.c.z - fc.z) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, 3);
    const syn = (key, car, vol, pan) => { const s = this.engineFor(key, car, vol); if (!s) return; live.add(key); const limiter = car.c.rpm >= car.p.redline - 20 && car.inp.throttle > 0.5; const sp = car.c.spool ?? 0; s.synth.update(Math.max(900, car.c.rpm), car.inp.throttle, sp, 1, pan, limiter); if (car === f) this.lastRpm = car.c.rpm; };
    if (!sc.cfg.noEngine) syn('f', f, sc.cam.mode === 2 ? 1.1 : 1, 0);
    for (const [car, d2] of near) { const d = Math.sqrt(d2); if (d > 90) continue; const sn = Math.sin(fc.yaw), cs = Math.cos(fc.yaw), rx = -cs, rz = sn, pan = Math.max(-1, Math.min(1, ((car.c.x - fc.x) * rx + (car.c.z - fc.z) * rz) / 30)); syn('a' + car.id, car, Math.max(0, 0.45 * (1 - d / 90)), pan); }
    for (const [k, s] of this.engines) if (!live.has(k)) { s.synth.stop(); this.engines.delete(k); }
    const u = Math.hypot(fc.vx, fc.vz), use = Math.max(...fc.use), slide = fc.locked || fc.sliding || (fc.spinning && u > 3), surf = fc.surface;
    const sq = slide && u > 4 && surf !== 'dirt' && surf !== 'gravel' ? 0.35 : use > 0.9 && u > 10 ? 0.06 : 0; N.squeal.g.gain.setTargetAtTime(sq * (sc.cfg.noTyre ? 0 : 1), t, 0.05); N.squeal.bp.frequency.setTargetAtTime(1500 + use * 700, t, 0.1); if (sq > 0.2) this.counts.tyre++;
    N.wind.g.gain.setTargetAtTime(Math.min(0.35, (u / 90) ** 2 * 0.35 * (f.slip ? 1.6 : 1)), t, 0.1); N.wind.bp.frequency.setTargetAtTime(500 + u * 6, t, 0.1);
    N.gravel.g.gain.setTargetAtTime(surf === 'gravel' || surf === 'grass' || surf === 'dirt' ? Math.min(0.3, u / 60) : 0, t, 0.08); N.rain.g.gain.setTargetAtTime(sc.world.rain ? 0.05 : 0, t, 0.3);
    N.kerb.g.gain.setTargetAtTime(surf === 'kerb' && u > 8 ? 0.08 : 0, t, 0.03); N.kerb.o.frequency.setTargetAtTime(Math.max(20, u * 1.6), t, 0.05);
    const crowd = sc.world.id === 'kestrel' || sc.world.id === 'saltline' ? 0.05 : 0; N.crowd.g.gain.setTargetAtTime(crowd, t, 0.5);
    if (this.subtitle) { this.subtitle.t += dt; if (this.subtitle.t > this.subtitle.len) this.subtitle = null; }
  }
}
