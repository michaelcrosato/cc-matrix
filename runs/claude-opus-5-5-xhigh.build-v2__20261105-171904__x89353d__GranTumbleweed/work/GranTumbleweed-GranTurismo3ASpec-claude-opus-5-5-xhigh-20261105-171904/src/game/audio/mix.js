// All sound goes through here. The engine's AudioManager plays effects and music; this adds the engine synths, tyres, wind, rain and voices.
import { EngineSynth, noiseBuffer } from './enginesynth.js';
import { speak } from './voice.js';
import { SFX } from './sfx.js';
import { playSong } from './music.js';
import { spatialize } from '../../pixel-engine.js';
import { CAR_INFO } from '../data/cars.js';
export function engineData(carId, p) {
  const i = CAR_INFO[carId];
  return { cylinders: i?.cyl ?? 4, filter: i?.filter ?? 1200, exhaust: i?.exhaust ?? 1, turbo: !!p?.turbo, sportExhaust: !!p?.sportExhaust, redline: p?.redline ?? 7000, idle: p?.idle ?? 900 };
}
export class AudioMix {
  constructor(app) { this.app = app; this.audio = null; this.built = false; this.synths = []; this.voiceFor = null; this.song = null; this.lastVoice = null; this.silent = false; this.kerbT = 0; this.lastLoud = 0; }
  attach(audio) {
    if (this.audio === audio) return; this.audio = audio; this.built = false; this.synths = [];
    for (const [k, v] of Object.entries(SFX)) audio.register(k, v);
  }
  ensure() {
    const a = this.audio; if (this.built || !a?.context) return !!this.built;
    const c = a.context; this.built = true; this.ctx = c; this.noise = noiseBuffer(c);
    this.master = c.createGain(); this.master.connect(c.destination);
    this.analyser = c.createAnalyser?.() ?? null; if (this.analyser) { this.analyser.fftSize = 1024; this.master.connect(this.analyser); }
    this.voices = c.createGain(); this.voices.connect(c.destination);
    const loop = (filterType, freq, Q = 1) => { const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = Q; const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(this.master); s.start(); return { s, f, g }; };
    this.tyre = loop('bandpass', 2100, 7); this.wind = loop('lowpass', 900); this.gravel = loop('lowpass', 500, 0.8); this.rain = loop('highpass', 3000); this.crowd = loop('bandpass', 900, 0.6);
    const k = c.createOscillator(); k.type = 'square'; k.frequency.value = 40; const kg = c.createGain(); kg.gain.value = 0; const kf = c.createBiquadFilter(); kf.type = 'lowpass'; kf.frequency.value = 500; k.connect(kf); kf.connect(kg); kg.connect(this.master); k.start(); this.kerb = { o: k, g: kg };
    return true;
  }
  // Scales our graph by the engine's volumes every frame, respecting mute.
  volumes() {
    if (!this.built) return;
    const v = this.audio.volume, on = !v.muted && !this.silent, t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(on ? v.master * v.sfx : 0, t, 0.02);
    this.voices.gain.setTargetAtTime(on ? v.master * (this.app.options?.voices ?? 0.8) : 0, t, 0.02);
  }
  sfx(name, o) { if (this.silent) return; this.audio?.play(name, o); }
  count(name) { if (this.audio) this.audio.counts[name] = (this.audio.counts[name] ?? 0) + 1; }
  music(songId) {
    if (!this.audio) return;
    if (this.song === songId && this.audio.playing) return;
    this.song = songId; playSong(this.audio, songId);
  }
  say(text, speaker) {
    this.count('voice'); if (this.silent) return;
    if (!this.ensure()) { this.lastLine = { text, speaker }; return; }
    this.lastVoice?.stop(); this.lastVoice = speak(this.ctx, this.voices, this.noise, text, speaker, 0.55);
    this.lastLine = { text, speaker };
  }
  stopVoice() { this.lastVoice?.stop(); this.lastVoice = null; }
  // ---- cars: one synth per listened-to car, reassigned as cars come and go. ----
  synthFor(slot, carKey, carId, p) {
    if (!this.ensure()) return null;
    let s = this.synths[slot];
    if (s && s.key === carKey) return s.synth;
    if (s) { s.synth.dispose(); }
    const synth = new EngineSynth(this.ctx, this.master, engineData(carId, p), { noise: this.noise });
    this.synths[slot] = { key: carKey, synth };
    return synth;
  }
  // list: [{ key, carId, p, rpm, throttle, spool, gain, pan }]. Slot 0 is the driver's own.
  engines(list, dt) {
    if (this.silent) { this.volumes(); return; }
    this.volumes(); this.lastEngines = list;
    if (!this.built && !this.ensure()) return;
    for (let i = 0; i < 4; i++) { const it = list[i], s = it ? this.synthFor(i, it.key, it.carId, it.p) : this.synths[i]?.synth; if (!s) continue; if (it) s.set({ rpm: it.rpm, throttle: it.throttle, spool: it.spool, gain: it.gain, pan: it.pan, dt }); else s.silence(); }
  }
  // The nearest other cars: looping voices placed in the world, pitched by their rpm. list: [{ x, y, z, rpm }].
  others(list, listener) {
    if (!this.audio || this.silent) return;
    this.loopVoices ??= [];
    for (let i = 0; i < 3; i++) {
      const it = list[i]; let v = this.loopVoices[i];
      if (!it) { v?.set({ volume: 0 }); continue; }
      if (!v || v.stopped) v = this.loopVoices[i] = this.audio.loop('carLoop', { volume: 0 });
      const s = spatialize(listener, it, { ref: 6, max: 110 });
      v.set({ volume: s.gain * 0.5, pan: s.pan, pitch: 12 * Math.log2(Math.max(0.25, it.rpm / 3000)) });
    }
  }
  // state: { tyre, wind, gravel, rain, kerb, crowd }: gains 0..1.
  world(st) {
    if (!this.built) return;
    const t = this.ctx.currentTime, k = 0.05;
    this.tyre.g.gain.setTargetAtTime((st.tyre ?? 0) * 0.14, t, k); this.tyre.f.frequency.setTargetAtTime(1900 + (st.tyrePitch ?? 0) * 900, t, k);
    this.wind.g.gain.setTargetAtTime((st.wind ?? 0) * 0.18, t, k); this.wind.f.frequency.setTargetAtTime(500 + (st.wind ?? 0) * 1600, t, k);
    this.gravel.g.gain.setTargetAtTime((st.gravel ?? 0) * 0.28, t, k); this.rain.g.gain.setTargetAtTime((st.rain ?? 0) * 0.07, t, 0.2); this.crowd.g.gain.setTargetAtTime((st.crowd ?? 0) * 0.08, t, 0.25);
    this.kerb.g.gain.setTargetAtTime((st.kerb ?? 0) * 0.08, t, 0.02); this.kerb.o.frequency.setTargetAtTime(20 + (st.kerbRate ?? 0) * 3, t, 0.03);
  }
  quiet() {
    if (!this.built) return;
    for (const s of this.synths) s?.synth.silence();
    this.world({});
  }
  clearCars() { for (const s of this.synths) { try { s?.synth.dispose(); } catch { /* gone */ } } this.synths = []; for (const v of this.loopVoices ?? []) v?.stop(); this.loopVoices = []; if (this.built) this.world({}); }
  // Stops everything, for the hub's `end`.
  stopAll() { this.silent = true; this.stopVoice(); this.clearCars(); this.audio?.playMusic(null); this.song = null; if (this.built) { this.master.gain.value = 0; this.voices.gain.value = 0; } }
  testHooks() { return { EngineSynthClass: EngineSynth, speak, noiseBuffer }; }
  level() { if (!this.analyser) return 0; const a = new Float32Array(this.analyser.fftSize); this.analyser.getFloatTimeDomainData(a); let m = 0; for (const v of a) m = Math.max(m, Math.abs(v)); return m; }
}
