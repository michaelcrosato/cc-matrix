// Every sound in the expedition is synthesized here; no sampled audio is used.
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number(v) || 0));
const hz = (note) => 440 * 2 ** ((note - 69) / 12);

function makeSynth(ctx, music, sfx) {
  let seed = 41971;
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    samples[i] = (seed / 2147483648 - 1) * 0.7;
  }
  let sounds = 0;
  const cleanup = (source, nodes) => {
    source.onended = () => {
      source.disconnect();
      for (const node of nodes) node.disconnect();
    };
  };
  function tone(f, at, duration, volume, type = 'triangle', bus = sfx, endFrequency = f, cutoff = 6000) {
    if (!(f > 0) || !(duration > 0)) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(f, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFrequency), at + duration);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, at);
    filter.Q.value = 0.5;
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), at + Math.min(0.012, duration * 0.12));
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(filter).connect(env).connect(bus);
    osc.start(at);
    osc.stop(at + duration + 0.025);
    cleanup(osc, [filter, env]);
    sounds++;
  }
  function hiss(at, duration, volume, center = 1300, q = 0.6, bus = sfx, descend = 1) {
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    source.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(center, at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, center * descend), at + duration);
    filter.Q.value = q;
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), at + Math.min(0.02, duration * 0.15));
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(env).connect(bus);
    source.start(at, (sounds * 0.073) % 0.8);
    source.stop(at + duration + 0.025);
    cleanup(source, [filter, env]);
    sounds++;
  }
  function pluck(note, at, duration = 0.36, volume = 0.25) {
    const frequency = hz(note);
    tone(frequency, at, duration, volume, 'triangle', music, frequency * 0.998, 4000);
    tone(frequency * 2, at, duration * 0.4, volume * 0.22, 'sine', music, frequency * 2, 6000);
    hiss(at, 0.025, volume * 0.18, 3600, 0.3, music);
  }
  function marimba(note, at, volume = 0.25) {
    tone(hz(note), at, 0.32, volume, 'sine', music);
    tone(hz(note) * 3, at, 0.055, volume * 0.2, 'sine', music);
  }
  function brass(note, at, duration = 0.4, volume = 0.17) {
    tone(hz(note), at, duration, volume, 'sawtooth', music, hz(note) * 0.997, 1300);
    tone(hz(note) * 1.003, at + 0.006, duration * 0.92, volume * 0.3, 'triangle', music, hz(note), 1700);
  }
  function drum(at, strong = false) {
    tone(strong ? 130 : 95, at, strong ? 0.2 : 0.13, strong ? 0.35 : 0.2, 'sine', music, 42, 1000);
    hiss(at, 0.075, strong ? 0.16 : 0.08, strong ? 1400 : 2200, 0.4, music, 0.4);
  }
  function effect(name, when = ctx.currentTime) {
    const at = Math.max(ctx.currentTime, when) + 0.003;
    switch (name) {
      case 'whip':
        hiss(at, 0.18, 0.5, 500, 0.65, sfx, 9);
        hiss(at + 0.105, 0.055, 0.9, 5500, 0.5);
        tone(1100, at + 0.1, 0.045, 0.17, 'square', sfx, 140, 6000);
        break;
      case 'hit':
        hiss(at, 0.16, 0.6, 700, 0.45, sfx, 0.3);
        tone(180, at, 0.18, 0.38, 'triangle', sfx, 44, 1200);
        break;
      case 'coin':
        tone(hz(88), at, 0.18, 0.21, 'sine');
        tone(hz(95), at + 0.08, 0.28, 0.2, 'sine');
        break;
      case 'step':
        hiss(at, 0.065, 0.14, 550, 0.2);
        tone(82, at, 0.05, 0.06, 'sine', sfx, 50);
        break;
      case 'roll':
        hiss(at, 0.34, 0.3, 500, 0.3, sfx, 2);
        tone(110, at + 0.12, 0.16, 0.17, 'triangle', sfx, 48);
        break;
      case 'puzzle':
        [64, 69, 73, 76].forEach((note, i) => tone(hz(note), at + i * 0.09, 0.7, 0.19, 'triangle', sfx, hz(note), 2800));
        hiss(at + 0.06, 0.55, 0.16, 180, 0.6, sfx, 4);
        break;
      case 'win':
        [62, 66, 69, 74, 73, 74, 78, 81, 86].forEach((note, i) => {
          const t = at + i * 0.15;
          tone(hz(note), t, i === 8 ? 1.35 : 0.44, 0.2, 'sawtooth', sfx, hz(note), 1800);
          tone(hz(note - 12), t, 0.4, 0.1, 'triangle');
        });
        break;
      case 'snake':
        hiss(at, 0.5, 0.32, 5000, 1.1, sfx, 0.5);
        break;
      case 'rumble':
        hiss(at, 0.95, 0.65, 100, 0.3, sfx, 0.5);
        tone(48, at, 0.85, 0.3, 'triangle', sfx, 24, 180);
        break;
      case 'swing':
        hiss(at, 0.6, 0.22, 300, 0.3, sfx, 5);
        tone(190, at, 0.25, 0.08, 'sine', sfx, 480);
        break;
      case 'dig':
        for (let i = 0; i < 3; i++) {
          hiss(at + i * 0.18, 0.15, 0.4, 380 + i * 150, 0.3, sfx, 0.5);
          tone(320, at + i * 0.18, 0.05, 0.09, 'triangle', sfx, 110);
        }
        break;
      case 'menu':
        tone(620, at, 0.07, 0.13, 'sine', sfx, 810);
        break;
      case 'flute':
        [74, 77, 79, 81, 79, 77, 74].forEach((note, i) => {
          tone(hz(note), at + i * 0.15, 0.26, 0.15, 'sine');
          hiss(at + i * 0.15, 0.15, 0.025, 2800, 0.4);
        });
        break;
      default:
        tone(440, at, 0.08, 0.1, 'sine', sfx, 520);
    }
  }
  function voice(text, when = ctx.currentTime) {
    const syllables = Math.min(15, Math.max(4, Math.ceil(String(text || 'Well then').length / 4)));
    let hash = 7;
    for (const char of String(text)) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    for (let i = 0; i < syllables; i++) {
      const at = Math.max(ctx.currentTime, when) + 0.02 + i * 0.085;
      const vowel = (hash >>> ((i % 7) * 4)) % 5;
      const frequency = 170 + ((hash >>> (i % 13)) % 160);
      tone(frequency, at, 0.065, 0.13, 'sawtooth', sfx, frequency * (i % 3 === 0 ? 1.25 : 0.9), [850, 1400, 2100, 600, 1100][vowel]);
      tone(frequency * 2.01, at, 0.045, 0.04, 'sine', sfx, frequency * 2, 3000);
    }
  }
  return { tone, hiss, pluck, marimba, brass, drum, effect, voice, get sounds() { return sounds; } };
}

export function createAudio() {
  let ctx = null;
  let synth = null;
  let master = null;
  let music = null;
  let sfx = null;
  let analyser = null;
  let scratch = null;
  let musicVolume = 0.1;
  let sfxVolume = 0.65;
  let paused = false;
  let nextTick = 0;
  let tick = 0;
  let stage = 0;
  let disposed = false;
  let peakEver = 0;
  let energyEver = 0;
  const melody = [0, null, 7, 12, 10, 7, 3, 5, 7, null, 3, 2, 0, null, -2, null, 0, 3, 7, 12, 14, 12, 10, 7, 5, 3, 2, 7, 0, null, 7, null];
  const darkMelody = [0, null, 1, 7, 5, null, 3, 1, 0, null, -2, null, 1, 3, 5, null, 7, null, 8, 7, 5, 3, 1, null, 0, null, -2, 1, 0, null, null, null];
  const setGain = (node, value) => {
    if (node && ctx && ctx.state !== 'closed') node.gain.setTargetAtTime(value, ctx.currentTime, 0.035);
  };
  async function unlock() {
    if (disposed) return false;
    if (!ctx) {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return false;
      try {
        ctx = new Audio({ latencyHint: 'interactive' });
        master = ctx.createGain();
        music = ctx.createGain();
        sfx = ctx.createGain();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        scratch = new Float32Array(analyser.fftSize);
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.knee.value = 12;
        compressor.ratio.value = 4;
        music.gain.value = musicVolume;
        sfx.gain.value = sfxVolume;
        master.gain.value = paused ? 0 : 0.85;
        music.connect(master);
        sfx.connect(master);
        master.connect(compressor).connect(analyser).connect(ctx.destination);
        synth = makeSynth(ctx, music, sfx);
        nextTick = ctx.currentTime + 0.04;
      } catch {
        return false;
      }
    }
    try {
      if (ctx.state === 'suspended') await ctx.resume();
      return ctx.state === 'running';
    } catch {
      return false;
    }
  }
  function update(dt, newStage = 0, danger = false) {
    stage = Math.max(0, Math.floor(Number(newStage) || 0));
    if (!synth || !ctx || ctx.state !== 'running' || paused || disposed) return;
    const urgency = typeof danger === 'number' ? clamp(danger) : danger ? 1 : 0;
    const beat = 60 / (stage === 3 ? 96 + urgency * 32 : 108 + urgency * 8) / 2;
    if (nextTick < ctx.currentTime - 0.5) nextTick = ctx.currentTime + 0.025;
    let scheduled = 0;
    while (nextTick < ctx.currentTime + 0.13 && scheduled++ < 8) {
      const step = tick % 32;
      const bar = Math.floor(tick / 8) % 4;
      const root = stage === 3 ? 50 : stage === 2 ? 55 : stage === 1 ? 57 : 62;
      const chord = [0, -3, 5, -2][bar];
      const note = (stage === 3 ? darkMelody : melody)[step];
      if (note !== null) {
        synth.pluck(root + 12 + note, nextTick, beat * 1.8, 0.32);
        if (stage !== 3 && step % 4 === 0) synth.brass(root + 12 + note, nextTick, beat * 1.55, 0.11);
      }
      if (step % 2 === 0) synth.marimba(root + chord + (step % 4 ? 7 : 0), nextTick, 0.22);
      if (step % 4 === 0) synth.tone(hz(root - 12 + chord), nextTick, beat * 3, 0.35, 'triangle', music, hz(root - 12 + chord), 500);
      if (step % 4 === 0 || (urgency > 0 && step % 2 === 0)) synth.drum(nextTick, step % 8 === 0);
      if (step % 2 === 1) synth.hiss(nextTick, 0.055, 0.09 + urgency * 0.04, 5000, 0.3, music);
      nextTick += beat;
      tick++;
    }
    // Keep a cumulative signal measurement so tests needn't catch a single note.
    analyser.getFloatTimeDomainData(scratch);
    let energy = 0;
    let peak = 0;
    for (const sample of scratch) {
      peak = Math.max(peak, Math.abs(sample));
      energy += sample * sample;
    }
    peakEver = Math.max(peakEver, peak);
    energyEver = Math.max(energyEver, Math.sqrt(energy / scratch.length));
  }
  return {
    unlock,
    update,
    setMusic(value) { musicVolume = clamp(value); setGain(music, musicVolume); },
    setSfx(value) { sfxVolume = clamp(value); setGain(sfx, sfxVolume); },
    effect(name) { if (synth && ctx?.state === 'running' && !paused && !disposed) synth.effect(name); },
    voice(text) { if (synth && ctx?.state === 'running' && !paused && !disposed) synth.voice(text); },
    pause(value) {
      paused = Boolean(value);
      setGain(master, paused ? 0 : 0.85);
      if (!paused && ctx) nextTick = Math.max(nextTick, ctx.currentTime + 0.03);
    },
    dispose() {
      disposed = true;
      if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
    },
    getStats() {
      return { state: ctx?.state || 'locked', music: musicVolume, sfx: sfxVolume, paused, stage, notes: synth?.sounds || 0, peak: peakEver, rms: energyEver };
    },
  };
}

export async function testAudioOffline() {
  const OfflineAudio = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!OfflineAudio) return { supported: false, finite: false, rms: 0, peak: 0, samples: 0 };
  const ctx = new OfflineAudio(2, 44100 * 3, 44100);
  const music = ctx.createGain();
  const sfx = ctx.createGain();
  music.gain.value = 0.1;
  sfx.gain.value = 0.65;
  music.connect(ctx.destination);
  sfx.connect(ctx.destination);
  const synth = makeSynth(ctx, music, sfx);
  [62, 69, 74, 72, 69, 65, 67, 69].forEach((note, i) => {
    synth.pluck(note, i * 0.22, 0.4, 0.3);
    if (i % 2 === 0) synth.drum(i * 0.22, i % 4 === 0);
  });
  synth.effect('whip', 0.2);
  synth.effect('coin', 0.7);
  synth.effect('flute', 1.3);
  synth.voice('That belongs in a museum, probably.', 0.8);
  const rendered = await ctx.startRendering();
  let energy = 0;
  let peak = 0;
  let finite = true;
  const data = rendered.getChannelData(0);
  for (const sample of data) {
    if (!Number.isFinite(sample)) finite = false;
    energy += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  return { supported: true, finite, rms: Math.sqrt(energy / data.length), peak, samples: data.length, sounds: synth.sounds };
}
