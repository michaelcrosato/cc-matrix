/* ---- TUNE: every important balance number is a live game setting in group 'Dev' (the dev mode's slider pages; the
 * patched Shell keeps the group off the player's Settings). B.T(key) reads the live value, with the difficulty's
 * multiplier where it applies, so a change takes effect on the next step ---- */
const TUNE = [
  // [key, default, min, max, step, label, page]
  ['heroRun', 85, 60, 130, 1, 'Run speed', 'Hero'], ['heroSneak', 32, 18, 50, 1, 'Sneak speed', 'Hero'],
  ['heroSprint', 125, 90, 170, 1, 'Sprint speed', 'Hero'], ['heroHpMul', 1, .5, 2, .05, 'Hero health ×', 'Hero'],
  ['grappleRange', 112, 64, 200, 2, 'Grapple range', 'Hero'], ['grappleSpeed', 240, 120, 400, 5, 'Grapple pull speed', 'Hero'],
  ['breath', 12, 5, 30, .5, 'Breath (s)', 'Hero'], ['noiseRun', 60, 20, 140, 2, 'Running noise', 'Hero'],
  ['sightRange', 112, 60, 200, 2, 'Guard sight range', 'Guards'], ['sightFov', 1.5, .8, 2.4, .05, 'Guard field of view', 'Guards'],
  ['suspRise', 1.4, .4, 3, .05, 'Suspicion rise', 'Guards'], ['suspDecay', .3, .05, 1, .01, 'Suspicion decay', 'Guards'],
  ['darkness', .8, 0, 1, .01, 'Shadow strength', 'Guards'], ['crouchVis', .55, .2, 1, .01, 'Crouched visibility', 'Guards'],
  ['hearing', 1, .3, 2, .05, 'Hearing ×', 'Guards'], ['lookUp', 35, 15, 70, 1, 'Look-up limit (°)', 'Guards'],
  ['killRange', 18, 10, 30, 1, 'Silent Cut range', 'Combat'], ['killBackAngle', 60, 30, 90, 1, 'Back cut angle (°)', 'Combat'],
  ['parryWindow', .18, .05, .4, .01, 'Parry window (s)', 'Combat'], ['enemyDmg', 1, .25, 2, .05, 'Enemy damage ×', 'Combat'],
  ['enemyHp', 1, .5, 2, .05, 'Enemy health ×', 'Combat'], ['enemyWindup', 1, .6, 1.6, .05, 'Enemy wind-up ×', 'Combat'],
  ['smokeTime', 6, 2, 12, .5, 'Smoke time (s)', 'Combat'], ['baitRange', 80, 40, 160, 2, 'Bait range', 'Combat'],
  ['kiRange', 160, 80, 300, 4, 'Ki sense range', 'World'], ['alertShout', 160, 0, 320, 4, 'Alert shout radius', 'World'],
  ['bodyRange', 96, 40, 180, 2, 'Body spotting range', 'World'], ['reinforceDelay', 15, 5, 40, 1, 'Reinforcement delay (s)', 'World'],
  ['ambientNight', .38, .15, .7, .01, 'Night ambient light', 'World'], ['lanternRadius', 1, .5, 1.6, .05, 'Lantern radius ×', 'World'],
  ['parTimeMul', 1, .5, 2, .05, 'Par time ×', 'World'], ['slowmo', .3, .1, 1, .05, 'Silent Cut slow motion', 'World']
];
B.TUNE = TUNE;
B.TUNE_PAGES = ['Hero', 'Guards', 'Combat', 'World'];
const DIFF = {   // perception, damage taken, Ki range
  ninja: { see: 1, dmg: 1, ki: 1 }, novice: { see: .8, dmg: .6, ki: 1.2 }, master: { see: 1.2, dmg: 1.4, ki: .85 }
};
const DIFF_KEYS = { sightRange: 'see', suspRise: 'see', enemyDmg: 'dmg', kiRange: 'ki' };
/** a live balance value: B.T('sightRange') */
const T = key => {
  const S = typeof game !== 'undefined' ? game.settings : null, d = TUNE.find(t => t[0] === key);
  let v = S && S[key] !== undefined ? S[key] : d ? d[1] : 0;
  const dk = DIFF_KEYS[key]; if (dk && S) v *= (DIFF[S.difficulty] || DIFF.ninja)[dk];
  return v;
};
B.T = T;
B.tuneDefault = key => { const d = TUNE.find(t => t[0] === key); return d ? d[1] : undefined; };

/* ---- the player's own settings (group Game; Voices under Sound) ---- */
const GAME_SETTINGS = [
  { key: 'uiScale', label: 'Interface size', options: [[0, 'Auto'], [1, 'Normal'], [1.25, 'Large'], [1.5, 'Huge']], value: 0, help: 'How big menus and HUD text are', apply: g => { if (g.shell && g.shell._uiScale) g.shell._uiScale(); } },
  { key: 'difficulty', label: 'Difficulty', options: [['ninja', 'Ninja'], ['novice', 'Novice'], ['master', 'Grand Master']], value: 'ninja', help: 'How sharp the guards are and how hard they hit' },
  { key: 'camAngle', label: 'Camera angle', options: [['low', 'Low'], ['high', 'High']], value: 'low', apply: g => { if (g.scene && g.scene.isMission) g.setView(g.settings.camAngle === 'high' ? 'threequarter' : 'iso'); } },
  { key: 'invertTurn', label: 'Invert camera turn', value: false },
  { key: 'crouchHold', label: 'Crouch', options: [[false, 'Toggle'], [true, 'Hold']], value: false },
  { key: 'cones', label: 'Sight cones', value: true, help: 'The faint cones of guards you can see' },
  { key: 'marker', label: 'Objective marker', value: true },
  { key: 'showAll', label: 'Show all enemies (assist)', value: false, help: 'Turns Shadow Sight off: every guard is drawn' },
  { key: 'heartbeat', label: 'Ki heartbeat', value: true },
  { key: 'textSpeed', label: 'Text speed', options: [['normal', 'Normal'], ['slow', 'Slow'], ['fast', 'Fast']], value: 'normal' },
  { key: 'blood', label: 'Blood', options: [['ink', 'Ink'], ['off', 'Off']], value: 'ink' },
  { key: 'voices', label: 'Voices', group: 'Sound', value: .8, min: 0, max: 1, step: .05, type: 'slider', apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } }
];
const DEV_SETTINGS = TUNE.map(([key, value, min, max, step, label]) => ({ key, label, value, min, max, step, type: 'slider', group: 'Dev' }));
