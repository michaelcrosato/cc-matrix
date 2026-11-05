// Dev mode (opened from the pause menu): live tuning sliders with a reset, cheats, jumps, spawning, and the debug handle.
(() => {
const E = My3D2dge, WP = globalThis.WP, px = E.px, { clamp } = WP;
const W = WP.W, H = WP.H;
const dev = WP.dev = { open: false, frozen: false, slow: 1, focus: 0, scroll: 0, spawnIx: 0, jumpOp: 0, rows: [], msg: '', msgT: 0 };
const SPAWNS = ['rifleman', 'popper', 'knifer', 'grenadier', 'heavy', 'sniper', 'jeep', 'boat', 'skiff', 'heli', 'civ', 'hostage', 'goat', 'hen', 'crate', 'barrel', 'fuel', 'pk_mag', 'pk_gren', 'pk_med', 'pk_fury', 'pk_tnt', 'pk_medal'];
const G = () => WP.G;
dev.cheatsOn = () => { const c = G().cheats || {}; return !!(c.inv || c.ammo) || dev.frozen || dev.slow !== 1 || G().showHit; };
dev.refreshCheats = () => { const g = G(); g.cheats = g.cheats || {}; if (g.sim) Object.assign(g.sim.cheat, { inv: !!g.cheats.inv, ammo: !!g.cheats.ammo }); };
const toast = s => { dev.msg = s; dev.msgT = 2.5; };
function build() {
  const g = G(), rows = [];
  g.cheats = g.cheats || {};
  const tog = (label, get, set) => rows.push({ t: 'tog', label, get, set });
  const act = (label, fn, val) => rows.push({ t: 'act', label, fn, val });
  rows.push({ t: 'head', label: 'DEV MODE' });
  act('CLOSE DEV MODE', () => { dev.open = false; });
  rows.push({ t: 'head', label: 'CHEATS' });
  tog('GOD MODE', () => !!g.cheats.inv, v => { g.cheats.inv = v; dev.refreshCheats(); });
  tog('INFINITE AMMO', () => !!g.cheats.ammo, v => { g.cheats.ammo = v; dev.refreshCheats(); });
  tog('FREEZE WORLD', () => dev.frozen, v => { dev.frozen = v; });
  tog('SHOW HIT SHAPES', () => !!g.showHit, v => { g.showHit = v; });
  rows.push({ t: 'sld', label: 'TIME SCALE', get: () => dev.slow, set: v => { dev.slow = v; }, min: .1, max: 1.5, step: .05 });
  rows.push({ t: 'head', label: 'TOOLS' });
  act('REFILL AMMO AND GRENADES', () => { for (const p of g.sim.players) if (p.active) { p.mag = WP.T.magSize; p.spares = 9; p.grenades = 9; } toast('REFILLED'); });
  act('HEAL ALL', () => { for (const p of g.sim.players) if (p.active) { p.dmg = 0; p.down = false; } toast('HEALED'); });
  act('GIVE FURY', () => { for (const p of g.sim.players) if (p.active) p.fury = WP.T.furyTime; });
  act('KILL ALL ENEMIES', () => { for (const e of g.sim.ents.slice()) if (e.ty.q || e.ty.kind === 'proj') { e.hp = 0; g.sim.kill(e, g.sim.players[0]); } });
  act('SKIP TO BOSS', () => { g.sim.skipToBoss(); toast('BOSS NEXT'); });
  act('RAIL FORWARD 200', () => { g.sim.jump(g.sim.d + 200); toast('RAIL ' + Math.round(g.sim.d)); });
  rows.push({ t: 'pick', label: 'JUMP TO OPERATION', get: () => dev.jumpOp + 1, step: d => { dev.jumpOp = (dev.jumpOp + d + WP.STAGES.length) % WP.STAGES.length; }, fn: () => { g.nSeats = Math.max(g.nSeats, 1); g.startOp(dev.jumpOp); g.leaving = false; dev.refreshCheats(); toast('OP ' + (dev.jumpOp + 1)); } });
  rows.push({ t: 'pick', label: 'SPAWN AT CROSSHAIR', get: () => SPAWNS[dev.spawnIx], step: d => { dev.spawnIx = (dev.spawnIx + d + SPAWNS.length) % SPAWNS.length; }, fn: () => dev.spawnHere(SPAWNS[dev.spawnIx]) });
  act('PRINT SPAWN LINE', () => { const l = dev.spawnLine(SPAWNS[dev.spawnIx]); try { console.log(l); navigator.clipboard && navigator.clipboard.writeText(l); } catch (e) { } toast(l); });
  rows.push({ t: 'head', label: 'BALANCE' });
  act('RESET ALL TO DEFAULTS', () => { WP.resetTuning(); dev.slow = 1; toast('TUNING RESET'); });
  let grp = '';
  for (const [key, label, def, min, max, step, group] of WP.TUNING) {
    if (group !== grp) { grp = group; rows.push({ t: 'head', label: group }); }
    rows.push({ t: 'sld', label, get: () => WP.T[key], set: v => { WP.T[key] = v; }, min, max, step, def, key });
  }
  dev.rows = rows;
}
dev.floorPoint = () => { const g = G(), a = g.aim[0], s = g.sim, fl = s.m7.toFloor(a.x, a.y); return fl ? { lx: Math.round(fl[0] - s.cam.x), dz: Math.round(s.cam.y - fl[1]) } : { lx: 0, dz: 200 }; };
dev.spawnHere = type => {
  const s = G().sim, f = dev.floorPoint();
  if (type.startsWith('pk_')) { s.pickup(type.slice(3), s.cam.x + f.lx, s.cam.y - f.dz, 10, {}); return; }
  s.spawn(type, { lx: f.lx, dz: Math.max(90, f.dz), tx: f.lx });
};
dev.spawnLine = type => { const f = dev.floorPoint(); return `['${type}', { lx: ${f.lx}, dz: ${f.dz} }]`; };
const isHead = r => r.t === 'head';
function step(dir) {
  const r = dev.rows[dev.focus]; if (!r) return;
  if (r.t === 'sld') { const v = clamp(Math.round((r.get() + dir * r.step) / r.step) * r.step, r.min, r.max); r.set(+v.toFixed(3)); }
  else if (r.t === 'pick') r.step(dir); else if (r.t === 'tog') r.set(!r.get());
}
function move(d) { let n = dev.focus; for (let k = 0; k < dev.rows.length; k++) { n = (n + d + dev.rows.length) % dev.rows.length; if (!isHead(dev.rows[n])) break; } dev.focus = n; }
dev.update = (dt, sim) => {
  if (!dev.rows.length) { build(); move(1); }
  if (dev.msgT > 0) dev.msgT -= dt;
  const I = WP.game.input;
  if (I.repeat('down')) move(1); if (I.repeat('up')) move(-1);
  if (I.repeat('left')) step(-1); if (I.repeat('right')) step(1);
  const r = dev.rows[dev.focus];
  if (I.pressed('confirm') && r) { if (r.t === 'act') r.fn(); else if (r.t === 'tog') r.set(!r.get()); else if (r.t === 'pick') r.fn(); }
  if (I.pressed('cancel')) dev.open = false;
  // mouse: hover moves focus, click acts, sliders set by position
  const pt = I.pointer(), vis = dev.visible();
  if (pt && I.mouse && I.mouse.t !== dev.mt) { dev.mt = I.mouse.t; for (const v of vis) if (pt[0] >= 6 && pt[0] < 244 && pt[1] >= v.y && pt[1] < v.y + 11 && !isHead(v.r)) dev.focus = dev.rows.indexOf(v.r); }
  const c = I.clicked && I.clicked();
  if (c) for (const v of vis) if (c[0] >= 6 && c[0] < 244 && c[1] >= v.y && c[1] < v.y + 11 && !isHead(v.r)) {
    dev.focus = dev.rows.indexOf(v.r); const rr = v.r;
    if (rr.t === 'act') rr.fn(); else if (rr.t === 'tog') rr.set(!rr.get()); else if (rr.t === 'pick') rr.fn();
    else if (rr.t === 'sld' && c[0] >= 140) { const u = clamp((c[0] - 140) / 100, 0, 1); rr.set(+(Math.round((rr.min + u * (rr.max - rr.min)) / rr.step) * rr.step).toFixed(3)); }
  }
  // keep the focus in view
  const per = 19; if (dev.focus < dev.scroll) dev.scroll = dev.focus; if (dev.focus >= dev.scroll + per) dev.scroll = dev.focus - per + 1; dev.scroll = Math.max(0, dev.scroll);
};
dev.visible = () => { const out = [], per = 19; let y = 18; for (let i = dev.scroll; i < Math.min(dev.rows.length, dev.scroll + per); i++) { out.push({ r: dev.rows[i], y }); y += 11; } return out; };
dev.draw = (g, world) => {
  if (!dev.rows.length) { build(); move(1); }
  px.blend(g, .82, 'normal', () => px.rect(g, 0, 0, 250, H, '#0a0c18'));
  px.rect(g, 249, 0, 1, H, '#6a5acd');
  for (const v of dev.visible()) {
    const r = v.r, y = v.y, foc = dev.rows.indexOf(r) === dev.focus;
    if (r.t === 'head') { E.font.text(g, r.label, 8, y + 2, '#ff80ff', { font: 'tiny' }); px.rect(g, 8, y + 9, 234, 1, '#3a2a5a'); continue; }
    if (foc) px.rect(g, 6, y, 238, 11, '#2a2a6a');
    E.font.text(g, r.label, 10, y + 2, foc ? '#ffe080' : '#d0d4e0', { outline: false });
    if (r.t === 'tog') E.font.text(g, r.get() ? 'ON' : 'OFF', 238, y + 2, r.get() ? '#60ff90' : '#8a8a9a', { align: 'right' });
    else if (r.t === 'pick') E.font.text(g, '< ' + r.get() + ' >', 238, y + 2, '#a0d0ff', { align: 'right' });
    else if (r.t === 'sld') { const u = (r.get() - r.min) / (r.max - r.min); px.rect(g, 140, y + 4, 70, 3, '#2a2a3a'); px.rect(g, 140, y + 4, Math.round(70 * u), 3, r.def !== undefined && Math.abs(r.get() - r.def) > 1e-6 ? '#ffb040' : '#60a0ff'); E.font.text(g, String(+r.get().toFixed(2)), 238, y + 2, '#ffffff', { align: 'right' }); }
  }
  E.font.text(g, 'UP DOWN MOVE  LEFT RIGHT CHANGE  ' + WP.game.input.label('confirm') + ' USE  ' + WP.game.input.label('cancel') + ' CLOSE', 6, H - 10, '#8a8aa8', { font: 'tiny' });
  if (dev.msgT > 0) E.font.text(g, dev.msg, 260, 12, '#ffe080', { outline: '#000' });
  if (world) E.font.text(g, 'OP ' + (world.opIx + 1) + '  D ' + Math.round(world.d) + '  ' + world.phase.toUpperCase() + '  ENTS ' + world.ents.length, 260, 24, '#c0c8ff', { outline: '#000', font: 'tiny' });
  // aim marker for spawn
  const a = G().aim[0]; px.line(g, a.x - 6, a.y, a.x + 6, a.y, '#ff80ff', 1); px.line(g, a.x, a.y - 6, a.x, a.y + 6, '#ff80ff', 1);
};
// dev-mode crosshair follows the mouse or stick even while the sim is held
WP.makeDebug = (game, g) => ({
  snapshot: () => Object.assign({ scene: game.sceneName, errors: game.errors.length, role: g.role, dev: dev.open }, g.sim ? g.sim.snapshot() : {}),
  sim: () => g.sim, G: () => g,
  jump: (op, d) => { g.startOp(op); if (d === 'boss') g.sim.skipToBoss(); else if (d) g.sim.jump(d); dev.refreshCheats(); },
  cheat: (name, on) => { g.cheats = g.cheats || {}; g.cheats[name] = on; dev.refreshCheats(); },
  tune: (key, v) => { WP.T[key] = v; },
  spawn: (type, o) => g.sim.spawn(type, o),
  aim: (pid, x, y) => { g.aim[pid].x = x; g.aim[pid].y = y; if (g.sim) { g.sim.players[pid].x = x; g.sim.players[pid].y = y; } },
  dev
});
})();
