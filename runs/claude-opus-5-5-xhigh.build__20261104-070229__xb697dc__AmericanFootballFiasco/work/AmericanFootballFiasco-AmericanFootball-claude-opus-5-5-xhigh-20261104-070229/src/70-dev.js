// Dev mode (from the pause menu, the #dev link, or ` once opened): TUNING (every gameplay variable as a live slider,
// reset per page or all, copy as JSON), CHEATS, JUMP TO (situations, chapters, cutscenes, drills, triggers), PLAY LAB
// (headless runs of a matchup with stats), OVERLAYS (AI debug, hitboxes, the ball's path, FPS and input) and TOOLS.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, F = FF.F, YD = 16, game = FF.game, bus = FF.bus;
const dev = FF.dev = { on: false, page: 0, overlays: {}, frameStep: false, labOut: '', group: 0 };
const S = () => game.settings;
// cheats and overlays are settings of the Dev groups (kept, never on the Settings screen)
const CHEATS = [['godMode', 'God mode (your carriers can\'t be tackled)'], ['infiniteTurbo', 'Infinite turbo'], ['forceCatch', 'Always catch'], ['forceINT', 'Always intercept'], ['forceFumble', 'Force a fumble on every hit'],
  ['noTackleCPU', 'No tackles by the CPU'], ['cpuVsCpu', 'CPU vs CPU (your side played by the AI)'], ['unlimitedCards', 'Unlimited cards'], ['alwaysBlazing', 'Always Blazing'], ['bigHeads', 'Big Heads'], ['lightsOut', 'Lights out'], ['freezeClock', 'Freeze the clock'], ['perfectKick', 'Perfect kicks'], ['perfectPass', 'Perfect passes']];
for (const [k, label] of CHEATS) S().define({ key: 'devc.' + k, group: 'Dev Cheats', label, value: false, apply: (g, v) => { if (dev.applyCheat) dev.applyCheat(k, v); } });
S().define({ key: 'devc.slowmo', group: 'Dev Cheats', label: 'Game speed', options: [[.25, '0.25x'], [.5, '0.5x'], [1, '1x'], [2, '2x']], value: 1, apply: (g, v) => { if (game.sceneName === 'match' || game.sceneName === 'drill') game.timeScale = v; } });
const OVER = [['ai', 'AI debug: behaviors, targets, zones, blocks'], ['hitbox', 'Hitboxes and skeletons'], ['ball', 'The ball\'s path and the camera target'], ['fps', 'FPS, events and input'], ['hud', 'HUD on']];
for (const [k, label] of OVER) S().define({ key: 'devo.' + k, group: 'Dev Overlays', label, value: k === 'hud', apply: (g, v) => { dev.overlays[k] = v; if (k === 'hud') FF.hud.show = v; } });
const LAB = { off: 'slants', def: 'cover2', n: 30 };
S().define({ key: 'devl.off', group: 'Dev Lab', label: 'Offense play', options: FF.data.offPlays.map(p => [p.id, p.name]), value: 'slants', apply: (g, v) => { LAB.off = v; } });
S().define({ key: 'devl.def', group: 'Dev Lab', label: 'Defense play', options: FF.data.defPlays.map(p => [p.id, p.name]), value: 'cover2', apply: (g, v) => { LAB.def = v; } });
S().define({ key: 'devl.n', group: 'Dev Lab', label: 'Plays (n)', options: [[10, '10'], [30, '30'], [100, '100']], value: 30, apply: (g, v) => { LAB.n = v; } });
S().define({ key: 'devl.home', group: 'Dev Lab', label: 'Offense team', options: FF.data.teamList.map(t => [t, FF.data.teams[t].short]), value: 'fiascos', apply: (g, v) => { LAB.home = v; } });
S().define({ key: 'devl.away', group: 'Dev Lab', label: 'Defense team', options: FF.data.teamList.map(t => [t, FF.data.teams[t].short]), value: 'mudhogs', apply: (g, v) => { LAB.away = v; } });
const JS = { score0: 0, score1: 0, clock: 60, down: 1, toGo: 20 };
S().define({ key: 'devj.score0', group: 'Dev Jump', label: 'Home score', type: 'slider', min: 0, max: 63, step: 1, value: 0, apply: (g, v) => { JS.score0 = v; } });
S().define({ key: 'devj.score1', group: 'Dev Jump', label: 'Away score', type: 'slider', min: 0, max: 63, step: 1, value: 0, apply: (g, v) => { JS.score1 = v; } });
S().define({ key: 'devj.clock', group: 'Dev Jump', label: 'Clock (s)', type: 'slider', min: 1, max: 300, step: 1, value: 60, apply: (g, v) => { JS.clock = v; } });
S().define({ key: 'devj.down', group: 'Dev Jump', label: 'Down', type: 'slider', min: 1, max: 4, step: 1, value: 1, apply: (g, v) => { JS.down = v; } });
S().define({ key: 'devj.toGo', group: 'Dev Jump', label: 'Yards to go', type: 'slider', min: 1, max: 40, step: 1, value: 20, apply: (g, v) => { JS.toGo = v; } });
S().define({ key: 'devj.stadium', group: 'Dev Jump', label: 'Stadium', options: FF.data.stadiumList.map(s => [s, FF.data.stadiums[s].name]), value: 'tumbleweed', apply: (g, v) => { JS.stadium = v; } });
S().define({ key: 'devj.weather', group: 'Dev Jump', label: 'Weather', options: [['stadium', 'Stadium'], ['clear', 'Clear'], ['rain', 'Rain'], ['snow', 'Snow']], value: 'stadium', apply: (g, v) => { JS.weather = v; } });
dev.applyCheat = (k, v) => {
  const m = FF.match; if (!m) return;
  if (k === 'lightsOut') { if (v) m.ots.trigger('lightsOut', { plays: 99 }); else { m.ots.lightsOut = 0; FF.lightsOut = false; } return; }
  if (k === 'cpuVsCpu') { if (v) { dev.savedHumans = dev.savedHumans || JSON.parse(JSON.stringify(m.humans)); m.humans = { 0: [], 1: [] }; for (const a of m.all) a.ctl = null; } else if (dev.savedHumans) { m.humans = dev.savedHumans; dev.savedHumans = null; } return; }
  m.cheats[k] = v;
};
dev.onMatch = mv => { for (const [k] of CHEATS) if (S()['devc.' + k]) dev.applyCheat(k, true); };
const page = (name, spec) => game.shell.show(name, Object.assign({ kicker: 'DEV MODE' }, spec));   // (cancel and Back pop one page: the Shell's own back)
const nav = () => [['TUNING', () => dev.tuning()], ['CHEATS', () => dev.cheats()], ['JUMP TO', () => dev.jump()], ['PLAY LAB', () => dev.lab()], ['OVERLAYS', () => dev.overlaysPage()], ['TOOLS', () => dev.tools()]];
dev.open = () => { dev.on = true; dev.unlockHotkeys = true; if (!game.paused && (game.scene && game.scene.pausable)) game.pause('menu'); page('dev', { title: 'Dev Mode', text: 'The tools for testing the game quickly. Changes apply live. Back returns to the pause menu.', actions: nav().concat([['Back', () => game.shell.back()]]) }); };
dev.tuning = () => { const g = FF.T_GROUPS[dev.group]; page('dev-tune', { title: 'Tuning: ' + g, text: 'Every slider changes the sim at once and is kept for the next visit.', rows: FF.T_KEYS(g).map(k => 'dev.' + k),
  actions: [['‹ ' + FF.T_GROUPS[(dev.group + FF.T_GROUPS.length - 1) % FF.T_GROUPS.length], () => { dev.group = (dev.group + FF.T_GROUPS.length - 1) % FF.T_GROUPS.length; dev.tuning(); }], [FF.T_GROUPS[(dev.group + 1) % FF.T_GROUPS.length] + ' ›', () => { dev.group = (dev.group + 1) % FF.T_GROUPS.length; dev.tuning(); }],
    ['Reset this page', () => { FF.resetTuning(g); dev.tuning(); }], ['Reset all to defaults', () => { FF.resetTuning(); dev.tuning(); }], ['Copy values', () => dev.copy()], ['Back', () => game.shell.back()]] }); };
dev.copy = () => { const j = FF.tuningJSON(); let ok = false; try { if (navigator.clipboard) { navigator.clipboard.writeText(j); ok = true; } } catch (e) { ok = false; } page('dev-copy', { title: 'Tuning values', text: (ok ? 'Copied to the clipboard. ' : '') + j, actions: [['Back', () => game.shell.back()]] }); };
dev.cheats = () => page('dev-cheats', { title: 'Cheats', rows: CHEATS.map(([k]) => 'devc.' + k).concat(['devc.slowmo']), actions: [['Win now', () => { if (FF.match) { FF.match.finishNow(FF.match.humans[1] && FF.match.humans[1].length ? 1 : 0); game.shell.hide(); } }], ['Lose now', () => { if (FF.match) { FF.match.finishNow(FF.match.humans[1] && FF.match.humans[1].length ? 0 : 1); game.shell.hide(); } }], ['Back', () => game.shell.back()]] });
const SIT = [['4th & goal at the 1', { possession: 'home', los: 99, down: 4, toGo: 1 }], ['3rd & 25', { possession: 'home', los: 40, down: 3, toGo: 25 }], ['Last 0:10, trailing by 4', { possession: 'home', los: 60, down: 1, toGo: 20, clock: 10, quarter: 4, score: [17, 21] }],
  ['A kickoff', { possession: 'home', los: 30, kickoff: true }], ['An onside kick', { possession: 'home', los: 30, kickoff: true, onside: true }], ['A 52-yard field goal', { possession: 'home', los: 65, down: 4, toGo: 15 }],
  ['Overtime', { possession: 'home', los: 25, quarter: 5, clock: 120, score: [21, 21], ot: true }], ['The red zone', { possession: 'home', los: 85, down: 1, toGo: 15 }], ['Backed up at your own 1', { possession: 'home', los: 1, down: 1, toGo: 20 }]];
dev.jump = () => page('dev-jump', { title: 'Jump to', text: 'A situation starts a fresh exhibition there. Or set the numbers, then Apply.', rows: ['devj.score0', 'devj.score1', 'devj.clock', 'devj.down', 'devj.toGo', 'devj.stadium', 'devj.weather'],
  actions: [['Apply to this game', () => dev.applyJump()]].concat(SIT.map(([lab, st]) => [lab, () => dev.situation(st)]),
    FF.data.story.chapters.map(c => ['Chapter ' + c.n + ': ' + c.title, () => { game.shell.hide(); game.resume(); FF.story.active = true; FF.story.play(c.id); }]),
    [['Ch 2 halftime', () => { game.shell.hide(); game.resume(); FF.story.active = true; const ch = FF.data.story.chapters[1]; FF.story.game(ch); game.after(.3, () => { if (FF.match) { FF.match.quarter = 2; FF.match.clock = 0; FF.match.endQuarter(); } }); }]],
    Object.keys(FF.data.story.cutscenes).filter(k => FF.data.story.cutscenes[k].set || FF.data.story.cutscenes[k].cast).map(k => ['Cutscene ' + k, () => { game.shell.hide(); game.resume(); game.go('cutscene', { id: k, then: () => game.go('menu') }); }]),
    FF.data.drills.map(d => ['Drill ' + d.n + ': ' + d.title, () => { game.shell.hide(); game.resume(); game.go('drill', { id: d.id }); }]),
    [['Give a card: random', () => { const m = FF.match; if (m) { const s = (m.humans[1] || []).length ? 1 : 0; if (m.cards[s].length < 3) m.cards[s].push(FF.u.pick(FF.data.cardList, Math.random)); } }], ['Set Blazing on your athlete', () => { const m = FF.match; if (m) { const a = m.on.find(x => x.ctl !== null) || m.on[0]; if (a) m.ots.setHot(a, 6, 'dev'); } }],
      ['Trigger: a Mega Hit on the next tackle', () => { if (FF.match) FF.match.forceMega = true; }], ['Trigger: a fumble on the next hit', () => { if (FF.match) FF.match.forceFumbleNext = true; }], ['Trigger: replay the last play', () => { game.shell.hide(); game.resume(); if (FF.replay.last) FF.replay.play(FF.replay.last, { caption: 'DEV REPLAY' }); }],
      ['Trigger: lights out', () => FF.match && FF.match.ots.trigger('lightsOut', { plays: 3 })], ['Trigger: Mascot Mayhem', () => FF.match && FF.match.ots.trigger('mascot', {})], ['Trigger: the halftime show', () => { if (FF.match) { FF.match.quarter = 2; FF.match.clock = 0; game.shell.hide(); game.resume(); } }],
      ['Trigger: a TD celebration', () => { const m = FF.match; if (m && m.phase !== 'LIVE') { const a = m.on.find(x => x.side === m.poss) || m.on[0]; if (a) { m.giveBall(a, 'dev'); m.go('CELEBRATE', 3); m.lastScoreSide = a.side; m.afterCeleb = () => m.toPlaycall(); bus.emit('td', { side: a.side, team: m.teams[a.side], player: a, yards: 0, m }); } } }],
      ['Trigger: every boss special now', () => { const m = FF.match; if (m) for (const a of m.on) if (a.special) { m.specialsUsed = {}; a.specialT = 1.2; bus.emit('special', { who: a, kind: a.special, m }); } }],
      ['Back', () => game.shell.back()]]) });
dev.applyJump = () => { const m = FF.match; if (!m) return; m.score = [JS.score0, JS.score1]; m.clock = JS.clock; m.down = JS.down; m.toGo = JS.toGo; m.lineToGain = m.los + m.dir(m.poss) * JS.toGo * YD; game.shell.hide(); };
dev.situation = st => {
  game.shell.hide(); game.resume();
  const spec = { mode: 'exhibition', home: 'fiascos', away: 'mudhogs', humans: { 0: [0], 1: [] }, stadium: JS.stadium || 'tumbleweed', weather: JS.weather || 'stadium', start: st, quarter: st.quarter || 1, clock: st.clock, score: st.score, ot: true };
  game.go('match', { spec, onStart: m => { if (st.onside) m.forceCall = { 0: { play: 'ko_onside' } }; if (st.ot) { m.ot = true; } } }, { fade: 0 });
};
/* ---- the Play Lab: n headless plays of a matchup from midfield, 1st & 20; stats; a sweep over every defense ---- */
dev.playLab = (off, def, n = 30, o = {}) => {
  const keep = FF.rng.sim, keepFast = FF.fast, keepMatch = FF.match; FF.fast = true;
  const R = { plays: 0, yards: 0, comp: 0, att: 0, sacks: 0, ints: 0, fumbles: 0, tds: 0, time: 0, maxTime: 0, stuck: 0 };
  try {
    for (let i = 0; i < n; i++) {
      const m = new FF.Match({ home: o.home || LAB.home || 'fiascos', away: o.away || LAB.away || 'mudhogs', seed: (o.seed || 1) * 1000 + i, mode: 'lab', difficulty: o.difficulty || 'pro', start: { possession: 0, los: 50, down: 1, toGo: 20 } });
      m.forceCall = { 0: { play: off, flip: i % 2 === 1 }, 1: { play: def, flip: false } }; m.fastCalls = true;
      let k = 0; while (m.phase !== 'LIVE' && k < 6000) { m.stepSim(1 / 120); k++; }
      let t = 0, idle = 0; while (m.phase === 'LIVE' && t < 30) { m.stepSim(1 / 120); t += 1 / 120; const c = m.ball.holder; if (c && Math.hypot(c.vx, c.vy) < 5 && m.ball.state === 'held') idle += 1 / 120; else idle = 0; if (idle > 3) { R.stuck++; break; } }
      const pl = m.play; R.plays++; R.time += t; R.maxTime = Math.max(R.maxTime, t); if (t > 25) R.stuck++;
      const why = pl.result && pl.result.why, gain = why === 'td' ? (m.goalX(0) - pl.losX) * m.dir(0) / YD : pl.gain || 0;
      R.yards += pl.turnover || m.poss !== 0 ? Math.min(0, gain) : gain; if (pl.passer) R.att++; if (pl.completed) R.comp++; if (pl.sack) R.sacks++; if (pl.intBy) R.ints++; if (pl.fumbled) R.fumbles++; if (why === 'td') R.tds++;
      if (m.ots) m.ots.dispose();
    }
  } finally { FF.rng.sim = keep; FF.fast = keepFast; FF.match = keepMatch; }
  return { avgYards: +(R.yards / R.plays).toFixed(2), completion: R.att ? +(R.comp / R.att).toFixed(2) : null, sacks: R.sacks, ints: R.ints, fumbles: R.fumbles, tds: R.tds, avgTime: +(R.time / R.plays).toFixed(2), maxTime: +R.maxTime.toFixed(2), stuck: R.stuck, n: R.plays };
};
dev.lab = () => page('dev-lab', { title: 'Play Lab', text: dev.labOut || 'Choose a matchup, then run it headless: n plays from midfield, 1st & 20, both sides CPU.', rows: ['devl.off', 'devl.def', 'devl.n', 'devl.home', 'devl.away'],
  actions: [['Run headless', () => { const r = dev.playLab(LAB.off, LAB.def, LAB.n); dev.labOut = FF.data.plays[LAB.off].name + ' vs ' + FF.data.plays[LAB.def].name + ': ' + r.avgYards + ' yd a play, completion ' + (r.completion === null ? '-' : Math.round(r.completion * 100) + '%') + ', sacks ' + r.sacks + ', INTs ' + r.ints + ', fumbles ' + r.fumbles + ', TDs ' + r.tds + ', ' + r.avgTime + ' s a play (max ' + r.maxTime + '), stuck ' + r.stuck + '.'; dev.lab(); }],
    ['Sweep every defense', () => { const parts = FF.data.defPlays.map(d => { const r = dev.playLab(LAB.off, d.id, Math.min(LAB.n, 20)); return d.name + ' ' + r.avgYards; }); dev.labOut = FF.data.plays[LAB.off].name + ' — yards a play by defense: ' + parts.join(' · '); dev.lab(); }],
    ['Run on the field', () => { game.shell.hide(); game.resume(); const spec = { mode: 'exhibition', home: LAB.home || 'fiascos', away: LAB.away || 'mudhogs', humans: { 0: [], 1: [] }, start: { possession: 0, los: 50 } }; game.go('match', { spec, onStart: m => { m.forceCall = { 0: { play: LAB.off }, 1: { play: LAB.def } }; m.fastCalls = true; m.labLoop = true; } }, { fade: 0 }); S().set('devo.ai', true); }],
    ['Back', () => game.shell.back()]] });
dev.overlaysPage = () => page('dev-over', { title: 'Overlays', rows: OVER.map(([k]) => 'devo.' + k), actions: [['Back', () => game.shell.back()]] });
dev.tools = () => page('dev-tools', { title: 'Tools', text: 'Frame step: the sim waits; ✕ / Space steps 1/120 s, △ / I steps 0.1 s. Hotkeys while Dev mode is on: ` overlays, [ and ] game speed, \\ one step.',
  actions: [[dev.frameStep ? 'Frame step: ON' : 'Frame step: off', () => { dev.frameStep = !dev.frameStep; dev.tools(); }], [FF.cam.free ? 'Free camera: ON' : 'Free camera: off', () => { FF.cam.freeOn = !FF.cam.freeOn; game.cam.free = FF.cam.freeOn ? { speed: 400 } : null; dev.tools(); }],
    [FF.hud.show ? 'HUD: on' : 'HUD: OFF', () => { S().set('devo.hud', !FF.hud.show); dev.tools(); }], [FF.fx.on ? 'Effects: on' : 'Effects: OFF', () => { FF.fx.on = !FF.fx.on; dev.tools(); }],
    ['Reseed the RNG', () => { FF.rng.seed(Math.floor(Math.random() * 1e9)); game.note('RESEEDED'); }],
    ['Unlock everything (chapters, cards, Big Heads)', () => { const st = FF.story.state(); for (const c of FF.data.story.chapters) { st.done[c.id] = true; st.stars[c.id] = st.stars[c.id] || 1; } st.collection = FF.data.cardList.slice(); E.store.set('ff:bigHeads', true); FF.story.save(); game.note('ALL UNLOCKED'); }],
    ['Reset save data', () => page('dev-reset', { title: 'Reset save data?', text: 'The story, the records and the drill times go. Settings stay.', actions: [['Keep it', () => game.shell.back()], ['Reset', () => { try { game.saves.erase('auto'); for (let i = 0; i < 3; i++) game.saves.erase(i); } catch (e) { /* none */ } E.store.set('ff:records', {}); E.store.set('ff:drills', {}); E.store.set('ff:bigHeads', false); game.note('SAVE DATA RESET'); game.shell.back(); }]] })],
    ['Save this session (recorded pages: ?record=1)', () => { if (E.session && E.session.recording) E.session.share(); else game.note('OPEN THE PAGE WITH ?record=1 TO RECORD'); }],
    ['Back', () => game.shell.back()]] });
/* ---- hotkeys and frame step ---- */
if (typeof addEventListener === 'function') addEventListener('keydown', e => {
  if (!dev.unlockHotkeys || e.repeat) return;
  if (e.code === 'Backquote') { const v = !S()['devo.ai']; S().set('devo.ai', v); S().set('devo.fps', v); }
  if (e.code === 'BracketLeft') { game.timeScale = Math.max(.125, game.timeScale / 2); game.note('SPEED ' + game.timeScale + 'x'); }
  if (e.code === 'BracketRight') { game.timeScale = Math.min(4, game.timeScale * 2); game.note('SPEED ' + game.timeScale + 'x'); }
  if (e.code === 'Backslash') dev.stepOnce = 1 / 120;
});
/* ---- the overlays, drawn by the match scene ---- */
dev.drawOverlay = (g, r, mv) => {
  const m = mv.m, o = dev.overlays;
  if (o.fps) { const ev = FF.bus.log.slice(-12).map(e => e.ev).join(' '); px.rect(g, 0, r.H - 40, r.W, 40, '#000000a0'); E.font.text(g, 'FPS ' + (game.fps ? Math.round(game.fps) : '-') + '  STEP ' + m.step + '  PHASE ' + m.phase + '  T ' + game.timeScale + 'x', 4, r.H - 38, '#9af09a', { font: 'tiny', outline: false }); E.font.text(g, ev, 4, r.H - 30, '#c8c4e0', { font: 'tiny', outline: false }); const I = game.input, mvv = I.move(); E.font.text(g, 'P1 ' + I.lastDevice + ' STICK ' + mvv.map(v => v.toFixed(2)).join(',') + ' HELD ' + ['b1', 'b2', 'b3', 'b4', 'turbo', 'lb', 'rb'].filter(a => I.down(a)).join(' '), 4, r.H - 22, '#c8c4e0', { font: 'tiny', outline: false }); }
};
dev.drawWorld = (r, mv) => {
  const m = mv.m, o = dev.overlays; if (!o.ai && !o.hitbox && !o.ball) return;
  for (const a of m.on) {
    if (o.ai && a.brain) { r.queue(a.x, a.y, 60, g => { const [x, y] = r.w(a.x, a.y, 60); E.font.text(g, a.brain.beh + (a.engaged ? '*' : ''), Math.round(x), Math.round(y) - 24, a.side ? '#ff9a8a' : '#8ac8ff', { font: 'tiny', align: 'center', outline: '#000' }); }, { emissive: true, bias: 80 });
      if (a.brain.zone) { const z = a.brain.zone; r.decal(g => { for (let k = 0; k < 24; k++) { const t = k / 24 * Math.PI * 2, [x, y] = r.w(z.x + Math.cos(t) * z.r, z.y + Math.sin(t) * z.r, 0); px.dot(g, x, y, '#5a8aff'); } }); }
      if (a.brain.man) { const t = a.brain.man; r.decal(g => { const [x0, y0] = r.w(a.x, a.y, 0), [x1, y1] = r.w(t.x, t.y, 0); px.line(g, x0, y0, x1, y1, '#ffb0a0'); }); }
      if (a.brain.path) r.decal(g => { let [x0, y0] = r.w(a.x, a.y, 0); for (const p of a.brain.path) { const [x1, y1] = r.w(p.x, p.y, 0); px.line(g, x0, y0, x1, y1, '#ffffff'); x0 = x1; y0 = y1; } }); }
    if (o.hitbox) { const rig = mv.rigs[a.id]; if (rig) rig.debug(r); r.decal(() => r.groundRing(a.x, a.y, a.rad, '#ff3af0', 1)); }
  }
  if (o.ai && m.blocks) for (const p of m.blocks) r.queue(p.b.x, p.b.y, 30, g => { const [x, y] = r.w((p.b.x + p.r.x) / 2, (p.b.y + p.r.y) / 2, 30); E.font.text(g, (p.shed - p.t).toFixed(1), Math.round(x), Math.round(y), '#ffd84a', { font: 'tiny', align: 'center', outline: '#000' }); }, { emissive: true });
  if (o.ball) { const b = m.ball; if (b.to) r.decal(g => { const [x0, y0] = r.w(b.x, b.y, 0), [x1, y1] = r.w(b.to.x, b.to.y, 0); px.line(g, x0, y0, x1, y1, '#ff4a3a'); }); const c = FF.cam.pos; r.decal(g => { const [x, y] = r.w(c.x, c.y, 0); px.rect(g, x - 3, y, 7, 1, '#3af0f0'); px.rect(g, x, y - 3, 1, 7, '#3af0f0'); }); }
};
})();
