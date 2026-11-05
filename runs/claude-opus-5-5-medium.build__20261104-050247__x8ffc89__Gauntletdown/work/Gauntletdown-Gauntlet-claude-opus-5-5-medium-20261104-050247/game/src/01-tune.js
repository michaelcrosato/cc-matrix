/* 01-tune: every balance number in one table. Dev Tools' sliders bind here; values are saved, and Reset puts them back. */
const TUNE_SPEC = [
  ['drain', 'Life drain / s', 1, 0, 5, .1],
  ['startHealth', 'Start health', 700, 100, 2000, 50],
  ['foodHeal', 'Food heals', 100, 25, 300, 5],
  ['heroSpeed', 'Hero speed', 1, .5, 2, .05],
  ['shotRate', 'Shot rate', 1, .5, 3, .05],
  ['shotDamage', 'Shot damage', 1, .5, 3, .05],
  ['magicPower', 'Magic power', 1, .25, 3, .05],
  ['monsterSpeed', 'Monster speed', 1, .25, 3, .05],
  ['monsterDamage', 'Monster damage', 1, 0, 3, .05],
  ['spawnInterval', 'Spawn interval', 1, .25, 4, .05],
  ['generatorHp', 'Generator HP', 1, .25, 4, .05],
  ['maxMonsters', 'Monster cap', 140, 20, 300, 5],
  ['impatience', 'Doors open at (s)', 180, 30, 600, 5],
  ['titheAt', 'Tithe arrives (s)', 120, 30, 600, 5],
  ['hoardTime', 'Hoard time (s)', 30, 10, 90, 1],
  ['stairHold', 'Stair hold (s)', 1, 0, 3, .1]
];
const TUNE_DEFAULT = Object.fromEntries(TUNE_SPEC.map(s => [s[0], s[2]]));
const TUNE = Object.assign({}, TUNE_DEFAULT, (() => { const s = store.get('tune', {}); const o = {}; for (const [k, , , lo, hi] of TUNE_SPEC) if (typeof s[k] === 'number' && isFinite(s[k])) o[k] = clamp(s[k], lo, hi); return o; })());
const setTune = (k, v) => { const sp = TUNE_SPEC.find(s => s[0] === k); if (!sp) return; TUNE[k] = clamp(Math.round(v / sp[5]) * sp[5], sp[3], sp[4]); TUNE[k] = +TUNE[k].toFixed(3); if (!SESSION) store.set('tune', TUNE); };
const resetTune = () => { Object.assign(TUNE, TUNE_DEFAULT); if (!SESSION) store.set('tune', TUNE); };

/* ---- the Game settings (the standard Settings screen shows them with Display, Sound, Comfort) ---- */
const S = game.settings;
S.define({ key: 'viewMode', group: 'Game', label: 'Camera view', options: [['threequarter', 'Three-quarter'], ['topdown', 'Top-down'], ['iso', 'Isometric']], value: 'threequarter', apply: (g, v) => { if (g.sceneName && g.scene && g.scene.world) g.setView(v); } });
S.define({ key: 'padGlyphs', group: 'Game', label: 'Button symbols', options: [['playstation', 'PlayStation (✕ ○ □ △)'], ['xbox', 'Xbox (A B X Y)']], value: 'playstation', help: 'The controller buttons shown in prompts', apply: (g, v) => { for (const p of g.players || [g.input]) p.glyphs = v; } });
S.define({ key: 'difficulty', group: 'Game', label: 'Difficulty', options: ['Easy', 'Normal', 'Hard'], value: 'Normal' });
S.define({ key: 'aimAssist', group: 'Game', label: 'Aim assist', options: [['off', 'Off'], ['low', 'Low'], ['high', 'High']], value: 'low' });
S.define({ key: 'stickFire', group: 'Game', label: 'Right stick fires', type: 'toggle', value: true, help: 'Pushing the right stick throws in that direction' });
S.define({ key: 'allyStun', group: 'Game', label: 'Ally stun (from floor 6)', type: 'toggle', value: true });
S.define({ key: 'captions', group: 'Game', label: 'Narrator captions', type: 'toggle', value: true });
S.define({ key: 'tips', group: 'Game', label: 'Tips', type: 'toggle', value: true });
S.define({ key: 'names', group: 'Game', label: 'Player names', type: 'toggle', value: true });
S.define({ key: 'hudSize', group: 'Game', label: 'HUD size', options: [['normal', 'Normal'], ['large', 'Large']], value: 'normal' });
S.define({ key: 'voices', group: 'Sound', label: 'Voices', type: 'slider', value: .8, apply: () => voiceVolume() });
game.input.glyphs = S.padGlyphs;

const DIFF = () => ({ Easy: { drain: .5, dmg: .7, hp: 1.3 }, Normal: { drain: 1, dmg: 1, hp: 1 }, Hard: { drain: 1.5, dmg: 1.3, hp: .85 } })[S.difficulty] || { drain: 1, dmg: 1, hp: 1 };
