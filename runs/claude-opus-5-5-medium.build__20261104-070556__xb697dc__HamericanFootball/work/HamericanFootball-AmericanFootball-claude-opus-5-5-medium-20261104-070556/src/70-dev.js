/* DEV MODE (from the pause menu; never in sessions): TUNING (every gameplay number as a live slider, the engine's own
 * slider rows through engine change E7, reset a page or everything, copy the values), CHEATS, JUMP TO (situations,
 * chapters, cutscenes, drills, stadiums, triggers), the PLAY LAB (n headless plays of an offense against a defense),
 * OVERLAYS (AI debug, hitboxes, the ball's path, FPS and events) and TOOLS (frame step, free camera, HUD off, reseed,
 * reset saves, unlock all). Hotkeys while it is on: ` overlays, [ and ] time scale, \ step a frame. */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game, S = FF.sim, Y = 16, F = FF.FIELD;
const CHEATS = [['godMode', 'God mode (your carriers can\'t be tackled)'], ['infiniteTurbo', 'Infinite turbo'], ['alwaysCatch', 'Always catch'], ['alwaysINT', 'Always intercept'], ['forceFumble', 'Fumble on the next hit'],
  ['noCpuTackle', 'No tackles by the CPU'], ['cpuVsCpu', 'CPU vs CPU (your side played by the AI)'], ['unlimitedCards', 'Unlimited cards'], ['alwaysHot', 'Always Blazing'], ['bigHeads', 'Big Heads'], ['lightsOut', 'Lights out'], ['freezeClock', 'Freeze the clock']];
const SIT = [
  ['4th & goal at the 1', { possession: 0, los: 99, down: 4, toGo: 1 }], ['3rd & 25', { possession: 0, los: 40, down: 3, toGo: 25 }], ['Last 0:10, down by 4', { possession: 0, los: 60, down: 1, toGo: 20, clock: 10, quarter: 4, score: [17, 21] }],
  ['A kickoff', 'kickoff'], ['An onside kick', 'onside'], ['A 52-yd field goal', { possession: 0, los: 65, down: 4, toGo: 10 }], ['Overtime', { possession: 0, los: 25, down: 1, toGo: 20, quarter: 5, ot: true, score: [21, 21] }],
  ['The red zone', { possession: 0, los: 85, down: 1, toGo: 15 }], ['Backed up at your own 1', { possession: 0, los: 1, down: 1, toGo: 20 }]
];
const D = FF.dev = {
  on: false, overlays: { ai: false, hit: false, ball: false, fps: false }, hudOff: false, step: false, timeScale: 1, lab: null,
  open() { D.on = true; D.show('dev'); },
  sh() { return game.shell; },
  show(name) {
    const sh = D.sh(); if (!sh) return false;
    const P = D.pages[name]; if (!P) return false;
    sh.show(name, Object.assign({ back: () => sh.back() }, P()));
    return true;
  },
  pages: {
    dev: () => ({ kicker: 'Dev mode', title: 'DEV MODE', text: 'Tools for testing the game quickly. Changes apply live.', actions: [['Tuning', () => D.show('devTuning')], ['Cheats', () => D.show('devCheats')], ['Jump to', () => D.show('devJump')], ['Play Lab', () => D.show('devLab')], ['Overlays', () => D.show('devOverlays')], ['Tools', () => D.show('devTools')]] }),
    devTuning: () => ({ kicker: 'Dev mode', title: 'TUNING', text: 'Every gameplay number, live. The sim reads them on every use.', actions: Object.keys(FF.TUNING).map(p => [p, () => { D.page = p; D.show('devTune'); }]).concat([['Reset all to defaults', () => { FF.T.resetAll(); D.show('devTuning'); }], ['Copy values', () => D.copy()]]) }),
    devTune: () => ({ kicker: 'Tuning', title: D.page.toUpperCase(), rows: FF.TUNING[D.page].map(r => 'dev_' + r[0]), actions: [['Reset this page', () => { FF.T.resetPage(D.page); D.show('devTune'); }], ['Reset all to defaults', () => { FF.T.resetAll(); D.show('devTune'); }]] }),
    devCheats: () => ({ kicker: 'Dev mode', title: 'CHEATS', actions: CHEATS.map(([k, label]) => [label + ': ' + (D.cheat(k) ? 'ON' : 'off'), () => { D.setCheat(k, !D.cheat(k)); D.show('devCheats'); }]).concat([['Slow motion: ' + D.timeScale + 'x', () => { const L = [1, .5, .25, 2]; D.timeScale = L[(L.indexOf(D.timeScale) + 1) % L.length]; game.timeScale = D.timeScale; D.show('devCheats'); }], ['Win now', () => { game.resume(); S.finishNow(D.myTeam()); }], ['Lose now', () => { game.resume(); S.finishNow(1 - D.myTeam()); }]]) }),
    devJump: () => ({ kicker: 'Dev mode', title: 'JUMP TO', actions: SIT.map(([label, sit]) => [label, () => D.situation(sit)]).concat(
      [['Give a card: HOT SAUCE', () => { S.cards[D.myTeam()].push('HOT_SAUCE'); }], ['Set Blazing on your player', () => { const h = FF.control.humans[0]; if (h && h.a) FF.ots.setHot(h.a); }], ['Mega Hit on the next tackle', () => { S.megaNext = 1 - S.poss; }],
       ['Mascot Mayhem next play', () => { S.mascotOn = D.myTeam(); }], ['Lights out (3 plays)', () => FF.ots.lightsOut(true, 3)], ['Replay the last play', () => { game.resume(); FF.replay.last && (FF.replay.last.used = false, FF.replay.begin(FF.replay.last)); }],
       ['Halftime show', () => { game.resume(); FF.match.halftimeShow = 6; S.toPhase('HALFTIME', 6); }]],
      FF.data.story.chapters.map(ch => ['Story: ' + (ch.n ? 'chapter ' + ch.n : 'prologue') + ' ' + ch.title, () => { game.resume(); FF.story.state().started = 1; FF.story.play(ch.n); }]),
      FF.data.drills.map(d => ['Drill: ' + d.title, () => { game.resume(); FF.drills.start(d.id); }]),
      FF.data.stadiums.map(s => ['Stadium: ' + s.name, () => { game.resume(); game.go('match', Object.assign({}, FF.match.spec || {}, { stadium: s.id, home: s.home, away: s.home === 'fiascos' ? 'dynasty' : 'fiascos', humans: FF.match.spec ? FF.match.spec.humans : [{ input: game.input, team: 0 }] })); }])) }),
    devLab: () => ({ kicker: 'Dev mode', title: 'PLAY LAB', text: D.labText(), actions: [['Offense: ' + D.labOff().name, () => { D.labO = (D.labO + 1) % FF.data.plays.filter(p => p.tab !== 'SPECIAL').length; D.show('devLab'); }], ['Defense: ' + D.labDef().name, () => { D.labD = (D.labD + 1) % FF.data.dplays.filter(p => !p.kickOnly).length; D.show('devLab'); }],
      ['Plays: ' + D.labN, () => { D.labN = D.labN === 10 ? 30 : D.labN === 30 ? 100 : 10; D.show('devLab'); }], ['RUN HEADLESS', () => { D.lab = D.playLab(D.labOff().id, D.labDef().id, D.labN); D.show('devLab'); }], ['RUN ON FIELD (loops this matchup)', () => { game.resume(); D.fieldLab(); }]] }),
    devOverlays: () => ({ kicker: 'Dev mode', title: 'OVERLAYS', actions: [['ai', 'AI debug: behaviors, targets, blocks'], ['hit', 'Hitboxes and skeletons'], ['ball', 'The ball\'s path and landing point'], ['fps', 'FPS, events, devices']].map(([k, l]) => [l + ': ' + (D.overlays[k] ? 'ON' : 'off'), () => { D.overlays[k] = !D.overlays[k]; D.show('devOverlays'); }]) }),
    devTools: () => ({ kicker: 'Dev mode', title: 'TOOLS', actions: [['Frame step: ' + (D.step ? 'ON (\\ steps)' : 'off'), () => { D.step = !D.step; D.show('devTools'); }], ['Free camera: ' + (FF.cam.free ? 'ON' : 'off'), () => { FF.cam.free = !FF.cam.free; game.cam.free = FF.cam.free ? { speed: 300 } : null; D.show('devTools'); }],
      ['HUD: ' + (D.hudOff ? 'hidden' : 'shown'), () => { D.hudOff = !D.hudOff; D.show('devTools'); }], ['Reseed the random numbers', () => FF.rng.seed(Math.floor(Math.random() * 1e6) + 1)], ['Unlock everything', () => { FF.store.set('unlockAll', true); FF.store.set('bigHeadsUnlocked', true); }], ['Reset save data', () => D.sh().show('devConfirm', { title: 'Reset save data?', text: 'Records, the story and best drill scores are erased.', actions: [{ label: 'Erase it', fn: () => { for (const k of ['records', 'drillBest', 'unlockAll', 'bigHeadsUnlocked']) FF.store.set(k, null); try { game.saves.erase('auto'); } catch (e) { /* none */ } D.sh().back(); } }, ['Cancel', () => D.sh().back()]] })]] })
  },
  myTeam() { const h = FF.control.humans[0]; return h ? h.team : 0; },
  cheat(k) { if (k === 'cpuVsCpu') return FF.control.humans.some(h => h.cpu); if (k === 'bigHeads') return !!S.cheats.bigHeads; if (k === 'lightsOut') return !!S.lights; if (k === 'alwaysHot') return !!D.alwaysHot; return !!S.cheats[k]; },
  setCheat(k, v) {
    if (k === 'cpuVsCpu') { for (const h of FF.control.humans) h.cpu = v; return; }
    if (k === 'lightsOut') { FF.ots.lightsOut(v, 99); return; }
    if (k === 'alwaysHot') { D.alwaysHot = v; return; }
    S.cheats[k] = v;
  },
  situation(sit) {
    game.resume();
    const sp = Object.assign({}, FF.match.spec || { home: 'fiascos', away: 'mudhogs', humans: [{ input: game.input, team: 0 }] });
    if (sit === 'kickoff' || sit === 'onside') { sp.start = 'kickoff'; sp.kicking = D.myTeam(); }
    else { sp.start = { possession: D.myTeam(), los: sit.los, down: sit.down, toGo: sit.toGo }; if (sit.clock) sp.clock = sit.clock; if (sit.quarter) sp.quarter = sit.quarter; if (sit.score) sp.score = sit.score; }
    sp.mode = sp.mode || 'exhibition';
    game.go('match', sp, { fade: 0 });
    if (sit === 'onside') game.after(.05, () => { FF.sim.calls[D.myTeam()] = { play: FF.play('onside') }; });
    if (sit.ot) game.after(.05, () => { FF.sim.ot = true; });
  },
  labO: 0, labD: 0, labN: 10,
  labOff: () => FF.data.plays.filter(p => p.tab !== 'SPECIAL')[D.labO], labDef: () => FF.data.dplays.filter(p => !p.kickOnly)[D.labD],
  labText() { const L = D.lab; if (!L) return 'Choose a matchup and run it.'; return `${L.off} vs ${L.def}, ${L.n} plays: ${L.avg} yd a play, completion ${L.comp}, sacks ${L.sacks}, INTs ${L.ints}, fumbles ${L.fum}, TDs ${L.tds}, average ${L.t} s (longest ${L.max} s), stuck ${L.stuck}.`; },
  /** n headless plays of off vs def from midfield, 1st & 20, both CPU (the match is rebuilt afterwards) */
  playLab(off, def, n = 30, o = {}) {
    const keep = FF.match.spec, wasFast = FF.fast; FF.fast = true;
    const out = { off, def, n, yards: 0, att: 0, comp: 0, sacks: 0, ints: 0, fum: 0, tds: 0, time: 0, max: 0, stuck: 0 };
    const humans = FF.control.humans; FF.control.setup([]);
    for (let i = 0; i < n; i++) {
      S.newMatch({ home: o.home || 'fiascos', away: o.away || 'mudhogs', seed: (o.seed || 1) * 1000 + i, qLen: 600, difficulty: o.difficulty || 'pro', start: { possession: 0, los: 50, down: 1, toGo: 20 } });
      const ev = {}, un = FF.bus.on('*', e => { ev[e.ev] = (ev[e.ev] || 0) + 1; });
      S.calls = [{ play: FF.play(off), flip: i % 2 === 1 }, { play: FF.play(def) }]; S.callsDone();
      let k = 0; const los = S.los;
      while (S.phase !== 'DEAD' && S.phase !== 'CELEBRATE' && k < 120 * 40) { S.update(1 / 120); k++; }
      un();
      const P = S.play, res = P.result || {};
      let yd = res.type === 'td' ? (S.goalX(0) - los) / Y : res.x !== undefined ? (res.x - los) / Y : 0; if (S.ball.team !== 0) yd = Math.min(yd, 0);
      out.yards += yd; out.time += P.t; out.max = Math.max(out.max, P.t); if (P.t > 25) out.stuck++;
      out.att += ev.pass ? 1 : 0; out.comp += ev.catch && !ev.int ? 1 : 0; out.sacks += ev.sack || 0; out.ints += ev.int || 0; out.fum += ev.fumble || 0; out.tds += res.type === 'td' ? 1 : 0;
    }
    FF.fast = wasFast; FF.control.humans = humans;
    const r1 = x => Math.round(x * 10) / 10;
    const res = { off: FF.play(off).name, def: FF.play(def).name, n, avg: r1(out.yards / n), comp: out.att ? Math.round(out.comp / out.att * 100) + '%' : '-', att: out.att, sacks: out.sacks, ints: out.ints, fum: out.fum, tds: out.tds, t: r1(out.time / n), max: r1(out.max), stuck: out.stuck };
    if (keep && !o.keep && game.sceneName === 'match') game.go('match', keep, { fade: 0 });
    return res;
  },
  fieldLab() {
    const sp = Object.assign({}, FF.match.spec || {}, { mode: 'exhibition', start: { possession: 0, los: 50, down: 1, toGo: 20 }, humans: [], forceCalls: { 0: () => ({ play: D.labOff() }), 1: () => ({ play: D.labDef() }) }, cheats: { freezeClock: true } });
    D.overlays.ai = true; game.go('match', sp, { fade: 0 });
    game.after(.05, () => { S.afterPlayHook = () => { S.poss = 0; S.los = S.xAt(50, 0); S.down = 1; S.toGo = 20; S.mode = 'normal'; }; });
  },
  copy() {
    const json = JSON.stringify(FF.T.values(), null, 1);
    try { if (navigator.clipboard) navigator.clipboard.writeText(json); } catch (e) { /* not allowed here */ }
    D.sh().show('devCopy', { title: 'Tuning values', text: json, actions: [['Back', () => D.sh().back()]] });
  },
  /** the overlays, drawn over the match */
  draw(r) {
    if (D.alwaysHot) for (const a of S.athletes) if (a.ctl >= 0 && !(a.hot > 0)) FF.ots.setHot(a, 99);
    if (D.overlays.ai) for (const a of S.athletes) {
      r.queue(a.b.x, a.b.y, 50, g => { const p = r.w(a.b.x, a.b.y, 50); E.font.text(g, a.role + ':' + (a.ctl >= 0 ? 'HUMAN' : a.brain.beh), Math.round(p[0]), Math.round(p[1]), a.team ? '#ff9a8a' : '#9ac8ff', { font: 'tiny', align: 'center', outline: '#000' }); }, { emissive: true });
      if (a.eng && a.eng.blk === a) r.decal(g => { const p = r.w(a.b.x, a.b.y, 0), q = r.w(a.eng.rsh.b.x, a.eng.rsh.b.y, 0); px.line(g, p[0], p[1], q[0], q[1], '#ffe040', 2); E.font.text(g, Math.max(0, a.eng.shed - a.eng.t).toFixed(1), Math.round((p[0] + q[0]) / 2), Math.round(p[1]) - 8, '#ffe040', { font: 'tiny', outline: '#000' }); });
      if (a.brain.wp) r.decal(g => { let p0 = r.w(a.b.x, a.b.y, 0); for (let k = a.brain.i; k < a.brain.wp.length; k++) { const p1 = r.w(a.brain.wp[k][0], a.brain.wp[k][1], 0); px.line(g, p0[0], p0[1], p1[0], p1[1], '#ffffff'); p0 = p1; } });
      if (a.brain.zone && a.brain.beh === 'zone') r.decal(g => { const p = r.w(a.brain.zone[0], a.brain.zone[1], 0), rr = ((a.assign.zone && a.assign.zone.r) || 7) * Y; px.ell(g, Math.round(p[0]), Math.round(p[1]), rr, rr * .64, '#7ad0ff'); });
    }
    if (D.overlays.hit) for (const a of S.athletes) { FF.Rigs.of(a).debug(r); r.decal(g => { const p = r.w(a.b.x, a.b.y, 0); px.ell(g, Math.round(p[0]), Math.round(p[1]), a.b.r, a.b.r * .64, '#ff3aff'); }); }
    const B = S.ball;
    if (D.overlays.ball && (B.state === 'pass' || B.state === 'kick')) r.decal(g => { let p0 = r.w(B.x, B.y, 0); const left = B.T - B.t; for (let k = 1; k <= 10; k++) { const t = left * k / 10, p1 = r.w(B.x + B.vx * t, B.y + B.vy * t, 0); px.line(g, p0[0], p0[1], p1[0], p1[1], '#ff6aff'); p0 = p1; } const q = r.w(B.tx, B.ty, 0); px.disc(g, q[0], q[1], 3, '#ff6aff'); });
    if (D.overlays.fps) r.overlay(g => { const I = game.input, m = I.move(); E.ui.box(g, 4, 30, 150, 112, { bg: '#000000', border: '#3a3a5a', alpha: .75 }); E.font.text(g, 'FPS ' + Math.round(game.fps || 0) + '  STEP ' + S.step + '  ' + S.phase, 8, 34, '#7aff6a', { font: 'tiny', outline: false }); E.font.text(g, 'DEVICE ' + I.lastDevice + ' STICK ' + m[0].toFixed(2) + ',' + m[1].toFixed(2), 8, 42, '#7aff6a', { font: 'tiny', outline: false }); FF.bus.log.slice(-12).forEach((e, i) => E.font.text(g, e.t.toFixed(1) + ' ' + e.ev, 8, 52 + i * 7, '#c0c0c0', { font: 'tiny', outline: false })); });
  }
};
// hotkeys while Dev mode is on
if (typeof addEventListener === 'function') addEventListener('keydown', e => {
  if (!D.on || e.repeat) return;
  if (e.code === 'Backquote') D.overlays.ai = !D.overlays.ai;
  if (e.code === 'BracketLeft') { D.timeScale = Math.max(.125, D.timeScale / 2); game.timeScale = D.timeScale; }
  if (e.code === 'BracketRight') { D.timeScale = Math.min(4, D.timeScale * 2); game.timeScale = D.timeScale; }
  if (e.code === 'Backslash' && D.step) D.stepOnce = true;
});
})();
