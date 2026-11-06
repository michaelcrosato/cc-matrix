// Animalese gibberish: each subtitle becomes babble, deterministic per line.
import { SPEAKERS } from '../data/dialog.js';

const REG = { low: { base: 120, f1: 500, f2: 900 }, mid: { base: 190, f1: 650, f2: 1250 }, high: { base: 300, f1: 800, f2: 1700 }, demon: { base: 70, f1: 340, f2: 700 } };
const SYL = 20;
function syllable(register, i) {
  const r = REG[register];
  const v = (i * 7) % SYL;
  const glide = 1 + ((i * 13) % 9 - 4) * 0.03;
  const f1 = r.f1 * (0.7 + ((v * 3) % 11) * 0.06); const f2 = r.f2 * (0.75 + ((v * 5) % 13) * 0.05);
  const consonant = i % 3 === 0 ? { wave: 'noise', freq: 3000 + (v * 400), decay: 0.02, volume: 0.1 } : { wave: 'square', duty: 0.125, freq: r.base * 2, decay: 0.015, volume: 0.06 };
  return { wave: 'triangle', freq: r.base, freqEnd: r.base * glide, decay: 0.09, volume: 0.22, layers: [consonant, { wave: 'sine', freq: f1, freqEnd: f1 * glide, decay: 0.07, volume: 0.12 }, { wave: 'sine', freq: f2, freqEnd: f2 * glide, decay: 0.06, volume: 0.06 }] };
}
export const SYLLABLES = Object.fromEntries(Object.keys(REG).map((reg) => [reg, Array.from({ length: SYL }, (_, i) => syllable(reg, i))]));
const hash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h >>> 0; };

// A line's plan: which syllables, when, at what pitch. Pure, so the same line always sounds the same.
export function planLine(who, text) {
  const sp = SPEAKERS[who] ?? SPEAKERS.hero;
  const out = []; let t = 0;
  const q = text.trimEnd().endsWith('?'); const bang = text.includes('!');
  const words = text.split(/\s+/); let wi = 0;
  for (const w of words) {
    const letters = w.replace(/[^A-Za-z]/g, '');
    for (let i = 0; i < Math.max(1, Math.floor(letters.length / 2)); i++) {
      const pair = letters.slice(i * 2, i * 2 + 2) || 'a';
      const h = hash(pair + wi);
      const end = i === Math.floor(letters.length / 2) - 1;
      let pitch = (sp.pitch ?? 0) + (h % 7 - 3) * (sp.variance ?? 1) * 0.5;
      if (bang) pitch += 2;
      if (q && wi === words.length - 1) pitch += 3;
      out.push({ t, syl: h % SYL, pitch, end });
      t += sp.rate ?? 0.08;
    }
    t += /[.,;:!?]$/.test(w) ? (sp.rate ?? 0.08) * 3 : (sp.rate ?? 0.08) * 0.8;
    wi++;
  }
  return { steps: out, dur: t, register: sp.register ?? 'mid', loud: sp.loud ?? 1, soft: sp.soft ?? 1, crush: sp.crush ?? 0, double: !!sp.double };
}
export class VoicePlayer {
  constructor(audio) { this.audio = audio; this.queue = []; this.t = 0; this.volume = 0.8; this.spoken = 0; this.syllablesPlayed = 0; this.signature = []; this.plan = null; }
  say(who, text) { this.plan = planLine(who, text); this.queue = this.plan.steps.slice(); this.t = 0; this.spoken++; this.signature = this.plan.steps.map((s) => s.syl); }
  stop() { this.queue = []; this.plan = null; }
  update(dt) {
    if (!this.queue.length) return;
    this.t += dt;
    const p = this.plan; const reg = SYLLABLES[p.register];
    while (this.queue.length && this.queue[0].t <= this.t) {
      const s = this.queue.shift();
      const def = reg[s.syl];
      const v = this.volume * p.loud * p.soft;
      this.audio.play(p.crush ? { ...def, crush: p.crush } : def, { pitch: s.pitch, volume: v });
      if (p.double) { this.audio.play(reg[(s.syl + 3) % SYL], { pitch: s.pitch - 12, volume: v * 0.7 }); this.audio.play({ ...def, delay: 0.09 }, { pitch: s.pitch, volume: v * 0.35 }); }
      this.syllablesPlayed++;
    }
  }
  get speaking() { return this.queue.length > 0; }
}
