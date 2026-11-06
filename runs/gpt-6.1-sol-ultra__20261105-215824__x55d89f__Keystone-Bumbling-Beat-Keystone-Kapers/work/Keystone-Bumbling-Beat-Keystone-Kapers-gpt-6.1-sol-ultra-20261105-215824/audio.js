// Original procedural ragtime, arcade foley and nonsense speech. No audio assets.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);

function tone(ctx, bus, { at = ctx.currentTime, hz = 440, endHz, duration = .12, gain = .1, type = 'triangle', attack = .006, detune = 0, cutoff = 6000 } = {}) {
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(25, hz), at);
  if (endHz !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, endHz), at + duration);
  oscillator.detune.value = detune;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(gain, at + Math.min(attack, duration * .2));
  envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
  oscillator.connect(filter).connect(envelope).connect(bus);
  oscillator.start(at);
  oscillator.stop(at + duration + .025);
  oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); envelope.disconnect(); };
}

function noise(ctx, bus, at, duration, volume, cutoff = 900, seed = 1) {
  const length = Math.max(1, Math.ceil(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  let state = seed | 0;
  for (let i = 0; i < length; i++) {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    samples[i] = (((state ^ (state >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const envelope = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = cutoff;
  filter.Q.value = .65;
  envelope.gain.setValueAtTime(volume, at);
  envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
  source.connect(filter).connect(envelope).connect(bus);
  source.start(at);
  source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
}

function chirp(ctx, bus, at, root, length, vowel, volume) {
  const oscillator = ctx.createOscillator();
  const formant = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(root, at);
  oscillator.frequency.exponentialRampToValueAtTime(root * 1.15, at + length * .22);
  oscillator.frequency.exponentialRampToValueAtTime(root * .88, at + length);
  formant.type = 'bandpass';
  formant.frequency.setValueAtTime([700, 1150, 1800, 900, 1400][vowel % 5], at);
  formant.Q.value = 3;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + .008);
  gain.gain.exponentialRampToValueAtTime(.0001, at + length);
  oscillator.connect(formant).connect(gain).connect(bus);
  oscillator.start(at);
  oscillator.stop(at + length + .02);
  oscillator.onended = () => { oscillator.disconnect(); formant.disconnect(); gain.disconnect(); };
}

const MELODY = [
  77, 81, 84, 81, 79, 77, 76, 79, 81, 77, 74, 77, 76, 72, 74, null,
  74, 77, 81, 84, 82, 81, 77, 76, 79, 77, 74, 72, 76, 79, 84, null,
  79, 82, 86, 82, 81, 79, 77, 74, 76, 79, 82, 81, 79, 76, 72, null,
  77, 76, 74, 72, 69, 72, 74, 76, 77, 81, 79, 76, 77, null, 72, null,
];
const CHORDS = [[53,57,60], [50,53,57], [55,58,62], [48,52,58]];
const BPM = 132;
const EIGHTH = 60 / BPM / 2;

function musicStep(ctx, bus, step, at, intensity = 1) {
  const chord = CHORDS[Math.floor((step % 64) / 16)];
  const note = MELODY[step % MELODY.length];
  if (note !== null) {
    tone(ctx, bus, {at, hz: frequency(note), duration: .16, gain: .16 * intensity, type:'triangle', cutoff: 4800});
    tone(ctx, bus, {at: at + .003, hz: frequency(note + 12), duration: .075, gain: .025 * intensity, type:'sine'});
  }
  if (step % 4 === 0) {
    const bass = chord[0] - 12 + (step % 8 === 4 ? 7 : 0);
    tone(ctx, bus, {at, hz: frequency(bass), duration: .22, gain: .26 * intensity, type:'triangle', cutoff: 750});
  }
  if (step % 4 === 2) {
    for (const n of chord) tone(ctx, bus, {at, hz: frequency(n + 12), duration:.09, gain:.075 * intensity, type:'triangle', cutoff:2500});
  }
  if (step % 2 === 1) noise(ctx, bus, at, .038, .045 * intensity, 5800, step + 7);
  if (step % 8 === 0) tone(ctx, bus, {at, hz: 130, endHz:45, duration:.12, gain:.13 * intensity, type:'sine'});
}

function effect(ctx, bus, name, at) {
  const play = options => tone(ctx, bus, {at, ...options});
  switch (name) {
    case 'jump':
      play({hz:240,endHz:750,duration:.16,gain:.18,type:'triangle'});
      play({hz:125,endHz:180,duration:.10,gain:.1,type:'sine'}); break;
    case 'land':
      play({hz:90,endHz:45,duration:.09,gain:.17,type:'sine'});
      noise(ctx,bus,at,.065,.11,450,17); break;
    case 'pickup':
      [76,81,88].forEach((n,i)=>tone(ctx,bus,{at:at+i*.055,hz:frequency(n),duration:.17,gain:.13,type:'sine'})); break;
    case 'hit':
      play({hz:170,endHz:48,duration:.30,gain:.22,type:'triangle'});
      noise(ctx,bus,at,.20,.19,1100,41); break;
    case 'catch':
      [72,76,79,84,88].forEach((n,i)=>tone(ctx,bus,{at:at+i*.075,hz:frequency(n),duration:.24,gain:.14,type:'triangle'}));
      noise(ctx,bus,at+.08,.14,.08,4500,23); break;
    case 'elevator':
      [81,77].forEach((n,i)=>tone(ctx,bus,{at:at+i*.16,hz:frequency(n),duration:.45,gain:.14,type:'sine'})); break;
    case 'menu':
      play({hz:660,endHz:880,duration:.055,gain:.085,type:'triangle'}); break;
    case 'whistle':
      play({hz:1450,endHz:1800,duration:.14,gain:.09,type:'sine'});
      tone(ctx,bus,{at:at+.19,hz:1800,endHz:1450,duration:.26,gain:.09,type:'sine'}); break;
    case 'countdown':
      play({hz:960,duration:.10,gain:.12,type:'triangle'}); break;
    case 'win':
      [65,69,72,77,81,84].forEach((n,i)=>tone(ctx,bus,{at:at+i*.11,hz:frequency(n),duration:.4,gain:.16,type:'triangle'}));
      [65,69,72].forEach(n=>tone(ctx,bus,{at:at+.75,hz:frequency(n),duration:.7,gain:.1,type:'triangle'})); break;
    case 'lose':
      [72,71,70,65].forEach((n,i)=>tone(ctx,bus,{at:at+i*.20,hz:frequency(n),endHz:frequency(n-1),duration:.34,gain:.16,type:'triangle'})); break;
    case 'dash':
      noise(ctx,bus,at,.19,.18,2200,67);
      play({hz:360,endHz:900,duration:.13,gain:.07,type:'sine'}); break;
    case 'plane':
      play({hz:210,endHz:310,duration:.23,gain:.055,type:'sawtooth',cutoff:550}); break;
    default: return false;
  }
  return true;
}

export class AudioDirector {
  constructor() {
    this.context = null;
    this.musicVolume = .1;
    this.effectsVolume = .7;
    this.muted = false;
    this.scene = 'title';
    this.step = 0;
    this.nextNote = 0;
    this.events = {};
    this.scheduledNotes = 0;
    this.speechSerial = 0;
    this._analyserData = new Float32Array(256);
  }
  async unlock() {
    if (!this.context) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) return false;
      this.context = new Context();
      this.master = this.context.createGain();
      this.musicBus = this.context.createGain();
      this.effectsBus = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 512;
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -7;
      limiter.knee.value = 10;
      limiter.ratio.value = 8;
      limiter.attack.value = .003;
      limiter.release.value = .1;
      this.musicBus.connect(this.master);
      this.effectsBus.connect(this.master);
      this.master.connect(limiter).connect(this.analyser).connect(this.context.destination);
      this.master.gain.value = this.muted ? 0 : .72;
      this.musicBus.gain.value = this.musicVolume;
      this.effectsBus.gain.value = this.effectsVolume;
      this.nextNote = this.context.currentTime + .04;
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context.state === 'running';
  }
  setMusicVolume(v = .1) {
    this.musicVolume = clamp(v, 0, 1);
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, .05);
  }
  setEffectsVolume(v = .7) {
    this.effectsVolume = clamp(v, 0, 1);
    if (this.effectsBus) this.effectsBus.gain.setTargetAtTime(this.effectsVolume, this.context.currentTime, .05);
  }
  setMuted(v) {
    this.muted = Boolean(v);
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : .72, this.context.currentTime, .025);
  }
  setScene(scene) {
    this.scene = scene;
    if (scene === 'play') this.sfx('whistle');
  }
  update() {
    if (!this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (this.nextNote < now - .25) this.nextNote = now + .025;
    let scheduled = 0;
    while (this.nextNote < now + .32 && scheduled++ < 8) {
      const intensity = this.scene === 'pause' ? .22 : this.scene === 'title' ? .7 : this.scene === 'lose' ? .35 : 1;
      musicStep(this.context, this.musicBus, this.step, this.nextNote, intensity);
      this.scheduledNotes++;
      // Light swing keeps the tune buoyant without tying it to the render rate.
      this.nextNote += EIGHTH * (this.step % 2 === 0 ? 1.14 : .86);
      this.step++;
    }
  }
  sfx(name) {
    if (!this.context || this.context.state !== 'running') return false;
    const played = effect(this.context, this.effectsBus, name, this.context.currentTime + .006);
    if (played) this.events[name] = (this.events[name] || 0) + 1;
    return played;
  }
  voice(mood = 'hello') {
    if (!this.context || this.context.state !== 'running') return false;
    const patterns = {hello:[0,3,7,5,9],catch:[7,10,12,7,12],hurt:[5,2,-2],win:[0,4,7,12,9,12],lose:[5,2,0,-3],crook:[3,0,5,3,7,0]};
    const pattern = patterns[mood] || patterns.hello;
    const serial = this.speechSerial++;
    const root = mood === 'crook' ? 240 : 330;
    const at = this.context.currentTime + .015;
    pattern.forEach((note,i)=>chirp(this.context,this.effectsBus,at+i*.095,root*2**(note/12),.065+(i%2)*.025,(i+serial)%5,.20));
    this.events.voice = (this.events.voice || 0) + 1;
    return true;
  }
  inspect() {
    let peak = 0, energy = 0;
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this._analyserData);
      for (const sample of this._analyserData) { peak = Math.max(peak,Math.abs(sample)); energy += sample*sample; }
    }
    return {state:this.context?.state || 'locked',musicVolume:this.musicVolume,effectsVolume:this.effectsVolume,muted:this.muted,scene:this.scene,scheduledNotes:this.scheduledNotes,events:{...this.events},peak,rms:Math.sqrt(energy/this._analyserData.length)};
  }
}

export async function audioSelfTest() {
  const Context = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Context) return {supported:false,reason:'OfflineAudioContext unavailable'};
  const ctx = new Context(1, 44100 * 2, 44100);
  const bus = ctx.createGain();
  bus.gain.value = .4;
  bus.connect(ctx.destination);
  musicStep(ctx,bus,0,.02);
  musicStep(ctx,bus,1,.24);
  effect(ctx,bus,'jump',.48);
  effect(ctx,bus,'pickup',.75);
  effect(ctx,bus,'hit',1.1);
  chirp(ctx,bus,1.5,390,.12,2,.2);
  const rendered = await ctx.startRendering();
  const samples = rendered.getChannelData(0);
  let peak=0, energy=0, nonfinite=0;
  for (const sample of samples) { if (!Number.isFinite(sample)) nonfinite++; peak=Math.max(peak,Math.abs(sample)); energy+=sample*sample; }
  return {supported:true,duration:rendered.duration,sampleRate:rendered.sampleRate,peak,rms:Math.sqrt(energy/samples.length),nonfinite,clipped:peak>=1};
}
