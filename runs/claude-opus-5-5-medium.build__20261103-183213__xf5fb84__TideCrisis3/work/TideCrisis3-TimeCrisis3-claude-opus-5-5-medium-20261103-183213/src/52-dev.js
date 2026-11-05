// 52-dev: dev mode, reached from the pause menu (not in AI Hub sessions). A canvas panel with six tabs generated from
// one descriptor list (a slider or toggle is one line: its path into tune, its range and step), the ACTIONS tab
// (restart, jump to any scene, kill all, spawn, weapons, lives, threats, clear, game over, the bot, a P2 bot, voice
// and music tests), RESET ALL TO DEFAULTS with a confirmation; changed values gold with the default in grey. The Sim
// is frozen while the panel is open. Hover focuses, a drag moves a knob, the wheel adjusts.
// Reads: tune and TUNE (00), the play scene's Session (60).

const DEVT = [
  ['PLAYER', [['God mode', 'player.god'], ['Infinite ammo', 'player.infAmmo'], ['Start lives', 'player.lives', 1, 9, 1], ['I-frames (s)', 'player.iframes', .5, 3, .1], ['Cover in (s)', 'player.coverIn', .05, .4, .01], ['Cover out (s)', 'player.coverOut', .05, .4, .01], ['Reload (s)', 'player.reload', .1, 1, .05], ['Pad aim speed', 'player.padSpeed', .5, 3, .1], ['Aim assist', 'player.assist', 0, 1, .05]]],
  ['WEAPONS', [['Handgun damage', 'weapon.hgDamage', .5, 3, .1], ['MG rate (/s)', 'weapon.mgRate', 4, 20, 1], ['MG damage', 'weapon.mgDamage', .1, 1, .05], ['Shotgun pellets', 'weapon.sgPellets', 4, 14, 1], ['Shotgun spread', 'weapon.sgSpread', 2, 12, .5], ['GL radius', 'weapon.glRadius', 24, 96, 4], ['GL damage', 'weapon.glDamage', 2, 12, .5], ['Ammo pickups ×', 'weapon.ammoMul', .5, 3, .1]]],
  ['ENEMIES', [['HP ×', 'enemy.hpMul', .5, 3, .1], ['Threat chance ×', 'enemy.threatMul', 0, 3, .1], ['Telegraph ×', 'enemy.teleMul', .5, 2, .05], ['Fire interval ×', 'enemy.fireMul', .5, 2, .05], ['Max threats (0 = stage)', 'enemy.maxThreats', 0, 4, 1], ['Minimum gap (s)', 'enemy.minGap', .1, 1, .05], ['Reaction delay ×', 'enemy.reactMul', .5, 2, .05], ['Boss HP ×', 'enemy.bossHpMul', .25, 3, .05]]],
  ['TIME', [['Freeze timer', 'time.freeze'], ['Scene time ×', 'time.sceneMul', .5, 2, .05], ['Elite bonus (s)', 'time.eliteBonus', 0, 5, .5], ['Refill after time-up', 'time.refill', .2, 1, .05], ['Game speed', 'time.speed', .25, 1.5, .05]]],
  ['VIEW', [['FOV', 'view.fov', 45, 75, 1], ['Show hit volumes', 'view.hitVolumes'], ['Colliders', 'view.colliders'], ['Rail and cover points', 'view.railPoints'], ['AI state labels', 'view.aiLabels'], ['Threat debug', 'view.threatDebug'], ['Perf overlay', 'view.perf'], ['Free camera', 'view.freeCam'], ['Hide HUD', 'view.hideHud']]],
  ['ACTIONS', null]
];
const Dev = {
  isOpen: false, tab: 0, i: 0, confirm: false, play: null, msg: '', msgT: 0, jumpI: 0, spawnI: 0, rects: [], drag: null, free: null,
  open(play) { if (!play || play.s.hub) return; this.isOpen = true; this.play = play; this.i = 0; this.confirm = false; game.input.consumeAll(); },
  close() { this.isOpen = false; this.confirm = false; if (this.play) this.play.s.sim.cheats.god = !!tune.player.god; },
  items() {
    const t = DEVT[this.tab];
    if (t[1]) return t[1].map(([label, path, min, max, step]) => ({ label, path, min, max, step, kind: min === undefined ? 'toggle' : 'slider' })).concat([{ label: 'RESET ALL TO DEFAULTS', kind: 'reset' }]);
    const sim = this.play.s.sim, jumps = this.jumps(), spawns = all('enemy').filter(e => !e.board && e.ai !== 'turret').map(e => e.id);
    return [
      { label: 'Restart scene', kind: 'act', run: () => sim.jump(sim.stageId, sim.sceneId) },
      { label: 'Next scene', kind: 'act', run: () => { const sc = sim.stage.scenes, k = sim.sceneIdx; if (k + 1 < sc.length) sim.jump(sim.stageId, sc[k + 1]); else this.say('Last scene of the stage'); } },
      { label: 'Previous scene', kind: 'act', run: () => { const sc = sim.stage.scenes, k = sim.sceneIdx; if (k > 0) sim.jump(sim.stageId, sc[k - 1]); } },
      { label: 'Jump to: ' + jumps[this.jumpI % jumps.length].label, kind: 'pick', list: 'jump', run: () => jumps[this.jumpI % jumps.length].go() },
      { label: 'Kill all', kind: 'act', run: () => { for (const e of sim.enemies) if (!e.dead) TC.killEnemy(sim, e, { p: sim.players[0] }); } },
      { label: 'Spawn: ' + spawns[this.spawnI % spawns.length], kind: 'pick', list: 'spawn', run: () => { const id = spawns[this.spawnI % spawns.length], free = Object.keys(sim.covers).find(k => sim.covers[k].busy === 0) || Object.keys(sim.covers)[0]; if (id === 'drone') TC.makeEnemy(sim, 'drone', null, { at: vadd(sim.poseOf(0, 'stand') ? [sim.poseOf(0, 'stand').x + Math.cos(sim.poseOf(0, 'stand').yaw) * 160, sim.poseOf(0, 'stand').y + Math.sin(sim.poseOf(0, 'stand').yaw) * 160, sim.poseOf(0, 'stand').z + 20] : [0, 0, 40], [0, 0, 0]) }); else if (id === 'jetski' || id === 'runner') this.say('Spawned on its own path in its scenes'); else if (free) TC.makeEnemy(sim, id, free, { entry: 'stand' }); else { const c = sim.poseOf(0, 'stand'); TC.makeEnemy(sim, id, null, { at: [c.x + Math.cos(c.yaw) * 180, c.y + Math.sin(c.yaw) * 180, c.z - 24], entry: 'stand' }); } } },
      { label: 'All weapons and full ammo', kind: 'act', run: () => { for (const p of sim.players) for (const w of ['mg', 'sg', 'gl']) { p.owned[w] = true; p.ammo[w] = get('weapon', w).pool; } } },
      { label: '+1 life', kind: 'act', run: () => sim.players.forEach(p => p.lives++) },
      { label: 'Lose a life', kind: 'act', run: () => sim.hurt(sim.players[0], { ignoreI: true, reason: 'dev' }) },
      { label: 'Trigger a threat on me', kind: 'act', run: () => { const c = sim.poseOf(0, 'stand'); TC.requestThreat(sim, { src: 'dev', target: 0, dur: 1.2, kind: 'shot', at: [c.x + Math.cos(c.yaw) * 200, c.y + Math.sin(c.yaw) * 200, c.z], always: true }); } },
      { label: 'Clear stage', kind: 'act', run: () => { sim.phase = 'results'; sim.emit('stageclear', {}); } },
      { label: 'Game over', kind: 'act', run: () => { for (const p of sim.players) { p.lives = 0; p.out = true; p.cont = 0; } sim.phase = 'gameover'; } },
      { label: 'Bot plays (Autopilot): ' + (this.play.s.bots[0] ? 'ON' : 'OFF'), kind: 'act', run: () => { this.play.s.bots[0] = this.play.s.bots[0] ? null : new TC.Autopilot('expert'); } },
      { label: 'Add a P2 bot (split screen): ' + (sim.players.length > 1 ? 'ON' : 'OFF'), kind: 'act', run: () => this.p2bot() },
      { label: 'Voice test', kind: 'act', run: () => { const ids = ['kai', 'rook', 'mari', 'juno', 'hale', 'krake', 'barracuda', 'hammer']; ids.forEach((id, k) => game.after(k * 1.6, () => { TC.Voice.say(game, ['Copy that!', 'Kid, stay sharp.', 'Hang on tight!', 'Hostiles ahead!', 'Agents, report.', 'The sea takes all!', 'Too slow, CREST!', 'NOBODY PASSES.'][k], id); this.say(get('speaker', id).name); })); } },
      { label: 'Music test: ' + (this.songI === undefined ? 'next song' : all('song')[this.songI % all('song').length].id), kind: 'act', run: () => { this.songI = this.songI === undefined ? 0 : this.songI + 1; const s = all('song')[this.songI % all('song').length]; game.audio.music && game.audio.music(s, { fade: .3 }); this.play.s.music = s; this.say('Playing ' + s.id); } }
    ];
  },
  jumps() { const out = []; for (const st of all('stage')) for (const sc of st.scenes) out.push({ label: st.id + ' · ' + sc + ' ' + get('scene', sc).title, go: () => { const sim = this.play.s.sim; if (!sim.stageList.includes(st.id)) sim.stageList = [st.id]; sim.jump(st.id, sc); } }); for (const st of all('stage')) for (const k of ['intro', 'outro', 'ending']) if (st[k]) out.push({ label: 'cutscene ' + st[k], go: () => { const sim = this.play.s.sim; if (sim.stageId !== st.id) { sim.stageList = [st.id]; sim.jump(st.id, st.scenes[0]); } sim.startCut(st[k], () => sim.startScene(0)); } }); return out; },
  p2bot() { const s = this.play.s, sim = s.sim; if (sim.players.length > 1) { sim.players.splice(1); s.huds.splice(1); s.aimers.splice(1); s.bots.splice(1); s.inputs.splice(1); return; } s.addPlayer(null, 'rook', new TC.Autopilot('fair')); },
  say(m) { this.msg = m; this.msgT = 2; },
  adjust(it, dir, big) {
    if (it.kind === 'toggle') { tset(it.path, !tget(it.path)); return; }
    if (it.kind === 'slider') { const v = clamp(Math.round((tget(it.path) + dir * it.step * (big ? 5 : 1)) / it.step) * it.step, it.min, it.max); tset(it.path, +v.toFixed(4)); }
    if (it.kind === 'pick') { if (it.list === 'jump') this.jumpI = (this.jumpI + dir + this.jumps().length) % this.jumps().length; else this.spawnI = Math.max(0, this.spawnI + dir); }
  },
  update(dt) {
    const I = game.input, items = this.items(); this.msgT = Math.max(0, this.msgT - dt); this.i = clamp(this.i, 0, items.length - 1);
    if (I.pressed('pause') || (I.pressed('cancel') && !this.confirm)) { this.close(); I.consumeAll(); return; }
    if (I.pressed('tab') || I.pressed('prev')) { this.tab = (this.tab + DEVT.length - 1) % DEVT.length; this.i = 0; }
    if (I.pressed('tabR') || I.pressed('next')) { this.tab = (this.tab + 1) % DEVT.length; this.i = 0; }
    if (I.repeat('down', .3, .08)) { this.i = (this.i + 1) % items.length; this.confirm = false; } if (I.repeat('up', .3, .08)) { this.i = (this.i + items.length - 1) % items.length; this.confirm = false; }
    const it = items[this.i];
    if (I.repeat('right', .3, .05)) this.adjust(it, 1, I.down('cover')); if (I.repeat('left', .3, .05)) this.adjust(it, -1, I.down('cover'));
    const ptr = I.pointer && I.pointer();
    if (ptr) { const k = this.rects.findIndex(q => ptr[0] >= q[0] && ptr[0] < q[0] + q[2] && ptr[1] >= q[1] && ptr[1] < q[1] + q[3]); if (k >= 0 && (!this.lp || this.lp[0] !== ptr[0] || this.lp[1] !== ptr[1])) this.i = k; this.lp = ptr.slice(); }
    if (ptr && I.down('fire') && items[this.i].kind === 'slider' && this.knob) { const s = items[this.i], k = clamp((ptr[0] - this.knob[0]) / this.knob[1], 0, 1); tset(s.path, +(Math.round(lerp(s.min, s.max, k) / s.step) * s.step).toFixed(4)); }
    if (I.pressed('reset') && it.path) { tset(it.path, it.path.split('.').reduce((o, k) => o[k], TUNE)); }
    const tabHit = I.clicked && I.clicked() && this.tabRects ? this.tabRects.findIndex(q => I.clicked()[0] >= q[0] && I.clicked()[0] < q[0] + q[2] && I.clicked()[1] >= q[1] && I.clicked()[1] < q[1] + q[3]) : -1;
    if (tabHit >= 0) { this.tab = tabHit; this.i = 0; return; }
    if (I.pressed('confirm') || (I.clicked && I.clicked() && it.kind !== 'slider')) {
      if (it.kind === 'reset') { if (this.confirm) { TC.resetTune(); this.confirm = false; this.say('All values reset to defaults'); } else this.confirm = true; }
      else if (it.kind === 'toggle') this.adjust(it, 1);
      else if (it.run) { it.run(); this.say(it.label + ' ✓'); }
    }
    this.play.s.sim.cheats.god = !!tune.player.god;
  },
  draw(g, r) {
    const items = this.items(), w = Math.min(r.W - 20, 300), x = (r.W - w) / 2, y = 14, h = r.H - 28;
    E.ui.box(g, x, y, w, h, { bg: ['#0a1a34', '#040a18'], border: UI.gold, alpha: .96 });
    T(g, 'DEV MODE', x + 6, y + 4, UI.gold); T(g, '[' + TC.label(game.input, 'prev') + '/' + TC.label(game.input, 'next') + '] TAB', x + w - 6, y + 4, UI.dim, { align: 'right', font: 'tiny' });
    this.tabRects = []; let tx = x + 6; DEVT.forEach(([name], k) => { const tw = TW(name, { font: 'tiny' }) + 8; this.tabRects.push([tx, y + 14, tw, 10]); E.px.rect(g, tx, y + 14, tw, 10, k === this.tab ? '#2a5aa0' : '#10244a'); T(g, name, tx + 4, y + 16, k === this.tab ? '#ffffff' : '#8aa0c8', { font: 'tiny' }); tx += tw + 2; });
    const rowH = 11, top = y + 30, vis = Math.floor((h - 46) / rowH), off = Math.max(0, Math.min(this.i - vis + 2, items.length - vis));
    this.rects = []; this.knob = null;
    items.forEach((it, k) => {
      const yy = top + (k - off) * rowH; this.rects.push([x + 4, yy - 1, w - 8, rowH]); if (k < off || k >= off + vis) return;
      const on = k === this.i; if (on) E.px.rect(g, x + 4, yy - 1, w - 8, rowH, '#1e3e70');
      if (it.kind === 'reset') { T(g, this.confirm && on ? 'PRESS AGAIN TO RESET EVERYTHING' : it.label, x + w / 2, yy, this.confirm && on ? UI.warn : UI.gold, { align: 'center' }); return; }
      T(g, it.label, x + 8, yy, on ? '#ffffff' : '#b8c8e8');
      if (it.path) { const v = tget(it.path), d = it.path.split('.').reduce((o, q) => o[q], TUNE), changed = v !== d, col = changed ? UI.gold : '#ffffff';
        if (it.kind === 'toggle') T(g, v ? 'ON' : 'OFF', x + w - 8, yy, col, { align: 'right' });
        else { const bx = x + w - 118, bw = 70, k2 = (v - it.min) / (it.max - it.min); E.px.rect(g, bx, yy + 3, bw, 2, '#3a4a6a'); E.px.rect(g, bx + k2 * bw - 1, yy, 3, 8, col); if (on) this.knob = [bx, bw]; T(g, +v.toFixed(2), x + w - 8, yy, col, { align: 'right' }); }
        if (changed) T(g, '(' + d + ')', x + w - 124 - (it.kind === 'toggle' ? -40 : 0), yy, '#5a6078', { align: 'right', font: 'tiny' }); }
      if (it.kind === 'pick' && on) T(g, '◂ ▸', x + w - 8, yy, UI.dim, { align: 'right' });
    });
    if (this.msgT > 0) T(g, this.msg, r.W / 2, y + h - 22, '#8aff8a', { align: 'center' });
    T(g, '[' + TC.label(game.input, 'confirm') + '] RUN/TOGGLE  [◂ ▸] ADJUST  [' + TC.label(game.input, 'reset') + '] RESET ONE  [' + TC.label(game.input, 'cancel') + '] CLOSE', r.W / 2, y + h - 10, UI.dim, { align: 'center', font: 'tiny' });
  }
};
// the overlays (after present, in the viewport's pixels) and the free camera
Dev.overlay = (g, R, sim, vp) => {
  const V = tune.view, P = (p) => { const s = R.project(p); return s ? [vp.x + s[0], vp.y + s[1]] : null; };
  const seg = (a, b, c) => { const A = P(a), B = P(b); if (A && B) E.px.line(g, A[0], A[1], B[0], B[1], c); };
  const box = (b, c) => { const [x0, y0, z0, x1, y1, z1] = b; const pts = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]; for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) seg(pts[i], pts[j], c); };
  if (V.colliders) for (const c of sim.colliders) if (c.on && vdist([(c.b[0] + c.b[3]) / 2, (c.b[1] + c.b[4]) / 2, 0], R.cs.pos) < 700) box(c.b, '#40ff80');
  if (V.hitVolumes) { for (const e of sim.enemies) for (const v of e.vols || []) { if (v.cap) { seg(v.a, v.b, v.shield ? '#40a0ff' : '#ffff40'); const A = P(v.a); if (A) E.px.dot(g, A[0], A[1], '#ffff40'); } else { const c = P(v.c), k = R.project(v.c); if (c && k) { const rr = v.r * R.F / k[2]; for (let a = 0; a < 12; a++) E.px.dot(g, c[0] + Math.cos(a / 12 * 6.28) * rr, c[1] + Math.sin(a / 12 * 6.28) * rr, v.part === 'head' ? '#ff4040' : '#ffff40'); } } } if (sim.boss) for (const pt of sim.boss.parts) if (pt.pos && pt.alive) { const c = P(pt.pos), k = R.project(pt.pos); if (c && k) { const rr = pt.r * R.F / k[2]; for (let a = 0; a < 16; a++) E.px.dot(g, c[0] + Math.cos(a / 16 * 6.28) * rr, c[1] + Math.sin(a / 16 * 6.28) * rr, pt.hidden ? '#606060' : pt.armor ? '#40a0ff' : '#ff40ff'); T(g, pt.id + ' ' + pt.hp.toFixed(1), c[0], c[1] - rr - 8, '#ff80ff', { align: 'center', font: 'tiny' }); } } }
  if (V.railPoints) { if (sim.arrive) { let last = null; for (let d = 0; d <= sim.arrive.length; d += 20) { const q = sim.arrive.at(d), p = [q.x, q.y, q.z]; if (last) seg(last, p, '#40c0ff'); last = p; } } for (const k in sim.covers) { const c = sim.covers[k], s = P(c.at); if (s) { E.px.rect(g, s[0] - 2, s[1] - 2, 4, 4, c.busy ? '#ff8040' : '#40ff40'); T(g, k, s[0] + 4, s[1] - 4, '#ffffff', { font: 'tiny' }); } } }
  if (V.aiLabels) for (const e of sim.enemies) { const s = P([e.x, e.y, e.z + 36]); if (s) T(g, e.type + ':' + e.state + (e.threat && !e.threat.done ? '!' : ''), s[0], s[1], e.dead ? '#888' : '#ffffff', { align: 'center', font: 'tiny' }); }
  if (V.threatDebug) sim.threats.forEach((t, k) => T(g, 'T' + t.id + ' p' + t.target + ' ' + t.kind + ' ' + t.left.toFixed(2) + (t.done ? (t.result ? ' HIT' : ' BLOCK') : ''), vp.x + 4, vp.y + 60 + k * 8, t.done ? '#888' : '#ff8080', { font: 'tiny' }));
  if (V.freeCam) T(g, 'FREE CAMERA · WASD/stick move · mouse/right stick look · Q/E down/up · ' + TC.label(game.input, 'confirm') + ' copy pose', vp.x + vp.w / 2, vp.y + vp.h - 20, '#7fe3ff', { align: 'center', font: 'tiny' });
};
Dev.freeStep = (dt, sim) => {
  const I = game.input; let f = Dev.free; if (!f) { const c = sim.cameraFor(0); f = Dev.free = { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch, roll: 0, fov: tune.view.fov }; }
  const sp = (I.held && (I.held.has ? I.held.has('ShiftLeft') : false) ? 400 : 140) * dt, m = I.move(), fx = Math.cos(f.yaw), fy = Math.sin(f.yaw);
  f.x += (fx * -m[1] - fy * m[0]) * sp; f.y += (fy * -m[1] + fx * m[0]) * sp;
  if (I.down('prev')) f.z -= sp; if (I.down('next')) f.z += sp;
  const a = I.padAim; if (a) { f.yaw += a[0] * 2 * dt; f.pitch = clamp(f.pitch - a[1] * 2 * dt, -1.4, 1.4); }
  const ptr = I.pointer && I.pointer(); if (ptr && Dev.lastFree) { f.yaw += (ptr[0] - Dev.lastFree[0]) * .01; f.pitch = clamp(f.pitch - (ptr[1] - Dev.lastFree[1]) * .01, -1.4, 1.4); } Dev.lastFree = ptr ? ptr.slice() : null;
  f.fov = tune.view.fov;
  if (I.pressed('confirm')) { const s = JSON.stringify([+f.x.toFixed(1), +f.y.toFixed(1), +f.z.toFixed(1), +(f.yaw / DEG).toFixed(1), +(f.pitch / DEG).toFixed(1)]); console.log('pose', s); try { navigator.clipboard && navigator.clipboard.writeText(s); } catch (e) { /* clipboard is optional */ } Dev.say('Pose copied: ' + s); }
  return f;
};
TC.dev = Dev;
