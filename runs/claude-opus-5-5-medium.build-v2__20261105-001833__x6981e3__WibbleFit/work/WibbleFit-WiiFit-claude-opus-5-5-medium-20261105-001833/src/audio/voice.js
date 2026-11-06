// Animalese/Simlish gibberish. No words are ever spoken: syllables come from a hash of each word.
export const SPEAKERS = {
  ounce: { f0: 340, rate: 13, formant: 1.25, contour: 1, tick: true },
  coach: { f0: 165, rate: 7.5, formant: 0.9, contour: 0, pause: 0.34 },
  marguerite: { f0: 230, rate: 9, formant: 1, contour: 1, vibrato: 7 },
  dennis: { f0: 120, rate: 11, formant: 0.95, contour: 1, lastUp: 1.2 },
  june: { f0: 300, rate: 10, formant: 1.15, contour: 0 },
  player: { f0: 200, rate: 10, formant: 1, contour: 1 },
  kevin: { squawk: true },
};
const VOWELS = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800] };
const VKEYS = Object.keys(VOWELS);
const PLOSIVE = ['b', 'd', 'g', 'k', 'p', 't'], FRIC = ['f', 's', 'h', 'z'], NASAL = ['m', 'n', 'l', 'r', 'w', 'y'];
const CONS = [...PLOSIVE, ...FRIC, ...NASAL];
export const hashWord = (w) => { let h = 2166136261; for (const c of w) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const consClass = (c) => (PLOSIVE.includes(c) ? 'plosive' : FRIC.includes(c) ? 'fricative' : 'voiced');

export function syllabify(text, speakerName = 'ounce') {
  const sp = SPEAKERS[speakerName] ?? SPEAKERS.ounce;
  if (sp.squawk) return [];
  const out = []; const period = 1 / sp.rate;
  // A sentence runs up to its punctuation; pitch declines across it.
  const re = /[A-Za-z0-9'’]+|[.!?,;:]+|\.\.\./g;
  const tokens = [...String(text).matchAll(re)].map((m) => ({ s: m[0], i: m.index }));
  let t = 0;
  let sentence = [];
  const flush = (ending) => {
    const words = sentence; sentence = [];
    const total = words.reduce((a, w) => a + w.n, 0) || 1; let k = 0;
    words.forEach((w, wi) => {
      const lower = w.s.toLowerCase(); let h = hashWord(lower);
      for (let s = 0; s < w.n; s++) {
        const p = total > 1 ? k / (total - 1) : 0;
        let f = sp.f0 * (sp.contour ? 1 - 0.15 * p : 1);
        if (sp.contour && ending === '?' && p > 0.7) f *= 1 + 0.25 * ((p - 0.7) / 0.3);
        if (sp.contour && ending === '!') f *= 1.15;
        if (sp.lastUp && wi === words.length - 1) f *= sp.lastUp;
        h = Math.imul(h ^ (s + 1), 2654435761) >>> 0;
        const cons = CONS[h % CONS.length], vowel = VKEYS[(h >>> 8) % VKEYS.length];
        const dur = period * (ending === '...' ? 1.4 : 1);
        out.push({ t, dur, f0: f, vowel, cons, consClass: consClass(cons), charIndex: w.i + Math.floor((s / w.n) * w.s.length), wordEnd: s === w.n - 1 ? w.i + w.s.length : 0 });
        t += dur; k++;
      }
    });
  };
  for (const tok of tokens) {
    if (/^[.!?,;:]+$/.test(tok.s)) {
      const end = tok.s.includes('...') ? '...' : tok.s[tok.s.length - 1];
      flush(end);
      const pause = (sp.pause ?? 0.12) * (end === ',' ? 0.6 : 1) * (end === '...' ? 2 : 1);
      if (sp.tick && out.length) out[out.length - 1].tick = true;
      t += pause;
    } else {
      const groups = tok.s.toLowerCase().match(/[aeiouy]+/g);
      sentence.push({ s: tok.s, i: tok.i, n: Math.max(1, groups ? groups.length : Math.ceil(tok.s.length / 3)) });
    }
  }
  flush('.');
  return out;
}
export const voiceDuration = (syl) => (syl.length ? syl[syl.length - 1].t + syl[syl.length - 1].dur : 0);

const noiseBuffers = new WeakMap();
function noise(ctx) {
  let b = noiseBuffers.get(ctx);
  if (!b) { b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate); const d = b.getChannelData(0); let s = 12345; for (let i = 0; i < d.length; i++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; d[i] = (s / 2147483648) - 1; } noiseBuffers.set(ctx, b); }
  return b;
}
// Works on any BaseAudioContext, so it renders offline for tests.
export function renderVoice(ctx, destination, syllables, when = 0, speakerName = 'ounce', level = 1) {
  const sp = SPEAKERS[speakerName] ?? SPEAKERS.ounce;
  const shift = sp.formant ?? 1; const nodes = [];
  for (const s of syllables) {
    const t0 = when + s.t;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.55 * level, t0 + 0.006);
    gain.gain.setValueAtTime(0.55 * level, t0 + Math.max(0.007, s.dur - 0.03));
    gain.gain.linearRampToValueAtTime(0, t0 + s.dur);
    gain.connect(destination);
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(s.f0, t0);
    if (sp.vibrato) { osc.frequency.linearRampToValueAtTime(s.f0 * 1.02, t0 + s.dur * 0.5); osc.frequency.linearRampToValueAtTime(s.f0 * 0.98, t0 + s.dur); }
    const [a, b] = VOWELS[s.vowel];
    for (const [f, q, g] of [[a * shift, 7, 1.6], [b * shift, 9, 1.1]]) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const fg = ctx.createGain(); fg.gain.value = g;
      osc.connect(bp); bp.connect(fg); fg.connect(gain);
    }
    osc.start(t0); osc.stop(t0 + s.dur + 0.01);
    nodes.push(osc);
    if (s.consClass !== 'voiced') {
      const dur = s.consClass === 'plosive' ? 0.008 : 0.04;
      const src = ctx.createBufferSource(); src.buffer = noise(ctx);
      const ng = ctx.createGain(); ng.gain.setValueAtTime(0.28 * level, t0); ng.gain.linearRampToValueAtTime(0, t0 + dur);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = s.consClass === 'plosive' ? 1200 : 3200;
      src.connect(hp); hp.connect(ng); ng.connect(destination);
      src.start(t0); src.stop(t0 + dur + 0.005);
    }
    if (s.tick && sp.tick) {
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 2400;
      const g2 = ctx.createGain(); const t1 = t0 + s.dur + 0.02;
      g2.gain.setValueAtTime(0.1 * level, t1); g2.gain.linearRampToValueAtTime(0, t1 + 0.012);
      o2.connect(g2); g2.connect(destination); o2.start(t1); o2.stop(t1 + 0.015);
    }
  }
  return nodes;
}
// The live voice: its own gain, through the engine's sfx bus so master and mute apply.
export class VoicePlayer {
  log = []; gain = null; active = []; level = 0.8;
  speak(audio, text, who) {
    const syl = syllabify(text, who);
    this.log.push({ who, text: String(text).slice(0, 40) }); if (this.log.length > 30) this.log.shift();
    const c = audio.context;
    if (!c || c.state !== 'running') return syl; // headless, or before the first input
    if (who === 'kevin') { audio.play('squawk'); return syl; }
    const bus = audio.buses?.sfx ?? c.destination;
    if (!this.gain || this.gain.context !== c) { this.gain = c.createGain(); this.gain.connect(bus); }
    this.gain.gain.value = this.level;
    this.stop();
    this.active = renderVoice(c, this.gain, syl, c.currentTime + 0.01, who);
    return syl;
  }
  stop() { for (const o of this.active) { try { o.stop(); } catch { /* already done */ } } this.active = []; }
}
