/* ---- TUNING (plan §4.7, Appendix A): the important numbers. Every one is a live dev slider; systems read tune(key) every
 * time, never cache it. resetTuning() restores the defaults; the dev panel can save its values as the player's own. ---- */
const TUNING_GROUPS = [
  ['Movement', [
    ['runSpeed', 'Run speed', 108, 60, 160, 1, 'units a second, before ZOOM'],
    ['accel', 'Acceleration', 900, 300, 2000, 10, 'units a second squared'],
    ['turboMult', 'Turbo speed', 1.5, 1.0, 2.2, .05, 'a multiple while turbo is held'],
    ['turboDrain', 'Turbo drain', .30, .05, .8, .01, 'per second held and moving'],
    ['turboRefill', 'Turbo refill', .20, .05, .8, .01, 'per second'],
    ['turboRefillDelay', 'Turbo refill delay', .35, 0, 1.5, .01, 'seconds after letting go'],
    ['playerGravity', 'Player gravity', 900, 500, 1500, 10, 'units a second squared'],
    ['jumpShotVz', 'Jump speed', 250, 150, 400, 5, 'before SWAT']
  ]],
  ['Shooting', [
    ['shotSkill', 'Shot skill', 1.0, .4, 1.6, .02, 'a multiple of every make chance'],
    ['threeSkill', 'Three-point skill', 1.0, .4, 1.6, .02, 'a multiple of the three chance'],
    ['perfectWindow', 'Perfect window', .10, .03, .30, .005, 'seconds, full width'],
    ['perfectBonus', 'Perfect bonus', .15, 0, .4, .01, 'added to a perfect release'],
    ['badReleasePenalty', 'Bad release penalty', .30, 0, .6, .01, 'lost for an early or late release'],
    ['contestPenalty', 'Contest penalty', .40, 0, .8, .01, 'lost to an airborne defender'],
    ['shotArc', 'Shot arc', 1.0, .6, 1.6, .02, 'a multiple of the apex height']
  ]],
  ['Dunks and blocks', [
    ['dunkRange', 'Dunk range', 150, 60, 300, 2, 'from the rim, before SLAM'],
    ['dunkGravity', 'Dunk gravity', 520, 300, 900, 5, 'units a second squared'],
    ['dunkApex', 'Dunk apex', 1.0, .5, 2.0, .02, 'a multiple of the dunk arc height'],
    ['dunkHang', 'Dunk hang', 1.0, .5, 2.0, .02, 'a multiple of the flight time'],
    ['dunkSlowMo', 'Dunk slow motion', .45, .1, 1.0, .01, 'time scale at the apex (1 = off)'],
    ['blockReach', 'Block reach', 14, 6, 30, .5, 'before SWAT'],
    ['blockChance', 'Block chance', 1.0, 0, 2, .02, 'a multiple'],
    ['shatterChance', 'Shatter chance', 1.0, 0, 5, .05, 'a multiple of the glass chances']
  ]],
  ['Defense', [
    ['stealChance', 'Steal chance', .30, 0, .9, .01, 'per attempt'],
    ['stealReach', 'Steal reach', 18, 8, 36, .5, 'units'],
    ['stealCooldown', 'Steal cooldown', .6, .1, 2, .05, 'seconds'],
    ['shoveForce', 'Shove force', 220, 60, 500, 5, 'units a second'],
    ['shoveCost', 'Shove cost', .25, 0, .8, .01, 'turbo'],
    ['shoveCooldown', 'Shove cooldown', 1.0, .2, 3, .05, 'seconds'],
    ['shoveFumble', 'Shove fumble', .6, 0, 1, .02, 'chance a handler drops it'],
    ['knockdownTime', 'Knockdown time', .8, .2, 2, .02, 'seconds'],
    ['spinCost', 'Spin cost', .2, 0, .6, .01, 'turbo'],
    ['spinCooldown', 'Spin cooldown', 1.5, .3, 4, .05, 'seconds']
  ]],
  ['Supernova', [
    ['novaBaskets', 'Baskets to ignite', 3, 2, 6, 1, 'in a row'],
    ['novaMaxBaskets', 'Baskets before it ends', 4, 1, 10, 1, 'more baskets'],
    ['novaTime', 'Supernova time', 40, 10, 120, 1, 'seconds of game clock'],
    ['novaShotBonus', 'Supernova shot bonus', .25, 0, .6, .01, 'added to every shot']
  ]],
  ['CPU', [
    ['cpuSkill', 'CPU skill', 0, -.5, .5, .01, 'an offset on decision quality'],
    ['cpuReaction', 'CPU reaction', 1.0, .25, 3, .05, 'a multiple of reaction delays'],
    ['cpuAggression', 'CPU aggression', 1.0, 0, 2, .02, 'a multiple of steal and shove rates'],
    ['comeback', 'Comeback assist', .35, 0, 1, .01, 'the trailing team bonus']
  ]],
  ['Match', [
    ['quarterLength', 'Quarter length', 120, 20, 300, 5, 'seconds (Exhibition 120, Tour 90, hub halves 90)'],
    ['shotClock', 'Shot clock', 20, 8, 30, 1, 'seconds'],
    ['gameSpeed', 'Game speed', 1.0, .5, 1.5, .05, 'game.timeScale outside effects'],
    ['fatigue', 'Fatigue', 1.0, 0, 3, .05, 'a multiple of juice loss']
  ]],
  ['Physics', [
    ['ballGravity', 'Ball gravity', 760, 400, 1200, 5, 'units a second squared'],
    ['ballBounce', 'Ball bounce', .62, .3, .9, .01, 'on the floor'],
    ['rimBounce', 'Rim bounce', .45, .2, .8, .01, 'off the ring'],
    ['boardBounce', 'Board bounce', .55, .2, .9, .01, 'off the glass']
  ]],
  ['Courts', [
    ['powerupInterval', 'Power-up interval', 22, 6, 60, 1, 'seconds (± 6)'],
    ['hazardInterval', 'Twist timers', 1.0, .25, 4, .05, 'a multiple of the twist timers'],
    ['windStrength', 'Wind strength', 140, 0, 300, 5, 'units a second squared at full gust'],
    ['jackpotBonus', 'Jackpot bonus', 2, 0, 5, 1, 'points']
  ]]
];
const TUNING = {};
for (const [group, rows] of TUNING_GROUPS) for (const [key, label, def, min, max, step, help] of rows) TUNING[key] = { v: def, def, min, max, step, group, label, help };
const tune = key => (TUNING[key] ? TUNING[key].v : 1);
const setTune = (key, v) => { const t = TUNING[key]; if (!t) return; t.v = clamp(+v, t.min, t.max); return t.v; };
const resetTuning = () => { for (const t of Object.values(TUNING)) t.v = t.def; return true; };
const saveTuning = () => E.store.set('bb:tuning', Object.fromEntries(Object.entries(TUNING).map(([k, t]) => [k, t.v])));
const loadTuning = () => { const saved = E.store.get('bb:tuning', null); if (saved) for (const [k, v] of Object.entries(saved)) if (TUNING[k]) setTune(k, v); };
loadTuning();
