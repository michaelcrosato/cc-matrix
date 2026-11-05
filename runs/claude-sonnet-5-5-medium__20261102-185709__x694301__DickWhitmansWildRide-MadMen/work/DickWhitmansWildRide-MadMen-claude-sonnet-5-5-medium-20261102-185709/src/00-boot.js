/* DICK WHITMAN'S WILD RIDE: boot, input, settings, audio. Built on my-3D2dge. */
(() => {
'use strict';
const E = My3D2dge, { clamp, lerp } = E;
const TITLE = "Dick Whitman's Wild Ride";
const TAGLINE = 'One Thursday on Madison Avenue';
const HUB = !!(window.AIHub && window.AIHub.active);
const QS = new URLSearchParams(location.search);
const DEBUG = QS.has('debug');

/* ---------- controller axes: the "sometimes inverted" fix (Settings: invert horizontal / vertical) ---------- */
const INV = { x: false, y: false };
if (navigator.getGamepads) {
  const real = navigator.getGamepads.bind(navigator);
  navigator.getGamepads = () => Array.from(real() || []).map(p => {
    if (!p || (!INV.x && !INV.y)) return p;
    const ax = Array.from(p.axes);
    for (let i = 0; i < ax.length; i++) { if (i % 2 === 0 && INV.x) ax[i] = -ax[i]; if (i % 2 === 1 && INV.y) ax[i] = -ax[i]; }
    return { id: p.id, index: p.index, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons, axes: ax, vibrationActuator: p.vibrationActuator, hapticActuators: p.hapticActuators };
  });
}

/* ---------- key layout: same game on pad and keyboard ---------- */
const PRESET = Object.assign({}, E.Input.DEFAULT, {
  confirm: [...new Set([...(E.Input.DEFAULT.confirm || []), 'KeyE'])],
  skill: ['KeyF', 'Mouse2', 'Pad2', 'Pad5'],      // light a cigarette
  jump: ['Tab', 'KeyZ', 'Pad3'],                    // the notebook
  attack: ['KeyV', 'Pad11', 'Pad4'],                // change the camera view
  dash: ['ShiftLeft', 'Pad7']                       // walk faster
});
PRESET.confirm = PRESET.confirm.filter(c => c !== 'KeyZ');
PRESET.jump = ['Tab', 'KeyN', 'Pad3'];

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: PRESET, bg: '#07060c',
  menu: Object.assign({
    controls: { confirm: 'Talk / Select', skill: 'Light a cigarette', jump: 'Notebook', attack: 'Change camera view', dash: 'Walk faster' },
    settings: [
      { key: 'glyphs', label: 'Controller glyphs', options: ['PlayStation', 'Xbox'], value: 'PlayStation' },
      { key: 'invertX', label: 'Invert stick horizontal', value: false },
      { key: 'invertY', label: 'Invert stick vertical', value: false },
      { key: 'hints', label: 'Hints', value: true },
      { key: 'difficulty', label: 'Difficulty', options: ['Gentle', 'Standard', 'Brutal'], value: 'Standard' }
    ],
    saves: true
  }, HUB ? {} : { quit: 'title' })
});
game.MAD = { E, TITLE, TAGLINE, HUB, DEBUG, QS, INV, PRESET };
window.__game = game;

/* inputs follow the last device; glyph family follows the setting */
function syncSettings() {
  const s = game.settings || {};
  INV.x = !!s.invertX; INV.y = !!s.invertY;
  game.input.glyphs = s.glyphs === 'Xbox' ? 'xbox' : 'playstation';
}
game.MAD.syncSettings = syncSettings;
game.MAD.label = a => { let d = game.input.lastDevice; if (d === 'touch') d = 'keyboard'; return String(game.input.label(a, d)); };
game.MAD.usingPad = () => game.input.lastDevice === 'gamepad';

/* ---------- activity tracking for attract mode ---------- */
const ACT = { t: performance.now(), touch: false, mouse: [0, 0] };
const poke = () => { ACT.t = performance.now(); };
window.addEventListener('keydown', e => { if (!e.repeat) poke(); });
window.addEventListener('pointerdown', e => { poke(); if (e.pointerType === 'touch') ACT.touch = true; });
window.addEventListener('mousemove', e => { if (Math.hypot(e.clientX - ACT.mouse[0], e.clientY - ACT.mouse[1]) > 6) { ACT.mouse = [e.clientX, e.clientY]; poke(); } });
window.addEventListener('wheel', poke);
window.addEventListener('gamepadconnected', poke);
let padSnap = [];
game.MAD.activity = () => {
  try {
    const ps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    for (const p of ps) {
      const key = p.index; const prev = padSnap[key] || { b: [], a: [] };
      const b = p.buttons.map(x => x.pressed), a = Array.from(p.axes).map(v => Math.round(v * 2) / 2);
      if (b.some((v, i) => v && !prev.b[i]) || a.some((v, i) => Math.abs(v) >= 1 && prev.a[i] !== v)) poke();
      padSnap[key] = { b, a };
    }
  } catch (e) { /* gamepads blocked */ }
  return ACT.t;
};
game.MAD.idleSeconds = () => (performance.now() - game.MAD.activity()) / 1000;
game.MAD.poke = poke;
game.MAD.touchOnly = () => {
  const mm = q => window.matchMedia && window.matchMedia(q).matches;
  const coarse = mm('(pointer: coarse)') && !mm('(any-pointer: fine)');
  let pad = false; try { pad = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(Boolean); } catch (e) { /* none */ }
  return (coarse || (ACT.touch && !('onkeydown' in window && game.input.lastDevice === 'keyboard' && false))) && !pad && !game.MAD.keyboardSeen;
};
window.addEventListener('keydown', () => { game.MAD.keyboardSeen = true; }, { once: true });
game.input.touchEnabled = false;

/* ---------- audio: code-made voices, effects and music ---------- */
const A = game.audio;
A.define('lighter', [{ wave: 'noise', dur: .04, vol: .22 }, { wave: 'square', freq: 2600, to: 1800, dur: .03, vol: .08 }]);
A.define('flame', { wave: 'noise', freq: 900, dur: .3, vol: .07 });
A.define('clink', [{ wave: 'sine', freq: 2640, to: 2200, dur: .14, vol: .2 }, { wave: 'sine', freq: 3520, dur: .08, vol: .1 }]);
A.define('ding', [{ wave: 'sine', freq: 1318, dur: .6, vol: .22 }, { wave: 'sine', freq: 1975, dur: .5, vol: .08 }]);
A.define('typekey', { wave: 'noise', freq: 1500, dur: .03, vol: .17 });
A.define('typebell', { wave: 'sine', freq: 2093, dur: .35, vol: .2 });
A.define('phone', { wave: 'square', freq: 880, dur: .5, vol: .12, arp: [0, 5, 0, 5, 0, 5, 0, 5], step: .06 });
A.define('slide', [{ wave: 'noise', freq: 600, dur: .08, vol: .12 }, { wave: 'square', freq: 220, to: 120, dur: .09, vol: .12 }]);
A.define('carousel', { wave: 'triangle', freq: 'C5', dur: .4, vol: .2, arp: [0, 4, 7, 12], step: .08 });
A.define('sting_win', { wave: 'triangle', freq: 'C5', dur: .7, vol: .24, arp: [0, 4, 7, 12, 16], step: .09 });
A.define('sting_lose', { wave: 'saw', freq: 'E3', to: 'C3', dur: .8, vol: .18 });
A.define('swallow', { wave: 'sine', freq: 180, to: 90, dur: .25, vol: .2 });
A.define('footstep', { wave: 'noise', freq: 400, dur: .03, vol: .06 });

/* Animalese: each letter of a line blips at a pitch taken from the letter, in the speaker's own register */
const VOICES = {
  you:    { base: 150, wave: 'triangle' }, gwen:  { base: 330, wave: 'sine' },   joyce: { base: 260, wave: 'triangle' },
  margie: { base: 300, wave: 'pulse' },    percy: { base: 190, wave: 'square' }, roland:{ base: 120, wave: 'saw' },
  dunn:   { base: 95,  wave: 'triangle' }, archie:{ base: 210, wave: 'pulse' },  hollis:{ base: 140, wave: 'square' },
  teague: { base: 105, wave: 'saw' },      sully: { base: 130, wave: 'triangle' }, vera: { base: 280, wave: 'sine' },
  grace:  { base: 310, wave: 'sine' },     typist:{ base: 340, wave: 'pulse' },   narrator: { base: 170, wave: 'sine' }
};
game.MAD.speak = (who, ch) => {
  const v = VOICES[who] || VOICES.narrator; const c = ch.toLowerCase().charCodeAt(0);
  if (c < 97 || c > 122) return;
  const k = (c - 97), f = v.base * Math.pow(2, ((k * 7) % 13) / 13 * 1.1 - .2);
  A.sfx({ wave: v.wave, freq: f, to: f * (k % 2 ? 1.12 : .9), dur: .055, vol: .1 }, { vary: .02 });
};

/* tiny composer: a chord per bar -> bass, comping, melody and brushes (steps are 16ths: 16 steps a bar) */
const NN = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const nn = m => NN[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const CH = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], d7: [0, 4, 7, 10], m6: [0, 3, 7, 9], dim: [0, 3, 6, 9], sus: [0, 5, 7, 10] };
function compose(o) {
  const R = E.rng(o.seed || 1), bass = [], comp = [], mel = [], drum = [];
  const scale = o.scale || [0, 2, 4, 7, 9];
  for (const [root, q] of o.prog) {
    const ch = CH[q].map(i => root + i);
    const b = Array(16).fill('.'), c = Array(16).fill('.'), m = Array(16).fill('.'), d = Array(16).fill('.');
    const walk = [ch[0], ch[2], ch[1], ch[2] + (R() < .5 ? 2 : -1)];
    walk.forEach((n, i) => { b[i * 4] = nn(n - 24); b[i * 4 + 1] = '-'; b[i * 4 + 2] = '-'; });
    if (o.comp !== false) { c[o.swing ? 6 : 4] = nn(ch[1] + 12) ; c[(o.swing ? 6 : 4) + 1] = '-'; c[10] = nn(ch[3] + 12); c[11] = '-'; }
    const onsets = (o.rhythms || [[0, 6, 10], [0, 4, 8, 12], [2, 6, 12], [0, 3, 6, 8, 11]])[Math.floor(R() * 4)];
    let last = ch[2] + 24;
    onsets.forEach((s, i) => {
      const pool = [...ch.map(x => x + 24), ...scale.map(x => root + 24 + x)];
      let n = pool[Math.floor(R() * pool.length)]; if (Math.abs(n - last) > 7) n = last + (n > last ? 2 : -2); last = n;
      m[s] = nn(n); const end = onsets[i + 1] ?? 16; for (let k = s + 1; k < Math.min(end, s + 3); k++) m[k] = '-';
    });
    if (o.drums !== false) { d[0] = 'k'; d[8] = 'k'; d[4] = 's'; d[12] = 's'; for (let i = 2; i < 16; i += 4) d[i] = 'h'; if (o.swing) d[14] = 'h'; }
    bass.push(b.join(' ')); comp.push(c.join(' ')); mel.push(m.join(' ')); drum.push(d.join(' '));
  }
  const tracks = [{ wave: o.bassWave || 'triangle', vol: o.bassVol || .3, notes: bass.join(' | ') }];
  if (o.comp !== false) tracks.push({ wave: 'pulse12', vol: .07, notes: comp.join(' | ') });
  tracks.push({ wave: o.leadWave || 'sine', vol: o.leadVol || .17, notes: mel.join(' | '), vib: [5, .02] });
  if (o.drums !== false) tracks.push({ wave: 'drums', vol: .16, notes: drum.join(' | ') });
  return { bpm: o.bpm, steps: 4, tracks };
}
const P = (r, q) => [r, q];
game.MAD.songs = {
  title:  compose({ bpm: 92, seed: 11, swing: true, prog: [P(60, 'm7'), P(65, 'd7'), P(58, 'maj7'), P(67, 'd7'), P(60, 'm7'), P(65, 'm7'), P(67, 'd7'), P(60, 'maj7')] }),
  office: compose({ bpm: 104, seed: 23, swing: true, leadVol: .13, prog: [P(62, 'maj7'), P(67, 'maj7'), P(64, 'm7'), P(69, 'd7'), P(62, 'maj7'), P(71, 'm7'), P(64, 'd7'), P(67, 'maj7')] }),
  bar:    compose({ bpm: 76, seed: 37, swing: true, leadWave: 'triangle', leadVol: .2, prog: [P(57, 'm7'), P(62, 'd7'), P(55, 'maj7'), P(60, 'd7'), P(57, 'm7'), P(64, 'd7'), P(62, 'm7'), P(57, 'm6')] }),
  pitch:  compose({ bpm: 118, seed: 41, swing: false, bassWave: 'saw', bassVol: .2, leadWave: 'pulse', leadVol: .1, prog: [P(57, 'm7'), P(57, 'sus'), P(53, 'maj7'), P(55, 'd7'), P(57, 'm7'), P(57, 'dim'), P(55, 'd7'), P(52, 'd7')] }),
  ending: compose({ bpm: 66, seed: 53, comp: false, drums: false, leadWave: 'sine', leadVol: .22, prog: [P(60, 'maj7'), P(57, 'm7'), P(62, 'm7'), P(67, 'd7'), P(60, 'maj7'), P(65, 'maj7'), P(64, 'm7'), P(60, 'maj7')] }),
  sprint: compose({ bpm: 132, seed: 67, swing: true, leadVol: .1, prog: [P(60, 'd7'), P(65, 'd7'), P(60, 'd7'), P(67, 'd7')] })
};

game.MAD.rngFor = label => (window.AIHub && window.AIHub.active && window.AIHub.rng) ? window.AIHub.rng(label) : E.rng((Date.now() ^ (label.length * 7919)) >>> 0);
})();
