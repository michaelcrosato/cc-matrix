/* ---- TUNE: every balance number in one table. Each is a Dev Tools slider (live, saved), with Reset to defaults ---- */
const TUNE_SPEC = [
  ['drain', 'Life force drain (per s)', 1, 0, 5, .1],
  ['startHealth', 'Starting health', 700, 100, 2000, 25],
  ['foodHeal', 'Roast and cider heal', 100, 25, 300, 5],
  ['heroSpeed', 'Hero speed ×', 1, .5, 2, .05],
  ['shotRate', 'Shot rate ×', 1, .5, 3, .05],
  ['shotDamage', 'Shot damage ×', 1, .5, 3, .05],
  ['magicPower', 'Magic power ×', 1, .25, 3, .05],
  ['monsterSpeed', 'Monster speed ×', 1, .25, 3, .05],
  ['monsterDamage', 'Monster damage ×', 1, 0, 3, .05],
  ['spawnInterval', 'Spawn interval ×', 1, .25, 4, .05],
  ['generatorHp', 'Generator health ×', 1, .25, 4, .05],
  ['maxMonsters', 'Monsters alive at once', 140, 20, 300, 5],
  ['impatience', 'Doors open after (s)', 180, 30, 600, 5],
  ['titheAt', 'The Tithe arrives after (s)', 120, 30, 600, 5],
  ['hoardTime', 'Treasure room seconds', 30, 10, 90, 1],
  ['stairHold', 'Seconds on the stairs', 1, 0, 3, .1]
];
const TUNE = {};
const TUNE_DEFAULTS = {};
for (const [k, , v] of TUNE_SPEC) { TUNE[k] = v; TUNE_DEFAULTS[k] = v; }
for (const [key, label, value, min, max, step] of TUNE_SPEC)
  game.settings.define({ key: 'tune_' + key, group: 'Dev tuning', label, type: 'slider', value, min, max, step, unit: '', apply: (g, v) => { TUNE[key] = v; } });
const resetTuning = () => game.settings.reset('Dev tuning');

/* ---- cheats: toggles, reset on every load; any cheat on shows a DEV badge and keeps the run off the tables ---- */
const CHEATS = {};
const CHEAT_SPEC = [['god', 'God mode (no damage, no drain)'], ['noclip', 'Noclip (walk through walls)'], ['infinite', 'Infinite keys and flasks'], ['freeze', 'Freeze monsters'],
  ['onehit', 'One-hit kills'], ['nogen', 'Generators off'], ['hitboxes', 'Show hitboxes'], ['flowfield', 'Show flow field'], ['netstats', 'Show net stats'], ['botthoughts', 'Show bot thoughts']];
for (const [key, label] of CHEAT_SPEC) game.settings.define({ key: 'cheat_' + key, group: 'Dev cheats', label, type: 'toggle', value: false, apply: (g, v) => { CHEATS[key] = !!v; if (v && RUN && cheating()) RUN.dev = true; } });
game.settings.define({ key: 'cheat_timescale', group: 'Dev cheats', label: 'Time scale', type: 'select', value: '1', options: [['0.25', '¼×'], ['0.5', '½×'], ['1', '1×'], ['2', '2×']], apply: (g, v) => { g.timeScale = +v; } });
game.settings.reset('Dev cheats');
/** a cheat that changes the game (the view-only overlays don't count) is on: a DEV badge, no high scores */
const cheating = () => ['god', 'noclip', 'infinite', 'freeze', 'onehit', 'nogen'].some(k => CHEATS[k]) || game.timeScale !== 1 || !!(W && W.devUsed);

/* ---- difficulty and the number of heroes ---- */
const DIFF = { easy: { drain: .5, dmg: .7, hp: 1.3 }, normal: { drain: 1, dmg: 1, hp: 1 }, hard: { drain: 1.5, dmg: 1.3, hp: .85 } };
const diff = () => DIFF[game.settings.difficulty] || DIFF.normal;
/** the starting (and rising) health with difficulty */
const startHealth = () => Math.round(TUNE.startHealth * diff().hp);
/** how many heroes play: spawn faster, a bigger cap, a tougher King */
const scaleSpawn = n => 1 + .25 * (n - 1);
const scaleCap = n => Math.min(300, Math.round(TUNE.maxMonsters * (1 + .3 * (n - 1))));

/** the game's own settings (the Game group of the Settings screen); literals only: it runs before the other files */
function gameSettings() {
  return [
    { key: 'camView', label: 'Camera view', options: [['threequarter', 'Three-quarter'], ['topdown', 'Top-down'], ['iso', 'Isometric']], value: 'threequarter', help: 'V changes it in play', apply: (g, v) => { if (g.scene && g.scene.views) g.setView(v); } },
    { key: 'difficulty', label: 'Difficulty', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], value: 'normal', help: 'Easy: slower drain, softer bites, more health' },
    { key: 'aimAssist', label: 'Aim assist', options: [['off', 'Off'], ['low', 'Low'], ['high', 'High']], value: 'low', help: 'Shots bend toward the nearest monster or generator' },
    { key: 'stickFires', label: 'Right stick fires', value: true, help: 'Pushing the right stick past halfway fires as well as aims' },
    { key: 'allyStun', label: 'Ally stun', value: true, help: 'From floor 6, your shots stun a friend they touch' },
    { key: 'captions', label: 'Narrator captions', value: true },
    { key: 'tips', label: 'Tips', value: true, help: 'The Gaunt teaches each thing once' },
    { key: 'names', label: 'Player names', value: true, help: 'A name over each hero' },
    { key: 'hudSize', label: 'HUD size', options: [['normal', 'Normal'], ['large', 'Large']], value: 'large', help: 'Large reads from across the room' },
    { key: 'gpuLight', label: 'Enhanced lighting', options: [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']], value: 'auto', help: 'Shadows and colored light where the browser has WebGPU (Auto: on a computer)' }
  ];
}
