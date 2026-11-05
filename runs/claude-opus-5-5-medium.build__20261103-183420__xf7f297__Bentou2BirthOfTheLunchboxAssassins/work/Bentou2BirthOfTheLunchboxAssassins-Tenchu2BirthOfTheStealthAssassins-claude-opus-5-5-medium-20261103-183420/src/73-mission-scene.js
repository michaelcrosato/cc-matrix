/* 73-mission-scene: the gameplay scene used by story, Missions, the Shadow Trial, the hub round and Workshop test plays
 * (attract mode draws missions with the same B.drawMission). The camera (follow, 45-degree turns, zoom, mouse lean,
 * Focus scouting, peeks), drawing with Shadow Sight, the game-over overlay, the pause menu's items and the objectives. */
const AMB = { dusk: .5, night: null, rain: .32, festival: .44 };
B.setupMissionView = M => {
  const G = B.game, W = M.world, L = G.lights;
  L.enabled = true; L.ambient = AMB[M.level.time] === null || AMB[M.level.time] === undefined ? B.T('ambientNight') : AMB[M.level.time]; L.dark = M.level.time === 'dusk' ? [30, 16, 40] : [8, 10, 30]; L.tint = .4; L.refresh && L.refresh();
  G.cam.bounds = v => W.map.bounds(v); G.cam.smooth = .12; G.follow(null);
  const wk = M.level.weather; G.weather = wk ? { kind: wk, amount: wk === 'rain' ? .8 : .5, wind: .3, lightning: 0 } : null;
  if (G.settings.camAngle === 'high') G.setView('threequarter'); else G.setView('iso');
  G.cam.snap = true; M.lean = { x: 0, y: 0 };
};
B.cameraUpdate = (M, dt, I) => {
  const G = B.game, h = M.hero; if (!h) return;
  const inv = G.settings.invertCam ? -1 : 1, rs = I.right || [0, 0];
  M._turnCool = Math.max(0, (M._turnCool || 0) - dt);
  let turn = 0; if (G.input.pressed('camLeft')) turn = -1; if (G.input.pressed('camRight')) turn = 1;
  if (!h.focus) { if (Math.abs(rs[0]) > .7 && !M._flick) { turn = Math.sign(rs[0]); M._flick = true; } if (Math.abs(rs[0]) < .3) M._flick = false; if (Math.abs(rs[1]) > .5) G.zoomBy(1 - rs[1] * dt * 1.2); }
  if (turn && M._turnCool <= 0) { G.rotateView(45 * turn * inv); M._turnCool = .25; B.sfx('whoosh', { vol: .3 }); }
  if (G.input.pressed('camReset')) { G.resetCamera(); if (G.yaw) G.rotateView(-G.yaw); }
  // lean: the mouse leans the view toward the cursor; Focus + the right stick (or the mouse) scouts further; peeks
  let lx = 0, ly = 0;
  if (I.aimPoint) { const dx = I.aimPoint.x - h.x, dy = I.aimPoint.y - h.y, d = Math.hypot(dx, dy) || 1, m = Math.min(d * .35, h.focus ? 140 : 40); lx = dx / d * m; ly = dy / d * m; }
  else if (h.focus && Math.hypot(rs[0], rs[1]) > .25) { const g2 = G.view.screenDirToGround(rs[0], rs[1]); lx = g2[0] * 140 * Math.min(1, Math.hypot(rs[0], rs[1])); ly = g2[1] * 140 * Math.min(1, Math.hypot(rs[0], rs[1])); }
  if (h.peek) { lx = (h.peek.x - h.x) * 4.8; ly = (h.peek.y - h.y) * 4.8; }
  M.lean.x = approach(M.lean.x, lx, dt * 220); M.lean.y = approach(M.lean.y, ly, dt * 220);
  const fz = h.focus ? .9 : 1; M._fz = approach(M._fz || 1, fz, dt * .8);
  G.focus(h.x + M.lean.x, h.y + M.lean.y, h.z + 18);
};
/* drawing a mission: the world, every body (with Shadow Sight), tools in flight, effects, the HUD */
B.drawMission = (r, M, o = {}) => {
  const G = B.game, h = M.hero, W = M.world; B.lastR = r;
  B.drawWorld(r, W, { hero: h });
  const dark = '#0c0a18';
  // ink decals, traps, baits, clouds' shadow, flames
  for (const d of M.inkDecals || []) r.decal(g => { const q = r.w(d.x, d.y, d.z); px.ell(g, q[0], q[1], d.r, d.r * .5, '#5a0a0a'); px.ell(g, q[0] + 2, q[1] - 1, d.r * .5, d.r * .3, '#3a0606'); });
  for (const t of M.traps) if (t.kind === 'caltrops') r.decal(g => { for (let k = 0; k < 9; k++) { const q = r.w(t.x + Math.cos(k * 2.3) * (4 + k * 2), t.y + Math.sin(k * 2.3) * (4 + k * 2), t.z); px.dot(g, q[0], q[1], '#c8ccd4'); px.dot(g, q[0] + 1, q[1], '#5a5a62'); } });
  for (const b of M.baits) r.sprite(b.x, b.y, b.z + 2, B.ICON[b.kind === 'dango' ? 'dango' : 'riceball'], { anchor: 'bottom' });
  for (const l of M.lobs) { r.shadow(l.x, l.y, 2, .3); r.sprite(l.x, l.y, l.z, B.ICON[l.tool] || B.ICON.coin, { anchor: 'center' }); }
  for (const p of M.pickups) if (!p.taken) { const bob = Math.sin(G.time * 3 + p.x) * 1.5; r.shadow(p.x, p.y, 4, .3, undefined, p.z); r.sprite(p.x, p.y, p.z + 6 + bob, p.kind === 'story' ? B.ICON.scroll : B.ICON[p.tool] || B.ICON.coin, { anchor: 'bottom', glow: .6 }); G.lights.add(p.x, p.y, p.z + 8, 24, .5, { color: '#ffe080' }); }
  for (const it of M.interacts) if (it.active && !it.done) { const q = Math.sin(G.time * 4) > 0; r.queue(it.x, it.y, it.z + 18, g => { const s = r.w(it.x, it.y, it.z + 18); if (q) px.dot(g, s[0], s[1], '#ffe080'); px.dot(g, s[0] - 1, s[1] - 1, '#e8b04a'); }, { emissive: true }); }
  for (const f of M.flames) G.lights.add(f.x, f.y, f.z + 6, 30, .6, { color: '#ff7a2a' });
  for (const b of M.fireballs) { r.queue(b.x, b.y, b.z, g => { const s = r.w(b.x, b.y, b.z); px.disc(g, s[0], s[1], 3, '#ff8a2a'); px.disc(g, s[0], s[1], 1.5, '#ffe0a0'); }, { emissive: true }); G.lights.add(b.x, b.y, b.z, 40, .8, { color: '#ff7a2a' }); r.shadow(b.x, b.y, 3, .3); }
  // guards, bodies, civilians
  const focus = h && h.focus;
  for (const g of M.guards) {
    if (g.sunk || (!g.alive && !g.dying && g.vis === 'hidden')) continue;
    const vis = g.alive || g.dying ? g.vis : 'visible'; if (vis === 'hidden' && !o.reveal) continue;
    const sensed = vis === 'sensed' && !o.reveal;
    if (!sensed) r.shadow(g.x, g.y, g.type === 'hound' ? 7 : 6, .35, undefined, W.map.groundAt(g.x, g.y, g.r, g.z));
    const aura = focus && g.disguised;
    const op = sensed ? { alpha: .4, flash: '#5a5aff', flashMix: 1 } : { xray: { color: MOOD[g.mind ? g.mind.state : 'calm'] }, flash: g.hurtT > 0 ? '#ffffff' : aura ? '#ff3a2a' : g.staggerT > 0 && Math.floor(G.time * 10) % 2 ? '#ffe080' : undefined, flashMix: aura ? .45 : .7 };
    r.actor(g.x, g.y, g.z, (gg, ox, oy) => g.rig.draw(gg, ox, oy, r.view), op);
    if (g.lantern && g.alive && !g.asleep) { const hd = g.type === 'hound' ? null : g.rig.hand ? g.rig.hand() : null; const lx = hd ? hd[0] : g.x, ly = hd ? hd[1] : g.y, lz = hd ? hd[2] - 4 : g.z + 14; if (!sensed) r.queue(lx, ly, lz, gg => { const s = r.w(lx, ly, lz); px.line(gg, s[0], s[1] - 4, s[0], s[1] - 1, '#2a1a10'); px.ell(gg, s[0], s[1] + 2, 2, 3, '#ffb060'); }, { emissive: true }); G.lights.add(lx, ly, lz, 48 * B.T('lanternRadius'), .8, { color: '#ffb060' }); }
    if (aura && g.alive) r.queue(g.x, g.y, g.z + 1, gg => { const s = r.w(g.x, g.y, g.z + 20); px.blend(gg, .3, 'add', () => px.disc(gg, s[0], s[1], 16, '#c81a1a')); }, { emissive: true });
  }
  for (const n of M.talkers) { r.shadow(n.x, n.y, 6, .35); r.actor(n.x, n.y, n.z, (gg, ox, oy) => n.rig.draw(gg, ox, oy, r.view), { xray: true }); }
  for (const b of M.bosses) { if (b.hidden) continue; r.shadow(b.x, b.y, 10, .4, undefined, b.z); r.actor(b.x, b.y, b.z, (gg, ox, oy) => b.rig.draw(gg, ox, oy, r.view), { xray: { color: '#ff4a3a' }, flash: b.hurtT > 0 ? '#ffffff' : b.guardT > 0 ? '#a0c8ff' : b.staggerT > 0 ? '#ffe080' : undefined, flashMix: .6 }); B.drawTelegraph(r, b); if (b.phase === 2 && b.bossId === 'kurogane') G.lights.add(b.x, b.y, b.z + 20, 70, .8, { color: '#ff5a2a' }); if (b.bossId === 'hotaru') G.lights.add(b.x, b.y, b.z + 24, 30, .5, { color: '#ff3a2a' }); }
  for (const c of M.clones) if (c.alive) { r.shadow(c.x, c.y, 6, .3); r.actor(c.x, c.y, c.z, (gg, ox, oy) => c.rig.draw(gg, ox, oy, r.view), { alpha: .8 }); }
  for (const s of M.spirits) if (s.alive) { r.actor(s.x, s.y, s.z + 6 + Math.sin(s.t * 5) * 2, (gg, ox, oy) => s.blob.draw(gg, ox, oy, r.view), { emissive: true }); G.lights.add(s.x, s.y, s.z + 8, 36, .7, { color: '#ff7a2a' }); }
  if (M.escort) { const e = M.escort; if (e.alive) { r.shadow(e.x, e.y, 6, .35); r.actor(e.x, e.y, e.z - (e.z < 2 && W.isDeep(e.x, e.y) ? 8 : 0), (gg, ox, oy) => e.rig.draw(gg, ox, oy, r.view), { xray: { color: '#5ae0a0' }, flash: e.hurtT > 0 ? '#ffffff' : undefined }); } }
  for (const gh of M.ghosts || []) { if (!gh.vis) continue; r.actor(gh.x, gh.y, gh.z, (gg, ox, oy) => gh.rig.draw(gg, ox, oy, r.view), { alpha: .45, ghost: { color: gh.color, life: .25, alpha: .3, owner: gh }, flash: gh.color, flashMix: .35 }); }
  // the hero: x-ray through everything; low in the water while swimming; a shadow under the surface while diving
  if (h) {
    if (h.rope) { const a = h.rope, hand = h.rig.hand ? h.rig.hand() : [h.x, h.y, h.z + 24], act = h.action, u = act && act.beat === 'throw' ? act.u : 1; const ex = lerp(hand[0], a.x, u), ey = lerp(hand[1], a.y, u), ez = lerp(hand[2], a.z, u);
      r.queue((hand[0] + ex) / 2, (hand[1] + ey) / 2, Math.max(hand[2], ez), g => { let p0 = r.w(hand[0], hand[1], hand[2]); for (let k = 1; k <= 8; k++) { const t = k / 8, sag = Math.sin(t * Math.PI) * (act && act.beat === 'pull' ? 2 : 6); const p1 = r.w(lerp(hand[0], ex, t), lerp(hand[1], ey, t), lerp(hand[2], ez, t) - sag); px.line(g, p0[0], p0[1], p1[0], p1[1], '#c8b080'); p0 = p1; } px.dot(g, p0[0], p0[1], '#ffffff'); }); }
    if (h.dive) { r.decal(g => { const q = r.w(h.x, h.y, 0); px.ell(g, q[0], q[1], 9, 4, '#0c1a2a'); px.ell(g, q[0] + Math.cos(h.facing) * 2, q[1], 5, 2, '#14283c'); }); }
    else {
      if (!h.swim) r.shadow(h.x, h.y, 6, .4, undefined, W.map.groundAt(h.x, h.y, h.r, h.z));
      const cloak = h.cloakT > 0, sz = h.swim ? h.z - 9 : h.z;
      r.actor(h.x, h.y, sz, (g, ox, oy) => h.rig.draw(g, ox, oy, r.view), { xray: { actors: true }, flash: h.hurtT > 0 ? '#ff6a6a' : cloak ? '#b8a060' : undefined, flashMix: cloak ? .8 : .6, alpha: h.exposure < .2 && !h.swim ? .7 : 1 });
      if (h.swim) r.queue(h.x, h.y, 1, g => { const q = r.w(h.x, h.y, 0); px.blend(g, .55, 'normal', () => px.ell(g, q[0], q[1] + 1, 9, 4, '#1e3a5a')); px.ell(g, q[0], q[1], 10, 4, '#4a7aa0'); px.ell(g, q[0], q[1], 8, 3, '#1e3a5a'); }, { bias: 2 });
    }
  }
  if (M.shots) M.shots.draw(r);
  B.drawWorldMarks(r, M);
  if (M.dev) B.devDraw(r, M);
  if (!o.noHud) B.drawHud(r, M);
  if (M.talk.open) M.talk.draw(r);
};
/* boss telegraphs: red arcs, lines and rings during a wind-up */
B.drawTelegraph = (r, b) => {
  const mv = b.move; if (!mv || mv.phase !== 'wind' || !mv.S.decal) return; const S = mv.S, u = clamp(mv.t / (S.wind * B.T('enemyWindup')), 0, 1);
  r.decal(g => {
    if (S.decal === 'arc') r.groundArc(b.x, b.y, (S.reach || 30) + (b.reachBonus || 0), b.facing, S.arc || .6, '#ff3a2a', .25 + u * .3, b.z);
    else if (S.decal === 'ring') r.groundRing(b.x, b.y, S.ring || 40, '#ff3a2a', .3 + u * .3, b.z);
    else if (S.decal === 'line') { const L = S.charge ? 160 : (S.lunge || 100) * .35 + 20; for (let k = 0; k < 10; k++) { const q = r.w(b.x + Math.cos(b.facing) * L * k / 10, b.y + Math.sin(b.facing) * L * k / 10, b.z); px.disc(g, q[0], q[1], 2, k % 2 ? '#ff3a2a' : '#8a1a1a'); } }
  });
};
/* the gameplay scene */
B.scenes.mission = {
  pausable: true, view: 'iso', views: ['iso', 'threequarter'], res: 'ps1', expand: true, input: B.INPUT, touch: [], camera: { zoom: [.75, 2], start: 1, tall: 1.25, rotate: true, wheel: false },
  enter(d) {
    this.d = d; const G = B.game; G.timeScale = 1; G.resetCamera();
    const M = this.M = new Mission(d.levelId || (get('mission', d.missionId) || {}).level || d.missionId, Object.assign({}, d, { mode: d.mode || 'story' }));
    M.scene = this; B.setupMissionView(M); B.music.play(M.level.music || 'm1'); A.layer('tension', 0, .01); A.layer('alertDrum', 0, .01); A.layer('alertFue', 0, .01);
    this.overT = 0; this.overMenu = null; this.endT = 0; this.lightT = 4 + rand() * 6;
    if (d.mode === 'hub' || d.mode === 'trial') B.hubMissionStart(M, d);
    B.emit('missionStart', { M });
  },
  exit() { const G = B.game; G.timeScale = 1; G.weather = null; G.lights.enabled = false; if (B.mission === this.M) B.mission = null; B.ui.hud({}); },
  update(dt) {
    const M = this.M, G = B.game; if (!M) return;
    if (M.mode === 'hub' && !B.hubPlaying(M)) { B.hubWait(M, dt); return; }
    // rain: lightning flashes expose everyone for a moment
    if (M.level.weather === 'rain' && !M.over) { this.lightT -= dt; if (this.lightT <= 0) { this.lightT = 6 + rand() * 8; M.flashT = .25; G.flash('#c8d8ff', .15, .7); G.after(.6, () => B.sfx('thunder')); } }
    if (M.over) return this.overUpdate(dt);
    const I = M.auto ? B.Autopilot.intent(M, dt) : B.intentFromInput();
    if (G.input.pressed('objectives') && !B.HUB && !M.auto) { B.showObjectives(M); return; }
    B.cameraUpdate(M, dt, I);
    M.update(dt, I);
    if (M.mode === 'hub' || M.mode === 'trial') B.hubTick(M, dt);
    if (M.dev) B.devUpdate(M, dt);
  },
  overUpdate(dt) {
    const M = this.M, G = B.game; this.overT += dt / Math.max(.1, G.timeScale);
    M.update(dt, B.emptyIntent());
    if (M.result === 'win') {
      if (this.overT > 1.6 && !this.left) { this.left = true; G.timeScale = 1; B.missionWon(M); }
      return;
    }
    if (M.mode === 'hub' || M.mode === 'trial') { if (!this.left && this.overT > 1.4) { this.left = true; G.timeScale = 1; B.hubFinish(M); } return; }
    if (this.overT > 1.2 && !this.overMenu) {
      G.timeScale = 1; const items = M.mode === 'workshop' ? ['Retry from checkpoint', 'Restart', 'Back to the Workshop'] : ['Retry from checkpoint', 'Restart mission', 'Quit to title'];
      this.overMenu = new E.Menu(G, items, { y: Math.round(G.H * .55), onPick: i => {
        if (i === 0) { this.overMenu = null; this.overT = 0; M.retry(); B.music.play(M.level.music || 'm1'); }
        else if (i === 1) G.go('mission', Object.assign({}, this.d, { retries: M.stats.retries + 1 }));
        else if (M.mode === 'workshop') G.go('workshop', { keep: true }); else G.go('title');
      } });
    }
    if (this.overMenu) this.overMenu.update(dt);
  },
  draw(r) {
    const M = this.M; if (!M) return;
    if (M.mode === 'hub' && !B.hubPlaying(M) && !M.over) { B.drawMission(r, M); B.hubDrawWait(r, M); return; }
    B.drawMission(r, M);
    if (M.mode === 'hub' || M.mode === 'trial') B.hubDraw(r, M);
    if (M.over && M.result !== 'win') r.overlay(g => {
      const a = clamp(this.overT / 1.2, 0, 1); px.polyDither(g, [[0, 0], [r.W, 0], [r.W, r.H], [0, r.H]], '#140c0c', a * .7, r.ix, r.iy);
      if (a > .5) { E.font.title(g, M.result === 'fail' ? 'MISSION FAILED' : 'YOUR BOX IS EMPTY', r.W / 2, Math.round(r.H * .3), { align: 'center', scale: 3, colors: ['#f4ead5', '#d8402a', '#8a1c1c'], depth: 2 });
        if (M.failReason) E.font.text(g, M.failReason, r.W / 2, Math.round(r.H * .3) + 30, '#e8dcc0', { align: 'center', outline: false, shadow: '#000' }); }
    });
    if (this.overMenu) this.overMenu.draw(r);
  }
};
/* the pause menu's items (the Shell adds Resume, Settings, Controls, Full screen and Quit) */
B.pauseItems = () => {
  const M = B.mission, G = B.game; if (!M || B.HUB || M.mode === 'attract' || M.mode === 'hub') return [];
  const out = [['Restart from checkpoint', () => { B.ui.hide(); M.retry(); }], ['Restart mission', () => { B.ui.hide(); G.go('mission', Object.assign({}, M.scene.d, { retries: M.stats.retries + 1 })); }], ['Objectives', () => B.showObjectives(M, true)], ['Dev Mode', () => B.Dev.open(M)]];
  if (M.mode === 'workshop') out.push(['Back to the Workshop', () => { B.ui.hide(); G.go('workshop', { keep: true }); }]);
  return out;
};
B.showObjectives = (M, fromPause) => {
  const G = B.game; if (!fromPause) G.pause('menu');
  const mark = o => o.state === 'done' ? '[x] ' : o.state === 'failed' ? '[-] ' : '[ ] ';
  B.ui.show('objectives', { kicker: (get('mission', M.missionId) || {}).num || 'Mission', title: M.level.name,
    text: M.objectives.filter(o => o.state !== 'hidden').map(o => mark(o) + o.text).join('\n') + '\n\nTime ' + B.fmtTime(M.t) + '   Silent Cuts ' + M.stats.silentCuts + '   Detected ' + M.stats.detections,
    actions: [{ label: 'Back', primary: true, fn: () => { if (fromPause) B.ui.back(); else { B.ui.hide(); G.resume(); } } }], back: fromPause ? undefined : () => { B.ui.hide(); G.resume(); } });
};
