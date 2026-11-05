/* 46-dev: dev mode (PLAN 14), reached from the pause menu's Dev Mode item (or #dev). The panel docks on the right of
 * the screen; while it has the focus the human slots are played by CPU brains so every change shows live. Tabs:
 * TUNING (every slider, live, with reset), CHEATS, MATCH, SCENES, DEBUG (overlays), TIME, CAMERA. Pad, keys and mouse
 * all work it (hover moves the focus, a click acts, the wheel turns a slider). Plus two bench scenes: #animlab (every
 * clip and dunk on any rig, slowed and scrubbed) and #shootaround (the rim's physics firing seeded shots). */
const DEV_TABS = ['TUNING', 'CHEATS', 'MATCH', 'SCENES', 'DEBUG', 'TIME', 'CAMERA'];
const DEV = { tab: 0, row: 0, group: 0, confirmReset: false, msg: '', msgT: 0, giveSlot: 0, puI: 0, twistI: 0, beatI: 0, segI: 0, lessonI: 0, courtI: 0, novaSlot: 0, swapSlot: 0 };
function openDev() { if (HUB) return; S.dev.open = true; DEV.row = 0; game.resume(); consumeNav(); }
function closeDev() { S.dev.open = false; devAutopilot(false); consumeNav(); }
/** while the panel is open the humans' players are driven by CPU brains; closing gives them back */
function devAutopilot(on) {
  for (const p of S.players || []) {
    if (on && p.source && p.source.kind === 'local') { p._local = p.source; p._human = p.human; p.source = cpuSource(); }
    if (!on && p._local) { p.source = p._local; p.human = p._human; p._local = null; }
  }
}
const devMsg = m => { DEV.msg = m; DEV.msgT = 2; };
const onOff = v => v ? 'ON' : 'OFF';
function devRows() {
  const M = S.match, rows = [];
  const R = (label, value, o = {}) => rows.push(Object.assign({ label, value }, o));
  const tab = DEV_TABS[DEV.tab];
  if (tab === 'TUNING') {
    const g = TUNE_GROUPS[DEV.group];
    R('← ' + g + ' →', '', { left: () => { DEV.group = (DEV.group + TUNE_GROUPS.length - 1) % TUNE_GROUPS.length; }, right: () => { DEV.group = (DEV.group + 1) % TUNE_GROUPS.length; }, help: 'Groups: ← → change the group' });
    for (const t of Object.values(TUNING).filter(t => t.group === g)) R(t.label, () => +t.v.toFixed(3) + (t.v !== t.def ? ' •' : ''), { slider: t, left: () => setTune(t.key, t.v - t.step), right: () => setTune(t.key, t.v + t.step), reset: () => resetTuning(t.key), help: t.help + ' (default ' + t.def + ')' });
    R('RESET ALL TO DEFAULTS', '', { act: () => { resetTuning(); devMsg('ALL SLIDERS RESET'); } });
    R('SAVE AS MY DEFAULTS', '', { act: () => { saveTuningDefaults(); devMsg('SAVED'); } });
    R('COPY AS JSON', '', { act: () => { const j = tuningJSON(); try { if (navigator.clipboard) navigator.clipboard.writeText(j); } catch (e) { game.fail('clipboard', e); } DEV.json = j; devMsg('COPIED ' + j.length + ' CHARACTERS'); } });
  } else if (tab === 'CHEATS') {
    const C = S.cheats, tog = (label, key, val = true) => R(label, () => onOff(C[key] === val || (val === true && !!C[key])), { act: () => { C[key] = C[key] === val ? null : val; } });
    tog('INFINITE TURBO: P1', 'infTurbo', 'p1'); tog('INFINITE TURBO: EVERYONE', 'infTurbo', 'all');
    tog('ALWAYS SUPERNOVA: HOME', 'novaHome'); tog('ALWAYS SUPERNOVA: AWAY', 'novaAway'); tog('CPU PASSIVE', 'cpuPassive');
    R('SHOTS', () => (C.shots || 'NORMAL').toUpperCase(), { act: () => { C.shots = C.shots === 'in' ? 'out' : C.shots === 'out' ? null : 'in'; } });
    tog('UNBLOCKABLE DUNKS', 'unblockable'); tog('ONE-SHOVE KNOCKDOWNS', 'oneShove'); tog('BIG HEADS', 'bigHeads'); tog('POWER-UPS EVERY 5 S', 'fastPowerups');
    R('TWISTS', () => onOff(TWIST.on), { act: () => { if (S.match) setupTwists(S.court, !TWIST.on); } });
    R('FREEZE GAME CLOCK', () => onOff(S.dev.freezeClock), { act: () => { S.dev.freezeClock = !S.dev.freezeClock; } });
    R('FREEZE SHOT CLOCK', () => onOff(S.dev.freezeShot), { act: () => { S.dev.freezeShot = !S.dev.freezeShot; } });
    R('UNLOCK EVERYTHING', () => onOff(S.dev.unlockAll), { act: () => { S.dev.unlockAll = true; PROG.unlocked = { bots: true, allstars: true, bigHeads: true }; saveProgress(); defineBigHeads(); devMsg('EVERYTHING UNLOCKED'); } });
    R(DEV.confirmReset ? 'REALLY RESET SAVE DATA?' : 'RESET SAVE DATA', '', { act: () => { if (!DEV.confirmReset) { DEV.confirmReset = true; return; } DEV.confirmReset = false; store.set('bb:progress', null); Object.assign(PROG, { tour: null, unlocked: { bots: false, allstars: false, bigHeads: false }, camp: [], records: { mostPoints: null, bestDunk: null, toursWon: 0 } }); devMsg('SAVE DATA RESET'); } });
  } else if (tab === 'MATCH') {
    if (!M) { R('NO MATCH RUNNING', ''); return rows; }
    R('HOME SCORE', () => M.score[0], { left: () => { M.score[0] = Math.max(0, M.score[0] - 1); }, right: () => { M.score[0]++; } });
    R('AWAY SCORE', () => M.score[1], { left: () => { M.score[1] = Math.max(0, M.score[1] - 1); }, right: () => { M.score[1]++; } });
    R('QUARTER', () => M.quarter, { left: () => { M.quarter = Math.max(1, M.quarter - 1); }, right: () => { M.quarter = Math.min(M.quarters, M.quarter + 1); } });
    R('CLOCK', () => mmss(M.clock), { left: () => { M.clock = Math.max(1, M.clock - 10); }, right: () => { M.clock += 10; } });
    R('SHOT CLOCK', () => Math.ceil(M.shot), { act: () => resetShotClock(), left: () => { M.shot = Math.max(1, M.shot - 5); }, right: () => resetShotClock() });
    R('GIVE BALL TO', () => S.players[DEV.giveSlot].name, { left: () => { DEV.giveSlot = (DEV.giveSlot + 3) % 4; }, right: () => { DEV.giveSlot = (DEV.giveSlot + 1) % 4; }, act: () => attractAction('give', DEV.giveSlot) });
    R('FORCE TIP-OFF', '', { act: () => startTipoff() });
    R('END THE QUARTER', '', { act: () => { M.clock = .01; } });
    R('END THE GAME: HOME WINS', '', { act: () => { M.score[0] = M.score[1] + 2; M.quarter = M.quarters; M.clock = .01; } });
    R('END THE GAME: HOME LOSES', '', { act: () => { M.score[1] = M.score[0] + 2; M.quarter = M.quarters; M.clock = .01; } });
    R('SUPERNOVA FOR', () => S.players[DEV.novaSlot].name, { left: () => { DEV.novaSlot = (DEV.novaSlot + 3) % 4; }, right: () => { DEV.novaSlot = (DEV.novaSlot + 1) % 4; }, act: () => novaOn(S.players[DEV.novaSlot]) });
    R('SHATTER NEXT DUNK', () => onOff(S.cheats.shatterNext), { act: () => { S.cheats.shatterNext = !S.cheats.shatterNext; } });
    R('SPAWN POWER-UP', () => get('powerup', PU_ORDER[DEV.puI]).name, { left: () => { DEV.puI = (DEV.puI + 5) % 6; }, right: () => { DEV.puI = (DEV.puI + 1) % 6; }, act: () => { const p = S.players[0]; spawnPowerup(PU_ORDER[DEV.puI], p.x + 24, p.y); } });
    R('PLACE JACKPOT SPOT', '', { act: () => forceTwist('jackpot') });
    const TW = ['gust', 'slicks', 'eruption', 'vent', 'overclock', 'reboot'];
    R('TRIGGER TWIST', () => TW[DEV.twistI].toUpperCase(), { left: () => { DEV.twistI = (DEV.twistI + TW.length - 1) % TW.length; }, right: () => { DEV.twistI = (DEV.twistI + 1) % TW.length; }, act: () => forceTwist(TW[DEV.twistI]) });
    R('SWAP TO CPU / BACK', () => S.players[DEV.swapSlot].name + ': ' + ((S.players[DEV.swapSlot]._local || S.players[DEV.swapSlot].source.kind === 'local') ? 'HUMAN' : 'CPU'), { left: () => { DEV.swapSlot = (DEV.swapSlot + 3) % 4; }, right: () => { DEV.swapSlot = (DEV.swapSlot + 1) % 4; }, act: () => { const p = S.players[DEV.swapSlot]; if (p._local) { p._local = null; p.human = null; } else if (p.source.kind === 'cpu' && p._swapped) { p.source = p._swapped; p.human = p._swHuman; p._swapped = null; } else if (p.source.kind === 'local') { p._swapped = p.source; p._swHuman = p.human; p.source = cpuSource(); p.human = null; } else { const I = game.input; p.source = localSource(I); p.human = 0; } } });
  } else if (tab === 'SCENES') {
    R('EXHIBITION AT', () => get('court', COURT_ORDER[DEV.courtI]).name, { left: () => { DEV.courtI = (DEV.courtI + 4) % 5; }, right: () => { DEV.courtI = (DEV.courtI + 1) % 5; }, act: () => devExhibition(COURT_ORDER[DEV.courtI]) });
    R('TOUR STOP', () => 'STOP ' + (DEV.stopI = DEV.stopI || 1), { left: () => { DEV.stopI = Math.max(1, (DEV.stopI || 1) - 1); }, right: () => { DEV.stopI = Math.min(4, (DEV.stopI || 1) + 1); }, act: () => devTourStop(DEV.stopI || 1) });
    R('STORY BEAT', () => BEAT_ORDER[DEV.beatI].toUpperCase(), { left: () => { DEV.beatI = (DEV.beatI + BEAT_ORDER.length - 1) % BEAT_ORDER.length; }, right: () => { DEV.beatI = (DEV.beatI + 1) % BEAT_ORDER.length; }, act: () => { closeDev(); setStop(); playBeats([BEAT_ORDER[DEV.beatI]], () => gotoScreen('menu')); } });
    R('CREDITS', '', { act: () => { closeDev(); gotoScreen('credits', {}); } });
    R('RESULTS', '', { act: () => { closeDev(); game.go('results', { res: S.match ? matchResult() : demoResult(), from: 'exhibition' }); } });
    R('ATTRACT MODE', () => 'SEGMENT ' + (DEV.segI + 1), { left: () => { DEV.segI = (DEV.segI + 4) % 5; }, right: () => { DEV.segI = (DEV.segI + 1) % 5; }, act: () => { closeDev(); startAttract('menu'); S.attract.seg = DEV.segI; } });
    R('BLAM CAMP LESSON', () => CAMP_LESSONS[DEV.lessonI].name, { left: () => { DEV.lessonI = (DEV.lessonI + 9) % 10; }, right: () => { DEV.lessonI = (DEV.lessonI + 1) % 10; }, act: () => { closeDev(); CAMPRUN.single = true; startLesson(DEV.lessonI, false); } });
    R('HUB CARD PREVIEW', '', { act: () => { closeDev(); game.go('hubcard', { preview: true }); } });
    R('ANIMATION LAB', '', { act: () => { closeDev(); game.go('animlab'); } });
    R('SHOOTAROUND (RIM PHYSICS)', '', { act: () => { closeDev(); game.go('shootaround'); } });
  } else if (tab === 'DEBUG') {
    const O = S.dev.overlays || (S.dev.overlays = {}), tog = (label, k) => R(label, () => onOff(O[k]), { act: () => { O[k] = !O[k]; } });
    tog('HITBOXES', 'hit'); tog('AI INTENTS', 'ai'); tog('SHOT CHANCE', 'shot'); tog('BALL PATH', 'path'); tog('TWIST AREAS', 'twist'); tog('EVENT LOG', 'log'); tog('STATE SNAPSHOT', 'snap');
  } else if (tab === 'TIME') {
    const SP = [.1, .25, .5, 1, 2];
    R('GAME SPEED', () => (S.dev.speed || 1) + 'x', { left: () => { const i = SP.indexOf(S.dev.speed || 1); S.dev.speed = SP[Math.max(0, i - 1)]; }, right: () => { const i = SP.indexOf(S.dev.speed || 1); S.dev.speed = SP[Math.min(SP.length - 1, i + 1)]; } });
    R('FREEZE', () => onOff(S.dev.frozen), { act: () => { S.dev.frozen = !S.dev.frozen; } });
    R('STEP ONE FRAME', '', { act: () => { if (S.dev.frozen) { S.dev.stepping = true; S.dev.stepN = 2; } } });
    R('SLOW MOTION ON DUNKS', () => onOff(tune('dunkSlowMo') < 1), { act: () => setTune('dunkSlowMo', tune('dunkSlowMo') < 1 ? 1 : TUNING.dunkSlowMo.def === 1 ? .45 : TUNING.dunkSlowMo.def) });
  } else if (tab === 'CAMERA') {
    R('VIEW', () => game.view.id === 'threequarter' ? 'HIGH' : 'BROADCAST', { act: () => game.settings.set('camera', game.settings.camera === 'high' ? 'broadcast' : 'high'), left: () => game.settings.set('camera', 'broadcast'), right: () => game.settings.set('camera', 'high') });
    R('ZOOM', () => CAM.zoomTo.toFixed(2), { left: () => { CAM.zoomTo = clamp(CAM.zoomTo - .1, .6, 2); }, right: () => { CAM.zoomTo = clamp(CAM.zoomTo + .1, .6, 2); } });
    R('FREE CAMERA', () => onOff(S.dev.freeCam), { act: () => { S.dev.freeCam = !S.dev.freeCam; } });
    R('RESET CAMERA', '', { act: () => { CAM.zoomTo = 1; S.dev.freeCam = false; game.settings.set('camera', 'broadcast'); } });
  }
  return rows;
}
function demoResult() { return { winner: 0, score: [52, 48], teams: ['hightops', 'breakers'], court: 'skybox', mvp: { id: 'volt', name: 'VOLT', team: 0, stats: { PTS: 24, REB: 5, AST: 3, STL: 2, BLK: 1, DNK: 7 } }, best: { what: 'FRONT-FLIP FREAK!', name: 'VOLT', pts: 380 }, box: S.players.length ? S.players.map(p => ({ slot: p.slot, id: p.def.id, name: p.name, team: p.team, human: p.human, stats: p.stats })) : [], style: [3200, 1800], starred: false, mode: 'exhibition' }; }
function devExhibition(court, o = {}) {
  closeDev(); const home = get('court', court).home, H = home === 'blambots' ? 'hightops' : home, A2 = H === 'breakers' ? 'crushers' : 'breakers';
  EXH.teams = [H, A2]; EXH.court = court; EXH.lineups = [get('team', H).players.slice(), get('team', A2).players.slice()]; EXH.seats = [{ side: 0, ready: true }];
  const opts = { court, home: H, away: A2, lineups: EXH.lineups, humans: [[0, game.input]], quarterLen: game.settings.quarterLen || 120, diff: [1, 1], powerups: true, twists: true, mode: 'exhibition' };
  EXH.lastOpts = opts; S.cheats = {};
  startMatchScene(opts, { fade: .2, openDev: !!o.panel, onEnd: res => game.go('results', { res, from: 'exhibition' }) });
}
function devTourStop(n) {
  closeDev(); TOUR.team = TOUR.team || 'hightops'; TOUR.stop = n - 1; TOUR.lineups = [get('team', TOUR.team).players.slice(), null]; TOUR.humans = 1; setStop(); gotoScreen('matchup', { tour: true });
}
/** the panel's step: navigation, sliders, actions; returns true while it has the focus */
function devUpdate() {
  if (!S.dev.open) return false;
  const nav = navInput(), rows = devRows(); DEV.msgT = Math.max(0, DEV.msgT - 1 / 120);
  if (S.dev.stepN > 0 && --S.dev.stepN === 0) S.dev.stepping = false;
  if (nav.tabL) { DEV.tab = (DEV.tab + DEV_TABS.length - 1) % DEV_TABS.length; DEV.row = 0; sfx('select'); }
  if (nav.tabR) { DEV.tab = (DEV.tab + 1) % DEV_TABS.length; DEV.row = 0; sfx('select'); }
  if (nav.up) DEV.row = (DEV.row + rows.length - 1) % rows.length; if (nav.down) DEV.row = (DEV.row + 1) % rows.length;
  if (DEV.rects && NAV.hover && nav.mouse) DEV.rects.forEach(([rc, i]) => { if (inRect(NAV.hover, rc)) DEV.row = i; });
  if (DEV.tabRects && nav.click) DEV.tabRects.forEach((rc, i) => { if (inRect(nav.click, rc)) { DEV.tab = i; DEV.row = 0; } });
  DEV.row = clamp(DEV.row, 0, rows.length - 1);
  const row = rows[DEV.row];
  if (row) {
    if (nav.left && row.left) row.left(); if (nav.right && row.right) row.right();
    const z = game.input.zoom(); if (z && z !== 1 && row.slider) { if (z > 1) row.right(); else row.left(); }
    if ((nav.confirm || (nav.click && DEV.rects && DEV.rects.some(([rc, i]) => i === DEV.row && inRect(nav.click, rc)))) && (row.act || row.right)) { (row.act || row.right)(); sfx('confirm'); }
    if (nav.alt && row.reset) { row.reset(); sfx('select'); }
  }
  if (nav.cancel || game.players.some(I => I.pressed('pause'))) closeDev();
  return true;
}
function devDraw(r) {
  r.overlay(g => {
    const x = Math.round(r.W * .62), w = r.W - x - 4, y = 44, h = r.H - y - 22, rows = devRows(), page = Math.floor(DEV.row / 8), shown = rows.slice(page * 8, page * 8 + 8);
    E.ui.box(g, x, y, w, h, { bg: ['#140c24', '#0a0614'], border: UIC.accent2, alpha: .94 });
    DEV.tabRects = [];
    DEV_TABS.forEach((t, i) => { const tw = Math.floor((w - 4) / DEV_TABS.length), tx = x + 2 + i * tw; DEV.tabRects.push([tx, y + 2, tw - 1, 10]); px.rect(g, tx, y + 2, tw - 1, 10, i === DEV.tab ? UIC.accent2 : '#2a2040'); E.font.text(g, t.slice(0, 4), tx + tw / 2, y + 3, i === DEV.tab ? '#0a0614' : UIC.ink, { align: 'center', font: 'tiny', outline: false }); });
    E.font.text(g, 'DEV • ' + DEV_TABS[DEV.tab] + (rows.length > 8 ? '  ' + (page + 1) + '/' + Math.ceil(rows.length / 8) : ''), x + 4, y + 15, UIC.accent2, { outline: false });
    DEV.rects = [];
    shown.forEach((row, k) => {
      const i = page * 8 + k, ry = y + 26 + k * 15, f = i === DEV.row, v = typeof row.value === 'function' ? row.value() : row.value;
      DEV.rects.push([[x + 2, ry - 2, w - 4, 14], i]);
      if (f) { px.rect(g, x + 2, ry - 2, w - 4, 14, '#3a2a5a'); px.rect(g, x + 2, ry - 2, 2, 14, UIC.gold); }
      E.font.text(g, row.label, x + 7, ry + 1, f ? '#fff' : UIC.ink, { outline: false });
      if (v !== '' && v !== undefined) E.font.text(g, String(v), x + w - 6, ry + 1, String(v).includes('•') ? UIC.gold : UIC.accent2, { align: 'right', outline: false });
      if (row.slider) { const t = row.slider, k2 = (t.v - t.min) / (t.max - t.min), kd = (t.def - t.min) / (t.max - t.min); px.rect(g, x + 7, ry + 10, w - 14, 1, '#3a2a5a'); px.rect(g, x + 7 + Math.round((w - 14) * kd), ry + 9, 1, 3, UIC.muted); px.rect(g, x + 6 + Math.round((w - 14) * k2), ry + 8, 3, 4, UIC.gold); }
    });
    const row = rows[DEV.row], help = DEV.msgT > 0 ? DEV.msg : row && row.help ? row.help : '';
    wrapText(help, w - 8).slice(0, 2).forEach((l, i) => E.font.text(g, l, x + 4, y + h - 22 + i * 9, DEV.msgT > 0 ? UIC.gold : UIC.muted, { outline: false }));
    promptLine(g, '{tabL}{tabR} TAB {confirm} DO {oop} RESET {cancel} CLOSE', x + w / 2, r.H - 14, { align: 'center' });
  });
}
/** debug overlays in the world */
function devOverlays(r) {
  const O = S.dev.overlays || {}, M = S.match; if (!M) return;
  if (O.hit) for (const p of S.players) r.queue(p.x, p.y, 1, g => { px.blend(g, .7, 'normal', () => { for (const pt of r.groundPts(p.x, p.y, 6, 12, p.z)) px.dot(g, pt[0], pt[1], '#5aff7a'); const sr = tune('stealReach') + .6 * p.r.swipe; for (const pt of r.groundPts(p.x, p.y, sr, 18, 0)) px.dot(g, pt[0], pt[1], '#ffd23a'); }); const h = handsAt(p), hp = r.w(h[0], h[1], h[2]); px.rect(g, hp[0] - 1, hp[1] - 1, 3, 3, '#ff3ca6'); }, { emissive: true });
  if (O.hit) r.queue(CMX, CMY, 100, g => { for (const rim of RIMS) for (const pt of r.groundPts(rim.x, rim.y, RIM_R, 16, RIM_Z)) px.dot(g, pt[0], pt[1], '#ff3a3a'); for (const X of BOARD_X) { const a = r.w(X, BOARD_Y[0], BOARD_Z[0]), b = r.w(X, BOARD_Y[1], BOARD_Z[1]); px.line(g, a[0], a[1], b[0], b[1], '#3ad0ff'); } const b = S.ball, bp = r.w(b.x, b.y, b.z); px.ell(g, bp[0], bp[1], 5, 5, '#ffffff'); }, { emissive: true });
  if (O.ai) for (const p of S.players) if (p.brain && p.source.kind === 'cpu') r.queue(p.x, p.y, 80, g => { const [x, y] = r.w(p.x, p.y, p.z + p.rig.o.size * 36 + 14); E.font.text(g, p.brain.label || '', Math.round(x), Math.round(y), '#7af0ff', { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true });
  if (O.path && (S.ball.state === 'shot' || S.ball.state === 'loose')) r.queue(CMX, CMY, 100, g => { const b = Object.assign({}, S.ball); let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz; for (let k = 0; k < 40; k++) { const h = 1 / 40; vz -= tune('ballGravity') * h; x += vx * h; y += vy * h; z += vz * h; if (z < BALL_R) break; const [sx, sy] = r.w(x, y, z); px.dot(g, sx, sy, k % 2 ? '#ffffff' : '#ffd23a'); } }, { emissive: true });
  if (O.twist) r.decal(() => { for (const s of TWIST.slicks) r.groundRing(s.x, s.y, s.r, '#ff3ca6', 1); for (const v of TWIST.vents) r.groundRing(v.x, v.y, 18, '#ffd23a', 1); for (const b of TWIST.bombs) r.groundRing(b.x, b.y, 22, '#ff3a3a', 1); if (TWIST.spot) r.groundRing(TWIST.spot.x, TWIST.spot.y, 16, '#5aff7a', 1); });
  r.overlay(g => {
    let y = 46;
    if (O.shot) { const h = S.ball.owner; if (h) { const c = shotChance(h); E.font.text(g, h.name + ' SHOT: ' + Math.round(c.p * 100) + '%' + (c.three ? ' (3)' : ''), 6, y, '#7af0ff', { outline: '#000' }); y += 9; } const L2 = S.lastShot; if (L2) { E.font.text(g, 'LAST: ' + L2.name + ' ' + Math.round(L2.chance * 100) + '% ' + L2.d + 'u ' + (L2.release || '') + ' ' + (L2.made ? 'MADE' : 'MISS'), 6, y, UIC.muted, { font: 'tiny', outline: '#000' }); y += 8; } }
    if (O.log) { S.events.slice(-10).forEach((e, i) => E.font.text(g, e.type, 6, y + i * 7, UIC.ink, { font: 'tiny', outline: '#000' })); y += 72; }
    if (O.snap) { const s = JSON.stringify(game.debug.snapshot()); wrapText(s, Math.round(r.W * .55), { font: 'tiny' }).slice(0, 10).forEach((l, i) => E.font.text(g, l, 6, y + i * 7, '#9affb0', { font: 'tiny', outline: '#000' })); }
  });
}
/* ---- the animation lab: every clip and dunk on any rig ---- */
const LAB = { clipI: 0, playerI: 0, speed: 1, t: 0, frozen: false, rig: null };
const LAB_ITEMS = () => Object.keys(CLIPS).map(k => ['clip', k]).concat(DUNK_ORDER.map(k => ['dunk', k])).concat([['dribble', 'dribble']]);
SC.animlab = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('camp'); setupArena('skybox'); LAB.t = 0; this.mk(); },
  exit() { game.setZoom(1); },
  mk() { const ids = all('player').map(p => p.id); const d = get('player', ids[LAB.playerI % ids.length]); LAB.rig = dressPlayer(d, d.team); LAB.def = d; LAB.dribble = { ph: 0, side: 1, cross: 0 }; },
  update(dt) {
    const nav = navInput(), items = LAB_ITEMS();
    if (nav.left) { LAB.clipI = (LAB.clipI + items.length - 1) % items.length; LAB.t = 0; } if (nav.right) { LAB.clipI = (LAB.clipI + 1) % items.length; LAB.t = 0; }
    if (nav.up || nav.down) { LAB.playerI += nav.up ? -1 + all('player').length : 1; this.mk(); }
    if (nav.confirm) LAB.speed = LAB.speed === 1 ? .25 : 1; if (nav.alt) LAB.frozen = !LAB.frozen; if (nav.tabR && LAB.frozen) LAB.t += 1 / 30;
    if (nav.cancel) { gotoScreen('menu'); return; }
    const k = dt * LAB.speed * (LAB.frozen ? 0 : 1); LAB.t += k; updateArena(dt);
    const [kind, id] = items[LAB.clipI], rig = LAB.rig, x = OX + 300, y = CMY;
    let z = 0, facing = 0, flip = 0, P = null;
    if (kind === 'clip') P = CLIPS[id](LAB.t % 1.4, { u: (LAB.t % 1) , released: LAB.t % 1.4 > .6, swat: (LAB.t % 1) < .15 ? 1 : 0 });
    else if (kind === 'dunk') { const def = get('dunk', id), T = 1.1, u = (LAB.t % (T + .5)) / T; P = dunkKeys(def, Math.min(1, u)); z = Math.sin(Math.min(1, u) * PI) * 40; if (def.spin) facing = -TAU * def.spin * E.ease.inOutSine(clamp((u - def.spinU[0]) / (def.spinU[1] - def.spinU[0]), 0, 1)); if (def.flip) { const kk = clamp((u - def.flipU[0]) / (def.flipU[1] - def.flipU[0]), 0, 1); flip = kk > 0 && kk < 1 ? kk : 0; } }
    else { const fake = { dribble: LAB.dribble, rig, vx: 0, vy: 0, turboOn: false, z: 0, x, y, foes: [] }; P = dribblePose(fake, k); }
    rig.bb.pose = P; rig.bb.w = 1; rig.update(k, { x, y, z, facing, flip, air: z > 3 });
    LAB.ballAt = P && P.ball ? ballAnchor({ rig }, P) : null; game.focus(x, y, 30); game.cam.offset = [0, 0]; game.setZoom(2.2);
  },
  draw(r) {
    drawArena(r); const rig = LAB.rig; r.shadow(rig.x, rig.y, 7, .4); r.actor(rig.x, rig.y, rig.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
    if (LAB.ballAt) r.sprite(LAB.ballAt[0], LAB.ballAt[1], LAB.ballAt[2] - BALL_R, BALL_SPR[0], { anchor: 'bottom' });
    r.overlay(g => { rig.debug && rig.debug(r); const [kind, id] = LAB_ITEMS()[LAB.clipI]; E.font.text(g, 'ANIMATION LAB • ' + LAB.def.name + ' • ' + kind.toUpperCase() + ': ' + id + ' • ' + LAB.speed + 'x' + (LAB.frozen ? ' FROZEN' : ''), 6, 6, '#fff', { outline: '#000' }); promptBar(g, r, ['{left}{right} CLIP', '{up}{down} PLAYER', '{confirm} SPEED', '{oop} FREEZE', '{tabR} STEP', '{cancel} BACK']); });
  }
};
/* ---- the shootaround: seeded shots from random spots, flown by the rim's physics; made against decided ---- */
const SHOOT = { n: 0, made: 0, decided: 0, wrong: 0, t: 0, shooter: null };
SC.shootaround = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('camp'); newMatch({ court: 'skybox', home: 'hightops', away: 'breakers', quarterLen: 600, tipoff: false, powerups: false, twists: false, mode: 'bench', seed: 77 }); S.match.practice = true; for (const p of S.players) { p.x = OX - 40; p.y = OY - 20; } Object.assign(SHOOT, { n: 0, made: 0, decided: 0, wrong: 0, t: 0, shooter: S.players[0] }); this.fire(); },
  fire() {
    const p = SHOOT.shooter, rim = attackRim(0), a = (S.rng() - .5) * 2.6, d = 30 + S.rng() * 220, b = S.ball;
    p.x = clamp(rim.x - Math.cos(a) * d, OX + 4, OX + CW - 4); p.y = clamp(rim.y + Math.sin(a) * d, OY + 4, OY + CH - 4); p.z = 0;
    b.x = p.x; b.y = p.y; b.z = 58; b.state = 'held'; b.owner = p; b.scored = false; SHOOT.wantMade = S.rng() < .5;
    launchShot(p, { p: SHOOT.wantMade ? 1 : 0, three: isThree(p.x, p.y, rim) }, {}); SHOOT.t = 0; SHOOT.counted = false; SHOOT.n++; if (SHOOT.wantMade) SHOOT.decided++;
  },
  update(dt) {
    const nav = navInput(); if (nav.cancel) { gotoScreen('menu'); return; }
    S.match.phase = 'live'; ballPhysics(dt); updateArena(dt); SHOOT.t += dt;
    if (S.ball.scored && !SHOOT.counted) { SHOOT.counted = true; SHOOT.made++; if (!SHOOT.wantMade) SHOOT.wrong++; }
    if (SHOOT.t > 2.2 || (S.ball.z <= BALL_R + .1 && SHOOT.t > .6)) { if (SHOOT.wantMade && !SHOOT.counted) SHOOT.wrong++; this.fire(); }
    game.focus(OX + CW - 160, CMY, 0); game.cam.offset = [0, 0];
  },
  draw(r) { drawArena(r); drawBall(r); r.overlay(g => { E.font.text(g, 'SHOOTAROUND • RIM PHYSICS BENCH', 6, 6, '#fff', { outline: '#000' }); E.font.text(g, 'SHOTS ' + SHOOT.n + '  DECIDED MAKES ' + SHOOT.decided + '  WENT IN ' + SHOOT.made + '  DISAGREE ' + SHOOT.wrong, 6, 16, UIC.gold, { outline: '#000' }); promptBar(g, r, ['{cancel} BACK']); }); }
};
