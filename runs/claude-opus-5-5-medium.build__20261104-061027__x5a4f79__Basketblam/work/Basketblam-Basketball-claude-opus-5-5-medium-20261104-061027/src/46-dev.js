/* DEV MODE (from the pause menu's Dev Mode, or #dev): a panel docked on the right third of the screen while the match
 * keeps running on autopilot. Tabs: TUNING (every important number as a live slider, reset one or all, save, copy as
 * JSON), CHEATS, MATCH, SCENES, DEBUG (overlays), TIME, CAMERA. Pad, keys and mouse all drive it. */
const DEV = { tab: 0, row: 0, group: 0, scroll: 0, overlays: { any: false }, speed: 1, freeze: false, step: false, slowDunks: true, unlockAll: false, confirm: null, note: '', noteT: 0, saved: null };
const DEV_TABS = ['TUNING', 'CHEATS', 'MATCH', 'SCENES', 'DEBUG', 'TIME', 'CAMERA'];
const GROUPS = [...new Set(Object.values(TUNING).map(t => t.group))];
function openDev() {
  if (HUB) return;
  if (!S.match || !(game.scene && game.scene.isMatch) || S.mode === 'attract') { go('match', Object.assign(exhibitionDefault(), { onEnter: () => { S.devOpen = true; devAutopilot(true); } })); return; }
  S.devOpen = true; devAutopilot(true); game.players.forEach(I => I.consumeAll()); emit('devOpen', {});
}
/** before a scene jump: the panel closes and time runs normally again */
function devJump() { closeDev(); DEV.freeze = false; DEV.speed = 1; game.timeScale = 1; }
function closeDev() { S.devOpen = false; devAutopilot(false); game.players.forEach(I => I.consumeAll()); emit('devClose', {}); }
/** while the panel has the focus, the humans' slots are played by CPU brains (and given back on close) */
function devAutopilot(on) {
  for (const p of S.players) {
    if (on && p.human && p.src.kind === 'local') { p._src = p.src; p.src = CpuSource(); if (!p.brain) p.brain = newBrain(p); }
    if (!on && p._src) { p.src = p._src; p._src = null; }
  }
}
const devNote = s => { DEV.note = s; DEV.noteT = 2.5; };
const onOff = v => v ? 'ON' : 'OFF';
function cheatRow(label, key, val = true) { return { label, value: () => onOff(S.cheats[key] === val), act: () => { S.cheats[key] = S.cheats[key] === val ? false : val; if (S.match) S.match.cfg.starred = true; } }; }
function devRows() {
  const m = S.match, tab = DEV_TABS[DEV.tab];
  if (tab === 'TUNING') {
    const grp = GROUPS[DEV.group], keys = Object.keys(TUNING).filter(k => TUNING[k].group === grp);
    return [{ label: 'GROUP', value: () => grp, side: d => { DEV.group = (DEV.group + d + GROUPS.length) % GROUPS.length; DEV.scroll = 0; } }]
      .concat(keys.map(k => { const t = TUNING[k]; return { label: t.label, key: k, value: () => (t.v !== t.def ? '• ' : '') + (+t.v.toFixed(3)), help: t.help + ' (default ' + t.def + ')', side: d => setTune(k, t.v + d * t.step), reset: () => setTune(k, t.def), slider: t }; }))
      .concat([{ label: 'RESET ALL TO DEFAULTS', act: () => { resetTuning(); devNote('EVERY VALUE IS BACK TO ITS DEFAULT'); } },
        { label: 'SAVE AS MY DEFAULTS', act: () => { const o = {}; for (const [k, t] of Object.entries(TUNING)) if (t.v !== t.def) o[k] = t.v; store.set('bb:tuning', o); devNote('SAVED ' + Object.keys(o).length + ' CHANGED VALUES'); } },
        { label: 'COPY AS JSON', act: () => { const o = {}; for (const [k, t] of Object.entries(TUNING)) o[k] = t.v; const s = JSON.stringify(o); DEV.saved = s; try { navigator.clipboard.writeText(s); devNote('COPIED TO THE CLIPBOARD'); } catch (e) { devNote('JSON IN THE CONSOLE'); } console.log(s); } }]);
  }
  if (tab === 'CHEATS') return [
    { label: 'INFINITE TURBO: P1 TEAM', value: () => onOff(S.cheats.turbo0), act: () => { S.cheats.turbo0 = !S.cheats.turbo0; } },
    { label: 'INFINITE TURBO: EVERYONE', value: () => onOff(S.cheats.turboAll), act: () => { S.cheats.turboAll = !S.cheats.turboAll; } },
    { label: 'ALWAYS SUPERNOVA: HOME', value: () => onOff(S.players.filter(p => p.team === 0).every(p => p.nova)), act: () => S.players.filter(p => p.team === 0).forEach(p => p.nova ? novaOff(p) : novaOn(p)) },
    { label: 'ALWAYS SUPERNOVA: AWAY', value: () => onOff(S.players.filter(p => p.team === 1).every(p => p.nova)), act: () => S.players.filter(p => p.team === 1).forEach(p => p.nova ? novaOff(p) : novaOn(p)) },
    cheatRow('CPU PASSIVE (AWAY)', 'cpuPassive'),
    { label: 'SHOTS', value: () => (S.cheats.shots || 'normal').toUpperCase(), side: d => { const o = [null, 'in', 'out'], k = o.indexOf(S.cheats.shots || null); S.cheats.shots = o[(k + d + 3) % 3]; } },
    cheatRow('UNBLOCKABLE DUNKS', 'unblockable'), cheatRow('ONE-SHOVE KNOCKDOWNS', 'oneShove'),
    { label: 'BIG HEADS', value: () => onOff(S.cheats.bigheads), act: () => { S.cheats.bigheads = !S.cheats.bigheads; for (const p of S.players) setBigHeads(p.rig, S.cheats.bigheads); } },
    cheatRow('POWER-UPS EVERY 5 S', 'puFast'),
    { label: 'TWISTS', value: () => onOff(m && m.twistOn), act: () => { if (!m) return; m.twistOn = !m.twistOn; setupTwist(); } },
    cheatRow('FREEZE GAME CLOCK', 'freezeClock'), cheatRow('FREEZE SHOT CLOCK', 'freezeShot'),
    { label: 'UNLOCK EVERYTHING', value: () => onOff(DEV.unlockAll), act: () => { DEV.unlockAll = !DEV.unlockAll; S.progress.unlocked = Object.assign(S.progress.unlocked, { teams: true, bigHeads: true, secrets: true }); saveProgress(); } },
    { label: DEV.confirm === 'reset' ? 'REALLY RESET? CONFIRM AGAIN' : 'RESET SAVE DATA', act: () => { if (DEV.confirm === 'reset') { DEV.confirm = null; store.set('bb:progress', {}); store.set('bb:hall', null); store.set('bb:tuning', {}); loadProgress(); devNote('SAVE DATA RESET'); } else DEV.confirm = 'reset'; } }
  ];
  if (tab === 'MATCH') return !m ? [] : [
    { label: 'HOME SCORE', value: () => m.score[0], side: d => { m.score[0] = Math.max(0, m.score[0] + d); } },
    { label: 'AWAY SCORE', value: () => m.score[1], side: d => { m.score[1] = Math.max(0, m.score[1] + d); } },
    { label: 'QUARTER', value: () => m.quarter, side: d => { m.quarter = clamp(m.quarter + d, 1, m.periods); } },
    { label: 'GAME CLOCK', value: () => fmtClock(m.clock), side: d => { m.clock = Math.max(1, m.clock + d * 10); } },
    { label: 'SHOT CLOCK', value: () => Math.ceil(m.shotClock), side: d => { m.shotClock = clamp(m.shotClock + d, 1, 30); } },
    { label: 'GIVE BALL TO', value: () => S.players[DEV.slot || 0].name, side: d => { DEV.slot = ((DEV.slot || 0) + d + 4) % 4; }, act: () => { giveBall(S.players[DEV.slot || 0], 'give'); m.phase = 'live'; } },
    { label: 'SUPERNOVA FOR', value: () => S.players[DEV.slot || 0].name, side: d => { DEV.slot = ((DEV.slot || 0) + d + 4) % 4; }, act: () => novaOn(S.players[DEV.slot || 0]) },
    { label: 'FORCE A TIP-OFF', act: () => tipoffSetup() },
    { label: 'END THE QUARTER', act: () => { m.clock = .05; } },
    { label: 'END GAME: HOME WINS', act: () => { m.score[0] = m.score[1] + 2; endGame(); } },
    { label: 'END GAME: AWAY WINS', act: () => { m.score[1] = m.score[0] + 2; endGame(); } },
    { label: 'SHATTER THE NEXT DUNK', act: () => { m.forceShatter = true; m.shatters = Math.min(m.shatters, 1); devNote('THE NEXT DUNK SHATTERS'); } },
    { label: 'SPAWN POWER-UP', value: () => get('powerup', POWERUPS[DEV.pu || 0]).name, side: d => { DEV.pu = ((DEV.pu || 0) + d + 6) % 6; }, act: () => { const p = S.players[0]; spawnPowerup(POWERUPS[DEV.pu || 0], clamp(p.x + 24, X0 + 10, X1 - 10), p.y); } },
    { label: 'PLACE THE JACKPOT SPOT', act: () => moveJackpot() },
    { label: 'TRIGGER TWIST', value: () => ['GUST', 'OIL SLICKS', 'ERUPTION', 'VENT PUFF', 'OVERCLOCK', 'REBOOT'][DEV.tw || 0], side: d => { DEV.tw = ((DEV.tw || 0) + d + 6) % 6; }, act: () => devTwist(DEV.tw || 0) },
    { label: 'SLOT CPU / HUMAN', value: () => S.players[DEV.slot || 0].name + ': ' + ((S.players[DEV.slot || 0]._src || S.players[DEV.slot || 0].src).kind === 'local' ? 'HUMAN' : 'CPU'), side: d => { DEV.slot = ((DEV.slot || 0) + d + 4) % 4; }, act: () => { const p = S.players[DEV.slot || 0]; if (p.human) { const keep = p.human; p.human = null; p._keep = keep; p.src = CpuSource(); p._src = null; } else { p.human = p._keep || game.input; p._src = LocalSource(p.human); p.tag = p.human.name; p.tagColor = p.human.color; } } }
  ];
  if (tab === 'SCENES') return [
    ...COURTS.map(c => ({ label: 'PLAY AT ' + get('court', c).name, act: () => { devJump(); go('match', Object.assign(exhibitionDefault(), { court: c, teams: c === 'dome' ? [{ id: 'hightops' }, { id: 'blambots' }] : [{ id: get('court', c).home }, { id: c === 'skybox' ? 'breakers' : 'hightops' }], boss: c === 'dome' })); } })),
    { label: 'TOUR STOP', value: () => String((DEV.stop || 0) + 1), side: d => { DEV.stop = ((DEV.stop || 0) + d + 4) % 4; }, act: () => { devJump(); S.progress.tour = { team: 'hightops', pick: 0, stop: DEV.stop || 0, score: 0, cheats: true }; saveProgress(); go('tourmap'); } },
    { label: 'STORY BEAT', value: () => Object.keys(BEATS)[DEV.beat || 0].toUpperCase(), side: d => { const n = Object.keys(BEATS).length; DEV.beat = ((DEV.beat || 0) + d + n) % n; }, act: () => { devJump(); playBeat(Object.keys(BEATS)[DEV.beat || 0], () => go('menu')); } },
    { label: 'CREDITS', act: () => { devJump(); go('credits', { then: () => go('menu') }); } },
    { label: 'RESULTS', act: () => { devJump(); endGame(); go('results', { cfg: S.match.cfg }); } },
    { label: 'ATTRACT SEGMENT', value: () => String((DEV.seg || 0) + 1), side: d => { DEV.seg = ((DEV.seg || 0) + d + 5) % 5; }, act: () => { devJump(); go('attract', { from: 'menu', segment: DEV.seg || 0 }); } },
    { label: 'CAMP LESSON', value: () => String((DEV.lesson || 0) + 1), side: d => { DEV.lesson = ((DEV.lesson || 0) + d + 10) % 10; }, act: () => { devJump(); startLesson(DEV.lesson || 0); } },
    { label: 'ANIMATION LAB', act: () => { devJump(); go('animlab'); } },
    { label: 'SHOOTAROUND (RIM PHYSICS)', act: () => { devJump(); go('shootaround'); } },
    { label: 'MAIN MENU', act: () => { devJump(); go('menu'); } }
  ];
  if (tab === 'DEBUG') return ['hitboxes', 'intents', 'shot', 'path', 'twists', 'events', 'snapshot'].map(k => ({ label: { hitboxes: 'HITBOXES', intents: 'AI INTENTS', shot: 'SHOT CHANCE', path: 'BALL PATH', twists: 'TWIST AREAS', events: 'EVENT LOG', snapshot: 'STATE SNAPSHOT' }[k], value: () => onOff(DEV.overlays[k]), act: () => { DEV.overlays[k] = !DEV.overlays[k]; DEV.overlays.any = Object.keys(DEV.overlays).some(q => q !== 'any' && DEV.overlays[q]); } }));
  if (tab === 'TIME') return [
    { label: 'GAME SPEED', value: () => DEV.speed + 'x', side: d => { const o = [.1, .25, .5, 1, 2], k = o.indexOf(DEV.speed); DEV.speed = o[clamp(k + d, 0, 4)]; } },
    { label: 'FREEZE', value: () => onOff(DEV.freeze), act: () => { DEV.freeze = !DEV.freeze; } },
    { label: 'STEP ONE FRAME', act: () => { DEV.freeze = true; DEV.step = true; } },
    { label: 'SLOW MOTION ON DUNKS', value: () => onOff(TUNING.dunkSlowMo.v < 1), act: () => setTune('dunkSlowMo', TUNING.dunkSlowMo.v < 1 ? 1 : TUNING.dunkSlowMo.def) }
  ];
  return [
    { label: 'VIEW', value: () => game.view.id === HIGH ? 'HIGH' : 'BROADCAST', act: () => game.settings.set('camera', setting('camera') === 'high' ? 'broadcast' : 'high') },
    { label: 'ZOOM', value: () => (game.settings.zoom || 1).toFixed(2), side: d => game.settings.set('zoom', clamp((game.settings.zoom || 1) + d * .1, .8, 1.4)) },
    { label: 'FREE CAMERA', value: () => onOff(!!game.cam.free), act: () => { game.cam.free = game.cam.free ? null : { keys: true, edge: 0, speed: 300 }; } },
    { label: 'RESET CAMERA', act: () => { game.cam.free = null; game.settings.set('zoom', 1); game.resetCamera(); } }
  ];
}
function devTwist(k) {
  const m = S.match; if (!m) return;
  const want = ['wind', 'oil', 'eruption', 'eruption', 'boss', 'boss'][k];
  if (!m.twist || m.twist.kind !== want) { m.twist = { kind: want, next: 0, bombs: [], slicks: null, gustT: 0, ventT: 0, ventOn: false, w: 0 }; if (want === 'oil') setupTwistQuarter(); }
  if (k === 0) m.twist.next = 0; if (k === 1) setupTwistQuarter(); if (k === 2) m.twist.next = 0; if (k === 3) m.twist.ventT = 3.01;
  if (k === 4) { m.overclockDone = false; m.overclock = 0; overclock(); }
  if (k === 5) { const bot = S.players.find(p => p.def.team === 'blambots'); if (bot) { bot.reboot = 3; emit('reboot', { slot: bot.slot, name: bot.name }); } else devNote('NO BLAMBOTS ON THE COURT'); }
}
/** the panel's input (called from the match scene while open) */
function devUpdate(dt) {
  DEV.noteT = Math.max(0, DEV.noteT - dt);
  const rows = devRows(), I = game.input;
  for (const P0 of game.players) {
    if (P0.pressed('pause') || P0.pressed('cancel')) { closeDev(); return; }
    if (P0.pressed('devNext')) { DEV.tab = (DEV.tab + 1) % DEV_TABS.length; DEV.row = 0; DEV.scroll = 0; A.sfx('select'); }
    if (P0.pressed('devPrev')) { DEV.tab = (DEV.tab + DEV_TABS.length - 1) % DEV_TABS.length; DEV.row = 0; DEV.scroll = 0; A.sfx('select'); }
    if (P0.repeat('up', .3, .08)) DEV.row = (DEV.row + rows.length - 1) % Math.max(1, rows.length);
    if (P0.repeat('down', .3, .08)) DEV.row = (DEV.row + 1) % Math.max(1, rows.length);
    const r = rows[DEV.row]; if (!r) continue;
    const d = P0.repeat('left', .3, .06) ? -1 : P0.repeat('right', .3, .06) ? 1 : 0;
    if (d && r.side) { r.side(d); A.sfx('select'); }
    if (P0.pressed('confirm') && r.act) { r.act(); A.sfx('confirm'); }
    if (P0.pressed('oop') && r.reset) { r.reset(); A.sfx('cancel'); }
  }
  // the mouse: hover moves the focus; a click on a row acts, on its left or right half turns a slider
  const ptr = I.pointer && I.pointer(), cl = I.clicked && I.clicked();
  if (ptr && DEV.boxes) DEV.boxes.forEach((b, k) => { if (b && hitBox(ptr, b) && DEV.row !== k) DEV.row = k; });
  if (cl && DEV.tabBoxes) DEV.tabBoxes.forEach((b, k) => { if (hitBox(cl, b)) { DEV.tab = k; DEV.row = 0; } });
  if (cl && DEV.boxes) DEV.boxes.forEach((b, k) => { if (b && hitBox(cl, b)) { const r = rows[k]; if (r.side && !r.act) r.side(cl[0] < b[0] + b[2] * .6 ? -1 : 1); else if (r.act) r.act(); A.sfx('confirm'); } });
  if (DEV.row < DEV.scroll) DEV.scroll = DEV.row; if (DEV.row >= DEV.scroll + 9) DEV.scroll = DEV.row - 8;
}
function drawDev(g, r) {
  if (DEV.overlays.any) drawOverlays(g, r);
  if (!S.devOpen) return;
  const w = Math.max(150, Math.round(r.W / 3)), x = r.W - w, y = 40, h = r.H - 46;
  E.ui.box(g, x, y, w, h, { bg: ['#140c24', '#0a0612'], border: UI.accent2, alpha: .93 });
  txt(g, 'DEV MODE', x + 6, y + 4, UI.accent2, 1);
  promptLine(g, '{devPrev}{devNext} TABS', x + w - 4, y + 3, game.input, { align: 'right', color: UI.dim });
  DEV.tabBoxes = [];
  const tbw = Math.floor((w - 8) / 4);
  DEV_TABS.forEach((t, k) => { const tx = x + 4 + (k % 4) * tbw, ty = y + 15 + Math.floor(k / 4) * 11; DEV.tabBoxes.push([tx, ty, tbw - 2, 10]); E.ui.box(g, tx, ty, tbw - 2, 10, { bg: k === DEV.tab ? UI.accent : '#2a1e44', border: k === DEV.tab ? '#ffffff' : UI.line, gradient: false }); txt(g, t, tx + (tbw - 2) / 2, ty + 1, '#ffffff', 1, 'center', { outline: false }); });
  const rows = devRows(); DEV.boxes = [];
  rows.slice(DEV.scroll, DEV.scroll + 9).forEach((row, i) => {
    const k = i + DEV.scroll, ry = y + 42 + i * 17, sel = k === DEV.row; DEV.boxes[k] = [x + 4, ry, w - 8, 15];
    E.ui.box(g, x + 4, ry, w - 8, 15, { bg: sel ? [UI.accent, E.shade(UI.accent, -.4)] : '#1e1436', border: sel ? '#ffffff' : '#2a2040', gradient: false });
    txt(g, (sel ? '▸' : '') + row.label, x + 7, ry + 4, '#ffffff', 1, 'left', { outline: false });
    if (row.value) txt(g, (row.side ? '←' : '') + row.value() + (row.side ? ' →' : ''), x + w - 7, ry + 4, sel ? '#ffffff' : UI.gold, 1, 'right', { outline: false });
    if (row.slider) { const t = row.slider, u = (t.v - t.min) / (t.max - t.min), du = (t.def - t.min) / (t.max - t.min); px.rect(g, x + 7, ry + 12, w - 14, 2, '#3a2a5a'); px.rect(g, x + 7, ry + 12, Math.round((w - 14) * u), 2, UI.accent2); px.rect(g, x + 7 + Math.round((w - 14) * du), ry + 11, 1, 4, '#ffffff'); }
  });
  if (DEV.scroll + 9 < rows.length) txt(g, '↓ ' + (rows.length - DEV.scroll - 9) + ' MORE', x + w / 2, y + 42 + 9 * 17, UI.dim, 1, 'center');
  const cur = rows[DEV.row];
  if (cur && cur.help) E.font.wrap(cur.help, w - 12, {}).slice(0, 2).forEach((ln, i) => txt(g, ln, x + 6, y + h - 46 + i * 9, UI.dim, 1, 'left', { outline: false }));
  promptLine(g, '{confirm} DO {oop} RESET {cancel} CLOSE', x + w / 2, y + h - 12, game.input, { align: 'center' });
  if (DEV.noteT > 0) txt(g, DEV.note, x + w / 2, y + h - 26, UI.good, 1, 'center');
}
function drawOverlays(g, r) {
  const m = S.match, b = S.ball; if (!m) return;
  if (DEV.overlays.hitboxes) {
    for (const p of S.players) { const pts = r.groundPts(p.x, p.y, 6, 12, 0); for (let k = 0; k < pts.length; k++) px.line(g, pts[k][0], pts[k][1], pts[(k + 1) % pts.length][0], pts[(k + 1) % pts.length][1], '#5aff8a', 1); const [hx, hy] = r.w(p.x, p.y, handsZ(p)); px.rect(g, hx - 1, hy - 1, 3, 3, '#ff5a5a'); const st = r.groundPts(p.x, p.y, tune('stealReach'), 16, 0); for (let k = 0; k < st.length; k += 2) px.dot(g, st[k][0], st[k][1], '#ffd23a'); }
    for (const h of HOOPS) { const pts = r.groundPts(h.x, h.y, RIM_R, 16, RIM_Z); for (let k = 0; k < pts.length; k++) px.line(g, pts[k][0], pts[k][1], pts[(k + 1) % pts.length][0], pts[(k + 1) % pts.length][1], '#5ae8ff', 1); const a = r.w(h.board, BOARD.y0, BOARD.z0), c = r.w(h.board, BOARD.y1, BOARD.z1); px.line(g, a[0], a[1], c[0], c[1], '#5ae8ff', 1); }
    if (b) { const [bx, by] = r.w(b.x, b.y, b.z); px.line(g, bx - 4, by, bx + 4, by, '#ffffff', 1); px.line(g, bx, by - 4, bx, by + 4, '#ffffff', 1); }
  }
  if (DEV.overlays.intents) for (const p of S.players) { const [x, y] = r.w(p.x, p.y, p.z + reach(p) + 18); txt(g, (p.src.kind === 'cpu' ? p.intent : 'HUMAN') || '-', x, y, '#ffffff', 1, 'center', { font: 'tiny' }); }
  if (DEV.overlays.shot && S.lastShot) { const s = S.lastShot; txt(g, 'LAST SHOT ' + s.name + ': ' + Math.round(s.chance * 100) + '% ' + s.rel.toUpperCase() + (s.three ? ' 3PT' : '') + ' CONTEST x' + s.contest.toFixed(2) + (s.made ? ' MADE' : ' MISSED'), 6, 42, '#ffffff', 1); const o = owner(); if (o) { const c = shotChance(o, 'good'); txt(g, o.name + ' NOW: ' + Math.round(c.p * 100) + '%', 6, 52, UI.gold, 1); } }
  if (DEV.overlays.path && b && !b.owner) { let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz; const gg = tune('ballGravity'); for (let k = 0; k < 40; k++) { vz -= gg / 60; x += vx / 60; y += vy / 60; z += vz / 60; if (z < 0) break; const [sx, sy] = r.w(x, y, z); px.dot(g, sx, sy, '#ffffff'); } }
  if (DEV.overlays.twists && m.twist) { if (m.twist.slicks) for (const s of m.twist.slicks) { const [sx, sy] = r.w(s.x, s.y, 0); txt(g, 'SLICK', sx, sy, '#ff5ad8', 1, 'center'); } for (const v of VENTS) { const [sx, sy] = r.w(v.x, v.y, 0); txt(g, 'VENT', sx, sy, '#ff7a1a', 1, 'center'); } if (m.jackpot) { const [sx, sy] = r.w(m.jackpot.x, m.jackpot.y, 0); txt(g, 'JACKPOT ' + Math.ceil(m.jackpot.t), sx, sy, UI.gold, 1, 'center'); } }
  if (DEV.overlays.events) S.events.slice(-10).forEach((e, i) => txt(g, e.t + ' ' + e.type + (e.slot !== undefined && e.slot >= 0 ? ' ' + nameOf(e.slot) : ''), 6, 70 + i * 9, UI.accent2, 1, 'left', { font: 'tiny' }));
  if (DEV.overlays.snapshot) { const s = JSON.stringify(game.debug.snapshot()).slice(0, 600); E.font.wrap(s, r.W * .6, { font: 'tiny' }).slice(0, 14).forEach((ln, i) => txt(g, ln, 6, r.H - 140 + i * 7, '#c8c8d0', 1, 'left', { font: 'tiny', outline: false })); }
}

/* ---- the animation lab: every dunk, celebration and taunt on a rig, at full or slow speed ---- */
const LAB = { clip: 0, slow: false, t: 0, player: 0 };
const LAB_CLIPS = () => all('dunk').map(d => ['dunk', d.id]).concat(Object.keys(MOVES).map(k => ['move', k]), [['dribble'], ['jumpshot'], ['block'], ['shove'], ['knocked'], ['defense']]);
const LAB_PLAYERS = () => all('player').map(p => p.id);
SCENES.animlab = menuScene({
  enter() { S.scene = 'animlab'; LAB.t = 0; LAB.rig = null; LAB.ball = newBall(); },
  onBack() { go('menu'); },
  update(dt) {
    const clips = LAB_CLIPS(), ids = LAB_PLAYERS();
    for (const I of game.players) {
      if (I.pressed('right')) { LAB.clip = (LAB.clip + 1) % clips.length; LAB.t = 0; } if (I.pressed('left')) { LAB.clip = (LAB.clip + clips.length - 1) % clips.length; LAB.t = 0; }
      if (I.pressed('down')) { LAB.player = (LAB.player + 1) % ids.length; LAB.rig = null; } if (I.pressed('up')) { LAB.player = (LAB.player + ids.length - 1) % ids.length; LAB.rig = null; }
      if (I.pressed('confirm')) LAB.slow = !LAB.slow; if (I.pressed('cancel')) return go('menu');
    }
    if (!LAB.rig) { const d = get('player', ids[LAB.player]); LAB.rig = dressRig(d, d.team); }
    const sdt = dt * (LAB.slow ? .25 : 1); LAB.t += sdt;
    const [kind, id] = clips[LAB.clip], rig = LAB.rig, st = { x: 0, y: 0, z: 0, facing: 0 };
    rig.bb.targets = null; rig.spin = 0;
    if (kind === 'dunk') { const d = get('dunk', id), u = (LAB.t % 1.6) / 1.2, k = keyLerp(d.keys, Math.min(1, u)); rig.bb.targets = k.B ? both(k.B) : { R: k.R, L: k.L }; rig.spin = d.spin * clamp((u - .2) / .65, 0, 1); st.z = Math.sin(Math.min(1, u) * Math.PI) * 40; st.air = u < 1; st.flip = d.flip ? clamp((u - .25) / .5, 0, .999) : 0; st.expr = 'shout'; }
    else if (kind === 'move') { rig.bb.targets = MOVES[id](LAB.t % 1.4); st.expr = 'smile'; }
    else if (kind === 'dribble') { const u = (LAB.t * 2.2) % 1, f = (2 * u - 1) ** 2, hip = rig.o.hipZ; rig.bb.targets = { R: [5, 6.5, Math.max(hip * f + 3, hip - 2)], L: [6, -5, 19] }; }
    else if (kind === 'jumpshot') { const u = (LAB.t % 1.2) / .8; rig.bb.targets = { R: [3, 1, lerp(22, 38, Math.min(1, u))], L: [2.5, -2.2, 30] }; st.z = Math.sin(Math.min(1, u) * Math.PI) * 30; st.air = true; }
    else if (kind === 'block') { rig.bb.targets = both([1, 0, 40], 3); st.z = Math.abs(Math.sin(LAB.t * 2.5)) * 34; st.air = true; st.expr = 'shout'; }
    else if (kind === 'shove') { const u = LAB.t % .8; rig.bb.targets = u < .1 ? both([3, 0, 20], 3.5) : both([12, 0, 21], 3); st.expr = 'angry'; }
    else if (kind === 'knocked') { const u = LAB.t % 1.6; st.down = u < .9 ? Math.min(1, u / .15) : Math.max(0, 1 - (u - .9) / .3); st.hurt = u < .3; }
    else if (kind === 'defense') { rig.bb.targets = both([3, 0, 22], 8); st.pose = 'crouch'; st.vx = Math.sin(LAB.t * 3) * 40; }
    rig.update(sdt, st);
  },
  draw(r) {
    menuBackdrop(r, LAB.t);
    r.overlay(g => {
      const clips = LAB_CLIPS(), [kind, id] = clips[LAB.clip], d = get('player', LAB_PLAYERS()[LAB.player]);
      txt(g, 'ANIMATION LAB', r.W / 2, 10, UI.gold, 2, 'center');
      txt(g, (kind === 'dunk' ? get('dunk', id).banner : (id || kind).toUpperCase()) + '   ' + d.name + (LAB.slow ? '   SLOW x.25' : ''), r.W / 2, 30, '#ffffff', 1, 'center');
      if (LAB.rig) { const x = r.W / 2, y = Math.round(r.H * .72); px.blend(g, .4, 'normal', () => px.ddisc(g, x, y + 2, 14, '#000000', .5)); LAB.rig.draw(g, x, y - Math.round(LAB.rig.z * .87), E.charView(E.VIEWS.side)); }
      promptBar(g, r, '{move} CLIP / PLAYER   {confirm} SLOW MOTION   {cancel} BACK');
    });
  }
});

/* ---- the shootaround: a rim-physics bench. A shooter fires seeded shots from spots all over the half court; the table
 * compares the decided outcome with what the ball actually did (they should agree), with the rim and board bounce live ---- */
const SA = { n: 0, dec: 0, made: 0, agree: 0, t: 0, chance: 0, last: '', pending: null };
SCENES.shootaround = {
  isMatch: true, view: 'broadcast', input: KEYS, pausable: true,
  enter() {
    S.scene = 'shootaround'; Object.assign(SA, { n: 0, dec: 0, made: 0, agree: 0, t: 0, chance: 0, last: '', pending: null });
    startMatch({ court: 'skybox', mode: 'exhibition', teams: [{ id: 'hightops' }, { id: 'breakers' }], humans: [], quarter: 300, seed: 77, powerups: false, twists: false, cheats: { freezeClock: true, freezeShot: true } });
    for (const p of S.players) { p.src = { kind: 'bench', read(q) { Object.assign(q.cmd, emptyCmd()); } }; if (p.slot) { p.x = 160 + p.slot * 40; p.y = Y0 + 20; } }
    S.match.phase = 'live'; SA.rng = E.rng(5); music('camp'); FX.focusX = HOOPS[1].x - 120;
  },
  update(dt) {
    const m = S.match, p = S.players[0], h = HOOPS[1], b = S.ball; m.phase = 'live'; SA.t += dt;
    for (const I of game.players) {
      if (I.repeat('left', .3, .08)) setTune('rimBounce', tune('rimBounce') - .01); if (I.repeat('right', .3, .08)) setTune('rimBounce', tune('rimBounce') + .01);
      if (I.repeat('up', .3, .08)) setTune('boardBounce', tune('boardBounce') + .01); if (I.repeat('down', .3, .08)) setTune('boardBounce', tune('boardBounce') - .01);
      if (I.pressed('cancel')) return go('menu');
    }
    if (SA.pending) {   // the shot in the air: settled when it scores or comes to the floor
      const pd = SA.pending; pd.t += dt;
      if (m.score[0] !== pd.score || (b.z <= BALL_R + 1 && b.state === 'loose') || pd.t > 4) { const went = m.score[0] !== pd.score; SA.n++; if (pd.made) SA.dec++; if (went) SA.made++; if (went === pd.made) SA.agree++; SA.last = (pd.made ? 'DECIDED MAKE' : 'DECIDED MISS') + ' -> ' + (went ? 'IN' : 'OUT'); SA.pending = null; SA.t = 0; m.score = [0, 0]; }
    } else if (SA.t > .5) {
      const a = (SA.rng() - .5) * 2.6, d = 40 + SA.rng() * 200; p.x = h.x - Math.cos(a) * d; p.y = clamp(h.y + Math.sin(a) * d, Y0 + 6, Y1 - 6); p.state = 'run'; p.facing = Math.atan2(h.y - p.y, h.x - p.x);
      p.rig.update(1 / 120, { x: p.x, y: p.y, z: 0, facing: p.facing }); giveBall(p, 'give'); m.score = [0, 0];
      const was = S.cheats.shots; releaseShot(p); S.cheats.shots = was; SA.chance += S.lastShot.chance; SA.pending = { made: S.ball.shot.made, score: m.score[0], t: 0 };
    }
    for (const q of S.players) playerStep(q, dt); ballStep(dt); if (S.ball.shot) S.ball.shot.t += dt;
    hoopStep(dt, 0); FX.focusX = approach(FX.focusX, HOOPS[1].x - 110, dt * 200); game.focus(FX.focusX, YM - 30, 0); Caption.update(dt);
  },
  draw(r) {
    drawMatchWorld(r);
    r.overlay(g => {
      panel(g, 8, 8, 200, 92, 'SHOOTAROUND');
      const pct = (a, b2) => b2 ? Math.round(a / b2 * 100) + '%' : '--';
      txt(g, 'SHOTS ' + SA.n + '   DECIDED MAKES ' + pct(SA.dec, SA.n), 16, 30, '#ffffff', 1);
      txt(g, 'BALL WENT IN ' + pct(SA.made, SA.n) + '   AVG CHANCE ' + (SA.n ? Math.round(SA.chance / Math.max(1, SA.n + (SA.pending ? 1 : 0)) * 100) + '%' : '--'), 16, 41, '#ffffff', 1);
      txt(g, 'PHYSICS AGREES ' + pct(SA.agree, SA.n), 16, 52, SA.n && SA.agree / SA.n < .9 ? UI.bad : UI.good, 1);
      txt(g, 'RIM ' + tune('rimBounce').toFixed(2) + '   BOARD ' + tune('boardBounce').toFixed(2), 16, 63, UI.gold, 1);
      txt(g, SA.last, 16, 76, UI.dim, 1);
      promptBar(g, r, '{move} RIM / BOARD BOUNCE   {cancel} BACK');
    });
  }
};
