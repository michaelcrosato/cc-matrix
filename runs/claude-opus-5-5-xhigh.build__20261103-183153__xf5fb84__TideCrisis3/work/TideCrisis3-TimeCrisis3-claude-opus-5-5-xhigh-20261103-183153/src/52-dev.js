/* 52-dev: dev mode, opened from the pause menu (not in AI Hub sessions). A canvas panel with six tabs (PLAYER, WEAPONS,
 * ENEMIES, TIME, VIEW, ACTIONS): every slider's key is a path into tune, so adding a variable takes one line; changed
 * values show in gold with the default in grey; RESET ALL TO DEFAULTS (with a confirmation) copies TUNE back; the
 * reload button resets the focused item. The Sim is frozen while the panel is open. Also: debug overlays (hit volumes,
 * colliders, rails and cover points, AI labels, threats, perf) and the free camera (Copy pose for authoring). */
const DEVTABS = [
  ['PLAYER', [['t', 'player.god', 'God mode'], ['t', 'player.infAmmo', 'Infinite ammo'], ['s', 'player.startLives', 'Start lives (0: by difficulty)', 0, 9, 1], ['s', 'player.iframes', 'Invulnerability after a hit (s)', .5, 3, .1], ['s', 'player.coverIn', 'Cover in (s)', .05, .4, .01], ['s', 'player.coverOut', 'Cover out (s)', .05, .4, .01], ['s', 'player.reload', 'Reload (s)', .1, 1, .05], ['s', 'player.padSpeed', 'Pad aim speed', .5, 3, .1], ['s', 'player.assist', 'Aim assist strength', 0, 1, .05]]],
  ['WEAPONS', [['s', 'weapons.hgDamage', 'Handgun damage', .5, 3, .1], ['s', 'weapons.mgRate', 'Machine gun rate (/s)', 4, 20, 1], ['s', 'weapons.mgDamage', 'Machine gun damage', .1, 1, .05], ['s', 'weapons.sgPellets', 'Shotgun pellets', 4, 14, 1], ['s', 'weapons.sgSpread', 'Shotgun spread (deg)', 2, 12, .5], ['s', 'weapons.glRadius', 'Grenade radius', 24, 96, 4], ['s', 'weapons.glDamage', 'Grenade damage', 2, 12, .5], ['s', 'weapons.ammoMul', 'Ammo pickups ×', .5, 3, .1]]],
  ['ENEMIES', [['s', 'enemy.hpMul', 'HP ×', .5, 3, .1], ['s', 'enemy.threatMul', 'Threat chance ×', 0, 3, .1], ['s', 'enemy.teleMul', 'Telegraph time ×', .5, 2, .05], ['s', 'enemy.fireMul', 'Fire interval ×', .5, 2, .05], ['s', 'enemy.maxThreats', 'Max threats (0: by stage)', 0, 4, 1], ['s', 'enemy.minGap', 'Minimum gap between hits (s)', .1, 1, .05], ['s', 'enemy.reactMul', 'Reaction delay ×', .5, 2, .05], ['s', 'enemy.bossHpMul', 'Boss HP ×', .25, 3, .05]]],
  ['TIME', [['t', 'time.freeze', 'Freeze timer'], ['s', 'time.sceneMul', 'Area time ×', .5, 2, .05], ['s', 'time.eliteBonus', 'Elite kill bonus (s)', 0, 5, .5], ['s', 'time.refill', 'Refill after time-up', .2, 1, .05], ['s', 'time.speed', 'Game speed', .25, 1.5, .05]]],
  ['VIEW', [['s', 'view.fov', 'Field of view', 45, 75, 1], ['t', 'view.hitVols', 'Show hit volumes'], ['t', 'view.colliders', 'Show colliders'], ['t', 'view.rails', 'Show rail and cover points'], ['t', 'view.aiLabels', 'AI state labels'], ['t', 'view.threatDebug', 'Threat debug'], ['t', 'view.perf', 'Perf overlay'], ['t', 'view.freeCam', 'Free camera (close the panel to fly)'], ['t', 'view.hideHud', 'Hide HUD']]],
  ['ACTIONS', [['a', 'restart', 'Restart area'], ['a', 'next', 'Next area'], ['a', 'prev', 'Previous area'], ['j', 'jump', 'Jump to...'], ['a', 'kill', 'Kill all'], ['e', 'spawn', 'Spawn enemy...'], ['a', 'arm', 'All weapons, full ammo'], ['a', 'life+', '+1 life'], ['a', 'life-', 'Lose a life'], ['a', 'threat', 'Trigger a threat on me'], ['a', 'clearstage', 'Clear stage'], ['a', 'over', 'Game over'], ['a', 'bot', 'Bot plays (Autopilot)'], ['a', 'p2', 'Add a P2 bot (split screen)'], ['a', 'voice', 'Voice test'], ['m', 'music', 'Music test...'], ['a', 'copy', 'Copy camera pose']]]
];
TC.DEVTABS = DEVTABS;
const Dev = {
  open: false, tab: 0, i: 0, confirmReset: false, free: null, jumpI: 0, spawnI: 0, musicI: 0, msg: '', msgT: 0, rects: [], drag: false,
  show() { if (HUB) return; this.open = true; this.confirmReset = false; this._mt = TC.game.input.mouse ? TC.game.input.mouse.t : 0; TC.game.input.consumeAll(); },
  hide() { this.open = false; },
  items() { return DEVTABS[this.tab][1].concat([['r', 'reset', 'RESET ALL TO DEFAULTS']]); },
  note(s) { this.msg = s; this.msgT = 2; },
  adjust(it, dir, fine) {
    if (it[0] === 't') { setPath(tune, it[1], !getPath(tune, it[1])); return; }
    if (it[0] === 's') { const v = getPath(tune, it[1]), st = it[5] * (fine ? 1 : 1); setPath(tune, it[1], +clamp(Math.round((v + dir * st) / it[5]) * it[5], it[3], it[4]).toFixed(4)); return; }
    if (it[0] === 'j') { const all = this.allScenes(); this.jumpI = (this.jumpI + dir + all.length) % all.length; return; }
    if (it[0] === 'e') { const ids = this.spawnTypes(); this.spawnI = (this.spawnI + dir + ids.length) % ids.length; return; }
    if (it[0] === 'm') { const ids = regAll('song').map(s => s.id); this.musicI = (this.musicI + dir + ids.length) % ids.length; }
  },
  allScenes() { const out = []; for (const st of regAll('stage')) for (const s of st.scenes) out.push([st.id, s]); return out; },
  spawnTypes() { return ['deckhand', 'marine', 'redtide', 'quartermaster', 'grenadier', 'rocketeer', 'shield', 'rusher', 'sniper', 'drone']; },
  run(it, P) {
    const sim = P.sim, p = sim.players[0];
    if (it[0] === 't' || it[0] === 's') { this.adjust(it, 1); return; }
    if (it[0] === 'r') { if (!this.confirmReset) { this.confirmReset = true; this.note('Press again to reset every value'); return; } resetTune(); this.confirmReset = false; this.note('All values reset to defaults'); return; }
    const k = it[1], idx = sim.sceneIdx, scs = sim.stage.scenes;
    if (k === 'restart') sim.restartScene();
    if (k === 'next') sim.jump(sim.stage.id, scs[Math.min(scs.length - 1, idx + 1)]);
    if (k === 'prev') sim.jump(sim.stage.id, scs[Math.max(0, idx - 1)]);
    if (k === 'jump') { const [st, sc] = this.allScenes()[this.jumpI]; sim.jump(st, sc); this.note('Jumped to ' + sc); }
    if (k === 'kill') { for (const e of sim.enemies) if (e.alive && !e.civ && !e.ally) damageEnemy(sim, e, 999, p, 'torso', {}); if (sim.boss && !sim.boss.dead) sim.boss.defeat(sim); }
    if (k === 'spawn') { const type = this.spawnTypes()[this.spawnI], free = sim.scene.coverList.find(c => !c.taken) || sim.scene.coverList[0]; if (type === 'drone' || type === 'quartermaster' || type === 'rusher' || !free) { const f = sim.focus(), cam = sim.cameraFor(0), fwd = [Math.cos(cam.yaw), Math.sin(cam.yaw)]; spawnEnemy(sim, type, null, type === 'drone' ? { from: [f[0] + fwd[0] * 200, f[1] + fwd[1] * 200, 40] } : type === 'quartermaster' ? { route: [[f[0] + fwd[0] * 220 - fwd[1] * 120, f[1] + fwd[1] * 220 + fwd[0] * 120, 0], [f[0] + fwd[0] * 220 + fwd[1] * 120, f[1] + fwd[1] * 220 - fwd[0] * 120, 0]], drop: 'mg' } : { from: [f[0] + fwd[0] * 260, f[1] + fwd[1] * 260, 0] }); } else spawnEnemy(sim, type, free.id, { entry: 'stand' }); this.note('Spawned a ' + type); }
    if (k === 'arm') for (const q of sim.players) { q.ammo.mg = 240; q.ammo.sg = 36; q.ammo.gl = 6; q.mag = 9; q.seen = { mg: 1, sg: 1, gl: 1 }; }
    if (k === 'life+') p.lives++;
    if (k === 'life-') hurtPlayer(sim, p, 'dev', true);
    if (k === 'threat') { requestThreat(sim, 0, { always: true, tele: 1.2, kind: 'dev', pos: () => { const c = sim.cameraFor(0); return [c.x + Math.cos(c.yaw) * 200, c.y + Math.sin(c.yaw) * 200, c.z]; } }); }
    if (k === 'clearstage') { sim.sceneIdx = scs.length - 1; sim.enemies = []; sim.boss = null; sim.nextScene(); }
    if (k === 'over') { for (const q of sim.players) { q.lives = 0; q.out = true; q.contT = 0; } sim.phase = 'gameover'; sim.ev({ type: 'gameover' }); }
    if (k === 'bot') { if (P.bots[0]) { delete P.bots[0]; this.note('Bot off'); } else { P.bots[0] = new Autopilot('expert'); this.note('Bot on'); } }
    if (k === 'p2') { if (sim.players.length < 2) { const np = newPlayer(sim, { name: 'BOT', agent: 'rook', color: SEAT_COLORS[1] }, 1); sim.players.push(np); P.n = 2; P.aims.push(new Aim(TC.game.input, 1)); P.huds.push(new Hud(P, 1)); P.cams.push(new CamFX()); P.bots[1] = new Autopilot('fair'); TC.game.splitScreen(2, { layout: 'columns' }); this.note('P2 bot joined'); } }
    if (k === 'voice') { const ids = ['kai', 'rook', 'mari', 'juno', 'hale', 'tejada', 'krake', 'barracuda', 'hammerhead', 'gull']; ids.forEach((id, n) => setTimeout(() => { Voice.say('This is ' + reg('speaker', id).name + '. Testing, one, two!', id); P.huds[0].say(id, 'This is ' + reg('speaker', id).name + '. Testing, one, two!'); }, n * 1600)); }
    if (k === 'music') { const id = regAll('song')[this.musicI].id; Audio3.music(id); this.note('Playing ' + id); }
    if (k === 'copy') { const c = sim.cameraFor(0), s = JSON.stringify([+c.x.toFixed(1), +c.y.toFixed(1), +c.z.toFixed(1), +(c.yaw / DEG).toFixed(1), +(c.pitch / DEG).toFixed(1)]); console.log('pose', s); try { navigator.clipboard.writeText(s); } catch (e) { /* no clipboard */ } this.note('Pose ' + s); }
  },
  update(dt, P) {
    const I = TC.game.input, its = this.items();
    this.msgT = Math.max(0, this.msgT - dt);
    if (I.pressed('cancel') || I.pressed('pause')) { I.consumeAll(); this.hide(); if (tune.view.freeCam && !this.free) this.free = Object.assign({}, P.sim.cameraFor(0)); return; }
    const mouse = I.lastDevice === 'mouse';
    if ((I.pressed('next') && !mouse) || I.pressed('w2') && false) { this.tab = (this.tab + 1) % DEVTABS.length; this.i = 0; Audio3.play('ui_move'); }
    if (I.pressed('prev') && !mouse) { this.tab = (this.tab + DEVTABS.length - 1) % DEVTABS.length; this.i = 0; Audio3.play('ui_move'); }
    if (I.repeat('up', .3, .07)) { this.i = (this.i + its.length - 1) % its.length; this.confirmReset = false; }
    if (I.repeat('down', .3, .07)) { this.i = (this.i + 1) % its.length; this.confirmReset = false; }
    const it = its[this.i];
    if (I.repeat('left', .3, .05)) this.adjust(it, -1);
    if (I.repeat('right', .3, .05)) this.adjust(it, 1);
    if (mouse && (I.pressed('next') || I.pressed('prev'))) this.adjust(it, I.pressed('next') ? -1 : 1);
    if (I.pressed('reload') && (it[0] === 's' || it[0] === 't')) setPath(tune, it[1], getPath(TUNE, it[1]));
    // the mouse: hover focuses, a click on a tab switches, a click runs or toggles, dragging moves a slider's knob
    const p = I.pointer(), mt = I.mouse ? I.mouse.t : 0, moved = mt !== this._mt; this._mt = mt;
    if (p && (mouse || moved)) {
      if (moved) for (const r of this.rects) if (p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h) { if (r.row !== undefined && r.row !== this.i) this.i = r.row; }
      const held = I.down('fire');
      const sl = this.rects.find(r => r.slider && r.row === this.i);
      if (held && sl && p[0] >= sl.x - 4 && p[0] <= sl.x + sl.w + 4 && Math.abs(p[1] - (sl.y + 2)) < 8) { const it2 = its[this.i], u = clamp((p[0] - sl.x) / sl.w, 0, 1); setPath(tune, it2[1], +(Math.round((it2[3] + u * (it2[4] - it2[3])) / it2[5]) * it2[5]).toFixed(4)); this.drag = true; }
    }
    const c = I.clicked();
    if (c) { const r = this.rects.find(r => c[0] >= r.x && c[0] < r.x + r.w && c[1] >= r.y && c[1] < r.y + r.h); if (r && r.tab !== undefined) { this.tab = r.tab; this.i = 0; } else if (r && r.row !== undefined && !this.drag) { this.i = r.row; this.run(its[this.i], P); } this.drag = false; }
    else if (I.pressed('confirm')) this.run(it, P);
  },
  draw(g, P) {
    const G = TC.game, W = G.screen.W, H = G.screen.H, x0 = 10, y0 = 10, w = Math.min(W - 20, 320), h = H - 20, its = this.items();
    E.ui.box(g, x0, y0, w, h, { bg: ['#10244a', '#081428'], border: '#ffd36a', alpha: .94 });
    this.rects = [];
    txt(g, 'DEV MODE', x0 + 6, y0 + 4, '#ffd36a'); txt(g, 'sim frozen  •  ' + TC.label(G.input, 'cancel') + ' close', x0 + w - 6, y0 + 4, '#8aa0c8', { align: 'right' });
    let tx = x0 + 6;
    DEVTABS.forEach(([name], k) => { const tw = F.width(name, {}) + 8, on = k === this.tab; if (on) E.ui.box(g, tx - 2, y0 + 14, tw, 12, { bg: ['#3aa0e8', '#1a5aa0'], border: '#ffffff' }); txt(g, name, tx + 2, y0 + 16, on ? '#ffffff' : '#9fe3ff'); this.rects.push({ x: tx - 2, y: y0 + 14, w: tw, h: 12, tab: k }); tx += tw + 2; });
    const rowH = 13, maxRows = Math.floor((h - 52) / rowH), first = clamp(this.i - maxRows + 2, 0, Math.max(0, its.length - maxRows));
    for (let k = first; k < Math.min(its.length, first + maxRows); k++) {
      const it = its[k], y = y0 + 32 + (k - first) * rowH, on = k === this.i;
      if (on) px.rect(g, x0 + 3, y - 2, w - 6, rowH, '#1e5aa0');
      this.rects.push({ x: x0 + 3, y: y - 2, w: w - 6, h: rowH, row: k });
      const lab = it[0] === 'j' ? it[2] + ' ' + this.allScenes()[this.jumpI][1] : it[0] === 'e' ? it[2] + ' ' + this.spawnTypes()[this.spawnI] : it[0] === 'm' ? it[2] + ' ' + regAll('song')[this.musicI].id : it[2];
      txt(g, lab, x0 + 8, y, it[0] === 'r' ? (this.confirmReset ? '#ff5a4a' : '#ff9a6a') : '#ffffff');
      if (it[0] === 't' || it[0] === 's') {
        const v = getPath(tune, it[1]), d = getPath(TUNE, it[1]), changed = v !== d, vx = x0 + w - 8;
        if (it[0] === 't') txt(g, v ? 'ON' : 'OFF', vx, y, changed ? '#ffd36a' : '#c8d4ec', { align: 'right' });
        else { const sw = 60, sx = vx - 100; px.rect(g, sx, y + 3, sw, 2, '#3a4a6a'); px.rect(g, sx + Math.round(sw * (v - it[3]) / (it[4] - it[3])) - 1, y, 3, 8, changed ? '#ffd36a' : '#9fe3ff'); this.rects.push({ x: sx, y: y + 1, w: sw, h: 6, slider: true, row: k }); txt(g, String(+v.toFixed(2)), vx, y, changed ? '#ffd36a' : '#c8d4ec', { align: 'right' }); if (changed) txt(g, '(' + d + ')', sx - 4, y, '#6a7a90', { align: 'right' }); }
      }
    }
    promptLine(g, G.input, [{ a: 'prev' }, '/', { a: 'next' }, ' TAB  ', { a: 'confirm' }, ' RUN  ', { a: 'reload' }, ' RESET ITEM'], x0 + w / 2, y0 + h - 14);
    if (this.msgT > 0) txt(g, this.msg, x0 + w / 2, y0 + h - 26, '#ffd36a', { align: 'center' });
  },
  /** the free camera: fly with the moves (or the left stick), look with the right stick or arrow keys, Q/E down/up */
  flyStep(dt, P) {
    const I = TC.game.input, f = this.free || (this.free = Object.assign({}, P.sim.cameraFor(0))), sp = (I.down('cover') ? 400 : 150) * dt;
    const mv = I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > 0 ? I.padMove : [(I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0), (I.down('down') ? 1 : 0) - (I.down('up') ? 1 : 0)];
    const fx = Math.cos(f.yaw), fy = Math.sin(f.yaw);
    f.x += (fx * -mv[1] - fy * mv[0]) * sp; f.y += (fy * -mv[1] + fx * mv[0]) * sp;
    if (I.down('prev')) f.z -= sp; if (I.down('next')) f.z += sp;
    if (I.padAim) { f.yaw += I.padAim[0] * dt * 1.8; f.pitch = clamp(f.pitch - I.padAim[1] * dt * 1.2, -1.4, 1.4); }
    const p = I.pointer(); if (p && I.lastDevice === 'mouse' && I.down('fire')) { if (this.lastP) { f.yaw += (p[0] - this.lastP[0]) * .01; f.pitch = clamp(f.pitch - (p[1] - this.lastP[1]) * .01, -1.4, 1.4); } this.lastP = p.slice(); } else this.lastP = null;
    if (I.pressed('confirm')) this.run(['a', 'copy'], P);
  }
};
TC.dev = Dev;
/** debug overlays in screen space for player i's viewport */
TC.devOverlays = (g, P, R3, rect, i) => {
  const sim = P.sim, V = tune.view, pr = p => { const s = R3.project(p[0], p[1], p[2]); return s ? [rect.x + s[0], rect.y + s[1], s[2]] : null; };
  if (V.hitVols) for (const e of sim.enemies) if (e.vols) for (const k in e.vols) { const v = e.vols[k]; if (!v || k === 'hidden') continue; const pts = v.c ? [v.c] : [v.a, V3.lerp(v.a, v.b, .5), v.b]; for (const c of pts) { const s = pr(c); if (!s) continue; const rr = v.r * R3.B.F / s[2]; for (let a = 0; a < 16; a++) px.dot(g, s[0] + Math.cos(a / 16 * TAU) * rr, s[1] + Math.sin(a / 16 * TAU) * rr, k === 'head' ? '#ff5a5a' : k === 'shield' ? '#5ad1ff' : '#ffd36a'); } }
  if (V.hitVols && sim.boss) for (const part of Object.values(sim.boss.parts)) if (part.vol && part.alive) { const c = part.vol.c || V3.lerp(part.vol.a, part.vol.b, .5), s = pr(c); if (s) { const rr = part.vol.r * R3.B.F / s[2]; for (let a = 0; a < 20; a++) px.dot(g, s[0] + Math.cos(a / 20 * TAU) * rr, s[1] + Math.sin(a / 20 * TAU) * rr, part.open ? '#5aff8a' : '#8a8a8a'); txt(g, part.id + ' ' + part.hp.toFixed(1), s[0], s[1] - rr - 8, '#ffffff', { align: 'center' }); } }
  if (V.colliders) for (const c of sim.world.colliders.concat(sim.objects.filter(o => o.alive).map(o => o.col))) { const b = c.box; if (c.yaw) continue; const cs = [[b[0], b[1], b[2]], [b[3], b[1], b[2]], [b[3], b[4], b[2]], [b[0], b[4], b[2]], [b[0], b[1], b[5]], [b[3], b[1], b[5]], [b[3], b[4], b[5]], [b[0], b[4], b[5]]].map(pr); for (const [a, bb] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) if (cs[a] && cs[bb] && cs[a][2] < 900) px.line(g, cs[a][0], cs[a][1], cs[bb][0], cs[bb][1], c.obj ? '#ffd36a' : '#5ad1ff'); }
  if (V.rails) { if (sim.rail) for (let d = 0; d < sim.travelL; d += 12) { const q = sim.rail.at(d), s = pr([q.x, q.y, q.z - 20]); if (s) px.dot(g, s[0], s[1], '#8aff8a'); } for (const cv of sim.scene.coverList) { const s = pr(cv.at); if (s) { px.rect(g, s[0] - 2, s[1] - 2, 5, 5, cv.taken ? '#ff5a5a' : '#8aff8a'); txt(g, cv.id, s[0], s[1] + 4, '#ffffff', { align: 'center' }); } } }
  if (V.aiLabels) for (const e of sim.enemies) { const s = pr([e.x, e.y, e.z + 34]); if (s) txt(g, e.type + ':' + e.state + (e.alive ? '' : ' +'), s[0], s[1], e.exposed ? '#ff9a6a' : '#9fe3ff', { align: 'center' }); }
  if (V.threatDebug) { let y = rect.y + 60; for (const th of sim.threats) if (!th.done) { txt(g, th.kind + ' → P' + (th.target + 1) + ' in ' + (th.T - sim.t).toFixed(2) + 's', rect.x + rect.w - 6, y, '#ff9a8a', { align: 'right' }); y += 9; } txt(g, 'cap ' + maxThreats(sim) + ' gap ' + tune.enemy.minGap, rect.x + rect.w - 6, y, '#ffd36a', { align: 'right' }); }
  void i;
};
