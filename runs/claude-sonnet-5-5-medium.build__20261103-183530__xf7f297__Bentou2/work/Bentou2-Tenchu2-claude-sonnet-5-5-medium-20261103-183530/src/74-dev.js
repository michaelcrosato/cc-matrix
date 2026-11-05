/* ---- DEV MODE (pause menu -> Dev Mode): live balance sliders with a reset, and the usual testing tools ---- */
let devUI = null;
function devRows() {
  const rows = [];
  rows.push({ label: 'Close Dev Mode', pick: () => { B.devOpen = false; } });
  for (const k of Object.keys(B.TUNE_DEF)) {
    const [def, lo, hi, step, label] = B.TUNE_DEF[k];
    const set = v => { v = clamp(Math.round(v / step) * step, lo, hi); B.tune[k] = +v.toFixed(3); if (k === 'heroHp' && S) { S.hpMax = B.tune[k]; S.hp = Math.min(S.hp, S.hpMax); } };
    rows.push({ label, fast: true, slider: f => set(lo + (hi - lo) * f), frac: () => (B.tune[k] - lo) / (hi - lo), value: () => String(+B.tune[k].toFixed(2)), left: () => set(B.tune[k] - step), right: () => set(B.tune[k] + step) });
  }
  rows.push({ label: 'Reset sliders to defaults', pick: () => { B.resetTune(); S.hpMax = B.tune.heroHp; toast('Dev', 'Sliders reset to defaults', 1.5); } });
  const tog = (label, get, set) => ({ label, value: () => get() ? 'ON' : 'off', pick: () => set(!get()), left: () => set(!get()), right: () => set(!get()) });
  rows.push(tog('God mode', () => S.god, v => { S.god = v; }));
  rows.push(tog('Show sight cones', () => game.settings.cones !== false, v => game.settings.set('cones', v)));
  rows.push(tog('Debug overlay (bodies, minds)', () => S.devShow, v => { S.devShow = v; }));
  rows.push({ label: 'Heal to full', pick: () => { S.hp = S.hpMax; } });
  rows.push({ label: 'Refill the bento', pick: () => { S.bento.forEach(b => { b.n = B.TOOLS[b.tool].stack; }); } });
  rows.push({ label: 'Unlock every tool', pick: () => { B.save.tools = B.TOOL_ORDER.slice(); B.persist(); toast('Dev', 'All ten tools unlocked', 1.5); } });
  rows.push({ label: 'Unlock every mission', pick: () => { B.save.unlocked = 4; B.persist(); toast('Dev', 'All missions unlocked', 1.5); } });
  rows.push({ label: 'Teleport to the objective', pick: () => { const t = objTarget(); if (t) { Object.assign(S.hero, { x: t.x - 20, y: t.y - 20, z: t.z > 4 ? t.z : 0, vx: 0, vy: 0 }); game.cam.snap = true; } B.devOpen = false; } });
  rows.push({ label: 'Silence every guard', pick: () => { S.guards.forEach(g => { if (!g.dead && !g.civ) killGuard(g, 'dev'); }); } });
  rows.push({ label: 'Spawn a samurai nearby', pick: () => { const g = makeGuard({ type: 'samurai', at: [S.hero.x / T + 3, S.hero.y / T + 3], mode: 'post' }, S.guards.length); S.guards.push(g); B.devOpen = false; } });
  rows.push({ label: 'Ring the alarm bell', pick: () => { S.bellRunner = { g: S.guards.find(g => !g.dead) || { dead: false, stun: 0, sleep: 0 }, t: 0 }; B.devOpen = false; } });
  rows.push({ label: 'Complete all objectives', pick: () => { for (const o of S.m.objectives) if (o.kind !== 'exit') S.obj[o.id] = true; if (S.boss) { S.bossDone = true; S.boss.dead = true; } B.devOpen = false; toast('Dev', 'Objectives done: make for the exit', 2); } });
  rows.push({ label: 'Finish the mission now', pick: () => { B.devOpen = false; finishMission(true); } });
  return rows;
}
B.devUpdate = dt => {
  if (!devUI || devUI.s !== S) { devUI = new RowsUI(devRows(), { onCancel: () => { B.devOpen = false; } }); devUI.s = S; }
  devUI.update(dt); if (game.input.pressed('pause')) B.devOpen = false;
};
B.devHud = (g, r) => {
  if (S.devShow) for (const gd of S.guards) { const [sx, sy] = r.w(gd.x, gd.y, gd.z + 4); E.font.text(g, (gd.dead ? (gd.hidden ? 'hidden body' : 'body') : gd.mind.state + ' ' + gd.mind.level.toFixed(2) + ' hp' + Math.round(gd.hp)), mm(sx), mm(sy), gd.dead ? '#a0a0a0' : '#80ffa0', { align: 'center', shadow: '#000', outline: false }); }
  if (!B.devOpen || !devUI) return;
  const W = r.W, H = r.H, pw = Math.min(W - 16, 320), px0 = mm(W / 2 - pw / 2), rowH = 14, vis = Math.max(5, Math.floor((H - 50) / rowH)); const rows = devUI.rows;
  panel(g, px0 - 6, 4, pw + 12, H - 8, 1); bigText(g, 'DEV MODE', W / 2, 8, 2, ['#e8ffe8', '#80e0a0', '#40a060']);
  // scroll to keep the focus in view
  const first = clamp(devUI.i - Math.floor(vis / 2), 0, Math.max(0, rows.length - vis)); const keep = rows.slice();
  devUI.rows = rows.map((row, i) => Object.assign(Object.create(row), { hidden: i < first || i >= first + vis }));
  const real = devUI.i; devUI.draw(g, px0, 28, pw, rowH, {}); devUI.rows = keep; devUI.i = real;
  txt(g, 'Up/Down: move    Left/Right: adjust    ' + lbl('confirm') + ': pick    ' + lbl('cancel') + ': close', W / 2, H - 14, '#80a090', { align: 'center' });
};
