// The attract mode (a looping demo the HunterBot plays with cheats, then the tables, the Lodge and the title; any
// input returns to the title) and dev mode (from the pause menu: live sliders with reset, tools, jumps, overlays, a
// free camera, the Animal Lab and the Sound Lab).
(() => {
const B = BB, E = B.E, px = E.px, game = B.game;

// ======================= ATTRACT =======================
const CLIPS = B.ATTRACT_CLIPS = [
  { kind: 'hunt', hunt: 'hollow', site: 'hollow-1', dur: 35 },
  { kind: 'hunt', hunt: 'bugle', site: 'bugle-2', dur: 25 },
  { kind: 'hunt', hunt: 'bugle', site: 'bonus-saucer', dur: 15 },
  { kind: 'hunt', hunt: 'muskeg', site: 'big-mo', dur: 20 },
  { kind: 'tables', dur: 8 }, { kind: 'lodge', dur: 6 }, { kind: 'title', dur: 5 }
];
B.attract = null;
B.startAttract = () => { B.attract = { i: -1, n: 0 }; B.attractNext(); };
B.attractNext = () => {
  const A = B.attract; if (!A) return;
  A.i = (A.i + 1) % CLIPS.length; A.n++;
  const c = CLIPS[A.i];
  if (c.kind === 'hunt') {
    const p = new B.Player(0, null, { name: 'DEMO' }); p.bot = new B.Bot(p, { skill: 'expert', cheat: true });
    const run = B.newRun({ mode: 'attract', hunts: [c.hunt], players: [p], seed: 101 + A.i, autoTally: true, queue: [{ kind: 'site', id: c.site, o: { time: c.dur } }, { kind: c.site.startsWith('bonus') ? 'bonusTally' : 'tally' }] });
    game.go('hunt', { run }, { fade: .3 });
  } else if (c.kind === 'lodge') game.go('lodge', { attract: true }, { fade: .3 });
  else game.go('attract', { clip: c }, { fade: .3 });
};
B.stopAttract = () => { B.attract = null; game.go('title', null, { fade: .2 }); };
B.drawDemoBanner = (g, W, H) => {
  px.blend(g, .6, 'normal', () => px.rect(g, 0, H - 56, W, 16, '#000'));
  B.text(g, 'DEMO', 10, H - 52, '#f07020', { scale: 1 });
  if (Math.floor(game.real * 2) % 2 === 0) B.text(g, B.touchOnly ? 'CONTROLLER OR KEYBOARD REQUIRED' : 'PRESS ANY BUTTON', W / 2, H - 52, '#ffffff', { align: 'center' });
};
B.attractScene = {
  enter(data) { this.c = data && data.clip || CLIPS[4]; this.t = 0; this.page = 0; },
  update(dt) {
    this.t += dt;
    if (B.activity()) { B.stopAttract(); return; }
    if (this.c.kind === 'tables' && this.t > this.page * 2.6 + 2.6) this.page++;
    if (this.t > this.c.dur) B.attractNext();
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; B.backdropVista(1 / 60); B.drawBackdrop(g, W, H);
      px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#100804'));
      if (this.c.kind === 'tables') {
        const keys = [['hunt-hollow', 'HOLLOW CREEK'], ['hunt-bugle', 'BUGLE RIDGE'], ['hunt-muskeg', 'MUSKEG LAKE'], ['bonus-crow', 'CROW PATROL'], ['bonus-saucer', 'SAUCER SEASON'], ['bonus-snowball', 'SNOWBALL STANDOFF']];
        const [k, name] = keys[this.page % keys.length];
        B.title(g, 'HIGH SCORES', W / 2, 16, 3); B.text(g, name, W / 2, 52, '#f0c060', { align: 'center', scale: 2 });
        B.table(k).slice(0, 8).forEach((e, i) => { const y = 76 + i * 16; B.text(g, (i + 1) + '.', W / 2 - 100, y, '#c8b898', { scale: 2 }); B.text(g, e.name, W / 2 - 70, y, '#ffffff', { scale: 2 }); B.text(g, B.fmt(e.score), W / 2 + 100, y, '#ffd070', { scale: 2, align: 'right' }); });
      } else { B.drawLogo(g, W, Math.round(H * .12), Math.min(1.2, W / 480)); B.text(g, 'SPOT THE BUCKS. SHOOT CLEAN. PUMP. NEVER A DOE.', W / 2, H * .62, '#fff4d0', { align: 'center' }); }
      B.drawDemoBanner(g, W, H);
    });
  }
};

// ======================= DEV MODE =======================
B.devOpen = false;
const dev = B.dev = { stack: [], freeCam: null, botSkill: 0, confirmReset: 0 };
B.openDev = () => { if (game.resume) game.resume(); B.devPending = true; B.sfx('confirm'); };
// (opened on the next step of play, after the engine has closed its pause screen)
B.stepDevPending = () => { if (B.devPending && !game.paused) { B.devPending = false; B.devOpen = true; dev.stack = [rootPage()]; } };
B.closeDev = () => { B.devOpen = false; game.input.consumeAll && game.input.consumeAll(); };
const toggle = (label, get, set) => ({ label, value: () => (get() ? 'ON' : 'OFF'), act: () => set(!get()) });
const rootPage = () => ({ title: 'DEV MODE', list: new B.List([
  { label: 'TUNING SLIDERS', act: () => dev.stack.push(tunePage()) },
  { label: 'TOOLS', act: () => dev.stack.push(toolsPage()) },
  { label: 'JUMP TO...', act: () => dev.stack.push(jumpPage()) },
  { label: 'OVERLAYS', act: () => dev.stack.push(overlayPage()) },
  { label: 'ANIMAL LAB', act: () => { B.closeDev(); game.go('animallab'); } },
  { label: 'SOUND LAB', act: () => { B.closeDev(); game.go('soundlab'); } },
  { label: 'CLOSE', act: () => B.closeDev() }
]) });
const tunePage = () => {
  const items = B.TUNE_SPEC.map(([k, label, def, lo, hi, step]) => ({ label: label.toUpperCase(), value: () => { const v = B.TUNING[k]; return (step < 1 ? v.toFixed(step < .1 ? 2 : 1) : String(Math.round(v))) + (v !== def ? ' *' : ''); }, bar: () => (B.TUNING[k] - lo) / (hi - lo), slider: d => B.setTuning(k, Math.round((B.TUNING[k] + d * step) / step) * step), onConfirm: () => B.setTuning(k, def), key: k }));
  items.push({ label: 'RESET ALL TO DEFAULTS', act: () => { B.resetTuning(); B.sfx('confirm'); } });
  return { title: 'TUNING SLIDERS', tune: true, list: new B.List(items) };
};
const toolsPage = () => ({ title: 'TOOLS', list: new B.List([
  toggle('FREEZE', () => B.CHEAT.freeze, v => { B.CHEAT.freeze = v; }),
  toggle('SLOW MOTION (0.25X)', () => B.CHEAT.slow, v => { B.CHEAT.slow = v; }),
  { label: 'SKIP SEGMENT', act: () => { B.skipSegment(); } },
  { label: 'BAG ALL BUCKS', act: () => B.bagAll() },
  { label: 'SPAWN BUCK AT RETICLE', act: () => B.devSpawn('buck') },
  { label: 'SPAWN DOE AT RETICLE', act: () => B.devSpawn('doe') },
  { label: 'SPAWN CRITTER AT RETICLE', act: () => B.devSpawn('critter') },
  { label: 'KILL ALL', act: () => { if (B.play && B.play.site) for (const a of B.play.site.herd.list) if (a.live) { a.dead = true; a.dying = 0; } } },
  toggle('INFINITE AMMO', () => B.CHEAT.infinite, v => { B.CHEAT.infinite = v; }),
  toggle('GOD MODE (NO PENALTIES)', () => B.CHEAT.god, v => { B.CHEAT.god = v; }),
  { label: 'BOT PLAYS', value: () => ['OFF', 'NOVICE', 'AVERAGE', 'EXPERT'][dev.botSkill], act: () => { dev.botSkill = (dev.botSkill + 1) % 4; const p = B.play && B.play.players[0]; if (p) p.bot = dev.botSkill ? new B.Bot(p, { skill: ['', 'novice', 'average', 'expert'][dev.botSkill] }) : null; } },
  toggle('FREE CAMERA', () => !!dev.freeCam, v => { dev.freeCam = v ? { yaw: 0, pitch: 0, dx: 0, dy: 0, dz: 0 } : null; if (v) B.closeDev(); }),
  toggle('SHOW FRAME RATE', () => !!game.settings.showFps, v => game.settings.set('showFps', v)),
  { label: 'UNLOCK ALL TROPHIES', act: () => { for (const t of B.all('trophy')) B.records.trophies[t.id] = { seen: true, bagged: true, best: 99, date: 'DEV' }; B.records.range = true; B.saveRecords(); } },
  { label: () => (dev.confirmReset ? 'REALLY RESET SAVE DATA?' : 'RESET SAVE DATA'), act: () => { if (dev.confirmReset) { B.resetRecords(); dev.confirmReset = 0; } else dev.confirmReset = 1; } },
  { label: 'COPY SNAPSHOT (CONSOLE)', act: () => { try { console.log(JSON.stringify(game.debug.snapshot())); } catch (e) { } } }
]) });
const jumpPage = () => {
  const items = [];
  for (const h of B.HUNT_IDS) { const H = B.get('hunt', h); H.sites.forEach((s, i) => items.push({ label: H.short + ' · SITE ' + (i + 1), act: () => B.jump(h, { kind: 'site', id: s }) })); items.push({ label: H.short + ' · TROPHY', act: () => B.jump(h, { kind: 'site', id: B.get('trophy', H.trophy).site }) }); items.push({ label: H.short + ' · BONUS', act: () => B.jump(h, { kind: 'site', id: B.get('bonus', H.bonus).site }) }); }
  return { title: 'JUMP TO', list: new B.List(items) };
};
const overlayPage = () => ({ title: 'OVERLAYS', list: new B.List([
  toggle('HIT VOLUMES AND THE LAST RAY', () => B.CHEAT.overlays.zones, v => { B.CHEAT.overlays.zones = v; }),
  toggle('ACTOR STATES AND FEAR', () => B.CHEAT.overlays.states, v => { B.CHEAT.overlays.states = v; }),
  toggle('THE PLAY FAN AND PATHS', () => B.CHEAT.overlays.fan, v => { B.CHEAT.overlays.fan = v; })
]) });
B.updateDev = dt => {
  if (!B.devOpen) return;
  const pg = dev.stack[dev.stack.length - 1], r = pg.list.update(game.input, dt);
  if (r && r.back) { dev.stack.pop(); if (!dev.stack.length) B.closeDev(); }
  else if (r && r.pick && r.pick.act) r.pick.act();
};
B.drawDev = (g, W, H) => {
  if (!B.devOpen) return;
  const pg = dev.stack[dev.stack.length - 1], w = Math.min(300, W - 20), x = W - w - 8, cA = game.cornerArea();
  px.blend(g, .7, 'normal', () => px.rect(g, x - 6, 0, w + 14, H, '#05040a'));
  B.text(g, pg.title, cA ? x + 4 : x + w / 2, 6, '#80e0ff', { align: cA ? 'left' : 'center' });
  pg.list.draw(g, x, 20, w, { h: 13, gap: 2, scale: 1, rows: Math.floor((H - 40) / 15) });
  B.drawPrompts(g, pg.tune ? [['left', 'ADJUST'], ['confirm', 'RESET ROW'], ['cancel', 'BACK']] : [['confirm', 'PICK'], ['cancel', 'BACK']], game.input, x + w / 2, H - 14);
};
// free camera: WASD or the left stick move, the right stick or the arrow keys turn, Q/E or L1/R1 height
B.stepFreeCam = (dt, site) => {
  const F = dev.freeCam; if (!F || !site) return false;
  const I = game.input, m = I.move(), a = I.padAim || [0, 0];
  F.yaw -= (a[0] + (I.down('call') ? 0 : 0)) * dt * 1.2; F.pitch += a[1] * dt * 20;
  const yaw = site.v.yaw + F.yaw, fw = -m[1] * 30 * dt, rt = m[0] * 30 * dt;
  F.dx += Math.cos(yaw) * fw + Math.sin(yaw) * rt; F.dy += Math.sin(yaw) * fw - Math.cos(yaw) * rt;
  if (I.down('call')) F.dz -= 8 * dt; if (I.down('breath')) F.dz += 8 * dt;
  if (I.pressed('cancel')) { dev.freeCam = null; site.camOverride = null; return true; }
  site.camOverride = L => { L.x = site.v.x + F.dx; L.y = site.v.y + F.dy; L.z = site.v.z + F.dz; L.yaw = site.v.yaw + F.yaw; L.pitch = F.pitch; };
  return true;
};
B.drawFreeCam = (g, W, H, site) => {
  const F = dev.freeCam; if (!F || !site) return;
  const L = site.lens, d = Math.hypot(F.dx, F.dy), b = -B.wrapA(Math.atan2(F.dy, F.dx) - site.v.yaw) / B.DEG;
  B.panel(g, 8, H - 62, 230, 40);
  B.text(g, 'FREE CAMERA  x ' + L.x.toFixed(1) + '  y ' + L.y.toFixed(1) + '  z ' + L.z.toFixed(1), 14, H - 56, '#80e0ff');
  B.text(g, 'FROM VANTAGE: bearing ' + b.toFixed(0) + '  dist ' + d.toFixed(1) + ' m  yaw ' + (F.yaw / B.DEG).toFixed(0), 14, H - 46, '#c8e8ff');
  B.drawPrompts(g, [['up', 'MOVE'], ['call', 'DOWN'], ['breath', 'UP'], ['cancel', 'EXIT']], game.input, 120, H - 34);
};
B.drawDevOverlays = (g, W, H, play) => {
  const site = play.site, O = B.CHEAT.overlays; if (!site) return;
  const L = site.lens, P = p => L.project(p[0], p[1], p[2]);
  if (O.zones) for (const a of site.herd.list) { if (!a.live && !a.dead) continue; for (const p of B.actorParts(a).concat(a.rig ? a.rig.inner : [])) { const A = P(p.a), Bq = P(p.b); if (A && Bq) px.line(g, Math.round(A[0]), Math.round(A[1]), Math.round(Bq[0]), Math.round(Bq[1]), { heart: '#ff2020', lung: '#ff80c0', head: '#ffff40', neck: '#ffa040', shoulder: '#40ff40', antler: '#ffffff' }[p.zone] || '#40a0ff'); } }
  if (O.zones && B.lastShot) { const s = B.lastShot, A = P(s.from), Bq = P(s.to); if (Bq) px.disc(g, Math.round(Bq[0]), Math.round(Bq[1]), 2, '#ff00ff'); }
  if (O.states) for (const a of site.herd.list) { if (a.gone) continue; const p = P([a.x, a.y, a.z + (a.rig ? 2.2 * a.rig.size : 1)]); if (!p) continue; B.text(g, a.kind + ' ' + a.state + (a.flee ? ' FLEE' : '') + (a.hidden ? ' HID' : ''), p[0], p[1] - 8, '#80ff80', { align: 'center' }); px.rect(g, p[0] - 10, p[1], 20, 2, '#202020'); px.rect(g, p[0] - 10, p[1], Math.round(20 * Math.min(1, a.fear)), 2, '#ff4040'); }
  if (O.fan) { const [b0, b1] = site.def.frame.bearings; for (const b of [b0, b1]) for (let d = 10; d < 200; d += 4) { const q = B.rel(site.v, b, d), p = P([q[0], q[1], site.world.groundAt(q[0], q[1]) + .2]); if (p) px.rect(g, Math.round(p[0]), Math.round(p[1]), 2, 2, '#ffff00'); } for (const a of site.herd.list) if (a.path && a.live) for (let d = 0; d < a.path.length; d += 2) { const q = a.path.at(d), p = P([q.x, q.y, site.world.groundAt(q.x, q.y) + .1]); if (p) px.rect(g, Math.round(p[0]), Math.round(p[1]), 1, 1, a.legal ? '#40ff40' : '#ff4040'); } }
};
B.bus.on('shot', e => { const st = e.site; if (st) B.lastShot = { from: [st.lens.x, st.lens.y, st.lens.z], to: e.res.point }; });
B.bagAll = () => { const play = B.play; if (!play || !play.site) return; const p = play.players[0]; for (const a of play.site.herd.list) if (a.cat === 'animal' && a.legal && a.live && !a.hidden) { const pt = B.aimPointOf(a, 'heart'), P = play.site.lens.project(pt[0], pt[1], pt[2]); const res = { kind: 'animal', actor: a, zone: 'heart', t: 50, point: pt, ray: play.site.lens.ray(P ? P[0] : 240, P ? P[1] : 135) }; play.hitAnimal(p, a, res); } };
B.devSpawn = kind => {
  const play = B.play; if (!play || !play.site) return; const site = play.site, p = play.players[0];
  const res = B.castShot(site, site.lens, p.ret[0], p.ret[1]); const pt = res.point;
  const brg = -B.wrapA(Math.atan2(pt[1] - site.v.y, pt[0] - site.v.x) - site.v.yaw) / B.DEG, d = Math.hypot(pt[0] - site.v.x, pt[1] - site.v.y);
  if (kind === 'critter') site.S.pattern('critter', { kind: 'rabbit', path: [[brg, d], [brg + 30, d]], gait: 'walk' });
  else site.S.pattern('cross', { kind, path: [[brg, d], [brg + 25, d + 5], [brg + 60, d + 10]], gait: 'walk' });
};
B.jump = (h, segment) => { B.closeDev(); const p = new B.Player(0, game.input, { name: 'YOU' }); game.go('hunt', { run: B.newRun({ mode: 'single', hunts: [h], players: [p] }), segment }); };

// ======================= LABS =======================
B.animalLabScene = {
  enter() { this.i = 0; this.gait = 0; this.t = 0; this.turn = 0; this.xray = false; this.make(); },
  make() {
    const L = [['deer', 'buck', 'whitetail', 10], ['deer', 'doe'], ['deer', 'fawn'], ['elk', 'buck', 'elk', 12], ['elk', 'doe'], ['moose', 'buck', 'moose', 10, 52], ['moose', 'doe'], ['canid', 'wolf'], ['cow', 'cow']][this.i];
    this.label = L[0].toUpperCase() + ' ' + L[1].toUpperCase();
    this.rig = new B.Quadruped({ species: L[0], sex: L[2] ? 'buck' : 'doe', young: L[1] === 'fawn', size: { deer: 1, elk: 1.5, moose: 1.9, canid: 1, cow: 1.2 }[L[0]] * (L[1] === 'fawn' ? .6 : 1), antlers: L[2] ? { kind: L[2], points: L[3], seed: 3, spread: L[4] } : null });
    this.critter = null;
  },
  update(dt) {
    const I = game.input; this.t += dt;
    if (I.pressed('down')) { this.i = (this.i + 1) % 9; this.make(); } if (I.pressed('up')) { this.i = (this.i + 8) % 9; this.make(); }
    if (I.pressed('right')) this.gait = (this.gait + 1) % 7; if (I.pressed('left')) this.gait = (this.gait + 6) % 7;
    if (I.pressed('confirm')) this.xray = !this.xray;
    if (I.pressed('cancel')) game.go('menu');
    this.turn += dt * .5;
    const g = ['idle', 'walk', 'trot', 'gallop', 'graze', 'alert', 'death'][this.gait], sp = { walk: 1.6, trot: 4, gallop: 8 }[g] || 0;
    if (g === 'death' && this.t % 3 < dt) this.make();
    this.rig.update(dt, { x: 0, y: 0, z: 0, heading: this.turn, speed: sp, graze: g === 'graze' ? 1 : 0, alert: g === 'alert' ? 1 : 0, dead: g === 'death' ? 1 : 0, ground: () => 0 });
    this.gname = g;
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, T = B.vista.target('lab', W, H), ras = new B.Raster();
      const s = this.rig.size, lens = new B.Lens({ x: 0, y: -5 * s, z: 1.1 * s, yaw: Math.PI / 2, pitch: 6, fov: 40, W, H });
      const env = B.envFor(B.get('hunt', 'hollow'), this.t); B.vista.render(T, lens, null, env, [{ x: 0, y: 0, z: 0, cull: false, draw: rr => { rr.xray = this.xray ? 1 : 0; this.rig.draw(rr, { id: 9 }); rr.xray = 0; } }]);
      g.drawImage(T.canvas(), 0, 0);
      B.title(g, 'ANIMAL LAB', W / 2, 6, 2); B.text(g, this.label + ' · ' + this.gname.toUpperCase() + (this.xray ? ' · X-RAY' : ''), W / 2, 30, '#ffffff', { align: 'center', scale: 1 });
      B.drawPrompts(g, [['up', 'ANIMAL'], ['left', 'POSE'], ['confirm', 'X-RAY'], ['cancel', 'BACK']], game.input, W / 2, H - 14);
    });
  }
};
B.soundLabScene = {
  enter() {
    const items = [];
    for (const k in B.SONGS) items.push({ label: 'SONG · ' + k.toUpperCase(), act: () => { B.curSong = null; if (B.SONGS[k].loop === false) B.sting(k); else B.music(k, { restart: true }); } });
    for (const k of ['drums', 'tension']) items.push({ label: 'LAYER · STALK ' + k.toUpperCase(), act: () => { B.music('stalk'); B.layer(k, 1); } });
    for (const k in B.SFX) items.push({ label: 'SFX · ' + k.toUpperCase(), act: () => B.sfx(k) });
    for (const k in B.VOICES) items.push({ label: 'VOICE · ' + (B.CAST[k] ? B.CAST[k].name : k), act: () => B.babble(k, 'Well howdy there, how ya doin today?') });
    this.list = new B.List(items);
  },
  update(dt) { const r = this.list.update(game.input, dt); if (r && r.back) { B.music(null); game.go('menu'); } else if (r && r.pick) r.pick.act(); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#100c14'); B.title(g, 'SOUND LAB', W / 2, 6, 2); this.list.draw(g, W / 2 - 130, 34, 260, { h: 14, gap: 2, scale: 1, rows: Math.floor((H - 60) / 16) }); B.drawPrompts(g, [['confirm', 'PLAY'], ['cancel', 'BACK']], game.input, W / 2, H - 14); }); }
};
})();
