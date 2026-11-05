// 54-dev.js — dev mode (from the pause menu): a canvas panel generated from a descriptor list. Six tabs of live
// sliders, toggles and actions; changed values show gold with the default grey; RESET ALL TO DEFAULTS at the bottom.
// Every slider's key is a path into `tune`, so adding a variable takes one line.
const getPath = (o, p) => p.split('.').reduce((a, k) => a[k], o), setPath = (o, p, v) => { const ks = p.split('.'); const l = ks.pop(); ks.reduce((a, k) => a[k], o)[l] = v; };
const DEVTABS = ['PLAYER', 'WEAPONS', 'ENEMIES', 'TIME', 'VIEW', 'ACTIONS'];
const sl = (tab, label, path, min, max, step) => ({ tab, kind: 'slider', label, path, min, max, step });
const tg = (tab, label, path) => ({ tab, kind: 'toggle', label, path });
const ac = (tab, label, fn, o) => Object.assign({ tab, kind: 'action', label, fn }, o);
const Dev = {
  open: false, tab: 0, i: 0, conf: 0, free: false, cam: { x: 0, y: 0, z: 40, yaw: 0, pitch: 0 }, jumpI: 0, spawnI: 0, rects: [], hold: 0, msg: '', msgT: 0,
  items: [], 
  build() {
    const S = () => Run.sim, allScenes = () => { const o = []; for (const s of [1, 2, 3, 0]) for (const id of reg('stage', s).scenes) o.push([s, id]); return o; }, enemyTypes = ['deckhand', 'marine', 'redtide', 'quartermaster', 'grenadier', 'rocketeer', 'shield', 'rusher', 'sniper', 'drone', 'gunner', 'target'];
    this.allScenes = allScenes; this.enemyTypes = enemyTypes;
    this.items = [
      tg(0, 'God mode', 'player.godMode'), tg(0, 'Infinite ammo', 'player.infAmmo'), sl(0, 'Start lives', 'player.lives', 1, 9, 1), sl(0, 'I-frames (s)', 'player.iframes', .5, 3, .1), sl(0, 'Cover in (s)', 'player.coverIn', .05, .4, .01), sl(0, 'Cover out (s)', 'player.coverOut', .05, .4, .01), sl(0, 'Reload (s)', 'player.reload', .1, 1, .05), sl(0, 'Pad aim speed', 'player.padSpeed', .5, 3, .1), sl(0, 'Aim assist', 'player.assist', 0, 1, .05),
      sl(1, 'Handgun damage', 'weapon.hgDmg', .5, 3, .1), sl(1, 'MG rate /s', 'weapon.mgRate', 4, 20, 1), sl(1, 'MG damage', 'weapon.mgDmg', .1, 1, .05), sl(1, 'Shotgun pellets', 'weapon.sgPellets', 4, 14, 1), sl(1, 'Shotgun spread °', 'weapon.sgSpread', 2, 12, .5), sl(1, 'GL radius', 'weapon.glRadius', 24, 96, 4), sl(1, 'GL damage', 'weapon.glDmg', 2, 12, .5), sl(1, 'Ammo pickups ×', 'weapon.ammoMul', .5, 3, .1),
      sl(2, 'Enemy HP ×', 'enemy.hpMul', .5, 3, .1), sl(2, 'Threat chance ×', 'enemy.threatMul', 0, 3, .1), sl(2, 'Telegraph ×', 'enemy.telegraphMul', .5, 2, .05), sl(2, 'Fire interval ×', 'enemy.fireMul', .5, 2, .05), sl(2, 'Max threats (0 = auto)', 'enemy.maxThreats', 0, 4, 1), sl(2, 'Minimum gap (s)', 'enemy.minGap', .1, 1, .05), sl(2, 'Reaction delay ×', 'enemy.reactMul', .5, 2, .05), sl(2, 'Boss HP ×', 'enemy.bossHp', .25, 3, .05),
      tg(3, 'Freeze timer', 'time.freeze'), sl(3, 'Scene time ×', 'time.sceneMul', .5, 2, .05), sl(3, 'Elite bonus (s)', 'time.elite', 0, 5, .5), sl(3, 'Refill after time-up %', 'time.refill', 20, 100, 5), sl(3, 'Game speed', 'time.speed', .25, 1.5, .05),
      sl(4, 'FOV', 'view.fov', 45, 75, 1), tg(4, 'Show hit volumes', 'view.hitVol'), tg(4, 'Colliders', 'view.colliders'), tg(4, 'Rail and cover points', 'view.rail'), tg(4, 'AI state labels', 'view.ai'), tg(4, 'Threat debug', 'view.threats'), tg(4, 'Perf overlay', 'view.perf'), tg(4, 'Free camera', 'view.freecam'), tg(4, 'Hide HUD', 'view.hideHud'),
      ac(5, 'Restart scene', () => { const s = S(); s.jump(s.stage, s.sceneId); }), ac(5, 'Next scene', () => { const s = S(), st = reg('stage', s.stage), i = (s.sceneIdx + 1) % st.scenes.length; s.jump(s.stage, st.scenes[i]); }), ac(5, 'Previous scene', () => { const s = S(), st = reg('stage', s.stage), i = (s.sceneIdx + st.scenes.length - 1) % st.scenes.length; s.jump(s.stage, st.scenes[i]); }),
      { tab: 5, kind: 'cycle', label: 'Jump to', get: () => this.allScenes()[this.jumpI][1], step: d => { this.jumpI = (this.jumpI + d + this.allScenes().length) % this.allScenes().length; }, fn: () => { const [st, id] = this.allScenes()[this.jumpI]; const s = S(); if (st !== s.stage) { Run.stage = st; const ns = Run.newSim(st, id, { mode: s.mode }); Pres.reset(); resetHud(); } else s.jump(st, id); this.open = false; } },
      ac(5, 'Kill all', () => { const s = S(); for (const e of s.enemies.slice()) if (!e.dead && !e.civ) s.killEnemy(e, s.players[0], 0, null, 'torso'); if (s.boss && !s.boss.dead) for (const k in s.boss.parts) { s.boss.parts[k].hp = 0; s.boss.parts[k].dead = true; } }),
      { tab: 5, kind: 'cycle', label: 'Spawn enemy', get: () => enemyTypes[this.spawnI], step: d => { this.spawnI = (this.spawnI + d + enemyTypes.length) % enemyTypes.length; }, fn: () => { const s = S(), free = s.covers.filter(c => !c.hidden && !s.enemies.some(e => !e.dead && e.cover === c)); const c = free[0] || s.covers[0]; const t = enemyTypes[this.spawnI], d = reg('enemy', t); if (d.ai === 'peek' && c) s.spawnEnemy(t, c.id, {}); else if (d.ai === 'route') s.spawnEnemy(t, null, { route: [[380, -80, 0], [380, 80, 0]], drop: 'mg' }); else if (d.ai === 'fly') s.spawnEnemy(t, null, { at: [220, 0, 0], z: 44 }); else if (d.ai === 'rush' || d.ai === 'shield') s.spawnEnemy(t, c ? c.id : null, { from: [360, 0, 0], advance: [300, 260] }); else s.spawnEnemy(t, c ? c.id : null, {}); } },
      ac(5, 'All weapons + full ammo', () => { for (const p of S().players) { p.ammo = [9, 240, 36, 6]; p.mag = 9; p.seen = { 1: 1, 2: 1, 3: 1 }; } }), ac(5, '+1 life', () => { S().players[0].lives++; }), ac(5, 'Lose a life', () => { const s = S(); const g = s.cheats.god; s.cheats.god = 0; const k = tune.player.godMode; tune.player.godMode = 0; s.players[0].inv = 0; s.loseLife(s.players[0], 'dev'); tune.player.godMode = k; s.cheats.god = g; }),
      ac(5, 'Trigger a threat on me', () => { const s = S(); s.newThreat({ id: 'dev' }, 'bullet', 1, { target: 0, sp: [200, 0, 30] }); }), ac(5, 'Clear stage', () => { const s = S(); s.phase = 'stageclear'; s.emit('stageclear', { stage: s.stage }); }), ac(5, 'Game over', () => { const s = S(); for (const p of s.players) { p.down = true; p.contFail = true; } s.over = true; s.phase = 'over'; }),
      ac(5, 'Bot plays (Autopilot)', () => { Run.botOn = !Run.botOn; Bot.setStyle('fair'); this.msg = 'Autopilot ' + (Run.botOn ? 'ON' : 'OFF'); this.msgT = 2; }), ac(5, 'Add a P2 bot', () => { Run.botP2 = !Run.botP2; this.msg = 'P2 bot ' + (Run.botP2 ? 'ON (use CO-OP for a split screen)' : 'OFF'); this.msgT = 2; }),
      ac(5, 'Voice test', () => { let t = 0; for (const id of ['kai', 'rook', 'mari', 'juno', 'hale', 'krake', 'hammerhead']) { setTimeout(() => Voice.say('Hang on! CREST is on it, kid.', id), t); t += 1900; } }), ac(5, 'Music test (next song)', () => { const ids = Object.keys(TC.REG.song); this.songI = ((this.songI || 0) + 1) % ids.length; musicFor(game, ids[this.songI], {}); this.msg = 'Song: ' + ids[this.songI]; this.msgT = 2; })
    ];
    this.items.push({ tab: 5, kind: 'reset', label: 'RESET ALL TO DEFAULTS' });
  },
  vis() { return this.items.filter(it => it.tab === this.tab || it.kind === 'reset'); },
  def(it) { return it.path ? getPath(TUNE, it.path) : null; },
  adjust(it, dir, fast) { if (it.kind === 'slider') { const v = getPath(tune, it.path), st = it.step * (fast ? 4 : 1); setPath(tune, it.path, clamp(Math.round((v + dir * st) / it.step) * it.step, it.min, it.max)); } else if (it.kind === 'toggle') setPath(tune, it.path, getPath(tune, it.path) ? 0 : 1); else if (it.kind === 'cycle') it.step(dir); },
  run(it) { if (it.kind === 'toggle') this.adjust(it, 1); else if (it.kind === 'action' || it.kind === 'cycle') { try { it.fn(); } catch (e) { game.fail('dev', e); } } else if (it.kind === 'reset') { if (this.conf) { resetTune(); this.conf = 0; this.msg = 'All values restored.'; this.msgT = 2; } else { this.conf = 1; this.msg = 'Press again to confirm reset'; this.msgT = 2.5; } } },
  update(dt) {
    if (!this.items.length) this.build(); const P = game._players || [game.input], I = P[0], v = this.vis(); this.msgT = Math.max(0, this.msgT - dt); this.rects = this.rects || [];
    if (P.some(p => p.pressed('cancel')) || P.some(p => p.pressed('pause'))) { this.open = false; P.forEach(p => p.consumeAll()); return; }
    if (P.some(p => p.pressed('tab') || p.pressed('next'))) { this.tab = (this.tab + 1) % 6; this.i = 0; this.conf = 0; SND.play('select'); } if (P.some(p => p.pressed('tabPrev') || p.pressed('prev'))) { this.tab = (this.tab + 5) % 6; this.i = 0; this.conf = 0; SND.play('select'); }
    if (P.some(p => p.repeat('up'))) { this.i = (this.i + v.length - 1) % v.length; this.conf = 0; SND.play('select'); } if (P.some(p => p.repeat('down'))) { this.i = (this.i + 1) % v.length; this.conf = 0; SND.play('select'); }
    const it = v[this.i]; if (!it) return; const fast = this.hold > 1;
    if (P.some(p => p.repeat('left', .3, .06))) { this.adjust(it, -1, fast); this.hold += .1; } if (P.some(p => p.repeat('right', .3, .06))) { this.adjust(it, 1, fast); this.hold += .1; } if (!P.some(p => p.down('left') || p.down('right'))) this.hold = 0;
    if (P.some(p => p.pressed('confirm'))) { this.run(it); P.forEach(p => p.consumeAll()); }
    if (P.some(p => p.pressed('reset')) && it.path) { setPath(tune, it.path, this.def(it)); }
    const pt = I.pointer(); if (pt) { if (I.mouse.t !== this.mt) { this.mt = I.mouse.t; this.rects.forEach((q, k) => { if (pt[0] >= q.x && pt[0] < q.x + q.w && pt[1] >= q.y && pt[1] < q.y + q.h) this.i = k; }); } }
    const c = I.clicked(); if (c) { if (c[1] < 18) { const k = Math.floor((c[0] - 8) / 52); if (k >= 0 && k < 6) { this.tab = k; this.i = 0; } } this.rects.forEach((q, k) => { if (c[0] >= q.x && c[0] < q.x + q.w && c[1] >= q.y && c[1] < q.y + q.h) { this.i = k; const t2 = v[k]; if (t2.kind === 'slider') { const f = clamp((c[0] - q.sx) / q.sw, 0, 1); setPath(tune, t2.path, clamp(Math.round((t2.min + (t2.max - t2.min) * f) / t2.step) * t2.step, t2.min, t2.max)); } else this.run(t2); } }); }
    if (I.down('fire') && I.aimSource === 'mouse' && pt) { const t2 = v[this.i]; const q = this.rects[this.i]; if (t2 && t2.kind === 'slider' && q && pt[0] >= q.sx - 4 && pt[0] <= q.sx + q.sw + 4 && pt[1] >= q.y && pt[1] < q.y + q.h) { const f = clamp((pt[0] - q.sx) / q.sw, 0, 1); setPath(tune, t2.path, clamp(Math.round((t2.min + (t2.max - t2.min) * f) / t2.step) * t2.step, t2.min, t2.max)); } }
  },
  draw(g, W, H, sim) {
    if (!this.items.length) this.build(); px.rect(g, 0, 0, W, H, '#000000b8'); const v = this.vis(); this.rects = [];
    for (let k = 0; k < 6; k++) { px.rect(g, 8 + k * 52, 2, 50, 13, k === this.tab ? '#1a4f9c' : '#10244a'); T(g, DEVTABS[k], 33 + k * 52, 5, k === this.tab ? '#ffd36a' : '#9fb8e8', { scale: 1, align: 'center' }); }
    T(g, 'DEV MODE  [' + game.input.label('tab') + '/' + game.input.label('tabPrev') + '] TAB   [' + game.input.label('reset') + '] RESET ITEM   [Backspace / ' + game.input.label('cancel') + '] CLOSE', 8, 18, '#6a7ea8', { scale: 1 });
    const per = 12, first = Math.max(0, Math.min(this.i - 6, v.length - 15)), rowH = 11;
    for (let k = first; k < Math.min(v.length, first + 15); k++) {
      const it = v[k], y = 30 + (k - first) * rowH, sel = k === this.i; px.rect(g, 8, y - 1, W - 16, rowH, sel ? '#1a3a78' : '#0a1428');
      T(g, it.label, 14, y + 1, sel ? '#ffd36a' : '#ffffff', { scale: 1 });
      if (it.kind === 'slider') { const val = getPath(tune, it.path), d = this.def(it), ch = Math.abs(val - d) > 1e-9, sx = W - 190, sw = 110; px.rect(g, sx, y + 4, sw, 2, '#2a3350'); px.rect(g, sx, y + 4, sw * (val - it.min) / (it.max - it.min), 2, ch ? '#ffd36a' : '#3aa0e8'); px.rect(g, sx + sw * (val - it.min) / (it.max - it.min) - 1, y + 1, 3, 8, ch ? '#ffd36a' : '#ffffff'); T(g, String(+val.toFixed(2)), W - 76, y + 1, ch ? '#ffd36a' : '#ffffff', { scale: 1, align: 'right' }); if (ch) T(g, '(' + +d.toFixed(2) + ')', W - 14, y + 1, '#6a7ea8', { scale: 1, align: 'right' }); this.rects.push({ x: 8, y: y - 1, w: W - 16, h: rowH, sx, sw }); }
      else if (it.kind === 'toggle') { const val = getPath(tune, it.path), d = this.def(it), ch = val !== d; T(g, val ? 'ON' : 'OFF', W - 14, y + 1, ch ? '#ffd36a' : val ? '#7cff8a' : '#6a7ea8', { scale: 1, align: 'right' }); this.rects.push({ x: 8, y: y - 1, w: W - 16, h: rowH, sx: 0, sw: 1 }); }
      else if (it.kind === 'cycle') { T(g, '◂ ' + it.get() + ' ▸', W - 14, y + 1, '#9fe3ff', { scale: 1, align: 'right' }); this.rects.push({ x: 8, y: y - 1, w: W - 16, h: rowH, sx: 0, sw: 1 }); }
      else { T(g, it.kind === 'reset' && this.conf ? 'CONFIRM?' : '▸', W - 14, y + 1, it.kind === 'reset' ? '#ff8a8a' : '#9fe3ff', { scale: 1, align: 'right' }); this.rects.push({ x: 8, y: y - 1, w: W - 16, h: rowH, sx: 0, sw: 1 }); }
    }
    if (this.msgT > 0) T(g, this.msg, W / 2, H - 12, '#7cff8a', { scale: 1, align: 'center' });
  }
};
function devOverlays(g, sim, rect) {
  if (!sim.scene) return; const C = R3.cam; if (!C) return;
  if (tune.view.colliders) for (const b of sim.colliders()) { const pts = [[b.x0, b.y0, b.z1], [b.x1, b.y0, b.z1], [b.x1, b.y1, b.z1], [b.x0, b.y1, b.z1]].map(p => R3.proj(p[0], p[1], p[2])); if (pts.every(Boolean)) for (let i = 0; i < 4; i++) px.line(g, pts[i][0] | 0, pts[i][1] | 0, pts[(i + 1) % 4][0] | 0, pts[(i + 1) % 4][1] | 0, '#00ff80', 1); }
  if (tune.view.rail) for (const c of sim.covers) { const p = R3.proj(c.x, c.y, (c.z0 || 0) + c.h); if (p) { px.disc(g, p[0], p[1], 2, '#ffff00'); T(g, c.id, p[0], p[1] + 3, '#ffff00', { scale: 1, align: 'center' }); } }
  if (tune.view.ai) for (const e of sim.enemies) { if (e.dead) continue; const p = R3.proj(e.x, e.y, e.foot + 30); if (p) T(g, e.type + ' ' + e.st + ' ' + e.hp.toFixed(1), p[0], p[1], '#ff80ff', { scale: 1, align: 'center' }); }
  if (tune.view.threats) for (const th of sim.threats) { const p = th.sp && R3.proj(th.sp[0], th.sp[1], th.sp[2]); if (p) T(g, 't' + th.id + ' ' + (th.at - sim.t).toFixed(2), p[0], p[1] + 10, '#ff4040', { scale: 1, align: 'center' }); }
  if (tune.view.hitVol) for (const e of sim.enemies) if (!e.dead) for (const v of sim.volumes(e)) { if (v.k === 'c') { const a = R3.proj(v.a[0], v.a[1], v.a[2]), b = R3.proj(v.b[0], v.b[1], v.b[2]); if (a && b) px.line(g, a[0] | 0, a[1] | 0, b[0] | 0, b[1] | 0, '#00ffff', 2); } }
}
