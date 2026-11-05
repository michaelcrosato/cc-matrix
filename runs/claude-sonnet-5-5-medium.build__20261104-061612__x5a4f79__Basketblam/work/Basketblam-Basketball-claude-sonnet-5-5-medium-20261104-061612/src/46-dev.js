/* BASKETBLAM - dev mode (from the pause menu): live tuning sliders, cheats, scene jumps, overlays */
const DEV_TABS = ['TUNING', 'TOOLS', 'STATE'];
const toggleCheat = k => () => { S.cheats[k] = !S.cheats[k]; };
const DEV_TOOLS = [
  { label: 'Infinite turbo', get: () => S.cheats.infTurbo, fn: toggleCheat('infTurbo') },
  { label: 'Big heads', get: () => S.cheats.big, fn: toggleCheat('big') },
  { label: 'Freeze the clocks', get: () => S.cheats.noClock, fn: toggleCheat('noClock') },
  { label: 'Autopilot (CPU plays P1)', get: () => S.dev.autopilot, fn: () => { S.dev.autopilot = !S.dev.autopilot; } },
  { label: 'Overlay: names and ball', get: () => S.dev.overlay, fn: () => { S.dev.overlay = !S.dev.overlay; } },
  { label: 'Give the ball to P1 / slot 0', fn: () => { const p = S.players.find(q => q.input) || S.players[0]; giveBall(p); p.act = null; } },
  { label: 'Teleport P1 to the hoop', fn: () => { const p = S.players.find(q => q.input) || S.players[0]; const h = attackHoop(p.team); p.x = h.x - h.dir * 90; p.y = h.y; } },
  { label: 'HOME +2 points', fn: () => { S.match.score[0] += 2; } },
  { label: 'AWAY +2 points', fn: () => { S.match.score[1] += 2; } },
  { label: 'Set clock to 0:10', fn: () => { S.match.clock = 10; } },
  { label: 'End the quarter now', fn: () => { if (S.match.phase === 'live') { S.match.clock = 0; endQuarter(); } } },
  { label: 'Supernova for HOME', fn: () => { S.match.novaT[0] = 40; S.match.streak[0] = 3; emit('supernovaOn', { team: 0, p: 0 }); } },
  { label: 'Spawn a power-up', fn: () => { const pu = POWERUPS[Math.floor(Math.random() * POWERUPS.length)]; S.powerups.push({ id: pu.id, x: COURT.cx + (Math.random() - .5) * 200, y: COURT.cy + (Math.random() - .5) * 100, t: 0, life: 14 }); } },
  { label: 'Shatter a backboard', fn: () => shatterBoard(HOOPS[1]) },
  { label: 'Tip off again', fn: () => { startTip(); } },
  { label: 'Next court (restart match)', fn: () => { const i = (COURT_ORDER.indexOf(S.court) + 1) % 4; newMatch(Object.assign({}, S.cfg, { court: COURT_ORDER[i], seed: undefined })); music(courtDef().music); } },
  { label: 'Unlock the secret crews', fn: () => { const p = store.progress(); p.unlocked = true; store.save(p); S.dev.unlockAll = true; } },
  { label: 'Save tuning', fn: () => { saveTuning(); banner('TUNING SAVED', { scale: 2 }); } },
  { label: 'Reset every slider to defaults', fn: () => { resetTuning(); E.store.set('bb:tuning', null); banner('DEFAULTS RESTORED', { scale: 2 }); } },
  { label: 'Quit to title', fn: () => { S.dev.open = false; go('title'); } },
  { label: 'Close dev mode', fn: () => { S.dev.open = false; } }
];
function devRows() {
  const tab = S.dev.tab, rows = [];
  if (tab === 0) { let grp = ''; for (const k in TUNING) { const t = TUNING[k]; if (t.group !== grp) { grp = t.group; rows.push({ hdr: grp }); } rows.push({ slider: t }); } }
  else if (tab === 1) DEV_TOOLS.forEach(t => rows.push({ tool: t }));
  else {
    const M = S.match, B = S.ball;
    rows.push({ info: 'Scene ' + game.sceneName + '  mode ' + S.mode + '  court ' + S.court });
    rows.push({ info: 'Phase ' + M.phase + '  Q' + M.quarter + '  clock ' + M.clock.toFixed(1) + '  shot ' + M.shotClock.toFixed(1) });
    rows.push({ info: 'Score ' + M.score.join(' - ') + '  streak ' + M.streak.join('/') + '  nova ' + M.novaT.map(x => x.toFixed(0)).join('/') });
    rows.push({ info: 'Ball ' + B.state + ' (' + B.x.toFixed(0) + ', ' + B.y.toFixed(0) + ', ' + B.z.toFixed(0) + ') owner ' + (B.owner ? B.owner.name : '-') });
    S.players.forEach(p => rows.push({ info: p.slot + ' ' + p.name + ' ' + (p.input ? 'HUMAN' : 'CPU') + ' ' + (p.act ? p.act.type : 'free') + ' turbo ' + p.turbo.toFixed(2) + ' pts ' + p.st.pts }));
    rows.push({ info: 'Last events: ' + S.events.slice(-6).map(e => e.type).join(', ') });
  }
  return rows;
}
function devUpdate(dt) {
  const I = game.input, d = S.dev, rows = devRows(); touchIdle(dt);
  if (I.pressed('cancel') || I.pressed('pause')) { d.open = false; I.consumeAll(); return; }
  const sel = i => { const r = rows[i]; return r && (r.slider || r.tool); };
  const move = dir => { let i = d.row; do { i += dir; } while (i >= 0 && i < rows.length && !sel(i)); if (i < -1) i = -1; if (i >= rows.length) i = d.row; d.row = i; sfx('tick', { vol: 1.5 }); };
  if (d.row >= 0 && !sel(d.row)) { d.row = -1; move(1); }
  if (I.repeat('up', .3, .1)) { if (d.row < 0) { } else { const was = d.row; move(-1); } }
  if (I.repeat('down', .3, .1)) { if (d.row < 0) { d.row = -1; move(1); } else move(1); }
  if (d.row === -1) { if (I.repeat('left', .3, .2)) { d.tab = (d.tab + 2) % 3; d.row = -1; sfx('tick', { vol: 1.5 }); } if (I.repeat('right', .3, .2)) { d.tab = (d.tab + 1) % 3; sfx('tick', { vol: 1.5 }); } if (I.pressed('confirm')) { d.tab = (d.tab + 1) % 3; } return; }
  const r = rows[d.row]; if (!r) return;
  if (r.slider) {
    const t = r.slider, mult = I.down('turbo') ? 5 : 1; let dir = 0;
    if (I.repeat('left', .3, .06)) dir = -1; if (I.repeat('right', .3, .06)) dir = 1;
    const m = mouseHud(), c = I.clicked && I.clicked();
    if (c && S.devSliderRect && c[1] >= S.devRowY(d.row) && c[1] < S.devRowY(d.row) + 12) { const u = clamp((c[0] - S.devSliderRect[0]) / S.devSliderRect[2], 0, 1); t.v = clamp(Math.round((t.min + u * (t.max - t.min)) / t.step) * t.step, t.min, t.max); }
    if (dir) t.v = clamp(+(t.v + dir * t.step * mult).toFixed(4), t.min, t.max);
    if (I.pressed('confirm')) t.v = t.def;
  } else if (r.tool) {
    if (I.pressed('confirm') || I.pressed('shoot') || I.pressed('right')) { r.tool.fn(); sfx('perfect', { vol: .6 }); }
  }
}
function drawDevPanel(g, r) {
  const W = r.W, H = r.H, d = S.dev, rows = devRows(), w = 240, x0 = 8, y0 = 8, vis = 12;
  panel(g, x0, y0, w, H - 16, { bg: ['#0c1a2a', '#05101c'], border: '#4ac8ff', alpha: .94 });
  DEV_TABS.forEach((t, i) => { const x = x0 + 6 + i * 74; px.rect(g, x, y0 + 4, 70, 12, i === d.tab ? (d.row === -1 ? '#ffd36a' : '#4ac8ff') : '#1a2a3a'); txt(g, t, x + 35, y0 + 6, i === d.tab ? '#05101c' : '#8ad0ff', { align: 'center', font: 'tiny', outline: false }); });
  txt(g, 'DEV MODE', x0 + w + 6, y0 + 6, '#ff9a6a', { font: 'tiny' });
  let first = Math.max(0, Math.min(d.row < 0 ? 0 : d.row - 5, rows.length - vis)); const rowH = 12;
  S.devRowY = i => y0 + 20 + (i - first) * rowH;
  for (let k = 0; k < vis && first + k < rows.length; k++) {
    const i = first + k, rw = rows[i], y = y0 + 20 + k * rowH, foc = i === d.row;
    if (rw.hdr) { txt(g, '- ' + rw.hdr, x0 + 8, y + 2, '#4ac8ff', { font: 'tiny', outline: false }); continue; }
    if (foc) px.rect(g, x0 + 3, y, w - 6, rowH - 1, '#1c4a6a');
    if (rw.slider) {
      const t = rw.slider, u = (t.v - t.min) / (t.max - t.min);
      txt(g, t.label, x0 + 8, y + 2, foc ? '#fff' : '#b8d8f0', { font: 'tiny', outline: false });
      const sx = x0 + 112, sw = 80; px.rect(g, sx, y + 4, sw, 3, '#1a3a5a'); px.rect(g, sx, y + 4, Math.round(sw * u), 3, t.v === t.def ? '#6ad8ff' : '#ffd36a'); px.rect(g, sx + Math.round(sw * u) - 1, y + 2, 3, 7, '#ffffff');
      if (foc) S.devSliderRect = [sx, y, sw];
      txt(g, String(+t.v.toFixed(2)), x0 + w - 8, y + 2, t.v === t.def ? '#8ad0ff' : '#ffd36a', { font: 'tiny', align: 'right', outline: false });
    } else if (rw.tool) {
      txt(g, rw.tool.label, x0 + 8, y + 2, foc ? '#fff' : '#b8d8f0', { font: 'tiny', outline: false });
      if (rw.tool.get) txt(g, rw.tool.get() ? 'ON' : 'off', x0 + w - 8, y + 2, rw.tool.get() ? '#6aff9a' : '#6a7a8a', { font: 'tiny', align: 'right', outline: false });
    } else if (rw.info) txt(g, rw.info, x0 + 8, y + 2, '#b8d8f0', { font: 'tiny', outline: false });
  }
  const t = rows[d.row] && rows[d.row].slider; if (t) txt(g, t.help, x0 + 8, H - 34, '#ffd36a', { font: 'tiny' }); if (t) txt(g, 'CONFIRM: default   TURBO: x5 steps', x0 + 8, H - 26, '#8ad0ff', { font: 'tiny' });
  drawPrompts(g, [['move', 'NAVIGATE'], ['confirm', 'USE'], ['cancel', 'CLOSE']], x0 + w / 2, H - 16);
}
function drawDevOverlay(g, r) {
  const B = S.ball;
  txt(g, 'ball ' + B.state + ' ' + B.x.toFixed(0) + ',' + B.y.toFixed(0) + ',' + B.z.toFixed(0), 4, r.H - 40, '#6aff9a', { font: 'tiny' });
  txt(g, 'phase ' + S.match.phase + ' fps ' + (game.fps ? game.fps.toFixed(0) : '?'), 4, r.H - 32, '#6aff9a', { font: 'tiny' });
}
/* ---- How to Play opened from the pause menu ---- */
function howUpdate(dt) { const I = game.input; S.howto.page = cycle(I, HOW.length, S.howto.page); if (I.pressed('cancel') || I.pressed('confirm') || I.pressed('pause')) { S.howto = null; I.consumeAll(); } }
function drawHowOverlay(g, r) {
  const W = r.W, H = r.H, p = HOW[S.howto.page];
  px.blend && px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
  panel(g, 14, 20, W - 28, H - 44); bigText(g, p.title, W / 2, 28, { scale: 1 });
  if (p.lines) p.lines.forEach((l, i) => txt(g, l, 28, 50 + i * 14, '#e8e4f8'));
  if (p.pad) p.pad.forEach(([ac, dd], i) => { const y = 48 + i * 18; drawGlyph(g, ac, 24, y); E.font.wrap(dd, W - 90, { font: 'tiny' }).forEach((l, k) => txt(g, l, 46, y + 2 + k * 8, '#e8e4f8', { font: 'tiny' })); });
  drawPrompts(g, [['move', 'PAGES'], ['cancel', 'BACK TO GAME']], W / 2, H - 22);
}
