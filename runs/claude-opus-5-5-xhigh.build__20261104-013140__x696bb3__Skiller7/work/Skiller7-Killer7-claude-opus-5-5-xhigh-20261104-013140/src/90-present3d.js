/* PRESENTER 3D: turns sim state into pictures with the engine's 3D module. One World3D per area (Room 7's and the last
 * area's are kept, so the door is instant); the hero, Whiteouts and people are the 2D engine's rigs drawn as cards,
 * placed by us every step (pose: false, never read back); props are store and S7 shapes; things are drawn with the pen
 * each frame; warm spots are glows; the gun is the first-person overlay. It never changes sim state. */
const RIG_CACHE = {};
/** a persona's rig (one per persona, kept) */
S7.personaRig = (id) => RIG_CACHE[id] || (RIG_CACHE[id] = new E.Humanoid(Object.assign({}, S7.PERSONAS[id].rig)));
S7.peopleRig = (id) => RIG_CACHE['p:' + id] || (RIG_CACHE['p:' + id] = S7.PEOPLE[id] && S7.PEOPLE[id].rig ? new E.Humanoid(Object.assign({}, S7.PEOPLE[id].rig)) : null);
S7.whiteoutRig = (e) => {
  const ED = S7.ENEMIES[e.type];
  const o = { build: ED.ai === 'plow' || e.type === 'bloom' ? 'bulky' : 'heroic', size: 1.25 * e.size, hunch: .2 + (e.id % 4) * .04, outfit: e.type === 'bellboy' ? 'coat' : 'shirt', hair: 'bald', weapon: null, sleeves: 'long',
    face: { eyes: 'slit' }, acc: ['grin'], colors: { skin: '#f6f6f4', hair: '#f0f0f0', cloth: e.tint || '#ffffff', coat: e.tint || '#ffffff', pants: '#ecedf2', boot: '#e0e2ea', trim: '#d8dce8', eye: '#0a0a0e', belt: '#e0e4ec', glove: '#f4f4f4' } };
  if (e.hat) o.hat = { style: e.hat, color: '#f4f4f4' };
  if (e.type === 'bellboy') { o.hat = { style: 'pillbox', color: '#f4f4f4' }; }
  if (ED.skis) o.skis = { color: '#e8e8f0' };
  return new E.Humanoid(o);
};

class Presenter3D {
  constructor(game, sim, W3) {
    this.game = game; this.sim = sim; this.W3 = W3;
    this.worlds = {}; this.cur = null; this.order = [];
    this.flakes = []; this.decals = []; this.fx = []; this.lastArea = null;
    this.t = 0; this.prevCam = null; this.curCam = null;
    this.filterProbe = { done: S7.storeGet('s7:celOk', null) !== null, ok: S7.storeGet('s7:celOk', true) };
    S7.bus.on('area', d => { this.lastArea = d.from; });
    S7.bus.on('kill', d => this.onKill(d));
    S7.bus.on('explode', d => this.onExplode(d));
    S7.bus.on('crit', d => this.burst(d.at, '#ff3040', 16, 1.2));
    S7.bus.on('hit', d => this.burst(d.at, '#ff6070', 5, .6));
    S7.bus.on('tink', d => d.at && this.burst(d.at, '#c8f4ff', 6, .5, true));
    S7.bus.on('shatter', d => this.burst(d.at, '#e8f4ff', 8, .6, true));
    S7.bus.on('impact', d => this.burst(d.at, '#d8d4cc', 3, .4, true));
    S7.bus.on('splat', d => this.burst(d.at, '#ffffff', 6, .5, true));
    S7.bus.on('solve', d => d.at && this.burst(d.at, '#ffe8a0', 18, 1.2, true));
    S7.bus.on('steam', d => this.burst(d.at, '#ffffff', 20, 1.4, true));
    S7.bus.on('blink', d => this.burst(V.add(d.from, [0, 0, 18]), '#ffffff', 10, .7, true));
    S7.bus.on('hockeystop', () => { const h = this.sim.hero; this.burst([h.x + Math.cos(h.yaw) * 8, h.y + Math.sin(h.yaw) * 8, h.z + 2], '#ffffff', 26, .8, true); });
    S7.bus.on('switch', () => { const h = this.sim.hero; this.burst([h.x, h.y, h.z + 20], '#ffffff', 30, .9, true); this.game.flash('#ffffff', .12, .5); });
    S7.bus.on('rescue', d => { if (d.persona) { const s = this.sim.hero; this.burst([s.x, s.y, s.z + 20], '#c8f4ff', 34, 1.2, true); } });
    S7.bus.on('flurry', () => this.game.flash('#ffffff', .3, .9));
    S7.bus.on('land', () => { const h = this.sim.hero; this.burst([h.x, h.y, h.z + 2], '#ffffff', 18, .7, true); });
  }
  /* ---------------- worlds ---------------- */
  ensure(areaId) {
    let R = this.worlds[areaId];
    if (!R) {
      // keep at most the new world, Room 7's and the one we came from
      const keep = new Set([areaId, 'room7', this.sim.st && this.sim.st.room7Door ? this.sim.st.room7Door.area : null, this.cur && this.cur.id]);
      for (const id of Object.keys(this.worlds)) if (!keep.has(id)) { try { this.worlds[id].world.dispose(); } catch (e) { /* already gone */ } delete this.worlds[id]; }
      R = this.worlds[areaId] = this.build(areaId);
    }
    if (this.cur !== R) { this.cur = R; this.resetActors(R); this.decals = []; }
    return R;
  }
  build(areaId) {
    const A = S7.AREAS[areaId], Wd = A.world, W3 = this.W3, game = this.game;
    const o = {
      sky: Wd.sky || '#06050b', fog: Wd.fog ? Object.assign({}, Wd.fog, { far: Wd.fog.far * T.fogFar }) : false, ambient: Wd.ambient || ['#606070', '#202028', 1.2],
      torchLights: Wd.torchLights || 0, torchShadows: 1, lights: Wd.lights || 6, glowLights: 6, spots: 0,
      overlay: { fov: 62 }, camera: { mode: 'fixed', near: 1.5 }, look: 'card', gravity: 480,
      filter: { bands: T.celBands, ink: T.inkStrength, inkW: 1.5, punch: 1.4, apply: 'all' },
      onDraw: (w, r) => this.onDraw(w, r)
    };
    if (Wd.sun) o.sun = Wd.sun;
    if (Wd.kind === 'terrain') {
      o.terrain = Object.assign({ size: Wd.size || 32768, height: Wd.height, cell: Wd.cell || 32, chunk: 32, far: Wd.far || 14000, physics: 300, detail: 1.3 }, Wd.terrainLook || {});
      if (Wd.color) o.terrain.color = Wd.color;
    } else {
      const b = S7.buildRows(Wd);
      o.level = { rows: b.rows, legend: b.legend, ground: Wd.ground || 'flagstone', colors: Wd.colors, side: Wd.side || 'block', wallSide: Wd.wallSide || Wd.side || 'block', color: Wd.raisedColor || Wd.wallColor, bottom: -400 };
    }
    const world = new W3(game, o);
    const R = { id: areaId, A, world, things: [], lights: [], people: [], hero: null, enemies: new Map(), flakes: null };
    world.camera.mouseLook = false;
    for (const p of A.props || []) {
      if (p[0] === 'shape') { try { world.shape(p[1], p[2] * M, p[3] * M, (p[4] || 0) * M, Object.assign({ solid: false }, p[5] || {})); } catch (e) { game.fail('shape ' + p[1], e); } }
      else if (p[0] === 'thing') R.things.push({ kind: p[1], x: p[2] * M, y: p[3] * M, z: (p[4] || 0) * M, o: p[5] || {} });
      else if (p[0] === 'light') { const L = world.light(Object.assign({ color: '#ffffff', reach: 120, power: 2 }, p[4] || {})); L.x = p[1] * M; L.y = p[2] * M; L.z = (p[3] || 2) * M; L.on = true; L.base = L.power; L.flick = (p[4] && p[4].flicker) || 0; L.tag = p[4] && p[4].tag; R.lights.push(L); }
    }
    // extra lights the presenter moves (muzzle flash, the flare, boss lights)
    R.muzzle = world.light({ color: '#ffd080', reach: 140, power: 0 }); R.muzzle.on = false;
    R.flareL = world.light({ color: '#ff4030', reach: 520, power: 0 }); R.flareL.on = false;
    for (const pp of A.people || []) {
      const rig = S7.peopleRig(pp.who), blob = !rig && S7.peopleBlob ? S7.peopleBlob(pp.who) : null; if (!rig && !blob) continue;
      const t = S7.tw(pp.at), z = pp.z !== undefined ? pp.z * M : 0;
      const a = world.mob(Object.assign({ x: t[0], y: t[1], z, pose: false, fly: true, facing: pp.facing || 0 }, rig ? { rig } : { blob })); a.setSolid(false);
      R.people.push({ a, rig, blob, def: pp, x: t[0], y: t[1], z });
    }
    if (Wd.snow) R.snow = { n: Wd.snow, wind: Wd.wind || [.3, .1] };
    if (S7.buildExtra) S7.buildExtra(R, this);
    try { world.prepare(); } catch (e) { game.fail('prepare', e); }
    return R;
  }
  resetActors(R) {
    for (const [, e] of R.enemies) { try { R.world.remove(e.a); } catch (err) { /* gone */ } }
    R.enemies.clear();
    if (R.hero) { try { R.world.remove(R.hero); } catch (err) { /* gone */ } R.hero = null; }
  }
  /* ---------------- each step ---------------- */
  step(dt) {
    const sim = this.sim; if (!sim.st) return;
    const R = this.ensure(sim.st.area), w = R.world, h = sim.hero;
    this.t += dt;
    // the hero: the active persona's rig on one actor (hidden in first person)
    const pid = sim.st.persona, rig = S7.personaRig(pid);
    if (!R.hero) { R.hero = w.hero({ x: h.x, y: h.y, z: h.z, rig, pose: false, fly: true, r: 4, half: 8 }); R.hero.setSolid(false); }
    const A = R.hero;
    if (A.rig !== rig) A.rig = rig;
    A.place(h.x, h.y, h.z + (sim.W.air ? 0 : 0)); A.facing = h.yaw;
    A.visible = sim.aim.k < .5 && sim.mode !== 'interview' && !sim.hideHero && !(sim.areaDef.hideHero && sim.areaDef.hideHero(sim));
    const sw = sim.switching;
    A.fade = sw ? (sw.t < .22 ? 1 - sw.t / .22 : (sw.t - .22) / .23) : 1;
    A.sink = sw ? (sw.t < .22 ? sw.t / .22 * 20 : (1 - (sw.t - .22) / .23) * 20) : 0;
    if (sim.mode === 'frozen') A.fade = 1;
    const e = sim.W.edge ? sim.rails.edges[sim.W.edge] : null, ski = e && (e.kind === 'ski' || e.kind === 'jump') || sim.W.air;
    const st = { x: h.x, y: h.y, z: h.z, vx: 0, vy: 0, facing: h.yaw };
    if (!ski && sim.W.v > 1) { st.vx = Math.cos(h.yaw) * sim.W.v; st.vy = Math.sin(h.yaw) * sim.W.v; }
    if (ski) { st.pose = 'crouch'; st.lean = sim.tucking ? .45 : .25; }
    if (sim.healing && sim.pstate().hp < sim.maxHp()) st.pose = 'cast';
    if (sim.mode === 'frozen') { st.pose = 'guard'; }
    if (sw && sw.t > .22 && sw.t < .45) st.pose = 'hips';
    if (sim.W.air) st.air = true;
    if (sim.holdSpot) st.pose = 'kneel';
    rig.state = rig.state || {}; rig.state.skis = !!ski || pid === 'dagny' && sim.areaDef.skis;
    if (sim.mode !== 'frozen') rig.update(dt, st);
    // Whiteouts: an actor each, faded in when revealed, melting when thawed
    const seen = new Set();
    for (const en of sim.enemies) {
      seen.add(en.id);
      let E1 = R.enemies.get(en.id);
      if (!E1) { const rg = S7.whiteoutRig(en); const a = w.mob({ x: en.x, y: en.y, z: en.z, rig: rg, pose: false, fly: true, facing: en.facing }); a.setSolid(false); E1 = { a, rig: rg, vis: 0, px: en.x, py: en.y }; R.enemies.set(en.id, E1); }
      const a = E1.a, rev = sim.isRevealed(en) || !en.alive;
      E1.vis = E.approach(E1.vis, rev ? 1 : 0, dt / (rev ? .25 : .4));
      a.place(en.x, en.y, en.z); a.facing = en.facing + (en.turned ? Math.PI : 0);
      a.visible = E1.vis > .02; a.fade = E1.vis * (en.alive ? 1 : Math.max(0, 1 - en.melting / .8));
      a.sink = en.alive ? (en.sinkZ || 0) : en.melting / .8 * 26;
      a.flash = en.hurtT > 0 ? .5 : en.giggle > 0 ? (Math.floor(en.giggle * 30) % 2 ? .6 : 0) : 0;
      const vx = (en.x - E1.px) / Math.max(dt, 1e-4), vy = (en.y - E1.py) / Math.max(dt, 1e-4); E1.px = en.x; E1.py = en.y;
      const rs = { x: en.x, y: en.y, z: en.z, vx, vy, facing: a.facing, expr: 'smile', run: S7.ENEMIES[en.type].ai === 'runner' ? .6 : .3 };
      if (en.laughPose > 0 || en.giggle > 0) rs.pose = 'cheer';
      if (en.kneel > 0) rs.pose = 'kneel';
      if (en.stun > 0) rs.pose = 'guard';
      if (en.throwPose > 0) rs.attack = E.move('throw', 1 - en.throwPose / .4);
      if (S7.ENEMIES[en.type].sled || en.type === 'skier') { rs.pose = 'crouch'; rs.vx = rs.vy = 0; }
      if (en.giggle > 0) E1.rig.kick(.06);
      E1.rig.update(dt, rs);
      // tells: footprints (snow 8 s, indoors wet 2.5 s) and breath
      E1.stepD = (E1.stepD || 0) + Math.hypot(vx, vy) * dt;
      if (en.alive && E1.stepD > 11 && !S7.ENEMIES[en.type].sled && !en.fly) { E1.stepD = 0; E1.foot = -(E1.foot || 1); const out = sim.areaDef.outdoor || sim.grid.kind === 'terrain'; this.decal(en.x + Math.cos(en.facing + Math.PI / 2) * 2.4 * E1.foot, en.y + Math.sin(en.facing + Math.PI / 2) * 2.4 * E1.foot, en.z, out ? 8 : 2.5, out ? '#9aa6c0' : '#4a5260', en.facing); }
      E1.breath = (E1.breath || Math.random() * 1.2) - dt;
      if (en.alive && E1.breath <= 0) { E1.breath = 1.2; if (sim.areaDef.cold !== false) this.fx.push({ k: 'puff', x: en.x + Math.cos(en.facing) * 6, y: en.y + Math.sin(en.facing) * 6, z: en.z + 30 * en.size, t: 0, life: .9 }); }
    }
    for (const [id, E1] of R.enemies) if (!seen.has(id)) { try { w.remove(E1.a); } catch (err) { /* gone */ } R.enemies.delete(id); }
    // people (Room 7's, Murmel, Pim...)
    for (const p of R.people) {
      const d = p.def, extra = S7.peopleAnim ? S7.peopleAnim(sim, d, this.t) : {};
      p.a.place(p.x + (extra.dx || 0), p.y + (extra.dy || 0), p.z + (extra.dz || 0)); p.a.facing = extra.facing !== undefined ? extra.facing : d.facing || Math.atan2(h.y - p.y, h.x - p.x);
      p.a.visible = !(extra.hidden); p.a.fade = extra.fade !== undefined ? extra.fade : (S7.PEOPLE[d.who] && S7.PEOPLE[d.who].fade) || 1;
      if (p.blob) { p.blob.update(dt, { squash: Math.sin(this.t * 2.2) * .12, look: [Math.cos(p.a.facing), Math.sin(p.a.facing)] }); continue; }
      p.rig.update(dt, Object.assign({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, facing: p.a.facing, pose: d.pose || null, expr: d.expr || null }, extra.state || {}));
    }
    // the boss's people (Grau, the band, Hansi): actors with the people's rigs, made and dropped as the boss needs them
    const B = sim.boss, want = new Set();
    R.bossActors = R.bossActors || new Map();
    if (B && B.actors) B.actors.forEach((ba, i) => {
      const key = ba.who + ':' + i; want.add(key);
      let X = R.bossActors.get(key);
      if (!X) { const rig = S7.peopleRig(ba.who); if (!rig) return; const a = w.mob({ x: ba.x, y: ba.y, z: ba.z, rig, pose: false, fly: true }); a.setSolid(false); X = { a, rig }; R.bossActors.set(key, X); }
      X.a.place(ba.x, ba.y, ba.z); X.a.facing = ba.facing || 0; X.a.visible = !ba.hidden; X.a.fade = ba.who === 'hansiBare' ? 1 : 1;
      X.a.sink = B.id === 'band' && B.alive && !B.alive[ba.who] ? 10 : 0;
      X.rig.state = X.rig.state || {}; X.rig.state.skis = !!ba.skis;
      X.rig.update(dt, { x: ba.x, y: ba.y, z: ba.z, vx: 0, vy: 0, facing: X.a.facing, pose: ba.pose || null, attack: ba.attack || null, expr: ba.expr || null, down: B.id === 'band' && B.alive && !B.alive[ba.who] ? 1 : 0, lean: ba.skis ? .35 : 0 });
    });
    for (const [k, X] of R.bossActors) if (!want.has(k)) { try { w.remove(X.a); } catch (e) { /* gone */ } R.bossActors.delete(k); }
    // echoes: the other skiers (Echo Run), translucent, with a scarf in their colour
    R.ghostActors = R.ghostActors || new Map();
    const gseen = new Set();
    for (const gh of S7.ghosts || []) {
      gseen.add(gh.id);
      let X = R.ghostActors.get(gh.id);
      if (!X) { const rig = new E.Humanoid(Object.assign({}, S7.PERSONAS.dagny.rig, { colors: Object.assign({}, S7.PERSONAS.dagny.rig.colors, { cloth: gh.color, pants: gh.color }) })); const a = w.mob({ x: gh.x, y: gh.y, z: gh.z, rig, pose: false, fly: true }); a.setSolid(false); X = { a, rig, px: gh.x, py: gh.y }; R.ghostActors.set(gh.id, X); }
      X.a.place(gh.x, gh.y, gh.z); X.a.facing = gh.yaw; X.a.fade = .45; X.a.visible = true;
      X.rig.state = X.rig.state || {}; X.rig.state.skis = true;
      X.rig.update(dt, { x: gh.x, y: gh.y, z: gh.z, vx: 0, vy: 0, facing: gh.yaw, pose: 'crouch', point: !!gh.aim, lean: .3 });
    }
    for (const [k, X] of R.ghostActors) if (!gseen.has(k)) { try { w.remove(X.a); } catch (e) { /* gone */ } R.ghostActors.delete(k); }
    if (S7.stepExtra) S7.stepExtra(R, this, dt);
    // effects
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter(f => f.t < f.life);
    for (const d of this.decals) d.t += dt;
    this.decals = this.decals.filter(d => d.t < d.life);
    w.step(dt);
    this.prevCam = this.curCam; this.curCam = Object.assign({}, sim.cam.pose);
  }
  decal(x, y, z, life, color, yaw) { this.decals.push({ x, y, z, life, color, yaw, t: 0 }); if (this.decals.length > 600) this.decals.splice(0, this.decals.length - 600); }
  burst(at, color, n, life, light) { if (!at) return; for (let i = 0; i < n; i++) this.fx.push({ k: 'bit', x: at[0], y: at[1], z: at[2], vx: (Math.random() - .5) * 120, vy: (Math.random() - .5) * 120, vz: Math.random() * 110 + 20, t: 0, life: life * (.6 + Math.random() * .6), c: color, s: light ? 1.1 : 1.6 }); }
  onKill(d) {
    const e = d.enemy; if (!e) return;
    this.burst([e.x, e.y, e.z + 18], '#e01828', d.crit ? 26 : 14, 1.1);
    for (let i = 0; i < 5; i++) this.decal(e.x + (Math.random() - .5) * 20, e.y + (Math.random() - .5) * 20, e.z, 120, '#b0101c', Math.random() * 6);
  }
  onExplode(d) {
    this.burst(d.at, d.kind === 'burst' ? '#e01828' : '#ffb050', 22, 1);
    this.fx.push({ k: 'ring', x: d.at[0], y: d.at[1], z: d.at[2], r: d.radius || 24, t: 0, life: .45 });
    if (d.kind === 'burst') for (let i = 0; i < 4; i++) this.decal(d.at[0] + (Math.random() - .5) * 26, d.at[1] + (Math.random() - .5) * 26, this.sim.grid.floorAt(d.at[0], d.at[1]), 120, '#b0101c', 0);
  }
  /* ---------------- each frame ---------------- */
  draw(r) {
    const sim = this.sim; if (!sim.st) return;
    const R = this.ensure(sim.st.area), w = R.world, al = clamp(this.game.alpha || 0, 0, 1);
    const c0 = this.prevCam || sim.cam.pose, c1 = this.curCam || sim.cam.pose;
    const cut = !c0 || Math.hypot(c1.x - c0.x, c1.y - c0.y, c1.z - c0.z) > 60;
    const cam = cut ? c1 : { x: lerp(c0.x, c1.x, al), y: lerp(c0.y, c1.y, al), z: lerp(c0.z, c1.z, al), yaw: c0.yaw + S7.angDiff(c0.yaw, c1.yaw) * al, pitch: lerp(c0.pitch, c1.pitch, al), roll: lerp(c0.roll || 0, c1.roll || 0, al), fov: lerp(c0.fov, c1.fov, al) };
    if (CHEAT.freeCam && this.free) Object.assign(cam, this.free);
    const sh = this.game.shakeAmt ? this.game.shakeAmt : 0;
    w.camera.fixed = { x: cam.x, y: cam.y, z: cam.z, yaw: cam.yaw, pitch: cam.pitch, roll: cam.roll || 0, fov: cam.fov };
    w.camera.near = sim.aim.k > .5 ? 1 : 1.5;
    void sh;
    // the player's look settings, live (the dev mode's cel bands, ink and fog)
    w.filter = Object.assign({}, w.filter, { bands: T.celBands, ink: T.inkStrength });
    this.drawCam = cam; S7.setPresCam(cam);
    w.draw(r);
    this.probeFilter(w, r);   // (right after the draw, in the same task: the canvas still holds this frame)
  }
  /** the Comic cel filter is a post pass: where a device draws it black, fall back to the clean picture (ink outlines
   *  stay) once, and remember */
  probeFilter(w, r) {
    const P = this.filterProbe; if (P.done || typeof document === 'undefined') return;
    if (this.game.settings.filter3d === 'clean') return;
    P.frames = (P.frames || 0) + 1;
    if (P.frames < 20 || P.frames % 10) return;
    const cv = this.W3.renderer && this.W3.renderer.domElement; if (!cv) return;
    try {
      const c = P.cv || (P.cv = document.createElement('canvas')); c.width = 32; c.height = 18;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(cv, 0, 0, 32, 18);
      const d = g.getImageData(0, 0, 32, 18).data; let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
      P.samples = (P.samples || 0) + 1; P.lit = (P.lit || 0) + (sum > 600 ? 1 : 0);
      if (P.lit > 0) { P.done = true; P.ok = true; S7.storeSet('s7:celOk', true); return; }
      if (P.samples >= 6) { P.done = true; P.ok = false; S7.storeSet('s7:celOk', false); this.game.settings.set('filter3d', 'clean'); if (S7.ui) S7.ui.toastMsg('Comic cel filter unavailable here: using None'); }
    } catch (e) { P.done = true; }
  }
  /** the world's onDraw: pen things, glows, lights, effects, the first-person overlay */
  onDraw(w, r) {
    const sim = this.sim, R = this.cur; if (!R || R.world !== w) return;
    const pen = w.pen, T0 = this.t;
    // things
    for (const th of R.things) { const f = S7.THINGS3D[th.kind]; if (f) { pen.at(th.x, th.y, th.z); f(pen, th, T0, w, sim, this); } }
    for (const L of R.lights) {
      if (L.flick) L.power = L.base * (1 - L.flick * (.5 + .5 * Math.sin(T0 * 23 + L.x) * Math.sin(T0 * 7.1)));
      if (L.tag === 'press') L.on = !!sim.st.flags.exposure1;
      if (L.tag && S7.LIGHT_RULES && S7.LIGHT_RULES[L.tag]) S7.LIGHT_RULES[L.tag](L, sim, T0);
    }
    if (S7.drawExtra) S7.drawExtra(R, this, pen, T0);
    if (sim.boss && S7.BOSS3D[sim.boss.id]) S7.BOSS3D[sim.boss.id](pen, sim.boss, T0, sim);
    // Ansel drags his rescue toboggan on a rope
    if (sim.st.persona === 'ansel' && sim.aim.k < .5 && !sim.W.air) {
      const hy = sim.hero.yaw, bx = sim.hero.x - Math.cos(hy) * 26, by = sim.hero.y - Math.sin(hy) * 26, bz = sim.grid.floorAt(bx, by);
      pen.at(bx, by, bz, hy).box(0, 0, 3, 26, 10, 3, '#f06a1e').box(13, 0, 6, 2, 10, 4, '#f06a1e').box(0, 0, 1, 28, 1, 1, '#2a2a2a');
      pen.at().tube(bx + Math.cos(hy) * 13, by + Math.sin(hy) * 13, bz + 5, sim.hero.x, sim.hero.y, sim.hero.z + 13, .4, '#e8e0c0');
    }
    // warm spots: the four nearest revealed ones light the scene
    const h = sim.hero, eye = sim.eye();
    const warm = [];
    for (const en of sim.enemies) if (en.alive && sim.isRevealed(en) && en.warmOpen !== false) { const p = sim.warmPos(en), d = V.dist(eye, p); if (d < 30 * M) warm.push([d, p, en]); }
    warm.sort((a, b) => a[0] - b[0]);
    warm.forEach((x, i) => { const pul = 1 + Math.sin(T0 * 9 + x[2].id) * .15; w.glow(x[1][0], x[1][1], x[1][2], 2.2 * pul * Math.sqrt(T.warmRadius), '#ff6a1e', { core: '#ffe0a0', light: i < 4 }); });
    if (CHEAT.showHits) for (const en of sim.enemies) if (en.alive) { const p = sim.warmPos(en); pen.at().ball(p[0], p[1], p[2], sim.warmR(), sim.warmR(), sim.warmR(), '#ff00ff'); }
    // echo marks: a pale outline glow through walls
    for (const en of sim.enemies) if (en.alive && en.marked > 0 && !sim.isRevealed(en)) w.glow(en.x, en.y, en.z + 20, 3, '#9ad8ff', { core: '#ffffff' });
    // statues: frozen personas in an ice shell
    for (const id of PERSONA_ORDER) {
      const st = sim.st.roster[id].statue; if (!st || st.area !== sim.st.area) continue;
      const g = id === sim.st.persona && sim.mode === 'frozen' ? clamp(1.2 - sim.frozenT, 0, 1.2) / 1.2 : 1;
      pen.at(st.at[0], st.at[1], st.at[2]);
      pen.box(0, 0, 18 * g, 16 * g, 16 * g, 36 * g, '#9ae0ff').ball(0, 0, 36 * g, 9 * g, 9 * g, 7 * g, '#c8f0ff').box(4, -3, 10 * g, 6 * g, 5, 20 * g, '#e8fbff');
      if (!(id === sim.st.persona && sim.mode === 'frozen')) { const rg = S7.personaRig(id); void rg; pen.glow(0, 0, 40, 2, '#c8f0ff'); }
    }
    // projectiles
    for (const p of sim.projectiles) {
      pen.at(p.x, p.y, p.z);
      if (p.kind === 'snowball') pen.ball(0, 0, 0, 3.4, 3.4, 3.4, '#f4f8ff');
      else if (p.kind === 'icecube') pen.box(0, 0, 0, 5, 5, 5, '#bfeaff', T0 * 6);
      else if (p.kind === 'suitcase') pen.box(0, 0, 0, 12, 5, 9, '#7a2a1a', T0 * 4).box(0, 0, 5, 4, 1, 2, '#d0a040');
      else if (p.kind === 'medal') pen.ball(0, 0, 0, 3.4, 1, 3.4, '#f0c030').glow(0, 0, 0, 1.6, '#fff0a0');
      else if (p.kind === 'shell' || p.kind === 'charge') pen.ball(0, 0, 0, p.kind === 'charge' ? 3.5 : 2.6, 2.6, 2.6, '#c81e1e').glow(0, 0, 0, 1.5, '#ffb060');
      else pen.ball(0, 0, 0, 3, 3, 3, '#ffffff');
    }
    // drops: Red and Rime glints flying home
    for (const d of sim.drops) { pen.at(d.x, d.y, d.z); if (d.kind === 'red') pen.glow(0, 0, 0, 1.6, '#ff2030'); else pen.ball(0, 0, 0, 1.6, 1.6, 2.6, '#9af0ff').glow(0, 0, 0, 1.2, '#e0ffff'); }
    // pickups on the rails: red snow, rime crystals, pins, papers, keys
    for (const s of sim.spots) {
      if (sim.spotUsed(s)) continue;
      pen.at(s.x, s.y, s.z);
      const bob = Math.sin(T0 * 3 + s.x) * 1.5;
      if (s.kind === 'red') { pen.ball(0, 0, 1, 8, 8, 2, '#c8102a').ball(3, 2, 2, 4, 4, 2.4, '#e01830'); }
      else if (s.kind === 'rime') { pen.cone(0, 0, 0, 0, 0, 14, 3, '#8ae8ff').cone(3, 1, 0, 5, 2, 9, 2, '#bff4ff').glow(0, 0, 8, 2, '#c8faff'); }
      else if (s.kind === 'pin') { pen.ball(0, 0, 10 + bob, 2.6, .8, 2.6, '#d8202a').glow(0, 0, 10 + bob, 1.4, '#ffd0d0'); }
      else if (s.kind === 'dossier') { pen.box(0, 0, 8 + bob, 7, 1, 9, '#f0ead8', T0).glow(0, 0, 8 + bob, 1, '#ffffff'); }
      else if (s.kind === 'item') { pen.box(0, 0, 9 + bob, 3, 1, 7, '#e0b040', T0 * 2).glow(0, 0, 9 + bob, 1.6, '#ffe8a0'); }
      else if (S7.SPOT3D[s.kind]) S7.SPOT3D[s.kind](pen, s, T0, w, sim);
    }
    // the scan ring, the flare, the flash
    if (sim.scan) { const k = Math.min(1, sim.scan.t / .6), Rr = T.scanRadius * M * k; w.arc(sim.scan.at[0], sim.scan.at[1], sim.scan.at[2] + 1, Math.max(0, Rr - 10), Rr, 0, TAU, '#ff4050', 1 - k * .5); }
    if (sim.flare) { pen.at(sim.flare.x, sim.flare.y, sim.flare.z).glow(0, 0, 0, 5, '#ff3020'); R.flareL.x = sim.flare.x; R.flareL.y = sim.flare.y; R.flareL.z = sim.flare.z; R.flareL.on = true; R.flareL.power = 7 + Math.sin(T0 * 30) * 1.2; } else R.flareL.on = false;
    // effects: bits, puffs, rings
    for (const f of this.fx) {
      const u = f.t / f.life;
      if (f.k === 'bit') { const x = f.x + f.vx * f.t, y = f.y + f.vy * f.t, z = Math.max(this.sim.grid.floorAt(f.x, f.y), f.z + f.vz * f.t - 160 * f.t * f.t); pen.at(x, y, z).box(0, 0, 0, f.s * (1 - u * .5), f.s * (1 - u * .5), f.s * (1 - u * .5), f.c); }
      else if (f.k === 'puff') pen.at(f.x, f.y, f.z + u * 8).ball(0, 0, 0, 2 + u * 4, 2 + u * 4, 2 + u * 3, '#eef4ff');
      else if (f.k === 'ring') w.arc(f.x, f.y, this.sim.grid.floorAt(f.x, f.y) + 1, f.r * u * .8, f.r * u, 0, TAU, '#ff6040', 1 - u);
    }
    // decals: footprints, red snow
    for (const d of this.decals) { const a = 1 - d.t / d.life; if (a < .05) continue; pen.at(d.x, d.y, d.z + .3, d.yaw || 0).box(0, 0, 0, 3.4, 2, .2, d.color); }
    // snowfall round the camera
    if (R.snow) this.drawSnow(pen, R, T0);
    // the muzzle flash light
    const sh = this.muzzleT > 0; if (sh) { R.muzzle.x = eye[0] + Math.cos(sim.aim.yaw) * 20; R.muzzle.y = eye[1] + Math.sin(sim.aim.yaw) * 20; R.muzzle.z = eye[2]; R.muzzle.on = true; R.muzzle.power = 6 * this.muzzleT / .06; this.muzzleT -= 1 / 60; } else R.muzzle.on = false;
    // dev overlays
    if (CHEAT.showRails) this.drawRails(pen);
    if (CHEAT.showShots) this.drawShots(pen);
    // first person: the gun on the overlay
    w.overlay.on = sim.aim.k > .6 && sim.mode !== 'interview' || sim.mode === 'interview' && S7.interviewGun;
    if (w.overlay.on && S7.drawViewModel) { w.overlay.camera.fov = sim.aim.scope ? 40 : 62; S7.drawViewModel(w.overlay.pen, sim, this); }
    void h;
  }
  drawSnow(pen, R, T0) {
    const c = this.drawCam || this.sim.cam.pose, n = R.snow.n, box = 28 * M, wind = R.snow.wind;
    if (!R.flakeSeed) { R.flakeSeed = []; for (let i = 0; i < n; i++) R.flakeSeed.push([Math.random(), Math.random(), Math.random(), .6 + Math.random() * .8]); }
    for (let i = 0; i < n; i++) {
      const s = R.flakeSeed[i], fall = T0 * 26 * s[3];
      const x = c.x + ((s[0] * box + T0 * wind[0] * 40 - c.x) % box + box) % box - box / 2;
      const y = c.y + ((s[1] * box + T0 * wind[1] * 40 - c.y) % box + box) % box - box / 2;
      const z = c.z + ((s[2] * box * .6 - fall - c.z) % (box * .6) + box * .6) % (box * .6) - box * .3;
      pen.at(x + Math.sin(T0 * 1.3 + i) * 3, y, z).box(0, 0, 0, .8, .8, .8, '#ffffff');
    }
  }
  drawRails(pen) {
    const G = this.sim.rails; pen.at();
    for (const id in G.edges) { const e = G.edges[id]; if (e.hidden) continue; const n = Math.max(2, Math.ceil(e.length / 24)); for (let i = 0; i < n; i++) { const a = e.path.at(e.length * i / n), b = e.path.at(e.length * (i + 1) / n); pen.tube(a.x, a.y, a.z + 2, b.x, b.y, b.z + 2, .7, e.gate && !this.sim.gateOpen(e.gate) ? '#ff3030' : e.kind === 'ski' ? '#30a0ff' : '#30ff60'); } }
    for (const id in G.nodes) { const n = G.nodes[id]; pen.ball(n.x, n.y, n.z + 3, 2.5, 2.5, 2.5, '#ffff40'); }
  }
  drawShots(pen) {
    const sim = this.sim, e = sim.W.edge ? sim.rails.edges[sim.W.edge] : null; if (!e) return;
    for (const s of sim.cam.shots(e, sim.W.dir)) { const c = s.at || null; if (!c) continue; pen.at().ball(c[0], c[1], c[2], 3, 3, 3, s.id === sim.cam.shotId ? '#ff40ff' : '#a040a0'); }
  }
}
S7.Presenter3D = Presenter3D;

/** the presenter for Node and tests: the same interface, nothing drawn */
class NullPresenter { constructor() {} step() {} draw() {} ensure() {} }
S7.NullPresenter = NullPresenter;
S7.THINGS3D = S7.THINGS3D || {};
S7.SPOT3D = S7.SPOT3D || {};
