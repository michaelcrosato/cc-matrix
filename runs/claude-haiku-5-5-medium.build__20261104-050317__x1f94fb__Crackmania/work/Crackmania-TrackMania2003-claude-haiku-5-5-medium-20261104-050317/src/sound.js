// Sound made in code: the car's engine (one sawtooth, pitched by speed and throttle, on the engine's effects bus) and
// babble, the Animalese-style talk: each syllable a short blip, its pitch set by the sound of the word.

/** the car's engine: update(kmh, gas) each step; stop() when the race ends. Silent until the audio is running. */
export function engineSound(A) {
  let osc = null, gain = null;
  return {
    update(kmh, gas) {
      const c = A.ctx;
      if (!c || !A._sfxBus) return;
      if (!osc) {
        osc = c.createOscillator(); osc.type = 'sawtooth'; gain = c.createGain(); gain.gain.value = 0;
        osc.connect(gain); gain.connect(A._sfxBus); osc.start();
      }
      osc.frequency.setTargetAtTime(38 + kmh * 1.6 + gas * 18, c.currentTime, .05);
      gain.gain.setTargetAtTime(.010 + gas * .018, c.currentTime, .08);
    },
    stop() {
      if (!osc) return;
      try { osc.stop(); osc.disconnect(); gain.disconnect(); } catch (e) { /* already stopped */ }
      osc = null; gain = null;
    },
  };
}

/** babble: one blip per syllable (a vowel group), pitched from the word; `later(fn, s)` schedules each one */
export function babble(A, text, later = (fn) => fn()) {
  const words = String(text).toLowerCase().split(/\s+/).filter(Boolean);
  let t = 0;
  for (const w of words) {
    const syl = Math.max(1, (w.match(/[aeiouy]+/g) || []).length);
    let h = 0; for (const ch of w) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    for (let k = 0; k < syl; k++) {
      const base = 260 + ((h >>> (k * 3)) % 9) * 22;
      const at = t;
      later(() => A.sfx({ wave: 'triangle', freq: base, to: base * 1.25, dur: .08, vol: .16 }), at);
      t += .09;
    }
    t += .1;
  }
}
