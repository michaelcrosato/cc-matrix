/* 12-audio: the sound effects (chip-synth presets defined in code), the music calls, and the Animalese voice: every new
 * letter of a line is a short tone or noise shaped by its letter class, pitched by the speaker's profile. */
G.SFX = {
  ui_tick: { wave: 'square', freq: 1400, to: 1300, dur: .02, vol: .08 },
  ui_select: { wave: 'square', freq: 660, to: 990, dur: .07, vol: .12, arp: [0, 4, 7] },
  ui_back: { wave: 'square', freq: 520, to: 300, dur: .08, vol: .1 },
  ui_error: { wave: 'square', freq: 180, to: 120, dur: .18, vol: .12 },
  ui_tab: { wave: 'triangle', freq: 880, to: 1100, dur: .04, vol: .1 },
  bump: { wave: 'sine', freq: 160, to: 90, dur: .08, vol: .35 },
  set: { wave: 'triangle', freq: 400, to: 420, dur: .05, vol: .25 },
  spike: { wave: 'noise', freq: 900, to: 300, dur: .09, vol: .5 },
  block: { wave: 'noise', freq: 1200, to: 400, dur: .08, vol: .45 },
  serveToss: { wave: 'noise', freq: 300, to: 900, dur: .14, vol: .14 },
  serveHit: { wave: 'sine', freq: 220, to: 90, dur: .12, vol: .4 },
  sand: { wave: 'noise', freq: 600, to: 150, dur: .14, vol: .12 },
  net: { wave: 'noise', freq: 2000, to: 900, dur: .1, vol: .15 },
  whistle: { wave: 'square', freq: 2200, to: 2100, dur: .4, vol: .2, vib: [18, .04] },
  crowdCheer: { wave: 'noise', freq: 400, to: 1400, dur: 1.2, vol: .18 },
  crowdGroan: { wave: 'noise', freq: 500, to: 180, dur: .9, vol: .16 },
  ooh: { wave: 'sine', freq: 300, to: 500, dur: .35, vol: .14, vib: [6, .03] },
  splash: { wave: 'noise', freq: 1400, to: 300, dur: .35, vol: .3 },
  hopLand: { wave: 'sine', freq: 420, to: 260, dur: .09, vol: .22 },
  high_five: { wave: 'noise', freq: 2400, to: 1200, dur: .05, vol: .35 },
  glare: { wave: 'sine', freq: 1600, to: 2400, dur: .3, vol: .12, arp: [0, 7, 12] },
  cash: { wave: 'square', freq: 1000, to: 1500, dur: .16, vol: .14, arp: [0, 4, 7, 12] },
  chip: { wave: 'square', freq: 900, to: 600, dur: .03, vol: .14 },
  card_deal: { wave: 'noise', freq: 2200, to: 1200, dur: .05, vol: .18 },
  card_flip: { wave: 'square', freq: 700, to: 1100, dur: .05, vol: .14 },
  reel_spin: { wave: 'square', freq: 300, to: 340, dur: .03, vol: .07 },
  reel_stop: { wave: 'square', freq: 160, to: 90, dur: .08, vol: .3 },
  wheel_spin: { wave: 'triangle', freq: 300, to: 80, dur: .9, vol: .12 },
  ball_rattle: { wave: 'noise', freq: 1800, to: 900, dur: .35, vol: .14 },
  gift_unwrap: { wave: 'noise', freq: 1000, to: 3000, dur: .25, vol: .18 },
  heart_up: { wave: 'sine', freq: 660, to: 990, dur: .18, vol: .18, arp: [0, 4, 7] },
  heart_down: { wave: 'sine', freq: 440, to: 220, dur: .2, vol: .16 },
  shutter: { wave: 'noise', freq: 2500, to: 900, dur: .06, vol: .35 },
  flash: { wave: 'sine', freq: 2000, to: 800, dur: .12, vol: .3 },
  firework: { wave: 'noise', freq: 300, to: 100, dur: .5, vol: .3 },
  door: { wave: 'square', freq: 200, to: 120, dur: .12, vol: .12 },
  jackpot: { wave: 'square', freq: 523, to: 1046, dur: .6, vol: .2, arp: [0, 4, 7, 12, 16] },
  daystart: { wave: 'triangle', freq: 660, to: 880, dur: .3, vol: .18, arp: [0, 4, 7] },
  levelup: { wave: 'triangle', freq: 523, to: 784, dur: .35, vol: .18, arp: [0, 4, 7, 12] },
  win: { wave: 'square', freq: 523, to: 784, dur: .5, vol: .18, arp: [0, 4, 7, 12, 16] },
  lose: { wave: 'triangle', freq: 330, to: 196, dur: .6, vol: .16 },
  ace: { wave: 'square', freq: 784, to: 1046, dur: .3, vol: .18, arp: [0, 7, 12] },
  matchpoint: { wave: 'square', freq: 440, to: 880, dur: .5, vol: .18, arp: [0, 5, 9] },
  gift_love: { wave: 'triangle', freq: 660, to: 1320, dur: .4, vol: .18, arp: [0, 4, 7, 12] },
  gift_refuse: { wave: 'square', freq: 260, to: 160, dur: .3, vol: .14 },
  photo: { wave: 'noise', freq: 2400, to: 1200, dur: .08, vol: .3 },
  dive: { wave: 'noise', freq: 800, to: 200, dur: .3, vol: .22 },
  step_sand: { wave: 'noise', freq: 500, to: 300, dur: .05, vol: .08 },
  seagull: { wave: 'sine', freq: 1800, to: 2600, dur: .25, vol: .08, vib: [10, .05] },
  cricket: { wave: 'square', freq: 4200, to: 4200, dur: .03, vol: .03 },
  cheer: { wave: 'noise', freq: 900, to: 1600, dur: .6, vol: .14 },
  stuff: { wave: 'noise', freq: 1400, to: 300, dur: .12, vol: .5 }
};
G.defineSfx = function () {
  const A = G.game.audio;
  for (const k in G.SFX) A.define(k, G.SFX[k]);
};
G.sfx = function (name, o) { try { G.game.audio.sfx(name, o || {}); } catch (e) { /* headless: no audio */ } };
/* Animalese: a speaker's profile and the letter classes */
G.VOWELS = { a: [800, 1200], e: [450, 1900], i: [300, 2300], o: [500, 900], u: [350, 750], y: [400, 1600] };
G.letterSound = function (ch, prof, idx) {
  const c = String(ch || '').toLowerCase();
  if (!/[a-z]/.test(c)) return null;
  const rng = (i) => ((Math.sin(i * 12.9898 + prof.base) * 43758.5453) % 1 + 1) % 1;
  const n = (rng(idx) - .5) * (prof.range || 3);
  const semis = n;
  const f = prof.base * Math.pow(2, semis / 12);
  const wave = prof.wave || 'triangle';
  if (G.VOWELS[c]) return { wave, freq: f, to: f * 1.04, dur: .07, vol: .09 };
  if ('bdgkptc'.includes(c) || c === 'q') return { wave: 'noise', freq: 1200, to: 400, dur: .02, vol: .08 };
  if ('fhsxzv'.includes(c)) return { wave: 'noise', freq: 4000, to: 2500, dur: .045, vol: .05 };
  return { wave: 'triangle', freq: f * .8, to: f * .8, dur: .05, vol: .06 };
};
/* the per-letter voice of a Dialog: called for every newly shown letter (engine patch 3) */
G.voiceFor = function (prof) {
  return function (ch, idx, lines, dlg) {
    if (!ch || !/[a-zA-Z]/.test(ch)) { if (ch === '!' || ch === '?') { /* stress */ } return; }
    const o = G.letterSound(ch, prof, idx);
    if (!o) return;
    const G2 = G;
    if (G2.game && G2.game.audio && G.voiceVolume() > 0) { try { G2.game.audio.sfx(o, { vol: o.vol * G.voiceVolume() }); } catch (e) { /* headless */ } }
  };
};
G.voiceVolume = function () { const v = G.game && G.game.settings ? G.game.settings.voices : undefined; return v === undefined ? .8 : +v; };
/* a bark: a short voiced word with no box, e.g. "MINE!" */
G.bark = function (text, prof) {
  const v = G.voiceFor(prof || { base: 300, range: 3, wave: 'triangle' });
  for (let i = 0; i < text.length && i < 10; i++) v(text[i], i, [text], null);
};
/* the music calls: a song's object, the layer flags, a sting */
/* a bark: what a fighter shouts on a touch */
G.barkWord = function (kind) { return { bump: 'Hup!', dig: 'Mine!', set: 'Yours!', attack: 'Yah!', spike: 'Yah!', serve: 'Hey!', jump: 'Hiya!', block: 'Block!' }[kind] || 'Hey!'; };
G.music = function (key, o) {
  const game = G.game;
  if (!game || !game.audio) return;
  const song = typeof key === 'string' ? (G.SONGS[key] || null) : key;
  try { game.audio.music(song || null, o || {}); } catch (e) { /* headless */ }
};
