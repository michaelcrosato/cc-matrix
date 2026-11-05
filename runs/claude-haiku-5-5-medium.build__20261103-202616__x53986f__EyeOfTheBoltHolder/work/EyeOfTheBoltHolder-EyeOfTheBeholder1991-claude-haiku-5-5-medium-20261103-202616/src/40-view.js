/* ===== 40 view · the presenter: one World3D per floor, built at boot; each frame it mirrors the sim =====
 * The sim is never written from here. The camera is the party's eyes (fixed, tweened per step); doors and gates
 * rise and swing; wall features are things drawn on their faces; monsters are cards or pen-drawn bodies; items on the
 * floor are small models at their cell. The events from the sim (sound, hits, deaths) become one-shot effects. */
const VIEW = { worlds: {}, world: null, floor: null, mobs: new Map(), things: {}, items: {}, lamp: null, hit: 0, shake: 0, bump: 0, fadeIn: 0, eyes: null };
const EYE = 25, CELL = 32, MID = c => c * CELL + CELL / 2;
/** the wall feature kinds the presenter draws, and the custom things they need */
const FEAT_THING = { lever: 'vLever', button: 'vButton', catch: 'vCatch', alcove: 'vAlcove', plaque: 'vPlaque', candle: 'vCandle', greatLock: 'vGreatLock', clock: 'vClock', shrine: 'vShrine', altar: 'vAltar', torch: 'vTorch' };
/** the level's tiles: each map cell is 2 x 2 tiles; a pit is a hole */
function levelOf(floorId) {
  const d = B.FLOORS[floorId], rows = [];
  for (let y = 0; y < d.rows.length; y++) for (let k = 0; k < 2; k++) {
    let row = '';
    for (let x = 0; x < d.rows[y].length; x++) { const c = d.rows[y][x]; row += c === '#' || c === 'U' ? '##' : c === 'O' ? 'OO' : '..'; }
    rows.push(row);
  }
  return { rows, legend: { O: { pit: true } }, ground: 'flagstone', colors: { base: '#4a4656', dark: '#34303e', light: '#5a5668' }, side: 'brick', color: '#4e4858' };
}
/** the things a wall feature's kind draws (the face's yaw: its local +y points out of the wall) */
const faceYaw = d => Math.atan2(DY[d], DX[d]) - Math.PI / 2;
const ZONE = { hall: [4, 2, 0] };
/** the custom things of the dungeon: levers, buttons, brass rivets, alcoves, plaques, candles, the great locks, the clock, the altar */
function defineThings() {
  const W = W3.THINGS;
  W.vLever = (p, t) => { const a = t.on ? -1 : 1; p.box(0, .8, 20, 6, 1.6, 9, '#4a4452').box(0, 1.8, 20, 2, .8, 5.5, '#24202a').tube(0, 2.2, 20, 0, 3.6, 20 + a * 5, .55, '#a8a8b8').ball(0, 3.8, 20 + a * 5.4, 1.1, 1.1, 1.1, t.on ? '#4ae070' : '#e8483a'); };
  W.vButton = (p, t) => { const dn = t.down ? .6 : 1.4; p.box(0, .8, 20, 8, 1.6, 8, '#4a4452').ball(0, 1.6 + dn, 20, 2.6, dn, 2.6, '#c8a040'); };
  W.vCatch = (p, t) => { p.box(0, .6, 20, 6, 1.2, 6, '#5a5260').ball(0, 1.4, 20, 1.3, .6, 1.3, '#d8b860').box(-2, 1.3, 20, .4, .3, 4, '#2a2630'); if (t.glint) p.glow(0, 1.5, 22, 4, '#fff2c0'); };
  W.vAlcove = (p, t) => { p.box(0, 0, 19, 16, 3, 16, '#1a1620').box(0, 2.6, 19, 14, .8, 14, '#0c0a10'); (t.items || []).slice(-1).forEach(c => p.box(0, 3.5, 20, 6, 4, 6, c || '#8a8a90')); };
  W.vPlaque = (p, t) => { p.box(0, 1.2, 19, 12, 2.4, 14, '#6e6a5e').box(0, 2.5, 19.5, 9, .3, 10, '#3a362e'); for (let i = 0; i < 4; i++) p.box(-3 + i * 2, 2.8, 20, .6, .3, 2, '#2a2520'); };
  W.vCandle = (p, t) => { p.box(0, 1, 22, 3, 2, 3, '#4a4448').box(0, 3, 22, 1, 4, 1, '#e8e0c0'); if (t.lit) p.glow(0, 5, 22, 2.4, '#9ad8ff'); };
  W.vGreatLock = (p, t) => { const a = (t.spin || 0) * Math.PI * 2; p.box(0, 2, 20, 16, 5, 16, '#3a3e46').tube(0, 2, 22, 0, 2, 22 + 0, .4, '#888').ball(Math.cos(a) * 4, 4, 24 + Math.sin(a) * 4, 2.4, 2.4, 2.4, t.on ? '#7ad8ff' : '#e8a040'); };
  W.vClock = (p, t) => { p.box(0, 2, 20, 16, 16, 3, '#6a5234').ball(0, 2, 22, 6, 6, 1, '#e8d8b0'); const a = t.hands ? (t.time || 0) : 0; p.bar(0, 2, 23, Math.cos(a) * 4, 2, 23 + Math.sin(a) * 4, .5, .5, '#2a1e10'); };
  W.vShrine = (p, t) => { p.box(0, 1, 22, 14, 2, 10, '#5a5448'); for (let i = 0; i < 4; i++) p.box(-5 + i * 3.4, 3, 22, 1.2, 2, 1.2, '#a8a090'); };
  W.vAltar = (p, t) => { p.box(0, 1.5, 22, 14, 3, 14, '#4a4e58'); };
  W.vTorch = (p, t) => { p.box(0, 1, 20, 4, 2, 4, '#4a4040'); p.glow(0, 4, 20, 3, '#ffb060'); };
  W.floorItem = (p, t) => { p.box(0, 0, 2, 6, 6, 4, t.color || '#c0b090'); };
  W.teleField = (p, t) => { if (t.on) p.glow(0, 0, 6, 8 + Math.sin((t.time || 0) * 4) * 1.5, '#9ae8ff'); };
  W.vSpin = (p, t) => { p.glow(0, 0, 3, 5, '#ffe08a'); };
  W.vTrap = (p, t) => { p.box(0, 0, .5, 14, 14, 1, '#2a2430'); if (t.glint) p.glow(0, 0, 3, 3, '#c8c0ff'); };
  W.plate = (p, t) => { const s = t.on ? .2 : 1, c = t.color || '#6a6474'; p.box(0, 0, s / 2, 22, 22, s, c).box(0, 0, s + .05, 17, 17, .1, E.shade(c, -.2)); };
  W.vStairDown = (p, t) => { const s = '#5a5468'; p.box(-13, 0, 19, 4, 5, 38, s).box(13, 0, 19, 4, 5, 38, s).box(0, 0, 39, 30, 6, 4, s); for (let k = 0; k < 4; k++) p.box(0, -2 - k * 3, -1 - k * 2.5, 22, 3, 2, '#3a3644'); if (t.on) p.glow(0, 0, 16, 5, '#9ae8ff'); };
  W.vStairUp = (p, t) => { p.box(-13, 0, 16, 4, 5, 32, '#5a5468').box(13, 0, 16, 4, 5, 32, '#5a5468').box(0, 0, 33, 30, 6, 4, '#5a5468').glow(0, 2, 6, 6, '#ff9a5a'); };
  W.vPit = (p, t) => { p.box(0, 0, -1, 14, 14, 1, '#0c0a10'); };
}
/** build one floor's world: its tiles, its things, its lights (every light is made now: no shader stall later) */
function buildFloor(game, floorId) {
  const d = B.FLOORS[floorId], lv = levelOf(floorId);
  const w = new W3(game, { level: lv, look: 'card', res: 'pixels', torchLights: 0, torchShadows: 0, torchPower: 18, lights: 2, glowLights: 4,
    ambient: floorId === 'f4' ? ['#3a4458', '#1a1e28', 4.2] : floorId === 'f3' ? ['#4a4a6a', '#1c1a2a', 4.4] : floorId === 'f2' ? ['#8a7058', '#342a20', 5.0] : ['#5a6a6a', '#262e2c', 4.6],
    fog: { color: floorId === 'f2' ? '#120e0a' : '#0a0c0e', near: 90, far: 320 }, sky: '#06080a', camera: { mode: 'fixed' }, overlay: { fov: 60 } });
  const th = { walls: {}, doors: {}, plates: {}, items: {}, lights: [] };
  VIEW.things[floorId] = th;
  for (let y = 0; y < d.rows.length; y++) for (let x = 0; x < d.rows[y].length; x++) {
    const c = d.rows[y][x], cx = MID(x), cy = MID(y);
    if (c === 'H' || c === 'I') { const b = w.box({ x: x * CELL, y: y * CELL, z: 0, w: CELL, d: CELL, h: 48, side: 'brick', color: '#4e4858', fixed: true }); th.doors[(d.ids && Object.keys(d.ids).find(k => d.ids[k][0] === x && d.ids[k][1] === y)) || key(x, y)] = { block: b }; }
    if (c === '=' || c === '+' || c === 'L' || c === 'K' || c === 'M') {
      const id = Object.keys(d.ids).find(k => d.ids[k][0] === x && d.ids[k][1] === y);
      const ns = ['#'].includes(d.rows[y][x - 1]) && ['#'].includes(d.rows[y][x + 1]);
      const t = w.thing('door', cx, cy, 0, { yaw: ns ? 0 : Math.PI / 2, w: 32, h: 46, color: c === '+' ? '#5a3a24' : '#26242c', frame: '#3a3444', locked: c === 'K' || c === 'L' || c === 'M' ? 'iron' : null, solid: true, open: 0 });
      th.doors[id || key(x, y)] = { t, gate: c === '=' };
    }
    if (c === 'P') { const id = Object.keys(d.ids).find(k => d.ids[k][0] === x && d.ids[k][1] === y); th.plates[id] = w.thing('plate', cx, cy, 0, { color: '#6e6878' }); }
    if (c === 'T') { const id = Object.keys(d.ids).find(k => d.ids[k][0] === x && d.ids[k][1] === y); th.plates[id] = w.thing('vTrap', cx, cy, 0, { color: '#625c6a' }); }
    if (c === '^') { const id = Object.keys(d.ids).find(k => d.ids[k][0] === x && d.ids[k][1] === y); th.plates[id] = w.thing('teleField', cx, cy, 0, { on: true }); }
    if (c === '<' || c === '>') { th.stairs = th.stairs || {}; th.stairs[key(x, y)] = w.thing(c === '>' ? 'vStairDown' : 'vStairUp', cx, cy - 6, 0, { on: true }); }
    if (c === 'S') { th.plates[key(x, y)] = w.thing('vSpin', cx, cy, 0, {}); }
  }
  for (const wl of d.walls || []) {
    const cx = MID(wl.at[0]) + DX[wl.dir] * CELL / 2, cy = MID(wl.at[1]) + DY[wl.dir] * CELL / 2;
    if (wl.k === 'torch') { th.lights.push(w.light({ color: '#ffb070', reach: 130, power: 7, flicker: .3 })); const L = th.lights[th.lights.length - 1]; L.x = cx; L.y = cy; L.z = 30; L.on = true; continue; }
    const kind = FEAT_THING[wl.k]; if (!kind) continue;
    th.walls[wl.id] = w.thing(kind, cx, cy, 0, { yaw: faceYaw(wl.dir), on: false, down: false, lit: false, glint: false, items: [] });
  }
  // the party's lantern, and the boss's amber light and the lightning on it
  th.lantern = w.light({ color: '#ffd8a0', reach: 170, power: 9 });
  if (floorId === 'f4') { th.boss = w.light({ color: '#ffb040', reach: 240, power: 14, flicker: .2 }); th.boss.x = MID(6); th.boss.y = MID(3); th.boss.z = 26; th.boss.on = false; }
  w.onDraw = (world, r) => { drawEffects(world, r); };
  return w;
}
/** builds every floor's world (the boot's steps) and the race's; each prepared, so a floor change does not stall */
function buildWorlds(game) {
  defineThings();
  for (const f of [...FLOOR_ORDER, 'race']) VIEW.worlds[f] = buildFloor(game, f);
  for (const f of Object.keys(VIEW.worlds)) VIEW.worlds[f].prepare();
}
/** the active floor's world: swap when the floor changes */
function useFloor(id) {
  if (VIEW.floor === id) return VIEW.world;
  VIEW.floor = id; VIEW.world = VIEW.worlds[id]; VIEW.mobs.clear(); VIEW.items = {};
  for (const m of monsOn()) addMob(m);
  return VIEW.world;
}
/** a monster's body: a card (a rig from its kind) or an orb or the pen-drawn Eye */
function addMob(m) {
  const d = B.MONS[m.type], w = VIEW.world, X = MID(m.cx), Y = MID(m.cy);
  const rigs = {
    rat: () => ({ blob: new E.Blob({ R: 3.6, ears: 'cat', tail: true, feet: true, mouth: 'fangs', colors: { base: '#6a5a50', dk: '#3e342e', lt: '#9a8a7a', eye: '#ff6a4a' } }), r: 4, half: 0 }),
    leech: () => ({ blob: new E.Blob({ R: 6, face: 'front', colors: { base: '#b89a9a', dk: '#7a5a5a', lt: '#e0c8c8', eye: '#ff8a8a' } }), r: 7, half: 0 }),
    latchkin: () => ({ rig: new E.Humanoid({ size: .85, build: 'chibi', hunch: .5, hood: true, outfit: 'tunic', bladeLen: 5, eyeGlow: '#ffd24a', colors: { skin: '#7a8a5a', hair: '#4a3a2a', cloth: '#6a4a32', pants: '#3a2e22', metal: '#9a9aa8' } }), r: 4.5, half: 8 }),
    ooze: () => ({ blob: new E.Blob({ R: 8, face: 'front', mouth: true, colors: { base: '#5a8a3a', dk: '#2e5a22', lt: '#9ad06a', spec: '#e8ffd0' } }), r: 9, half: 0 }),
    ratknot: () => ({ blob: new E.Blob({ R: 7, face: 'front', colors: { base: '#8a6a4a', dk: '#4a3a24', lt: '#c0a070', eye: '#ffcc60' } }), r: 9, half: 0 }),
    snick: () => ({ rig: new E.Humanoid({ size: 1, build: 'bulky', hunch: .3, hat: { style: 'crown', color: '#c8a040' }, armor: true, outfit: 'coat', bladeLen: 9, eyeGlow: '#ffd24a', colors: { skin: '#7a8a5a', cloth: '#5a3a2a', plate: '#a08040' } }), r: 7, half: 12 }),
    skeleton: () => ({ rig: new E.Humanoid({ size: 1.2, build: 'skeleton', outfit: 'coat', bladeLen: 7, colors: { bone: '#d8cfb4', cloth: '#5a4030', metal: '#8a8a90' } }), r: 6, half: 14 }),
    rustling: () => ({ blob: new E.Blob({ R: 4.2, horns: true, feet: true, mouth: true, colors: { base: '#b8642a', dk: '#7a3a18', lt: '#e8a060' } }), r: 4, half: 0 }),
    spider: () => ({ blob: new E.Blob({ R: 7, face: 'front', colors: { base: '#b8923a', dk: '#6a5020', lt: '#e8c060', eye: '#ff4a3a' } }), r: 9, half: 0 }),
    sentinel: () => ({ rig: new E.Humanoid({ size: 1.6, build: 'bulky', armor: true, hat: { style: 'helmet', color: '#8a6a3a' }, bladeLen: 14, eyeGlow: '#ff8a3a', colors: { cloth: '#6a4a2a', plate: '#b08a4a', metal: '#c8a868', skin: '#5a4a3a' } }), r: 12, half: 22 }),
    hound: () => ({ blob: new E.Blob({ R: 6, face: 'front', colors: { base: '#c8b8b0', dk: '#8a7a70', lt: '#e8dcd4', eye: '#ff3a3a' } }), r: 8, half: 0 }),
    seer: () => ({ rig: new E.Humanoid({ size: 1.25, build: 'heroic', outfit: 'robe', hood: true, weapon: 'staff', eyeGlow: '#8ae0ff', colors: { cloth: '#d8d0e8', hair: '#3a2a4a', skin: '#b8b0c8', trim: '#6a4a9a' } }), r: 6, half: 14 }),
    warden: () => ({ rig: new E.Humanoid({ size: 1.35, build: 'heroic', armor: true, hat: { style: 'helmet', color: '#2a2434' }, weapon: 'staff', eyeGlow: '#e8e8ff', colors: { cloth: '#2a2434', plate: '#4a4458', metal: '#9a98a8', skin: '#b8b0c8' } }), r: 7, half: 16 }),
    gazer: () => ({ orb: { color: '#e8a040', r: 4 }, r: 4, half: 0, fly: true }),
    golem: () => ({ rig: new E.Humanoid({ size: 1.9, build: 'bulky', armor: true, weapon: null, eyeGlow: '#7ad8ff', colors: { cloth: '#3a3e46', plate: '#5a606a', skin: '#4a4e56' } }), r: 14, half: 26 }),
    boltholder: () => ({ orb: { color: '#e8a030', r: 14 }, r: 14, half: 0, pen: true })
  };
  const make = rigs[m.type]();
  const body = w.mob(Object.assign({ x: X, y: Y, z: make.fly ? 16 : 0, r: make.r, half: make.half, mass: m.type === 'golem' ? 8 : 1.4, fly: !!make.fly }, make.rig ? { rig: make.rig } : {}, make.blob ? { blob: make.blob } : {}, make.orb ? { orb: make.orb } : {}));
  body.data = { uid: m.uid, type: m.type };
  VIEW.mobs.set(m.uid, body);
}
/** mirror the sim: the party's camera, the doors and gates, the plates and levers, the monsters, the items */
function syncWorld(dt) {
  const S = B.sim.S, p = S.party, w = VIEW.world, th = VIEW.things[S.floor];
  if (!th) return;
  // the camera from the party's tween (eased, as the kit's step)
  const tw = p.tween; let x = MID(p.cx), y = MID(p.cy), yaw = -Math.PI / 2 + p.dir * Math.PI / 2, u = 1;
  if (tw) { u = Math.min(1, tw.t / Math.max(1e-6, tw.dur)); const s = u * u * (3 - 2 * u); if (tw.k === 'step') { x = MID(tw.fx) + (MID(p.cx) - MID(tw.fx)) * s; y = MID(tw.fy) + (MID(p.cy) - MID(tw.fy)) * s; yaw = -Math.PI / 2 + tw.fdir * Math.PI / 2; } else { const a0 = -Math.PI / 2 + tw.fdir * Math.PI / 2, a1 = -Math.PI / 2 + p.dir * Math.PI / 2; yaw = a0 + E.angDiff(a0, a1) * s; x = MID(p.cx); y = MID(p.cy); } }
  const bob = tw && tw.k === 'step' && S.stepMode !== 'instant' && !VIEW.noBob ? Math.sin(u * Math.PI) * .8 : 0;
  VIEW.eyes = { x, y, yaw };
  w.camera.fixed = { x: x - Math.cos(yaw) * 4, y: y - Math.sin(yaw) * 4, z: EYE + bob - (VIEW.fallT > 0 ? VIEW.fallT * 40 : 0), yaw, pitch: -.04, fov: 74 };
  if (VIEW.lantern !== undefined) { /* the lantern follows the eyes */ }
  th.lantern.x = x; th.lantern.y = y; th.lantern.z = EYE + 4; th.lantern.on = true;
  // doors and gates
  for (const [id, dref] of Object.entries(th.doors)) {
    if (dref.block) { const open = (S.floors[S.floor].gates[id] && S.floors[S.floor].gates[id].open) || (S.floors[S.floor].doors[id] && S.floors[S.floor].doors[id].open); if (open) dref.block.sink = Math.min(48, (dref.block.sink || 0) + dt * 60); continue; }
    const f = S.floors[S.floor], open = (f.gates[id] && f.gates[id].open) || (f.doors[id] && f.doors[id].open);
    const t = dref.t; const want = open ? 1 : 0; const was = t.open || 0;
    t.open = approach(was, want, dt * (dref.gate ? .9 : 1.4)); if (t.open > .85 && t.solid) w.setSolid(t, false); else if (t.open < .5 && !t.solid) { /* closed: solid again */ }
  }
  // plates, levers, buttons, catches, candles, great locks
  for (const [id, t] of Object.entries(th.plates)) { const f = S.floors[S.floor]; if (f.plates[id]) t.on = f.plates[id].down; }
  for (const [id, t] of Object.entries(th.walls)) {
    const f = S.floors[S.floor];
    if (f.levers[id]) t.on = f.levers[id].on;
    if (f.candles && f.candles[id]) t.lit = f.candles[id].lit;
    if (t.kindVis === undefined) t.kindVis = 1;
  }
  if (th.boss) { const bs = S.boss; th.boss.on = !!(bs && bs.started && !bs.dead); }
  // items on the floor: rebuilt where their count changes (a small model at its cell)
  const f = S.floors[S.floor], sig = Object.entries(f.items).map(([k, l]) => k + ':' + l.length + l.map(i => i.id).join('+')).join('|');
  if (VIEW.items[S.floor + '#'] !== sig) { VIEW.items[S.floor + '#'] = sig; refreshItems(w, f); }
  // the alcoves show what they hold: the wall's items
  for (const [id, list] of Object.entries(f.alcoves)) { const t = th.walls[id]; if (t) t.items = list.map(i => B.ITEMS[i.id].k === 'key' ? '#c8a040' : '#9a9aa8'); }
  // monsters: each body glides to its cell, its look from its state
  for (const m of monsOn()) {
    let b = VIEW.mobs.get(m.uid);
    if (!b) { if (m.hp > 0 || m.state === 'dead') { addMob(m); b = VIEW.mobs.get(m.uid); } if (!b) continue; }
    const tx = MID(m.cx), ty = MID(m.cy);
    b.vx = clamp((tx - b.x) * 9, -120, 120); b.vy = clamp((ty - b.y) * 9, -120, 120);
    if (m.hp <= 0) { b.fade = Math.max(0, (b.fade === undefined ? 1 : b.fade) - dt * 1.5); b.anim = b.rig ? { pose: 'die' } : b.blob ? { squash: -.45 } : null; if (b.fade <= 0 && !b.gone) { w.remove(b); b.gone = true; VIEW.mobs.delete(m.uid); } continue; }
    if (b.gone) continue;
    const winding = m.wind > 0, hurt = m.status && m.status.held !== undefined;
    b.anim = b.rig ? { attack: winding ? { spec: { a0: 1, a1: -1.2, z0: 10, z1: 8, reach: 6 }, phase: 'wind', u: 1 - m.wind / .5 } : null, hurt: (b.flash || 0) > 0, expr: winding ? 'angry' : null }
      : b.blob ? { squash: winding ? -.2 : Math.sin(S.time * 4 + m.cx) * .05, look: [Math.cos(b.facing || 0), Math.sin(b.facing || 0)] } : null;
    b.facing = Math.atan2(p.cy - m.cy, p.cx - m.cx) * 0 + Math.atan2(y - b.y, x - b.x);
    if (b.flash > 0) b.flash -= dt;
    if (b.vz === undefined) b.vz = 0;
    if (b.orb && m.type === 'boltholder') { b.z = 16 + Math.sin(S.time * 1.5) * 3; }
  }
  // the first-person weapon and the Hand are the HUD's; the sim's wall tints flash on a hit
  VIEW.hit = Math.max(0, VIEW.hit - dt * 2);
  if (VIEW.fallT > 0) VIEW.fallT = Math.max(0, VIEW.fallT - dt);
}
/** the floor's items: a model at each cell's centre for the top item (its colour from the kind) */
function refreshItems(w, f) {
  const d = curFSdata = B.FLOORS[S.floor];
  for (const t of Object.values(VIEW.itemThings || {})) if (t) w.remove(t);
  VIEW.itemThings = {};
  for (const [k, list] of Object.entries(f.items)) {
    const [x, y] = k.split(',').map(Number), top = list[list.length - 1], kind = B.ITEMS[top.id].k;
    const color = { weapon: '#b8c0cc', missile: '#9a7a4a', armor: '#8a6a3a', shield: '#7a5a3a', food: '#c8a060', potion: '#e04a4a', scroll: '#e8dca0', key: '#d8b050', ward: '#c8c0b0', junk: '#7a7068', coin: '#ffd24a', gear: '#c8a040', note: '#e8dcb0', ammo: '#9a8a6a', tool: '#9ab0c8', book: '#7a4a8a', holy: '#e8d070', wand: '#8a6ac8' }[kind] || '#b0a890';
    VIEW.itemThings[k] = w.thing('floorItem', MID(x), MID(y), 0, { color, spin: .4, bob: 1 });
  }
  VIEW.itemThings._ = null;
}
let curFSdata = null;
/** the effects drawn in the world each frame (the boss's eye, the telegraphs, the bolts in flight) */
function drawEffects(w, r) {
  const S = B.sim.S; if (!S) return;
  // the Bolt-Holder's pen-drawn eye: a sclera, an iris, a pupil and seven bolts, two of them slid out per lock turned
  const mon = monsOn().find(m => m.type === 'boltholder' && m.hp > 0);
  if (mon && S.floor === 'f4') {
    const X = MID(mon.cx), Y = MID(mon.cy), b = S.boss || { locks: {}, phase: 1 }, t = S.time;
    w.pen.at(X, Y, 16 + Math.sin(t * 1.5) * 3).ball(0, 0, 0, 14, 14, 14, '#e8e0c8').ball(0, 0, 0, 7.5, 6, 7.5, '#e8a030').ball(0, 0, 0, 3.5, 2, 3.5, '#120a04');
    const out = Math.round(b.bolts || 0);
    for (let k = 0; k < 7; k++) { if (k >= 6) break; const a = k / 6 * Math.PI * 2, slid = k < out ? 1 : 0; const L = 14 + slid * 8; w.pen.at(X, Y, 16).bar(Math.cos(a) * 10, Math.sin(a) * 10, 0, Math.cos(a) * L, Math.sin(a) * L, 0, 1.2, 1.2, '#6a6e78'); }
  }
  // the telegraphs on the floor
  if (S.boss && S.boss.tele) { const tl = S.boss.tele; if (tl.kind === 'rain') for (const [x, y] of tl.cells) w.arc(MID(x), MID(y), 1, 6, 10, 0, Math.PI * 2, '#7ad8ff', .6); }
  // the bolts in flight (the seers', the boss's)
  for (const pr of S.proj) if (pr.k === 'mbolt') w.glow(MID(pr.cx), MID(pr.cy), EYE - 6, 3, '#c78bff', { light: true });
}
/** the presenter's tear-down: a floor's things are removed when the level changes (the worlds stay built) */
function viewFloorChange() { VIEW.mobs.clear(); VIEW.itemThings = {}; }
