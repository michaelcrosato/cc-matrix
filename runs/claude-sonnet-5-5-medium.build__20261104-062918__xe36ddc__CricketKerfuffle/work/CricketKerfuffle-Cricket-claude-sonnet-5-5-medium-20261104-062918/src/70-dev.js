/* ---------- dev mode: reachable from the pause menu. Live sliders for the balance variables, a reset, and quick test tools ---------- */
const DEV = { open: false, i: 0, rows: [], mt: null, note: '' };
function devBuildRows() {
  const rows = [];
  for (const k in TUNING_DEF) rows.push({ kind: 'slider', key: k });
  const M = () => MS.M;
  rows.push({ kind: 'tool', label: 'RESET ALL SLIDERS TO DEFAULTS', fn: () => { tuningReset(); rebakeFloor(); DEV.note = 'Sliders reset'; } });
  rows.push({ kind: 'tool', label: 'FILL HYPE (BOTH SIDES)', fn: () => { for (const s of M().sides) s.hype = 100; DEV.note = 'Hype full'; } });
  rows.push({ kind: 'tool', label: 'SCORE A SIX NOW', fn: () => { M().ball.hitBy = 0; M().hit = M().hit || { q: 1 }; M().finish('boundary', { runs: 6, bonus: 0 }); } });
  rows.push({ kind: 'tool', label: 'SCORE A FOUR NOW', fn: () => { M().hit = M().hit || { q: 1 }; M().finish('boundary', { runs: 4, bonus: 0 }); } });
  rows.push({ kind: 'tool', label: 'TAKE A WICKET NOW', fn: () => { M().finish('wicket', { how: 'bowled', who: 'Test Dummy' }); } });
  rows.push({ kind: 'tool', label: 'CALL A WIDE', fn: () => { M().finish('wide'); } });
  rows.push({ kind: 'tool', label: 'SPAWN A COW', fn: () => { const m = M(); if (!m.cow) m.cow = { x: CX + 150, y: MY + 90, vx: 0, vy: 0, tx: CX + 120, ty: MY + 150, mood: 0, stopped: 0, moo: 0 }; DEV.note = 'Moo.'; } });
  rows.push({ kind: 'tool', label: 'TOGGLE RAIN', fn: () => { M().wet = !M().wet; M().wetLeft = 3; } });
  rows.push({ kind: 'tool', label: 'NEXT BALL IS GOLDEN', fn: () => { M().goldenNext = true; DEV.note = 'Golden ball next'; } });
  rows.push({ kind: 'tool', label: 'SKIP THE INNINGS', fn: () => { const m = M(); m.sideBat().balls = m.overs * 6 - 1; m.finish('runs', { runs: 0 }); } });
  rows.push({ kind: 'tool', label: 'WIN THE MATCH', fn: () => { const m = M(); m.sides[0].score = m.sides[1].score + 10; m.endMatch('dev'); } });
  rows.push({ kind: 'tool', label: 'LOSE THE MATCH', fn: () => { const m = M(); m.sides[1].score = m.sides[0].score + 10; m.endMatch('dev'); } });
  rows.push({ kind: 'toggle', label: 'GOD MODE (YOU CANNOT BE OUT)', get: () => DEVFLAGS.god, fn: () => { DEVFLAGS.god = !DEVFLAGS.god; } });
  rows.push({ kind: 'toggle', label: 'SLOW MOTION (0.25×)', get: () => DEVFLAGS.slow, fn: () => { DEVFLAGS.slow = !DEVFLAGS.slow; game.timeScale = DEVFLAGS.slow ? .25 : 1; } });
  rows.push({ kind: 'toggle', label: 'SHOW FIELDER RINGS', get: () => DEVFLAGS.debugDraw, fn: () => { DEVFLAGS.debugDraw = !DEVFLAGS.debugDraw; } });
  rows.push({ kind: 'tool', label: 'CLOSE DEV MODE', fn: () => { DEV.open = false; } });
  return rows;
}
function devOpen() { if (!MS || MS.attract || MS.hub) return; DEV.rows = devBuildRows(); DEV.i = 0; DEV.open = true; DEV.note = ''; DEV.mt = game.input.mouse.t; game.input.consumeAll(); }
function devSet(row, v) {
  const d = TUNING_DEF[row.key]; v = clamp(v, d[1], d[2]); const step = (d[2] - d[1]) / 40; v = Math.round(v / step * 1) * step; v = +v.toFixed(4);
  TV[row.key] = clamp(v, d[1], d[2]); if (row.key === 'boundaryScale') rebakeFloor();
}
function devUpdate(dt) {
  if (!DEV.open) return false;
  const I = game.input, n = DEV.rows.length, row = DEV.rows[DEV.i];
  if (I.repeat('up')) DEV.i = (DEV.i + n - 1) % n;
  if (I.repeat('down')) DEV.i = (DEV.i + 1) % n;
  if (DEV._hit && I.mouse.t !== DEV.mt) { DEV.mt = I.mouse.t; const p = I.pointer(); if (p) for (let k = 0; k < DEV._hit.length; k++) { const h = DEV._hit[k]; if (p[1] >= h.y0 && p[1] <= h.y1 && p[0] < h.x1) DEV.i = h.i; } }
  const R = DEV.rows[DEV.i];
  if (R.kind === 'slider') {
    const d = TUNING_DEF[R.key], step = (d[2] - d[1]) / 40, dir = (I.repeat('right', .3, .05) ? 1 : 0) - (I.repeat('left', .3, .05) ? 1 : 0);
    if (dir) devSet(R, TV[R.key] + dir * step);
    const c = I.clicked(); if (c && DEV._hit) for (const h of DEV._hit) if (h.i === DEV.i && c[1] >= h.y0 && c[1] <= h.y1 && c[0] >= h.bx0 && c[0] <= h.bx1) devSet(R, d[1] + (c[0] - h.bx0) / (h.bx1 - h.bx0) * (d[2] - d[1]));
    if (I.pressed('confirm')) { TV[R.key] = d[0]; if (R.key === 'boundaryScale') rebakeFloor(); DEV.note = d[3] + ' reset'; }
  } else {
    const c = I.clicked(); let hitClick = false;
    if (c && DEV._hit) for (const h of DEV._hit) if (h.i === DEV.i && c[1] >= h.y0 && c[1] <= h.y1 && c[0] < h.x1) hitClick = true;
    if (I.pressed('confirm') || hitClick) { R.fn(); sfx('confirm'); }
  }
  if (I.pressed('cancel') || I.pressed('pause')) { DEV.open = false; sfx('cancel'); }
  I.consumeAll();
  return true;
}
function devDraw(r) {
  if (!DEV.open) return;
  const w = 268, vis = Math.floor((r.H - 52) / 12), top = clamp(DEV.i - Math.floor(vis / 2), 0, Math.max(0, DEV.rows.length - vis));
  DEV._hit = [];
  r.overlay(g => {
    panel(g, 4, 4, w, r.H - 8, { alpha: .93 });
    E.font.text(g, 'DEV MODE', 12, 8, '#ff9a30', { scale: 2, outline: false, shadow: '#000' });
    E.font.text(g, glyph('cancel') + ' close • ← → adjust • ' + glyph('confirm') + ' reset/run', 12, 26, DIM, { outline: false });
    for (let k = 0; k < vis; k++) {
      const i = top + k; if (i >= DEV.rows.length) break; const R = DEV.rows[i], y = 38 + k * 12, sel = i === DEV.i;
      if (sel) px.rect(g, 8, y - 1, w - 8, 11, '#3a4a70');
      let label = R.label, val = '';
      if (R.kind === 'slider') { const d = TUNING_DEF[R.key]; label = d[3]; val = (+TV[R.key]).toFixed(d[2] <= 3 ? 2 : 0); }
      if (R.kind === 'toggle') val = R.get() ? 'ON' : 'off';
      E.font.text(g, label, 12, y, sel ? GOLD : INK, { outline: false, shadow: '#000' });
      let bx0 = 0, bx1 = 0;
      if (R.kind === 'slider') {
        const d = TUNING_DEF[R.key]; bx0 = 150; bx1 = 232; const f = (TV[R.key] - d[1]) / (d[2] - d[1]);
        px.rect(g, bx0, y + 3, bx1 - bx0, 4, '#10141c'); px.rect(g, bx0, y + 3, Math.round((bx1 - bx0) * clamp(f, 0, 1)), 4, sel ? '#ffd860' : '#58a0d8'); px.rect(g, bx0 + Math.round((bx1 - bx0) * clamp(f, 0, 1)) - 1, y + 1, 3, 8, '#fff');
        E.font.text(g, val, 236, y, TV[R.key] !== d[0] ? '#ffb060' : DIM, { outline: false, shadow: '#000' });
      } else if (val) E.font.text(g, val, 236, y, val === 'ON' ? '#58ff70' : DIM, { outline: false });
      DEV._hit.push({ i, y0: y - 1, y1: y + 10, x1: w, bx0, bx1 });
    }
    if (DEV.note) E.font.text(g, DEV.note, 12, r.H - 14, '#7aff9a', { outline: false });
  });
}
