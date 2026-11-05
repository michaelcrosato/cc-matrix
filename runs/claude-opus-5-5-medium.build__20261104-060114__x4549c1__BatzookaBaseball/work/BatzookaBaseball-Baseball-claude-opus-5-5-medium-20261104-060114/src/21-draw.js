/* CAMERAS AND THE WORLD: the Plate Cam (Mode 7 from behind the catcher: the floor is the park, the sky its Backdrop, rigs
 * and props as billboards, the fence and stands as projected quads), the Broadcast Cam (a three-quarter ground view of
 * the park's TileMap) and the Moonshot Cam (Mode 7 chasing a home run). Rigs are animated here (cosmetic only). */
const BROADCAST = new E.View('broadcast', 'Broadcast', 0, 52, 1, 1), HIGHVIEW = new E.View('high', 'High', 0, 70, 1, 1);
E.VIEWS.broadcast = BROADCAST; E.VIEWS.high = HIGHVIEW;
const fieldView = () => ({ broadcast: 'broadcast', high: 'high', iso: 'iso' })[game.settings.fieldCam || 'broadcast'] || 'broadcast';
const SWING_SPEC = { rel: true, hand: 'both', a0: 2.3, a1: -2.5, z0: -1, z1: -3, reach: 6, lunge: 2.2, twist: 2.2, lean: .25, hold: .35 };
const BUNT_SPEC = { rel: true, hand: 'both', a0: .3, a1: .3, z0: -2, z1: -2, reach: 4, lunge: 0, hold: 1 };
const PITCH_SPEC = { rel: true, hand: 'R', a0: -2.6, a1: 1.2, z0: 5, z1: -3, reach: 7, lunge: 2.4, lean: .6, twist: 1.4, crouch: .2 };
const THROW_SPEC = E.MOVES && E.MOVES.throw ? E.MOVES.throw : PITCH_SPEC;
const UMP = { rig: null };

/* ---- rig animation (cosmetic) ---- */
function animateRigs(dt) {
  if (!M || HEADLESS && !BZ.cosmetic) return;
  const t = M.t;
  for (const F of M.fielders) {
    if (!F.rig) continue;
    let attack = null, pose = null;
    if (F.pos === 'P' && (M.phase === 'windup' || (M.phase === 'flight' && M.pitch && M.pitch.t < .35))) {
      const W = M.windT || .9, tt = M.phase === 'windup' ? M.phaseT : W + M.pitch.t;
      attack = tt < W ? { spec: PITCH_SPEC, phase: 'wind', u: clamp(tt / W, 0, 1) } : tt < W + .1 ? { spec: PITCH_SPEC, phase: 'active', u: (tt - W) / .1 } : { spec: PITCH_SPEC, phase: 'recover', u: clamp((tt - W - .1) / .25, 0, 1) };
    }
    if (F.throwAnim > 0) { F.throwAnim -= dt; attack = { spec: THROW_SPEC, phase: F.throwAnim > .2 ? 'active' : 'recover', u: F.throwAnim > .2 ? 1 - (F.throwAnim - .2) / .15 : 1 - F.throwAnim / .2 }; }
    if (F.pos === 'C' && ['select', 'windup', 'flight', 'afterPitch', 'walkUp'].includes(M.phase)) pose = 'crouch';
    if (M.phase === 'playOver' && M.lastPlay && M.lastPlay.caughtFly && F.hasBall) pose = 'cheer';
    F.rig.update(dt, { x: F.x, y: F.y, z: F.z, vx: F.vx, vy: F.vy, facing: F.facing, attack, pose, air: F.z > 2, climb: F.climb > 0 && F.z > 2, vz: F.vz, down: F.dive > 0 ? clamp(F.dive / .3, 0, 1) * .8 : 0, sprint: F.turbo });
  }
  for (const r of M.runners) {
    if (r.state === 'out' || r.state === 'scored') continue;
    const rig = r.rig || (r.rig = makeRig(r.p, 'run'));
    const moving = r.state === 'running' || r.state === 'returning', sp = moving ? rSpeed(r) : 0, f = r.facing || 0;
    rig.update(dt, { x: r.x, y: r.y, z: 0, vx: Math.cos(f) * sp, vy: Math.sin(f) * sp, facing: f, down: r.slide > 0 ? .7 : 0, sprint: r.turbo, pose: M.phase === 'homer' && moving ? null : null });
  }
  // the batter: stance and waggle, the swing (or the squared bunt)
  const b = batterNow(), rig = makeRig(b, 'bat'), lefty = b.bats === 'L', bx = HX + (lefty ? 18 : -18), by = HY - 4;
  let attack = null;
  if (M.swing) { const S = SWINGS[M.swing.kind] || SWINGS.contact, el = (M.pitch ? M.pitch.t : 0) - M.swing.at, D_ = S.delay || .1;
    attack = M.swing.kind === 'bunt' ? { spec: BUNT_SPEC, phase: 'active', u: 1 } : el < D_ * .6 ? { spec: SWING_SPEC, phase: 'wind', u: clamp(el / (D_ * .6), 0, 1) } : el < D_ + .06 ? { spec: SWING_SPEC, phase: 'active', u: clamp((el - D_ * .6) / (D_ * .4 + .06), 0, 1) } : { spec: SWING_SPEC, phase: 'recover', u: clamp((el - D_ - .06) / .35, 0, 1) }; }
  else if (M.bunting) attack = { spec: BUNT_SPEC, phase: 'active', u: 1 };
  const atBat = ['walkUp', 'select', 'windup', 'flight', 'afterPitch'].includes(M.phase);
  if (atBat) rig.update(dt, { x: bx, y: by, z: 0, vx: 0, vy: 0, facing: lefty ? Math.PI : 0, attack, crouch: .3, expr: M.armed ? 'shout' : b.look.expr || null });
  M.batRig = atBat ? { rig, x: bx, y: by } : null;
  if (!UMP.rig) UMP.rig = castRig('ump');
  UMP.rig.update(dt, { x: HX, y: HY + 30, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2, pose: 'crouch' });
  if (M.rhubarb) for (const f of M.rhubarb.fighters) if (!f.rig) f.rig = makeRig(f.p, 'brawl');
}

/* ---- the Plate Cam and the Moonshot Cam (Mode 7) ---- */
function plateCam(kit) {
  const b = batterNow(), side = b.bats === 'L' ? -4 : 4, m7 = kit.m7;
  const close = game.settings.plateCam === 'close';
  if (M.cam === 'moonshot' && M.ball) {
    const B = M.ball, a = Math.atan2(B.vy, B.vx), back = 70;
    const h = clamp(B.z + 12, 10, 170), pitch = clamp(Math.atan2(h - B.z, back) * 57.3, -20, 30);
    m7.cam = { x: B.x - Math.cos(a) * back, y: B.y - Math.sin(a) * back, h, angle: a, pitch, fov: 62 };
  } else m7.cam = { x: HX + side, y: HY + (close ? 52 : TUNE.plateDist), h: close ? 30 : TUNE.plateHeight, angle: -Math.PI / 2, pitch: 9, fov: close ? 42 : TUNE.plateFov };
  return m7;
}
function drawPlate(r, kit) {
  const m7 = plateCam(kit), t = game.time, park = kit.park;
  // props, the fence and stands, the poles
  for (const p of kit.props) m7.add(p.x, p.y, 0, (g, sx, sy, k) => drawProp(g, p, sx, sy, k, t));
  const fc = park.fenceCol, tc = park.topCol, sc = park.standCol;
  for (let i = 0; i < kit.fence.length - 1; i++) {
    const a = kit.fence[i], c = kit.fence[i + 1], mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2;
    m7.add(mx, my, 0, g => {
      const pr = (x, y, z) => m7.project(x, y, z);
      const p0 = pr(a.x, a.y, 0), p1 = pr(c.x, c.y, 0), p2 = pr(c.x, c.y, c.h), p3 = pr(a.x, a.y, a.h); if (!p0 || !p1 || !p2 || !p3) return;
      px.poly(g, [[p0[0], p0[1]], [p1[0], p1[1]], [p2[0], p2[1]], [p3[0], p3[1]]], i % 2 ? fc : E.shade(fc, .06));
      px.line(g, p3[0], p3[1], p2[0], p2[1], tc, Math.max(1, Math.round(p2[2] * 3)));
    });
    const ux = (a.x - HX) / rOf(a.x, a.y), uy = (a.y - HY) / rOf(a.x, a.y), vx = (c.x - HX) / rOf(c.x, c.y), vy = (c.y - HY) / rOf(c.x, c.y), Ra = rOf(a.x, a.y), Rc = rOf(c.x, c.y);
    m7.add(mx + ux * 60, my + uy * 60, 0, g => {
      const pr = (u, v, R0, z) => m7.project(HX + u * R0, HY + v * R0, z);
      const q0 = pr(ux, uy, Ra + 40, 6), q1 = pr(vx, vy, Rc + 40, 6), q2 = pr(vx, vy, Rc + 90, 60), q3 = pr(ux, uy, Ra + 90, 60); if (!q0 || !q1 || !q2 || !q3) return;
      px.poly(g, [[q0[0], q0[1]], [q1[0], q1[1]], [q2[0], q2[1]], [q3[0], q3[1]]], i % 2 ? sc : E.shade(sc, -.08));
      const b0 = pr(ux, uy, Ra + 40, 0), b1 = pr(vx, vy, Rc + 40, 0); if (b0 && b1) px.poly(g, [[b0[0], b0[1]], [b1[0], b1[1]], [q1[0], q1[1]], [q0[0], q0[1]]], E.shade(sc, -.25));
    });
  }
  for (const s of [-1, 1]) { const R0 = fenceR(park, s * D45), x = HX + Math.sin(s * D45) * R0, y = HY - Math.cos(s * D45) * R0; m7.add(x, y, 0, g => { const a = m7.project(x, y, 0), c = m7.project(x, y, 150); if (a && c) px.line(g, a[0], a[1], c[0], c[1], '#ffd040', Math.max(1, Math.round(a[2] * 3))); }); }
  // the foul walls and their stands along the lines
  for (const s of [-1, 1]) for (let i = 0; i < 12; i++) {
    const al0 = 90 + i * 60, al1 = al0 + 60, lx = d => HX + s * d / Math.SQRT2, ly = d => HY - d / Math.SQRT2, nx = s / Math.SQRT2, ny = 1 / Math.SQRT2;
    m7.add(lx(al0 + 30) + nx * 100, ly(al0 + 30) + ny * 100, 0, g => {
      const pr = (d, o, z) => m7.project(lx(d) + nx * o, ly(d) + ny * o, z);
      const w0 = pr(al0, 70, 0), w1 = pr(al1, 70, 0), w2 = pr(al1, 70, 14), w3 = pr(al0, 70, 14), s2 = pr(al1, 140, 56), s3 = pr(al0, 140, 56);
      if (w0 && w1 && w2 && w3) px.poly(g, [[w0[0], w0[1]], [w1[0], w1[1]], [w2[0], w2[1]], [w3[0], w3[1]]], fc);
      if (w2 && w3 && s2 && s3) px.poly(g, [[w3[0], w3[1]], [w2[0], w2[1]], [s2[0], s2[1]], [s3[0], s3[1]]], i % 2 ? sc : E.shade(sc, -.08));
    });
  }
  // the crowd
  const hype = M ? offense().meter / 100 : .3;
  for (const f of kit.fans) m7.add(f.x, f.y, f.z, (g, sx, sy, k) => fanDraw(g, f, sx, sy, k, t, hype));
  // players
  if (M) {
    for (const F of M.fielders) if (F.rig && !(F.pos === 'C' && M.cam === 'plate')) m7.rig(F.rig, F.x, F.y, F.z);
    for (const r of M.runners) if (r.rig && r.state !== 'out' && r.state !== 'scored') m7.rig(r.rig, r.x, r.y, 0);
    if (M.batRig && M.cam === 'plate') m7.rig(M.batRig.rig, M.batRig.x, M.batRig.y, 0);
    // the catcher is out of the shot: his mitt pops into frame on the catch (the umpire is a cut-in on the calls)
    if (M.phase === 'afterPitch' && M.lastCross && M.t - M.lastCross.t < .6) { const c = M.lastCross; m7.add(HX + c.x, PLATE_Y + 10, 0, g => { const p = m7.project(HX + c.x, PLATE_Y + 10, Math.max(2, c.z - 3)); if (p) { px.disc(g, p[0], p[1], Math.max(3, 4 * p[2]), '#7a3a1a'); px.disc(g, p[0] - p[2], p[1] - p[2], Math.max(2, 2.6 * p[2]), '#a85a2a'); } }); }
    hazardDrawM7(m7, t);
    const pt = M.pitch, b = M.ball;
    if (pt && (M.phase === 'flight') && !(b && b.mode === 'batted')) {
      const u = pt.t / pt.T, p = pitchPos(pt, u), hidden = pitchHidden(pt, u);
      if (!hidden) m7.add(p.x, p.y, p.z, (g, sx, sy, k) => ballDraw(g, sx, sy, k, pt.def.trail, pt.def.pull ? .5 : 1, pt.t));
      else m7.add(p.x, p.y, p.z, (g, sx, sy, k) => { if (RF() < .3) px.blend(g, .3, 'add', () => px.disc(g, sx, sy, Math.max(1, 2 * k), '#c0f0ff')); });
      m7.add(p.x, p.y, 0, (g, sx, sy, k) => px.blend(g, .35, 'multiply', () => px.disc(g, sx, sy, Math.max(1, 1.6 * k), '#202020')));
    }
    if (b && (b.mode === 'batted' || b.mode === 'homer' || b.mode === 'thrown' || b.mode === 'dead')) {
      if (!b.hidden) m7.add(b.x, b.y, Math.max(0, b.z), (g, sx, sy, k) => ballDraw(g, sx, sy, k, b.kind === 'batzooka' ? 'fire' : null, 1, b.t));
      m7.add(b.x, b.y, 0, (g, sx, sy, k) => px.blend(g, .35, 'multiply', () => px.disc(g, sx, sy, Math.max(1, 1.6 * k), '#202020')));
    }
  }
  m7.draw(r);
  if (M && M.cam === 'plate') r.overlay(g => zoneOverlay(g, m7));
}
function fanDraw(g, f, sx, sy, k, t, hype) {
  const C = BZ.CROWD, jumpSide = C.jump > 0 && (M ? (C.side === 1 ? f.shirt !== '#3b82f6' : true) : true);
  const wave = C.waveOn ? Math.max(0, Math.sin(Math.atan2(f.y - HY, f.x - HX) * 3 - C.wave * 3)) : 0;
  const bob = (Math.sin(t * 3 + f.ph) * .5 + .5) * (1 + hype * 2) + (jumpSide ? Math.abs(Math.sin(t * 9 + f.ph)) * 4 : 0) + wave * 5;
  const h = Math.max(1, 6 * k), w = Math.max(1, 3 * k), y = sy - bob * k;
  if (h < 1.5) { px.dot(g, sx, y - 1, f.shirt); return; }
  px.rect(g, sx - w / 2, y - h, w, h * .7, f.shirt); px.disc(g, sx, y - h - w * .4, Math.max(.6, w * .45), f.skin);
  if (f.cap) px.rect(g, sx - w / 2, y - h - w * .8, w, Math.max(1, w * .35), M ? M.teams[1].def.chip : '#1e2a5a');
  if (wave > .6 || (jumpSide && C.jump > 1)) { px.line(g, sx - w / 2, y - h, sx - w, y - h - w * 1.4, f.skin); px.line(g, sx + w / 2, y - h, sx + w, y - h - w * 1.4, f.skin); }
}
function ballDraw(g, sx, sy, k, trail, scale = 1, tt = 0) {
  const rad = Math.max(1.2, 1.6 * k * scale);
  if (trail === 'fire') { px.blend(g, .7, 'add', () => { for (let i = 1; i < 5; i++) px.disc(g, sx + (RF() - .5) * rad, sy + i * rad * .6, rad * (1.2 - i * .18), i < 2 ? '#ffe060' : '#ff6a1a'); }); }
  else if (trail === 'laser') px.blend(g, .8, 'add', () => px.disc(g, sx, sy, rad * 1.8, '#ff2a4a'));
  else if (trail === 'void') px.disc(g, sx, sy, rad * 2.2, '#1a0a2a');
  else if (trail === 'spark') px.blend(g, .7, 'add', () => { px.line(g, sx - rad * 2, sy - rad, sx + rad * 2, sy + rad, '#7ff0ff'); });
  else if (trail === 'wave') px.blend(g, .5, 'add', () => px.disc(g, sx, sy + rad, rad * 2.4, '#3ac0ff'));
  else if (trail === 'popcorn') px.blend(g, .7, 'normal', () => { for (let i = 0; i < 3; i++) px.disc(g, sx + Math.sin(tt * 20 + i * 2) * rad * 2, sy + Math.cos(tt * 20 + i * 2) * rad * 2, rad * .6, '#fff4c0'); });
  else if (trail === 'ember') px.blend(g, .6, 'add', () => px.disc(g, sx, sy - rad, rad * 1.4, '#ff8a3a'));
  px.disc(g, sx, sy, rad, '#f4f4f0'); if (rad > 2) { px.line(g, sx - rad * .5, sy - rad * .6, sx - rad * .3, sy + rad * .6, '#d83a3a'); px.line(g, sx + rad * .5, sy - rad * .6, sx + rad * .3, sy + rad * .6, '#d83a3a'); }
  px.dot(g, sx - rad * .4, sy - rad * .4, '#ffffff');
}
/* the zone, the reticle, the pitch target and its release ring, the crossing dot (projected on the plate's plane) */
function zoneOverlay(g, m7) {
  const b = batterNow(), Z = zoneOf(b), P_ = (x, z) => m7.project(HX + x, PLATE_Y, z);
  const show = game.settings.zone || 'pitch', live = ['windup', 'flight'].includes(M.phase) || (M.phase === 'select');
  const human = !autoBat() || !autoPit();
  if (show === 'always' || M.cheats.showZone || (show === 'pitch' && live && human)) {
    const c = ['#ffffff'], a = P_(Z.x0, Z.z0), d = P_(Z.x1, Z.z1); if (a && d) {
      px.blend(g, .5, 'normal', () => { for (let i = 0; i <= 3; i++) { const xx = lerp(a[0], d[0], i / 3), yy = lerp(a[1], d[1], i / 3); px.line(g, xx, a[1], xx, d[1], c[0]); px.line(g, a[0], yy, d[0], yy, c[0]); } });
    }
  }
  // the batter's reticle (human batting, or the dev's view of the CPU's)
  if (!autoBat() || M.cheats.showAI) {
    const kind = M.armed ? 'batzooka' : 'contact', BI = batIn(), power = BI && BI.down('west'), S = SWINGS[power ? 'power' : kind];
    const rr = S.r * statF(b.con) * TUNE.sweetSpot * (batIn() ? M.diff.assist * (game.settings.batAssist === 'big' ? 1.25 : 1) : 1), c = P_(M.reticle.x, M.reticle.z), e = P_(M.reticle.x + rr, M.reticle.z);
    if (c && e) { const rad = Math.abs(e[0] - c[0]), col = M.armed ? '#ff8a2a' : power ? '#ff4a4a' : '#ffe680';
      px.blend(g, .35, 'normal', () => ringDraw(g, c[0], c[1], rad * 1.6, '#ffffff'));
      ringDraw(g, c[0], c[1], rad, col); if (power || M.armed) ringDraw(g, c[0], c[1], rad - 1, col); px.disc(g, c[0], c[1], 1, col);
      if (M.armed) px.blend(g, .5, 'add', () => { for (let i = 0; i < 8; i++) { const a = game.time * 6 + i * .8; px.disc(g, c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad, 1.5, '#ffb030'); } }); }
  }
  // the pitcher's target marker and release ring
  if (!autoPit() && (M.phase === 'windup')) {
    const c = P_(M.target.x, M.target.z), e = P_(M.target.x + 1.6, M.target.z); if (c && e) {
      const rad = Math.max(2, Math.abs(e[0] - c[0])); ringDraw(g, c[0], c[1], rad, '#7aa7ff'); px.line(g, c[0] - rad - 2, c[1], c[0] + rad + 2, c[1], '#7aa7ff'); px.line(g, c[0], c[1] - rad - 2, c[0], c[1] + rad + 2, '#7aa7ff');
      const rs = M.windT - .45, u = clamp((M.phaseT - rs) / .45, 0, 1); if (M.phaseT >= rs) ringDraw(g, c[0], c[1], rad + (1 - u) * 26, u > .9 ? '#4fe0b0' : '#ffffff');
    }
  }
  if (M.lastCross && M.t - M.lastCross.t < 1.5 && M.phase !== 'flight') { const c = P_(M.lastCross.x, M.lastCross.z); if (c) { px.disc(g, c[0], c[1], 2.5, '#ff3a3a'); px.disc(g, c[0], c[1], 1.2, '#ffffff'); } }
  // dev: the predicted path and the timing bar
  if (M.cheats.showAI && M.pitch && M.phase === 'flight') { for (let u = 0; u <= 1; u += .05) { const p = pitchPos(M.pitch, u), q = m7.project(p.x, p.y, p.z); if (q) px.dot(g, q[0], q[1], '#ff00ff'); } }
}
function ringDraw(g, cx, cy, r, c) { const n = Math.max(12, Math.round(r * 2)); for (let i = 0; i < n; i++) { const a = i / n * TAU; px.dot(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, c); } }
BZ.zoneFromPointer = () => {
  if (!M || M.cam !== 'plate' || HEADLESS) return null;
  const kit = PARK_CACHE[M.parkId]; if (!kit) return null; const m7 = kit.m7, p = game.input.pointer(); if (!p) return null;
  const o = m7.project(HX, PLATE_Y, 17), ex = m7.project(HX + 1, PLATE_Y, 17), ez = m7.project(HX, PLATE_Y, 18); if (!o || !ex || !ez) return null;
  return [(p[0] - o[0]) / (ex[0] - o[0]), 17 + (p[1] - o[1]) / (ez[1] - o[1])];
};

/* ---- the Broadcast Cam ---- */
const CAMS = { x: HX, y: HY - 300, z: 1, tz: 1 };
function broadcastFocus(dt) {
  if (!M) return;
  let pts = [];
  const b = M.ball;
  if (M.phase === 'rhubarb' && M.rhubarb) { pts = M.rhubarb.fighters.map(f => [f.x, f.y]); }
  else if (M.phase === 'halfEnd' && M.show) { const s = M.show; pts = s.kind === 'race' ? [[HX, HY - 900], [HX, HY - 600]] : s.kind === 'tshirt' ? [[HX, HY - 100], [HX - 250, HY - 250]] : [[HX - 150, HY - 200], [HX + 150, HY - 250]]; }
  else if (b && (b.mode === 'batted' || b.mode === 'homer')) { pts.push([b.x, b.y]); if (b.pred && b.mode === 'batted' && !b.bounced) pts.push([b.pred.land.x, b.pred.land.y]); const ch = M.fielders.find(f => f.job === 'chase'); if (ch) pts.push([ch.x, ch.y]); }
  else if (b && b.mode === 'thrown') { pts.push([b.x, b.y], [b.toPt.x, b.toPt.y]); }
  else if (b && b.mode === 'held' && b.holder) { pts.push([b.holder.x, b.holder.y]); const lead = M.runners.filter(r => r.state === 'running').sort((a, c) => c.target - a.target)[0]; if (lead) pts.push([lead.x, lead.y], [basePos(lead.target).x, basePos(lead.target).y]); }
  if (!pts.length) pts = [[HX, HY - 212], [HX, HY]];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, W = (game.W || 427) - 96, H = ((game.H || 240) - 96) / Math.sin(52 * Math.PI / 180);
  const z = clamp(Math.min(W / Math.max(1, x1 - x0), H / Math.max(1, y1 - y0)), .5, 1.1) * TUNE.fieldZoom;
  const k = 1 - Math.exp(-dt / .15); CAMS.x += (cx - CAMS.x) * k; CAMS.y += (cy - CAMS.y) * k; CAMS.z += (z - CAMS.z) * k;
}
function drawBroadcast(r, kit) {
  const park = kit.park, t = game.time, map = kit.map;
  const zq = Math.round(clamp(CAMS.z, .4, 2.2) * 20) / 20; if (Math.abs((game.zoom || 1) - zq) > .001) game.setZoom(zq);
  game.focus(CAMS.x, CAMS.y, 0);
  if (park.night) { LIGHTS.enabled = true; LIGHTS.ambient = park.ambient; for (const p of kit.props) if (p.kind === 'tower') LIGHTS.add(p.x, p.y, p.h, 900, .9, { color: park.id === 'caldera' ? '#ffb070' : '#e8f0ff' }); if (park.ground === 'lava') for (const f of kit.fence) if (Math.round(f.th * 20) % 4 === 0) LIGHTS.add(f.x, f.y, 10, 120, .5, { color: '#ff6a1a' }); }
  else LIGHTS.enabled = false;
  map.drawFloor(r); map.queueWalls(r);
  for (const p of kit.props) r.queue(p.x, p.y, 0, g => { const s = r.w(p.x, p.y, 0); drawProp(g, p, s[0], s[1], (r.view.zoom || 1) * .9, t); }, { bias: 2 });
  // fans, in groups
  const hype = M ? offense().meter / 100 : .3, zf = r.view.zoom || 1;
  for (let i = 0; i < kit.fans.length; i += 10) { const f0 = kit.fans[i]; r.queue(f0.x, f0.y, f0.z, g => { for (let j = i; j < Math.min(i + 10, kit.fans.length); j++) { const f = kit.fans[j], s = r.w(f.x, f.y, f.z); fanDraw(g, f, s[0], s[1], zf * .9, t, hype); } }); }
  // the bases
  for (let k = 1; k <= 3; k++) { const bp = basePos(k); r.queue(bp.x, bp.y, 0, g => { const s = r.w(bp.x, bp.y, 0); px.rect(g, s[0] - 3 * zf, s[1] - 2 * zf, 6 * zf, 4 * zf, '#ffffff'); }, { bias: -5 }); }
  if (!M) return;
  if (M.replay) { replayDraw(r); return; }
  for (const F of M.fielders) if (F.rig) { r.shadow(F.x, F.y, 5); r.actor(F.x, F.y, F.z, (g, ox, oy) => F.rig.draw(g, ox, oy, r.view)); }
  for (const R_ of M.runners) if (R_.rig && R_.state !== 'out' && R_.state !== 'scored') { r.shadow(R_.x, R_.y, 5); r.actor(R_.x, R_.y, 0, (g, ox, oy) => R_.rig.draw(g, ox, oy, r.view)); }
  if (M.batRig) r.actor(M.batRig.x, M.batRig.y, 0, (g, ox, oy) => M.batRig.rig.draw(g, ox, oy, r.view));
  if (UMP.rig && M.phase !== 'rhubarb') r.actor(HX, HY + 30, 0, (g, ox, oy) => UMP.rig.draw(g, ox, oy, r.view));
  if (M.rhubarb) { for (const f of M.rhubarb.fighters) if (f.rig) { r.shadow(f.x, f.y, 5); r.actor(f.x, f.y, 0, (g, ox, oy) => f.rig.draw(g, ox, oy, r.view)); }
    // fight clouds where the AI scrums
    for (let i = 0; i < 3; i++) { const cx = HX + Math.sin(t * .7 + i * 2) * 70, cy = HY - 60 + Math.cos(t * .5 + i) * 40; r.queue(cx, cy, 10, g => { const s = r.w(cx, cy, 10); for (let j = 0; j < 6; j++) px.disc(g, s[0] + Math.sin(t * 7 + j) * 9 * zf, s[1] + Math.cos(t * 6 + j * 1.7) * 6 * zf, (7 + Math.sin(t * 9 + j) * 2) * zf, j % 2 ? '#d8d0c0' : '#b8b0a0'); if (Math.floor(t * 6 + i) % 3 === 0) E.font.text(g, ['POW', 'BONK', 'OOF'][i], s[0], s[1] - 18 * zf, '#ffe060', { align: 'center' }); }); } }
  const b = M.ball;
  if (b && b.mode !== 'dead') {
    if (b.pred && b.mode === 'batted' && !b.bounced && b.vz !== 0) { const L = b.pred.land; r.decal(() => r.groundRing(L.x, L.y, 7 + Math.sin(t * 8) * 2, '#ffe060')); r.queue(L.x, L.y, 0, g => { const s = r.w(L.x, L.y, 0); px.line(g, s[0] - 4, s[1] - 3, s[0] + 4, s[1] + 3, '#ffe060'); px.line(g, s[0] - 4, s[1] + 3, s[0] + 4, s[1] - 3, '#ffe060'); }); }
    r.shadow(b.x, b.y, 2.5, .5);
    if (!b.hidden) {
      const dz = drawZ(b.z);
      if (b.trail && b.trail.length > 2 && (Math.hypot(b.vx, b.vy, b.vz) > 450 || b.kind === 'batzooka')) r.queue(b.x, b.y, dz, g => { for (let i = 0; i < b.trail.length; i += 2) { const [x, y, z] = b.trail[i], s = r.w(x, y, drawZ(z)); px.blend(g, .4, 'add', () => px.disc(g, s[0], s[1], 1 + i / 10, b.kind === 'batzooka' ? '#ff8a2a' : '#ffffff')); } }, { emissive: true });
      if (b.laser && b.mode === 'thrown') r.queue(b.x, b.y, dz, g => { const a = r.w(b.from.x, b.from.y, b.from.z), c = r.w(b.x, b.y, b.z); px.blend(g, .8, 'add', () => px.line(g, a[0], a[1], c[0], c[1], '#ff2a4a', 2)); }, { emissive: true });
      r.queue(b.x, b.y, dz, g => { const s = r.w(b.x, b.y, dz); ballDraw(g, s[0], s[1], zf * 1.2, b.kind === 'batzooka' ? 'fire' : null, 1, b.t); }, { emissive: b.kind === 'batzooka' });
    }
  }
  // throw targets: a ring per base with its button, when the human's fielder holds the ball
  const h = holderF(), I = defHumanInput();
  if (h && h.human && I && M.phase === 'inPlay') for (let k = 1; k <= 4; k++) { const bp = basePos(k); r.decal(() => r.groundRing(bp.x, bp.y, 12 + (BZ.hoverBase === k ? 4 : 0), '#ffffff')); r.queue(bp.x, bp.y, 30, g => { const s = r.w(bp.x, bp.y, 30); glyph(g, I, I.lastDevice === 'keyboard' ? 'num' + k : ['east', 'north', 'west', 'south'][k - 1], s[0] - 5, s[1] - 5, 11); }); }
  for (const F of M.fielders) if (F.human) { const I2 = defHumanInput(); r.queue(F.x, F.y, 46, g => { const s = r.w(F.x, F.y, 46); px.poly(g, [[s[0] - 4, s[1] - 5], [s[0] + 4, s[1] - 5], [s[0], s[1]]], I2 ? I2.color || '#4a8aff' : '#4a8aff'); }); }
  hazardDrawBroadcast(r, t);
  if (M.show) showDraw(r, M.show, t);
  for (const p of BZ.CROWD.pops) r.textAt(p.x, p.y, p.z, p.text, '#ffe680');
}
BZ.mouseWorld = () => { const g = game.mouseGround && game.mouseGround(); return g ? [g[0] !== undefined ? g[0] : g.x, g[1] !== undefined ? g[1] : g.y] : null; };
function drawMatchWorld(r) {
  if (!M) return;
  const kit = parkKit(M.parkId);
  if (M.cam === 'plate' || M.cam === 'moonshot') { LIGHTS.enabled = false; drawPlate(r, kit); }
  else { if (game.view.id !== fieldView() && game.baseView !== E.VIEWS[fieldView()]) game.setView(fieldView()); drawBroadcast(r, kit); }
}
/* hazards and shows, drawn */
function hazardDrawM7(m7, t) {
  const h = M.hz; if (!h) return;
  for (const g of h.gulls) if (g.blob) m7.add(g.x, g.y, g.z, (G, sx, sy, k) => g.blob.draw(G, Math.round(sx), Math.round(sy), m7.view(k)));
  for (const d of h.drones) if (d.alive && d.blob) m7.add(d.x, d.y, d.z, (G, sx, sy, k) => { d.blob.draw(G, Math.round(sx), Math.round(sy), m7.view(k)); px.blend(G, .5, 'add', () => px.disc(G, sx, sy - 6 * k, Math.max(1, 2 * k), '#e01e3c')); });
  if (h.ventHot > 0 || h.ventWarn > 0) for (const v of h.vents || []) m7.add(v.x, v.y, 0, (G, sx, sy, k) => { const hgt = h.ventHot > 0 ? 120 : 20; px.blend(G, .6, 'add', () => { for (let i = 0; i < 6; i++) px.disc(G, sx + Math.sin(t * 9 + i) * 8 * k, sy - i * hgt / 6 * k, (14 - i) * k, h.ventHot > 0 ? '#ff8a2a' : '#8a8a8a'); }); });
}
function hazardDrawBroadcast(r, t) {
  const h = M.hz; if (!h) return; const zf = r.view.zoom || 1;
  for (const g of h.gulls) if (g.blob) r.actor(g.x, g.y, drawZ(g.z), (G, ox, oy) => g.blob.draw(G, ox, oy, r.view));
  for (const d of h.drones) if (d.alive && d.blob) r.actor(d.x, d.y, drawZ(d.z), (G, ox, oy) => d.blob.draw(G, ox, oy, r.view));
  for (const c of h.craters) r.decal(() => r.groundDisc ? r.groundDisc(c.x, c.y, c.r, '#5a5a66') : null);
  if (h.ventHot > 0 || h.ventWarn > 0) for (const v of h.vents || []) r.queue(v.x, v.y, 0, g => { const s = r.w(v.x, v.y, 0); px.blend(g, .6, 'add', () => { for (let i = 0; i < 6; i++) px.disc(g, s[0] + Math.sin(t * 9 + i) * 8 * zf, s[1] - i * (h.ventHot > 0 ? 18 : 4) * zf, (12 - i) * zf, h.ventHot > 0 ? '#ff8a2a' : '#8a8a8a'); }); }, { emissive: true });
  else for (const v of h.vents || []) r.queue(v.x, v.y, 0, g => { const s = r.w(v.x, v.y, 0); px.disc(g, s[0], s[1], 10 * zf, '#3a2420'); px.disc(g, s[0], s[1], 5 * zf, '#ff6a1a'); }, { emissive: true });
}
const MASCOTS = {};
function mascotOf(id) { if (MASCOTS[id]) return MASCOTS[id]; const m = PARKS[id].mascot; return MASCOTS[id] = new E.Blob({ R: 9, feet: true, mouth: true, wings: !!m.wings, face: 'front', colors: { dk: m.dk, base: m.base, lt: m.lt, eye: '#1a1a1a' } }); }
function showDraw(r, s, t) {
  const u = s.t / s.len;
  if (s.kind === 'race') {
    const ids = [M.parkId, ...PARK_ORDER.filter(p => p !== M.parkId)].slice(0, 3);
    ids.forEach((id, i) => { const bl = mascotOf(id), tripped = i === s.trip && u > .5 && u < .7; const th = -.7 + clamp(u * (1 + i * .08) * (tripped ? .6 : 1), 0, 1) * 1.4, R0 = fenceR(M.park, th) - 24 - i * 12, [ux, uy] = dirOf(th);
      bl.update(1 / 60, { walk: tripped ? 0 : 1, squash: tripped ? -.4 : Math.sin(t * 14 + i) * .15 }); r.actor(HX + ux * R0, HY + uy * R0, 0, (g, ox, oy) => bl.draw(g, ox, oy, r.view)); });
  } else if (s.kind === 'tshirt') {
    for (let i = 0; i < 5; i++) { const k = ((u * 2 + i * .2) % 1), x = lerp(HX, HX + (i - 2) * 160, k), y = lerp(HY - 30, HY - 420 - i * 50, k), z = Math.sin(k * Math.PI) * 140; r.queue(x, y, drawZ(z), g => { const p = r.w(x, y, drawZ(z)); px.rect(g, p[0] - 3, p[1] - 3, 6, 5, ['#e8443a', '#3b82f6', '#f2c230', '#22c55e', '#ffffff'][i]); }); }
    const bl = mascotOf(M.parkId); bl.update(1 / 60, { squash: Math.sin(t * 10) * .2 }); r.actor(HX, HY - 30, 0, (g, ox, oy) => bl.draw(g, ox, oy, r.view));
  } else {
    for (let i = 0; i < 4; i++) { const bl = mascotOf(s.kind === 'dance' ? M.parkId : PARK_ORDER[i]); bl.update(1 / 60, { squash: Math.sin(t * 12 + i) * .3 }); const x = HX - 150 + i * 100, y = HY - 220 + Math.sin(t * 3 + i) * 20; r.actor(x, y, Math.abs(Math.sin(t * 6 + i)) * 10, (g, ox, oy) => bl.draw(g, ox, oy, r.view)); }
  }
}
