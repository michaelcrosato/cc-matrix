/* TUNING: every gameplay number a designer balances, with its default, range and Dev page. Each is a game setting in a
 * group named 'Dev <page>' (kept off the standard Settings screen by engine change E7), so the Dev mode's sliders are the
 * engine's own slider rows and a designer's tuning survives a reload. The sim reads FF.T.<key> on every use. */
(() => {
'use strict';
const FF = window.FF, game = FF.game;
const TUNING = {
  Movement: [['speedBase', 92, 60, 140, 1], ['speedPerSpd', 7, 3, 12, .5], ['accelBase', 520, 200, 1200, 10], ['turboMult', 1.25, 1, 1.6, .01],
    ['turboDrain', .45, .1, 1.5, .01], ['turboRegen', .22, .05, 1, .01], ['turboDeadRefill', .35, 0, 1, .05], ['carrySpeedMult', .96, .8, 1, .01], ['backpedalMult', .65, .4, 1, .01]],
  Passing: [['lobSpeed', 240, 150, 350, 5], ['bulletSpeed', 400, 250, 550, 5], ['passGravity', 300, 150, 700, 10], ['aimError', .035, 0, .12, .005], ['maxPass', 55, 30, 80, 1], ['pressureMult', 1.6, 1, 3, .1]],
  Catching: [['catchBase', .66, .3, .95, .01], ['catchRadius', 14, 6, 24, 1], ['contestPenalty', .22, 0, .5, .01], ['intBase', .04, 0, .4, .01], ['deflectChance', .35, 0, .8, .01]],
  Tackling: [['tackleBase', .62, .3, .9, .01], ['bigHitBonus', .12, 0, .3, .01], ['bigHitLaunch', 180, 60, 320, 5], ['fumbleBase', .03, 0, .2, .005], ['stripChance', .12, 0, .4, .01],
    ['stiffBonus', .35, 0, .6, .01], ['spinWindow', .22, .05, .4, .01], ['gangBonus', .18, 0, .4, .01], ['pileRadius', 5, 2, 10, .5]],
  Blocking: [['blockPush', 6, 2, 20, .5], ['shedBase', 1.9, .5, 4, .1]],
  Kicking: [['meterSpeed', 1.4, .6, 3, .05], ['accBand', .12, .04, .3, .01], ['kickGravity', 260, 120, 600, 10], ['apexPunt', 260, 40, 500, 10], ['apexKickoff', 220, 40, 500, 10],
    ['apexFg', 150, 40, 500, 10], ['blockChance', .6, 0, 1, .05], ['cpuFgRange', 45, 30, 60, 1]],
  AI: [['aiOpen', 3, 1, 6, .25], ['cushion', 2, .5, 5, .25], ['reactionMult', 1, .5, 2, .05], ['aiThinkHz', 20, 5, 60, 1]],
  Rules: [['yardsToGo', 20, 10, 30, 1], ['runoff', 10, 0, 25, 1], ['playcallTime', 12, 5, 30, 1], ['autoHike', 8, 3, 20, 1], ['lateHitWindow', 1.2, 0, 3, .1],
    ['hotPlays', 6, 1, 12, 1], ['fiascoMeterMult', 1, .25, 3, .05]],
  Presentation: [['camLead', .35, 0, 1, .05], ['camSmooth', .18, 0, .6, .02], ['crowdDecay', .15, .02, .5, .01], ['replayRate', .5, .2, 1, .05], ['commentaryGap', 2.5, 1, 6, .1], ['safeMargin', 8, 0, 24, 1]]
};
const T = FF.T = {}, DEFAULTS = {};
FF.TUNING = TUNING;
for (const [page, rows] of Object.entries(TUNING)) for (const [key, value, min, max, step] of rows) {
  const k = 'dev_' + key; DEFAULTS[key] = value;
  game.settings.define({ key: k, group: 'Dev ' + page, label: key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()), type: 'slider', value, min, max, step });
  Object.defineProperty(T, key, { get: () => game.settings[k], enumerable: true });
}
FF.T.defaults = DEFAULTS;
FF.T.set = (key, v) => game.settings.set('dev_' + key, v);
FF.T.resetPage = page => game.settings.reset('Dev ' + page);
FF.T.resetAll = () => { for (const p of Object.keys(TUNING)) game.settings.reset('Dev ' + p); };
FF.T.values = () => { const o = {}; for (const k of Object.keys(DEFAULTS)) o[k] = T[k]; return o; };

// difficulty columns (§8.4)
FF.DIFF = {
  rookie: { react: .38, tackle: .85, open: 4.5, kick: 1.5, cushion: 1.3, rubber: true },
  pro: { react: .24, tackle: 1, open: 3, kick: 1, cushion: 1, rubber: false },
  fiasco: { react: .13, tackle: 1.12, open: 2, kick: .6, cushion: .85, rubber: false }
};
})();
