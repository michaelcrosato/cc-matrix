// Presenter3D: turns sim state into pictures with the engine's 3D module. Reads sim state; never writes it.
const Pres = S7.pres = { W3: null, world: null, areaId: null, ents: new Map(), rigs: {}, things: {}, ready: false, t: 0, ghosts: new Map(), prints: [], mouse: [0, 0], lights: [] };
const U = 16;
let E_ = null;

Pres.boot = async function (W3, game) {
  E_ = S7.E; Pres.W3 = W3; Pres.game = game;
  await W3.init(game);
  S7.things3d(W3);
  for (const id of S7.ROSTER) Pres.rigs[id] = new E_.Humanoid(S7.reg.personas[id].look);
  const npc = (o) => new E_.Humanoid(Object.assign({ weapon: null, outfit: 'coat' }, o));
  Pres.rigs.oma = npc({ size: 1.15, build: 'chibi', hair: 'long', outfit: 'robe', colors: { cloth: '#e8e0f0', hair: '#e0e0e8', pants: '#e8e0f0', skin: '#e8c8a8' } });
  Pres.rigs.rosalind = npc({ size: 1.3, build: 'heroic', hat: { style: 'pillbox', color: '#f4f0e8' }, outfit: 'robe', colors: { cloth: '#2a2a3a', pants: '#2a2a3a', hair: '#4a3a30' } });
  Pres.rigs.murmel = npc({ size: .9, build: 'bulky', hat: { style: 'beanie', color: '#d81e2a' }, outfit: 'shirt', colors: { cloth: '#8a6a4a', pants: '#8a6a4a', skin: '#a07a58', hair: '#6a4a30' } });
  Pres.rigs.pim = npc({ size: 1.1, build: 'chibi', hat: { style: 'pillbox', color: '#3a6ab8' }, outfit: 'coat', colors: { cloth: '#6a8ad0', pants: '#4a5a80', skin: '#c8d8f0' } });
  Pres.rigs.sweep = new E_.Humanoid({ size: 1.4, build: 'bulky', hat: { style: 'hardhat', color: '#e8e8f0' }, outfit: 'coat', weapon: 'gun', colors: { cloth: '#4a5a6a', pants: '#2a323c', boot: '#101018', skin: '#c8b8a8' } });
  Pres.rigs.grau = new E_.Humanoid({ size: 2.3, build: 'bulky', hat: { style: 'pillbox', color: '#8a1c28' }, outfit: 'coat', weapon: null, colors: { cloth: '#8a1c28', pants: '#201820', boot: '#101018', skin: '#d8b8a0' } });
  Pres.rigs.king = new E_.Humanoid({ size: 4.5, build: 'bulky', hat: null, hair: 'bald', outfit: 'shirt', weapon: null, colors: { cloth: '#f2f6fc', pants: '#e0eaf6', boot: '#c8d4e4', skin: '#f2f6fc' } });
  Pres.ready = true;
};

Pres.dispose = function () {
  if (Pres.world) { try { Pres.world.dispose(); } catch (e) { S7.fail('dispose', e); } }
  Pres.world = null; Pres.ents.clear(); Pres.things = {}; Pres.hero = null; Pres.areaId = null; Pres.lights = [];
};
const snowColor = (x, y, z, nz, out) => {
  out = out || [0, 0, 0]; const k = Math.max(0, Math.min(1, nz)), n = (Math.sin(x * .013) * Math.sin(y * .011) * .5 + .5) * 14;
  const base = 232 + n * .5, rock = k < .86 ? (.86 - k) * 5 : 0;
  out[0] = Math.max(60, base - 34 * rock - 12 * (1 - k)); out[1] = Math.max(70, base + 4 - 30 * rock - 8 * (1 - k)); out[2] = Math.max(90, 250 - 18 * rock); return out;
};
Pres.load = function (areaId) {
  const A = S7.reg.areas[areaId], W3 = Pres.W3; Pres.dispose();
  const filter = { look: 'cel', bands: 3, ink: 1, inkW: 1.4, punch: 1.35 };
  const fogK = 3;
  const o = { look: 'card', sky: A.sky, fog: { color: (A.fog && A.fog.color) || '#101018', near: ((A.fog && A.fog.near) || 60) * fogK, far: ((A.fog && A.fog.far) || 520) * fogK }, ambient: A.ambient, lights: 10, glowLights: 6, torchLights: 0, overlay: { fov: 62 }, filter, camera: { mode: 'fixed', capture: true, near: 4 }, outlines: true };
  if (A.snow || A.mood === 'night' || A.mood === 'ice' || A.mood === 'dusk') o.sun = { color: A.mood === 'night' ? '#8aa0d8' : A.mood === 'dusk' ? '#ffb090' : '#dff0ff', intensity: A.mood === 'night' ? 1.4 : 2.2, dir: [-.45, -.55, -.7], area: 420, shadow: true, map: 1024 };
  if (A.terrain) { o.terrain = { size: [A.w * U, A.h * U], height: (x, y) => S7.blackRunHeight(x / U, y / U) * U, color: snowColor, far: 5200, cell: 32, rock: undefined }; o.fog.near = 160; o.fog.far = 2400; }
  else o.level = { rows: A.rows, ground: A.ground, colors: A.colors, side: 'block', color: A.wallColor, wallSide: 'block' };
  const w = Pres.world = new W3(Pres.game, o);
  Pres.areaId = areaId; Pres.t = 0;
  w.camera.set('fixed'); w.camera.capture = true;
  // props
  for (const p of A.props || []) {
    if (p[0] === 'thing') { const z = (p[4] || 0) * U + (A.height ? A.height(p[2], p[3]) * U : 0); const t = w.thing(p[1], p[2] * U, p[3] * U, z, { yaw: p[5] || 0 }); Pres.things[p[1] + '@' + p[2] + ',' + p[3]] = t; if (p[1] === 'glasswall') Pres.things.glass = t; if (p[1] === 'rope') Pres.things.rope = t; if (p[1] === 'serac') Pres.things.serac = t; if (p[1] === 'frozenshop') Pres.things.frozenshop = t; if (p[1] === 'gardengate') Pres.things.gardengate = t; }
    else if (p[0] === 'shape') { try { w.shape(p[1], p[2] * U, p[3] * U, 0, { facing: p[4] || 0 }); } catch (e) { /* shape optional */ } }
    else if (p[0] === 'light') { const h = w.light(Object.assign({ x: p[1] * U, y: p[2] * U, z: p[3] * U }, { color: p[4].color, reach: p[4].reach * U / 2, power: p[4].power * 10, flicker: p[4].flicker || 0 })); Pres.lights.push(h); }
  }
  Pres.syncGates();
  // the hero actor
  const hero = Pres.hero = w.mob({ x: S7.st.x * U, y: S7.st.y * U, z: S7.st.z * U, rig: Pres.rigs[S7.st.persona], fly: true, pose: false, r: 4, half: 6 });
  hero.setSolid(false);
  w.prepare && w.prepare();
};
Pres.syncGates = function () {
  const A = S7.reg.areas[S7.st.area]; if (!A || !A.gates) return;
  const open = g => S7.st.gates[A.id + ':' + g];
  for (const gid in A.gates) {
    const g = A.gates[gid]; if (!open(gid)) continue;
    const key = g.kind === 'echowall' ? (A.id === '00A' ? 'glass' : 'frozenshop') : g.kind === 'buyout' ? (A.id === '00A' ? 'rope' : 'gardengate') : g.kind === 'charge' ? 'serac' : null;
    if (key && Pres.things[key] && Pres.world && !Pres.things[key]._gone) { try { Pres.world.remove(Pres.things[key]); } catch (e) { /* gone */ } Pres.things[key]._gone = true; }
  }
};

// ---- entities: one actor per sim entity
function actorFor(key, make) {
  let a = Pres.ents.get(key); if (!a) { a = make(); a.setSolid(false); Pres.ents.set(key, a); } a._seen = Pres.frame; return a;
}
Pres.frame = 0;
const enemyRigs = {};
function rigFor(e) { return new E_.Humanoid(e.def.rig); }
const place = (a, x, y, z) => a.place(x * U, y * U, z * U);
Pres.step = function (dt) {
  const w = Pres.world; if (!w) return; const st = S7.st; Pres.frame++; Pres.t += dt;
  if (st.area !== Pres.areaId) return;
  const hero = Pres.hero, rig = Pres.rigs[st.persona];
  if (hero.rig !== rig) hero.rig = rig;
  const aiming = st.mode === 'aim', moving = st.speed > .3;
  const vx = Math.cos(st.face) * st.speed * U * (st.dir < 0 && false ? -1 : 1), vy = Math.sin(st.face) * st.speed * U;
  place(hero, st.x, st.y, st.z + (st.mode === 'lift' ? 5.2 : 0)); hero.facing = aiming ? st.aim.yaw : st.face; hero.visible = !aiming;
  const frozen = st.mode === 'frozen';
  hero.flash = st.hurtT > 0 ? .3 : 0;
  hero.anim = null;
  const pose = frozen ? 'down' : st.mode === 'ring' || st.switchT > .2 ? 'cheer' : null;
  rig.update(dt, { x: hero.x, y: hero.y, z: hero.z, vx: moving ? vx : 0, vy: moving ? vy : 0, facing: hero.facing, point: st.mode === 'aim', pose: pose || undefined, run: moving ? 1 : 0, sprint: st.mode === 'ski' ? 1 : 0, crouch: st.mode === 'ski' ? 1 : 0, expr: st.hurtT > 0 ? 'wince' : undefined, stance: 'ready', down: frozen ? Math.min(1, (st.frozenT || 0) < 1.2 ? 1 : 0) : undefined });
  // frozen statue left behind
  const fa = st.frozenAt;
  // enemies
  for (const e of st.enemies) {
    const a = actorFor('e' + e.id, () => { const t = w.mob({ x: e.x * U, y: e.y * U, z: e.z * U, rig: rigFor(e), fly: true, pose: false, r: 4, half: 6 }); return t; });
    place(a, e.x, e.y, e.z); a.facing = e.face;
    const show = e.dead || e.visible > 0 || e.dummy;
    const flick = e.visible > 0 && e.visible < 1.2 ? (Math.sin(Pres.t * 40) > 0) : true;
    a.visible = show && flick; a.flash = e.hit > 0 ? .3 : 0; a.fade = e.dead ? Math.max(0, e.deadT / 1.4) : e.spawnT > 0 ? 0 : 1;
    const moving = !e.dead && (e.vx !== 0 || e.vy !== 0), skis = !!e.def.skis;
    a.rig.update(dt, { x: a.x, y: a.y, z: a.z, vx: e.vx * U, vy: e.vy * U, facing: e.face, pose: e.dead ? 'die' : e.anim === 'laugh' ? 'cheer' : undefined, expr: e.visible > 0 || e.dead ? 'shout' : 'smile', run: moving ? 1 : 0, down: e.dead ? 1 : undefined, stance: 'ready' });
    // tells: footprints and breath while hidden
    if (!e.dead && !show && moving && Pres.t - (e._printT || 0) > .28) { e._printT = Pres.t; Pres.prints.push({ x: e.x, y: e.y, z: e.z, t: 3.5 }); if (Pres.prints.length > 120) Pres.prints.shift(); }
    if (!e.dead && !show && Pres.t - (e._breathT || 0) > .5) { e._breathT = Pres.t; Pres.game.particles.dust(e.x * U, e.y * U, (e.z + 1.5) * U, 2, { color: '#e8f2ff', speed: 8, size: .9 }); }
    if (e.dead && !e._fx) { e._fx = true; Pres.game.particles.glints(e.x * U, e.y * U, (e.z + 1.2) * U, 12, '#bfe8ff', 14); Pres.game.particles.ring(e.x * U, e.y * U, 4, 30, e.boom ? '#ff7a5a' : '#bfe8ff', .5, e.z * U); }
  }
  for (const [k, a] of Pres.ents) { if (a._seen !== Pres.frame && !a._keep) { try { w.remove(a); } catch (e) { /* gone */ } Pres.ents.delete(k); } }
  // npcs at spots (Room 7, villages)
  const A = S7.reg.areas[st.area];
  for (const sp of A.spots) if (sp.kind === 'npc' && Pres.rigs[sp.who]) {
    const p = S7.sim.spotPos(sp); const a = actorFor('n' + sp.id, () => w.mob({ x: p.x * U, y: p.y * U, z: p.z * U, rig: Pres.rigs[sp.who], fly: true, pose: false, r: 4, half: 6 })); a._keep = true; a._seen = Pres.frame;
    place(a, p.x + (sp.node ? 0.9 : 0), p.y + (sp.node ? 0.9 : 0), p.z); a.facing = Math.atan2(st.y - p.y, st.x - p.x) + (sp.who === 'murmel' ? 0 : 0);
    Pres.rigs[sp.who].update(dt, { x: a.x, y: a.y, z: a.z, vx: 0, vy: 0, facing: a.facing, stance: 'ready', pose: sp.who === 'pim' ? 'cheer' : undefined });
    if (sp.who === 'pim') a.sink = -Math.sin(Pres.t * 2) * 10 - 16;
  }
  // frozen coats left as statues
  if (fa && fa.persona) { const a = actorFor('statue', () => w.mob({ x: fa.x * U, y: fa.y * U, z: fa.z * U, rig: Pres.rigs[fa.persona], fly: true, pose: false, r: 4, half: 6 })); a._seen = Pres.frame; a._keep = true; }
  // bosses
  const b = st.boss;
  if (b) {
    const a = actorFor('boss', () => w.mob({ x: b.x * U, y: b.y * U, z: 0, rig: Pres.rigs[b.id], fly: true, pose: false, r: 12, half: 16 })); a._keep = true;
    place(a, b.x, b.y, b.z); a.facing = Math.atan2(st.y - b.y, st.x - b.x); a.visible = b.id === 'grau' || !!(a.visible); a.flash = b.hit > 0 ? .35 : 0;
    Pres.rigs[b.id].update(dt, { x: a.x, y: a.y, z: a.z, vx: 0, vy: 0, facing: a.facing, pose: b.dead ? 'die' : b.state === 'window' ? 'cheer' : b.state === 'ring' ? 'cast' : undefined, expr: b.state === 'window' ? 'shout' : 'angry', down: b.dead ? 1 : undefined, stance: 'ready', point: b.state === 'volley' });
    if (b.id === 'king') a.visible = false;   // the colossus is the scenery thing in the area
  } else { const a = Pres.ents.get('boss'); if (a) { w.remove(a); Pres.ents.delete('boss'); } }
  // the Sweep skis in, kneels and chips a frozen coat out of the ice
  if (Pres.sweepT > 0) {
    Pres.sweepT -= dt; const k = Pres.sweepT, sx = st.x + Math.cos(st.face + 1.6) * 1.7, sy = st.y + Math.sin(st.face + 1.6) * 1.7;
    const a = actorFor('sweep', () => w.mob({ x: sx * U, y: sy * U, z: st.z * U, rig: Pres.rigs.sweep, fly: true, pose: false, r: 4, half: 6 })); a._seen = Pres.frame;
    const arrive = Math.min(1, (3.4 - k) * 1.2), px = sx + Math.cos(st.face + 1.6) * (1 - arrive) * 14, py = sy + Math.sin(st.face + 1.6) * (1 - arrive) * 14;
    place(a, px, py, st.z); a.facing = Math.atan2(st.y - py, st.x - px);
    Pres.rigs.sweep.update(dt, { x: a.x, y: a.y, z: a.z, vx: arrive < 1 ? -Math.cos(st.face + 1.6) * 90 : 0, vy: arrive < 1 ? -Math.sin(st.face + 1.6) * 90 : 0, facing: a.facing, pose: arrive >= 1 ? 'kneel' : undefined, stance: 'ready' });
    if (arrive >= 1 && Math.floor(k * 8) !== Math.floor((k + dt) * 8)) Pres.game.particles.glints(st.x * U, st.y * U, (st.z + 1) * U, 6, '#e8f8ff', 14);
  }
  // ghosts (Echo Run)
  if (st.echo) Pres.stepGhosts(dt);
  // camera
  Pres.syncCamera();
  w.step(dt);
  if (S7.st.mode !== 'aim') Pres.mouse[0] = Pres.mouse[1] = 0;
  const pk = w.camera.mouse; if (pk && (pk[0] || pk[1])) { }
};
Pres.takeMouse = function () { const w = Pres.world; if (!w || !w.camera) return [0, 0]; const o = [0, 0]; w.camera.takeMouse(o); return o; };
Pres.syncCamera = function () {
  const c = S7.st.cam, w = Pres.world; if (!w) return;
  const dx = c.lx - c.x, dy = c.ly - c.y, dz = c.lz - c.z, yaw = Math.atan2(dy, dx), pitch = Math.atan2(dz, Math.hypot(dx, dy));
  w.camera.fixed = { x: c.x * U, y: c.y * U, z: c.z * U, yaw, pitch, fov: c.fov };
  if (w.overlay) w.overlay.on = false;
};

// ---- ghosts: other Echo Run racers
Pres.stepGhosts = function (dt) {
  const w = Pres.world, st = S7.st, ec = st.echo, G = S7.graph(); if (!ec) return;
  const list = [];
  if (ec.ghost && ec.ghost.length && ec.started) { const t = ec.t; let i = 0; while (i < ec.ghost.length - 1 && ec.ghost[i + 1][0] < t) i++; const g = ec.ghost[Math.min(i, ec.ghost.length - 1)]; if (g && t <= ec.ghost[ec.ghost.length - 1][0] + 1) list.push({ key: 'echo', edge: g[1], s: g[2], persona: 'anselma', name: 'ECHO' }); }
  for (const id in ec.others) { const o = ec.others[id]; if (o.area === st.area && o.edge) list.push({ key: 'p' + id, edge: o.edge, s: o.s, persona: o.persona || 'rurik', name: o.name }); }
  for (const g of list) {
    const e = G.edges[g.edge]; if (!e) continue; const pos = {}; S7.sim.edgePos(e, g.s, pos);
    const a = actorFor('g' + g.key, () => { const r = new E_.Humanoid(Object.assign({}, S7.reg.personas[g.persona].look)); return w.mob({ x: pos.x * U, y: pos.y * U, z: pos.z * U, rig: r, fly: true, pose: false, r: 4, half: 6 }); });
    place(a, pos.x, pos.y, pos.z); a.facing = pos.ang; a.fade = .55; a.rig.update(dt, { x: a.x, y: a.y, z: a.z, vx: Math.cos(pos.ang) * 150, vy: Math.sin(pos.ang) * 150, facing: pos.ang, run: 1, sprint: 1, crouch: 1 }); a._name = g.name;
  }
};

// ---- drawing
Pres.draw = function (r) {
  const w = Pres.world, st = S7.st; if (!w || st.area !== Pres.areaId) return;
  const t = Pres.t, pen = w.pen;
  // skis and the chairlift
  if (st.mode === 'ski' || (st.mode === 'aim' && st.preAim === 'ski') || st.mode === 'lift' || (st.mode === 'aim' && st.preAim === 'lift')) {
    const h = Pres.hero; pen.at(h.x, h.y, h.z, st.face, 1);
    for (const sd of [-1, 1]) pen.box(3, sd * 2.2, .8, 15, 1.4, .8, '#d81e2a').cone(10.5, sd * 2.2, 1.2, 14, sd * 2.2, 3, .9, '#d81e2a');
    if (st.mode === 'lift' || st.preAim === 'lift') { pen.at(h.x, h.y, h.z, st.face, 1).box(0, 0, 22, 9, 12, 1.6, '#4a3a2a').tube(0, 0, 22, 0, 0, 82, .5, '#222'); }
  }
  // prints in the snow
  for (const p of Pres.prints) { p.t -= 1 / 60; if (p.t > 0) w.glow(p.x * U, p.y * U, p.z * U + .6, 1.6, '#6a7a98'); }
  Pres.prints = Pres.prints.filter(p => p.t > 0);
  // Warm Spots: glowing, only on revealed Whiteouts
  for (const e of st.enemies) {
    if (e.dead || e.spawnT > 0 || !(e.visible > 0)) continue;
    const exposed = !(e.def.shield && e.shieldUp), spots = [e.def.warm].concat(e.def.warm2 ? [e.def.warm2] : []);
    spots.forEach((s, i) => { const bx = e.x + Math.cos(e.face) * (i ? -1 : 1) * e.def.r * .6, by = e.y + Math.sin(e.face) * (i ? -1 : 1) * e.def.r * .6; const pulse = 1 + Math.sin(t * 9) * .25; if (exposed) w.glow(bx * U, by * U, (e.z + s[1]) * U, s[2] * U * 1.4 * S7.T('warmSize') * pulse, '#ff4a2a', { light: true }); else w.glow(bx * U, by * U, (e.z + s[1]) * U, 2, '#703020'); });
    w.arc && 0;
  }
  const b = st.boss;
  if (b && !b.dead) { const wp = b.warmPos(); if (b.warmOpen()) w.glow(wp[0] * U, wp[1] * U, wp[2] * U, b.warmR * U * 1.5 * (1 + Math.sin(t * 12) * .2), '#ff3a1a', { light: true }); else w.glow(wp[0] * U, wp[1] * U, wp[2] * U, 3, '#502020');
    if (b.zone) { const z = b.zone; w.arc(z.x * U, z.y * U, b.zone.t * 0 + 0, z.r * U, 0, Math.PI * 2, b.zone.t > 1.4 ? '#ff3030' : '#ffb030', .5); }
    if (b.id === 'king' && (b.state === 'inhale' || b.state === 'window')) w.glow((b.x + (b.toggle ? .9 : -.9)) * U, (b.y + 2.9) * U, 4.0 * U, 18, '#ff6a40'); }
  // projectiles
  for (const p of st.projectiles) { if (p.kind === 'suit') pen.at(p.x * U, p.y * U, p.z * U, t * 4, 1).box(0, 0, 0, 14, 8, 10, '#6a3a22').box(0, 0, 6, 6, 2, 1.6, '#d8b050'); else w.glow(p.x * U, p.y * U, p.z * U, 5, '#e8f4ff'); }
  // pickups
  for (const p of st.pickups) { const c = p.kind === 'red' ? '#e01828' : p.kind === 'rime' ? '#8fe8ff' : /^pin/.test(p.kind) ? '#ffd24a' : p.kind.startsWith('coat') ? '#ff8ad8' : '#fff0a0'; const bob = Math.sin(t * 3 + p.id) * 2; w.glow(p.x * U, p.y * U, (p.z + .4) * U + bob, p.drop ? 3 : 5, c, { light: !p.drop }); }
  // mines, charge
  for (const m of st.mines) w.glow(m.x * U, m.y * U, m.z * U + 2, 3, '#ff8a20');
  if (st.charge) w.glow(st.charge.x * U, st.charge.y * U, st.z * U + 4, 5 + Math.sin(t * 30) * 2, '#ff6020');
  // scan ring
  if (Pres.scanFx) { const f = Pres.scanFx; f.t += 1 / 60; const k = f.t / .6; if (k < 1) w.arc(f.x * U, f.y * U, f.z * U - 14, 0, f.r * U * k, 0, Math.PI * 2, '#bfe8ff', 1 - k); else Pres.scanFx = null; }
  // flare, light on the hero
  if (st.flare > 0 && w.glow) w.glow(Pres.hero.x, Pres.hero.y, Pres.hero.z + 40, 6, '#ffb060', { light: true });
  // first-person gun: drawn in the world just ahead of the camera, so the Comic cel filter inks it like everything else
  // (the engine's separate overlay pass goes black under a filter on the WebGL path)
  if (st.mode === 'aim') {
    const per = S7.reg.personas[st.persona], wid = per.weapon, rs = st.roster[st.persona], f = w.camera.fixed || {}, pen2 = w.pen;
    const kick = Math.max(0, rs.cool) * 2.4, bob = Math.sin(t * 2) * .12, long = wid === 'rifle' || wid === 'launcher' || wid === 'alphorn';
    pen2.at(f.x, f.y, f.z, f.yaw, 1, f.pitch);
    const fx = 11 - kick, ry = 5, dz = -5.5 + bob;
    pen2.box(fx + (long ? 7 : 3), ry, dz, long ? 17 : 8, 1.8, 2.2, '#2a2a34').box(fx - 3, ry, dz - 2.4, 3, 1.8, 4.4, '#5a3220').tube(fx + 1, ry, dz + .6, fx + (long ? 17 : 11), ry, dz + .6, .8, '#555560').ball(fx - 3.5, ry - .6, dz - 3, 1.5, 1.5, 1.6, '#e0b898');
    if (wid === 'shotgun') pen2.tube(fx + 1, ry, dz - .8, fx + 14, ry, dz - .8, .8, '#555560');
    if (wid === 'camera') pen2.box(fx + 5, ry, dz, 5, 5, 4, '#222').glow(fx + 8, ry, dz, rs.cool > 0 ? 2.4 : .6, '#ffffff');
    if (wid === 'poles') pen2.tube(fx - 1, -ry, dz, fx + 9, -ry, dz + .4, .8, '#555560');
    if (rs.cool > 0.05) pen2.glow(fx + (long ? 20 : 14), ry, dz + .6, .9 * Math.min(1, rs.cool * 6), '#ffd070');
  }
  w.draw(r);
};
Pres.scan = function (x, y, z, rr) { Pres.scanFx = { x, y, z, r: rr, t: 0 }; };
S7.bus.on('scan', d => Pres.scan(d.x, d.y, d.z, d.r));
S7.bus.on('hit', d => { if (!Pres.world || !Pres.game) return; const g = Pres.game.particles; g.sparks(d.x * U, d.y * U, d.z * U, d.part === 'warm' ? 14 : 5, null, { color: d.part === 'warm' ? '#ff6a40' : d.part === 'shield' ? '#cfd6e0' : '#ffffff' }); if (d.part === 'warm') g.text(d.x * U, d.y * U, d.z * U + 8, 'THAW.', '#ff6a40', { bounce: true }); });
S7.bus.on('explode', d => { if (!Pres.world || !Pres.game) return; const g = Pres.game.particles; g.ring(d.x * U, d.y * U, 6, d.radius * U, d.big ? '#fff0c0' : '#ffb060', .5, (d.z - 1) * U); g.sparks(d.x * U, d.y * U, d.z * U, 14, null, { color: '#ffd080' }); g.dust(d.x * U, d.y * U, d.z * U, 10, { color: '#e8f0f8', speed: 60 }); Pres.game.shake && Pres.game.shake(d.big ? 5 : 3); });
S7.bus.on('shot', d => { if (!Pres.world || !Pres.game) return; const e = d.end; Pres.game.particles.sparks(e[0] * U, e[1] * U, e[2] * U, 2, null, { color: '#ffe8b0' }); });
S7.bus.on('hurt', d => { if (Pres.game) Pres.game.shake && Pres.game.shake(4); });
S7.bus.on('freeze', d => { if (Pres.game) { Pres.game.flash && Pres.game.flash('#bfe8ff', .4); Pres.game.particles.glints(d.x * U, d.y * U, (d.z + 1) * U, 24, '#e8f8ff', 20); } });
S7.bus.on('shake', d => { if (Pres.game) Pres.game.shake && Pres.game.shake(d.n * 6); });
S7.bus.on('splat', d => { if (Pres.game && d.p) Pres.game.particles.dust(d.p.x * U, d.p.y * U, d.p.z * U, 6, { color: '#f4f8ff', speed: 40 }); });
S7.bus.on('pickup', d => { if (Pres.game && Pres.world) Pres.game.particles.glints(d.x * U, d.y * U, S7.st.z * U + 18, 6, d.kind === 'red' ? '#ff6070' : '#bff8ff', 10); });

// the pad shakes with the game
const rumble = (a, b) => { try { if (Pres.game && Pres.game.input.rumble) Pres.game.input.rumble(a, b); } catch (e) { /* no pad */ } };
S7.bus.on('hurt', () => rumble(.7, .25)); S7.bus.on('shot', d => rumble(d.weapon === 'shotgun' || d.weapon === 'launcher' ? .5 : .2, .08)); S7.bus.on('explode', d => rumble(d.big ? .9 : .5, .3)); S7.bus.on('crit', () => rumble(.4, .12)); S7.bus.on('freeze', () => rumble(1, .5));

S7.bus.on('rescue', () => { S7.pres.sweepT = 3.4; });
