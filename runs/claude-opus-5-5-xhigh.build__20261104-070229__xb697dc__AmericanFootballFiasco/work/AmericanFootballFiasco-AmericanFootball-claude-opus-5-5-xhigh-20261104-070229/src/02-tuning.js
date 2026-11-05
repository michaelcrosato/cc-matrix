// Tuning: every gameplay variable the Dev mode exposes as a live slider, with its default and range. FF.T holds the
// live values (the sim reads FF.T on every use); each is also a 'Dev …' setting, so a designer's tuning survives a reload.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, game = FF.game;
// [key, default, min, max, step, label, unit]
const GROUPS = {
  Movement: [['speedBase', 96, 60, 140, 1, 'Base speed', ' u/s'], ['speedPerSpd', 5.5, 3, 12, .5, 'Speed per SPD point', ' u/s'], ['accelBase', 520, 200, 1200, 10, 'Acceleration', ' u/s²'],
    ['turboMult', 1.25, 1, 1.6, .01, 'Turbo speed ×', '×'], ['turboDrain', .45, .1, 1.5, .01, 'Turbo drain', '/s'], ['turboRegen', .22, .05, 1, .01, 'Turbo regen', '/s'],
    ['turboDeadRefill', .35, 0, 1, .01, 'Turbo refill per dead ball', ''], ['carrySpeedMult', .96, .8, 1, .01, 'Carrying speed ×', '×'], ['backpedalMult', .65, .4, 1, .01, 'Backpedal speed ×', '×']],
  Passing: [['lobSpeed', 240, 150, 350, 5, 'Lob speed', ' u/s'], ['bulletSpeed', 400, 250, 550, 5, 'Rocket Pass speed', ' u/s'], ['passGravity', 300, 150, 700, 10, 'Pass gravity', ''],
    ['aimError', .035, 0, .12, .001, 'Aim error', ''], ['maxPass', 55, 30, 80, 1, 'Max pass range', ' yd'], ['pressureMult', 1.6, 1, 3, .05, 'Pressure on aim ×', '×']],
  Catching: [['catchBase', .66, .3, .95, .01, 'Catch chance', ''], ['catchRadius', 14, 6, 24, 1, 'Catch radius', ' u'], ['contestPenalty', .22, 0, .5, .01, 'Contested catch penalty', ''],
    ['intBase', .045, 0, .4, .01, 'Interception base', ''], ['deflectChance', .35, 0, .8, .01, 'Deflection chance', '']],
  Tackling: [['tackleBase', .54, .3, .9, .01, 'Tackle chance', ''], ['bigHitBonus', .12, 0, .3, .01, 'Big Hit bonus', ''], ['bigHitLaunch', 180, 60, 320, 5, 'Big Hit launch', ' u/s'],
    ['fumbleBase', .02, 0, .2, .005, 'Fumble chance', ''], ['stripChance', .12, 0, .4, .01, 'Strip chance', ''], ['stiffBonus', .35, 0, .6, .01, 'Stiff-arm bonus', ''],
    ['spinWindow', .22, .05, .4, .01, 'Spin window', ' s'], ['gangBonus', .18, 0, .4, .01, 'Gang tackle bonus', ''], ['pileRadius', 5, 2, 10, .5, 'Pile-up radius', ' yd']],
  Blocking: [['blockPush', 18, 5, 40, 1, 'Block push', ' u/s'], ['shedBase', 1.9, .5, 4, .05, 'Shed time', ' s']],
  Kicking: [['meterSpeed', 1.4, .6, 3, .05, 'Meter speed', '/s'], ['accBand', .12, .04, .3, .01, 'Accuracy band', ''], ['kickGravity', 260, 120, 600, 10, 'Kick gravity', ''],
    ['puntApex', 260, 40, 500, 10, 'Punt height', ' u'], ['kickoffApex', 220, 40, 500, 10, 'Kickoff height', ' u'], ['fgApex', 150, 40, 500, 10, 'FG height', ' u'],
    ['blockChance', .6, 0, 1, .05, 'Kick block chance', ''], ['cpuFgRange', 45, 30, 60, 1, 'CPU FG range', ' yd']],
  AI: [['aiOpen', 3, 1, 6, .1, 'QB openness needed', ' yd'], ['cushion', 2, .5, 5, .1, 'Coverage cushion', ' yd'], ['reactionMult', 1, .5, 2, .05, 'Reaction delay ×', '×'], ['aiThinkHz', 20, 5, 60, 1, 'AI thinks per second', ' Hz']],
  Rules: [['yardsToGo', 20, 10, 30, 1, 'Yards for a first down', ' yd'], ['runoff', 10, 0, 25, 1, 'Clock runoff', ' s'], ['playcallTime', 12, 5, 30, 1, 'Play call time', ' s'],
    ['autoHike', 8, 3, 20, 1, 'Auto hike', ' s'], ['lateHitWindow', 1.2, 0, 3, .1, 'Late-hit window', ' s'], ['hotPlays', 6, 1, 12, 1, 'Blazing plays', ''], ['fiascoMeterMult', .85, .25, 3, .05, 'Fiasco Meter fill ×', '×']],
  Presentation: [['camLead', .35, 0, 1, .01, 'Camera lead', ' s'], ['camSmooth', .18, 0, .6, .01, 'Camera smoothing', ' s'], ['crowdDecay', .15, .02, .5, .01, 'Crowd calm-down', '/s'],
    ['replayRate', .5, .2, 1, .05, 'Replay speed', '×'], ['commentaryGap', 2.5, 1, 6, .1, 'Commentary gap', ' s'], ['safeMargin', 8, 0, 24, 1, 'Safe margin', ' px']]
};
const T = FF.T = {}, DEF = FF.T_DEFAULTS = {}, SPEC = FF.T_SPEC = {};
for (const g in GROUPS) for (const [k, v, min, max, step, label, unit] of GROUPS[g]) {
  DEF[k] = v; SPEC[k] = { group: g, min, max, step, label, unit };
  T[k] = game.settings.define({ key: 'dev.' + k, group: 'Dev ' + g, label, type: 'slider', value: v, min, max, step, unit, apply: (gm, val) => { T[k] = val; } });
}
FF.T_GROUPS = Object.keys(GROUPS);
FF.T_KEYS = g => GROUPS[g].map(e => e[0]);
FF.resetTuning = group => { for (const g in GROUPS) if (!group || g === group) for (const [k] of GROUPS[g]) game.settings.set('dev.' + k, DEF[k]); };
FF.tuningJSON = () => JSON.stringify(Object.fromEntries(Object.keys(DEF).map(k => [k, T[k]])), null, 1);
})();
