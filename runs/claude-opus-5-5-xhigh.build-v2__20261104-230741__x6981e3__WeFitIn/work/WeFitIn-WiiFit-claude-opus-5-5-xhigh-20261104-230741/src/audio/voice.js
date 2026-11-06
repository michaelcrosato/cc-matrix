// Gibberish voices. syllabify() is pure; renderVoice() works on any BaseAudioContext.
export const VOICES = {
  ounce: { f0: 340, rate: 13, shift: 1.25, tick: true },
  coach: { f0: 165, rate: 7.5, shift: 0.9, flat: true, pause: 0.34 },
  marguerite: { f0: 230, rate: 9, shift: 1, vibrato: true },
  dennis: { f0: 120, rate: 11, shift: 0.95, lastUp: true },
  june: { f0: 300, rate: 10, shift: 1.15, flat: true, noContour: true },
  kevin: { squawk: true, f0: 0, rate: 8, shift: 1 },
  narrator: { f0: 200, rate: 11, shift: 1 },
};

const FORMANTS = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800] };
const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const CONS = ['plosive', 'fricative', 'nasal', 'none'];

function hash(word) {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) { h ^= word.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function syllableCount(word) {
  const groups = word.toLowerCase().match(/[aeiouy]+/g);
  return Math.max(1, Math.min(5, groups ? groups.length : Math.ceil(word.length / 3)));
}

/** Text to syllables: [{ t, dur, f0, vowel, cons, charIndex }]. The same word always sounds the same. */
export function syllabify(text, speaker = 'ounce') {
  const v = VOICES[speaker] ?? VOICES.narrator;
  const out = [];
  if (v.squawk) return out;
  const unit = 1 / v.rate;
  let t = 0;
  // Sentences, so declination restarts and ends get their own contour.
  const sentenceRe = /[^.!?]+(?:\.\.\.|[.!?]+|$)|\.\.\./g;
  let m;
  while ((m = sentenceRe.exec(text)) !== null) {
    const sentence = m[0];
    const base = m.index;
    const words = [];
    const wordRe = /[A-Za-z0-9']+/g;
    let w;
    while ((w = wordRe.exec(sentence)) !== null) words.push({ s: w[0], at: base + w.index });
    if (!words.length) { if (m[0].length === 0) sentenceRe.lastIndex++; continue; }
    let total = 0;
    for (const word of words) total += syllableCount(word.s);
    const q = /\?/.test(sentence), ex = /!/.test(sentence), dots = /\.\.\.\s*$/.test(sentence);
    let k = 0;
    words.forEach((word, wi) => {
      const lower = word.s.toLowerCase();
      const h0 = hash(lower);
      const n = syllableCount(word.s);
      for (let i = 0; i < n; i++) {
        const h = Math.imul(h0 ^ (i * 2654435761), 2246822519) >>> 0;
        const pos = total > 1 ? k / (total - 1) : 0;
        let pitch = 1;
        if (!v.noContour) {
          if (!v.flat) pitch *= 1 - 0.15 * pos;
          if (q && pos > 0.6) pitch *= 1 + 0.25 * ((pos - 0.6) / 0.4);
          if (ex) pitch *= 1.15;
          if (v.lastUp && wi === words.length - 1) pitch *= 1.2;
        }
        // A small per-syllable lilt, from the word's hash, so a voice isn't a drone.
        if (!v.flat) pitch *= 1 + (((h >> 8) & 15) / 15 - 0.5) * 0.12;
        const dur = unit * (dots ? 1.5 : 1);
        out.push({
          t, dur, f0: v.f0 * pitch,
          vowel: VOWELS[h % 5], cons: CONS[(h >> 4) % 4],
          charIndex: word.at + Math.round((i / n) * word.s.length),
        });
        t += dur;
        k++;
      }
      t += unit * 0.25; // the breath between words
    });
    if (v.tick) out.push({ t, dur: 0, f0: 0, vowel: 'a', cons: 'tick', tick: true, charIndex: base + sentence.length - 1 });
    t += unit * (dots ? 5 : 3) + (v.pause ?? 0);
  }
  return out;
}

export function voiceLength(syllables) {
  if (!syllables.length) return 0;
  const last = syllables[syllables.length - 1];
  return last.t + last.dur;
}

/** How many characters a typewriter should show at time t. */
export function revealAt(syllables, text, t) {
  if (!syllables.length) return Math.min(text.length, Math.floor(t * 40));
  let shown = 0;
  for (let i = 0; i < syllables.length; i++) {
    const s = syllables[i];
    if (s.t > t) break;
    const next = syllables[i + 1]?.charIndex ?? text.length;
    const f = s.dur > 0 ? Math.min(1, (t - s.t) / s.dur) : 1;
    shown = Math.round(s.charIndex + (next - s.charIndex) * f);
  }
  return Math.min(text.length, shown);
}

const NOISE = new WeakMap();
function noiseBuffer(ctx) {
  let b = NOISE.get(ctx);
  if (!b) {
    const len = Math.floor(ctx.sampleRate * 0.25);
    b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let a = 12345;
    for (let i = 0; i < len; i++) { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; d[i] = a / 2147483648 - 1; }
    NOISE.set(ctx, b);
  }
  return b;
}

function burst(ctx, dest, when, dur, level, freq) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(level, when + 0.002);
  g.gain.linearRampToValueAtTime(0.0001, when + dur);
  src.connect(f); f.connect(g); g.connect(dest);
  src.start(when); src.stop(when + dur + 0.01);
  return src;
}

/** Schedule syllables on any BaseAudioContext. Returns the nodes that can still be stopped. */
export function renderVoice(ctx, destination, syllables, when = 0, speaker = 'ounce') {
  const v = VOICES[speaker] ?? VOICES.narrator;
  const nodes = [];
  for (const s of syllables) {
    const at = when + s.t;
    if (s.tick) {
      nodes.push(burst(ctx, destination, at, 0.012, 0.5, 3600));
      continue;
    }
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(s.f0, at);
    if (v.vibrato) {
      osc.frequency.linearRampToValueAtTime(s.f0 * 1.025, at + s.dur * 0.5);
      osc.frequency.linearRampToValueAtTime(s.f0 * 0.985, at + s.dur);
    }
    const [f1, f2] = FORMANTS[s.vowel];
    const env = ctx.createGain();
    const end = at + s.dur + 0.03;
    env.gain.setValueAtTime(0.0001, at);
    env.gain.linearRampToValueAtTime(1, at + 0.006);
    env.gain.setValueAtTime(1, Math.max(at + 0.007, end - 0.03));
    env.gain.linearRampToValueAtTime(0.0001, end);
    for (const [f, q, lvl] of [[f1, 7, 1], [f2, 9, 0.7]]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f * v.shift; bp.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = lvl * 1.6;
      osc.connect(bp); bp.connect(g); g.connect(env);
    }
    env.connect(destination);
    osc.start(at); osc.stop(end + 0.01);
    nodes.push(osc);
    if (s.cons === 'plosive') nodes.push(burst(ctx, destination, at, 0.008, 0.45, 1800 * v.shift));
    else if (s.cons === 'fricative') nodes.push(burst(ctx, destination, at, 0.04, 0.22, 4600 * v.shift));
  }
  return nodes;
}

/** Live speech over the engine's sfx bus, through its own Voice gain. */
export class VoicePlayer {
  gain = null;
  level = 1;
  nodes = [];
  log = [];

  ensure(audio) {
    const ctx = audio.context;
    if (!ctx || !audio.buses?.sfx) return null;
    if (!this.gain || this.gain.context !== ctx) {
      this.gain = ctx.createGain();
      this.gain.gain.value = this.level;
      this.gain.connect(audio.buses.sfx);
    }
    return ctx;
  }

  setLevel(v) { this.level = v; if (this.gain) this.gain.gain.value = v; }

  speak(audio, syllables, speaker) {
    this.stop();
    this.log.push(speaker);
    if (this.log.length > 40) this.log.shift();
    const ctx = this.ensure(audio);
    if (!ctx) return false;
    this.nodes = renderVoice(ctx, this.gain, syllables, ctx.currentTime + 0.02, speaker);
    return true;
  }

  stop() {
    for (const n of this.nodes) { try { n.stop(); } catch { /* already over */ } }
    this.nodes = [];
  }
}
