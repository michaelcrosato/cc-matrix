/* MASH TV — 16-dev: dev mode (§13), opened from the pause menu. A panel over the right side of the screen with live sliders
 * for every balance number (MT.T), the cheats, the actions, the warp list, the spawns and the debug overlays. FREEZE stops the
 * room while it is open. A DEV badge shows whenever a tuning or a cheat differs from its default. */

MT.DEV_TABS = ['PLAYER', 'ENEMIES', 'ECONOMY', 'SHOW', 'CAMERA & TIME', 'CHEATS', 'ACTIONS', 'WARP', 'SPAWN', 'DEBUG'];
MT.DEV_CHEATS = [['god', 'God mode (all contestants)'], ['infinite', 'Infinite Showstoppers'], ['onehit', 'One-hit kills'], ['freeze', 'Freeze enemies'], ['noclip', 'No clip'], ['autopilot', 'Autopilot P1 (the bot drives)'], ['partner', 'Bot partner (adds a contestant)'], ['mute', 'Mute host chatter']];
MT.DEV_ACTIONS = [['killall', 'Kill all enemies'], ['clearroom', 'Clear the room (jump to EXIT)'], ['nextroom', 'Next room (first exit)'], ['restart', 'Restart the room'],
  ['weapon', 'Give the next weapon'], ['addon', 'Give the next add-on'], ['life', '+1 life'], ['bomb', '+1 Showstopper'], ['cash', '+$100,000'], ['key', '+1 golden key'],
  ['maxr', 'Max ratings'], ['prime', 'Trigger Prime Time'], ['stunt', 'Trigger a ratings stunt'], ['step', 'Frame step (1/30 s, frozen)'], ['export', 'EXPORT TUNING (log it)'], ['resetall', 'RESET ALL TUNING TO DEFAULTS']];
MT.DEV_SPAWN = ['goon', 'clapbot', 'popper', 'mime', 'disco', 'heckler', 'tank', 'snake', 'brute'];
MT.dev = { open: false, tab: 0, row: 0, freeze: true, debug: { hitboxes: false, waves: true, stats: true }, exported: '', rects: [], spawnKind: 0, spawnN: 1, spawnWhere: 0, warpIdx: 0, msg: '' };
MT.dev.badge = () => MT.tuned().length > 0 || MT.run && MT.run.cheatsOn && Object.values(MT.run.cheats || {}).some(Boolean) || MT.run && MT.run.devTouched;

MT.devRows = () => {
  const D = MT.dev, tab = MT.DEV_TABS[D.tab], rows = [];
  if (tab === 'CHEATS') { for (const [k, label] of MT.DEV_CHEATS) rows.push({ label, value: () => (MT.runCheats()[k] ? 'ON' : 'OFF'), act: () => MT.toggleCheat(k) }); }
  else if (tab === 'ACTIONS') { for (const [k, label] of MT.DEV_ACTIONS) rows.push({ label, act: () => MT.devAction(k) }); }
  else if (tab === 'WARP') {
    const list = Object.keys(MT.ROOMS).concat(['lightning']);
    for (const id of list) rows.push({ label: 'ROOM ' + id, act: () => { MT.G.debug.quickRoom(id, 7); MT.dev.open = false; } });
    for (const s of ['cold', 'card1', 'card2', 'card3', 'recap1', 'recap2', 'recap3', 'continue', 'gameover', 'endingA', 'endingB', 'credits']) rows.push({ label: 'SCENE ' + s.toUpperCase(), act: () => { MT.devWarpScene(s); } });
  }
  else if (tab === 'SPAWN') {
    rows.push({ label: 'KIND', value: () => MT.DEV_SPAWN[D.spawnKind], act: () => { D.spawnKind = (D.spawnKind + 1) % MT.DEV_SPAWN.length; } });
    rows.push({ label: 'COUNT', value: () => String(D.spawnN), act: () => { D.spawnN = [1, 5, 10][([1, 5, 10].indexOf(D.spawnN) + 1) % 3]; } });
    rows.push({ label: 'WHERE', value: () => ['N', 'E', 'S', 'W', 'drop', 'audience'][D.spawnWhere], act: () => { D.spawnWhere = (D.spawnWhere + 1) % 6; } });
    rows.push({ label: 'SPAWN IT', act: () => { const W = MT.PLAY.W; if (!W) return; const where = ['N', 'E', 'S', 'W', 'drop', 'audience'][D.spawnWhere]; W.spawnAt(where, MT.DEV_SPAWN[D.spawnKind], D.spawnN, .15); D.msg = 'SPAWNED ' + D.spawnN + ' ' + MT.DEV_SPAWN[D.spawnKind]; } });
  }
  else if (tab === 'DEBUG') {
    rows.push({ label: 'HITBOXES', value: () => (D.debug.hitboxes ? 'ON' : 'OFF'), act: () => { D.debug.hitboxes = !D.debug.hitboxes; } });
    rows.push({ label: 'WAVE TIMELINE', value: () => (D.debug.waves ? 'ON' : 'OFF'), act: () => { D.debug.waves = !D.debug.waves; } });
    rows.push({ label: 'STATS', value: () => (D.debug.stats ? 'ON' : 'OFF'), act: () => { D.debug.stats = !D.debug.stats; } });
    rows.push({ label: 'FREEZE WORLD WHILE OPEN', value: () => (D.freeze ? 'ON' : 'OFF'), act: () => { D.freeze = !D.freeze; } });
  }
  else {
    const groupKeys = MT.TLIST.filter(t => t[2] === tab);
    for (const [k, label, , min, max, step] of groupKeys) rows.push({ label, key: k, value: () => MT.fmtTune(k), slider: [min, max], step, act: () => MT.setTune(k, MT.T[k]) });
    if (tab === 'PLAYER') rows.push({ label: 'RESET ALL TO DEFAULTS', act: () => { MT.resetTunes(); D.msg = 'TUNING RESET'; } });
  }
  return rows;
};
MT.fmtTune = k => { const v = MT.T[k]; return Number.isInteger(v) ? String(v) : (+v).toFixed(2).replace(/0$/, ''); };
MT.runCheats = () => (MT.run && MT.run.cheats) || {};
MT.toggleCheat = (k) => { const run = MT.run; if (!run) return; run.cheats = run.cheats || {}; run.cheats[k] = !run.cheats[k]; run.cheatsOn = true; if (k === 'partner' && run.cheats[k]) MT.addBotPartner(); };
MT.addBotPartner = () => { const W = MT.PLAY.W; if (!W || W.players.length >= 4) return; const c = new Contestant(W, W.players.length, { x: 184, y: 190 }); c.bot = true; c.state = 'walk'; c.walkT = 1.2; W.players.push(c); c.W = W; };
MT.devAction = (k) => {
  const W = MT.PLAY.W, run = MT.run, D = MT.dev, P = W && W.players.find(c => c.inPlay) || (W && W.players[0]);
  switch (k) {
    case 'killall': if (W) for (const e of W.enemies) if (e.alive) W.damageEnemy(e, 9999, P); if (W && W.boss) W.boss.damageAll(9999, W); break;
    case 'clearroom': if (W && W.phase === 'waves') { W.wavesDone = true; W.enemies.forEach(e => { e.alive = false; }); W.spawnQ = []; } break;
    case 'nextroom': if (W && W.R.exits) { const d = Object.keys(W.R.exits)[0]; if (d) { W.leaveDoor = d; W.leaveTo = W.R.exits[d]; W.phase = 'left'; } } break;
    case 'restart': if (W) MT.G.debug.quickRoom(W.id, 7); break;
    case 'weapon': if (P) { const ids = MT.PRIMARY_ORDER; P.give(ids[(ids.indexOf(P.weapon.id) + 1) % ids.length]); } break;
    case 'addon': if (P) P.give(['records', 'shield', 'speed'][Math.floor(MT.rng.spawn() * 3)]); break;
    case 'life': if (P) P.lives++; break;
    case 'bomb': if (P) P.bombs = Math.min(9, P.bombs + 1); break;
    case 'cash': if (P) P.cash += 100000; break;
    case 'key': if (run) run.keys = Math.min(9, run.keys + 1); break;
    case 'maxr': if (run) run.ratings.R = 100; break;
    case 'prime': if (W) { run.ratings.primeCD = 0; W.ratingsAdd(100, 'dev'); } break;
    case 'stunt': if (W) W.runStunt(); break;
    case 'step': if (W) W.step(1 / 30); break;
    case 'export': D.exported = MT.exportTunes(); console.log('MASH TV TUNING ' + D.exported); D.msg = 'EXPORTED: ' + (D.exported || '(defaults)'); break;
    case 'resetall': MT.resetTunes(); D.msg = 'TUNING RESET'; break;
  }
};
MT.devWarpScene = (s) => {
  const G = MT.G, map = { cold: 'coldopen', card1: 'card1', card2: 'card2', card3: 'card3', recap1: 'recap1', recap2: 'recap2', recap3: 'recap3', continue: 'continue', gameover: 'gameover', endingA: 'endingA', endingB: 'endingB', credits: 'credits' };
  MT.dev.open = false; MT.PLAY.devWarp = map[s];
};
// the panel: a right-side column, ten tabs, rows of sliders and buttons (10-foot sized)
MT.dev.update = (G, dt) => {
  const D = MT.dev, rows = MT.devRows(); if (!D.open) return;
  const ps = G.players || [G.input];
  if (D.row >= rows.length) D.row = Math.max(0, rows.length - 1);
  for (const p of ps) {
    if (p.repeat('up', .3, .09)) D.row = (D.row + rows.length - 1) % rows.length;
    if (p.repeat('down', .3, .09)) D.row = (D.row + 1) % rows.length;
    if (p.pressed('tabR')) { D.tab = (D.tab + 1) % MT.DEV_TABS.length; D.row = 0; }
    if (p.pressed('tabL')) { D.tab = (D.tab + MT.DEV_TABS.length - 1) % MT.DEV_TABS.length; D.row = 0; }
    const r = rows[D.row]; if (!r) continue;
    if (r.slider && (p.repeat('left', .3, .07) || p.repeat('right', .3, .07))) { const dir = p.repeat('right', .3, .07) ? 1 : -1; const v = MT.T[r.key] + dir * r.step; MT.setTune(r.key, +clampTo(v, r.slider[0], r.slider[1]).toFixed(4)); }
    if (p.pressed('reset') && r.key) { MT.setTune(r.key, MT.TDEF[r.key]); D.msg = 'RESET ' + r.label; }
    if (p.pressed('confirm')) r.act && r.act();
    if (p.pressed('cancel')) { D.open = false; }
  }
  // the mouse: hover focuses a row, a click on a row activates it, a click on a slider's bar sets it
  for (const p of ps) {
    const pt = p.pointer && p.pointer(); if (pt) { const i = D.rects.findIndex(q => q && pt[0] >= q[0] && pt[0] < q[0] + q[2] && pt[1] >= q[1] && pt[1] < q[1] + q[3]); if (i >= 0) D.row = D.rects[i][4]; }
    const c = p.clicked && p.clicked(); if (c) { const i = D.rects.findIndex(q => q && c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]); if (i >= 0) { D.row = D.rects[i][4]; const r = rows[D.row]; if (r && r.slider && c[0] > D.rects[i][0] + D.rects[i][2] * .5) { const u = (c[0] - (D.rects[i][0] + D.rects[i][2] * .5)) / (D.rects[i][2] * .5); MT.setTune(r.key, +(r.slider[0] + (r.slider[1] - r.slider[0]) * clamp01((c[0] - D.rects[i][0] - D.rects[i][2] * .5) / (D.rects[i][2] * .5))).toFixed(4)); } else if (r) r.act && r.act(); } }
  }
  if (D.freeze && MT.PLAY.W) { /* the play scene skips the world while open */ }
};
const clampTo = (v, a, b) => Math.max(a, Math.min(b, v));
const clamp01 = v => Math.max(0, Math.min(1, v));
MT.dev.draw = (r) => {
  const D = MT.dev; if (!D.open) return;
  const rows = MT.devRows(), x0 = Math.round(r.W * .54), w = r.W - x0 - 6, y0 = 6, H = r.H - 12;
  D.rects = [];
  r.overlay(g => {
    E.ui.box(g, x0, y0, w, H, { bg: ['#140a24', '#070310'], border: '#ff8a2a', alpha: .94 });
    E.font.title(g, 'DEV MODE', x0 + w / 2, y0 + 6, { scale: 2, align: 'center', colors: ['#ff8a2a', '#ffcc33'] });
    E.font.text(g, MT.DEV_TABS.map((t, i) => (i === D.tab ? '[' + t + ']' : '')).join(' ').trim(), x0 + 8, y0 + 30, '#ffcc33', { scale: 1, wrap: w - 16 });
  });
  let y = y0 + 52;
  rows.forEach((row, i) => {
    const foc = i === D.row, rh = 16;
    if (y + rh > y0 + H - 36) return;
    D.rects.push([x0 + 6, y, w - 12, rh, i]);
    r.overlay(g => {
      if (foc) px.rect(g, x0 + 6, y, w - 12, rh - 2, '#ffcc33');
      E.font.text(g, row.label, x0 + 10, y + 4, foc ? '#15121c' : '#fff7e8', { scale: 1 });
      if (row.value) E.font.text(g, row.value(), x0 + w - 10, y + 4, foc ? '#15121c' : '#2ee6ff', { scale: 1, align: 'right' });
      if (row.slider) { const t = (MT.T[row.key] - row.slider[0]) / (row.slider[1] - row.slider[0]); px.rect(g, x0 + w * .58, y + 13, w * .3, 1, '#4a3a60'); px.rect(g, x0 + w * .58 + w * .3 * clamp01(t) - 1, y + 10, 3, 6, foc ? '#15121c' : '#ff8a2a'); }
    });
    y += rh;
  });
  r.overlay(g => {
    E.font.text(g, D.msg || '', x0 + 8, y0 + H - 34, '#ffcc33', { scale: 1, wrap: w - 16 });
    E.font.text(g, 'UP/DOWN ROW  LEFT/RIGHT VALUE  R RESET  L1/R1 TAB  O CLOSE', x0 + 8, y0 + H - 16, '#8a7aa8', { scale: 1, wrap: w - 16 });
  });
  if (D.debug.stats && MT.PLAY.W) { const W = MT.PLAY.W; r.overlay(g => { E.font.text(g, 'ENEMIES ' + W.enemies.filter(e => e.alive).length + '  SHOTS ' + (W.pShots.length + W.fShots.length) + '  PICKUPS ' + W.pickups.length + '  PHASE ' + W.phase + '  R ' + Math.round(MT.run.ratings.R), 8, r.H - 46, '#ffcc33', { scale: 1, shadow: '#000' }); }); }
  if (D.debug.waves && MT.PLAY.W) { const W = MT.PLAY.W; r.overlay(g => E.font.text(g, 'WAVE ' + W.waveIdx + '/' + W.R.waves.length + '  COUNTED ' + W.aliveCounted, 8, r.H - 60, '#2ee6ff', { scale: 1, shadow: '#000' })); }
};
MT.openDev = () => { MT.dev.open = true; MT.dev.row = 0; MT.dev.tab = 0; MT.overlays.indexOf(MT.dev) < 0 && MT.overlays.push(MT.dev); };
MT.openMap = () => { MT.PLAY.mapOverlay = { t: 0 }; };
MT.openHowTo = () => { MT.PLAY.howOverlay = { page: 0 }; };
MT.overlays.push(MT.dev);
