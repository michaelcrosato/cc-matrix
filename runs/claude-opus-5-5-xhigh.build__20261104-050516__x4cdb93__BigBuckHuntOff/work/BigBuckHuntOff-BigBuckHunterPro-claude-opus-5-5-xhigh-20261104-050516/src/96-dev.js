// 96-dev: dev mode, from the pause menu (or #dev): the game runs on under a screen of live sliders (every tuning value,
// saved, with Reset to defaults and a reset for each one changed), tools (freeze, slow motion, skip, bag all, spawn at the
// reticle, kill all, infinite ammo, god mode, jumps, the bot, the free camera, the labs, unlocks, a save reset, a
// snapshot), overlays (hit volumes and the last ray, occluders, actor states and fear, paths, the fan, occlusion lines,
// the frame rate). The Animal Lab shows every rig, gait and pose; the Sound Lab plays every sound.
const DEV = G.dev = {
  ov: { zones: false, occ: false, states: false, paths: false, fan: false, occlusion: false },
  freeze: false, slow: false, free: null, lastRay: null, picks: { hunt: 0, seg: 0, spawn: 0, bot: 1 },
  open() {
    G.ui.hide(); if (game.paused) game.resume();
    if (G.scene !== 'hunt') return;
    game.after(0, () => this.show()); this.show();
  },
  show() {
    const H = G.hunt, S = game.settings, changed = TUNE_DEFS.filter(([k]) => S['dev.' + k] !== TUNE_DEFAULT[k]);
    const segs = H ? ['site', 'trophy', 'bonus', 'results'] : [], spawnKinds = H ? (H.species === 'whitetail' ? ['buck', 'doe', 'fawn'] : ['bull', 'cow', 'calf']).concat(['trophy', 'squirrel', 'turkey', 'skunk']) : [];
    const tog = (k, label) => [label + ': ' + (this.ov[k] ? 'ON' : 'OFF'), () => { this.ov[k] = !this.ov[k]; this.show(); }];
    G.ui.show('dev', { kicker: 'Dev mode', title: 'Tuning and tools', text: 'The game keeps running underneath. Changes are live and saved.',
      rows: ['#Tuning'].concat(TUNE_DEFS.map(d => 'dev.' + d[0])),
      actions: () => [
        ['Reset all tuning to defaults', () => { game.settings.reset('Dev'); this.show(); }],
        ...changed.map(([k, label]) => ['Reset: ' + label, () => { game.settings.set('dev.' + k, TUNE_DEFAULT[k]); this.show(); }]),
        [this.freeze ? 'Unfreeze' : 'Freeze', () => { this.freeze = !this.freeze; this.applyTime(); this.show(); }],
        [this.slow ? 'Normal speed' : 'Slow motion (0.25x)', () => { this.slow = !this.slow; this.applyTime(); this.show(); }],
        ['Skip segment', () => { if (G.hunt) G.hunt.skip(); }],
        ['Bag all bucks', () => { game.debug.bagAll(1); }],
        ['Spawn at reticle: ' + (spawnKinds[this.picks.spawn % spawnKinds.length] || '-'), () => this.spawnAtReticle(spawnKinds[this.picks.spawn % spawnKinds.length])],
        ['Next spawn kind', () => { this.picks.spawn++; this.show(); }],
        ['Kill all', () => { if (G.hunt) for (const a of G.hunt.actors) if (a.alive) a.die(1); }],
        ['Refill + infinite ammo', () => { if (G.hunt) for (const p of G.hunt.players) { p.rifle.setup({}); p.rifle.infinite = !p.rifle.infinite; } }],
        ['God mode: ' + (H && H.godMode ? 'ON' : 'OFF'), () => { if (H) H.godMode = !H.godMode; this.show(); }],
        ['Jump to hunt: ' + HUNT_ORDER[this.picks.hunt % 3], () => { G.ui.hide(); startHunt({ mode: 'single', hunt: HUNT_ORDER[this.picks.hunt % 3] }); }],
        ['Next hunt', () => { this.picks.hunt++; this.show(); }],
        ['Jump to: ' + (segs[this.picks.seg % segs.length] || '-'), () => { if (G.hunt) G.hunt.skipTo(segs[this.picks.seg % segs.length]); }],
        ['Next jump', () => { this.picks.seg++; this.show(); }],
        ['Bot plays: ' + ['off', 'novice', 'average', 'expert'][this.picks.bot % 4], () => { this.picks.bot++; const sk = ['off', 'novice', 'average', 'expert'][this.picks.bot % 4]; game.debug.bot(sk !== 'off', { skill: sk }); this.show(); }],
        ['Free camera', () => { G.ui.hide(); this.startFree(); }],
        ['Animal Lab', () => { G.ui.hide(); game.go('animallab'); }],
        ['Sound Lab', () => { G.ui.hide(); game.go('soundlab'); }],
        ['Unlock all trophies', () => { for (const id of ['iron-rack', 'duke', 'bigmo']) Records.trophy(id, { bagged: true, seen: 1, best: 100, date: 'Dev mode' }); Records.d.badge = true; Records.save(); }],
        ['Reset save data', () => G.ui.show('devConfirm', { kicker: 'Dev mode', title: 'Erase every record?', text: 'Best scores, stars, trophies, stats and the Hunt-Off save.', actions: [['Keep them', () => G.ui.back()], ['Erase', () => { Records.reset(); game.saves.erase('auto'); for (const k of ['campaign', 'hollow', 'bugle', 'muskeg', 'party', 'crow-patrol', 'saucer-season', 'snowball-standoff', 'range']) E.store.remove('arcade:bbho:' + k); seedTables(); G.ui.back(); }]] })],
        ['Copy snapshot (to the console)', () => { console.log(JSON.stringify(game.debug.snapshot(), null, 1)); G.ui.toast('Snapshot', 'Logged to the console'); }],
        tog('zones', 'Hit volumes + last ray'), tog('occ', 'Occluder volumes'), tog('states', 'Actor states + fear'), tog('paths', 'Paths + bearings'), tog('fan', 'The play fan'), tog('occlusion', 'Occlusion lines'),
        ['Frame rate: ' + (game.settings.showFps ? 'ON' : 'OFF'), () => { game.settings.set('showFps', !game.settings.showFps); this.show(); }],
        ['Close', () => G.ui.hide()]
      ], back: () => G.ui.hide() });
  },
  applyTime() { G.devTimeScale = this.freeze ? 0 : (this.slow ? .25 : 1) * T('timeScale'); game.timeScale = G.devTimeScale; },
  spawnAtReticle(kind) {
    const H = G.hunt; if (!H || !H.site || !kind) return; const p = H.players[0], ray = H.lens.ray(p.rx, p.ry), t = H.world.hf.rayHit(ray, ray, 600 * M); if (t === null) return;
    const at = { x: ray.x + ray.dx * t, y: ray.y + ray.dy * t };
    if (kind === 'trophy') { const a = H.site.spawn(H.species === 'whitetail' ? 'buck' : 'bull', { at, orders: [['graze', { secs: 9 }], ['walk', { to: 1 }], ['exit']], path: null, trophy: H.hunt.trophy, points: H.species === 'moose' ? 72 : 14, hidden: false }); a.appear(); }
    else { const a = H.site.spawn(kind, { at, orders: [['graze', { secs: 9 }], ['walk', { to: 1 }], ['exit']], path: [[0, 0], [20, 0]].map(() => at).concat([{ x: at.x + 30 * M, y: at.y }]), hidden: false }); a.appear(); }
  },
  startFree() { const H = G.hunt; if (!H) return; this.free = { x: H.cam.x, y: H.cam.y, z: H.cam.z, yaw: H.cam.yaw, pitch: H.cam.pitch, fov: H.cam.fov }; this.freeze = true; this.applyTime(); },
  /** each step in the hunt while the free camera flies */
  updateFree(dt) {
    const F = this.free, I = game.input, mv = I.move(), sp = 30 * M * dt * (I.down('breath') ? 3 : 1), fx = Math.cos(F.yaw), fy = Math.sin(F.yaw);
    F.x += (fx * -mv[1] - fy * mv[0]) * sp; F.y += (fy * -mv[1] + fx * mv[0]) * sp;
    if (I.down('tabL')) F.z -= sp; if (I.down('tabR')) F.z += sp;
    const a = I.padAim; if (a) { F.yaw += a[0] * dt * 1.6; F.pitch = clamp(F.pitch + a[1] * dt * 40, -40, 60); }
    const pan = I.pan && I.pan(); if (pan) { F.yaw += pan[0] * .006; F.pitch = clamp(F.pitch + pan[1] * .25, -40, 60); }
    F.z = Math.max(F.z, G.hunt.world.height(F.x, F.y) + .5 * M);
    if (I.pressed('cancel')) { this.free = null; this.freeze = false; this.applyTime(); }
  },
  /** the overlays, over the hunt's frame */
  draw(g, H, W, Ht) {
    const L = H.lens, q = [0, 0, 0, 0], P = (p) => L.project(p[0], p[1], p[2], q) ? [q[0], q[1]] : null;
    if (this.ov.zones) {
      for (const a of H.actors) { if (!a.alive) continue; for (const z of a.zones()) { const c = P(z.a); if (!c) continue; const rr = Math.max(1, z.r * q[2]), col = z.id === 'heart' ? '#ff3a3a' : z.id === 'lung' ? '#ff8ab0' : z.id === 'antler' ? '#e8dcc0' : '#7ad0ff'; if (z.b) { const d = P(z.b); if (d) { px.line(g, c[0], c[1], d[0], d[1], col); } } for (let k = 0; k < 16; k++) px.dot(g, c[0] + Math.cos(k / 16 * TAU) * rr, c[1] + Math.sin(k / 16 * TAU) * rr, col); } }
      if (H.lastShotRay) { const R = H.lastShotRay, a = P([R.x + R.dx * 40, R.y + R.dy * 40, R.z + R.dz * 40]), b = P(R.point); if (a && b) px.line(g, a[0], a[1], b[0], b[1], '#ffe040'); }
    }
    if (this.ov.occ) H.world.near(H.cam.x, H.cam.y, 120 * M, p => { if (!p.occ) return; for (const v of p.occ) { const c = P([v.x || v.a[0], v.y || v.a[1], (v.z0 !== undefined ? (v.z0 + v.z1) / 2 : v.z || v.a[2])]); if (c) px.rect(g, c[0] - 1, c[1] - 1, 3, 3, '#ff40ff'); } });
    if (this.ov.states) for (const a of H.actors) { if (a.state === 'gone') continue; const c = P([a.x, a.y, a.z + (a.rig.height || 10) * 1.3]); if (!c) continue; E.font.text(g, a.kind + ' ' + a.state + (a.frozenT > 0 ? ' FROZEN' : ''), c[0], c[1] - 8, a.protected ? '#ff8a7a' : '#7ad0ff', { align: 'center', font: 'tiny', outline: '#000' }); E.ui.bar(g, c[0] - 10, c[1], 20, 2, clamp(a.fear / Math.max(.1, a.temper * 2), 0, 1), '#ff6a4a'); }
    if (this.ov.paths) for (const a of H.actors) { if (!a.path || !a.live) continue; let prev = null; for (let d = 0; d <= a.path.len; d += 2 * M) { const p = a.path.at(d), c = P([p.x, p.y, H.world.height(p.x, p.y)]); if (c && prev) px.line(g, prev[0], prev[1], c[0], c[1], '#ffe060'); prev = c; } if (prev) { const [b, dd] = H.world.bearingOf(H.vantageId, a.x, a.y); const c = P([a.x, a.y, a.z]); if (c) E.font.text(g, Math.round(b) + 'deg ' + Math.round(dd) + 'm', c[0], c[1] + 4, '#ffe060', { align: 'center', font: 'tiny', outline: '#000' }); } }
    if (this.ov.fan && H.vantageId) { for (const b of H.fanB) for (let d = 5; d < 200; d += 5) { const w = H.world.at(H.vantageId, b, d), c = P([w.x, w.y, w.z]); if (c) px.dot(g, c[0], c[1], '#40ff80'); } }
    if (this.ov.occlusion) { const T2 = H.world.vista.targets.get('main'); if (T2) for (let x = 0; x < T2.W; x += 2) for (const D of [30, 60, 120]) px.dot(g, x, T2.occ(x, D * M), D === 30 ? '#ff4040' : D === 60 ? '#40ff40' : '#4080ff'); }
    if (this.free) { const F = this.free, [b, d] = H.vantageId ? H.world.bearingOf(H.vantageId, F.x, F.y) : [0, 0]; E.ui.box(g, 8, Ht - 40, 300, 32, { bg: '#000000', alpha: .7 }); E.font.text(g, 'FREE CAMERA  x ' + Math.round(F.x / M) + ' m  y ' + Math.round(F.y / M) + ' m  z ' + Math.round(F.z / M) + ' m  heading ' + Math.round(F.yaw / DEG), 12, Ht - 36, '#ffffff', { outline: false }); E.font.text(g, 'from ' + (H.vantageId || '-') + ': bearing ' + Math.round(b) + ' deg, ' + Math.round(d) + ' m   (move, Q/E or L1/R1 height, Esc leaves)', 12, Ht - 24, '#d8c8a8', { outline: false }); }
    if (this.freeze) E.font.text(g, 'FROZEN', W - 10, 40, '#7ad0ff', { align: 'right', scale: 2, shadow: '#000' });
  }
};
bus.on('shot', e => { if (G.hunt) G.hunt.lastShotRay = Object.assign({}, e.ray, { point: e.R ? e.R.point : [e.ray.x, e.ray.y, e.ray.z] }); });
/* ---------- the Animal Lab: every rig, gait and pose ---------- */
const LAB_RIGS = [
  ['WHITETAIL BUCK', () => new E.Quadruped({ species: 'whitetail', sex: 'm', antlers: { points: 10, seed: 3 } })], ['WHITETAIL DOE', () => new E.Quadruped({ species: 'whitetail', sex: 'f' })], ['FAWN', () => new E.Quadruped({ species: 'whitetail', young: true })],
  ['OLD IRON RACK', () => new E.Quadruped({ species: 'whitetail', sex: 'm', size: 1.12, antlers: { points: 14, seed: 7, kicker: true, drop: true } })],
  ['BULL ELK', () => new E.Quadruped({ species: 'elk', sex: 'm', antlers: { points: 12, seed: 4 } })], ['COW ELK', () => new E.Quadruped({ species: 'elk', sex: 'f' })], ['THE DUKE', () => new E.Quadruped({ species: 'elk', sex: 'm', size: 1.1, antlers: { points: 14, seed: 7 } })],
  ['BULL MOOSE', () => new E.Quadruped({ species: 'moose', sex: 'm', antlers: { points: 12, spread: 50, seed: 5 } })], ['COW MOOSE', () => new E.Quadruped({ species: 'moose', sex: 'f' })], ['BIG MO', () => new E.Quadruped({ species: 'moose', sex: 'm', size: 1.15, antlers: { points: 18, spread: 72, seed: 7 } })],
  ['FOX', () => new E.Quadruped({ species: 'fox' })], ['COYOTE', () => new E.Quadruped({ species: 'coyote' })], ['WOLF', () => new E.Quadruped({ species: 'wolf' })], ['BESSIE', () => new E.Quadruped({ species: 'cow' })],
  ['SQUIRREL', () => new E.Quadruped({ species: 'squirrel' })], ['RABBIT', () => new E.Quadruped({ species: 'rabbit' })], ['HARE', () => new E.Quadruped({ species: 'hare' })], ['RACCOON', () => new E.Quadruped({ species: 'raccoon' })], ['SKUNK', () => new E.Quadruped({ species: 'skunk' })], ['MARMOT', () => new E.Quadruped({ species: 'marmot' })], ['BEAVER', () => new E.Quadruped({ species: 'beaver' })],
  ...Object.keys(E.BIRDS).map(k => [k.toUpperCase(), () => new E.Bird({ kind: k })]),
  ...Object.keys(CAST).map(k => [CAST[k].name, () => castRig(k)])
];
const LAB_POSES = ['stand', 'walk', 'trot', 'run', 'graze', 'alert', 'call', 'hurt', 'jump', 'dead'];
const animalLabScene = {
  view: 'side', camera: { zoom: false }, touch: [],
  enter() { G.scene = 'animallab'; this.i = 0; this.p = 1; this.turn = -.6; this.k = 3; this.xray = false; this.mount = false; this.t = 0; this.make(); },
  make() { this.rig = LAB_RIGS[this.i][1](); this.x = 0; this.t = 0; },
  update(dt) {
    this.t += dt; const I = game.input;
    if (uiRepeat('up')) { this.i = (this.i + LAB_RIGS.length - 1) % LAB_RIGS.length; this.make(); } if (uiRepeat('down')) { this.i = (this.i + 1) % LAB_RIGS.length; this.make(); }
    if (uiPressed('tabL') || I.pressed('scope')) this.p = (this.p + LAB_POSES.length - 1) % LAB_POSES.length; if (uiPressed('tabR') || I.pressed('fire')) this.p = (this.p + 1) % LAB_POSES.length;
    if (I.down('left')) this.turn -= dt * 1.5; if (I.down('right')) this.turn += dt * 1.5;
    if (I.pressed('call')) this.xray = !this.xray; if (I.pressed('pump')) this.mount = !this.mount;
    if (I.pressed('breath')) this.k = this.k >= 6 ? 1 : this.k + 1;
    if (uiPressed('cancel')) { game.go('menu', { page: 'main' }); return; }
    const R = this.rig, pose = LAB_POSES[this.p], sp = R.S && R.S.speeds ? R.S.speeds : [1.3, 3.4, 8.5], v = (pose === 'walk' ? sp[0] : pose === 'trot' ? sp[1] : pose === 'run' ? sp[2] : 0) * M;
    if (R instanceof E.Quadruped) R.update(dt, { x: 0, y: 0, vx: v, vy: 0, facing: 0, ground: () => 0, graze: pose === 'graze' ? 1 : 0, alert: pose === 'alert' ? 1 : 0, call: pose === 'call' ? 1 : 0, hurt: pose === 'hurt' && this.t % 1 < .3 ? 1 : 0, jump: pose === 'jump' && this.t % 1.2 < .6 ? 1 : 0, dead: pose === 'dead' ? Math.min(1, (this.t % 4) / 1.1) : 0 });
    else if (R instanceof E.Bird) R.update(dt, { x: 0, y: 0, z: 0, vx: v ? 60 : 0, vy: 0, flap: pose === 'stand' || pose === 'graze' ? 0 : 1, walk: pose === 'walk' ? 1 : 0, strut: pose === 'alert', dead: pose === 'dead', facing: 0 });
    else R.update(dt, { x: 0, y: 0, z: 0, vx: v, vy: 0, facing: 0, pose: pose === 'alert' ? 'cheer' : pose === 'call' ? 'wave' : pose === 'graze' ? 'kneel' : pose === 'hurt' ? 'guard' : pose === 'dead' ? 'die' : null, expr: 'smile', run: pose === 'run' ? 1 : pose === 'trot' ? .5 : pose === 'walk' ? .25 : 0 });
  },
  draw(r) {
    r.sky(['#2a3a4a', '#4a5a6a', '#6a7a80']);
    r.overlay(g => {
      const W = r.W, Ht = r.H, R = this.rig, k = this.k, cx = W / 2, cy = Ht * .7;
      for (let x = 0; x < W; x += 16) px.rect(g, x, cy, 8, 1, '#5a6a6a');
      const view = E.vistaView(k, this.turn / DEG - 90, 10);
      if (this.mount && R.drawMount) R.drawMount(g, cx, cy - 60, 90);
      else if (this.xray && R.drawXray) R.drawXray(g, cx - 10 * k, cy, k * .9, []);
      else R.draw(g, cx, cy, view, { glint: true });
      E.font.title(g, 'ANIMAL LAB', 12, 10, { scale: 2, colors: ['#fff6d8', '#7ad0ff', '#3a8ae8'], outline: '#0a1420' });
      E.font.text(g, LAB_RIGS[this.i][0] + '   ' + LAB_POSES[this.p].toUpperCase() + '   ' + k + ' px/unit' + (this.xray ? '   X-RAY' : '') + (this.mount ? '   MOUNT' : ''), 12, 34, '#ffffff', { outline: false, shadow: '#000' });
      E.font.text(g, 'Up/Down: rig   L1/R1 or clicks: pose   Left/Right: turn   Q: x-ray   R: mount   Shift: size   Esc: back', 12, Ht - 12, '#c8d8e0', { outline: false, shadow: '#000' });
    });
  }
};
/* ---------- the Sound Lab ---------- */
const soundLabScene = {
  camera: { zoom: false }, touch: [],
  enter() { G.scene = 'soundlab'; const items = []; for (const k in SONGS) items.push({ label: 'SONG ' + k.toUpperCase(), act: () => (['fanfare', 'siteclear', 'doe', 'escaped', 'newrecord'].includes(k) ? SFX.sting(k) : SFX.music(k, { restart: true })) });
    items.push({ label: 'STALK: DRUMS LAYER', act: () => { SFX.music('stalk'); SFX.layer('drums', !SFX.layers.drums); } }, { label: 'STALK: TENSION LAYER', act: () => { SFX.music('stalk'); SFX.layer('tension', !SFX.layers.tension); SFX.layer('trem', !SFX.layers.trem); } }, { label: 'RIFLE SHOT', act: () => SFX.shot(null) });
    for (const k in SFX_DEFS) items.push({ label: 'SFX ' + k.toUpperCase(), act: () => SFX.play(k) });
    for (const k in CAST) items.push({ label: 'VOICE ' + CAST[k].name, act: () => G.bab.say(k === 'emcee' ? 'BUCKS ONLY! HERE THEY COME!' : 'Well now, that there is a fine buck, I reckon.', CAST[k].voice) });
    this.list = new UIList({ items, cols: 3, w: 150, h: 16, gap: 3, y: 40, title: '', onBack: () => game.go('menu', { page: 'main' }) }); this.scroll = 0; },
  update(dt) { const r = this.list.update(dt); if (r === 'back') return; this.scroll = lerp(this.scroll, Math.max(0, Math.floor(this.list.i / 3) * 19 - 120), Math.min(1, dt * 8)); },
  draw(r) { r.sky(['#1a1a2a', '#2a2a3a']); r.overlay(g => { this.list.y = 40 - Math.round(this.scroll); this.list.draw(g, r.W, r.H); px.rect(g, 0, 0, r.W, 30, '#1a1a2a'); E.font.title(g, 'SOUND LAB', 12, 8, { scale: 2, colors: ['#fff6d8', '#7ad0ff', '#3a8ae8'], outline: '#0a1420' }); promptBar(g, r.W, r.H, [['confirm', 'PLAY'], ['cancel', 'BACK']]); }); }
};
