// Animalese-style babble: every subtitle becomes a string of syllables. No real speech anywhere.
// The same line always sounds the same (the mapping is a hash of the letters).
const REGISTERS = {
  low: { base: 95, f1: 400, f2: 900 },
  mid: { base: 165, f1: 600, f2: 1300 },
  high: { base: 300, f1: 850, f2: 2000 },
  demon: { base: 62, f1: 300, f2: 700 },
};

function syllable(reg, i) {
  const r = REGISTERS[reg];
  const v = i % 5; // five vowels, four consonants
  const c = (i * 7) % 4;
  const vowel = [[1, 1], [1.2, 1.5], [0.8, 1.9], [1.4, 0.8], [0.7, 0.7]][v];
  const glide = [1.08, 0.94, 1.03, 0.97, 1.12][(i * 3) % 5];
  const consonant = [{ wave: 'noise', freq: 5200, decay: 0.022, volume: 0.1 }, { wave: 'noise', freq: 1800, decay: 0.03, volume: 0.12 }, { wave: 'square', duty: 0.125, freq: r.base * 3, decay: 0.018, volume: 0.05 }, { wave: 'noise', freq: 3200, decay: 0.012, volume: 0.07 }][c];
  return {
    wave: reg === 'demon' ? 'saw' : 'triangle', freq: r.base, freqEnd: r.base * glide, decay: 0.085, attack: 0.004, volume: 0.15,
    crush: reg === 'demon' ? 9 : 0,
    layers: [
      consonant,
      { wave: 'sine', freq: r.f1 * vowel[0], freqEnd: r.f1 * vowel[0] * glide, decay: 0.08, volume: 0.075 },
      { wave: 'sine', freq: r.f2 * vowel[1], freqEnd: r.f2 * vowel[1] * glide, decay: 0.065, volume: 0.04 },
    ],
  };
}

export const SYLLABLES = {};
for (const reg of Object.keys(REGISTERS)) {
  for (let i = 0; i < 20; i++) SYLLABLES[`v_${reg}_${i}`] = syllable(reg, i);
}

export const VOICE_STYLES = {
  narrator: { reg: 'low', pitch: -3, rate: 7, vary: 1, volume: 0.8 },
  crier: { reg: 'high', pitch: 3, rate: 15, vary: 3, volume: 0.7 },
  brasse: { reg: 'low', pitch: 2, rate: 11, vary: 2, volume: 1 },
  ogive: { reg: 'mid', pitch: 5, rate: 6.5, vary: 1, volume: 0.5 },
  pennywhistle: { reg: 'high', pitch: -2, rate: 12, vary: 4, volume: 0.65 },
  pyx: { reg: 'mid', pitch: -1, rate: 9, vary: 0.7, volume: 0.65 },
  ambrose: { reg: 'mid', pitch: -4, rate: 8, vary: 1.5, volume: 0.7 },
  bursar: { reg: 'demon', pitch: 6, rate: 10, vary: 3, volume: 0.95 },
  malison: { reg: 'demon', pitch: -1, rate: 6, vary: 2, volume: 1, double: true, echo: true },
  warden: { reg: 'demon', pitch: 3, rate: 8, vary: 2, volume: 0.9 },
  bark_low: { reg: 'low', pitch: 3, rate: 13, vary: 2, volume: 0.5 },
  bark_mid: { reg: 'mid', pitch: 1, rate: 13, vary: 2, volume: 0.5 },
};

const hash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

/** A line as a list of syllable plays: { name, pitch, at } with `at` in seconds. Pure. */
export function babble(text, style) {
  const st = VOICE_STYLES[style] ?? VOICE_STYLES.narrator;
  const out = [];
  const words = text.split(/(\s+|[.,:;!?-]+)/).filter(Boolean);
  let t = 0;
  const step = 1 / st.rate;
  const lineHash = hash(text);
  const asks = /\?\s*$/.test(text);
  let idx = 0, total = 0;
  for (const w of words) if (/[a-z0-9]/i.test(w)) total += Math.max(1, Math.ceil(w.length / 2));
  for (const w of words) {
    if (/^\s+$/.test(w)) { t += step * 0.35; continue; }
    if (/^[.,:;!?-]+$/.test(w)) {
      t += w.includes('.') || w.includes('!') || w.includes('?') ? step * 3 : step * 1.5;
      continue;
    }
    const shout = /!/.test(text.slice(text.indexOf(w), text.indexOf(w) + w.length + 2));
    for (let i = 0; i < w.length; i += 2) {
      const pair = w.slice(i, i + 2).toLowerCase();
      const h = hash(pair);
      const n = h % 20;
      let pitch = st.pitch + (((h >> 5) % 100) / 100 - 0.5) * st.vary * 2 + (((lineHash >> (idx % 16)) & 3) - 1.5) * 0.3;
      if (shout) pitch += 2;
      if (asks && idx > total - 4) pitch += (idx - (total - 4)) * 1.6;
      out.push({ name: `v_${st.reg}_${n}`, pitch, at: t, volume: st.volume });
      if (st.double) out.push({ name: `v_${st.reg}_${n}`, pitch: pitch - 12, at: t + 0.01, volume: st.volume * 0.8 });
      if (st.echo) out.push({ name: `v_${st.reg}_${n}`, pitch: pitch - 5, at: t + 0.22, volume: st.volume * 0.3 });
      t += step;
      idx++;
    }
  }
  out.sort((a, b) => a.at - b.at);
  return { syllables: out, duration: t };
}

export const speakerStyle = (who) => (VOICE_STYLES[who] ? who : 'narrator');
