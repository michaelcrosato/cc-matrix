/* Densha de Halo! · 41-babble: the voices. Gibberish in the Animalese / Simlish style (section 4.17): each word becomes
 * consonant-vowel syllables from a hash of the word, so the same line always sounds the same. Each syllable is a short
 * tone with a formant-like second partial, its pitch from the voice and the punctuation (a question rises, an exclamation
 * stresses, a full stop falls). Voices are chip voices scheduled with delays; nothing is a recorded file. */
(() => {
'use strict';
const DH = window.DH;

/* the voices: base pitch (Hz), syllables a second, the wave, and the character */
DH.VOICES = {
  hoshino: { f0: 95, rate: 9, wave: 'saw', size: 1.2, fall: .5 },
  mika: { f0: 260, rate: 13, wave: 'pulse', size: .9, rise: .2 },
  pa: { f0: 190, rate: 10, wave: 'pulse', size: 1.0, flat: true },
  haro: { f0: 420, rate: 14, wave: 'pulse', size: .8, wobble: 3 },
  driver: { f0: 150, rate: 11, wave: 'square', size: 1.0, clip: true },
  kota: { f0: 340, rate: 13, wave: 'pulse', size: .8 }, fuji: { f0: 230, rate: 8, wave: 'triangle', size: 1.1 },
  kenji: { f0: 140, rate: 15, wave: 'pulse', size: 1.1 }, ren: { f0: 165, rate: 12, wave: 'saw', size: 1.0 },
  sato: { f0: 110, rate: 8, wave: 'saw', size: 1.2 }, ota: { f0: 120, rate: 9, wave: 'triangle', size: 1.0 },
  crowd: { f0: 200, rate: 10, wave: 'triangle', size: 1.0, murmur: true }
};
/* the speaker of a line: the name the game uses in its subtitles */
DH.VOICE_OF = { Hoshino: 'hoshino', Mika: 'mika', Haro: 'haro', Dispatch: 'pa', pa: 'pa', Kota: 'kota', Fuji: 'fuji', Kenji: 'kenji', Ren: 'ren', Sato: 'sato', Ota: 'ota', Driver: 'driver', HOSHINO: 'hoshino', MIKA: 'mika', KOTA: 'kota', KENJI: 'kenji', REN: 'ren', FUJI: 'fuji', OTA: 'ota', DISPATCH: 'pa' };

const CONS = ['k', 's', 't', 'n', 'h', 'm', 'r', 'w', 'sh', 'ts', 'ch', 'g', 'z', 'd', 'b'];
const VOW = ['a', 'i', 'u', 'e', 'o'];
const VOWF = { a: [800, 1200], i: [300, 2300], u: [350, 1300], e: [500, 1900], o: [500, 900] };
const hash = DH.hash;

/* the syllables of a word: deterministic from the word, about one per two letters */
DH.syllabify = (word) => {
  const h = hash(word.toLowerCase()), n = Math.max(1, Math.round(word.replace(/[^A-Za-z]/g, '').length / 2));
  const out = [];
  let x = h;
  for (let i = 0; i < n; i++) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    const c = CONS[(x >>> 8) % CONS.length], v = VOW[(x >>> 16) % VOW.length];
    out.push({ c, v, j: ((x >>> 4) % 7) - 3 });
  }
  return out;
};

/* say a line with a voice: the time it takes (s). Returns the duration so the caller can wait for it */
DH.Babble = {
  say(text, who, o = {}) {
    const game = o.game || (DH.Sound && DH.Sound.game);
    const key = DH.VOICE_OF[who] || (who && who.toLowerCase && DH.VOICES[who.toLowerCase()] ? who.toLowerCase() : 'crowd');
    const V = DH.VOICES[key] || DH.VOICES.crowd;
    const words = String(text).split(/\s+/).filter(Boolean);
    let t = 0.05; const rate = V.rate;
    const sylTime = 1 / rate;
    const pitchAt = (k, n) => V.f0 * Math.pow(2, ((V.fall ? -V.fall : V.rise ? V.rise : 0) * k / Math.max(1, n)) / 12) * (V.wobble ? 1 + Math.sin(k * 2) * V.wobble / 12 : 1);
    const endPunct = /[.!?]$/.exec(text.trim()); const q = /\?$/.test(text.trim()), bang = /!$/.test(text.trim());
    let k = 0, total = 0;
    for (const w of words) total += DH.syllabify(w).length;
    const sylPlan = [];
    for (const w of words) {
      const syl = DH.syllabify(w);
      for (const s of syl) sylPlan.push(s);
    }
    if (!game || game.headless || !game.audio) return sylPlan.length * sylTime + 0.5;
    for (const s of sylPlan) {
      const f = pitchAt(k, total) * (1 + s.j * .02) * (bang && k === 0 ? 1.1 : 1) * (q && k > total - 3 ? 1.12 : 1);
      const [F1, F2] = VOWF[s.v];
      const dur = Math.min(.11, sylTime * .85);
      const voice = { wave: V.wave, freq: f, to: f * (q ? 1.15 : endPunct ? .9 : 1), dur, vol: (bang ? .24 : .17) * (V.clip ? 1.2 : 1), delay: t };
      try { game.audio.sfx(voice); if (V.size && F2) game.audio.sfx({ wave: 'sine', freq: f * (F2 / F1) * .5 * V.size, dur: dur * .8, vol: .035, delay: t }); } catch (e) { /* no audio */ }
      t += sylTime;
      k++;
    }
    return t + 0.2;
  }
};
})();
