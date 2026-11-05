// Gibberish voices (Animalese / Simlish style): per typed letter a vowel plays a blip whose pitch is the speaker's base x
// a vowel offset x a small jitter seeded by the line (a line always sounds the same); a consonant adds a noise click; "?"
// bends the last blip up, "!" makes it louder; spaces are silent. Barks, the cackle, radio crackle, and the howl.
(() => {
const E = My3D2dge, WP = globalThis.WP;
const V = WP.Voice = {};
const PROF = {
  DEN: { f: 300, wave: 'pulse12', radio: true }, LOBO: { f: 150, wave: 'square' }, FANG: { f: 170, wave: 'square' }, TUNDRA: { f: 260, wave: 'pulse' },
  MOONSHINE: { f: 190, wave: 'pulse' }, KRAGG: { f: 120, wave: 'saw', vib: true }, TUSK: { f: 100, wave: 'saw' }, GIGGS: { f: 230, wave: 'pulse', fast: true },
  HOSTAGE: { f: 270, wave: 'pulse' }, REPORTER: { f: 250, wave: 'pulse' }, VILLAGER: { f: 280, wave: 'pulse' }
};
const VOW = { A: 1, E: 1.12, I: 1.25, O: .9, U: .8, Y: 1.18 };
const play = (v, o) => { const g = WP.Audio.game; if (!g || WP.headless || WP.Audio.muteAll) return; g.audio.sfx(v, Object.assign({ vary: 0 }, o || {})); };
V.line = (who, text) => {
  const P = PROF[who] || PROF.VILLAGER; V._rng = E.rng(WP.hash(text)); V._who = who;
  if (P.radio) play([{ wave: 'noise', freq: 3000, to: 1500, dur: .12, vol: .08, filter: 'bandpass', q: .7 }, { wave: 'square', freq: 1800, to: 1800, dur: .03, vol: .04 }]);
  if (who === 'KRAGG' && /HA HA/.test(text)) V.cackle();
  if (/AWOO/.test(text)) V.howl();
};
V.letter = (who, text, i) => {
  const ch = text[i]; if (!ch || ch === ' ') return;
  const P = PROF[who] || PROF.VILLAGER, R = V._rng || E.rng(1), C = ch.toUpperCase();
  const end = text.slice(i + 1).search(/[^A-Z]/i), bang = /!/.test(text.slice(i, i + Math.max(1, end + 2))), ask = /\?/.test(text.slice(i, i + Math.max(1, end + 2)));
  if (VOW[C]) {
    const f = P.f * VOW[C] * (.94 + R() * .12), d = P.fast ? .045 : .05 + R() * .04;
    play({ wave: P.wave, freq: f, to: ask && end <= 1 ? f * 1.35 : f * .96, dur: d, vol: bang ? .13 : .085, vib: P.vib ? [7, .04] : undefined });
  } else if (/[A-Z]/.test(C) && i % 2 === 0) play({ wave: 'noise', freq: 2600 + R() * 1800, to: 2000, dur: .015, vol: .05, filter: 'bandpass', q: 2 });
  if (P.radio && i === text.length - 1) play({ wave: 'noise', freq: 2400, to: 1200, dur: .1, vol: .06, filter: 'bandpass', q: .7, delay: .1 });
};
V.cackle = () => { for (let i = 0; i < 6; i++) play({ wave: 'saw', freq: 220 - i * 12, to: 180 - i * 12, dur: .09, vol: .12, delay: i * .13, vib: [9, .05] }); };
/** the howl: a sine gliding 220 -> 440 -> 330 over 1.4 s with growing vibrato */
V.howl = (k = 1) => { play([{ wave: 'sine', freq: 220 * k, to: 440 * k, dur: .55, vol: .16, attack: .1, hold: true }, { wave: 'sine', freq: 440 * k, to: 330 * k, dur: .9, vol: .16, delay: .52, vib: [6, .03], hold: true }, { wave: 'triangle', freq: 110 * k, to: 220 * k, dur: .55, vol: .05, attack: .1 }]); };
const BARKS = { die: ['GWAH', 'UGH', 'HYAA', 'OOF', 'ACK'], eek: ['EEK', 'AIEE', 'OH NO'], hup: ['HUP'], help: ['HELP'] };
V.bark = (kind, world, at) => {
  const list = BARKS[kind] || BARKS.die, w = WP.pick(WP.fxr, list), f = kind === 'eek' ? 380 : 160 + WP.fxr() * 60;
  let vol = .1, pan = 0;
  if (world && at && at.x !== undefined) { const p = world.view.project(at.x, at.y, at.z || 0), D = world.view.depth(at.x, at.y); vol *= Math.max(.25, 1.2 - D / 700); pan = p ? Math.max(-.8, Math.min(.8, (p[0] / WP.W - .5) * 1.4)) : 0; }
  const g = WP.Audio.game; if (!g || WP.headless || WP.Audio.muteAll) return;
  [...w].forEach((ch, i) => { if (VOW[ch]) g.audio.sfx({ wave: 'square', freq: f * VOW[ch], to: f * VOW[ch] * .8, dur: .07, vol, delay: i * .045 }, { pan, vary: .08 }); else if (ch !== ' ') g.audio.sfx({ wave: 'noise', freq: 2400, to: 1800, dur: .02, vol: vol * .6, delay: i * .045, filter: 'bandpass' }, { pan, vary: 0 }); });
};
})();
