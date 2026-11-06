/** Animalese. Same word, same syllables. A question rises at the end. */

export const SPEAKERS = {
  ounce: { f0: 340, rate: 13, formant: 1.25 },
  coach: { f0: 165, rate: 7.5, formant: 0.9, flat: true },
  marguerite: { f0: 230, rate: 9, formant: 1, vibrato: true },
  dennis: { f0: 120, rate: 11, formant: 0.95, lastUp: true },
  june: { f0: 300, rate: 10, formant: 1.15, flat: true },
  kevin: null,
};

const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const CONS = ['b', 'd', 'f', 'g', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't'];
const FORMANTS = {
  a: [800, 1200],
  e: [500, 1900],
  i: [300, 2300],
  o: [500, 900],
  u: [350, 800],
};

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function wordShape(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '') || 'mm';
  const n = Math.max(1, Math.min(3, Math.round(clean.length / 2.5)));
  const syl = [];
  for (let i = 0; i < n; i++) {
    const h = hash(`${clean}:${i}`);
    syl.push({ vowel: VOWELS[h % 5], cons: CONS[(h >>> 8) % CONS.length] });
  }
  return syl;
}

/**
 * Pure. `[{ t, dur, f0, vowel, cons, charIndex }]`.
 * Kevin never speaks words.
 */
export function syllabify(text, speaker = 'ounce') {
  if (Object.prototype.hasOwnProperty.call(SPEAKERS, speaker) && !SPEAKERS[speaker]) return [];
  const spec = SPEAKERS[speaker] || SPEAKERS.ounce;
  if (!spec) return [];
  const src = String(text);
  const question = src.includes('?');
  const bang = src.includes('!');
  const slow = src.includes('...');
  const re = /[A-Za-z0-9']+/g;
  const words = [];
  let m;
  while ((m = re.exec(src))) words.push({ word: m[0], index: m.index });
  const shapes = words.map((w) => wordShape(w.word));
  const total = shapes.reduce((n, s) => n + s.length, 0) || 1;
  const base = 1 / spec.rate;
  const dur = base * (slow ? 1.45 : 1);
  const out = [];
  let t = 0;
  let seen = 0;
  shapes.forEach((shape, wi) => {
    shape.forEach((syl, si) => {
      const u = total <= 1 ? 0 : seen / (total - 1);
      let f0 = spec.f0;
      if (!spec.flat) f0 *= 1 - 0.15 * u;
      if (question && u > 0.66) f0 *= 1.25;
      if (bang && u > 0.8) f0 *= 1.15;
      if (spec.lastUp && wi === shapes.length - 1) f0 *= 1.08;
      if (spec.vibrato) f0 *= 1 + 0.03 * Math.sin(seen * 2.2);
      out.push({
        t,
        dur: dur * 0.92,
        f0,
        vowel: syl.vowel,
        cons: syl.cons,
        charIndex: words[wi].index,
      });
      t += dur;
      seen += 1;
    });
    t += dur * 0.35;
  });
  return out;
}

function noiseBurst(ctx, destination, when, seconds, volume) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    data[i] = ((s >>> 8) / 0xffffff) * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  g.gain.setValueAtTime(volume, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
  src.connect(g);
  g.connect(destination);
  src.start(when);
  src.stop(when + seconds + 0.01);
}

/** Schedule syllables onto any BaseAudioContext. No-op without one. */
export function renderVoice(audioCtx, destination, syllables, when = 0, speaker = 'ounce') {
  if (!audioCtx || !destination || !syllables?.length) return false;
  const shift = SPEAKERS[speaker]?.formant || 1;
  for (const syl of syllables) {
    const t0 = when + syl.t;
    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(Math.max(40, syl.f0), t0);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.55, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.04, syl.dur));
    const low = audioCtx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = Math.max(120, syl.f0 * 2);
    osc.connect(low);
    low.connect(g);
    const pair = FORMANTS[syl.vowel] || FORMANTS.a;
    for (const freq of pair) {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = Math.max(80, freq * shift);
      filter.Q.value = 5;
      osc.connect(filter);
      filter.connect(g);
    }
    g.connect(destination);
    osc.start(t0);
    osc.stop(t0 + syl.dur + 0.03);
    const plosive = 'bdgpkt'.includes(syl.cons);
    const fricative = 'fsvz'.includes(syl.cons);
    if (plosive) noiseBurst(audioCtx, destination, t0, 0.008, 0.12);
    else if (fricative) noiseBurst(audioCtx, destination, t0, 0.04, 0.06);
  }
  return true;
}

/** Live path. Headless and locked audio do nothing. */
export function speak(ctx, text, speaker = 'ounce') {
  const audio = ctx?.audio;
  const audioCtx = audio?.context;
  if (!audioCtx) return syllabify(text, speaker);
  const syllables = syllabify(text, speaker);
  const bus = audio.buses?.sfx || audio.buses?.voice || audio.master;
  if (!bus) return syllables;
  try {
    renderVoice(audioCtx, bus, syllables, audioCtx.currentTime + 0.02, speaker);
  } catch {
    /* the context may be closed */
  }
  return syllables;
}
