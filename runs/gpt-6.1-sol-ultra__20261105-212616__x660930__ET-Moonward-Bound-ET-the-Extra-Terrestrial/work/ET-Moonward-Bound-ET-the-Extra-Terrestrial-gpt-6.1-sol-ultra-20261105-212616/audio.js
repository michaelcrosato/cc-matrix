/** All sound is synthesized at runtime. Original score; no samples or media files. */
export function createAudio(options = {}) {
  let ctx = options.context || null;
  let master, musicBus, effectsBus, analyser, ambience, reverb;
  let unlocked = false,
    musicVolume = 0.1,
    effectsVolume = 0.72;
  let mood = "explore",
    nextMusic = 0,
    step = 0,
    nextVoice = 0;
  const counts = { notes: 0, effects: 0, voices: 0 };
  let randomSeed = 0x4d4f4f4e;
  const rand = () => {
    randomSeed = (1664525 * randomSeed + 1013904223) >>> 0;
    return randomSeed / 4294967296;
  };
  const clamp = (x) => Math.max(0, Math.min(1, Number(x) || 0));
  const midi = (n) => 440 * 2 ** ((n - 69) / 12);

  function build() {
    if (master) return;
    ctx ||= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.62;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 14;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    master.connect(limiter);
    limiter.connect(analyser);
    analyser.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicVolume;
    musicBus.connect(master);
    effectsBus = ctx.createGain();
    effectsBus.gain.value = effectsVolume;
    effectsBus.connect(master);
    reverb = ctx.createConvolver();
    const length = Math.ceil(ctx.sampleRate * 1.8);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++)
        data[i] = (rand() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.43)) * 0.3;
    }
    reverb.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.23;
    reverb.connect(wet);
    wet.connect(master);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.31;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.13;
    musicBus.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(master);
    musicBus.connect(reverb);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const samples = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < samples.length; i++) {
      last = (last + (rand() * 2 - 1) * 0.04) / 1.02;
      samples[i] = last;
    }
    ambience = ctx.createBufferSource();
    ambience.buffer = noise;
    ambience.loop = true;
    const wind = ctx.createBiquadFilter();
    wind.type = "lowpass";
    wind.frequency.value = 760;
    const air = ctx.createGain();
    air.gain.value = 0.045;
    ambience.connect(wind);
    wind.connect(air);
    air.connect(musicBus);
    ambience.start();
    nextMusic = ctx.currentTime + 0.08;
  }

  function tone(
    bus,
    frequency,
    time,
    duration,
    volume = 0.16,
    type = "sine",
    endFrequency,
    vibrato = 0,
  ) {
    const osc = ctx.createOscillator(),
      envelope = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, frequency), time);
    if (endFrequency)
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), time + duration);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, volume),
      time + Math.min(0.025, duration * 0.12),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(envelope);
    envelope.connect(bus);
    if (vibrato) {
      const lfo = ctx.createOscillator(),
        depth = ctx.createGain();
      lfo.frequency.value = 5;
      depth.gain.value = vibrato;
      lfo.connect(depth);
      depth.connect(osc.detune);
      lfo.start(time);
      lfo.stop(time + duration + 0.03);
    }
    osc.start(time);
    osc.stop(time + duration + 0.03);
    counts.notes++;
  }

  function bell(note, time, volume = 0.2, duration = 1.3, bus = musicBus) {
    const f = midi(note);
    tone(bus, f, time, duration, volume, "sine");
    tone(bus, f * 2.005, time, duration * 0.48, volume * 0.3, "sine");
    tone(bus, f * 3.01, time, duration * 0.2, volume * 0.09, "sine");
  }

  function pad(notes, time, duration, volume = 0.06) {
    for (const n of notes) {
      const osc = ctx.createOscillator(),
        env = ctx.createGain(),
        filter = ctx.createBiquadFilter();
      osc.type = "triangle";
      osc.frequency.value = midi(n);
      osc.detune.value = rand() * 8 - 4;
      filter.type = "lowpass";
      filter.frequency.value = 1100;
      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(volume, time + 0.7);
      env.gain.setValueAtTime(volume * 0.78, time + Math.max(0.8, duration - 0.8));
      env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      osc.connect(filter);
      filter.connect(env);
      env.connect(musicBus);
      osc.start(time);
      osc.stop(time + duration + 0.02);
      counts.notes++;
    }
  }

  function noiseBurst(time, duration, volume, center = 900) {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = rand() * 2 - 1;
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      env = ctx.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = center;
    filter.Q.value = 0.7;
    env.gain.setValueAtTime(volume, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(env);
    env.connect(effectsBus);
    source.start(time);
  }

  function scheduleMusic() {
    if (!unlocked || !ctx || (ctx.state === "suspended" && !/Offline/.test(ctx.constructor.name)))
      return;
    if (nextMusic < ctx.currentTime - 1) nextMusic = ctx.currentTime + 0.03;
    let safety = 0;
    while (nextMusic < ctx.currentTime + 0.24 && safety++ < 8) {
      const fast = mood === "flight",
        sneak = mood === "sneak";
      const eighth = 60 / (fast ? 112 : sneak ? 68 : 82) / 2;
      const chords = [
        [50, 57, 62, 66, 69],
        [47, 54, 59, 62, 66],
        [43, 50, 57, 59, 62],
        [45, 52, 57, 62, 64],
      ];
      const chord = chords[Math.floor(step / 16) % 4];
      const pattern = [2, 4, 3, 1, 2, 4, 3, 4, 2, 1, 3, 4, 2, 4, 1, 3];
      if (step % 16 === 0)
        pad(chord.slice(0, 4), nextMusic, eighth * 18, sneak ? 0.038 : fast ? 0.075 : 0.05);
      if (!sneak || step % 3 === 0)
        bell(chord[pattern[step % 16]] + 12, nextMusic, fast ? 0.25 : 0.15, fast ? 0.75 : 1.3);
      if (fast && step % 4 === 0) {
        tone(musicBus, midi(chord[0]), nextMusic, 0.55, 0.2, "triangle");
        tone(musicBus, 100, nextMusic, 0.13, 0.13, "sine", 45);
      }
      if (mood === "win" && step % 8 === 0)
        bell([81, 85, 88, 90][Math.floor(step / 8) % 4], nextMusic, 0.16, 2);
      nextMusic += eighth;
      step++;
    }
  }

  function sfx(name) {
    if (!unlocked || !effectsBus) return;
    counts.effects++;
    const t = ctx.currentTime + 0.005;
    switch (name) {
      case "pickup":
        [74, 78, 81, 86].forEach((n, i) => bell(n, t + i * 0.065, 0.22, 0.6, effectsBus));
        break;
      case "bond":
        [62, 69, 74, 78, 81].forEach((n, i) => bell(n, t + i * 0.11, 0.2, 1.1, effectsBus));
        break;
      case "pulse":
        tone(effectsBus, 170, t, 0.7, 0.24, "sine", 850, 12);
        [74, 81, 86].forEach((n, i) => bell(n, t + 0.17 + i * 0.1, 0.13, 0.8, effectsBus));
        break;
      case "jump":
        tone(effectsBus, 160, t, 0.26, 0.15, "triangle", 450);
        noiseBurst(t, 0.12, 0.08, 700);
        break;
      case "alert":
        [0, 0.22].forEach((d) => {
          tone(effectsBus, 240, t + d, 0.16, 0.15, "triangle", 320);
          tone(effectsBus, 360, t + d, 0.16, 0.06, "sine", 480);
        });
        break;
      case "hide":
        tone(effectsBus, 420, t, 0.3, 0.1, "sine", 90);
        noiseBurst(t, 0.3, 0.08, 1800);
        break;
      case "signal":
        [69, 74, 81, 78, 86].forEach((n, i) => {
          bell(n, t + i * 0.2, 0.22, 1, effectsBus);
          tone(effectsBus, midi(n) / 2, t + i * 0.2, 0.12, 0.06, "square");
        });
        break;
      case "launch":
        noiseBurst(t, 1.2, 0.24, 500);
        tone(effectsBus, 75, t, 1.7, 0.3, "triangle", 660, 10);
        [62, 66, 69, 74, 78, 81, 86].forEach((n, i) =>
          bell(n, t + i * 0.09, 0.14, 1.2, effectsBus),
        );
        break;
      case "win":
        [62, 69, 74, 78, 81, 86, 90].forEach((n, i) =>
          bell(n, t + i * 0.17, 0.23, 2.1, effectsBus),
        );
        break;
      case "click":
        tone(effectsBus, 760, t, 0.055, 0.1, "sine", 920);
        break;
      case "step":
        noiseBurst(t, 0.07, 0.06, 470);
        break;
      case "bump":
        tone(effectsBus, 90, t, 0.16, 0.16, "triangle", 45);
        noiseBurst(t, 0.1, 0.08, 250);
        break;
      case "checkpoint":
        [69, 74, 78].forEach((n, i) => bell(n, t + i * 0.13, 0.19, 1, effectsBus));
        break;
      default:
        tone(effectsBus, 440, t, 0.1, 0.08, "sine");
    }
  }

  function voice(textOrMood = "friend") {
    if (!unlocked || !ctx || ctx.currentTime < nextVoice) return;
    counts.voices++;
    const value = String(textOrMood || "friend"),
      syllables = Math.min(8, Math.max(3, Math.ceil(value.length / 9)));
    const alien = !/kid|human|hey|come/i.test(value);
    const start = ctx.currentTime + 0.025,
      vowels = [
        [620, 1100],
        [400, 1700],
        [340, 820],
        [780, 1350],
        [290, 2000],
      ];
    for (let i = 0; i < syllables; i++) {
      const time = start + i * 0.13,
        duration = 0.09 + rand() * 0.045;
      const fundamental =
        (alien ? 135 : 230) * (1 + rand() * 0.42) * (i === syllables - 1 ? 0.82 : 1);
      const vowel = vowels[(value.charCodeAt(i % value.length) + i) % vowels.length];
      const carrier = ctx.createOscillator(),
        envelope = ctx.createGain();
      carrier.type = "sawtooth";
      carrier.frequency.setValueAtTime(fundamental, time);
      carrier.frequency.exponentialRampToValueAtTime(
        fundamental * (i % 2 ? 0.87 : 1.15),
        time + duration,
      );
      envelope.gain.setValueAtTime(0.0001, time);
      envelope.gain.linearRampToValueAtTime(0.13, time + 0.018);
      envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      for (const frequency of vowel) {
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = frequency;
        filter.Q.value = 5;
        carrier.connect(filter);
        filter.connect(envelope);
      }
      envelope.connect(effectsBus);
      carrier.start(time);
      carrier.stop(time + duration + 0.01);
      if (alien && i % 2 === 0) tone(effectsBus, fundamental / 2, time, duration, 0.05, "sine");
    }
    nextVoice = start + syllables * 0.13 + 0.3;
  }

  return {
    async unlock() {
      try {
        build();
        if (ctx.state === "suspended" && !/Offline/.test(ctx.constructor.name)) await ctx.resume();
        unlocked = true;
        scheduleMusic();
        return true;
      } catch {
        return false;
      }
    },
    setMusic(value) {
      musicVolume = clamp(value);
      if (musicBus) musicBus.gain.setTargetAtTime(musicVolume, ctx.currentTime, 0.08);
    },
    setSfx(value) {
      effectsVolume = clamp(value);
      if (effectsBus) effectsBus.gain.setTargetAtTime(effectsVolume, ctx.currentTime, 0.04);
    },
    setMood(value) {
      if (["explore", "sneak", "flight", "win"].includes(value) && mood !== value) {
        mood = value;
        step = 0;
        if (ctx) nextMusic = ctx.currentTime + 0.08;
      }
    },
    sfx,
    voice,
    update() {
      scheduleMusic();
    },
    debug() {
      let rms = 0,
        peak = 0;
      if (analyser) {
        const data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        for (const v of data) {
          rms += v * v;
          peak = Math.max(peak, Math.abs(v));
        }
        rms = Math.sqrt(rms / data.length);
      }
      return {
        unlocked,
        state: ctx?.state || "locked",
        contextState: ctx?.state || "locked",
        mood,
        musicVolume,
        effectsVolume,
        rms,
        peak,
        ...counts,
        sfxCount: counts.effects,
        voiceCount: counts.voices,
      };
    },
    dispose() {
      ambience?.stop();
      if (ctx && !/Offline/.test(ctx.constructor.name)) ctx.close();
      unlocked = false;
    },
  };
}
