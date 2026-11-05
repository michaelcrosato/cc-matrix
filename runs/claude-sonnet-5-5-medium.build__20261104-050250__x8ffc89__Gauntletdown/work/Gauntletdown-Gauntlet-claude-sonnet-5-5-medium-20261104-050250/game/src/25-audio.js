/* Audio: every sound, song and voice is made in code. Voices are Animalese-style gibberish: a babble of short pitched syllables. */
const SFX_DEFS = {
  shot_axe: { wave: 'saw', freq: 260, to: 90, dur: .12, vol: .18 }, shot_javelin: { wave: 'square', freq: 700, to: 300, dur: .1, vol: .16 }, shot_arrow: { wave: 'triangle', freq: 1100, to: 400, dur: .08, vol: .2 },
  shot_hex: [{ wave: 'sine', freq: 500, to: 900, dur: .14, vol: .2 }, { wave: 'triangle', freq: 1000, to: 1500, dur: .1, vol: .1, delay: .02 }],
  swing: { wave: 'noise', freq: 1800, to: 500, dur: .1, vol: .22 }, hit: [{ wave: 'noise', freq: 900, to: 200, dur: .09, vol: .3 }, { wave: 'square', freq: 160, to: 60, dur: .09, vol: .2 }],
  hurt: [{ wave: 'saw', freq: 300, to: 120, dur: .18, vol: .25 }, { wave: 'noise', freq: 600, dur: .08, vol: .2 }], die: { wave: 'saw', freq: 400, to: 40, dur: .8, vol: .3 }, rise: [{ wave: 'triangle', freq: 'C4', dur: .12, vol: .3 }, { wave: 'triangle', freq: 'E4', dur: .12, vol: .3, delay: .1 }, { wave: 'triangle', freq: 'G4', dur: .12, vol: .3, delay: .2 }, { wave: 'triangle', freq: 'C5', dur: .3, vol: .3, delay: .3 }],
  shrink: { wave: 'square', freq: 700, to: 250, dur: .12, vol: .18 }, wail: { wave: 'triangle', freq: 600, to: 200, dur: .5, vol: .25, vib: [9, .05] }, pop: { wave: 'noise', freq: 1200, to: 300, dur: .15, vol: .25 },
  boom: [{ wave: 'noise', freq: 400, to: 60, dur: .6, vol: .5 }, { wave: 'saw', freq: 90, to: 30, dur: .6, vol: .4 }], boomS: [{ wave: 'noise', freq: 600, to: 100, dur: .3, vol: .35 }, { wave: 'saw', freq: 120, to: 40, dur: .3, vol: .25 }],
  bigboom: [{ wave: 'noise', freq: 500, to: 40, dur: 1.2, vol: .6 }, { wave: 'saw', freq: 80, to: 20, dur: 1.2, vol: .5 }],
  squish: { wave: 'noise', freq: 500, to: 120, dur: .12, vol: .22 }, clunk: [{ wave: 'square', freq: 120, to: 70, dur: .1, vol: .3 }, { wave: 'noise', freq: 300, dur: .06, vol: .2 }], crumble: [{ wave: 'noise', freq: 500, to: 80, dur: .7, vol: .45 }, { wave: 'square', freq: 90, to: 30, dur: .5, vol: .3 }],
  clink: { wave: 'square', freq: 2200, to: 1800, dur: .06, vol: .15 }, key: [{ wave: 'square', freq: 'E5', dur: .08, vol: .22 }, { wave: 'square', freq: 'B5', dur: .16, vol: .22, delay: .08 }],
  pickup: [{ wave: 'square', freq: 'C5', dur: .06, vol: .2 }, { wave: 'square', freq: 'G5', dur: .1, vol: .2, delay: .06 }], chomp: [{ wave: 'noise', freq: 800, to: 300, dur: .06, vol: .3 }, { wave: 'square', freq: 220, to: 140, dur: .08, vol: .2, delay: .07 }, { wave: 'noise', freq: 800, to: 300, dur: .06, vol: .3, delay: .12 }],
  gag: { wave: 'saw', freq: 140, to: 70, dur: .4, vol: .25, vib: [20, .1] }, power: [{ wave: 'square', freq: 'C5', dur: .1, vol: .2 }, { wave: 'square', freq: 'E5', dur: .1, vol: .2, delay: .08 }, { wave: 'square', freq: 'G5', dur: .1, vol: .2, delay: .16 }, { wave: 'square', freq: 'C6', dur: .25, vol: .2, delay: .24 }],
  coin: [{ wave: 'square', freq: 'B5', dur: .06, vol: .18 }, { wave: 'square', freq: 'E6', dur: .22, vol: .18, delay: .06 }], gem: [{ wave: 'triangle', freq: 'E6', dur: .1, vol: .25 }, { wave: 'triangle', freq: 'A6', dur: .1, vol: .25, delay: .08 }, { wave: 'triangle', freq: 'E7', dur: .3, vol: .2, delay: .16 }],
  chest: [{ wave: 'noise', freq: 400, dur: .12, vol: .2 }, { wave: 'square', freq: 'C5', dur: .1, vol: .2, delay: .1 }, { wave: 'square', freq: 'G5', dur: .1, vol: .2, delay: .18 }, { wave: 'square', freq: 'C6', dur: .3, vol: .2, delay: .26 }],
  door: [{ wave: 'saw', freq: 90, to: 140, dur: .5, vol: .3 }, { wave: 'noise', freq: 300, dur: .5, vol: .2 }], rumble: { wave: 'noise', freq: 120, to: 50, dur: 1, vol: .5 }, tele: { wave: 'sine', freq: 300, to: 1500, dur: .35, vol: .3 }, zap: { wave: 'saw', freq: 1400, to: 200, dur: .2, vol: .25 },
  secret: [{ wave: 'triangle', freq: 'G5', dur: .1, vol: .25 }, { wave: 'triangle', freq: 'B5', dur: .1, vol: .25, delay: .1 }, { wave: 'triangle', freq: 'D6', dur: .2, vol: .25, delay: .2 }],
  bell: [{ wave: 'sine', freq: 660, dur: 1, vol: .35 }, { wave: 'sine', freq: 1320, dur: .8, vol: .2 }, { wave: 'sine', freq: 990, dur: .9, vol: .15 }], splat: { wave: 'noise', freq: 700, to: 200, dur: .15, vol: .3 }, lob: { wave: 'sine', freq: 300, to: 700, dur: .25, vol: .2 },
  smash: [{ wave: 'noise', freq: 2000, to: 500, dur: .2, vol: .35 }, { wave: 'square', freq: 300, to: 100, dur: .1, vol: .15 }], fire: { wave: 'noise', freq: 1500, to: 400, dur: .25, vol: .25 }, bite: { wave: 'square', freq: 200, to: 90, dur: .1, vol: .25 },
  steal: [{ wave: 'square', freq: 'C6', dur: .06, vol: .2 }, { wave: 'square', freq: 'G5', dur: .06, vol: .2, delay: .06 }, { wave: 'square', freq: 'E5', dur: .1, vol: .2, delay: .12 }],
  tithe: [{ wave: 'saw', freq: 55, to: 45, dur: 1.2, vol: .35, vib: [6, .06] }, { wave: 'triangle', freq: 220, to: 110, dur: 1.2, vol: .2 }], roar: [{ wave: 'saw', freq: 80, to: 40, dur: .9, vol: .45, vib: [18, .1] }, { wave: 'noise', freq: 300, to: 60, dur: .9, vol: .3 }], tell: { wave: 'square', freq: 220, to: 330, dur: .25, vol: .15 },
  descend: [{ wave: 'triangle', freq: 'G5', dur: .12, vol: .3 }, { wave: 'triangle', freq: 'E5', dur: .12, vol: .3, delay: .12 }, { wave: 'triangle', freq: 'C5', dur: .12, vol: .3, delay: .24 }, { wave: 'triangle', freq: 'G4', dur: .12, vol: .3, delay: .36 }, { wave: 'triangle', freq: 'C4', dur: .4, vol: .3, delay: .48 }],
  slam: [{ wave: 'noise', freq: 300, to: 40, dur: .5, vol: .5 }, { wave: 'square', freq: 70, to: 30, dur: .5, vol: .4 }], magic: [{ wave: 'noise', freq: 3000, to: 200, dur: .7, vol: .35 }, { wave: 'sine', freq: 200, to: 1600, dur: .5, vol: .3 }, { wave: 'triangle', freq: 'C5', dur: .6, vol: .2, delay: .1 }, { wave: 'triangle', freq: 'E5', dur: .6, vol: .2, delay: .1 }, { wave: 'triangle', freq: 'G5', dur: .6, vol: .2, delay: .1 }],
  thud: { wave: 'square', freq: 110, to: 50, dur: .1, vol: .28 }, heart: { wave: 'sine', freq: 70, to: 45, dur: .15, vol: .35 }, tick: { wave: 'square', freq: 900, dur: .03, vol: .12 }, tick2: { wave: 'square', freq: 1400, dur: .05, vol: .14 },
  menu: { wave: 'square', freq: 'A5', dur: .04, vol: .1 }, back: { wave: 'square', freq: 'E5', dur: .05, vol: .1 }
};
function defineSfx() { for (const k in SFX_DEFS) game.audio.define(k, SFX_DEFS[k]); }

// ---------- music ----------
const SONGS = {
  title: { bpm: 84, steps: 4, tracks: [
    { wave: 'square', vol: .13, notes: 'D4 - - . F4 - A4 - | D5 - - . C5 - A4 - | Bb4 - - . A4 - F4 - | G4 - A4 - F4 - E4 - | D4 - - . F4 - A4 - | D5 - - . E5 - F5 - | E5 - D5 - C5 - A4 - | D4 - - - . . . . ' },
    { wave: 'triangle', vol: .24, notes: 'D2 . D2 . D2 . A2 . | D2 . D2 . D2 . A2 . | Bb1 . Bb1 . Bb1 . F2 . | G1 . G1 . A1 . A1 . | D2 . D2 . D2 . A2 . | D2 . D2 . D2 . A2 . | A1 . A1 . A1 . E2 . | D2 . . . A1 . . .' },
    { wave: 'drums', vol: .22, notes: 'k . . . s . . . | k . . k s . . . | k . . . s . . . | k . k . s . . s' }] },
  larder: { bpm: 112, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'E4 . G4 . B4 . G4 . | E4 . G4 . B4 . E5 . | D4 . F4 . A4 . F4 . | D4 . F4 . A4 . D5 . | C4 . E4 . G4 . E4 . | C4 . E4 . G4 . C5 . | B3 . D4 . F#4 . D4 . | B3 . D4 . F#4 . B4 .' },
    { wave: 'triangle', vol: .26, notes: 'E2 . E2 E2 . E2 . E3 | D2 . D2 D2 . D2 . D3 | C2 . C2 C2 . C2 . C3 | B1 . B1 B1 . B1 . B2' },
    { wave: 'drums', vol: .2, notes: 'k . h . s . h . | k . h k s . h .' }] },
  ossuary: { bpm: 96, steps: 4, tracks: [
    { wave: 'pulse', vol: .12, notes: 'A4 - - - C5 - - - | B4 - - - G4 - - - | A4 - - - E4 - - - | F4 - E4 - D4 - - - | A4 - - - C5 - - - | D5 - - - B4 - - - | C5 - B4 - A4 - G#4 - | A4 - - - - - - -' },
    { wave: 'triangle', vol: .26, notes: 'A1 . . A1 . . A1 . | G1 . . G1 . . G1 . | F1 . . F1 . . F1 . | E1 . . E1 . . E2 .' },
    { wave: 'drums', vol: .18, notes: 'k . . . . . h . | s . . . h . h . | k . . k . . h . | s . h . s . h h' }] },
  furnace: { bpm: 132, steps: 4, tracks: [
    { wave: 'saw', vol: .1, notes: 'C4 . C4 Eb4 . F4 . G4 | C4 . C4 Eb4 . F4 . Bb4 | Ab3 . Ab3 C4 . Db4 . Eb4 | G3 . G3 B3 . D4 . F4' },
    { wave: 'triangle', vol: .28, notes: 'C2 C2 . C2 C2 . C2 . | C2 C2 . C2 C2 . Bb1 . | Ab1 Ab1 . Ab1 Ab1 . Ab1 . | G1 G1 . G1 G1 . G1 G1' },
    { wave: 'drums', vol: .24, notes: 'k . h h s . h . | k . h k s . h h' }] },
  boss: { bpm: 144, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'D4 D4 . F4 . A4 . D5 | C5 . A4 . F4 . A4 . | Bb3 Bb3 . D4 . F4 . Bb4 | A4 . F4 . E4 . C#4 . | D4 D4 . F4 . A4 . D5 | E5 . D5 . C5 . A4 . | Bb4 . A4 . G4 . F4 . | E4 . E4 . A3 . . .' },
    { wave: 'saw', vol: .1, notes: 'D3 - - . D3 - - . | D3 - - . D3 - - . | Bb2 - - . Bb2 - - . | A2 - - . A2 - - . | D3 - - . D3 - - . | D3 - - . D3 - - . | Bb2 - - . G2 - - . | A2 - - . A2 - - .' },
    { wave: 'triangle', vol: .28, notes: 'D2 D2 D3 D2 D2 D3 D2 D3 | D2 D2 D3 D2 D2 D3 D2 D3 | Bb1 Bb1 Bb2 Bb1 Bb1 Bb2 Bb1 Bb2 | A1 A1 A2 A1 A1 A2 A1 A2' },
    { wave: 'drums', vol: .26, notes: 'k h k h s h k h | k h k k s h s h' }] },
  hoard: { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'C5 E5 G5 E5 C5 E5 G5 C6 | B4 D5 G5 D5 B4 D5 G5 B5 | A4 C5 E5 C5 A4 C5 E5 A5 | G4 B4 D5 B4 G4 B4 D5 G5' },
    { wave: 'triangle', vol: .24, notes: 'C3 . G2 . C3 . G2 . | G2 . D2 . G2 . D2 . | A2 . E2 . A2 . E2 . | G2 . D2 . G2 . D2 .' },
    { wave: 'drums', vol: .2, notes: 'k h h h s h h h' }] },
  victory: { bpm: 100, steps: 4, tracks: [
    { wave: 'square', vol: .14, notes: 'C5 - E5 - G5 - C6 - | B5 - G5 - E5 - G5 - | A5 - F5 - C5 - F5 - | G5 - - - . . . . | C5 - E5 - G5 - C6 - | D6 - B5 - G5 - D5 - | E5 - G5 - C6 - E6 - | C6 - - - - - - -' },
    { wave: 'triangle', vol: .24, notes: 'C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 .' }] }
};
function music(name, o) { if (!game || (W && W.net && W.net.server)) return; const s = SONGS[name]; if (!s) return; if (game.audio.song === s && !(o && o.restart)) return; game.audio.music(s, Object.assign({ fade: .6 }, o || {})); }

// ---------- voices: Animalese-style babble ----------
const Voice = {
  on: true,
  // kind: 'gaunt' (deep, echoing), or a hero class id for a bark/line
  babble(base, text, o = {}) {
    if (!Voice.on || !game || (W && W.net && W.net.server)) return;
    const n = Math.max(3, Math.min(26, Math.ceil(text.length / (o.per || 2.6)))), voices = [], sp = o.speed || .085, wave = o.wave || 'triangle', scale = o.scale || [0, 2, 4, 7, 9, 12];
    let seed = 0; for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
    const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < n; i++) {
      const semi = scale[Math.floor(r() * scale.length)] + (i === n - 1 ? -3 : 0) + (o.rise ? i * .4 : 0);
      const f = base * Math.pow(2, semi / 12), d = sp * (0.6 + r() * .7);
      voices.push({ wave, freq: f, to: f * (0.85 + r() * .3), dur: d, vol: o.vol || .12, delay: i * sp, vib: o.vib });
      if (o.echo) voices.push({ wave, freq: f, to: f * .95, dur: d, vol: (o.vol || .12) * .45, delay: i * sp + o.echo });
    }
    game.audio.sfx(voices, { vary: 0 });
  },
  gaunt(text) { Voice.babble(78, text, { wave: 'sawtooth' === 'x' ? 'saw' : 'saw', vol: .09, speed: .095, echo: .22, per: 2.2, scale: [0, 0, 3, 5, 7, -2], vib: [5, .02] }); },
  hero(h, text) { const b = [95, 150, 200, 260][h.cls] || 150; Voice.babble(b, text, { wave: 'square', vol: .06, speed: .06, per: 1.6 }); },
  bark(h) { const b = [95, 150, 200, 260][h.cls] || 150; Voice.babble(b, 'ouch', { wave: 'square', vol: .08, speed: .05, rise: false }); },
  monster(ch) { Voice.babble({ g: 330, n: 110, o: 180, i: 240, y: 140, x: 300, t: 60 }[ch] || 150, 'grr', { wave: 'saw', vol: .05, speed: .07 }); }
};
