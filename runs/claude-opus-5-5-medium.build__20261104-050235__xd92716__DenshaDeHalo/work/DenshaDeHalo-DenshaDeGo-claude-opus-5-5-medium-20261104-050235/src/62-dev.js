/* DENSHA DE HALO! · Dev Mode, from the pause menu (not in hub sessions): the tools for testing quickly (auto-drive,
 * god mode, freeze, time scale, jumps, time of day, weather, forced aspects, events, cameras, the debug overlay, unlock
 * all, reset save) and two sub-screens: the live balance sliders (the Dev settings group, with Reset to defaults) and a
 * sound board. Everything is a Shell screen, so a controller, the keyboard and the mouse all work. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, game = DH.game;
const sh = () => game.shell;
const onOff = v => v ? 'ON' : 'OFF';
const dr = () => DH.current && game.sceneName === 'drive' ? DH.current : null;
DH.pauseItems = () => {
  if (DH.HUB) return [];
  if (game.sceneName === 'drive') return [['Retry stage', () => { sh().hide(); game.go('drive', DH.scenes.drive.data && { stage: DH.scenes.drive.data.stage, free: DH.scenes.drive.data.free }, { fade: 'wipe' }); }],
    ['Retry from last station', () => { const d = dr(); if (!d || !d.run.checkpoint) { game.note && game.note('NO CHECKPOINT YET'); return; } d.run.restore(d.run.checkpoint, false); sh().hide(); }],
    ['How to Drive', () => DH.showHelp()], ['Dev Mode', () => DH.devMenu()]];
  if (game.sceneName === 'duel') return [['How to Drive', () => DH.showHelp()]];
  return [];
};
DH.devMenu = () => {
  DH.dev.opened = true;
  const d = dr(), run = d && d.run;
  const re = () => DH.devMenu();
  const acts = [
    ['Balance sliders', () => sh().show('settings', { title: 'Dev Mode · Balance', groups: ['Dev'], onReset: () => { for (const [k] of DH.DEV_SLIDERS) DH.T[k] = +game.settings['dev_' + k]; } })],
    ['Auto-drive: ' + onOff(DH.dev.auto) + (DH.dev.auto ? ' (skill ' + (DH.dev.autoSkill || 1) + ')' : ''), () => { DH.dev.auto = !DH.dev.auto; if (d) d.pilot = DH.dev.auto ? new DH.Autopilot(run, { skill: DH.dev.autoSkill || 1 }) : null; re(); }],
    ['Autopilot skill: ' + (DH.dev.autoSkill || 1), () => { DH.dev.autoSkill = (DH.dev.autoSkill || 1) === 1 ? .6 : 1; if (d && d.pilot) d.pilot.skill = DH.dev.autoSkill; re(); }],
    ['God mode: ' + onOff(DH.dev.god), () => { DH.dev.god = !DH.dev.god; re(); }],
    ['Freeze Halo Time: ' + onOff(DH.dev.freeze), () => { DH.dev.freeze = !DH.dev.freeze; re(); }],
    ['Time scale: ' + (game.timeScale || 1) + 'x', () => { const L = [.25, .5, 1, 2, 4], i = L.indexOf(game.timeScale || 1); game.timeScale = L[(i + 1) % L.length]; re(); }],
    ['Debug overlay: ' + onOff(DH.dev.overlay) + '  (` key)', () => { DH.dev.overlay = !DH.dev.overlay; re(); }],
    ['Braking guide: ' + game.settings.guide, () => { const L = ['auto', 'on', 'off']; game.settings.set('guide', L[(L.indexOf(game.settings.guide) + 1) % 3]); re(); }],
    ['Unlock all stages: ' + onOff(DH.dev.unlocked), () => { DH.dev.unlocked = !DH.dev.unlocked; if (DH.dev.unlocked) { for (const id of DH.CAREER) if (!DH.progress.unlocked.includes(id)) DH.progress.unlocked.push(id); DH.saveProgress(); } re(); }],
    ['Sound board', () => DH.soundBoard()],
    ['Reset save data', () => sh().show('confirm', { kicker: 'Dev Mode', title: 'Reset save data?', text: 'Records, unlocks, postcards and tips are erased. Settings stay.', actions: [['Keep it', () => sh().back()], ['Erase', () => { DH.resetProgress(); sh().back(); game.note && game.note('SAVE DATA RESET'); }]] })]
  ];
  if (run) acts.splice(1, 0,
    ['Jump: next station approach (600 m)', () => { const sp = run.nextStop; if (sp) DH.jump(run, sp.target - 600, { v: 60 }); sh().hide(); }],
    ['Jump: +1 km', () => { DH.jump(run, run.s + 1000, { v: run.v }); sh().hide(); }],
    ['Skip to the next stop (PERFECT)', () => { const sp = run.nextStop; if (sp) { DH.jump(run, sp.target, { v: 0 }); run.stopIdx = sp.i; run._judge(sp, 0, false); } sh().hide(); }],
    ['Finish the stage (perfect)', () => { DH.devFinish(run); sh().hide(); }],
    ['Fail the stage (game over)', () => { run.grace = 0; run.overGame = true; run.phase = 'over'; run.emit('gameOver', {}); d.handle(run.out); run.out.length = 0; sh().hide(); }],
    ['Time of day: ' + d.tod.toFixed(1) + ' h', () => { d.tod = (d.tod + 3) % 24; d.grade = DH.grade(d.tod, run.stage.weather, run.R); re(); }],
    ['Weather: ' + run.stage.weather.toUpperCase(), () => { const L = ['clear', 'rain', 'fog'], w = L[(L.indexOf(run.stage.weather) + 1) % 3]; run.stage.weather = w; run.rain = w === 'rain'; d.rain = run.rain; d.grade = DH.grade(d.tod, w, run.R); re(); }],
    ['Force next signal: ' + (DH.devForceNext(run, true) || 'none'), () => { DH.devForceNext(run); re(); }],
    ['Trigger: ATS test', () => { run.ats.ringing = true; run.ats.t = 0; run.ats.confirmed = false; run.ats.sig = run.nextSignals(1)[0] && run.nextSignals(1)[0].sg; run.emit('ats', { on: true }); sh().hide(); }],
    ['Trigger: obstruction ahead', () => { const cr = run.R.crossings.find(q => run.dTo(q.s) > 300) || run.R.crossings[0]; run.cart.active = true; run.cart.crossing = cr; run.cart.stoppedT = 0; cr.blocked = true; run.emit('banner', { text: 'OBSTRUCTION!', color: '#ff5a4a' }); sh().hide(); }],
    ['Trigger: oncoming train', () => { run._spawnOncoming({ id: 'dev' + Math.round(run.t) }); sh().hide(); }],
    ['Trigger: headlight flash', () => { run._spawnOncoming({ id: 'devf' + Math.round(run.t), type: 'flash' }); sh().hide(); }],
    ['Trigger: door rush (next stop)', () => { const sp = run.nextStop; if (run.dw) { run.dw.doorRush = true; run.dw.rush = false; } else if (sp) run.events.push({ id: 'devRush', type: 'doorRush', station: sp.id, fired: false }); sh().hide(); }],
    ['Trigger: track workers', () => { run.workers = { s: run.s + 500, until: run.s + 800, limit: 25, lookout: run.s + 450 }; d.crowd.built.delete('workers'); sh().hide(); }],
    ['Camera: ' + d.camMode, () => { const L = ['cab', 'chase', 'chaseHigh', 'platform', 'trackside']; d.camMode = L[(L.indexOf(d.camMode) + 1) % L.length]; re(); }]
  );
  sh().show('dev', { kicker: 'Testing tools', title: 'Dev Mode', text: run ? run.stage.name + ' · ' + DH.fmtKm(run.s % DH.LOOP) + ' · ' + Math.round(run.v) + ' km/h' : 'Open it during a drive for the stage tools.', actions: acts });
};
DH.devForceNext = (run, peek) => {
  const n = run.nextSignals(2).find(q => q.d > 0); if (!n) return null;
  const L = [null, 'R', 'Y', 'YG', 'G'], cur = run.force[n.sg.id] || null;
  if (peek) return n.sg.id + ' ' + (cur || 'auto');
  const nx = L[(L.indexOf(cur) + 1) % L.length]; if (nx) run.force[n.sg.id] = nx; else delete run.force[n.sg.id]; return nx;
};
DH.devFinish = run => {
  for (const sp of run.stops) if (!sp.judged) { DH.jump(run, sp.target, { v: 0 }); run.stopIdx = sp.i; run.clock = sp.arr !== null ? sp.arr : run.clock; run._judge(sp, 0, false); if (run.dw && !run.dw.last) { run.dw = null; run.phase = 'run'; } }
  run.phase = 'end'; run.endT = 99;
};
DH.soundBoard = () => {
  const acts = [];
  for (const n of DH.SFX_NAMES) acts.push([n, () => DH.Sound.play(n)]);
  for (const m of Object.keys(DH.MELODIES).slice(0, 12)) acts.push(['melody: ' + m, () => DH.Sound.melody(m)]);
  for (const s of Object.keys(DH.SONGS)) acts.push(['song: ' + s, () => { DH.curSong = null; DH.music(s); }]);
  acts.push(['song: stop', () => DH.music(null)]);
  for (const v of Object.keys(DH.VOICES)) acts.push(['voice: ' + v, () => DH.Babble.say('Good morning! The next station is Hanabatake. Hanabatake.', v)]);
  sh().show('soundboard', { kicker: 'Dev Mode', title: 'Sound board', text: 'Every sound, melody, song and voice, to audition.', actions: acts });
};
if (typeof window !== 'undefined' && window.addEventListener && typeof document !== 'undefined') window.addEventListener('keydown', e => { if (e.code === 'Backquote' && DH.dev.opened && !DH.HUB) DH.dev.overlay = !DH.dev.overlay; });
/** the debug overlay, pixel text top-left */
DH.devOverlay = (r, d) => {
  const run = d.run, st = game.stats || {};
  r.overlay(g => {
    const lines = [
      'FPS ' + Math.round(1000 / (st.frameMs || 16.7)) + '  draw ' + (st.renderMs || 0).toFixed(1) + ' ms  strips ' + d.rail.stats.strips + ' things ' + d.rail.stats.things,
      's ' + run.s.toFixed(1) + ' (' + DH.fmtKm(DH.wrap(run.s, run.R.len)) + ')  seg ' + run.R.segOf(run.wrapS(run.s)) + '  ' + ((run.R.zoneAt(run.wrapS(run.s)) || {}).id || ''),
      'v ' + run.v.toFixed(2) + ' km/h ' + (run.v / 3.6).toFixed(2) + ' m/s  a ' + run.a.toFixed(2) + '  jerk ' + run.jerk.toFixed(1),
      run.notchName + '  P ' + (run.Pe || 0).toFixed(2) + '  B ' + (run.Be || 0).toFixed(2) + '  adh ' + (run.rain ? DH.T.adhesionRain : 6) + (run.slip ? ' SLIP' : '') + (run.slide ? ' WSP' : ''),
      'sig ' + run.nextSignals(3).map(q => q.sg.id + ':' + q.sg.aspect + '@' + Math.round(q.d)).join(' '),
      'lim ' + run.limitNow().v + ' (' + run.limitNow().why + ')  next stop ' + (run.nextStop ? (run.nextStop.target - run.s).toFixed(1) : '-') + '  pred ' + (d.guide && d.guide.stopAt !== null ? d.guide.stopAt.toFixed(1) : '-'),
      'halo ' + run.grace + '  score ' + run.score + '  comfort ' + run.comfort.toFixed(0) + '  phase ' + run.phase,
      'actors ' + run.actors.map(a => a.id + '@' + Math.round(a.s)).join(' '), 'events ' + run.fired.join(','), 'stage ' + run.id + ' seed ' + DH.seed + ' clock ' + DH.clock(run.clock)
    ];
    px.blend(g, .7, 'normal', () => px.rect(g, 2, 44, Math.min(r.W - 4, 330), lines.length * 9 + 4, '#000000'));
    lines.forEach((l, i) => E.font.text(g, l, 4, 46 + i * 9, '#a8ffb0'));
  });
};
})();
