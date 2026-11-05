/* BENTOU 2: BIRTH OF THE LUNCHBOX ASSASSINS
 * Core loop: take a mission at the shop, pack your bento of ninja tools, slip into a lantern-lit night location unseen,
 * silence guards with Silent Cuts, reach the target, survive the boss, escape, and earn a rank that unlocks new tools.
 * An original game inspired by Tenchu 2: Birth of the Stealth Assassins (not affiliated). Built on my-3D2dge. */
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const T = 16;
const HUB = !!(window.AIHub && AIHub.active);
const TITLE = 'BENTOU 2', SUBTITLE = 'Birth of the Lunchbox Assassins';
const B = { T, HUB, version: '1.0' };
const rnd = () => Math.random();
const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const pickOf = a => a[Math.floor(rnd() * a.length)];
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ---- balance: every number the sliders in Dev Mode move (name: [default, min, max, step, label]) ---- */
B.TUNE_DEF = {
  heroHp:      [100, 30, 300, 5, 'Hero health'],
  damage:      [1, .25, 4, .05, 'Hero damage x'],
  enemyDamage: [1, 0, 3, .05, 'Enemy damage x'],
  sight:       [1, .3, 2.5, .05, 'Guard sight range x'],
  fov:         [1, .5, 1.5, .05, 'Guard view angle x'],
  rise:        [1, .2, 3, .05, 'Suspicion rise x'],
  forget:      [7, 1, 30, .5, 'Search time (s)'],
  hearing:     [1, 0, 3, .05, 'Hearing x'],
  guardSpeed:  [1, .4, 2, .05, 'Guard speed x'],
  heroSpeed:   [1, .5, 1.8, .05, 'Hero speed x'],
  killRange:   [18, 8, 40, 1, 'Silent Cut range'],
  killBack:    [60, 20, 120, 5, 'Back-cut angle (deg)'],
  kiRange:     [130, 40, 300, 5, 'Ki sense range'],
  bossHp:      [1, .2, 3, .05, 'Boss health x'],
  bellTime:    [30, 5, 90, 1, 'Alarm length (s)'],
  toolPower:   [1, .25, 4, .05, 'Tool power x'],
  slowmo:      [.25, .05, 1, .05, 'Silent Cut slow-mo'],
  lightShadow: [.55, .1, 1, .05, 'Exposure in shadow'],
  timeScale:   [1, .25, 2, .05, 'Game speed']
};
B.tune = {};
B.resetTune = () => { for (const k in B.TUNE_DEF) B.tune[k] = B.TUNE_DEF[k][0]; };
B.resetTune();

/* ---- save data (kept in E.store; a hub session gets an empty store, so rounds stay the same everywhere) ---- */
B.SAVE_DEF = { chara: 'sojiro', unlocked: 1, ranks: {}, tools: ['rice', 'poison', 'shuriken', 'smoke', 'caltrops', 'cracker'], loadout: ['rice', 'poison', 'shuriken', 'smoke', 'cracker', 'caltrops', 'rice', 'shuriken'], seenIntro: false, trial: [], ghost: null };
B.load = () => { const s = E.store.get('bentou2', null); B.save = Object.assign(JSON.parse(JSON.stringify(B.SAVE_DEF)), s || {}); };
B.persist = () => { if (!HUB) E.store.set('bentou2', B.save); };
B.load();

/* ---- input: THIRDPERSON, bent to a ninja ---- */
const INPUT = Object.assign({}, E.Input.THIRDPERSON, {
  attack: ['KeyJ', 'Mouse0', 'Pad2'],               // Silent Cut / strike   (square)
  block: ['KeyK', 'Mouse2', 'Pad4'],                // guard / parry         (L1)
  jump: ['Space', 'Pad0'],                           // jump, climb           (cross)
  crouch: ['KeyC', 'ControlLeft', 'Pad1'],          // crouch, dive          (circle)
  interact: ['KeyE', 'KeyF', 'Pad3'],               // kaginawa, drag, talk  (triangle)
  dodge: ['KeyL', 'Pad7'],                           // roll                  (R2)
  use: ['KeyQ', 'Pad5'],                             // use the bento tool    (R1)
  ki: ['Tab', 'Pad6'],                               // Ki Focus              (L2)
  cycle: ['KeyR', 'Pad11'],                          // next tool             (R3)
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad10'],     // run                   (L3)
});
delete INPUT.map;
