export function createAudio() {
  const Ctx = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
  let ctx = null;
  let noise = null;
  const engines = [];

  function ac() {
    if (!Ctx) return null;
    if (!ctx) ctx = new Ctx();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gainValue, slide) {
    const audio = ac();
    if (!audio) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), audio.currentTime + dur);
    gain.gain.setValueAtTime(gainValue, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + dur + 0.02);
  }

  function burst() {
    const audio = ac();
    if (!audio) return;
    if (!noise) {
      const len = Math.floor(audio.sampleRate * 0.25);
      noise = audio.createBuffer(1, len, audio.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = audio.createBufferSource();
    src.buffer = noise;
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    gain.gain.setValueAtTime(0.35, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.22);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    src.start();
  }

  return {
    unlock() {
      ac();
    },
    countdown(value) {
      if (value === 0) tone(880, 0.28, "square", 0.08, 1);
      else tone(520, 0.12, "square", 0.06, 1);
    },
    item() {
      tone(660, 0.08, "square", 0.05, 1.8);
      tone(990, 0.1, "square", 0.04, 1);
    },
    impact() {
      burst();
    },
    engine(index, speed) {
      const audio = ac();
      if (!audio) return;
      if (!engines[index]) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "sawtooth";
        osc.frequency.value = 70;
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start();
        engines[index] = { osc, gain };
      }
      const engine = engines[index];
      const moving = Math.abs(speed);
      engine.osc.frequency.setTargetAtTime(58 + moving * 4.2, audio.currentTime, 0.08);
      engine.gain.gain.setTargetAtTime(moving > 0.4 ? 0.03 : 0.012, audio.currentTime, 0.1);
    },
    silence() {
      if (!ctx) return;
      for (const engine of engines) {
        if (engine) engine.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
      }
    },
  };
}
