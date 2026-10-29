/** Procedural music and effects. Spoken voice is none. */

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let music = null;
  let boostGain = null;
  let boostSource = null;
  const last = { goal: 0, hit: 0 };

  function ensure() {
    if (ctx) return true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.32;
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.7;
    sfxGain.connect(master);
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    boostSource = ctx.createBufferSource();
    boostSource.buffer = noise;
    boostSource.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    boostGain = ctx.createGain();
    boostGain.gain.value = 0;
    boostSource.connect(filter);
    filter.connect(boostGain);
    boostGain.connect(sfxGain);
    boostSource.start();
    return true;
  }

  function resume() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
  }

  function setMix({ musicOn, sfxOn }) {
    if (!ctx) return;
    musicGain.gain.value = musicOn ? 0.32 : 0;
    sfxGain.gain.value = sfxOn ? 0.72 : 0;
  }

  function startMusic() {
    resume();
    if (!ctx || music) return;
    const seconds = 4;
    const rate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, rate * seconds, rate);
    const data = buffer.getChannelData(0);
    const beat = 60 / 132;
    const notes = [110, 110, 164.81, 130.81, 98, 164.81, 196, 146.83];
    for (let i = 0; i < data.length; i += 1) {
      const t = i / rate;
      const index = Math.floor(t / (beat / 2)) % notes.length;
      const local = t % (beat / 2);
      const env = Math.exp(-local * 7);
      const bass = Math.sign(Math.sin(2 * Math.PI * notes[index] * t)) * 0.28 * env;
      const kick = index % 2 === 0 && local < 0.09 ? Math.sin(2 * Math.PI * 62 * local) * (1 - local / 0.09) * 0.45 : 0;
      const hat = index % 2 === 1 && local < 0.02 ? (Math.random() * 2 - 1) * 0.12 : 0;
      data[i] = bass + kick + hat;
    }
    music = ctx.createBufferSource();
    music.buffer = buffer;
    music.loop = true;
    music.connect(musicGain);
    music.start();
  }

  function tone(freq, dur, type, gain, slide = 0) {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(amp);
    amp.connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, gain, freq) {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const length = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    src.connect(filter);
    filter.connect(amp);
    amp.connect(sfxGain);
    src.start(t0);
  }

  function play(name) {
    resume();
    if (!ctx) return;
    if (name === 'jump') tone(520, 0.12, 'square', 0.08, 180);
    else if (name === 'dodge') tone(220, 0.16, 'sawtooth', 0.1, -80);
    else if (name === 'hit') {
      const now = ctx.currentTime;
      if (now - last.hit < 0.05) return;
      last.hit = now;
      noiseBurst(0.12, 0.25, 900);
      tone(140, 0.1, 'sine', 0.12);
    } else if (name === 'demo') {
      noiseBurst(0.35, 0.4, 400);
      tone(90, 0.3, 'sawtooth', 0.14, -50);
    } else if (name === 'goal') {
      const now = ctx.currentTime;
      if (now - last.goal < 0.4) return;
      last.goal = now;
      [523, 659, 784, 1046].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        const t0 = ctx.currentTime + i * 0.08;
        osc.type = 'square';
        osc.frequency.value = freq;
        amp.gain.setValueAtTime(0.0001, t0);
        amp.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
        amp.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
        osc.connect(amp);
        amp.connect(sfxGain);
        osc.start(t0);
        osc.stop(t0 + 0.3);
      });
      noiseBurst(0.4, 0.2, 2000);
    } else if (name === 'overtime') {
      tone(196, 0.4, 'sawtooth', 0.1, 80);
      tone(233, 0.5, 'square', 0.06, 40);
    } else if (name === 'kickoff') tone(880, 0.15, 'square', 0.08);
    else if (name === 'beep') tone(660, 0.1, 'square', 0.07);
    else if (name === 'pad') tone(740, 0.08, 'sine', 0.06, 200);
    else if (name === 'menu') tone(330, 0.05, 'square', 0.04);
  }

  function setBoosting(on) {
    if (!boostGain || !ctx) return;
    boostGain.gain.setTargetAtTime(on ? 0.18 : 0, ctx.currentTime, 0.05);
  }

  function playEvents(events) {
    let boosting = false;
    for (const event of events) {
      if (event.type === 'boost') boosting = true;
      if (event.type === 'jump') play('jump');
      if (event.type === 'dodge') play('dodge');
      if (event.type === 'hit') play('hit');
      if (event.type === 'demo') play('demo');
      if (event.type === 'goal') play('goal');
      if (event.type === 'overtime') play('overtime');
      if (event.type === 'kickoff') play('kickoff');
      if (event.type === 'pad') play('pad');
    }
    setBoosting(boosting);
  }

  return { ensure, resume, startMusic, setMix, play, playEvents, setBoosting };
}
