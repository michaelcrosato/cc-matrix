// All sound is synthesized at runtime. No recordings, samples, or audio files.
const DEFAULT_MUSIC = 0.1;
const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const note = midi => 440 * 2 ** ((midi - 69) / 12);

function buildSynth(context, destination = context.destination) {
  const master = context.createGain();
  const music = context.createGain();
  const sfx = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const analyser = context.createAnalyser();
  master.gain.value = 0.72;
  music.gain.value = DEFAULT_MUSIC;
  sfx.gain.value = 0.7;
  compressor.threshold.value = -13;
  compressor.knee.value = 12;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.18;
  analyser.fftSize = 512;
  music.connect(master);
  sfx.connect(master);
  master.connect(compressor);
  compressor.connect(analyser);
  analyser.connect(destination);
  const nodes = new Set();

  // A short, deterministic noise buffer gives each explosion a different
  // envelope without fetching or decoding a sound asset.
  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  let seed = 0x5a1703;
  const noiseData = noise.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    noiseData[i] = seed / 0xffffffff * 2 - 1;
  }

  function envelope(gain, start, duration, level, attack = 0.008) {
    const end = start + Math.max(0.025, duration);
    gain.gain.setValueAtTime(0.00001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.00002, level), start + Math.min(attack, duration * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.00001, end);
    return end;
  }

  function register(source, cleanup) {
    nodes.add(source);
    source.onended = () => {
      nodes.delete(source);
      source.disconnect();
      for (const node of cleanup) node.disconnect();
    };
  }

  function tone(frequency, start, duration, level, type = 'sine', bus = sfx, endFrequency = null, pan = 0) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    oscillator.connect(gain);
    gain.connect(panner);
    panner.connect(bus);
    const end = envelope(gain, start, duration, level);
    register(oscillator, [gain, panner]);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }

  function hiss(start, duration, level, frequency, highpass = false) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noise;
    filter.type = highpass ? 'highpass' : 'lowpass';
    filter.frequency.setValueAtTime(frequency, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, frequency * 0.2), start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(sfx);
    const end = envelope(gain, start, duration, level, 0.004);
    register(source, [filter, gain]);
    source.start(start);
    source.stop(end + 0.02);
  }

  function voice(start) {
    const vowels = [[780, 1400], [380, 2100], [520, 1120], [680, 1900], [340, 1200], [880, 1650]];
    for (let syllable = 0; syllable < 6; syllable++) {
      const t = start + syllable * 0.087;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filters = vowels[syllable].map(frequency => {
        const filter = context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = frequency;
        filter.Q.value = 5;
        oscillator.connect(filter);
        filter.connect(gain);
        return filter;
      });
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(230 + (syllable % 3) * 65, t);
      oscillator.frequency.exponentialRampToValueAtTime(320 + (syllable % 2) * 100, t + 0.068);
      gain.connect(sfx);
      envelope(gain, t, 0.074, 0.055, 0.009);
      register(oscillator, [gain, ...filters]);
      oscillator.start(t);
      oscillator.stop(t + 0.09);
    }
  }

  function event(name, start = context.currentTime) {
    const t = Math.max(context.currentTime, start);
    switch (name) {
      case 'shot':
        tone(1150, t, 0.075, 0.105, 'triangle', sfx, 280);
        tone(1950, t, 0.035, 0.035, 'sine', sfx, 620);
        break;
      case 'hit':
        hiss(t, 0.17, 0.18, 1300);
        tone(190, t, 0.16, 0.14, 'triangle', sfx, 65);
        break;
      case 'boom':
        hiss(t, 0.5, 0.26, 2100);
        tone(100, t, 0.36, 0.24, 'sine', sfx, 28);
        tone(220, t, 0.12, 0.08, 'triangle', sfx, 44);
        break;
      case 'rescue':
        [76, 81, 85, 88].forEach((pitch, i) => tone(note(pitch), t + i * 0.075, 0.32, 0.11, 'sine', sfx, null, (i - 1.5) * 0.22));
        break;
      case 'beam':
        tone(220, t, 0.18, 0.045, 'triangle', sfx, 440, -0.12);
        tone(660, t, 0.16, 0.025, 'sine', sfx, 990, 0.12);
        break;
      case 'warp':
        hiss(t, 1.1, 0.14, 5000, true);
        [110, 165, 220].forEach((pitch, i) => tone(pitch, t + i * 0.055, 1.15, 0.08, 'triangle', sfx, pitch * 7, (i - 1) * 0.55));
        break;
      case 'menu':
        tone(660, t, 0.075, 0.07, 'sine');
        tone(990, t + 0.035, 0.08, 0.04, 'sine');
        break;
      case 'win':
        [60, 64, 67, 72, 76, 79, 84].forEach((pitch, i) => tone(note(pitch), t + i * 0.13, 0.65, 0.12, i < 3 ? 'triangle' : 'sine', sfx, null, (i % 3 - 1) * 0.25));
        voice(t + 1.05);
        break;
      case 'lose':
        [67, 64, 60, 55].forEach((pitch, i) => tone(note(pitch), t + i * 0.21, 0.5, 0.12, 'triangle'));
        break;
      case 'dash':
        hiss(t, 0.2, 0.09, 3400, true);
        tone(140, t, 0.23, 0.08, 'triangle', sfx, 760);
        break;
      case 'voice': voice(t); break;
      default: break;
    }
  }

  const roots = [45, 41, 48, 43];
  const tune = [12, 19, 24, 19, 16, 19, 28, 24, 12, 19, 24, 31, 28, 24, 19, 16];
  function musicStep(step, t, intensity = 0) {
    const root = roots[Math.floor(step / 16) % roots.length];
    const beat = step % 16;
    const pitch = root + tune[beat];
    tone(note(pitch), t, 0.44, 0.16, 'sine', music, null, beat % 2 ? 0.36 : -0.36);
    tone(note(pitch + 12), t + 0.016, 0.2, 0.025, 'sine', music, null, beat % 2 ? -0.45 : 0.45);
    if (beat % 4 === 0) {
      tone(note(root - 12), t, 0.72, 0.22, 'triangle', music);
      [0, 7, 12].forEach((interval, i) => tone(note(root + interval), t + i * 0.018, 1.4, 0.035, 'sine', music, null, (i - 1) * 0.45));
    }
    if (intensity > 0 && beat % 2 === 0) {
      tone(62, t, 0.1, 0.13, 'sine', music, 30);
      tone(note(root + 7), t, 0.1, 0.05, 'triangle', music);
    }
  }

  return { context, master, music, sfx, analyser, event, musicStep, activeNodes: nodes,
    stop() { for (const source of [...nodes]) { try { source.stop(); } catch {} } nodes.clear(); }
  };
}

export function createAudio() {
  let synth = null;
  let musicLevel = DEFAULT_MUSIC;
  let sfxLevel = 0.7;
  let muted = false;
  let step = 0;
  let nextStep = 0;
  let lastPhase = '';
  let eventCount = 0;
  let beamTimer = 0;
  let peak = 0;
  const cooldown = Object.create(null);
  const signal = new Float32Array(512);

  function setGain(gain, value) {
    gain.gain.setTargetAtTime(value, synth.context.currentTime, 0.025);
  }

  return {
    async unlock() {
      if (!synth) {
        const AudioContextType = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContextType) return false;
        synth = buildSynth(new AudioContextType());
        synth.music.gain.value = musicLevel;
        synth.sfx.gain.value = sfxLevel;
        synth.master.gain.value = muted ? 0 : 0.72;
        nextStep = synth.context.currentTime + 0.06;
      }
      if (synth.context.state === 'suspended') await synth.context.resume();
      return synth.context.state === 'running';
    },
    setMusic(value) { musicLevel = clamp01(value); if (synth) setGain(synth.music, musicLevel); },
    setSfx(value) { sfxLevel = clamp01(value); if (synth) setGain(synth.sfx, sfxLevel); },
    setMuted(value) { muted = !!value; if (synth) setGain(synth.master, muted ? 0 : 0.72); },
    event(name) {
      if (!synth || synth.context.state !== 'running' || muted) return;
      const now = synth.context.currentTime;
      const delay = name === 'shot' ? 0.045 : name === 'beam' ? 0.14 : name === 'voice' ? 0.8 : name === 'boom' ? 0.07 : 0.02;
      if (now < (cooldown[name] || 0)) return;
      cooldown[name] = now + delay;
      eventCount++;
      synth.event(name);
    },
    update(state, dt) {
      if (!synth || synth.context.state !== 'running') return;
      const phase = state.phase || 'title';
      const active = phase === 'defense' || phase === 'rescue';
      const now = synth.context.currentTime;
      if (nextStep < now - 0.5) nextStep = now + 0.03;
      while (nextStep < now + 0.22) {
        synth.musicStep(step++, nextStep, phase === 'defense' ? 1 : 0);
        nextStep += active ? 0.225 : 0.27;
      }
      if (phase !== lastPhase) { lastPhase = phase; beamTimer = 0; }
      if (phase === 'rescue' && state.players?.some(player => player.beam)) {
        beamTimer -= Math.max(0, dt || 0);
        if (beamTimer <= 0) { this.event('beam'); beamTimer = 0.35; }
      }
      synth.analyser.getFloatTimeDomainData(signal);
      peak = signal.reduce((maximum, sample) => Math.max(maximum, Math.abs(sample)), 0);
    },
    diagnostics() {
      return { unlocked: !!synth, state: synth?.context.state || 'locked', music: musicLevel, sfx: sfxLevel, muted, peak, eventCount, activeNodes: synth?.activeNodes.size || 0, defaultMusic: DEFAULT_MUSIC };
    },
    dispose() {
      if (!synth) return;
      synth.stop();
      synth.context.close();
      synth = null;
    }
  };
}

export async function renderAudioTest() {
  const OfflineContext = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!OfflineContext) return { peak: 0, rms: 0, finite: false, defaultMusic: DEFAULT_MUSIC, error: 'OfflineAudioContext unavailable' };
  const context = new OfflineContext(2, 48000 * 4, 48000);
  const synth = buildSynth(context);
  for (let i = 0; i < 12; i++) synth.musicStep(i, i * 0.22, i > 5 ? 1 : 0);
  ['shot', 'hit', 'boom', 'rescue', 'beam', 'warp', 'menu', 'voice', 'dash', 'win', 'lose'].forEach((name, i) => synth.event(name, 0.08 + i * 0.21));
  const buffer = await context.startRendering();
  let peak = 0;
  let sum = 0;
  let finite = true;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    for (const sample of buffer.getChannelData(channel)) {
      finite &&= Number.isFinite(sample);
      peak = Math.max(peak, Math.abs(sample));
      sum += sample * sample;
    }
  }
  return { peak, rms: Math.sqrt(sum / (buffer.length * buffer.numberOfChannels)), finite, defaultMusic: DEFAULT_MUSIC, samples: buffer.length * buffer.numberOfChannels };
}
