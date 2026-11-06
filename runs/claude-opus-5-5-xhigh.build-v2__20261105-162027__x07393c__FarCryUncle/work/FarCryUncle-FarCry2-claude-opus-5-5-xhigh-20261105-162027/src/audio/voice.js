// Animalese gibberish: a word always sounds the same, each character has a pitch, rate and wave. Barks are spatial.
import { spatialize } from '../../pixel-engine.js';
import { hashStr, clamp } from '../core/rng.js';
const VOWELS = [[730, 1090], [270, 2290], [300, 870], [570, 840], [530, 1840], [640, 1190]];
const CONS = [[0, 0], [6000, 0.08], [3200, 0.1], [9000, 0.05]];
export const VOICES = {
  bakr: { wave: 'saw', base: 118, rate: 0.112, tilt: 1 }, odile: { wave: 'saw', base: 175, rate: 0.1, tilt: 1 }, tibor: { wave: 'saw', base: 100, rate: 0.13, tilt: 1 },
  vance: { wave: 'triangle', base: 128, rate: 0.14, tilt: 1 }, ansa: { wave: 'saw', base: 205, rate: 0.095, tilt: 1 }, harrow: { wave: 'triangle', base: 92, rate: 0.17, tilt: 0.8 },
  ines: { wave: 'saw', base: 195, rate: 0.082, tilt: 1 }, dov: { wave: 'triangle', base: 84, rate: 0.16, tilt: 1 }, mags: { wave: 'square', base: 245, rate: 0.074, tilt: 1 },
  pell: { wave: 'saw', base: 140, rate: 0.09, tilt: 1 }, concord: { wave: 'saw', base: 112, rate: 0.085, tilt: 1 }, harvest: { wave: 'square', base: 138, rate: 0.08, tilt: 1 }, deserter: { wave: 'saw', base: 100, rate: 0.085, tilt: 1 },
  column: { wave: 'triangle', base: 170, rate: 0.1, tilt: 1 }, '': { wave: 'triangle', base: 110, rate: 0.1, tilt: 1 },
};
// Twelve syllables per voice: vowel formant pair by consonant noise.
export function syllable(wave, base, i) {
  const [f1, f2] = VOWELS[i % VOWELS.length];
  const [cf, cv] = CONS[(i >> 1) % CONS.length];
  const layers = [{ wave: 'sine', freq: f1, decay: 0.08, volume: 0.18 }, { wave: 'sine', freq: f2, decay: 0.07, volume: 0.1 }];
  if (cv) layers.push({ wave: 'noise', freq: cf, decay: 0.012, volume: cv });
  return { wave, freq: base, freqEnd: base * 0.9, attack: 0.005, decay: 0.09, volume: 0.3, layers };
}
export const BARKS = {
  spotted: ['THERE! IN THE GRASS!', 'CONTACT!', 'THERE HE IS.', 'ON THE ROAD! ON THE ROAD!', 'SOMEBODY SEES HIM.'],
  suspicious: ['WHO IS THAT?', 'SOMETHING MOVED.', 'YOU HEAR THAT?'],
  lost: ['WHERE DID HE GO?', 'I HAD HIM. I HAD HIM.', 'LOST HIM.'],
  heard: ['THAT WAS CLOSE.', 'GUNFIRE.', 'WAKE UP. WAKE UP.'],
  giveup: ['IT WAS NOTHING.', 'GO BACK. IT WAS A DOG.', 'NOBODY PAYS ME TO LOOK.'],
  jammed: ["IT'S STUCK! IT'S STUCK AGAIN!", 'THIS RUSTED PIECE OF-', 'SAME GUN, SAME DAY.'],
  fire: ['WHO LIT THAT?', 'THE WIND! MOVE!', 'THE FIELD IS GOING!', 'GET OFF THE GRASS!'],
  burning: ['GET IT OFF! GET IT OFF!', 'WATER!', 'NO NO NO NO'],
  'ally-down-near': ["LEAVE HIM, HE'S ALREADY GONE.", 'THAT WAS MY COUSIN.', 'MAN DOWN.', 'WE ARE NOT PAID FOR THIS.'],
  hit: ['AH!', 'MY ARM!', 'HE GOT ME!'],
  fighting: ['KEEP FIRING!', 'AROUND THE SIDE!', 'FLANK HIM!'],
};
export const BY_FACTION = { concord: { spotted: ['THERE! IN THE GRASS!', 'ENGAGE, BY THE COLONEL\'S ORDER.'], lost: ['REPORT SAYS HE IS GONE.'], jammed: ['REQUISITION A NEW ONE, THEY SAID.'], fire: ['WHO LIT THAT?', 'THAT IS NOT IN THE ORDERS.'] }, harvest: { spotted: ['THIEF ON THE LAND!', 'THERE! FOR THE PEOPLE!'], lost: ['THE LAND HID HIM.'], jammed: ['THE PEOPLE\'S GUN IS STUCK!'], fire: ['THE FIELD IS OURS! WHO LIT IT?', 'WHO LIT THAT?'] } };
export class Voice {
  subtitleUntil = 0; nextBark = 0;
  constructor(game) { this.game = game; this.level = 1; }
  build(ctx) { this.audio = ctx.audio; this.defs = new Map(); }
  def(who, i) {
    const k = `${who}:${i}`;
    let d = this.defs.get(k);
    if (!d) { const v = VOICES[who] ?? VOICES['']; d = syllable(v.wave, v.base, i); this.defs.set(k, d); }
    return d;
  }
  /** How long the line takes to speak. Words hash to syllables so a word always sounds the same. */
  lineSeconds(who, text) {
    const v = VOICES[who] ?? VOICES[''];
    let n = 0;
    for (const w of text.split(/\s+/)) n += Math.max(1, (w.match(/[AEIOUY]/gi) ?? []).length) + 0.4;
    return clamp(n * v.rate, 0.5, 8);
  }
  say(who, text, { gain = 1, pan = 0 } = {}) {
    const g = this.game;
    const level = g.settings.voices * gain;
    if (level <= 0.001 || !g.ctx.audio) return 0;
    const v = VOICES[who] ?? VOICES[''];
    const words = text.split(/\s+/).filter(Boolean);
    let t = 0;
    const last = /[?]\s*$/.test(text) ? 1 : -1;
    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const h = hashStr(word.toUpperCase());
      const vowels = Math.max(1, (word.match(/[AEIOUY]/gi) ?? []).length);
      for (let s = 0; s < vowels; s++) {
        const idx = (h >> (s * 3)) & 15;
        const pitchBase = ((h >> (s + 5)) % 5) - 2;
        const intonation = w >= words.length - 2 ? last * (s + 1) * 0.8 : 0;
        const at = t;
        const def = this.def(who, idx % 12);
        g.afterReal(at, () => { if (!g.ended) this.audio.play(def, { volume: level * 0.8, pitch: pitchBase + intonation, pan }); });
        t += v.rate;
      }
      t += /[,;:]$/.test(word) ? v.rate * 2.2 : v.rate * 0.4;
    }
    return t;
  }
  /** A soldier's bark: gibberish plus a short subtitle, in space. */
  bark(s, kind) {
    const g = this.game;
    const time = g.realT;
    if (s.barkAt && time - s.barkAt < 3) return;
    if (time < this.nextBark && kind !== 'burning') return;
    const fac = BY_FACTION[s.faction]?.[kind];
    const pool = (fac && g.rng.look.chance(0.5)) ? fac : BARKS[kind];
    if (!pool) return;
    const text = g.rng.look.pick(pool);
    s.barkAt = time;
    this.nextBark = time + 1.2;
    const sp = spatialize(g.listener(), [s.x, g.camPos.y, s.z], { max: 70, ref: 4 });
    if (sp.gain < 0.02) return;
    this.say(s.faction, text, { gain: sp.gain, pan: sp.pan });
    if (sp.gain > 0.15 && !g.subtitle.active) g.say(s.faction, text, 1.8, true);
    g.events.emit('bark', kind, text);
  }
}
