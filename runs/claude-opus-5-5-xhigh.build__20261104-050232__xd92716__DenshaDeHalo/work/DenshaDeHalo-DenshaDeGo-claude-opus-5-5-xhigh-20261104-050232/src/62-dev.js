/* 62-dev: Dev Mode, from the pause menu (not in hub sessions): tools to test fast (auto-drive and its skill, god mode,
 * freeze Halo Time, time scale, jumps, finish or fail the stage, time of day, weather, force the next signal, trigger
 * an event, the camera, the debug overlay, the braking guide, unlock everything, reset the save), the balance sliders
 * (live, with Reset to defaults: the settings group Dev), and a sound board to audition every sound. Controller,
 * keyboard and mouse all work (the engine's Shell screens). The debug overlay: FPS, position, the train, signals, rules. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, px = E.px, F = E.font, T = DH.T;
const ui = () => game.shell;
const D = () => DH.drive, R = () => DH.drive && DH.drive.run;
let status = '', jumpKm = 1, aspIdx = 0, todI = 0, camI = 0, tsI = 2;
const TS = [.25, .5, 1, 2, 4], ASP = ['R', 'Y', 'YG', 'G', null], TODS = [null, 5.6, 9, 12, 15, 17.5, 22.5], CAMS = ['cab', 'chase', 'chaseHigh', 'platform', 'trackside'], EVENTS = [['ats', 'ATS TEST'], ['obstruction', 'OBSTRUCTION'], ['doorRush', 'DOOR RUSH'], ['oncoming', 'ONCOMING TRAIN'], ['workers', 'TRACK WORKERS'], ['flash', 'HEADLIGHT FLASH']];
const on = b => b ? 'ON' : 'OFF';
DH.Dev = {
  opened: false,
  open() { this.opened = DH.devOpened = true; this.main(); },
  main() {
    const r = R(), d = D(); if (!r) { ui().show('dev', { title: 'Dev Mode', text: 'Start a drive to use the tools.', actions: [['Back', () => ui().back()]] }); return; }
    const ns = r.nextStop(), sig = r.signalsAhead(3000, 1)[0];
    ui().show('dev', { kicker: 'Pause menu', title: 'Dev Mode', text: () => status || ('Stage ' + r.id + ' · ' + DH.fmtDist(r.s - r.s0) + ' in · ' + DH.clockStr(r.clock) + ' · Halo ' + r.grace.toFixed(1) + ' s'),
      actions: () => [
        ['Auto-drive: ' + on(!!d.ap), () => { if (d.ap) { d.ap = null; DH.devAuto = false; } else { d.ap = new DH.Autopilot(r, { skill: DH.devAutoSkill || 1 }); DH.devAuto = true; } this.say('Auto-drive ' + on(!!d.ap)); }],
        ['Autopilot skill: ' + (DH.devAutoSkill || 1), () => { DH.devAutoSkill = (DH.devAutoSkill || 1) === 1 ? .6 : 1; if (d.ap) d.ap.skill = DH.devAutoSkill; this.say('Skill ' + DH.devAutoSkill); }],
        ['God mode: ' + on(!!r.o.god), () => { r.o.god = !r.o.god; DH.devGod = r.o.god; this.say('God mode ' + on(r.o.god)); }],
        ['Freeze Halo Time: ' + on(r.frozen), () => { r.frozen = !r.frozen; this.say('Halo Time ' + (r.frozen ? 'frozen' : 'running')); }],
        ['Time scale: ' + TS[tsI] + '×', () => { tsI = (tsI + 1) % TS.length; game.timeScale = TS[tsI]; DH.devTimeScale = TS[tsI]; this.say('Time ×' + TS[tsI]); }],
        ['Jump: next station approach (600 m)', () => { const p = r.stops[r.stopIdx]; if (!p) return this.say('No stop ahead'); r.teleport(p.target - 600, { v: Math.min(60, r.limitAt(p.target - 600) - 5), clock: (p.arrT || r.clock) - 55 }); this.say('600 m before ' + p.st.name); }],
        ['Jump to km ' + jumpKm.toFixed(1) + ' (change)', () => { jumpKm = jumpKm >= Math.floor((r.sEnd - r.s0) / 1000) ? .5 : jumpKm + .5; this.main(); }],
        ['Go to km ' + jumpKm.toFixed(1), () => { const s = r.s0 + jumpKm * 1000; if (s >= r.sEnd) return this.say('Past the last stop'); r.teleport(s, { v: Math.min(60, r.limitAt(s) - 5) }); this.say('At km ' + jumpKm.toFixed(1) + ' of the stage'); }],
        ['Skip to the next stop (PERFECT)', () => { this.skipStop(r); }],
        ['Finish the stage (perfect)', () => { let n = 0; while (r.phase !== 'finished' && r.stopIdx < r.stops.length && n++ < 9) this.skipStop(r, true); ui().hide(); }],
        ['Fail the stage (game over)', () => { r.o.god = false; r.frozen = false; r.grace = 0; r.gameOver(); ui().hide(); }],
        ['Time of day: ' + (TODS[todI] === null ? 'timetable' : DH.todName(TODS[todI])), () => { todI = (todI + 1) % TODS.length; DH.devTod = TODS[todI]; this.say('Time of day: ' + (DH.devTod === null ? 'the timetable\'s' : DH.todName(DH.devTod))); }],
        ['Weather: ' + r.weather.toUpperCase(), () => { r.weather = r.weather === 'clear' ? 'rain' : r.weather === 'rain' ? 'fog' : 'clear'; this.say('Weather ' + r.weather); }],
        ['Force the next signal: ' + (sig ? sig.g.id + ' ' + (ASP[aspIdx] || 'free') : 'none'), () => { if (!sig) return; r.forced = r.forced || {}; aspIdx = (aspIdx + 1) % ASP.length; if (ASP[aspIdx]) r.forced[sig.g.id] = ASP[aspIdx]; else delete r.forced[sig.g.id]; r._aspects(); this.say(sig.g.id + ': ' + (ASP[aspIdx] || 'free')); }],
        ['Trigger an event…', () => this.events()],
        ['Camera: ' + d.cam.toUpperCase(), () => { camI = (CAMS.indexOf(d.cam) + 1) % CAMS.length; d.cam = CAMS[camI]; if (d.cam === 'trackside') d.trackS = r.s + 150; this.say('Camera ' + d.cam); }],
        ['Debug overlay: ' + on(!!DH.debugOn) + '  (` key)', () => { DH.debugOn = !DH.debugOn; this.main(); }],
        ['Braking guide: ' + on(DH.guideOn()), () => { game.settings.set('guide', DH.guideOn() ? 'off' : 'on'); this.main(); }],
        ['Balance sliders…', () => ui().show('settings', { groups: ['Dev'], title: 'Dev Mode · Balance', kicker: 'Live: changes apply at once' })],
        ['Sound board…', () => this.sounds()],
        ['Unlock all stages', () => { const p = DH.Progress.get(); p.unlocked = DH.STAGE_ORDER.slice(); DH.Progress.save(p); DH.devUnlockAll = true; this.say('Every stage unlocked'); }],
        ['Reset save data…', () => ui().show('devReset', { title: 'Reset save data?', text: 'Every record, rank, postcard, stat and seen tip is erased. Settings stay.', actions: [['Keep my save', () => ui().back()], ['Erase it', () => { DH.Progress.reset(); DH.devUnlockAll = false; ui().back(); this.say('Save data erased'); }]] })],
        ['Back', () => ui().back()]
      ] });
  },
  say(s) { status = s; setTimeout(() => { if (status === s) status = ''; }, 2500); this.main(); },
  skipStop(r, quiet) {
    const k = r.stopIdx, p = r.stops[k]; if (!p) return;
    r.teleport(p.target - 1, { v: 0, clock: p.arrT !== null ? p.arrT : r.clock });
    r.stopIdx = k; r.s = r.prevS = p.target;   // (the teleport looks 5 m ahead for the next stop: this one is it) r.train.reset(0); r.train.notch = -1; r._smooth = true; r._stopDecel = .5; r.eb.at = -1e9; r.clock = p.arrT !== null ? p.arrT : r.clock;
    r._settle(p, 0, false); if (!quiet) this.say('Stopped PERFECT at ' + p.st.name);
  },
  events() { const r = R(); ui().show('devEvents', { title: 'Trigger an event', actions: EVENTS.map(([id, label]) => [label, () => { const ok = r.events.trigger(id); ui().back(); this.say(label + (ok === false ? ': not here' : ': triggered')); }]).concat([['Back', () => ui().back()]]) }); },
  sounds() {
    const A = game.audio, list = [];
    for (const k of ['clack', 'ebClunk', 'release', 'chime', 'doorThunk', 'buzzer', 'atsDing', 'atsChime', 'slip', 'crack', 'bell', 'whoosh', 'toot', 'gull', 'ferry', 'taiko', 'cicada', 'stamp', 'jPerfect', 'jGreat', 'jGood', 'jOk', 'jBad', 'jTime', 'jSmooth']) list.push(['SFX ' + k, () => A.sfx(k)]);
    for (const k in DH.MELODIES) list.push(['Melody ' + k, () => DH.Sound.melody(k)]);
    for (const k in DH.SONGS) list.push(['Song ' + k, () => DH.Sound.music(k)]);
    for (const k in DH.VOICES) list.push(['Voice ' + k, () => DH.Babble.say('Thank you for riding the Halo Line! Next stop, Hanabatake.', k)]);
    list.push(['Stop music', () => DH.Sound.music(null)], ['Back', () => { DH.Sound.music(game.settings.driveMusic ? 'groove' : null); ui().back(); }]);
    ui().show('devSound', { title: 'Sound board', text: 'Every sound is made in code. Press one to hear it.', actions: list });
  }
};
// the backquote toggles the debug overlay once Dev Mode has been opened this session
if (!game.headless && typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'Backquote' && DH.devOpened && !e.repeat) DH.debugOn = !DH.debugOn; });
/** the debug overlay (pixel text, top left) */
DH.drawDebug = (g, W, H, d) => {
  const r = d.run, tr = r.train, st = tr.st, sg = r.seg(), ns = r.nextStop(), pred = tr.notch < 0 && tr.v > .5 ? DH.predictStop(st, tr.notch, { T: DH.TUNING, ty: tr.ty, grade: sg.grade || 0, wet: r.weather === 'rain', doors: true }, .1).d : null;
  const lines = [
    'FPS ' + Math.round(game.fps) + '  draw ' + (game.stats.renderMs || 0).toFixed(1) + ' ms  segs ' + d.rail.stats.segs + '  items ' + d.rail.stats.items,
    'S ' + r.s.toFixed(1) + '  km ' + (r.R.wrap(r.s) / 1000).toFixed(2) + '  seg ' + Math.floor(r.R.wrap(r.s) / 5) + '  ' + sg.zone + (sg.flags.tunnel ? ' TUNNEL' : '') + (sg.flags.bridge ? ' BRIDGE' : ''),
    'V ' + tr.v.toFixed(1) + ' km/h ' + (tr.v / 3.6).toFixed(2) + ' m/s  A ' + st.a.toFixed(2) + '  J ' + st.jerk.toFixed(1) + '  ' + tr.name + '  P ' + (st.Pe || 0).toFixed(2) + ' B ' + (st.Be || 0).toFixed(2) + (st.slipT > 0 ? ' SLIP' : '') + (st.slide ? ' SLIDE' : ''),
    'SIG ' + r.signalsAhead(3000, 3).map(q => q.g.id + ':' + q.g.aspect + '@' + Math.round(q.d)).join(' ') + (r.actors.length ? '  TRAINS ' + r.actors.map(a => a.id + '@' + Math.round(r.N(a.s))).join(' ') : ''),
    'LIM ' + r.limit + '  NEXT ' + (ns ? ns.p.st.id + ' ' + ns.dist.toFixed(1) + ' m' : '-') + (pred !== null ? '  PRED ' + (ns ? (ns.dist - pred).toFixed(2) : '?') : '') + '  HALO ' + r.grace.toFixed(1) + '  SCORE ' + r.score + '  RIDE ' + Math.round(r.comfort),
    'STAGE ' + r.id + '  SEED ' + DH.seed + '  EVENTS ' + r.eventsFired.join(',') + (d.ap ? '  AUTO ' + d.ap.skill + ' cap ' + (d.ap.cap === null ? '-' : Math.round(d.ap.cap)) : '')
  ];
  E.ui.box(g, 2, 40, Math.min(W - 4, 420), lines.length * 8 + 6, { alpha: .75, bg: '#000000', border: '#3a3a3a' });
  lines.forEach((l, i) => T(g, l, 6, 43 + i * 8, '#9aff9a', { font: 'tiny' }));
};
})();
