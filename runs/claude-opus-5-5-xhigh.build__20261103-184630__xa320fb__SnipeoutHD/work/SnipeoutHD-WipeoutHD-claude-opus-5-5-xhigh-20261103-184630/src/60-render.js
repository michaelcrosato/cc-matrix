// SNIPEOUT HD: rendering. The worlds (the hangar for the front end, one track world at a time, the overclock skin as its
// own world), the craft posed part way between steps, the cameras (chase, far chase, cockpit, look back, free fly) and
// the TV director (trackside, heli, chase, nose, low and flyby shots for intros, replays, spectating and the attract).
// Headless (Node) every call here is a no-op where it would draw; the camera maths still runs.
(() => {
const E = My3D2dge, SN = globalThis.SN, V = SN.v, U = 16, M = 16;
const R = SN.render = { hangar: null, tw: null, cur: null, rollSign: -1 };
R.has3D = () => !!(E.World3D && E.World3D.renderer);
R.ready3D = () => !!(E.World3D && E.World3D.renderer !== undefined && SN._w3dInit);

/* ---- camera poses ---- */
/** a pose from an eye and a point to look at, with an up vector for the roll */
SN.poseFrom = (eye, look, up, fov, out = {}) => {
  const dx = look[0] - eye[0], dy = look[1] - eye[1], dz = look[2] - eye[2], l = Math.hypot(dx, dy, dz) || 1, dir = [dx / l, dy / l, dz / l];
  const rf = V.norm([0, 0, 0], V.cross([0, 0, 0], SN.ZUP, dir));
  const roll = up ? R.rollSign * Math.atan2(V.dot(up, rf), V.dot(up, SN.ZUP)) : 0;
  // wide: on a screen taller than 4:3 the lens widens to keep the 4:3 view (a phone held upright, a narrow frame)
  return Object.assign(out, { x: eye[0], y: eye[1], z: eye[2], yaw: Math.atan2(dir[1], dir[0]), pitch: Math.asin(E.clamp(dir[2], -1, 1)), roll: E.clamp(roll, -1.2, 1.2), fov, wide: true });
};
/** a chase camera for one craft (its smoothed frame kept in cam) */
SN.ChaseCam = class {
  constructor() { this.Fs = null; this.Us = null; this.mode = 'chase'; this.pose = {}; this.free = null; }
  reset() { this.Fs = null; }
  update(ship, dt, race, o = {}) {
    const T = SN.Tune.T, top = ship.st.top * ship.topK, v = ship.speed, mode = o.mode || this.mode;
    if (!this.Fs || o.cut) { this.Fs = ship.F.slice(); this.Us = ship.U.slice(); }
    const k = 1 - Math.exp(-T.camLag * dt), upW = V.norm([0, 0, 0], V.lerp([0, 0, 0], SN.ZUP, ship.U, .6));
    V.toward(this.Fs, this.Fs, ship.grounded || ship.rescue ? ship.F : ship.F, k); V.toward(this.Us, this.Us, upW, k);
    const far = mode === 'far', boost = ship.boostT > 0 ? 6 : 0, kv = Math.min(1.3, v / top);
    let d = T.camDistance * (1 + .15 * kv) * (far ? 1.5 : 1), h = T.camHeight * (far ? 1.6 : 1), fov = T.camFov + T.camFovBoost * kv * kv + boost - (far ? 6 : 0);
    const P = ship.P;
    if (mode === 'cockpit') {
      const eye = V.addS([0, 0, 0], V.addS([0, 0, 0], P, ship.F, 30), ship.U, 15), look = V.addS([0, 0, 0], eye, ship.F, 400);
      const up = V.rot([0, 0, 0], ship.U, ship.F, (ship.vis.bank + ship.rollAng) * -R.rollSign * -1);
      return SN.poseFrom(eye, look, up, 84 + boost + T.camFovBoost * .5 * kv * kv, this.pose);
    }
    if (o.lookBack) { const eye = V.addS([0, 0, 0], V.addS([0, 0, 0], P, this.Fs, d * .8), this.Us, h), look = V.addS([0, 0, 0], P, ship.U, 10); return SN.poseFrom(eye, look, this.Us, fov, this.pose); }
    const eye = V.addS([0, 0, 0], V.addS([0, 0, 0], P, this.Fs, -d), this.Us, h);
    // keep the eye under a tunnel's roof
    const fr = race.track.frameAt(ship.s); if (fr.flags & SN.TFLAG.TUNNEL) { const above = V.dot(V.sub([0, 0, 0], eye, fr.C), fr.U); if (above > 10 * M) V.addS(eye, eye, fr.U, 10 * M - above); }
    const look = V.addS([0, 0, 0], V.addS([0, 0, 0], P, ship.F, 120), ship.U, 12);
    return SN.poseFrom(eye, look, this.Us, fov, this.pose);
  }
};
/** the dev mode's free camera: WASD or the stick fly, Q / E or the triggers up and down, the mouse or right stick turn */
SN.FreeCam = class {
  constructor(p) { this.x = p.x; this.y = p.y; this.z = p.z; this.yaw = p.yaw; this.pitch = p.pitch; this.pose = {}; }
  update(I, dt) {
    const m = I.move(), sp = (I.down('absorb') ? 2400 : 900) * dt, cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    this.x += (cy * -m[1] - sy * m[0]) * sp; this.y += (sy * -m[1] + cy * m[0]) * sp;
    this.z += ((I.down('brakeR') ? 1 : 0) - (I.down('brakeL') ? 1 : 0)) * sp;
    const aim = I.padAim; if (aim) { this.yaw += aim[0] * 2.2 * dt; this.pitch = E.clamp(this.pitch - aim[1] * 1.6 * dt, -1.4, 1.4); }
    const pt = I.pointer(), M0 = this._m; if (pt && M0 && I.down('fire')) { this.yaw += (pt[0] - M0[0]) * .008; this.pitch = E.clamp(this.pitch - (pt[1] - M0[1]) * .008, -1.4, 1.4); } this._m = pt;
    return Object.assign(this.pose, { x: this.x, y: this.y, z: this.z, yaw: this.yaw, pitch: this.pitch, roll: 0, fov: 70 });
  }
};

/* ---- the TV director ---- */
SN.spotsFor = (T, terrain) => {
  if (T._spots) return T._spots;
  const out = []; let side = 1;
  for (let s = 0; s < T.L; s += 200 * M) {
    const fr = T.frameAt(s), i = fr.i, kap = T.kappa[i];
    if (fr.flags & SN.TFLAG.TUNNEL) { const p = V.addS([0, 0, 0], V.addS([0, 0, 0], fr.C, fr.R, (fr.hw - 4 * M) * side), fr.U, 10 * M); out.push({ s, p, tunnel: true }); side = -side; continue; }
    const sd = Math.abs(kap) > 1 / (300 * M) ? -Math.sign(kap) : (side = -side);
    for (const off of [22, 32, 15]) {
      const p = V.addS([0, 0, 0], V.addS([0, 0, 0], fr.C, [fr.R[0], fr.R[1], 0], sd * (fr.hw + off * M)), SN.ZUP, (6 + (s / M % 14)) * M);
      if (terrain && terrain.height(p[0], p[1]) > p[2] - 2 * M) { p[2] = terrain.height(p[0], p[1]) + 4 * M; if (p[2] - fr.C[2] > 40 * M) continue; }
      let inside = false; for (const j of T.bucketAt(p[0], p[1])) if (Math.abs(T.dS(s, j * T.ds)) > 60 * M && Math.hypot(p[0] - T.Cx[j], p[1] - T.Cy[j]) < T.hw[j] + 4 * M && Math.abs(p[2] - T.Cz[j]) < 14 * M) inside = true;
      if (inside) continue;
      out.push({ s, p }); break;
    }
  }
  return (T._spots = out);
};
SN.TVDirector = class {
  constructor(T, terrain) { this.T = T; this.spots = SN.spotsFor(T, terrain); this.shot = null; this.t = 0; this.cuts = 0; this.lastCut = -9; this.target = null; this.pose = {}; this.chase = new SN.ChaseCam(); this.fov = 40; }
  pick(race, attract) {
    // the most interesting craft: a fight close together, a weapon just fired, a jump; else the leader (or the player)
    if (!attract && race.player && !race.player.hidden) return race.player;
    const live = race.ships.filter(s => !s.hidden && !s.ghost && !s.drone && !s.elim);
    let best = live[0], bs = -1e9;
    for (const s of live) { let k = -s.place * 2; if (s._firedAt > race.clock - 2) k += 8; if (!s.grounded) k += 6; for (const o of live) if (o !== s && Math.abs(race.track.dS(s.s, o.s)) < 300) k += 3; if (s === this.target) k += 4; if (k > bs) { bs = k; best = s; } }
    return best;
  }
  cut(race, kind) {
    const tg = this.target; this.t = 0; this.cuts++; this.lastCut = race.clock; this.chase.reset();
    const T = this.T, kinds = ['heli', 'chase', 'nose', 'low', 'flyby'];
    if (!kind) kind = this.cuts % 3 === 0 ? kinds[Math.floor((race.clock * 7) % kinds.length)] : 'trackside';
    if (kind === 'trackside') {
      let best = null; for (const sp of this.spots) { const d = T.dS(tg.s, sp.s); if (d > 150 * M / 16 * 16 && d < 900 * M / 16 * 4 && (!best || d < best.d)) best = { sp, d }; }
      if (!best) { for (const sp of this.spots) { const d = T.dS(tg.s, sp.s); if (d > 50 && (!best || d < best.d)) best = { sp, d }; } }
      if (!best) kind = 'heli'; else { this.shot = { kind, spot: best.sp, hold: 2.5 + (race.clock * 13 % 3.5) }; return; }
    }
    this.shot = { kind, hold: 2.5 + (race.clock * 11 % 3) };
  }
  /** the pose for this step (dt), following the race's most interesting craft (or the given one) */
  update(race, dt, o = {}) {
    const T = this.T;
    const want = o.target || this.pick(race, o.attract);
    if (!this.target || (want !== this.target && race.clock - this.lastCut > 4) || this.target.hidden) { this.target = want; this.cut(race); }
    this.t += dt; const tg = this.target;
    // events cut early: an elimination, a railshot, a jump's launch
    if (race.clock - this.lastCut > 1.2 && race.events.some(e => (e.t === 'elim' || (e.t === 'fire' && e.weapon === 'rail')) && (e.ship === tg || e.by === tg))) this.cut(race, 'chase');
    if (this.shot.kind === 'trackside' && T.dS(this.shot.spot.s, tg.s) > 400 && this.t > 1.2) this.cut(race);
    else if (this.t > this.shot.hold && race.clock - this.lastCut > 1.2) this.cut(race);
    const P = tg.P, F = tg.F, v = tg.speed, S2 = this.shot;
    switch (S2.kind) {
      case 'trackside': { const d = V.dist(S2.spot.p, P); this.fov = E.clamp(20 + d / 60, 20, 40); return SN.poseFrom(S2.spot.p, V.addS([0, 0, 0], P, tg.U, 8), SN.ZUP, this.fov, this.pose); }
      case 'heli': { const eye = [P[0] - F[0] * 60 * M, P[1] - F[1] * 60 * M, P[2] + 40 * M]; return SN.poseFrom(eye, V.addS([0, 0, 0], P, F, 200), SN.ZUP, 50, this.pose); }
      case 'nose': { const eye = V.addS([0, 0, 0], V.addS([0, 0, 0], P, F, 70), tg.U, 16), look = V.addS([0, 0, 0], eye, F, 400); return SN.poseFrom(eye, look, tg.U, 80, this.pose); }
      case 'low': { const sAhead = tg.s + Math.max(300, v * .6) - this.t * v * .25, q = T.point(sAhead, tg.u * .5, 16); return SN.poseFrom(q, V.addS([0, 0, 0], P, tg.U, 6), T.frameAt(sAhead).U, 55, this.pose); }
      case 'flyby': { const q = T.point(tg.s + 30 * M, tg.u + 6 * M, 4 * M); return SN.poseFrom(q, P, SN.ZUP, 60, this.pose); }
      default: return this.chase.update(tg, dt, race);
    }
  }
};
/** the intro: 6 s along the line from 900 m before the grid, then a whip onto it */
SN.introPose = (race, t, out = {}) => {
  const T = race.track, k = Math.min(1, t / 5.2), s = -900 * M * (1 - SN.smooth01(k)) - 40 * M, fr = T.frameAt(s);
  const eye = V.addS([0, 0, 0], V.addS([0, 0, 0], fr.C, fr.U, (24 - 14 * k) * M), fr.R, Math.sin(t * .8) * 8 * M);
  const look = T.point(s + 160 * M, 0, 4 * M);
  return SN.poseFrom(eye, look, SN.ZUP, 64, out);
};

/* ---- the worlds ---- */
const settings = () => (E.current && E.current.settings) || {};
/** a track's world (the scenery theme, or the overclock skin): built once, kept until another replaces it */
R.trackWorld = (trackId, skin = 'normal') => {
  const key = trackId + ':' + skin;
  if (R.tw && R.tw.key === key) return R.tw;
  const T = SN.getTrack(trackId), themeId = skin === 'overclock' ? 'overclock' : SN.TRACKS[trackId].theme, th = SN.THEMES[themeId];
  const terrain = SN.terrainFor(T, themeId);
  const tw = { key, trackId, skin, T, themeId, theme: th, terrain, world: null, crafts: new Map(), race: null, cams: [] };
  if (!R.has3D()) { R.tw = tw; return tw; }
  if (R.tw && R.tw.world) { R.tw.world.dispose(); }
  const st = settings();
  const world = new E.World3D(E.current, {
    terrain, sky: th.sky, fog: th.fog, ambient: th.ambient, sun: Object.assign({ shadow: true, area: 900, map: 2048 }, th.sun),
    torchLights: 0, lights: 4, glowLights: 8, shadows: st.shadows3d !== false,
    filter: { look: st.filter3d || 'clean', bloom: st.bloom !== false && (themeId === 'city' || themeId === 'overclock' || true) },
    camera: { mode: 'fixed', far: 26000, near: 4, fixed: { x: T.Cx[0], y: T.Cy[0], z: T.Cz[0] + 400, yaw: 0, pitch: -.3, roll: 0, fov: 60 } },
    particleGround: (x, y, z) => { const g = T.groundBelow(x, y, z); return g > -1e9 ? g : terrain.height(x, y); },
    onDraw: (w, r) => R.onDraw(w, r)
  });
  tw.world = world;
  tw.meshes = SN.buildTrackMeshes(world, T, themeId, { terrain });
  tw.scenery = skin === 'overclock' ? { animate: [] } : SN.buildScenery(world, T, themeId, terrain);
  SN.fx.init(world);
  tw.lights = [world.light({ color: '#ffd8a0', reach: 900, power: 0 }), world.light({ color: '#7af0ff', reach: 900, power: 0 }), world.light({ color: th.neon, reach: 900, power: 0 }), world.light({ color: '#ffffff', reach: 600, power: 0 })];
  // every craft design built once now (so the race's craft never build a shader mid-race)
  for (const t of SN.TEAM_ORDER) SN.craftGeo(t);
  R.tw = tw;
  return tw;
};
/** craft meshes for a race's ships (ghosts translucent); the old ones are removed */
R.attach = (tw, race, o = {}) => {
  tw.race = race; if (!tw.world) return;
  for (const c of tw.crafts.values()) { tw.world.scene.remove(c.root); tw.world.scene.remove(c.trail.mesh); }
  tw.crafts.clear();
  for (const s of race.ships) {
    if (s.drone) { tw.crafts.set(s, R.droneTarget(tw.world)); continue; }
    tw.crafts.set(s, SN.buildCraft(tw.world, s.team, { ghost: s.ghost, color: s.ghost ? (s.seatColor || '#7af0ff') : null, champion: s.champion }));
  }
  if (!tw._prepared && o.prepare !== false) { tw.world.prepare(); tw._prepared = true; }
};
R.droneTarget = world => {
  const THREE = E.THREE, g = new THREE.Group(), m = new THREE.Mesh(world._own(new THREE.TorusGeometry(2.2, .35, 8, 24)), world._own(new THREE.MeshBasicNodeMaterial({ color: '#ff3a3a' })));
  g.add(m); world.scene.add(g); return { root: g, body: m, drone: true, trail: { mesh: new THREE.Object3D(), pts: [] }, flames: [], shell: null };
};
/** the hangar: a hall with a turntable and a podium of three steps, lit by coloured lights and neon strips */
R.hangarWorld = () => {
  if (R.hangar) return R.hangar;
  const hg = { world: null, cards: [] };
  if (!R.has3D()) { R.hangar = hg; return hg; }
  // a hall 40 x 30 tiles: the turntable to the north, the podium (three steps) in the middle, room for the cameras
  const rows = [], W = 40, H = 30;
  for (let y = 0; y < H; y++) { let s = ''; for (let x = 0; x < W; x++) s += x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '#' : (y >= 16 && y <= 17 && x >= 18 && x <= 21) ? '3' : (y >= 16 && y <= 17 && x >= 14 && x <= 17) ? '2' : (y >= 16 && y <= 17 && x >= 22 && x <= 25) ? '1' : '.'; rows.push(s); }
  const world = new E.World3D(E.current, {
    level: { rows, legend: { '#': { wall: 96 }, '.': { floor: 0 }, '3': { floor: 24, mark: 'p1' }, '2': { floor: 16, mark: 'p2' }, '1': { floor: 8, mark: 'p3' } }, ground: 'plain', colors: { base: '#15171e', dark: '#101218', light: '#1c1f28' }, side: 'metal', color: '#242833', wallSide: 'metal' },
    sky: ['#05060a', '#0c0e16'], fog: false, ambient: ['#8a90b8', '#20222c', 2.1], sun: { dir: [-.4, .3, -.85], color: '#e8ecff', intensity: 1.1, shadow: true, area: 400 },
    torchLights: 0, lights: 4, glowLights: 4, shadows: settings().shadows3d !== false, filter: { look: settings().filter3d || 'clean', bloom: settings().bloom !== false },
    camera: { mode: 'fixed', far: 4000, near: 2, fixed: { x: 20 * U, y: 20 * U, z: 60, yaw: -Math.PI / 2, pitch: -.2, roll: 0, fov: 50 } },
    onDraw: (w, r) => R.onDraw(w, r)
  });
  hg.world = world;
  const THREE = E.THREE;
  // neon strips round the hall and a turntable
  const g = new SN.GB(), neon = ['#29c8e8', '#ff3ab4', '#ffb347', '#7af0ff'];
  for (let k = 0; k < 4; k++) { const x0 = 16, x1 = W * 16 - 16, y0 = 16, y1 = H * 16 - 16, z = 70 + k * 6, c = neon[k];
    g.quad([x0, y0 + 1, z], [x1, y0 + 1, z], [x1, y0 + 1, z + 2], [x0, y0 + 1, z + 2], c, [0, 1, 0]); g.quad([x0 + 1, y0, z], [x0 + 1, y1, z], [x0 + 1, y1, z + 2], [x0 + 1, y0, z + 2], c, [1, 0, 0]); g.quad([x1 - 1, y0, z], [x1 - 1, y1, z], [x1 - 1, y1, z + 2], [x1 - 1, y0, z + 2], c, [-1, 0, 0]); }
  const tt = new SN.GB(), cx = 20 * 16, cy = 7 * 16;
  for (let k = 0; k < 32; k++) { const a0 = k / 32 * Math.PI * 2, a1 = (k + 1) / 32 * Math.PI * 2, r0 = 52, r1 = 56; tt.quad([cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0, 2], [cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0, 2], [cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1, 2], [cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1, 2], k % 2 ? '#29c8e8' : '#7af0ff', [0, 0, 1]); }
  const glow = world._own(new THREE.MeshBasicNodeMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  world.scene.add(g.mesh(glow, { shadow: false })); world.scene.add(tt.mesh(glow, { shadow: false }));
  hg.turntable = { x: cx, y: cy, z: 4 };
  hg.lights = [world.light({ color: '#29c8e8', reach: 400, power: 18 }), world.light({ color: '#ff3ab4', reach: 400, power: 14 }), world.light({ color: '#ffd8a0', reach: 500, power: 16 }), world.light({ color: '#ffffff', reach: 260, power: 26 })];
  hg.lights[0].x = cx - 120; hg.lights[0].y = cy; hg.lights[0].z = 90; hg.lights[1].x = cx + 120; hg.lights[1].y = cy; hg.lights[1].z = 90; hg.lights[2].x = cx; hg.lights[2].y = cy + 120; hg.lights[2].z = 120; hg.lights[3].x = cx; hg.lights[3].y = cy + 40; hg.lights[3].z = 110;
  for (const t of SN.TEAM_ORDER) SN.craftGeo(t);
  hg.crafts = {}; for (const t of SN.TEAM_ORDER) { hg.crafts[t] = SN.buildCraft(world, t); hg.crafts[t].root.visible = false; hg.crafts[t].trail.mesh.visible = false; }
  hg.craftsC = {}; for (const t of SN.TEAM_ORDER) { hg.craftsC[t] = SN.buildCraft(world, t, { champion: true }); hg.craftsC[t].root.visible = false; hg.craftsC[t].trail.mesh.visible = false; }
  world.prepare();
  R.hangar = hg; return hg;
};
/** show a craft on the hangar's turntable (spin: its angle) */
R.showCraft = (teamId, spin, champion = false) => {
  const hg = R.hangar; if (!hg || !hg.world) return;
  for (const t of SN.TEAM_ORDER) { hg.crafts[t].root.visible = false; hg.craftsC[t].root.visible = false; }
  if (!teamId) return;
  const c = (champion ? hg.craftsC : hg.crafts)[teamId]; c.root.visible = true;
  c.root.position.set(hg.turntable.x / U, (hg.turntable.z + 16 + Math.sin(E.current.real * 2) * 2) / U, hg.turntable.y / U); c.root.rotation.set(0, spin, 0);
  for (const f of c.flames) f.visible = false; c.flapL.rotation.z = c.flapR.rotation.z = 0;
};

/* ---- each frame ---- */
const _q = { M: null };
R.onDraw = (w, r) => {
  const G = E.current, tw = R.tw;
  if (tw && tw.world === w && tw.race) R.poseCrafts(tw, w);
  if (R.hangar && R.hangar.world === w) { const L = R.hangar.lights; if (L) { const t = G.real; L[0].power = 16 + Math.sin(t * 1.3) * 4; L[1].power = 12 + Math.sin(t * 1.7 + 1) * 4; } }
  if (R.extraDraw) try { R.extraDraw(w, r); } catch (e) { G.fail('render.extraDraw', e); }
};
/** every craft where it is part way through the step (game.alpha), its roll, flaps, flames, shell and trail */
R.poseCrafts = (tw, w) => {
  const THREE = E.THREE, G = E.current, race = tw.race, a = w._stepAt === G.real && !(G.hitstop > 0) ? E.clamp(G.alpha, 0, 1) : 1;
  const Mx = _q.M || (_q.M = new THREE.Matrix4()), f3 = new THREE.Vector3(), u3 = new THREE.Vector3(), r3 = new THREE.Vector3();
  const P = [0, 0, 0], F = [0, 0, 0], Up = [0, 0, 0], Rr = [0, 0, 0], t = race.clock;
  SN.animateTrack(tw.meshes, race, G.real);
  for (const fn of tw.scenery.animate) fn(G.real);
  SN.fx.draw(w, race, Math.min(.05, G.real - (R._lastReal || G.real))); R._lastReal = G.real;
  for (const [s, c] of tw.crafts) {
    const hide = s.hidden || (s.elim && !s.rescue) || (R.hideShip === s);
    c.root.visible = !hide; if (c.trail && c.trail.mesh) c.trail.mesh.visible = !hide && !c.drone;
    if (hide) { if (c.trail) c.trail.pts.length = 0; continue; }
    V.lerp(P, s.prev.P, s.P, a); V.norm(F, V.lerp(F, s.prev.F, s.F, a)); V.norm(Up, V.lerp(Up, s.prev.U, s.U, a)); V.norm(Rr, V.cross(Rr, Up, F)); V.norm(Up, V.cross(Up, F, Rr));
    if (c.drone) { c.root.position.set(P[0] / U, (P[2] + 10 + Math.sin(t * 3) * 4) / U, P[1] / U); c.root.rotation.set(0, t * 2, 0); continue; }
    f3.set(F[0], F[2], F[1]); u3.set(Up[0], Up[2], Up[1]); r3.set(Rr[0], Rr[2], Rr[1]);
    Mx.makeBasis(f3, u3, r3); c.root.quaternion.setFromRotationMatrix(Mx); c.root.position.set(P[0] / U, P[2] / U, P[1] / U);
    const roll = s.vis.bank + (s.prev.roll + (s.rollAng - s.prev.roll) * a) + (s.stagger > 0 ? Math.sin(t * 30) * .15 : 0);
    const bob = Math.sin(t * 2.2 + s.idx) * .02;
    c.body.rotation.set(roll, 0, -(s.lastPitch || 0) * .12 + bob);
    c.flapL.rotation.z = -s.vis.flap[0] * 1.05; c.flapR.rotation.z = -s.vis.flap[1] * 1.05;
    const boosting = s.boostT > 0, thr = s.lastThrust ? 1 : .3;
    for (const fl of c.flames) { fl.visible = boosting || s.lastThrust > 0; const L0 = boosting ? 26 + Math.sin(t * 40) * 4 : 8 * thr + Math.sin(t * 50) * 1.5; fl.scale.set(1, L0, 1); fl.position.x = -48 - L0 / 2 - 1; }
    if (c.shell) {
      const bul = s.shieldT > 0, inv = s.invT > 0 && Math.floor(t * 12) % 2, k = Math.max(bul ? .45 + Math.sin(t * 8) * .1 : 0, s.vis.shieldHit * 1.4, inv ? .3 : 0);
      c.shell.visible = k > .01; c.shellMat.opacity = Math.min(.7, k); c.shellMat.color.set(bul ? '#4a9aff' : s.energy < 25 ? '#ff4040' : '#bff8ff');
    }
    // the exhaust trail: the tail's last .35 s
    const tr = c.trail; if (tr && tr.pos) {
      const tail = V.addS([0, 0, 0], P, F, -54); tr.pts.push([tail[0], tail[1], tail[2], Rr[0], Rr[1], Rr[2], G.real]);
      const own = s.control === 'human', life = own ? .2 : .35; while (tr.pts.length > tr.n || (tr.pts.length && G.real - tr.pts[0][6] > life)) tr.pts.shift();
      const n = tr.pts.length, wv = (boosting ? 6 : 3) * (own ? .6 : 1); for (let i = 0; i < tr.n; i++) {
        const q = tr.pts[Math.min(n - 1, i)] || [tail[0], tail[1], tail[2], 0, 0, 0], f = n ? i / Math.max(1, n - 1) : 0, wd = wv * f;
        tr.pos.set([(q[0] - q[3] * wd) / U, (q[2] - q[5] * wd) / U, (q[1] - q[4] * wd) / U, (q[0] + q[3] * wd) / U, (q[2] + q[5] * wd) / U, (q[1] + q[4] * wd) / U], i * 6);
        const k = i < n ? f * f * (s.ghost ? .2 : own ? .16 : .42) * (boosting ? 1.5 : 1) : 0; tr.col.set([tr.color[0] * k, tr.color[1] * k, tr.color[2] * k, tr.color[0] * k, tr.color[1] * k, tr.color[2] * k], i * 6);
      }
      tr.mesh.geometry.attributes.position.needsUpdate = tr.mesh.geometry.attributes.color.needsUpdate = true;
    }
  }
  // lights that follow the player through tunnels; a light for a boost
  const pl = race.player || race.ships[0];
  if (pl && tw.lights) { const fr = race.track.frameAt(pl.s), inT = !!(fr.flags & SN.TFLAG.TUNNEL); tw.lights.forEach((L, k) => { L.on = inT || (k === 3 && pl.boostT > 0); L.power = inT ? 22 : 10; const off = (k - 1) * 30 * M; L.x = pl.P[0] + pl.F[0] * off; L.y = pl.P[1] + pl.F[1] * off; L.z = pl.P[2] + 9 * M; }); }
  // the overclock skin: one colour per zone, the sky pulsing on the beat
  if (tw.skin === 'overclock' && tw.meshes) {
    const z = race.zone || 1, c = SN.hsl((z * 37) % 360, 100, 60), beat = E.current.audio.pos.playing ? 1 - (E.current.audio.pos.beat % 1) : 0;
    tw.meshes.mats.glow.color.set(c); tw.meshes.mats.decal.color.set(c); tw.meshes.mats.pads.color.set(c);
    if (w.scene.background && w.scene.background.set) w.scene.background.set(SN.mix('#000000', SN.hsl((z * 37 + 180) % 360, 80, 12), beat * .8));
  }
};
})();
