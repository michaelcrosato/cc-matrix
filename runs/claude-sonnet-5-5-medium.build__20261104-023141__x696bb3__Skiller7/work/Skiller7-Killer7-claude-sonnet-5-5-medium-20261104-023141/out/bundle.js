(() => { 'use strict';
/* ===== src/00-core.js ===== */
// Skiller7 core: namespace, event bus, tuning (the live sliders), seeded randomness, small maths.
const S7 = globalThis.S7 = { VERSION: '1.0.0', BUILD: '2026-11-04', started: false, E: globalThis.My3D2dge };
const M = 16;   // engine units per metre: the sim works in metres, the presenter multiplies
S7.M = M;

// ---- events: audio, HUD and effects only listen; they never change sim state ----
S7.bus = {
  _h: {},
  on(type, fn) { (this._h[type] = this._h[type] || []).push(fn); return fn; },
  emit(type, data) { const l = this._h[type]; if (l) for (const f of l.slice()) { try { f(data || {}); } catch (e) { S7.fail('event ' + type, e); } } },
  clear() { this._h = {}; }
};
S7.fail = (what, e) => { try { const g = S7.game; if (g && g.fail) g.fail(what, e); else console.error(what, e); } catch (x) { console.error(what, e); } };

// ---- registries: content is data, adding to one never changes src/ ----
S7.reg = { areas: {}, personas: {}, weapons: {}, enemies: {}, items: {}, songs: {}, voices: {}, story: {}, beats: {} };
S7.def = (kind, id, o) => { o.id = id; S7.reg[kind][id] = o; return o; };

// ---- tuning: every number the balance depends on, live-editable from the dev panel ----
S7.TUNING = {};
S7.tune = (key, def, min, max, step, label, group) => { S7.TUNING[key] = { key, def, min, max, step, label, group, v: def }; };
S7.T = k => S7.TUNING[k].v;
S7.setTune = (k, v) => { const t = S7.TUNING[k]; if (!t) return; t.v = Math.min(t.max, Math.max(t.min, v)); };
S7.resetTune = () => { for (const k in S7.TUNING) S7.TUNING[k].v = S7.TUNING[k].def; };
S7.tuneValues = () => { const o = {}; for (const k in S7.TUNING) o[k] = S7.TUNING[k].v; return o; };
[
  ['walkSpeed', 3.6, 1, 8, .1, 'Rail walk speed (m/s)', 'Movement'],
  ['skiSpeed', 15, 6, 30, .5, 'Ski top speed (m/s)', 'Movement'],
  ['skiAccel', 7, 2, 20, .5, 'Ski acceleration', 'Movement'],
  ['turnTime', .25, .05, 1, .05, 'About-face time (s)', 'Movement'],
  ['aimSensMouse', 1, .2, 3, .05, 'Mouse aim speed', 'Aim'],
  ['aimSensPad', 2.2, .8, 5, .1, 'Stick aim speed (rad/s)', 'Aim'],
  ['aimFov', 62, 35, 90, 1, 'Aim field of view', 'Aim'],
  ['playerDmg', 1, .25, 4, .05, 'Your damage x', 'Combat'],
  ['critMult', 3, 1, 8, .25, 'Warm Spot multiplier', 'Combat'],
  ['warmSize', 1, .5, 2.5, .05, 'Warm Spot size x', 'Combat'],
  ['hpMax', 1, .4, 3, .05, 'Persona health x', 'Combat'],
  ['enemyDmg', 1, 0, 4, .05, 'Whiteout blast x', 'Whiteouts'],
  ['enemySpeed', 1, .3, 2.5, .05, 'Whiteout speed x', 'Whiteouts'],
  ['enemyHp', 1, .3, 4, .05, 'Whiteout health x', 'Whiteouts'],
  ['spawnRate', 1, .2, 3, .05, 'Spawn count x', 'Whiteouts'],
  ['laughLoud', 1, 0, 2, .05, 'Laughter loudness', 'Whiteouts'],
  ['scanRadius', 12, 4, 30, .5, 'Scan radius (m)', 'Scan'],
  ['scanTime', 6, 1, 20, .5, 'Reveal time (s)', 'Scan'],
  ['scanCooldown', 2.5, 0, 10, .25, 'Scan cooldown (s)', 'Scan'],
  ['redDrop', 1, 0, 4, .1, 'Red dropped x', 'Economy'],
  ['rimeDrop', 1, 0, 4, .1, 'Rime dropped x', 'Economy'],
  ['healRate', 1, .2, 4, .1, 'Healing per Red x', 'Economy'],
  ['skillCost', 1, 0, 3, .05, 'Skill cost x', 'Economy'],
  ['bossHp', 1, .3, 3, .05, 'Boss health x', 'Bosses'],
  ['bossDmg', 1, 0, 3, .05, 'Boss damage x', 'Bosses'],
  ['timeScale', 1, .2, 1.5, .05, 'Game speed', 'World']
].forEach(a => S7.tune(...a));

// ---- randomness: named seeded streams so replays and tests agree ----
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
S7.rng = (seed = 1) => { const f = mulberry(seed); f.range = (a, b) => a + (b - a) * f(); f.pick = l => l[Math.floor(f() * l.length) % l.length]; return f; };
S7.streams = {};
S7.resetStreams = (seed = 7) => { S7.streams = { spawn: S7.rng(seed + 1), spread: S7.rng(seed + 2), laugh: S7.rng(seed + 3), fx: S7.rng(seed + 4), loot: S7.rng(seed + 5) }; };
S7.resetStreams();
const R = n => S7.streams[n];

// ---- maths (metres, radians; angle 0 = +x east, PI/2 = +y south) ----
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const dist3 = (ax, ay, az, bx, by, bz) => Math.hypot(ax - bx, ay - by, az - bz);
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
const smooth = t => t * t * (3 - 2 * t);
/** ray (o, d unit) against a sphere (c, r): distance along the ray or -1 */
const raySphere = (ox, oy, oz, dx, dy, dz, cx, cy, cz, r) => {
  const px = cx - ox, py = cy - oy, pz = cz - oz, b = px * dx + py * dy + pz * dz;
  if (b < 0) return -1;
  const d2 = px * px + py * py + pz * pz - b * b;
  if (d2 > r * r) return -1;
  return b - Math.sqrt(r * r - d2);
};
Object.assign(S7, { clamp, lerp, dist2, dist3, angDiff, approach, smooth, raySphere, R });
S7.fmtTime = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2); };

/* ===== src/05-input.js ===== */
// Input: the S7 action preset (pad first, keyboard and mouse native) and the intent layer that turns devices into sim intents.
S7.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  go: ['KeyW', 'ArrowUp', 'Pad0', 'PadAxisUp'], turn: ['KeyS', 'ArrowDown', 'Pad1'],
  aim: ['Mouse2', 'Pad6', 'ShiftLeft'], fire: ['Mouse0', 'Pad7', 'KeyJ'], scan: ['Space', 'Pad4', 'KeyQ'], skill: ['KeyE', 'Pad2'], interact: ['KeyF', 'Pad3'],
  ring: ['Tab', 'KeyC', 'Pad5'], heal: ['KeyH', 'Pad11'], reload: ['KeyR', 'Pad10'], map: ['KeyM', 'Pad8'],
  slot1: ['Digit1'], slot2: ['Digit2'], slot3: ['Digit3'], slot4: ['Digit4'], slot5: ['Digit5'], slot6: ['Digit6'], slot7: ['Digit7'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'Pad1']
};
S7.CONTROLS = { up: 'Stick up', down: 'Stick down', left: 'Stick left', right: 'Stick right', go: 'Run along the rail', turn: 'Turn about / hockey stop', aim: 'Aim', fire: 'Fire', scan: 'Scan', skill: 'Skill', interact: 'Interact', ring: 'Hold: choose a coat', heal: 'Heal with Red', reload: 'Reload', map: 'Field notes',
  slot1: false, slot2: false, slot3: false, slot4: false, slot5: false, slot6: false, slot7: false, start: false };

S7.intents = function (game, opts = {}) {
  const I = game.input, st = S7.st, mode = st.mode, mv = I.move();
  const aimMode = mode === 'aim', pad = I.padAim;
  const out = {
    stick: mv, go: I.down('go'), turn: I.pressed('turn'), cycle: 0,
    aim: I.down('aim'), fire: I.down('fire'), firePressed: I.pressed('fire'), scan: I.pressed('scan'), skill: I.pressed('skill'), interact: I.pressed('interact'),
    ring: I.down('ring'), heal: I.down('heal'), reload: I.pressed('reload'), map: I.pressed('map'), confirm: I.pressed('confirm'), pick: 0,
    lookMouse: opts.mouse || [0, 0], lookStick: aimMode ? (pad || [mv[0], mv[1]]) : [0, 0], skipScene: I.pressed('start') || I.pressed('cancel'), skipTalk: false
  };
  for (let i = 1; i <= 7; i++) if (I.pressed('slot' + i)) out.pick = i;
  if (I.pressed('left') && mode === 'junction') out.cycle = -1;
  if (mode === 'ring') {
    let v = pad || (I.lastDevice === 'gamepad' ? I.padMove : null);
    if ((!v || Math.hypot(v[0], v[1]) < .4) && opts.pointer) { const W = opts.W, H = opts.H, p = opts.pointer; v = [(p[0] - W / 2) / (H * .3), (p[1] - H / 2) / (H * .3)]; }
    if (!v || Math.hypot(v[0], v[1]) < .4) v = mv;
    out.ringVec = v;
  }
  if (aimMode) out.lookStick = pad || (Math.hypot(mv[0], mv[1]) > .1 ? mv : [0, 0]);
  return out;
};
// a dev-mode or tests helper: a blank intent
S7.noIntent = () => ({ stick: [0, 0], go: false, turn: false, aim: false, fire: false, firePressed: false, scan: false, skill: false, interact: false, ring: false, heal: false, reload: false, map: false, confirm: false, pick: 0, lookMouse: [0, 0], lookStick: [0, 0] });

/* ===== src/20-sim.js ===== */
// The sim: state, rail graph, walker, camera director, area loading, triggers. Pure maths, no DOM and no three.js.
const st = S7.st = {};
const sim = S7.sim = {};

S7.newState = (opts = {}) => {
  for (const k of Object.keys(st)) delete st[k];
  const roster = {};
  for (const id of S7.ROSTER) roster[id] = { hp: 1, frozen: false, unlocked: false, ammo: null, reload: 0, cool: 0 };
  Object.assign(st, {
    area: null, mode: 'rail', edge: null, s: 0, dir: 1, speed: 0, node: null, x: 0, y: 0, z: 0, yaw: 0, face: 0, turnT: 0, jLock: false, sel: 0, options: [], blocked: null,
    persona: 'rurik', roster, switchT: 0, ringSel: null, red: 40, rime: 0, items: {}, pins: [], dossier: [], upg: {}, flags: {}, gates: {}, done: {}, collected: {}, bosses: {},
    enemies: [], projectiles: [], pickups: [], fx: [], mines: [], marks: [], nextId: 1,
    aim: { yaw: 0, pitch: 0, zoom: false }, scanCd: 0, scanT: 0, flare: 0, tuck: 0, skillCd: 0, hurtT: 0, healAcc: 0, time: 0, playTime: 0,
    cam: { x: 0, y: 0, z: 3, lx: 0, ly: 0, lz: 1, fov: 58, mode: 'fixed', seg: -1, key: '' }, camBlend: 0,
    talk: null, cards: [], toasts: [], objective: '', hint: '', cut: null, beat: null, boss: null, wave: { alive: 0 }, queueSpawn: [],
    stats: { kills: 0, crits: 0, damage: 0, shots: 0, hits: 0, freezes: 0, t: 0 }, results: {}, over: false, rescue: null,
    run: { t0: 0 }, echo: null, cheats: { god: false, infRed: false, infAmmo: false, ghost: false, fast: false }, difficulty: opts.difficulty || 'normal', lastSave: null, music: ''
  });
  for (const id of ['rurik', 'anselma', 'gustav', 'jodl']) st.roster[id].unlocked = true;
  for (const id of S7.ROSTER) { const p = S7.reg.personas[id]; st.roster[id].hp = personaMax(id); st.roster[id].ammo = S7.reg.weapons[p.weapon].mag; }
  S7.resetStreams();
};
const upgLv = id => st.upg[id] || 0;
const personaMax = id => Math.round(S7.reg.personas[id].hp * S7.T('hpMax') * (1 + .15 * upgLv('fur')));
const redMax = () => 100 + 40 * upgLv('pocket');
Object.assign(sim, { upgLv, personaMax, redMax });

// ---------------------------------------------------------------- graph
let G = null;   // the loaded area's graph (rebuilt by loadArea)
S7.graph = () => G;
function groundZ(A, x, y) { return A.height ? A.height(x, y) : (A.floorZ || 0); }
function buildGraph(A) {
  const g = { A, nodes: {}, edges: {}, eorder: [] };
  const nd = typeof A.nodes === 'function' ? A.nodes() : A.nodes;
  for (const id in nd) { const n = nd[id]; g.nodes[id] = { id, x: n.t[0], y: n.t[1], z: n.t[2] !== undefined ? n.t[2] : groundZ(A, n.t[0], n.t[1]), kind: n.kind || '', to: n.to, needs: n.needs, edges: [] }; }
  for (const e of A.edges) {
    const a = g.nodes[e.a], b = g.nodes[e.b];
    const raw = [[a.x, a.y], ...(e.via || []), [b.x, b.y]];
    const lift = e.kind === 'lift' ? 5.2 : 0;
    const pts = raw.map(p => ({ x: p[0], y: p[1], z: groundZ(A, p[0], p[1]) + lift }));
    // sample terrain edges finely so the walker follows the hill
    let fine = pts;
    if (A.height) {
      // catmull-ish smoothing through the via points, then dense sampling
      const sm = []; const n = pts.length;
      for (let i = 0; i < n - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
        const seg = Math.max(4, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 4));
        for (let k = 0; k < seg; k++) { const t = k / seg, t2 = t * t, t3 = t2 * t; const f = (a0, a1, a2, a3) => .5 * ((2 * a1) + (-a0 + a2) * t + (2 * a0 - 5 * a1 + 4 * a2 - a3) * t2 + (-a0 + 3 * a1 - 3 * a2 + a3) * t3); sm.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) }); }
      }
      sm.push({ x: pts[n - 1].x, y: pts[n - 1].y });
      fine = sm.map(p => ({ x: p.x, y: p.y, z: groundZ(A, p.x, p.y) + lift }));
    }
    const cum = [0];
    for (let i = 1; i < fine.length; i++) cum.push(cum[i - 1] + Math.hypot(fine[i].x - fine[i - 1].x, fine[i].y - fine[i - 1].y));
    const ed = { id: e.id, a: e.a, b: e.b, kind: e.kind || 'walk', pts: fine, cum, len: cum[cum.length - 1], gate: e.gate || null, gateS: 3.2, steep: !!e.steep, locked: e.locked || null, arc: !!e.arc };
    g.edges[e.id] = ed; g.eorder.push(e.id); a.edges.push(ed); b.edges.push(ed);
  }
  return g;
}
function edgePos(e, s, out) {
  s = S7.clamp(s, 0, e.len); const c = e.cum; let lo = 0, hi = c.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
  const p0 = e.pts[lo], p1 = e.pts[hi], t = c[hi] - c[lo] > 1e-6 ? (s - c[lo]) / (c[hi] - c[lo]) : 0;
  out.x = p0.x + (p1.x - p0.x) * t; out.y = p0.y + (p1.y - p0.y) * t; out.z = p0.z + (p1.z - p0.z) * t; out.ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
  return out;
}
const _p = {}; const _q = {};
sim.edgePos = edgePos;

// ---------------------------------------------------------------- level grid (line of sight)
function solidAt(x, y) {
  const A = G.A; if (!A.rows) return false;
  const cx = Math.floor(x), cy = Math.floor(y); if (cx < 0 || cy < 0 || cx >= A.w || cy >= A.h) return true;
  const ch = A.rows[cy][cx]; return ch === '#' || ch === 'P';
}
function losClear(ax, ay, az, bx, by, bz) {
  if (G.A.terrain || !G.A.rows) return true;
  const d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / .35));
  for (let i = 1; i < n; i++) { const t = i / n; const x = ax + (bx - ax) * t, y = ay + (by - ay) * t; if (solidAt(x, y) && az + (bz - az) * t < 3.2) return false; }
  return true;
}
function rayWallDist(ox, oy, oz, dx, dy, dz, maxd) {
  if (G.A.terrain) return maxd;
  for (let d = .4; d < maxd; d += .4) { const x = ox + dx * d, y = oy + dy * d, z = oz + dz * d; if (z < 0) return d; if (solidAt(x, y) && z < 3.2) return d; }
  return maxd;
}
Object.assign(sim, { solidAt, losClear, rayWallDist });

// ---------------------------------------------------------------- loading an area
sim.loadArea = function (id, nodeId, opts = {}) {
  const A = S7.reg.areas[id]; if (!A) throw new Error('unknown area ' + id);
  const from = st.area;
  G = buildGraph(A); st.area = id; st.enemies.length = 0; st.projectiles.length = 0; st.mines.length = 0; st.fx.length = 0; st.queueSpawn.length = 0; st.wave = { alive: 0 };
  st.boss = null; st.cut = null; st.talk = null; st.beat = null; st.card = null; st.mode = 'rail'; st.frozenAt = null; st.blocked = null; st.atEnd = null; st.camSeg = -1; st.scanT = 0; st.flare = 0; st.cam.key = '';
  // pickups
  st.pickups = [];
  for (const sp of A.spots) if (sp.kind === 'pickup' && !st.collected[id + ':' + sp.id]) sim.addSpotPickup(sp);
  const n = G.nodes[nodeId || Object.keys(G.nodes)[0]];
  st.node = n.id; st.x = n.x; st.y = n.y; st.z = n.z;
  // stand on an incident edge, facing away from the node when there is somewhere to go
  const inc = n.edges;
  if (inc.length >= 3) { st.mode = 'junction'; st.jLock = true; sim.setupJunction(n, null); st.edge = inc[0].id; st.s = inc[0].a === n.id ? 0 : inc[0].len; st.dir = inc[0].a === n.id ? 1 : -1; }
  else if (inc.length) { const e = inc[0]; st.edge = e.id; if (e.a === n.id) { st.s = 0; st.dir = 1; } else { st.s = e.len; st.dir = -1; } if (e.kind === 'lift') st.mode = 'lift'; else if (e.kind === 'ski') st.mode = 'ski'; }
  st.speed = 0; st.blocked = null;
  sim.placeHero();
  if (opts.edge) { const e = G.edges[opts.edge]; if (e) { st.edge = e.id; st.s = opts.s || 0; st.dir = opts.dir || 1; st.mode = e.kind === 'lift' ? 'lift' : e.kind === 'ski' ? 'ski' : 'rail'; st.node = null; sim.placeHero(); } }
  if (A.boss) st.flags['boss_' + A.boss + '_seen'] = st.flags['boss_' + A.boss + '_seen'] || false;
  st.hint = ''; sim.updateObjective();
  if (from !== id) { S7.bus.emit('area', { from, to: id }); }
  sim.directCamera(0, true);
  sim.fireTriggers('node', n.id);
  return A;
};
sim.placeHero = function () {
  const e = G.edges[st.edge]; if (!e) return;
  edgePos(e, st.s, _p); st.x = _p.x; st.y = _p.y; st.z = _p.z;
  const ang = _p.ang + (st.dir < 0 ? Math.PI : 0); st.face = ang;
};
sim.setupJunction = function (n, fromEdge) {
  const opts = [];
  for (const e of n.edges) {
    if (fromEdge && e.id === fromEdge) continue;
    const atA = e.a === n.id; const s0 = atA ? Math.min(2.2, e.len) : Math.max(0, e.len - 2.2); edgePos(e, s0, _q);
    const ang = Math.atan2(_q.y - n.y, _q.x - n.x);
    opts.push({ edge: e.id, dir: atA ? 1 : -1, s: atA ? 0 : e.len, ang, x: n.x + Math.cos(ang) * 1.9, y: n.y + Math.sin(ang) * 1.9, gate: e.gate, label: S7.edgeLabel(e) });
  }
  st.options = opts; st.sel = Math.min(st.sel, Math.max(0, opts.length - 1));
};
S7.edgeLabel = e => {
  const A = G.A, t = e.b === 'elev' || (G.nodes[e.b] && G.nodes[e.b].kind === 'exit') ? 'EXIT' : '';
  if (e.gate && A.gates && A.gates[e.gate]) return A.gates[e.gate].label;
  return t;
};

// ---------------------------------------------------------------- the walker
const isOpen = gateId => !!st.gates[st.area + ':' + gateId];
sim.gateOpen = isOpen;
function gateBlocked(e, s, ns) {
  if (!e.gate || isOpen(e.gate)) return false;
  return s <= e.gateS - .55 && ns > e.gateS - .55;   // blocked only when walking from the a-end toward b
}
function steerDot(angle) {   // the stick vector against a world angle seen from the current camera: returns [right, up]
  const cy = Math.atan2(st.cam.ly - st.cam.y, st.cam.lx - st.cam.x), dx = Math.cos(angle), dy = Math.sin(angle);
  return [dx * -Math.sin(cy) + dy * Math.cos(cy), dx * Math.cos(cy) + dy * Math.sin(cy)];
}
sim.steerDot = steerDot;
sim.walkSpeed = () => S7.T('walkSpeed') * (st.tuck > 0 ? 1.9 : 1) * (st.cheats.fast ? 1.8 : 1);

function arrive(nodeId, fromEdge) {
  const n = G.nodes[nodeId]; st.node = n.id; st.x = n.x; st.y = n.y; st.z = n.z; st.speed = 0;
  S7.bus.emit('arrive', { node: n.id });
  if (n.kind === 'exit' && n.to) {
    if (n.needs && !st.items[n.needs]) { st.hint = 'LOCKED: you need the ' + (S7.reg.items[n.needs] ? S7.reg.items[n.needs].name : n.needs); S7.bus.emit('gate', { ok: false, text: st.hint }); return; }
    const A = G.A;
    if (A.boss && !st.bosses[A.boss] && n.kind === 'exit' && !(A.boss && st.bosses[A.boss])) { /* exits in boss rooms are behind a locked edge */ }
    sim.leaveArea(n.to[0], n.to[1]); return;
  }
  sim.fireTriggers('node', n.id);
  if (st.mode === 'talk' || st.mode === 'cutscene') return;
  const inc = n.edges.filter(e => e.id !== fromEdge);
  if (n.edges.length >= 3) { st.mode = 'junction'; st.jLock = true; st.sel = 0; sim.setupJunction(n, fromEdge); sim.pickDefaultOption(); }
  else if (inc.length === 1 && n.kind !== 'exit' && !n.stop) {
    const e = inc[0]; st.edge = e.id; if (e.a === n.id) { st.s = 0; st.dir = 1; } else { st.s = e.len; st.dir = -1; }
    st.mode = e.kind === 'lift' ? 'lift' : e.kind === 'ski' ? 'ski' : 'rail';
  } else { st.mode = n.edges.length && G.edges[st.edge] && G.edges[st.edge].kind === 'ski' ? 'ski' : 'rail'; st.speed = 0; st.atEnd = n.id; }
}
sim.pickDefaultOption = function () {
  // prefer the option that continues the way we were heading, from the camera's view: the one nearest "up"
  let best = 0, bv = -9;
  st.options.forEach((o, i) => { const v = steerDot(o.ang)[1] - (o.gate && !isOpen(o.gate) ? .3 : 0); if (v > bv) { bv = v; best = i; } });
  st.sel = best;
};
sim.chooseOption = function (i) {
  const o = st.options[i]; if (!o) return false;
  const e = G.edges[o.edge]; st.edge = e.id; st.s = o.s; st.dir = o.dir; st.node = null; st.mode = e.kind === 'lift' ? 'lift' : e.kind === 'ski' ? 'ski' : 'rail';
  st.speed = e.kind === 'ski' ? 3 : 0; st.options = []; S7.bus.emit('branch', { edge: e.id });
  sim.placeHero(); return true;
};

sim.leaveArea = function (to, node) {
  S7.bus.emit('leave', { to, node });
  st.pendingArea = { to, node }; st.mode = 'transition'; st.transT = .5;
};

function stepWalker(dt, I) {
  const e = G.edges[st.edge]; if (!e) return;
  const mode = st.mode === 'aim' ? (st.preAim === 'lift' || st.preAim === 'ski' ? st.preAim : null) : st.mode;
  if (!mode) return;
  st.aimMove = st.mode === 'aim';
  if (mode === 'junction') {
    const stk = I.stick || [0, 0], mag = Math.hypot(stk[0], stk[1]);
    if (I.branch !== undefined && I.branch !== null && I.branch >= 0 && I.branch < st.options.length) { st.sel = I.branch; if (sim.chooseOption(st.sel)) return; }
    if (I.hover !== undefined && I.hover !== null && I.hover < st.options.length && I.hover !== st.sel) { st.sel = I.hover; S7.bus.emit('select', {}); }
    if (st.jLock) { if (mag < .3 && !I.go) st.jLock = false; return; }
    if (st.options.length) {
      if (mag > .45) {
        let best = st.sel, bv = -9; st.options.forEach((o, i) => { const v = steerDot(o.ang), d = v[0] * stk[0] + v[1] * (-stk[1]); if (d > bv) { bv = d; best = i; } });
        if (best !== st.sel) { st.sel = best; S7.bus.emit('select', {}); }
      }
      if (I.branch !== undefined && I.branch !== null && I.branch >= 0 && I.branch < st.options.length) { st.sel = I.branch; if (sim.chooseOption(st.sel)) return; }
      if (I.cycle) { st.sel = (st.sel + I.cycle + st.options.length) % st.options.length; S7.bus.emit('select', {}); }
      if (I.go || (mag > .6 && I.stickCommit !== false)) { sim.chooseOption(st.sel); }
    }
    if (I.turn && e) { const n = G.nodes[st.node]; /* about-face from a junction goes back where we came from */ if (st.backEdge) { const be = G.edges[st.backEdge]; const i = st.options.findIndex(o => o.edge === be.id); if (i >= 0) sim.chooseOption(i); } }
    return;
  }
  if (mode === 'ski') return stepSki(dt, I, e);
  if (mode === 'lift') return stepLift(dt, I, e);
  // ---- rail: hold go to run, tap turn to about-face
  if (st.turnT > 0) { st.turnT -= dt; st.speed = 0; return; }
  if (I.turn) { st.dir = -st.dir; st.turnT = S7.T('turnTime'); S7.bus.emit('turn', {}); st.node = st.node; sim.placeHero(); return; }
  const target = I.go ? sim.walkSpeed() : 0;
  st.speed = S7.approach(st.speed, target, (I.go ? 18 : 30) * dt);
  if (st.speed < .01) return;
  const ns = st.s + st.dir * st.speed * dt;
  if (gateBlocked(e, st.s, ns)) { st.s = e.gateS - .55; st.speed = 0; if (st.blocked !== e.gate) { st.blocked = e.gate; sim.onGateBlocked(e); } sim.placeHero(); return; }
  st.blocked = null; st.node = null; st.atEnd = null;
  if (e.locked && !st.bosses[G.A.boss] && ((st.dir > 0 && ns >= e.len - .3) )) { st.s = e.len - .3; st.speed = 0; st.hint = 'THE WAY OUT OPENS WHEN THE BOSS IS DOWN'; return; }
  if (ns >= e.len) { st.s = e.len; arriveFrom(e, e.b, e.id); }
  else if (ns <= 0) { st.s = 0; arriveFrom(e, e.a, e.id); }
  else { st.s = ns; sim.placeHero(); }
}
sim.stepWalker = stepWalker;
function arriveFrom(e, nodeId, edgeId) { st.backEdge = edgeId; st.prevDir = st.dir; sim.placeHero(); arrive(nodeId, edgeId); if (st.mode === 'rail' && st.node) { /* standing at a node */ } }

// ---- skiing: automatic downhill with momentum, hockey stop, tuck
function stepSki(dt, I, e) {
  const A = G.A, steep = e.steep ? 1.25 : 1;
  const top = S7.T('skiSpeed') * steep * (I.go ? 1.12 : 1) * (st.tuck > 0 ? 1.18 : 1);
  if (I.turn) { st.braking = true; } else if (I.go || (I.stick && Math.hypot(I.stick[0], I.stick[1]) > .5)) st.braking = false;
  if (st.aimMove) { st.speed = S7.approach(st.speed, Math.min(top * .4, 6), 10 * dt); }
  else if (st.braking) st.speed = S7.approach(st.speed, 0, 30 * dt);
  else st.speed = S7.approach(st.speed, top, S7.T('skiAccel') * dt * (I.go ? 1.3 : 1));
  const ns = st.s + st.dir * st.speed * dt;
  if (ns >= e.len) { st.s = e.len; arriveFrom(e, e.b, e.id); if (st.mode === 'ski' || st.mode === 'rail') {} }
  else if (ns <= 0) { st.s = 0; arriveFrom(e, e.a, e.id); }
  else { st.s = ns; sim.placeHero(); }
  if (st.echo) sim.echoTick(dt);
}
function stepLift(dt, I, e) {
  st.speed = S7.approach(st.speed, 5.5, 8 * dt);
  const ns = st.s + st.dir * st.speed * dt;
  if (ns >= e.len) { st.s = e.len; arriveFrom(e, e.b, e.id); }
  else if (ns <= 0) { st.s = 0; arriveFrom(e, e.a, e.id); }
  else { st.s = ns; sim.placeHero(); }
}

// ---------------------------------------------------------------- the camera director
// Killer7 cuts hard between fixed shots: each stretch of rail has a shot from the side, high, looking at the hero.
const _c = {};
sim.directCamera = function (dt, snap) {
  const A = G.A, c = st.cam;
  if (st.mode === 'aim') {
    const eye = 1.55, a = st.aim, cp = Math.cos(a.pitch);
    c.mode = 'first'; c.x = st.x; c.y = st.y; c.z = st.z + eye; c.lx = c.x + Math.cos(a.yaw) * cp; c.ly = c.y + Math.sin(a.yaw) * cp; c.lz = c.z + Math.sin(a.pitch);
    c.fov = a.zoom ? 26 : S7.T('aimFov'); return;
  }
  c.mode = 'fixed'; c.fov = A.cam ? A.cam.fov : 58;
  if (st.cut && st.cut.cam) { const k = st.cut.cam; c.x = k.at[0]; c.y = k.at[1]; c.z = k.at[2]; c.lx = k.look[0]; c.ly = k.look[1]; c.lz = k.look[2]; c.fov = k.fov || 55; return; }
  if (A.cam) {
    c.x = A.cam.at[0]; c.y = A.cam.at[1]; c.z = A.cam.at[2];
    if (A.boss) { const b = st.boss; c.lx = (A.cam.look[0] + st.x) / 2; c.ly = (A.cam.look[1] + st.y) / 2 + 1; c.lz = A.cam.look[2]; c.fov = A.cam.fov; }
    else { c.lx = (A.cam.look[0] * .6 + st.x * .4); c.ly = (A.cam.look[1] * .6 + st.y * .4); c.lz = A.cam.look[2]; }
    return;
  }
  const e = G.edges[st.edge]; if (!e) return;
  if (st.mode === 'ski' || st.mode === 'lift') {
    const ahead = Math.min(e.len, st.s + st.dir * 8); edgePos(e, ahead, _c);
    const ang = st.face, back = st.mode === 'lift' ? 0 : 7.5, side = st.mode === 'lift' ? 9 : 1.6, up = st.mode === 'lift' ? 1.0 : 3.1;
    const tx = st.x - Math.cos(ang) * back + Math.cos(ang + Math.PI / 2) * side, ty = st.y - Math.sin(ang) * back + Math.sin(ang + Math.PI / 2) * side;
    const k = snap ? 1 : 1 - Math.pow(.0005, dt);
    const tz = st.mode === 'lift' ? st.z + 2.6 : (A.height ? A.height(tx, ty) : st.z) + up + 1.2;
    c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.z += (tz - c.z) * k;
    if (snap) { c.x = tx; c.y = ty; c.z = tz; }
    c.lx = _c.x * .5 + st.x * .5; c.ly = _c.y * .5 + st.y * .5; c.lz = st.z + 1.2; c.fov = st.mode === 'lift' ? 62 : 66; c.seg = -1; return;
  }
  // rail: a fixed shot per stretch of edge
  const seg = 10, k = Math.floor(st.s / seg), key = st.edge + ':' + k;
  if (c.key !== key || snap) {
    c.key = key; const mid = Math.min(e.len, (k + .5) * seg); edgePos(e, mid, _c);
    let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    const side = (h & 1) ? 1 : -1, ang = _c.ang + side * Math.PI / 2, dist = 6.0 + (Math.abs(h) % 3);
    let cx = _c.x + Math.cos(ang) * dist, cy = _c.y + Math.sin(ang) * dist;
    cx = S7.clamp(cx, 1.6, A.w - 1.6); cy = S7.clamp(cy, 1.6, A.h - 1.6);
    c.x = cx; c.y = cy; c.z = (A.height ? A.height(cx, cy) : (A.floorZ || 0)) + 3.6 + (Math.abs(h >> 3) % 3) * .5;
    c.fov = 56 + (Math.abs(h >> 5) % 3) * 4; S7.bus.emit('cut', {});
  }
  c.lx = st.x; c.ly = st.y; c.lz = st.z + 1.1;
};

/* ===== src/21-combat.js ===== */
// Combat: aim mode, weapons, Whiteouts, projectiles, scan, skills, drops, damage, freezing.
const sim2 = S7.sim, st2 = S7.st;
const WPN = id => S7.reg.weapons[id];
sim2.weapon = () => WPN(S7.reg.personas[st2.persona].weapon);
const rost = () => st2.roster[st2.persona];
const toast = (text, kind) => { st2.toasts.push({ text, kind: kind || '', t: 2.6 }); if (st2.toasts.length > 4) st2.toasts.shift(); S7.bus.emit('toast', { text }); };
sim2.toast = toast;

// ---------------------------------------------------------------- enemies
let EID = 1;
sim2.spawnEnemy = function (type, x, y, opts = {}) {
  const def = S7.reg.enemies[type]; const A = S7.graph().A;
  const hp = def.hp * S7.T('enemyHp') * (st2.difficulty === 'easy' ? .8 : st2.difficulty === 'hard' ? 1.3 : 1);
  const z = A.height ? A.height(x, y) : (A.floorZ || 0);
  const e = { id: EID++, type, def, x, y, z, hp, hpMax: hp, vx: 0, vy: 0, face: 0, visible: 0, stun: 0, hit: 0, t: S7.R('spawn')() * 6, laughT: S7.R('laugh').range(.3, 1.4), dead: false, deadT: 0, dodgeT: 0, dodgeDir: 1, throwT: 2, shield: false, warm2: !!def.warm2, spawnT: .6, from: opts.from || 'wave', still: !!opts.still, anim: 'run' };
  st2.enemies.push(e); S7.bus.emit('spawn', { enemy: e }); return e;
};
sim2.startWave = function (id) {
  const A = S7.graph().A, w = A.waves[id]; if (!w) return;
  const k = S7.T('spawnRate');
  for (const [type, key, delay] of w.spawn) {
    const pos = A.spawns[key]; const reps = k >= 1.5 ? 2 : k < .5 ? (S7.R('spawn')() < k * 2 ? 1 : 0) : 1;
    for (let r = 0; r < reps; r++) st2.queueSpawn.push({ t: delay + r * .9, type, x: pos[0] + r * 1.2, y: pos[1] + (r ? 1 : 0) });
  }
  S7.bus.emit('wave', { id });
};
sim2.alive = () => st2.enemies.filter(e => !e.dead).length;
function worldTo(e, tx, ty, speed, dt) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
  e.vx = dx / d * speed; e.vy = dy / d * speed; e.x += e.vx * dt; e.y += e.vy * dt; e.face = Math.atan2(dy, dx);
}
function clampToArea(e) {
  const A = S7.graph().A; e.x = S7.clamp(e.x, 1, A.w - 1); e.y = S7.clamp(e.y, 1, A.h - 1);
  e.z = A.height ? A.height(e.x, e.y) : (A.floorZ || 0);
}
function updateEnemy(e, dt) {
  e.t += dt; e.hit = Math.max(0, e.hit - dt); e.visible = Math.max(0, e.visible - dt);
  if (e.dead) { e.deadT -= dt; return; }
  if (e.dummy) { e.visible = 1; return; }
  if (e.spawnT > 0) { e.spawnT -= dt; return; }
  e.stun = Math.max(0, e.stun - dt);
  const def = e.def, hx = st2.x, hy = st2.y, hz = st2.z, dx = hx - e.x, dy = hy - e.y, dist = Math.hypot(dx, dy);
  const hasFlare = st2.flare > 0 && dist < 18; if (hasFlare) e.visible = Math.max(e.visible, .4);
  e.laughT -= dt;
  if (e.laughT <= 0) { e.laughT = S7.R('laugh').range(.8, 1.9) / Math.max(.2, 1); S7.bus.emit('laugh', { enemy: e, style: def.laugh, x: e.x, y: e.y, z: e.z + 1.3, loud: Math.max(0, 1 - dist / 28), dist }); }
  if (def.shield) { const cyc = (e.t + e.id * 1.3) % def.shield.period; e.shieldUp = cyc > def.shield.open; }
  if (e.stun > 0) { e.vx = e.vy = 0; e.anim = 'stun'; return; }
  if (e.still && dist > 14 && !e.alerted) { e.anim = 'idle'; return; }
  e.alerted = true;
  const slow = st2.mode === 'ring' ? 1 : 1;
  let sp = def.speed * S7.T('enemySpeed') * slow;
  if (e.hit > 0) sp *= .25;
  if (def.id === 'giggler' || def.id === 'thrower') { const shake = Math.sin(e.t * 2.1 + e.id) > .86; if (shake) { sp *= .08; e.anim = 'laugh'; } else e.anim = 'run'; }
  if (def.ranged) {
    if (dist > def.ranged.range) worldTo(e, hx, hy, sp, dt); else { e.vx = e.vy = 0; e.face = Math.atan2(dy, dx); e.anim = 'throw'; e.throwT -= dt;
      if (e.throwT <= 0) { e.throwT = def.ranged.every * (.8 + S7.R('spread')() * .4); sim2.fireProjectile(e.x, e.y, e.z + 1.5, hx, hy, hz + 1.2, def.ranged.speed, def.dmg, 'snow', e); } }
  } else if (def.dodge) {
    e.dodgeT -= dt; if (e.dodgeT <= 0) { e.dodgeT = .5 + S7.R('spread')() * .8; e.dodgeDir = S7.R('spread')() < .5 ? -1 : 1; }
    const a = Math.atan2(dy, dx) + e.dodgeDir * Math.min(.9, dist * .07);
    const tx = e.x + Math.cos(a) * 5, ty = e.y + Math.sin(a) * 5; worldTo(e, tx, ty, sp, dt); e.face = Math.atan2(dy, dx);
  } else worldTo(e, hx, hy, sp, dt);
  if (S7.graph().A.rows) { // keep Whiteouts out of walls: slide back on solid tiles
    if (sim2.solidAt(e.x, e.y)) { e.x -= e.vx * dt; e.y -= e.vy * dt; if (!sim2.solidAt(e.x + e.vx * dt, e.y)) e.x += e.vx * dt; else if (!sim2.solidAt(e.x, e.y + e.vy * dt)) e.y += e.vy * dt; }
  }
  clampToArea(e);
  const dz = Math.abs(hz - e.z - (st2.mode === 'lift' ? 5 : 0));
  if (Math.hypot(e.x - hx, e.y - hy) < (st2.mode === 'lift' ? 2.2 : 1.35) && dz < 6.5) sim2.enemyBlast(e);
}
sim2.enemyBlast = function (e) {
  e.dead = true; e.deadT = .3; e.boom = true;
  S7.bus.emit('explode', { x: e.x, y: e.y, z: e.z + 1, radius: 2, dmg: e.def.dmg, source: 'whiteout' });
  sim2.hurtHero(e.def.dmg * S7.T('enemyDmg') * (st2.difficulty === 'easy' ? .7 : st2.difficulty === 'hard' ? 1.35 : 1), 'blast', e.x, e.y);
};
sim2.killEnemy = function (e, crit, byMine) {
  if (e.dead) return; e.dead = true; e.deadT = 1.4; e.crit = !!crit;
  st2.stats.kills++; if (crit) st2.stats.crits++;
  if (e.from === 'echo' && st2.echo && !st2.echo.finished) { st2.echo.hits++; S7.sim.toast('TARGET THAWED: -2 SECONDS'); }
  S7.bus.emit('kill', { enemy: e, type: e.type, crit: !!crit, x: e.x, y: e.y, z: e.z });
  const d = e.def.drop; if (!st2.cheats.noDrops) {
    const red = Math.round(d[0] * S7.T('redDrop') * (crit ? 1.5 : 1)); if (red > 0) sim2.dropPickup('red', red, e.x, e.y, e.z + .6);
    const rime = (crit ? d[1] : (S7.R('loot')() < .25 ? 1 : 0)) * S7.T('rimeDrop'); if (Math.round(rime) > 0) sim2.dropPickup('rime', Math.round(rime), e.x + .4, e.y, e.z + .6);
  }
  if (!st2.dossier.includes('d_whiteout')) sim2.unlockDossier('d_whiteout');
};
sim2.dropPickup = function (kind, n, x, y, z) { st2.pickups.push({ id: st2.nextId++, drop: true, kind, n, x, y, z, magnet: .4 }); };

// ---------------------------------------------------------------- projectiles (snowballs, luggage, volleys)
sim2.fireProjectile = function (x, y, z, tx, ty, tz, speed, dmg, kind, src) {
  const dx = tx - x, dy = ty - y, dz = tz - z, d = Math.hypot(dx, dy, dz) || 1;
  const p = { id: st2.nextId++, x, y, z, vx: dx / d * speed, vy: dy / d * speed, vz: dz / d * speed, dmg, kind, r: kind === 'suit' ? .7 : .38, life: 6, src };
  st2.projectiles.push(p); S7.bus.emit('throw', { p }); return p;
};
function updateProjectiles(dt) {
  for (const p of st2.projectiles) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.dead) continue;
    if (Math.hypot(p.x - st2.x, p.y - st2.y) < 1.0 && Math.abs(p.z - st2.z - 1) < 1.6) { p.dead = true; sim2.hurtHero(p.dmg * S7.T('enemyDmg') * (p.kind === 'suit' ? S7.T('bossDmg') : 1), 'projectile', p.x, p.y); S7.bus.emit('splat', { p }); }
    else if (p.life <= 0 || p.z < (S7.graph().A.height ? S7.graph().A.height(p.x, p.y) - .2 : -.2)) { p.dead = true; S7.bus.emit('splat', { p, miss: true }); }
  }
  st2.projectiles = st2.projectiles.filter(p => !p.dead);
}

// ---------------------------------------------------------------- hurting, freezing
sim2.hurtHero = function (dmg, src, fx, fy) {
  if (st2.cheats.god || st2.switchT > 0 || st2.mode === 'transition' || st2.mode === 'frozen' || st2.mode === 'cutscene' || st2.over) return;
  const r = rost(); r.hp -= dmg; st2.hurtT = .45; st2.stats.damage += dmg; S7.bus.emit('hurt', { persona: st2.persona, dmg, src, x: fx, y: fy });
  if (r.hp <= 0) sim2.freezePersona();
};
sim2.freezePersona = function () {
  const r = rost(); r.hp = 0; r.frozen = true; st2.stats.freezes++;
  st2.frozenAt = { persona: st2.persona, x: st2.x, y: st2.y, z: st2.z };
  S7.bus.emit('freeze', { persona: st2.persona, x: st2.x, y: st2.y, z: st2.z });
  if (st2.mode === 'aim') { st2.mode = st2.preAim || 'rail'; }
  st2.prevMode = st2.mode; st2.mode = 'frozen'; st2.frozenT = 1.7; st2.aimMove = false;
};
sim2.afterFreeze = function () {
  const next = S7.ROSTER.find(id => st2.roster[id].unlocked && !st2.roster[id].frozen && st2.roster[id].hp > 0);
  if (next) { st2.persona = next; st2.mode = st2.prevMode === 'frozen' || !st2.prevMode ? 'rail' : st2.prevMode; if (st2.mode === 'aim') st2.mode = 'rail'; st2.switchT = .9; S7.bus.emit('switch', { to: next, auto: true });
    toast(S7.reg.personas[next].name.toUpperCase() + ' STEPS OUT OF THE WARDROBE'); }
  else { st2.mode = 'gameover'; st2.over = true; S7.bus.emit('gameover', {}); }
};
sim2.reviveFrozen = function (silent) {
  let n = 0;
  for (const id of S7.ROSTER) { const r = st2.roster[id]; if (r.frozen) { r.frozen = false; r.hp = Math.max(r.hp, Math.round(sim2.personaMax(id) * .5)); n++; } }
  if (n && !silent) { S7.bus.emit('rescue', { n }); toast('THE SWEEP CHIPPED ' + n + (n > 1 ? ' COATS' : ' COAT') + ' OUT OF THE ICE'); sim2.unlockDossier('d_sweep'); }
  return n;
};

// ---------------------------------------------------------------- scan and skills
sim2.scanRadius = () => S7.T('scanRadius') * (1 + .2 * sim2.upgLv('lens'));
sim2.doScan = function () {
  if (st2.scanCd > 0) return false;
  st2.scanCd = S7.T('scanCooldown'); const R = sim2.scanRadius(), time = S7.T('scanTime') * (1 + .2 * sim2.upgLv('lens'));
  let n = 0; for (const e of st2.enemies) if (!e.dead && Math.hypot(e.x - st2.x, e.y - st2.y) < R) { e.visible = Math.max(e.visible, time); n++; S7.bus.emit('reveal', { enemy: e, by: 'scan' }); }
  if (st2.boss) st2.boss.revealT = time;
  S7.bus.emit('scan', { x: st2.x, y: st2.y, z: st2.z + 1, r: R, n });
  if (!st2.dossier.includes('d_scan')) sim2.unlockDossier('d_scan');
  return true;
};
const skillCost = id => { const p = S7.reg.personas[id]; return Math.round(p.skillCost * S7.T('skillCost')); };
sim2.skillCost = skillCost;
function spendRed(n) { if (st2.cheats.infRed) return true; if (st2.red < n) return false; st2.red -= n; return true; }
sim2.spendRed = spendRed;
sim2.gateOf = () => { const A = S7.graph().A; return st2.blocked && A.gates ? A.gates[st2.blocked] : null; };
sim2.openGate = function (gid, how) {
  st2.gates[st2.area + ':' + gid] = true; st2.blocked = null; S7.bus.emit('gate', { ok: true, gate: gid, how }); toast('OPENED: ' + (S7.graph().A.gates[gid].label)); st2.hint = '';
  sim2.updateObjective();
};
sim2.onGateBlocked = function (e) {
  const g = S7.graph().A.gates[e.gate]; if (!g) return;
  if (g.kind === 'key' && st2.items[g.item]) { sim2.openGate(e.gate, 'key'); return; }
  const who = g.who && S7.reg.personas[g.who];
  st2.hint = g.text + (who ? '  [' + who.name.toUpperCase() + ': ' + who.skillName.toUpperCase() + ']' : '');
  S7.bus.emit('gate', { ok: false, gate: e.gate, text: st2.hint });
};
sim2.useSkill = function () {
  if (st2.skillCd > 0) return false;
  const id = st2.persona, p = S7.reg.personas[id], gate = sim2.gateOf();
  if (p.skill === 'charge' && st2.charge) return false;   // the fuse is already burning
  st2.skillCd = 1.2;
  if (p.skill === 'longlook') { if (st2.mode === 'aim') { st2.aim.zoom = !st2.aim.zoom; S7.bus.emit('skill', { persona: id, skill: 'longlook' }); return true; } toast('LONG LOOK: AIM FIRST'); return false; }
  if (p.skill === 'rain') {
    if (gate && gate.kind === 'buyout') { if (!spendRed(gate.price)) { toast('NOT ENOUGH RED (' + gate.price + ')'); S7.bus.emit('deny', {}); return false; } sim2.openGate(st2.blocked, 'rain'); S7.bus.emit('skill', { persona: id, skill: 'rain', big: true }); return true; }
    if (!spendRed(6)) { toast('NOT ENOUGH RED'); S7.bus.emit('deny', {}); return false; }
    for (const e of st2.enemies) if (!e.dead && Math.hypot(e.x - st2.x, e.y - st2.y) < 10) { e.stun = Math.max(e.stun, 3); e.visible = Math.max(e.visible, 2); }
    S7.bus.emit('skill', { persona: id, skill: 'rain' }); return true;
  }
  const cost = skillCost(id);
  if (!spendRed(cost)) { toast('NEEDS ' + cost + ' RED'); S7.bus.emit('deny', {}); return false; }
  if (p.skill === 'flare') { st2.flare = 10; S7.bus.emit('skill', { persona: id, skill: 'flare' }); }
  else if (p.skill === 'tuck') { st2.tuck = 8; S7.bus.emit('skill', { persona: id, skill: 'tuck' }); }
  else if (p.skill === 'echo') {
    if (gate && gate.kind === 'echowall') sim2.openGate(st2.blocked, 'echo');
    for (const e of st2.enemies) if (!e.dead && Math.hypot(e.x - st2.x, e.y - st2.y) < 11) { e.stun = Math.max(e.stun, 3); e.visible = Math.max(e.visible, 3); sim2.damageEnemy(e, 1.5, false, true); }
    if (st2.boss && Math.hypot(st2.boss.x - st2.x, st2.boss.y - st2.y) < 16) st2.boss.stagger = 1.2;
    S7.bus.emit('skill', { persona: id, skill: 'echo', big: true });
  } else if (p.skill === 'flash') {
    const f = st2.mode === 'aim' ? st2.aim.yaw : st2.face;
    for (const e of st2.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - st2.x, e.y - st2.y); if (d < 18 && Math.abs(S7.angDiff(f, Math.atan2(e.y - st2.y, e.x - st2.x))) < 1.25) { e.stun = Math.max(e.stun, 3.5); e.visible = Math.max(e.visible, 5); } }
    if (st2.boss) st2.boss.revealT = 5;
    S7.bus.emit('skill', { persona: id, skill: 'flash', big: true });
  } else if (p.skill === 'charge') {
    if (gate && gate.kind === 'charge') { st2.charge = { t: 2.6, gate: st2.blocked, x: st2.x, y: st2.y }; S7.bus.emit('skill', { persona: id, skill: 'charge', gate: true }); }
    else { st2.mines.push({ x: st2.x, y: st2.y, z: st2.z, t: 0 }); S7.bus.emit('skill', { persona: id, skill: 'charge' }); toast('CHARGE SET'); }
  }
  return true;
};
function updateMines(dt) {
  if (st2.charge) { st2.charge.t -= dt; if (st2.charge.t <= 0) { const c = st2.charge; st2.charge = null; S7.bus.emit('explode', { x: c.x, y: c.y, z: st2.z + 1, radius: 5, dmg: 0, source: 'charge', big: true }); sim2.openGate(c.gate, 'charge'); } }
  for (const m of st2.mines) {
    m.t += dt; if (m.t < .6) continue;
    const hit = st2.enemies.filter(e => !e.dead && Math.hypot(e.x - m.x, e.y - m.y) < 2.2);
    if (hit.length || (st2.boss && Math.hypot(st2.boss.x - m.x, st2.boss.y - m.y) < 3.2)) { m.done = true; S7.bus.emit('explode', { x: m.x, y: m.y, z: m.z + .5, radius: 3.4, dmg: 9, source: 'mine' }); for (const e of st2.enemies) if (!e.dead && Math.hypot(e.x - m.x, e.y - m.y) < 3.6) sim2.damageEnemy(e, 9 * S7.T('playerDmg'), false, true); }
  }
  st2.mines = st2.mines.filter(m => !m.done);
}

// ---------------------------------------------------------------- shooting
function rayTest(ox, oy, oz, dx, dy, dz, range) {
  let best = null; const wall = sim2.rayWallDist(ox, oy, oz, dx, dy, dz, range), max = Math.min(range, wall);
  const consider = (d, o) => { if (d >= 0 && d <= max && (!best || d < best.dist)) best = Object.assign({ dist: d }, o); };
  const scale = S7.T('warmSize');
  for (const e of st2.enemies) {
    if (e.dead || e.spawnT > 0) continue;
    const dd = Math.hypot(e.x - ox, e.y - oy);
    const spots = [e.def.warm].concat(e.def.warm2 ? [e.def.warm2] : []);
    const exposed = e.visible > 0 && !(e.def.shield && e.shieldUp);
    if (exposed) spots.forEach((w, i) => {
      const bx = e.x + Math.cos(e.face + w[0] * 0) * (i === 1 ? -e.def.r * .6 : e.def.r * .6), by = e.y + Math.sin(e.face) * (i === 1 ? -e.def.r * .6 : e.def.r * .6);
      const r = Math.max(w[2] * scale, dd * .012 * scale);
      consider(S7.raySphere(ox, oy, oz, dx, dy, dz, bx, by, e.z + w[1], r), { kind: 'warm', enemy: e, spot: i });
    });
    for (const hz of [.3, .62, .9]) consider(S7.raySphere(ox, oy, oz, dx, dy, dz, e.x, e.y, e.z + e.def.h * hz, e.def.r * (hz > .8 ? .8 : 1)), { kind: e.def.shield && e.shieldUp ? 'shield' : 'body', enemy: e });
  }
  for (const p of st2.projectiles) if (!p.dead) consider(S7.raySphere(ox, oy, oz, dx, dy, dz, p.x, p.y, p.z, p.r + .25), { kind: 'proj', proj: p });
  if (st2.boss) { const b = st2.boss; consider(S7.raySphere(ox, oy, oz, dx, dy, dz, b.x, b.y, b.z + b.cy, b.r), { kind: 'boss' });
    if (b.warmOpen()) { const w = b.warmPos(); consider(S7.raySphere(ox, oy, oz, dx, dy, dz, w[0], w[1], w[2], Math.max(b.warmR * scale, Math.hypot(b.x - ox, b.y - oy) * .015)), { kind: 'bosswarm' }); } }
  return best;
}
sim2.damageEnemy = function (e, dmg, crit, quiet) {
  if (e.dead) return;
  e.hit = .25; e.stun = Math.max(e.stun, crit ? 0 : .12);
  if (crit) {
    if (e.def.warm2) { e.hp -= e.hpMax * .5; } else e.hp = 0;
    if (!quiet) S7.bus.emit('crit', { enemy: e });
  } else e.hp -= dmg;
  S7.bus.emit('hit', { target: e, part: crit ? 'warm' : 'body', dmg, x: e.x, y: e.y, z: e.z + e.def.h * .6 });
  if (e.hp <= 0) sim2.killEnemy(e, crit);
};
sim2.shoot = function () {
  const r = rost(), w = sim2.weapon(), p = S7.reg.personas[st2.persona];
  if (r.reload > 0 || r.cool > 0) return false;
  if (r.ammo <= 0 && !st2.cheats.infAmmo) { sim2.startReload(); return false; }
  if (!st2.cheats.infAmmo) r.ammo--; r.cool = 1 / w.rate; st2.stats.shots++;
  const a = st2.aim, eye = [st2.x, st2.y, st2.z + 1.55];
  let hitAny = false, anyCrit = false;
  for (let i = 0; i < w.pellets; i++) {
    const sp = w.spread * (st2.aim.zoom ? .3 : 1), yaw = a.yaw + (S7.R('spread')() - .5) * 2 * sp, pit = a.pitch + (S7.R('spread')() - .5) * 2 * sp, cp = Math.cos(pit);
    const dx = Math.cos(yaw) * cp, dy = Math.sin(yaw) * cp, dz = Math.sin(pit);
    const h = rayTest(eye[0], eye[1], eye[2], dx, dy, dz, w.range);
    const dmg = w.dmg * S7.T('playerDmg') * (1 + .15 * sim2.upgLv('edge'));
    const endD = h ? h.dist : Math.min(w.range, sim2.rayWallDist(eye[0], eye[1], eye[2], dx, dy, dz, w.range));
    S7.bus.emit('shot', { persona: st2.persona, weapon: w.id, from: eye, dir: [dx, dy, dz], end: [eye[0] + dx * endD, eye[1] + dy * endD, eye[2] + dz * endD], hit: h ? h.kind : null });
    if (!h) continue;
    hitAny = true; st2.stats.hits++;
    if (h.kind === 'warm') { anyCrit = true; sim2.damageEnemy(h.enemy, dmg, true); }
    else if (h.kind === 'body') { sim2.damageEnemy(h.enemy, dmg, false); if (w.stun) h.enemy.stun = Math.max(h.enemy.stun, w.stun); if (w.reveal) h.enemy.visible = Math.max(h.enemy.visible, w.reveal); }
    else if (h.kind === 'shield') { S7.bus.emit('hit', { target: h.enemy, part: 'shield', dmg: 0, x: h.enemy.x, y: h.enemy.y, z: h.enemy.z + 1 }); }
    else if (h.kind === 'proj') { h.proj.dead = true; S7.bus.emit('splat', { p: h.proj, shot: true }); }
    else if (h.kind === 'boss') { sim2.hitBoss(dmg, false, w); }
    else if (h.kind === 'bosswarm') { anyCrit = true; sim2.hitBoss(dmg, true, w); }
    if (w.kind === 'blast') { const ex = eye[0] + dx * h.dist, ey = eye[1] + dy * h.dist; S7.bus.emit('explode', { x: ex, y: ey, z: eye[2] + dz * h.dist, radius: w.blast, dmg: w.dmg, source: 'launcher' });
      for (const e of st2.enemies) if (!e.dead && Math.hypot(e.x - ex, e.y - ey) < w.blast && h.enemy !== e) sim2.damageEnemy(e, dmg * .6, false, true); }
  }
  if (w.kind === 'blast' && !hitAny) { /* a miss still booms where it lands */ }
  if (r.ammo <= 0 && !st2.cheats.infAmmo) sim2.startReload();
  return true;
};
sim2.startReload = function () { const r = rost(), w = sim2.weapon(); if (r.reload > 0 || r.ammo >= w.mag) return; r.reload = w.reload * (1 - .2 * sim2.upgLv('quick')); S7.bus.emit('reload', { persona: st2.persona }); };

// ---------------------------------------------------------------- the per-step combat update
sim2.stepCombat = function (dt, I) {
  const r = rost(), w = sim2.weapon();
  st2.scanCd = Math.max(0, st2.scanCd - dt); st2.skillCd = Math.max(0, st2.skillCd - dt); st2.hurtT = Math.max(0, st2.hurtT - dt);
  st2.flare = Math.max(0, st2.flare - dt); st2.tuck = Math.max(0, st2.tuck - dt); st2.switchT = Math.max(0, st2.switchT - dt);
  for (const id of S7.ROSTER) { const q = st2.roster[id]; q.cool = Math.max(0, q.cool - dt); if (q.reload > 0) { q.reload -= dt; if (q.reload <= 0) { q.reload = 0; q.ammo = WPN(S7.reg.personas[id].weapon).mag; if (id === st2.persona) S7.bus.emit('reloaded', {}); } } }
  // aim in and out
  const canAim = ['rail', 'junction', 'ski', 'lift'].includes(st2.mode) && st2.switchT <= 0 && st2.turnT <= 0 && !(S7.graph().A.safe);
  if (I.aim && canAim && st2.mode !== 'aim') { st2.preAim = st2.mode; st2.mode = 'aim'; st2.aim.yaw = st2.face; st2.aim.pitch = 0; st2.aim.zoom = false; st2.speed = st2.mode === 'aim' && (st2.preAim === 'rail' || st2.preAim === 'junction') ? 0 : st2.speed; S7.bus.emit('aimon', {}); }
  else if (!I.aim && st2.mode === 'aim') { st2.mode = st2.preAim || 'rail'; st2.aim.zoom = false; st2.aimMove = false; S7.bus.emit('aimoff', {}); }
  if (st2.mode === 'aim') {
    const a = st2.aim, zk = a.zoom ? .35 : 1, ms = .0022 * S7.T('aimSensMouse') * zk, ss = S7.T('aimSensPad') * dt * zk;
    a.yaw += (I.lookMouse ? I.lookMouse[0] : 0) * ms + (I.lookStick ? I.lookStick[0] : 0) * ss;
    a.pitch = S7.clamp(a.pitch - (I.lookMouse ? I.lookMouse[1] : 0) * ms - (I.lookStick ? I.lookStick[1] : 0) * ss, -1.1, 1.1);
    if (w.rate >= 6 ? I.fire : I.firePressed) sim2.shoot();
    if (I.reload) sim2.startReload();
  }
  if (I.scan && ['rail', 'junction', 'aim', 'ski', 'lift'].includes(st2.mode)) sim2.doScan();
  if (I.skill && ['rail', 'junction', 'aim', 'ski', 'lift'].includes(st2.mode)) sim2.useSkill();
  // healing: hold heal to turn Red into health
  if (I.heal && ['rail', 'junction', 'ski', 'lift', 'aim'].includes(st2.mode) && st2.red > 0) {
    const max = sim2.personaMax(st2.persona);
    if (r.hp < max) { const rate = 18 * dt; const spend = Math.min(rate, st2.red); if (!st2.cheats.infRed) st2.red -= spend; r.hp = Math.min(max, r.hp + spend * 1.6 * S7.T('healRate') * (1 + .25 * sim2.upgLv('cold'))); if (!st2.healing) S7.bus.emit('healon', {}); st2.healing = true; } else st2.healing = false;
  } else st2.healing = false;
  for (const e of st2.enemies) updateEnemy(e, dt);
  st2.enemies = st2.enemies.filter(e => !(e.dead && e.deadT <= 0));
  updateProjectiles(dt); updateMines(dt);
  // queued spawns
  for (const q of st2.queueSpawn) { q.t -= dt; if (q.t <= 0) { q.done = true; sim2.spawnEnemy(q.type, q.x, q.y); } }
  st2.queueSpawn = st2.queueSpawn.filter(q => !q.done);
  // pickups
  for (const p of st2.pickups) {
    if (p.drop) { p.magnet -= dt; if (p.magnet <= 0) { const dx = st2.x - p.x, dy = st2.y - p.y, d = Math.hypot(dx, dy) || 1, k = Math.min(d, 9 * dt); p.x += dx / d * k; p.y += dy / d * k; p.z += ((st2.z + 1) - p.z) * Math.min(1, 6 * dt); } }
    if (Math.hypot(p.x - st2.x, p.y - st2.y) < 1.1) sim2.collect(p);
  }
  st2.pickups = st2.pickups.filter(p => !p.got);
  if (st2.mode === 'frozen') { st2.frozenT -= dt; if (st2.frozenT <= 0) sim2.afterFreeze(); }
  for (const t of st2.toasts) t.t -= dt; st2.toasts = st2.toasts.filter(t => t.t > 0);
};

/* ===== src/22-meta.js ===== */
// Meta systems: pickups, items, the Dossier, story beats and dialog, triggers, bosses, switching, the Wax Bench, saves, Echo Run, the main update.
const s3 = S7.sim, t3 = S7.st;

// ---------------------------------------------------------------- spots and pickups
function spotPos(sp) {
  const G = S7.graph(); if (sp.node) { const n = G.nodes[sp.node]; return { x: n.x, y: n.y, z: n.z }; }
  const e = G.edges[sp.edge]; const o = {}; s3.edgePos(e, e.len * sp.s, o); return o;
}
s3.spotPos = spotPos;
s3.addSpotPickup = function (sp) { const p = spotPos(sp); t3.pickups.push({ id: t3.nextId++, spot: sp.id, kind: sp.item, n: sp.n || 1, x: p.x + (sp.node ? .6 : 0), y: p.y + (sp.node ? .6 : 0), z: p.z + .5, label: sp.label }); };
s3.collect = function (p) {
  if (p.got) return; p.got = true;
  if (p.spot) t3.collected[t3.area + ':' + p.spot] = true;
  if (p.kind === 'red') { const cap = s3.redMax(); t3.red = Math.min(cap, t3.red + p.n); }
  else if (p.kind === 'rime') t3.rime += p.n;
  else if (/^pin\d$/.test(p.kind)) { if (!t3.pins.includes(p.kind)) t3.pins.push(p.kind); const pin = S7.PINS.find(q => q[0] === p.kind); s3.toast('LIFT PIN ' + t3.pins.length + '/7: ' + pin[1].toUpperCase()); }
  else if (p.kind.startsWith('coat_')) { const id = p.kind.slice(5); t3.roster[id].unlocked = true; s3.toast('A NEW COAT: ' + S7.reg.personas[id].name.toUpperCase()); s3.playBeat('coat_' + id); }
  else { t3.items[p.kind] = (t3.items[p.kind] || 0) + 1; const it = S7.reg.items[p.kind]; s3.toast('GOT: ' + (it ? it.name.toUpperCase() : p.kind)); if (p.kind === 'servicekey') s3.playBeat('got_key'); }
  S7.bus.emit('pickup', { kind: p.kind, amount: p.n, x: p.x, y: p.y, drop: !!p.drop });
  s3.updateObjective();
};
s3.unlockDossier = function (id) { if (t3.dossier.includes(id)) return; t3.dossier.push(id); const d = S7.DOSSIER.find(q => q[0] === id); if (d) s3.toast('DOSSIER: ' + d[1]); S7.bus.emit('dossier', { id }); };

// ---------------------------------------------------------------- story: beats run as small scripts of steps
// steps: {say:'rurik', text:'..', mood} {card:'TARGET 00', sub:'..'} {wait:s} {cam:{at,look,fov}, t:s} {fn:()=>..} {wave:id} {flag:k,v} {dossier:id} {music:cue} {unlock:id} {boss:id} {end:true}
s3.playBeat = function (id) {
  const b = S7.reg.beats[id]; if (!b) return false;
  const steps = typeof b === 'function' ? b(t3) : b; if (!steps || !steps.length) return false;
  t3.beat = { id, steps, i: 0, wait: 0 }; t3.preBeat = t3.mode === 'talk' || t3.mode === 'cutscene' ? t3.preBeat : t3.mode;
  t3.mode = 'cutscene'; t3.speed = 0; S7.bus.emit('beat', { id }); runStep(); return true;
};
function endBeat() {
  const id = t3.beat && t3.beat.id; t3.beat = null; t3.talk = null; t3.cut = null; t3.card = null;
  t3.mode = t3.preBeat && !['talk', 'cutscene', 'transition', 'frozen'].includes(t3.preBeat) ? t3.preBeat : 'rail';
  if (t3.mode === 'aim') t3.mode = 'rail';
  if (t3.options && t3.options.length && t3.edge && t3.mode === 'rail' && t3.node && S7.graph().nodes[t3.node].edges.length >= 3) t3.mode = 'junction';
  S7.bus.emit('beatend', { id }); s3.updateObjective();
}
function runStep() {
  const b = t3.beat; if (!b) return;
  while (b.i < b.steps.length) {
    const s = b.steps[b.i];
    if (s.say) { t3.talk = { who: s.say, text: (S7.fmt || (x => x))(s.text), shown: 0, name: s.name || null, mood: s.mood || null }; t3.mode = 'talk'; return; }
    t3.mode = 'cutscene'; t3.talk = null;
    if (s.card) { t3.card = { title: s.card, sub: s.sub || '', t: s.t || 2.6, t0: s.t || 2.6 }; b.wait = s.t || 2.6; b.i++; S7.bus.emit('card', { card: t3.card }); return; }
    if (s.wait !== undefined) { b.wait = s.wait; b.i++; return; }
    if (s.cam) { t3.cut = { cam: s.cam }; if (s.t) { b.wait = s.t; b.i++; return; } }
    if (s.clearcam) t3.cut = null;
    if (s.fn) s.fn(t3);
    if (s.wave) s3.startWave(s.wave);
    if (s.flag) t3.flags[s.flag] = s.v === undefined ? true : s.v;
    if (s.dossier) s3.unlockDossier(s.dossier);
    if (s.music) S7.bus.emit('music', { cue: s.music });
    if (s.unlock) { t3.roster[s.unlock].unlocked = true; s3.toast('NEW COAT: ' + S7.reg.personas[s.unlock].name.toUpperCase()); }
    if (s.boss) s3.startBoss(s.boss);
    if (s.give) { t3.items[s.give] = (t3.items[s.give] || 0) + 1; }
    if (s.shake) S7.bus.emit('shake', { n: s.shake });
    if (s.go) { b.i++; endBeat(); s3.leaveArea(s.go[0], s.go[1]); return; }
    if (s.credits) { b.i++; endBeat(); S7.bus.emit('credits', {}); return; }
    if (s.result !== undefined) { s3.finishTarget(s.result); }
    b.i++;
  }
  endBeat();
}
function stepBeat(dt, I) {
  const b = t3.beat; if (!b) { if (t3.mode === 'talk' || t3.mode === 'cutscene') endBeat(); return; }
  if (t3.talk) {
    const tk = t3.talk, prev = Math.floor(tk.shown); tk.shown = Math.min(tk.text.length, tk.shown + 46 * dt);
    if (Math.floor(tk.shown) > prev) S7.bus.emit('talkchar', { who: tk.who, ch: tk.text[Math.floor(tk.shown) - 1] || ' ', i: Math.floor(tk.shown) });
    if (I.confirm || I.skipTalk) { if (tk.shown < tk.text.length) tk.shown = tk.text.length; else { b.i++; t3.talk = null; runStep(); } }
    return;
  }
  if (t3.card) t3.card.t -= dt;
  if (b.wait > 0) { b.wait -= dt; if (b.wait <= 0) { t3.card = null; runStep(); } }
  if (I.skipScene) { while (t3.beat && t3.beat === b && b.i < b.steps.length) { const s = b.steps[b.i]; if (s.say || s.card || s.wait !== undefined || s.cam) { b.i++; continue; } runStep(); } if (t3.beat === b) endBeat(); }
}

// ---------------------------------------------------------------- triggers, waves, run events
s3.fireTriggers = function (kind, id) {
  const A = S7.graph().A;
  for (const tr of A.triggers) {
    if ((kind === 'node' && tr.node !== id) || (kind === 'edge' && tr.edge !== id)) continue;
    const key = A.id + ':' + tr.id; if (tr.once && t3.done[key]) continue; t3.done[key] = true;
    runTrigger(tr);
  }
};
function runTrigger(tr) {
  if (tr.wave) s3.startWave(tr.wave);
  if (tr.run) s3.runEvent(tr.run.type);
  if (tr.boss && !t3.bosses[tr.boss] && !t3.boss) { const bid = tr.boss; if (tr.beat) { S7.reg.beats[tr.beat + '_then'] = null; } t3.pendingBoss = bid; }
  if (tr.beat) s3.playBeat(tr.beat);
  else if (tr.boss && t3.pendingBoss) { const b = t3.pendingBoss; t3.pendingBoss = null; s3.startBoss(b); }
}
s3.runEvent = function (type) {
  if (t3.echo) return;
  const G = S7.graph(), e = G.edges[t3.edge]; if (!e) return;
  const at = (ds, lat) => { const o = {}; s3.edgePos(e, S7.clamp(t3.s + t3.dir * ds, 0, e.len), o); return [o.x + Math.cos(o.ang + Math.PI / 2) * lat, o.y + Math.sin(o.ang + Math.PI / 2) * lat]; };
  const spawn = (kind, ds, lat, still) => { const p = at(ds, lat); s3.spawnEnemy(kind, p[0], p[1], { still }); };
  const k = S7.T('spawnRate');
  if (type === 'lift1') { spawn('giggler', 30, 4, true); spawn('giggler', 44, -5, true); spawn('thrower', 28, 9); }
  else if (type === 'lift2') { spawn('thrower', 26, -10); spawn('thrower', 36, 10); spawn('giggler', 52, 2, true); if (k > 1.4) spawn('giggler', 58, -2, true); }
  else if (type === 'ski1') { spawn('skier', 62, 3); spawn('giggler', 78, -3); spawn('thrower', 90, 6); }
  else if (type === 'ski2') { spawn('skier', 60, -4); spawn('skier', 68, 4); spawn('giggler', 84, 0); spawn('sumo', 100, 2); }
  else if (type === 'ski3') { spawn('skier', 55, 0); spawn('thrower', 70, -6); spawn('thrower', 76, 6); spawn('giggler', 92, 0); spawn('bellhop', 100, 2); }
};

// ---------------------------------------------------------------- bosses
const BOSSES = {
  grau: { name: 'BELLCAPTAIN GRAU', hp: 150, x: 13, y: 5.2, cy: 1.7, r: 1.2, warmR: .3 },
  king: { name: 'THE POWDER KING', hp: 240, x: 17, y: 8.5, cy: 4.2, r: 3.2, warmR: .55 }
};
s3.startBoss = function (id) {
  const d = BOSSES[id], A = S7.graph().A; if (t3.bosses[id]) return;
  const hp = d.hp * S7.T('bossHp');
  const b = t3.boss = { id, name: d.name, x: d.x, y: d.y, z: 0, cy: d.cy, r: d.r, warmR: d.warmR, hp, hpMax: hp, phase: 1, t: 0, state: 'idle', st: 0, rings: 0, stagger: 0, revealT: 0, hit: 0, zone: null, adds: 12, toggle: 0 };
  b.warmOpen = () => b.state === 'window' && !b.dead;
  b.warmPos = () => id === 'grau' ? [b.x, b.y + 1.0, b.z + 1.55] : [b.x + (b.toggle ? .9 : -.9), b.y + 2.9, b.z + 4.0];
  S7.bus.emit('boss', { id, phase: 1 });
};
s3.hitBoss = function (dmg, crit, w) {
  const b = t3.boss; if (!b || b.dead) return;
  if (crit) { const amt = dmg * S7.T('critMult'); b.hp -= amt; b.hit = .3; t3.stats.crits++; S7.bus.emit('crit', { boss: true }); S7.bus.emit('hit', { target: b, part: 'warm', dmg: amt, x: b.x, y: b.y, z: b.z + b.cy }); }
  else { b.hp -= dmg * .08; b.hit = .12; S7.bus.emit('hit', { target: b, part: 'shield', dmg: 0, x: b.x, y: b.y, z: b.z + b.cy }); if (w && w.stun) b.stagger = Math.max(b.stagger, .4); }
  const frac = b.hp / b.hpMax, ph = frac < .25 ? 3 : frac < .6 ? 2 : 1;
  if (ph !== b.phase) { b.phase = ph; S7.bus.emit('boss', { id: b.id, phase: ph }); s3.toast(b.name + ': PHASE ' + ph); b.adds = 0; }
  if (b.hp <= 0) bossDown(b);
};
function bossDown(b) {
  b.dead = true; b.hp = 0; t3.bosses[b.id] = true; t3.projectiles.length = 0; for (const e of t3.enemies) if (!e.dead) s3.killEnemy(e, false);
  S7.bus.emit('boss', { id: b.id, phase: 'dead' });
  s3.playBeat(b.id === 'grau' ? 't00_boss_down' : 't01_boss_down');
}
function bossStep(dt) {
  const b = t3.boss; if (!b) return;
  b.t += dt; b.hit = Math.max(0, b.hit - dt); b.revealT = Math.max(0, b.revealT - dt);
  if (b.dead) return;
  if (b.stagger > 0) { b.stagger -= dt; return; }
  const ph = b.phase, speed = ph === 3 ? .62 : ph === 2 ? .8 : 1;
  b.st += dt;
  if (b.id === 'grau') {
    if (b.state === 'idle') { if (b.st > 1.5 * speed) { b.state = 'ring'; b.st = 0; S7.bus.emit('bossring', { id: 'grau' }); } }
    else if (b.state === 'ring') { if (b.st > .55) { b.state = 'window'; b.st = 0; } }
    else if (b.state === 'window') {
      if (b.st > .5 && !b.threw) { b.threw = true; s3.fireProjectile(b.x, b.y + 1, 1.9, t3.x, t3.y, t3.z + 1.1, 7.5, 13, 'suit', b); if (ph >= 2) { s3.fireProjectile(b.x, b.y + 1, 1.9, t3.x + 2.6, t3.y, t3.z + 1.1, 7.5, 13, 'suit', b); } }
      if (b.st > (ph === 3 ? 1.5 : 2.0)) { b.state = 'idle'; b.st = 0; b.threw = false; b.rings++; if (ph >= 2 && b.rings % 2 === 0) { s3.startWave(b.rings % 4 === 0 ? 'hop2' : 'hop'); } }
    }
  } else {
    b.toggle = Math.floor(b.t / 2) % 2;
    if (b.state === 'idle') { if (b.st > 1.7 * speed) { b.rings++; const mode = b.rings % 3; b.st = 0;
        if (mode === 1) { b.state = 'volley'; } else if (mode === 2) { b.state = 'slide'; const G = S7.graph(); const keys = Object.keys(G.nodes).filter(k => /^f\d$/.test(k) && k !== 'f0'); const near = keys.sort((a, c) => Math.hypot(G.nodes[a].x - t3.x, G.nodes[a].y - t3.y) - Math.hypot(G.nodes[c].x - t3.x, G.nodes[c].y - t3.y))[0]; b.zone = { x: G.nodes[near].x, y: G.nodes[near].y, t: 0, r: 4.4 }; S7.bus.emit('bossring', { id: 'king', zone: b.zone }); }
        else { b.state = 'inhale'; S7.bus.emit('bossring', { id: 'king', inhale: true }); } } }
    else if (b.state === 'volley') { if (!b.threw) { b.threw = true; const n = ph === 1 ? 3 : 5; for (let i = 0; i < n; i++) s3.fireProjectile(b.x, b.y + 1, 4.4, t3.x + (i - (n - 1) / 2) * 1.9, t3.y, t3.z + 1.2, 7.5, 12, 'snow', b); } if (b.st > 1.3) { b.state = 'idle'; b.st = 0; b.threw = false; } }
    else if (b.state === 'slide') { if (b.zone) { b.zone.t += dt; if (b.zone.t > 1.9 && !b.zone.hit) { b.zone.hit = true; S7.bus.emit('explode', { x: b.zone.x, y: b.zone.y, z: 1, radius: b.zone.r, dmg: 32, source: 'avalanche', big: true }); if (Math.hypot(t3.x - b.zone.x, t3.y - b.zone.y) < b.zone.r) s3.hurtHero(32 * S7.T('bossDmg'), 'avalanche', b.zone.x, b.zone.y); } if (b.zone.t > 2.5) { b.zone = null; b.state = 'inhale'; b.st = 0; } } }
    else if (b.state === 'inhale') { if (b.st > .8) { b.state = 'window'; b.st = 0; } }
    else if (b.state === 'window') { if (b.st > (ph === 3 ? 2.0 : 2.8)) { b.state = 'idle'; b.st = 0; b.threw = false; if (ph >= 2 && b.adds < 1) { b.adds++; s3.startWave(ph === 2 ? 'add1' : 'add2'); } } }
  }
}

// ---------------------------------------------------------------- the Seven: switching, the ring
s3.switchTo = function (id, quiet) {
  const r = t3.roster[id]; if (!r || !r.unlocked || r.frozen || id === t3.persona) return false;
  if (!['rail', 'junction', 'ring', 'ski', 'lift'].includes(t3.mode) && !quiet) return false;
  const from = t3.persona; t3.persona = id; t3.switchT = S7.T('timeScale') ? .45 : .45; t3.aim.zoom = false;
  S7.bus.emit('switch', { from, to: id }); t3.blocked = t3.blocked && S7.graph().edges[t3.edge] ? t3.blocked : null; return true;
};
s3.ringSlots = () => S7.ROSTER.map(id => ({ id, ok: t3.roster[id].unlocked && !t3.roster[id].frozen }));
s3.ringPick = function (vx, vy) {
  if (Math.hypot(vx, vy) < .4) return t3.ringSel;
  let a = Math.atan2(vy, vx) + Math.PI / 2; if (a < 0) a += Math.PI * 2;
  return Math.round(a / (Math.PI * 2 / 7)) % 7;
};

// ---------------------------------------------------------------- the Wax Bench
s3.upgradeCost = id => { const u = S7.UPGRADES.find(q => q.id === id), lv = t3.upg[id] || 0; return lv >= u.max ? null : u.cost[lv]; };
s3.buyUpgrade = function (id) {
  const c = s3.upgradeCost(id); if (c === null) return 'max'; if (t3.rime < c) return 'poor';
  t3.rime -= c; t3.upg[id] = (t3.upg[id] || 0) + 1;
  if (id === 'fur') for (const k of S7.ROSTER) { t3.roster[k].hp = Math.min(s3.personaMax(k), t3.roster[k].hp + Math.round(S7.reg.personas[k].hp * .15)); }
  S7.bus.emit('wax', { id }); return 'ok';
};

// ---------------------------------------------------------------- objective text
s3.updateObjective = function () {
  const a = t3.area, f = t3.flags; let o = '';
  const g = id => !!t3.gates[a + ':' + id];
  if (a === 'room7') o = !t3.bosses.grau ? 'Change coats at the Wardrobe. Wax at the Bench. Take the corridor when ready.' : !t3.bosses.king ? 'Rest. Wax. Then back out into the snow.' : 'It is over. Almost.';
  else if (a === '00A') o = !t3.items.servicekey ? (g('glass') ? 'Fetch the Service Key from the cloakroom.' : 'The Service Key is behind the glass wall in the west. A yodeler might help.') : 'Take the staff lift north.';
  else if (a === '00C') o = 'Shoot the Warm Spot on Grau when the bell rings.';
  else if (a === '01A') o = !t3.items.tbar ? (g('shopdoor') ? 'Take the T-Bar Token from the frozen shop.' : 'Find a T-Bar Token. The frozen shop east may hold one.') : !g('serac') ? (t3.roster.mara.unlocked ? 'The lift station is behind an ice serac. Mara knows ice: press the skill at it.' : 'An ice serac blocks the lift. The engineer\'s coat hangs in the private garden, west. A tycoon can open that gate.') : 'Take the lift station north-east.';
  else if (a === '01C') o = t3.echo ? 'ECHO RUN: ski to the bottom. Thawed targets cut 2 seconds.' : 'Ride the T-bar up, then ski the Black Run down.';
  else if (a === '01F') o = 'Shoot the Powder King\'s Warm Spot when he breathes in.';
  t3.objective = o;
};

// ---------------------------------------------------------------- targets, results, saves
s3.finishTarget = function (n) {
  const s = t3.stats, acc = s.shots ? s.hits / s.shots : 0;
  let score = s.kills * 10 + s.crits * 15 - Math.round(s.damage) * 1 + Math.max(0, 600 - Math.round(s.t)) * .2 + t3.pins.length * 20;
  const rank = score > 360 ? 'S' : score > 260 ? 'A' : score > 170 ? 'B' : 'C';
  t3.results[n] = { target: n, kills: s.kills, crits: s.crits, damage: Math.round(s.damage), time: s.t, acc: Math.round(acc * 100), pins: t3.pins.length, rank };
  S7.bus.emit('result', { target: n, stats: t3.results[n], rank });
  t3.stats = { kills: 0, crits: 0, damage: 0, shots: 0, hits: 0, freezes: 0, t: 0 };
};
s3.serialize = function () {
  const keep = ['area', 'persona', 'roster', 'red', 'rime', 'items', 'pins', 'dossier', 'upg', 'flags', 'gates', 'done', 'collected', 'bosses', 'stats', 'results', 'playTime', 'difficulty'];
  const o = {}; for (const k of keep) o[k] = JSON.parse(JSON.stringify(t3[k]));
  o.node = t3.node; return o;
};
s3.deserialize = function (d) {
  S7.newState({ difficulty: d.difficulty });
  for (const k of Object.keys(d)) if (k !== 'node') t3[k] = JSON.parse(JSON.stringify(d[k]));
  for (const id of S7.ROSTER) if (!t3.roster[id]) t3.roster[id] = { hp: 1, frozen: false, unlocked: false, ammo: S7.reg.weapons[S7.reg.personas[id].weapon].mag, reload: 0, cool: 0 };
  for (const id of S7.ROSTER) { t3.roster[id].reload = 0; t3.roster[id].cool = 0; }
  s3.loadArea(d.area, d.node || (d.area === 'room7' ? 'c' : undefined));
};
s3.saveHere = function () {
  t3.lastSave = s3.serialize(); S7.bus.emit('save', {}); return t3.lastSave;
};
s3.enterRoom7 = function () { s3.reviveFrozen(); for (const id of S7.ROSTER) { const r = t3.roster[id]; r.hp = Math.max(r.hp, Math.round(s3.personaMax(id) * .6)); r.ammo = S7.reg.weapons[S7.reg.personas[id].weapon].mag; } };
s3.nextFromRoom7 = function () {
  if (!t3.bosses.grau) return ['00A', 'start'];
  if (!t3.bosses.king) return ['01A', 'start'];
  return ['room7', 'c'];
};

// ---------------------------------------------------------------- Echo Run: ski the Black Run against the clock and the ghosts
s3.startEcho = function (opts = {}) {
  S7.newState({ difficulty: 'normal' });
  for (const id of S7.ROSTER) t3.roster[id].unlocked = true;
  t3.persona = 'anselma';
  t3.echo = { t: 0, hits: 0, total: 0, finished: false, started: false, rec: [], ghost: opts.ghost || null, others: {}, countdown: opts.countdown === undefined ? 3 : opts.countdown, result: null, seed: opts.seed || 1 };
  s3.loadArea('01C', 'top');
  t3.edge = 's1'; t3.s = 0; t3.dir = 1; t3.mode = 'ski'; t3.node = null; t3.speed = 0; t3.options = []; s3.placeHero(); s3.directCamera(0, true);
  // targets: warm-spot dummies along the main line
  const G = S7.graph(); const spots = [['s1', .22, 3], ['s1', .5, -3], ['s1', .78, 3], ['s2', .25, -3], ['s2', .55, 3], ['s2', .85, -3], ['s3', .3, 3], ['s3', .65, -3]];
  for (const [eid, f, lat] of spots) { const e = G.edges[eid], o = {}; s3.edgePos(e, e.len * f, o); const ex = o.x + Math.cos(o.ang + Math.PI / 2) * lat, ey = o.y + Math.sin(o.ang + Math.PI / 2) * lat; const en = s3.spawnEnemy('giggler', ex, ey, { from: 'echo' }); en.dummy = true; en.spawnT = 0; en.visible = 1; en.face = o.ang + Math.PI; t3.echo.total++; }
  t3.pickups.length = 0; t3.objective = 'ECHO RUN: ski to the bottom. Thawed targets cut 2 seconds.';
  S7.bus.emit('echo', { kind: 'start' });
};
s3.echoTick = function (dt) {
  const ec = t3.echo; if (!ec || ec.finished) return;
  ec.t += dt; ec.recT = (ec.recT || 0) + dt;
  if (ec.recT >= .1) { ec.recT = 0; ec.rec.push([+ec.t.toFixed(2), t3.edge, +t3.s.toFixed(1)]); }
  if (t3.node === 'rest' || (t3.edge === 's3' && t3.s >= G_len('s3') - .5)) s3.echoFinish();
};
function G_len(id) { return S7.graph().edges[id].len; }
s3.echoFinish = function () {
  const ec = t3.echo; if (!ec || ec.finished) return; ec.finished = true;
  const cut = ec.hits * 2, time = Math.max(1, ec.t - cut);
  ec.result = { raw: ec.t, cut, time, hits: ec.hits, total: ec.total };
  S7.bus.emit('echo', { kind: 'finish', result: ec.result });
};

// ---------------------------------------------------------------- the main step
s3.update = function (dt, I) {
  dt = Math.min(dt, 1 / 20) * S7.T('timeScale');
  I = I || {};
  if (t3.mode === 'transition') {
    t3.transT -= dt;
    if (t3.transT <= 0 && t3.pendingArea) { const p = t3.pendingArea; t3.pendingArea = null;
      let to = p.to, node = p.node;
      if (t3.area === 'room7' && p.node === 'door' && to === 'room7') { const n = s3.nextFromRoom7(); to = n[0]; node = n[1]; }
      if (to === 'room7' && node === 'door') { /* arriving into Room 7 from the field puts you at the hub */ node = 'c'; }
      if (t3.area === 'room7' && to !== 'room7') { /* leaving Room 7 */ }
      s3.loadArea(to, node); if (to === 'room7') s3.enterRoom7(); else s3.reviveFrozen();
      if (to !== 'room7') { t3.lastSave = null; }
      s3.autosave && s3.autosave();
      if (t3.mode === 'transition') t3.mode = 'rail';
      if (t3.mode === 'rail' && S7.graph().nodes[t3.node] && S7.graph().nodes[t3.node].edges.length >= 3) { t3.mode = 'junction'; }
      S7.bus.emit('arrived', { area: to });
    }
    return;
  }
  if (t3.over) return;
  t3.time += dt;
  if (t3.echo && t3.echo.countdown > 0) { t3.echo.countdown -= dt; I = { stick: [0, 0] }; if (t3.echo.countdown <= 0) { t3.echo.started = true; S7.bus.emit('echo', { kind: 'go' }); } s3.directCamera(dt); return; }
  if (t3.mode === 'talk' || t3.mode === 'cutscene') { stepBeat(dt, I); s3.directCamera(dt); return; }
  if (t3.mode === 'modal') return;
  if (I.map && ['rail', 'junction'].includes(t3.mode)) { S7.bus.emit('open', { screen: 'map' }); return; }
  // the ring: hold to slow time and choose a coat
  if (I.ring && ['rail', 'junction', 'aim', 'ski', 'lift'].includes(t3.mode)) { t3.preRing = t3.mode; t3.mode = 'ring'; t3.ringSel = S7.ROSTER.indexOf(t3.persona); S7.bus.emit('ringon', {}); }
  if (t3.mode === 'ring') {
    if (I.ringVec) { const k = s3.ringPick(I.ringVec[0], I.ringVec[1]); if (k !== null && k !== undefined && k !== t3.ringSel) { t3.ringSel = k; S7.bus.emit('select', {}); } }
    if (!I.ring) { const id = S7.ROSTER[t3.ringSel]; t3.mode = t3.preRing === 'aim' ? 'rail' : t3.preRing; if (id) s3.switchTo(id); S7.bus.emit('ringoff', {}); }
    else { s3.stepCombat(dt * .15, {}); s3.directCamera(dt); return; }
  }
  if (I.pick && ['rail', 'junction', 'ski', 'lift'].includes(t3.mode)) { const id = S7.ROSTER[I.pick - 1]; if (id) s3.switchTo(id); }
  if (t3.mode !== 'frozen') { t3.playTime += dt; t3.stats.t += dt; }
  if (t3.mode !== 'frozen' && t3.mode !== 'gameover') {
    if (t3.echo && !t3.echo.started) I = {};
    s3.interactStep(dt, I);
    const prevS = t3.s, prevEdge = t3.edge;
    if (!(t3.mode === 'aim' && (t3.preAim === 'rail' || t3.preAim === 'junction'))) stepWalkerPublic(dt, I);
    if (t3.edge === prevEdge && ['rail', 'ski', 'lift'].includes(t3.mode) || t3.mode === 'aim') edgeTriggers(prevS);
  }
  s3.stepCombat(dt, I);
  bossStep(dt);
  s3.directCamera(dt);
  t3.objTimer = (t3.objTimer || 0) - dt; if (t3.objTimer <= 0) { t3.objTimer = .5; s3.updateObjective(); }
  if (t3.hint && t3.mode !== 'rail' && t3.mode !== 'ski') { /* keep hint */ }
  if (t3.blocked && t3.speed > 0.1) t3.blocked = null;
  // the game's own pause for the Sweep rescue
};
function edgeTriggers(prevS) {
  const A = S7.graph().A, e = S7.graph().edges[t3.edge]; if (!e) return;
  for (const tr of A.triggers) {
    if (tr.edge !== t3.edge) continue; const key = A.id + ':' + tr.id; if (tr.once && t3.done[key]) continue;
    const at = tr.s * e.len;
    if ((prevS < at && t3.s >= at) || (prevS > at && t3.s <= at)) { t3.done[key] = true; runTrigger(tr); }
  }
}
function stepWalkerPublic(dt, I) { s3.stepWalker(dt, I); }
// interact: spots (talk, bench, wardrobe, save, leave), gates
s3.nearSpot = function () {
  const A = S7.graph().A; let best = null, bd = 2.6;
  for (const sp of A.spots) { if (sp.kind === 'pickup') continue; const p = spotPos(sp), d = Math.hypot(p.x - t3.x, p.y - t3.y); if (d < bd) { bd = d; best = sp; } }
  return best;
};
s3.interactStep = function (dt, I) {
  if (!['rail', 'junction'].includes(t3.mode) && !(t3.mode === 'ski' && t3.speed < 1)) { t3.prompt = null; return; }
  const sp = s3.nearSpot(); t3.prompt = sp ? { kind: sp.kind, label: sp.label, id: sp.id } : null;
  if (t3.blocked) { const g = s3.gateOf(); t3.prompt = g ? { kind: 'gate', label: g.label, id: t3.blocked } : t3.prompt; }
  if (I.clickSpot) { const sp2 = S7.graph().A.spots.find(q => q.id === I.clickSpot); if (sp2 && (!sp || sp2.id === sp.id)) I = Object.assign({}, I, { interact: true }); }
  if (!I.interact) return;
  if (t3.blocked) {
    const g = s3.gateOf(); if (!g) return;
    if (g.who && g.who !== t3.persona) { const w = S7.reg.personas[g.who]; s3.toast('WEAR ' + w.name.toUpperCase() + ' TO TRY THIS'); S7.bus.emit('deny', {}); return; }
    s3.useSkill(); return;
  }
  if (!sp) return;
  const speak = id => { s3.playBeat(id); };
  if (sp.kind === 'npc' || sp.kind === 'phone') speak(sp.talk);
  else if (sp.kind === 'save') S7.bus.emit('open', { screen: 'save' });
  else if (sp.kind === 'bench') S7.bus.emit('open', { screen: 'bench' });
  else if (sp.kind === 'wardrobe') S7.bus.emit('open', { screen: 'wardrobe' });
  else if (sp.kind === 'leave') { const dest = s3.nextFromRoom7(); s3.autosave && s3.autosave(); s3.leaveArea(dest[0], dest[1]); }
};

/* ===== src/30-audio.js ===== */
// Audio, all in code: chip songs, SFX voices, our own laughter synth and Animalese-style gibberish voices.
const AU = S7.audio = { ready: false, amb: null, curSong: null };
const bar = (...s) => s.join(' ');

// ---------------------------------------------------------------- songs (the engine's step sequencer)
S7.songs = {
  title: { bpm: 78, steps: 4, tracks: [
    { name: 'pad', wave: 'triangle', vol: .16, notes: bar('A3 - - - - - - - E3 - - - - - - -', 'F3 - - - - - - - E3 - - - - - - -', 'A3 - - - - - - - E3 - - - C4 - - -', 'D3 - - - - - - - E3 - - - - - - -') },
    { name: 'lead', wave: 'square', vol: .07, notes: bar('. . . . E5 - - - D5 - . . C5 - - -', 'A4 - - - . . . . C5 - - - D5 - - -', 'E5 - - - . . G5 - E5 - - - D5 - - -', 'C5 - - - A4 - - - E4 - - - . . . .') },
    { name: 'drums', wave: 'drums', vol: .09, notes: bar('k . . . . . h . k . . . . . h .', 'k . . . . . h . k . . . . . h .', 'k . . . . . h . k . . . s . h .', 'k . . . s . . . k . . . s . s s') }] },
  room7: { bpm: 66, steps: 4, tracks: [
    { name: 'box', wave: 'sine', vol: .12, notes: bar('E5 - . G5 - . B5 - . G5 - . E5 - . . .', 'D5 - . F5 - . A5 - . F5 - . D5 - . . .', 'C5 - . E5 - . G5 - . E5 - . C5 - . . .', 'D5 - . F5 - . A5 - . B5 - . . . . . .') },
    { name: 'low', wave: 'triangle', vol: .1, notes: bar('E3 - - - - - - - - - - - - - - -', 'D3 - - - - - - - - - - - - - - -', 'C3 - - - - - - - - - - - - - - -', 'B2 - - - - - - - E3 - - - - - - -') }] },
  hotel: { bpm: 104, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .17, notes: bar('D3 - . D3 F3 - . A3 G3 - . G3 B3 - . D4', 'C3 - . C3 E3 - . G3 A3 - . A3 C4 - . E4', 'F3 - . F3 A3 - . C4 Bb3 - . Bb3 D4 - . F4', 'A2 - . A2 C#3 - . E3 A3 - . G3 E3 - . C#3') },
    { name: 'keys', wave: 'square', vol: .045, notes: bar('. . F4 - . . A4 - . . F4 - . . D4 -', '. . E4 - . . G4 - . . E4 - . . C4 -', '. . A4 - . . C5 - . . A4 - . . F4 -', '. . E4 - . . A4 - . . G4 - . . E4 -') },
    { name: 'drums', wave: 'drums', vol: .06, notes: bar('h . h . s . h . h . h . s . h h', 'h . h . s . h . h . h . s . h .', 'h . h . s . h . h . h . s . h h', 'h . h . s . h h h . h . s . s .') }] },
  village: { bpm: 100, steps: 4, tracks: [
    { name: 'oom', wave: 'triangle', vol: .18, notes: bar('C3 - - - G3 - - - C3 - - - G3 - - -', 'F3 - - - C4 - - - F3 - - - C4 - - -', 'G3 - - - D4 - - - G3 - - - D4 - - -', 'C3 - - - G3 - - - E3 - G3 - C4 - - -') },
    { name: 'pah', wave: 'pulse', vol: .05, notes: bar('. . E4 G4 . . E4 G4 . . E4 G4 . . E4 G4', '. . F4 A4 . . F4 A4 . . F4 A4 . . F4 A4', '. . G4 B4 . . G4 B4 . . G4 B4 . . G4 B4', '. . E4 G4 . . E4 G4 . . E4 G4 . . C5 -') },
    { name: 'horn', wave: 'square', vol: .06, notes: bar('E5 - - - G5 - - - E5 - D5 - C5 - - -', 'F5 - - - A5 - - - F5 - E5 - D5 - - -', 'G5 - - - B5 - - - G5 - F5 - D5 - - -', 'E5 - - - D5 - - - C5 - - - . . . .') }] },
  blackrun: { bpm: 152, steps: 4, tracks: [
    { name: 'arp', wave: 'saw', vol: .05, notes: bar('E4 G4 B4 E5 B4 G4 E4 G4 B4 E5 B4 G4 E4 G4 B4 E5', 'D4 F4 A4 D5 A4 F4 D4 F4 A4 D5 A4 F4 D4 F4 A4 D5', 'C4 E4 G4 C5 G4 E4 C4 E4 G4 C5 G4 E4 C4 E4 G4 C5', 'D4 F4 A4 D5 A4 F4 B3 D4 F4 B4 F4 D4 B3 D4 F4 B4') },
    { name: 'bass', wave: 'triangle', vol: .18, notes: bar('E2 - E2 E2 - E2 E2 - E2 - E2 E2 - E2 G2 -', 'D2 - D2 D2 - D2 D2 - D2 - D2 D2 - D2 F2 -', 'C2 - C2 C2 - C2 C2 - C2 - C2 C2 - C2 E2 -', 'B1 - B1 B1 - B1 B1 - D2 - D2 D2 - E2 F2 G2') },
    { name: 'drums', wave: 'drums', vol: .09, notes: bar('k . h . s . h . k . h k s . h .', 'k . h . s . h . k . h k s . h h', 'k . h . s . h . k . h k s . h .', 'k . h . s . s . k k h . s s s s') }] },
  boss1: { bpm: 144, steps: 4, tracks: [
    { name: 'bells', wave: 'sine', vol: .12, notes: bar('E5 - - - - - E5 - - - B5 - - - - -', 'E5 - - - - - E5 - - - A5 - - - - -', 'D5 - - - - - D5 - - - A5 - - - - -', 'B4 - - - D5 - E5 - G5 - B5 - - - - -') },
    { name: 'bass', wave: 'saw', vol: .09, notes: bar('E2 E2 - E2 E2 - E2 E2 E2 E2 - E2 G2 - A2 -', 'E2 E2 - E2 E2 - E2 E2 E2 E2 - E2 G2 - A2 -', 'D2 D2 - D2 D2 - D2 D2 D2 D2 - D2 F2 - G2 -', 'B1 B1 - B1 B1 - B1 B1 B1 B1 - D2 E2 - G2 -') },
    { name: 'drums', wave: 'drums', vol: .1, notes: bar('k . . k s . . k k . . k s . k .', 'k . . k s . . k k . . k s . k k', 'k . . k s . . k k . . k s . k .', 'k k . k s . s k k k s k s s s s') }] },
  boss2: { bpm: 132, steps: 4, tracks: [
    { name: 'choir', wave: 'saw', vol: .06, notes: bar('A3 - - - - - - - C4 - - - - - - -', 'F3 - - - - - - - A3 - - - - - - -', 'G3 - - - - - - - B3 - - - - - - -', 'E3 - - - - - - - G#3 - - - B3 - - -') },
    { name: 'bass', wave: 'square', vol: .08, notes: bar('A1 . A1 A1 . A1 A1 . A1 . A1 A1 . C2 D2 .', 'F1 . F1 F1 . F1 F1 . F1 . F1 F1 . A1 C2 .', 'G1 . G1 G1 . G1 G1 . G1 . G1 G1 . B1 D2 .', 'E1 . E1 E1 . E1 E1 . E1 . G#1 G#1 . B1 B1 .') },
    { name: 'drums', wave: 'drums', vol: .11, notes: bar('k . h . s . h k k . h . s . h .', 'k . h . s . h k k . h . s . h .', 'k . h . s . h k k . h . s . h k', 'k . k . s . k k s s k k s s s s') }] },
  credits: { bpm: 72, steps: 4, tracks: [
    { name: 'a', wave: 'triangle', vol: .15, notes: bar('C3 - - - G3 - - - A3 - - - E3 - - -', 'F3 - - - C4 - - - G3 - - - D4 - - -') },
    { name: 'b', wave: 'sine', vol: .1, notes: bar('E5 - - - D5 - - - C5 - - - E5 - - -', 'A5 - - - G5 - - - F5 - - - D5 - - -') }] }
};
S7.cueSong = { title: 'title', room7: 'room7', hotel: 'hotel', village: 'village', blackrun: 'blackrun', boss1: 'boss1', boss2: 'boss2', credits: 'credits', none: null };
AU.music = function (cue) {
  const g = S7.game; if (!g) return; const name = S7.cueSong[cue];
  if (AU.curSong === cue) return; AU.curSong = cue;
  try { if (name === null || name === undefined) g.audio.music(null); else g.audio.music(S7.songs[name], { sync: true, fade: 1 }); } catch (e) { S7.fail('music', e); }
};

// ---------------------------------------------------------------- SFX voices
AU.defineAll = function (audio) {
  const d = (n, v) => audio.define(n, v);
  d('shot_rev', [{ wave: 'noise', dur: .13, vol: .34, to: 'C3' }, { wave: 'saw', freq: 'A2', to: 'A1', dur: .16, vol: .3 }]);
  d('shot_pole', [{ wave: 'noise', dur: .05, vol: .2 }, { wave: 'square', freq: 'E5', to: 'E3', dur: .06, vol: .14 }]);
  d('shot_rifle', [{ wave: 'noise', dur: .3, vol: .4, to: 'C2' }, { wave: 'saw', freq: 'E2', to: 'E1', dur: .4, vol: .3 }]);
  d('shot_shotgun', [{ wave: 'noise', dur: .35, vol: .5, to: 'C2' }, { wave: 'square', freq: 'A1', to: 'A1', dur: .3, vol: .26 }]);
  d('shot_horn', [{ wave: 'saw', freq: 'D2', to: 'D3', dur: .5, vol: .3, vib: [9, .02] }, { wave: 'triangle', freq: 'A2', dur: .5, vol: .24 }]);
  d('shot_cam', [{ wave: 'noise', dur: .05, vol: .3 }, { wave: 'square', freq: 'A6', to: 'A4', dur: .15, vol: .15 }]);
  d('shot_launch', [{ wave: 'saw', freq: 'C3', to: 'C2', dur: .4, vol: .3 }, { wave: 'noise', dur: .3, vol: .3 }]);
  d('thaw', [{ wave: 'triangle', freq: 'C5', to: 'C6', dur: .12, vol: .2 }, { wave: 'sine', freq: 'G5', to: 'G6', dur: .25, vol: .16, delay: .06 }, { wave: 'noise', dur: .35, vol: .08, delay: .05 }]);
  d('crit', [{ wave: 'square', freq: 'E6', dur: .05, vol: .16 }, { wave: 'square', freq: 'B6', dur: .2, vol: .16, delay: .05 }, { wave: 'sine', freq: 'E7', dur: .4, vol: .12, delay: .08 }]);
  d('hitbody', [{ wave: 'noise', dur: .06, vol: .16 }, { wave: 'square', freq: 'A3', to: 'A2', dur: .08, vol: .12 }]);
  d('clank', [{ wave: 'square', freq: 'F5', to: 'E5', dur: .09, vol: .12 }, { wave: 'noise', dur: .03, vol: .14 }]);
  d('scan', [{ wave: 'sine', freq: 'C3', to: 'C6', dur: .6, vol: .26 }, { wave: 'triangle', freq: 'G3', to: 'G6', dur: .7, vol: .12, delay: .05 }, { wave: 'noise', dur: .5, vol: .05, delay: .1 }]);
  d('scanping', [{ wave: 'sine', freq: 'A6', dur: .12, vol: .13 }]);
  d('hurt', [{ wave: 'saw', freq: 'A2', to: 'A1', dur: .25, vol: .3 }, { wave: 'noise', dur: .25, vol: .25 }]);
  d('boom', [{ wave: 'noise', dur: .6, vol: .5, to: 'C2' }, { wave: 'saw', freq: 'C2', to: 'C1', dur: .6, vol: .4 }]);
  d('freeze', [{ wave: 'sine', freq: 'C7', to: 'C4', dur: .8, vol: .2 }, { wave: 'noise', dur: .5, vol: .18, to: 'C5' }, { wave: 'triangle', freq: 'E6', dur: .9, vol: .1, delay: .1, vib: [20, .05] }]);
  d('rescue', [{ wave: 'noise', dur: .1, vol: .2 }, { wave: 'square', freq: 'C5', dur: .1, vol: .12, delay: .15 }, { wave: 'square', freq: 'G5', dur: .1, vol: .12, delay: .3 }, { wave: 'square', freq: 'C6', dur: .25, vol: .14, delay: .45 }]);
  d('switch', [{ wave: 'triangle', freq: 'C4', to: 'C5', dur: .15, vol: .2 }, { wave: 'triangle', freq: 'G4', to: 'G5', dur: .2, vol: .18, delay: .1 }, { wave: 'sine', freq: 'C6', dur: .3, vol: .12, delay: .2 }]);
  d('ringon', [{ wave: 'sine', freq: 'C3', to: 'G3', dur: .35, vol: .2 }]);
  d('select', [{ wave: 'square', freq: 'E5', dur: .04, vol: .1 }]);
  d('confirm2', [{ wave: 'square', freq: 'E5', dur: .05, vol: .12 }, { wave: 'square', freq: 'B5', dur: .09, vol: .12, delay: .05 }]);
  d('deny', [{ wave: 'square', freq: 'E3', dur: .1, vol: .16 }, { wave: 'square', freq: 'C3', dur: .16, vol: .16, delay: .1 }]);
  d('reload', [{ wave: 'noise', dur: .04, vol: .16 }, { wave: 'square', freq: 'C4', dur: .05, vol: .1, delay: .25 }, { wave: 'noise', dur: .06, vol: .2, delay: .5 }]);
  d('empty', [{ wave: 'square', freq: 'C3', dur: .04, vol: .1 }]);
  d('pickup_red', [{ wave: 'sine', freq: 'C6', to: 'G6', dur: .1, vol: .18 }, { wave: 'sine', freq: 'E6', dur: .15, vol: .12, delay: .06 }]);
  d('pickup_rime', [{ wave: 'triangle', freq: 'E6', dur: .08, vol: .14 }, { wave: 'triangle', freq: 'A6', dur: .08, vol: .14, delay: .07 }, { wave: 'sine', freq: 'E7', dur: .2, vol: .1, delay: .14 }]);
  d('pickup_item', [{ wave: 'square', freq: 'C5', dur: .08, vol: .14 }, { wave: 'square', freq: 'E5', dur: .08, vol: .14, delay: .08 }, { wave: 'square', freq: 'G5', dur: .08, vol: .14, delay: .16 }, { wave: 'square', freq: 'C6', dur: .22, vol: .16, delay: .24 }]);
  d('gate_open', [{ wave: 'saw', freq: 'C2', to: 'C3', dur: .5, vol: .2 }, { wave: 'square', freq: 'G4', dur: .1, vol: .12, delay: .3 }, { wave: 'square', freq: 'D5', dur: .25, vol: .12, delay: .4 }]);
  d('glass', [{ wave: 'noise', dur: .5, vol: .3, to: 'C6' }, { wave: 'sine', freq: 'A6', to: 'E7', dur: .4, vol: .14 }]);
  d('bell', [{ wave: 'sine', freq: 'E5', dur: 1.2, vol: .3 }, { wave: 'sine', freq: 'B5', dur: .9, vol: .16 }, { wave: 'square', freq: 'E6', dur: .5, vol: .06 }]);
  d('cut', [{ wave: 'noise', dur: .025, vol: .08 }]);
  d('step', [{ wave: 'noise', dur: .04, vol: .05, to: 'C4' }]);
  d('wax', [{ wave: 'triangle', freq: 'G4', dur: .1, vol: .14 }, { wave: 'triangle', freq: 'D5', dur: .1, vol: .14, delay: .08 }, { wave: 'sine', freq: 'G5', dur: .3, vol: .12, delay: .16 }]);
  d('chime', [{ wave: 'sine', freq: 'G5', dur: .6, vol: .22 }, { wave: 'sine', freq: 'E5', dur: .8, vol: .2, delay: .22 }, { wave: 'sine', freq: 'C5', dur: 1.2, vol: .22, delay: .46 }]);
  d('cuckoo', [{ wave: 'sine', freq: 'E5', dur: .18, vol: .22 }, { wave: 'sine', freq: 'C5', dur: .3, vol: .22, delay: .24 }]);
  d('skill', [{ wave: 'saw', freq: 'C4', to: 'C6', dur: .3, vol: .16 }, { wave: 'sine', freq: 'G5', dur: .4, vol: .12, delay: .1 }]);
  d('rain', [{ wave: 'sine', freq: 'C6', dur: .06, vol: .14 }, { wave: 'sine', freq: 'E6', dur: .06, vol: .14, delay: .06 }, { wave: 'sine', freq: 'G6', dur: .06, vol: .14, delay: .12 }, { wave: 'sine', freq: 'C7', dur: .2, vol: .14, delay: .18 }, { wave: 'noise', dur: .5, vol: .06, delay: .1 }]);
  d('flash', [{ wave: 'noise', dur: .2, vol: .35, to: 'C7' }, { wave: 'sine', freq: 'C7', to: 'C5', dur: .4, vol: .14 }]);
  d('echo', [{ wave: 'saw', freq: 'D3', dur: .6, vol: .24, vib: [8, .03] }, { wave: 'sine', freq: 'D4', dur: .8, vol: .2, delay: .15 }, { wave: 'sine', freq: 'D5', dur: 1, vol: .14, delay: .3 }]);
  d('throw', [{ wave: 'noise', dur: .18, vol: .1, to: 'C5' }]);
  d('splat', [{ wave: 'noise', dur: .12, vol: .14, to: 'C3' }]);
  d('lift', [{ wave: 'square', freq: 'C2', dur: .05, vol: .1 }]);
  d('card', [{ wave: 'saw', freq: 'C2', to: 'C3', dur: .8, vol: .2 }, { wave: 'square', freq: 'C4', dur: .2, vol: .1, delay: .6 }]);
  d('win', [{ wave: 'square', freq: 'C5', dur: .12, vol: .16 }, { wave: 'square', freq: 'E5', dur: .12, vol: .16, delay: .12 }, { wave: 'square', freq: 'G5', dur: .12, vol: .16, delay: .24 }, { wave: 'square', freq: 'C6', dur: .5, vol: .18, delay: .36 }]);
  d('go', [{ wave: 'square', freq: 'C6', dur: .4, vol: .18 }]);
  d('count', [{ wave: 'square', freq: 'C5', dur: .15, vol: .16 }]);
};
AU.sfx = (name, o) => { const g = S7.game; if (!g || !g.audio) return; try { g.audio.sfx(name, o); } catch (e) { /* silent */ } };
const ctxOf = () => { const g = S7.game; if (!g || !g.audio || typeof window === 'undefined') return null; const a = g.audio; return a.ctx || a._init(); };

// ---------------------------------------------------------------- laughter: our own WebAudio synth, panned to the Whiteout
const LAUGH = {
  giggle: { f0: 520, n: 6, gap: .085, dur: .06, f1: [900, 2400], drop: .96 },
  chuckle: { f0: 230, n: 4, gap: .14, dur: .1, f1: [600, 1100], drop: .93 },
  whoop: { f0: 380, n: 5, gap: .075, dur: .06, f1: [1000, 2600], drop: 1.07 },
  boom: { f0: 110, n: 3, gap: .3, dur: .22, f1: [400, 900], drop: .9 },
  trill: { f0: 430, n: 9, gap: .06, dur: .045, f1: [800, 2200], drop: 1.0 }
};
AU.laugh = function (style, pan, loud, pitch = 1) {
  const c = ctxOf(); if (!c || c.state !== 'running') return; const a = S7.game.audio, L = LAUGH[style] || LAUGH.giggle;
  const vol = S7.clamp(loud, 0, 1) * .5 * S7.T('laughLoud'); if (vol < .01) return;
  const t0 = c.currentTime + .01, panner = c.createStereoPanner ? c.createStereoPanner() : null;
  const out = c.createGain(); out.gain.value = vol; if (panner) { panner.pan.value = S7.clamp(pan, -1, 1); out.connect(panner); panner.connect(a._sfxBus); } else out.connect(a._sfxBus);
  let f = L.f0 * pitch;
  for (let i = 0; i < L.n; i++) {
    const t = t0 + i * L.gap * (1 + (S7.R('fx')() - .5) * .2), o = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.15, t); o.frequency.exponentialRampToValueAtTime(f, t + L.dur);
    bp.type = 'bandpass'; bp.Q.value = 3.5; bp.frequency.value = L.f1[i % 2];
    const amp = Math.pow(.86, i); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + L.dur + .03);
    o.connect(bp); bp.connect(g); g.connect(out); o.start(t); o.stop(t + L.dur + .05); f *= L.drop;
  }
};
AU.bearing = function (x, y) {   // -1 left .. 1 right of the camera
  const c = S7.st.cam, yaw = Math.atan2(c.ly - c.y, c.lx - c.x), dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy) || 1;
  return (dx * -Math.sin(yaw) + dy * Math.cos(yaw)) / d;
};

// ---------------------------------------------------------------- Animalese: each letter is a short pitched blip
const VOICES = {
  murmel: { base: 400, wob: .35, rate: 1.4, wave: 'square' }, oma: { base: 180, wob: .4, rate: .9, wave: 'triangle' }, rosalind: { base: 300, wob: .15, rate: 1, wave: 'triangle' },
  pim: { base: 520, wob: .3, rate: 1.1, wave: 'sine' }, concierge: { base: 140, wob: .08, rate: .85, wave: 'sawtooth' }, grau: { base: 85, wob: .12, rate: .8, wave: 'sawtooth' },
  king: { base: 60, wob: .1, rate: .6, wave: 'sawtooth' }, sweep: { base: 220, wob: .05, rate: 1, wave: 'square' }, foehn: { base: 110, wob: .6, rate: 1.2, wave: 'sawtooth' }, narrator: { base: 200, wob: .2, rate: 1, wave: 'triangle' }
};
Object.assign(S7.reg.voices, VOICES);
const voiceOf = who => S7.reg.voices[who] || (S7.reg.personas[who] && Object.assign({ wave: 'square' }, S7.reg.personas[who].voice)) || VOICES.narrator;
let lastBlip = 0;
AU.speak = function (who, ch) {
  const c = ctxOf(); if (!c || c.state !== 'running' || !ch || ch === ' ') return;
  const v = voiceOf(who), code = ch.toLowerCase().charCodeAt(0);
  if (!(code >= 97 && code <= 122) && !(code >= 48 && code <= 57)) return;
  const now = c.currentTime; if (now - lastBlip < .035) return; lastBlip = now;
  const idx = code - 97, vowel = 'aeiou'.includes(ch.toLowerCase()), pitch = v.base * Math.pow(2, ((idx * 7) % 12 - 5) / 12 * (1 + v.wob) / 1.6) * (vowel ? 1.12 : .95);
  const o = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain(), dur = (vowel ? .075 : .045) / v.rate;
  o.type = v.wave || 'square'; o.frequency.setValueAtTime(pitch, now); o.frequency.linearRampToValueAtTime(pitch * (vowel ? 1.08 : .88), now + dur);
  bp.type = 'bandpass'; bp.frequency.value = vowel ? 700 + (idx % 5) * 260 : 1800; bp.Q.value = 1.8;
  g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(.2, now + .006); g.gain.exponentialRampToValueAtTime(.001, now + dur);
  o.connect(bp); bp.connect(g); g.connect(S7.game.audio._sfxBus); o.start(now); o.stop(now + dur + .02);
};

// ---------------------------------------------------------------- ambience: wind, hotel hum, the shaft
AU.ambience = function (kind) {
  const c = ctxOf(); if (!c) return; if (AU.ambKind === kind) return;
  if (AU.amb) { try { AU.amb.g.gain.linearRampToValueAtTime(0, c.currentTime + .8); const old = AU.amb; setTimeout(() => { try { old.src.stop(); } catch (e) { /* done */ } }, 1000); } catch (e) { /* done */ } AU.amb = null; }
  AU.ambKind = kind; if (!kind) return;
  const a = S7.game.audio; if (!a._noise) return;
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
  src.buffer = a._noise; src.loop = true; f.type = 'lowpass'; f.frequency.value = kind === 'wind' ? 500 : kind === 'shaft' ? 220 : 160; f.Q.value = kind === 'wind' ? 2 : .7;
  g.gain.value = 0; g.gain.linearRampToValueAtTime(kind === 'wind' ? .09 : .045, c.currentTime + 1.2);
  lfo.frequency.value = kind === 'wind' ? .13 : .07; lg.gain.value = kind === 'wind' ? 280 : 40; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
  src.connect(f); f.connect(g); g.connect(a._sfxBus); src.start(); AU.amb = { src, g };
};

// ---------------------------------------------------------------- listeners: the bus drives all sound
AU.wire = function () {
  const B = S7.bus, sfx = AU.sfx;
  B.on('shot', d => { const w = S7.reg.weapons[d.weapon]; sfx(w.sfx); });
  B.on('hit', d => { if (d.part === 'shield') sfx('clank'); else if (d.part === 'body') sfx('hitbody'); });
  B.on('crit', () => sfx('crit'));
  B.on('kill', d => { sfx('thaw'); });
  B.on('explode', d => sfx(d.big ? 'boom' : d.source === 'whiteout' ? 'boom' : 'boom', { vol: d.big ? 1 : .7 }));
  B.on('scan', () => sfx('scan'));
  B.on('hurt', () => sfx('hurt'));
  B.on('freeze', () => sfx('freeze'));
  B.on('rescue', () => sfx('rescue'));
  B.on('switch', () => sfx('switch'));
  B.on('ringon', () => sfx('ringon'));
  B.on('select', () => sfx('select'));
  B.on('deny', () => sfx('deny'));
  B.on('reload', () => sfx('reload'));
  B.on('pickup', d => sfx(d.kind === 'red' ? 'pickup_red' : d.kind === 'rime' ? 'pickup_rime' : 'pickup_item'));
  B.on('gate', d => { if (d.ok) sfx(d.how === 'echo' ? 'glass' : 'gate_open'); });
  B.on('skill', d => sfx(d.skill === 'echo' ? 'echo' : d.skill === 'rain' ? 'rain' : d.skill === 'flash' ? 'flash' : 'skill'));
  B.on('throw', () => sfx('throw'));
  B.on('splat', () => sfx('splat'));
  B.on('bossring', d => sfx('bell'));
  B.on('card', () => sfx('card'));
  B.on('wax', () => sfx('wax'));
  B.on('cut', () => sfx('cut'));
  B.on('save', () => sfx('chime'));
  B.on('music', d => AU.music(d.cue));
  B.on('talkchar', d => AU.speak(d.who, d.ch));
  B.on('laugh', d => { if (S7.st.mode === 'talk' || S7.st.mode === 'cutscene') return; AU.laugh(d.style, AU.bearing(d.x, d.y), d.loud * (d.enemy.visible > 0 ? 1 : 1.0), .9 + (d.enemy.id % 5) * .06); });
  B.on('area', d => { const A = S7.reg.areas[d.to]; if (!A) return; AU.music(A.music); AU.ambience(A.ambience === 'wind' ? 'wind' : A.ambience === 'shaft' ? 'shaft' : A.ambience === 'hotel' ? 'hum' : 'hum'); });
  B.on('echo', d => { if (d.kind === 'go') sfx('go'); if (d.kind === 'finish') sfx('win'); });
};

/* ===== src/80-ui.js ===== */
// UI kit: glyph prompts that follow the last device, panels, focus lists (pad, keys and mouse), text helpers.
const UI = S7.ui = { stack: [], game: null, hover: null, click: null, nav: { dx: 0, dy: 0, ok: false, back: false, tabL: false, tabR: false, ptr: null, clk: null, moved: false } };
const col = { red: '#d81e2a', ink: '#0c0a12', paper: '#f4f0e8', dim: '#8a8498', gold: '#f5b700', ice: '#bfe8ff', panel: '#14101c', line: '#e8e4f0' };
UI.col = col;
const F = () => S7.E.font;

UI.text = (g, s, x, y, color = col.paper, o = {}) => F().text(g, String(s), x, y, color, Object.assign({ shadow: '#000' }, o));
UI.w = (s, o) => F().width(String(s), o);
UI.panel = (g, x, y, w, h, o = {}) => {
  g.save && g.save(); g.globalAlpha = o.alpha === undefined ? .86 : o.alpha; g.fillStyle = o.fill || col.panel; g.fillRect(x, y, w, h); g.globalAlpha = 1;
  g.fillStyle = o.border || col.line; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
  if (o.accent) { g.fillStyle = o.accent; g.fillRect(x, y, 3, h); }
  g.restore && g.restore();
};
UI.bar = (g, x, y, w, h, frac, color, back = '#201820') => { g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = back; g.fillRect(x, y, w, h); g.fillStyle = color; g.fillRect(x, y, Math.max(0, Math.round(w * S7.clamp(frac, 0, 1))), h); };
UI.wrap = (s, w, o) => F().wrap(String(s), w, o);

// ---- glyphs: what the player's own device calls the button
UI.label = action => { const g = UI.game; return g ? g.input.label(action) : ''; };
const SHORT = { 'Left click': 'LMB', 'Right click': 'RMB', 'Middle click': 'MMB', Space: 'SPACE', Escape: 'ESC', Enter: 'ENTER', Backspace: 'BKSP', 'L stick ↑': 'L↑' };
UI.glyphW = lab => {
  if (['✕', '○', '□', '△'].includes(lab)) return 11;
  return Math.max(11, UI.w((SHORT[lab] || lab).toUpperCase()) + 6);
};
UI.glyph = (g, action, x, y) => {   // x,y = top-left; returns width
  const I = UI.game.input, lab = I.label(action) || '?', style = I.padStyle ? I.padStyle() : 'xbox', pad = I.lastDevice === 'gamepad', cx = x + 5, cy = y + 5;
  g.save && g.save();
  if (pad && ['✕', '○', '□', '△'].includes(lab)) {
    g.fillStyle = '#0a0a10'; g.beginPath(); g.arc(cx + .5, cy + .5, 5.5, 0, 7); g.fill();
    const c = { '✕': '#7ab8ff', '○': '#ff6a6a', '□': '#ff9ad8', '△': '#6ae0a8' }[lab]; g.strokeStyle = c; g.fillStyle = c; g.lineWidth = 1.4;
    g.beginPath();
    if (lab === '✕') { g.moveTo(cx - 2.4, cy - 2.4); g.lineTo(cx + 3.4, cy + 3.4); g.moveTo(cx + 3.4, cy - 2.4); g.lineTo(cx - 2.4, cy + 3.4); g.stroke(); }
    else if (lab === '○') { g.arc(cx + .5, cy + .5, 2.8, 0, 7); g.stroke(); }
    else if (lab === '□') g.strokeRect(cx - 2, cy - 2, 5, 5);
    else { g.moveTo(cx + .5, cy - 3); g.lineTo(cx + 3.4, cy + 2.4); g.lineTo(cx - 2.4, cy + 2.4); g.closePath(); g.stroke(); }
    g.restore && g.restore(); return 11;
  }
  if (pad && style !== 'playstation' && ['A', 'B', 'X', 'Y'].includes(lab)) {
    const c = { A: '#5ad07a', B: '#ff6a6a', X: '#6aa8ff', Y: '#ffd24a' }[lab]; g.fillStyle = '#0a0a10'; g.beginPath(); g.arc(cx + .5, cy + .5, 5.5, 0, 7); g.fill(); g.fillStyle = c; F().text(g, lab, cx - 2, cy - 3, c, { shadow: false }); g.restore && g.restore(); return 11;
  }
  const t = (SHORT[lab] || lab).toUpperCase(), w = Math.max(11, UI.w(t) + 6);
  g.fillStyle = '#0a0a10'; g.fillRect(x, y, w, 11); g.fillStyle = pad ? '#46465e' : '#d8d4e4'; g.fillRect(x, y, w, 1); g.fillRect(x, y + 10, w, 1); g.fillRect(x, y, 1, 11); g.fillRect(x + w - 1, y, 1, 11);
  F().text(g, t, x + 3, y + 2, pad ? '#e8e8ff' : '#f4f0e8', { shadow: false }); g.restore && g.restore(); return w;
};
UI.prompt = (g, x, y, action, text, o = {}) => {   // glyph + text; returns the width used
  const w = UI.glyph(g, action, x, y); UI.text(g, text, x + w + 3, y + 2, o.color || col.paper, o); return w + 3 + UI.w(text);
};
UI.promptRow = (g, items, x, y, align = 'left') => {   // [[action, text], ...]
  let total = 0; for (const [a, t] of items) total += UI.glyphW(UI.label(a)) + 3 + UI.w(t) + 8;
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (const [a, t] of items) { cx += UI.prompt(g, cx, y, a, t) + 8; }
};
UI.fmt = s => String(s).replace(/\{(\w+)\}/g, (m, a) => { const l = UI.label(a); return l ? l : m; });
S7.fmt = UI.fmt;

// ---- navigation: one reading of the pad, keys and mouse per step for every menu screen
UI.readNav = function (game) {
  const I = game.input, n = UI.nav; n.dx = 0; n.dy = 0;
  if (I.repeat('up', .35, .1)) n.dy = -1; if (I.repeat('down', .35, .1)) n.dy = 1; if (I.repeat('left', .35, .1)) n.dx = -1; if (I.repeat('right', .35, .1)) n.dx = 1;
  n.ok = I.pressed('confirm') || I.pressed('start'); n.back = I.pressed('cancel') || I.pressed('pause'); n.tabL = I.pressed('scan'); n.tabR = I.pressed('ring');
  const p = I.pointer(); n.moved = !!(p && n.ptr && (p[0] !== n.ptr[0] || p[1] !== n.ptr[1])) && I.lastDevice !== 'gamepad';; n.ptr = p ? p.slice() : null;   // the pointer itself moving is what hover means
  n.clk = I.clicked ? I.clicked() : null;
  return n;
};
// a FocusList: rows with a cursor. items: { label, value(): string, disabled, kind, onPick, onLeft, onRight, sub }
class FocusList {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = Object.assign({ x: 20, y: 40, w: 200, rowH: 13, scale: 1 }, o); this.scroll = 0; }
  rect(i) { const o = this.o; return [o.x, o.y + (i - this.scroll) * o.rowH, o.w, o.rowH]; }
  update(n) {
    const it = this.items, o = this.o; if (!it.length) return;
    const max = o.rows || it.length; if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + max) this.scroll = this.i - max + 1;
    if (n.dy) { let k = this.i, c = 0; do { k = (k + n.dy + it.length) % it.length; c++; } while (it[k].disabled === 'skip' && c < it.length); if (k !== this.i) { this.i = k; S7.audio.sfx('select'); } }
    const cur = it[this.i];
    if (n.dx && cur) { if (n.dx < 0 && cur.onLeft) { cur.onLeft(); S7.audio.sfx('select'); } if (n.dx > 0 && cur.onRight) { cur.onRight(); S7.audio.sfx('select'); } }
    if (n.moved && n.ptr) { for (let k = this.scroll; k < Math.min(it.length, this.scroll + max); k++) { const r = this.rect(k); if (n.ptr[0] >= r[0] && n.ptr[0] < r[0] + r[2] && n.ptr[1] >= r[1] && n.ptr[1] < r[1] + r[3] && k !== this.i && it[k].disabled !== 'skip') { this.i = k; } } }
    if (n.clk) { for (let k = this.scroll; k < Math.min(it.length, this.scroll + max); k++) { const r = this.rect(k); if (n.clk[0] >= r[0] && n.clk[0] < r[0] + r[2] && n.clk[1] >= r[1] && n.clk[1] < r[1] + r[3]) { this.i = k; const c = it[k]; if (c.onPick && !c.disabled) { c.onPick(); S7.audio.sfx('confirm2'); } else if (c.slider) { const f = (n.clk[0] - (r[0] + r[2] - 74)) / 70; if (f >= 0 && f <= 1) c.set(c.min + (c.max - c.min) * f); } } } }
    if (n.ok && cur && cur.onPick && !cur.disabled) { cur.onPick(); S7.audio.sfx('confirm2'); }
    if (n.ok && cur && cur.disabled && cur.disabled !== 'skip') S7.audio.sfx('deny');
  }
  draw(g) {
    const o = this.o, it = this.items, max = o.rows || it.length;
    for (let k = this.scroll; k < Math.min(it.length, this.scroll + max); k++) {
      const c = it[k], r = this.rect(k), sel = k === this.i;
      if (sel) { g.fillStyle = col.red; g.globalAlpha = .9; g.fillRect(r[0] - 2, r[1], r[2] + 4, r[3] - 1); g.globalAlpha = 1; }
      const dis = !!c.disabled; const lab = typeof c.label === 'function' ? c.label() : c.label;
      UI.text(g, lab, r[0] + 3, r[1] + 3, dis ? '#6a647a' : sel ? '#fff' : col.paper, { shadow: sel ? '#000' : '#000' });
      if (c.value) { const v = c.value(); UI.text(g, v, r[0] + r[2] - UI.w(v) - 3, r[1] + 3, sel ? '#fff' : col.gold); }
      if (c.slider) { const fx = r[0] + r[2] - 74, f = (c.get() - c.min) / (c.max - c.min); g.fillStyle = '#000'; g.fillRect(fx, r[1] + 4, 70, 4); g.fillStyle = sel ? '#fff' : col.gold; g.fillRect(fx, r[1] + 5, Math.round(70 * S7.clamp(f, 0, 1)), 2); g.fillRect(fx + Math.round(70 * S7.clamp(f, 0, 1)) - 1, r[1] + 2, 3, 8); }
    }
    if (it.length > max) { UI.text(g, this.scroll > 0 ? '▲' : '', o.x + o.w - 8, o.y - 9, col.dim); UI.text(g, this.scroll + max < it.length ? 'v' : '', o.x + o.w - 8, o.y + max * o.rowH + 1, col.dim); }
  }
}
UI.FocusList = FocusList;

// ---- the screen stack: modal screens freeze the sim
UI.push = s => { UI.stack.push(s); if (s.open) s.open(); S7.st.prevModeModal = S7.st.mode; };
UI.pop = () => { const s = UI.stack.pop(); if (s && s.close) s.close(); };
UI.top = () => UI.stack[UI.stack.length - 1];
UI.updateTop = function (dt, game) { const s = UI.top(); if (!s) return false; const n = UI.readNav(game); s.update(dt, n, game); return true; };
UI.drawStack = function (r) { for (const s of UI.stack) s.draw(r); };
UI.dim = (g, W, H, a = .6) => { g.globalAlpha = a; g.fillStyle = '#05030a'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; };

/* ===== src/81-hud.js ===== */
// The in-play HUD, dialog, title cards and the coat ring. Drawn over the 3D picture with the 2D engine's overlay.
UI.zones = [];
const proj = (x, y, z) => { const w = S7.pres.world; if (!w) return null; try { return w.project(x * 16, y * 16, z * 16); } catch (e) { return null; } };
UI.proj = proj;
const PCOL = id => S7.reg.personas[id].color;
const modeHint = st => st.mode;

UI.hud = function (r, game) {
  const st = S7.st, W = r.W, H = r.H, Pres = S7.pres, I = game.input;
  UI.zones = [];
  // projections need the world; compute before the overlay callback
  const marks = [];
  if (Pres.world && st.area === Pres.areaId) {
    if (st.mode === 'junction') st.options.forEach((o, i) => { const p = proj(o.x, o.y, st.z + 1.2); if (p) marks.push({ kind: 'branch', i, p, o }); });
    if (['rail', 'junction'].includes(st.mode)) { for (const sp of S7.graph().A.spots) { if (sp.kind === 'pickup') continue; const sp3 = S7.sim.spotPos(sp), p = proj(sp3.x, sp3.y, sp3.z + 2.3); if (p) marks.push({ kind: 'spot', sp, p, near: st.prompt && st.prompt.id === sp.id }); } }
    if (st.mode === 'aim' || st.mode === 'rail' || st.mode === 'ski' || st.mode === 'lift') for (const e of st.enemies) { if (e.dead || !(e.visible > 0)) continue; const p = proj(e.x, e.y, e.z + e.def.h + .5); if (p) marks.push({ kind: 'enemy', e, p }); }
    if (st.boss && !st.boss.dead) { const p = proj(st.boss.x, st.boss.y, st.boss.z + st.boss.cy * 2); if (p) marks.push({ kind: 'boss', p }); }
  }
  r.overlay(g => {
    const rig = Pres.rigs && Pres.rigs[st.persona], per = S7.reg.personas[st.persona], ro = st.roster[st.persona];
    const aim = st.mode === 'aim';
    // ---- hurt vignette & freeze
    if (st.hurtT > 0) { g.globalAlpha = Math.min(.5, st.hurtT); g.fillStyle = '#d81e2a'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (st.mode === 'frozen') { g.globalAlpha = .5; g.fillStyle = '#bfe8ff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; UI.text(g, S7.reg.personas[st.persona].name.toUpperCase() + ' HAS FROZEN', W / 2, H / 2 - 8, '#0c2a4a', { align: 'center', scale: 2, shadow: '#fff' }); }
    // ---- junction & spot markers
    for (const m of marks) {
      if (m.kind === 'branch') {
        const sel = m.i === st.sel, x = Math.round(m.p[0]), y = Math.round(m.p[1]), a = m.o.ang;
        g.save(); g.translate(x, y); const cam = S7.st.cam, cy = Math.atan2(cam.ly - cam.y, cam.lx - cam.x), sd = S7.sim.steerDot(a), sa = Math.atan2(-sd[1], sd[0]);
        g.rotate(sa); g.fillStyle = sel ? col.red : '#e8e4f0'; g.globalAlpha = sel ? 1 : .75; g.beginPath(); g.moveTo(9, 0); g.lineTo(-5, -7); g.lineTo(-2, 0); g.lineTo(-5, 7); g.closePath(); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke(); g.restore(); g.globalAlpha = 1;
        const lab = m.o.label || ''; if (sel && lab) UI.text(g, lab, x - UI.w(lab) / 2, y + 11, m.o.gate && !S7.sim.gateOpen(m.o.gate) ? col.gold : '#fff');
        UI.zones.push({ r: [x - 12, y - 12, 24, 24], kind: 'branch', i: m.i });
      } else if (m.kind === 'spot') {
        const x = Math.round(m.p[0]), y = Math.round(m.p[1]);
        if (m.near) { const t = m.sp.label; const w = UI.w(t) + UI.glyphW(UI.label('interact')) + 12; UI.panel(g, x - w / 2, y - 14, w, 14, { fill: '#000', alpha: .6, border: col.red }); UI.glyph(g, 'interact', x - w / 2 + 3, y - 12); UI.text(g, t, x - w / 2 + 9 + UI.glyphW(UI.label('interact')), y - 10, '#fff'); UI.zones.push({ r: [x - w / 2, y - 14, w, 14], kind: 'spot', id: m.sp.id }); }
        else { g.fillStyle = col.red; g.fillRect(x - 2, y - 2, 4, 4); }
      }
    }
    // ---- enemy tags in aim: show hp ticks near revealed
    // ---- the status block
    const quiet = st.mode === 'talk' || st.mode === 'cutscene';
    if (!quiet) {
      UI.panel(g, 4, H - 46, 126, 42, { alpha: .72 });
      if (rig) { try { rig.drawPortrait(g, 6, H - 44, 36); } catch (e) { /* rig busy */ } }
      UI.text(g, per.name.split(' ')[0].toUpperCase(), 46, H - 43, PCOL(st.persona), { scale: 1 });
      UI.text(g, per.skillName.toUpperCase(), 46, H - 33, st.skillCd > 0 ? col.dim : '#e8e4f0');
      const max = S7.sim.personaMax(st.persona); UI.bar(g, 46, H - 22, 80, 5, ro.hp / max, ro.hp / max < .3 ? '#ff4a3a' : '#e8e4f0');
      const w = S7.sim.weapon(); const rl = ro.reload > 0; const ammo = rl ? 'RELOAD' : (st.cheats.infAmmo ? '∞' : ro.ammo + '/' + w.mag);
      UI.text(g, rl ? 'RELOAD' : (st.cheats.infAmmo ? 'AMMO INF' : 'AMMO ' + ro.ammo + '/' + w.mag), 46, H - 14, rl ? col.gold : '#e8e4f0');
      // the Seven, as small pips
      S7.ROSTER.forEach((id, i) => { const rr = st.roster[id]; g.fillStyle = !rr.unlocked ? '#2a2630' : rr.frozen ? '#7ac8ff' : PCOL(id); g.globalAlpha = id === st.persona ? 1 : .6; g.fillRect(8 + i * 5, H - 7, 4, id === st.persona ? 4 : 2); g.globalAlpha = 1; });
    }
    if (!quiet) { UI.panel(g, 4, 4, 106, 28, { alpha: .6 });
    UI.text(g, 'RED', 8, 8, '#ff5a5a'); UI.bar(g, 28, 8, 78, 5, st.red / S7.sim.redMax(), '#e01828'); UI.text(g, String(Math.round(st.red)), 28 + 78 - UI.w(String(Math.round(st.red))), 8, '#fff', { shadow: false });
    UI.text(g, 'RIME ' + st.rime, 8, 19, '#8fe8ff'); UI.text(g, 'PINS ' + st.pins.length + '/7', 58, 19, col.gold); }
    // ---- objective
    if (st.objective && !aim && !quiet && !(st.boss && !st.boss.dead)) { const lines = UI.wrap(st.objective, Math.min(W - 250, 260), {}); let y = 4; for (const l of lines.slice(0, 3)) { UI.text(g, l, W / 2 - UI.w(l) / 2, y, '#e8e4f0', { shadow: '#000' }); y += 9; } }
    if (st.hint && !aim && ['rail', 'junction'].includes(st.mode)) { const lines = UI.wrap(st.hint, W - 90, {}); let y = H - 66 - (lines.length - 1) * 9; for (const l of lines) { UI.text(g, l, W / 2 - UI.w(l) / 2, y, col.gold); y += 9; } }
    // ---- context prompts
    const rows = [];
    if (st.mode === 'rail') { rows.push(['go', 'RUN']); rows.push(['turn', 'ABOUT-FACE']); rows.push(['aim', 'AIM']); if (st.prompt && st.prompt.kind !== 'gate') rows.push(['interact', st.prompt.label || 'USE']); else if (st.prompt) rows.push(['interact', st.prompt.label]); rows.push(['ring', 'COATS']); }
    else if (st.mode === 'junction') { rows.push(['go', 'GO']); rows.push(['turn', 'BACK']); rows.push(['aim', 'AIM']); rows.push(['ring', 'COATS']); }
    else if (st.mode === 'aim') { rows.push(['fire', 'FIRE']); rows.push(['scan', st.scanCd > 0 ? 'SCAN ' + st.scanCd.toFixed(1) : 'SCAN']); rows.push(['skill', per.skillName.toUpperCase()]); rows.push(['reload', 'RELOAD']); }
    else if (st.mode === 'ski') { rows.push(['go', 'TUCK']); rows.push(['turn', 'STOP']); rows.push(['aim', 'AIM']); }
    else if (st.mode === 'lift') { rows.push(['aim', 'AIM']); rows.push(['scan', 'SCAN']); }
    if (rows.length && !st.cut) UI.promptRow(g, rows, W - 6, H - 14, 'right');
    // ---- aim: reticle, scan ring, laugh bearings
    if (aim) {
      const cx = Math.round(W / 2), cy = Math.round(H / 2), rd = st.aim.zoom ? 5 : 8;
      g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); g.arc(cx + .5, cy + .5, rd, 0, 7); g.stroke();
      g.fillStyle = '#fff'; g.fillRect(cx, cy, 1, 1); g.fillRect(cx - rd - 4, cy, 4, 1); g.fillRect(cx + rd + 1, cy, 4, 1); g.fillRect(cx, cy - rd - 4, 1, 4); g.fillRect(cx, cy + rd + 1, 1, 4);
      if (st.scanCd > 0) { g.strokeStyle = '#8fe8ff'; g.beginPath(); g.arc(cx + .5, cy + .5, rd + 4, -Math.PI / 2, -Math.PI / 2 + 6.28 * (1 - st.scanCd / S7.T('scanCooldown'))); g.stroke(); }
      if (st.aim.zoom) { g.strokeStyle = '#000'; g.lineWidth = 40; g.beginPath(); g.arc(cx, cy, H * .5 + 30, 0, 7); g.stroke(); }
      // bearing ticks for hidden laughs
      for (const e of st.enemies) {
        if (e.dead || e.visible > 0 || e.spawnT > 0) continue; const d = Math.hypot(e.x - st.x, e.y - st.y); if (d > 24) continue;
        const rel = S7.angDiff(st.aim.yaw, Math.atan2(e.y - st.y, e.x - st.x)), a = rel - Math.PI / 2, rr = Math.min(W, H) * .36, px = cx + Math.cos(a + Math.PI / 2) * 0, tx = cx + Math.sin(rel) * rr, ty = cy - Math.cos(rel) * rr * .8;
        if (Math.abs(rel) < .35) continue;
        g.fillStyle = '#9ad0ff'; g.globalAlpha = .4 + .5 * (1 - d / 24); g.beginPath(); g.arc(tx, ty, 2.5, 0, 7); g.fill(); g.globalAlpha = 1;
      }
    }
    // revealed enemies get a marker above them
    for (const m of marks) if (m.kind === 'enemy') { const x = Math.round(m.p[0]), y = Math.round(m.p[1]); g.fillStyle = '#ff5a3a'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - 5); g.lineTo(x + 3, y - 5); g.fill(); }
    // ---- boss bar
    const b = st.boss; if (b && !b.dead) { const bw = 160, bx = W / 2 - bw / 2; UI.text(g, b.name, W / 2 - UI.w(b.name) / 2, 16, '#fff'); UI.bar(g, bx, 26, bw, 5, b.hp / b.hpMax, '#d81e2a'); if (b.warmOpen()) UI.text(g, 'WARM SPOT OPEN!', W / 2 - UI.w('WARM SPOT OPEN!') / 2, 33, '#ff6a40'); }
    // ---- toasts
    let ty = 38; for (const t of st.toasts) { g.globalAlpha = Math.min(1, t.t); const w = UI.w(t.text) + 10; UI.panel(g, W - w - 4, ty, w, 12, { fill: '#000', alpha: .6, border: col.red }); UI.text(g, t.text, W - w + 1, ty + 3, '#fff'); ty += 14; g.globalAlpha = 1; }
    // ---- Echo Run
    if (st.echo) { const ec = st.echo; const t = ec.countdown > 0 ? 0 : ec.t; UI.panel(g, W / 2 - 50, 4, 100, 28, { alpha: .65 }); UI.text(g, 'ECHO RUN', W / 2 - UI.w('ECHO RUN') / 2, 7, col.gold); UI.text(g, S7.fmtTime(Math.max(0, t - ec.hits * 2)), W / 2 - UI.w(S7.fmtTime(t)) / 2, 17, '#fff', { scale: 1 }); UI.text(g, 'TARGETS ' + ec.hits + '/' + ec.total, W / 2 - 30, 26, '#8fe8ff');
      if (ec.countdown > 0) UI.text(g, String(Math.ceil(ec.countdown)), W / 2, H / 2 - 12, '#fff', { scale: 4, align: 'center' }); }
    // ---- the coat ring
    if (st.mode === 'ring') UI.drawRing(g, W, H, game);
    // ---- cards, dialog
    UI.drawCard(g, W, H); UI.drawTalk(g, W, H, game);
    // ---- transition fade
    if (st.mode === 'transition') { g.globalAlpha = S7.clamp(1 - st.transT / .5, 0, 1); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (st.fadeIn > 0) { g.globalAlpha = S7.clamp(st.fadeIn / .5, 0, 1); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  });
};
UI.drawRing = function (g, W, H, game) {
  const st = S7.st, cx = W / 2, cy = H / 2 - 4, R = Math.min(W, H) * .3;
  UI.dim(g, W, H, .55);
  S7.ROSTER.forEach((id, i) => {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 7, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * .9, p = S7.reg.personas[id], r = st.roster[id], sel = i === st.ringSel, ok = r.unlocked && !r.frozen;
    const s = sel ? 40 : 32;
    g.fillStyle = sel ? p.color : '#14101c'; g.globalAlpha = ok ? 1 : .45; g.fillRect(x - s / 2 - 2, y - s / 2 - 2, s + 4, s + 4); g.fillStyle = '#1c1628'; g.fillRect(x - s / 2, y - s / 2, s, s); g.globalAlpha = ok ? 1 : .4;
    try { S7.pres.rigs[id].drawPortrait(g, x - s / 2, y - s / 2, s); } catch (e) { /* busy */ }
    g.globalAlpha = 1;
    UI.text(g, String(i + 1), x - s / 2 + 1, y - s / 2 + 1, '#fff'); if (!r.unlocked) UI.text(g, '?', x - 2, y - 3, '#aaa'); if (r.frozen) UI.text(g, 'ICE', x - 5, y + s / 2 - 8, '#7ac8ff');
    UI.zones.push({ r: [x - s / 2, y - s / 2, s, s], kind: 'slot', i });
  });
  const id = S7.ROSTER[st.ringSel] || st.persona, p = S7.reg.personas[id], r = st.roster[id];
  UI.text(g, p.name.toUpperCase(), cx - UI.w(p.name) / 2, cy - 14, p.color, { scale: 1 });
  UI.text(g, p.title.toUpperCase(), cx - UI.w(p.title) / 2, cy - 4, '#e8e4f0');
  UI.text(g, S7.reg.weapons[p.weapon].name.toUpperCase() + ' / ' + p.skillName.toUpperCase(), cx - UI.w(S7.reg.weapons[p.weapon].name + ' / ' + p.skillName) / 2, cy + 6, col.gold);
  const ln = r.unlocked ? (r.frozen ? 'FROZEN: THE SWEEP WILL COME' : 'HP ' + Math.round(r.hp) + '/' + S7.sim.personaMax(id)) : 'NOT YET FOUND'; UI.text(g, ln, cx - UI.w(ln) / 2, cy + 16, r.frozen ? '#7ac8ff' : '#e8e4f0');
  UI.text(g, 'RELEASE TO WEAR', cx - UI.w('RELEASE TO WEAR') / 2, H - 14, col.dim);
};
UI.drawCard = function (g, W, H) {
  const c = S7.st.card; if (!c) return; const k = c.t0 - c.t, a = Math.min(1, k * 3, c.t * 2);
  g.globalAlpha = Math.max(0, a); g.fillStyle = '#000'; g.fillRect(0, H / 2 - 36, W, 72); g.fillStyle = col.red; g.fillRect(0, H / 2 - 36, W, 2); g.fillRect(0, H / 2 + 34, W, 2);
  S7.E.font.title(g, c.title, W / 2, H / 2 - 26, { scale: 3, align: 'center', colors: ['#ffffff', '#d81e2a'], outline: '#000' });
  UI.text(g, c.sub, W / 2, H / 2 + 14, '#e8e4f0', { align: 'center' }); g.globalAlpha = 1;
};
const NAMEOF = who => S7.reg.personas[who] ? S7.reg.personas[who].name.toUpperCase() : (S7.NAMES[who] !== undefined ? S7.NAMES[who] : who.toUpperCase());
UI.drawTalk = function (g, W, H, game) {
  const tk = S7.st.talk; if (!tk) return;
  const bw = W - 24, bx = 12, bh = 52, by = H - bh - 8, rig = S7.pres.rigs[tk.who];
  UI.panel(g, bx, by, bw, bh, { fill: '#0c0a14', alpha: .93, accent: S7.reg.personas[tk.who] ? S7.reg.personas[tk.who].color : col.red });
  let tx = bx + 8;
  if (rig) { g.fillStyle = '#1c1628'; g.fillRect(bx + 6, by + 6, 40, 40); try { rig.drawPortrait(g, bx + 6, by + 6, 40); } catch (e) { /* busy */ } tx = bx + 54; }
  const nm = tk.name || NAMEOF(tk.who); if (nm) UI.text(g, nm, tx, by + 5, S7.reg.personas[tk.who] ? S7.reg.personas[tk.who].color : col.gold);
  const txt = UI.fmt(tk.text), shown = txt.slice(0, Math.floor(tk.shown)), lines = UI.wrap(txt, bx + bw - tx - 10, {});
  let acc = 0, y = by + 16; for (const l of lines.slice(0, 4)) { const part = shown.slice(acc, acc + l.length + 1); UI.text(g, part, tx, y, '#fff'); acc += l.length + 1; y += 9; }
  if (tk.shown >= tk.text.length) { UI.glyph(g, 'confirm', bx + bw - 22, by + bh - 14); }
  UI.zones.push({ r: [bx, by, bw, bh], kind: 'talk' });
};

/* ===== src/82-screens.js ===== */
// Canvas screens: Wardrobe, Wax Bench, Field Notes (map, Dossier, items), Results, Game Over, About.
const SCREENS = S7.screens = {};
const frame = (g, W, H, title, sub) => {
  UI.dim(g, W, H, .78);
  g.fillStyle = col.red; g.fillRect(0, 14, W, 1); g.fillRect(0, 31, W, 1);
  S7.E.font.title(g, title, 14, 17, { scale: 1, colors: ['#ffffff', '#d81e2a'], outline: '#000' });
  if (sub) UI.text(g, sub, W - 10 - UI.w(sub), 20, col.dim);
};

// ---------------------------------------------------------------- Wardrobe
SCREENS.Wardrobe = class {
  constructor() { this.i = Math.max(0, S7.ROSTER.indexOf(S7.st.persona)); }
  update(dt, n) {
    if (n.dx) { this.i = (this.i + n.dx + 7) % 7; S7.audio.sfx('select'); }
    if (n.clk) { for (const z of UI.zones) if (z.kind === 'wslot' && n.clk[0] >= z.r[0] && n.clk[0] < z.r[0] + z.r[2] && n.clk[1] >= z.r[1] && n.clk[1] < z.r[1] + z.r[3]) { if (this.i === z.i) n.ok = true; this.i = z.i; } }
    if (n.moved && n.ptr) for (const z of UI.zones) if (z.kind === 'wslot' && n.ptr[0] >= z.r[0] && n.ptr[0] < z.r[0] + z.r[2] && n.ptr[1] >= z.r[1] && n.ptr[1] < z.r[1] + z.r[3]) this.i = z.i;
    if (n.ok) { const id = S7.ROSTER[this.i], r = S7.st.roster[id]; if (r.unlocked && !r.frozen) { S7.sim.switchTo(id, true); UI.pop(); } else S7.audio.sfx('deny'); }
    if (n.back) UI.pop();
  }
  draw(r) {
    const W = r.W, H = r.H; UI.zones = UI.zones.filter(z => z.kind !== 'wslot');
    r.overlay(g => {
      frame(g, W, H, 'THE WARDROBE', 'SEVEN COATS, ONE BODY');
      const sw = Math.floor((W - 16) / 7);
      S7.ROSTER.forEach((id, i) => {
        const p = S7.reg.personas[id], rr = S7.st.roster[id], x = 8 + i * sw, y = 40, sel = i === this.i, cur = id === S7.st.persona;
        g.fillStyle = sel ? p.color : '#2a2236'; g.fillRect(x, y, sw - 3, 52); g.fillStyle = '#14101c'; g.fillRect(x + 1, y + 1, sw - 5, 50);
        g.globalAlpha = rr.unlocked ? 1 : .35; try { S7.pres.rigs[id].drawPortrait(g, x + (sw - 3 - 40) / 2, y + 6, 40); } catch (e) { /* busy */ } g.globalAlpha = 1;
        UI.text(g, String(i + 1), x + 3, y + 3, '#fff'); if (cur) UI.text(g, 'WORN', x + sw - 24, y + 3, col.gold); if (rr.frozen) UI.text(g, 'ICE', x + 3, y + 42, '#7ac8ff'); if (!rr.unlocked) UI.text(g, '?', x + sw / 2 - 3, y + 24, '#aaa');
        UI.zones.push({ r: [x, y, sw - 3, 52], kind: 'wslot', i });
      });
      const id = S7.ROSTER[this.i], p = S7.reg.personas[id], rr = S7.st.roster[id], w = S7.reg.weapons[p.weapon];
      UI.panel(g, 8, 100, W - 16, H - 120, { alpha: .8, accent: p.color });
      if (rr.unlocked) {
        UI.text(g, p.name.toUpperCase(), 18, 106, p.color, { scale: 1 }); UI.text(g, p.title.toUpperCase(), 18, 116, '#e8e4f0');
        let y = 130; for (const l of UI.wrap(p.blurb, W - 40, {})) { UI.text(g, l, 18, y, '#cfc8dc'); y += 9; }
        y += 4; UI.text(g, 'GUN   ' + w.name.toUpperCase() + '  DMG ' + w.dmg + ' x' + w.pellets + '  MAG ' + w.mag, 18, y, '#e8e4f0'); y += 11;
        UI.text(g, 'SKILL ' + p.skillName.toUpperCase() + '  ' + SKILLTEXT[p.skill], 18, y, col.gold); y += 11;
        UI.text(g, 'HEALTH ' + Math.round(rr.hp) + '/' + S7.sim.personaMax(id) + (rr.frozen ? '   FROZEN' : ''), 18, y, rr.frozen ? '#7ac8ff' : '#e8e4f0');
      } else { UI.text(g, 'AN EMPTY HANGER', 18, 108, col.dim); UI.text(g, 'This coat has not been found yet.', 18, 122, col.dim); }
      UI.promptRow(g, [['confirm', 'WEAR'], ['cancel', 'CLOSE']], W - 8, H - 14, 'right'); UI.text(g, '< > CHOOSE', 10, H - 12, col.dim);
    });
  }
};
const SKILLTEXT = { flare: 'a flare shows everything for 10s', tuck: 'faster on rails and snow for 8s', longlook: 'zoom the scope while aiming', rain: 'buy open ropes; scatter coins', echo: 'shatter glass, stun nearby', flash: 'stun and reveal a cone', charge: 'blast ice; set a mine' };

// ---------------------------------------------------------------- Wax Bench
SCREENS.Bench = class {
  constructor() {
    this.list = new UI.FocusList(S7.UPGRADES.map(u => ({ label: () => u.name.toUpperCase(), value: () => { const c = S7.sim.upgradeCost(u.id); return 'LV ' + (S7.st.upg[u.id] || 0) + '/' + u.max + (c === null ? '' : '  ' + c + ' RIME'); },
      onPick: () => { const r = S7.sim.buyUpgrade(u.id); if (r === 'poor') { S7.audio.sfx('deny'); this.msg = 'NOT ENOUGH RIME'; } else if (r === 'max') { S7.audio.sfx('deny'); this.msg = 'ALREADY WAXED TO THE MAX'; } else { this.msg = u.name.toUpperCase() + ' WAXED!'; } } })), { x: 12, y: 44, w: 0, rowH: 14 });
    this.msg = '';
  }
  update(dt, n) { this.list.o.w = S7.game.W - 24; this.list.update(n); if (n.back) UI.pop(); }
  draw(r) {
    const W = r.W, H = r.H; this.list.o.w = W - 24;
    r.overlay(g => {
      frame(g, W, H, 'THE WAX BENCH', 'RIME ' + S7.st.rime);
      this.list.draw(g);
      const u = S7.UPGRADES[this.list.i]; UI.panel(g, 8, 44 + 7 * 14 + 6, W - 16, 40, { alpha: .7, accent: col.gold });
      UI.text(g, u.text, 16, 44 + 7 * 14 + 12, '#e8e4f0'); if (this.msg) UI.text(g, this.msg, 16, 44 + 7 * 14 + 26, col.gold);
      UI.promptRow(g, [['confirm', 'WAX'], ['cancel', 'CLOSE']], W - 8, H - 14, 'right');
    });
  }
};

// ---------------------------------------------------------------- Field notes: map, Dossier, items
SCREENS.Notes = class {
  constructor(tab) { this.tab = tab || 0; this.sel = 0; this.tabs = ['MAP', 'DOSSIER', 'ITEMS']; }
  update(dt, n) {
    if (n.tabL) { this.tab = (this.tab + 2) % 3; this.sel = 0; S7.audio.sfx('select'); } if (n.tabR) { this.tab = (this.tab + 1) % 3; this.sel = 0; S7.audio.sfx('select'); }
    if (n.dy && this.tab === 1) { const len = S7.st.dossier.filter(d => d !== 'd_seen').length; if (len) this.sel = (this.sel + n.dy + len) % len; }
    if (n.dx) { this.tab = (this.tab + n.dx + 3) % 3; this.sel = 0; S7.audio.sfx('select'); }
    if (n.clk) { UI.zones.filter(z => z.kind === 'ntab').forEach(z => { if (n.clk[0] >= z.r[0] && n.clk[0] < z.r[0] + z.r[2] && n.clk[1] >= z.r[1] && n.clk[1] < z.r[1] + z.r[3]) { this.tab = z.i; this.sel = 0; } }); }
    if (n.back || S7.game.input.pressed('map')) UI.pop();
  }
  draw(r) {
    const W = r.W, H = r.H, st = S7.st; UI.zones = UI.zones.filter(z => z.kind !== 'ntab');
    r.overlay(g => {
      frame(g, W, H, 'FIELD NOTES', S7.graph().A.title + ' / ' + S7.graph().A.sub);
      this.tabs.forEach((t, i) => { const x = 10 + i * 64; g.fillStyle = i === this.tab ? col.red : '#2a2236'; g.fillRect(x, 36, 60, 11); UI.text(g, t, x + 30 - UI.w(t) / 2, 38, '#fff'); UI.zones.push({ r: [x, 36, 60, 11], kind: 'ntab', i }); });
      const top = 52;
      if (this.tab === 0) this.drawMap(g, W, H, top);
      else if (this.tab === 1) {
        const ids = st.dossier.filter(d => d !== 'd_seen'), ent = S7.DOSSIER.filter(d => ids.includes(d[0]));
        if (!ent.length) UI.text(g, 'NOTHING YET. THE MOUNTAIN IS TIGHT-LIPPED.', 14, top + 8, col.dim);
        ent.forEach((d, i) => { const y = top + i * 11; if (y > H - 80) return; if (i === this.sel) { g.fillStyle = col.red; g.fillRect(8, y, 112, 10); } UI.text(g, d[1], 12, y + 1, i === this.sel ? '#fff' : '#cfc8dc'); });
        const d = ent[Math.min(this.sel, ent.length - 1)]; if (d) { UI.panel(g, 126, top, W - 134, H - top - 24, { alpha: .8 }); UI.text(g, d[1], 134, top + 6, col.gold); let y = top + 20; for (const l of UI.wrap(d[2], W - 150, {})) { UI.text(g, l, 134, y, '#e8e4f0'); y += 9; } }
      } else {
        UI.text(g, 'KEY ITEMS', 14, top, col.gold); let y = top + 12; const keys = Object.keys(st.items).filter(k => st.items[k]);
        if (!keys.length) { UI.text(g, 'none', 14, y, col.dim); y += 10; } for (const k of keys) { const it = S7.reg.items[k]; UI.text(g, it.name.toUpperCase(), 14, y, '#fff'); UI.text(g, it.text, 14, y + 9, '#a49cb8'); y += 22; }
        UI.text(g, 'LIFT PINS  ' + st.pins.length + '/7', W / 2 + 6, top, col.gold); y = top + 12;
        S7.PINS.forEach(p => { const has = st.pins.includes(p[0]); UI.text(g, has ? p[1].toUpperCase() : '? ? ?', W / 2 + 6, y, has ? '#fff' : '#5a546a'); if (has) UI.text(g, p[2].replace('Lift Pin: ', ''), W / 2 + 6, y + 9, '#8e86a4'); y += has ? 22 : 12; });
        UI.text(g, 'RED ' + Math.round(st.red) + '/' + S7.sim.redMax() + '   RIME ' + st.rime, 14, H - 36, '#ff6a6a');
      }
      UI.promptRow(g, [['scan', 'PREV TAB'], ['ring', 'NEXT TAB'], ['cancel', 'CLOSE']], W - 8, H - 14, 'right');
    });
  }
  drawMap(g, W, H, top) {
    const G = S7.graph(), st = S7.st, A = G.A; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const id in G.nodes) { const n = G.nodes[id]; x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
    const bw = W - 150, bh = H - top - 26, k = Math.min(bw / Math.max(8, x1 - x0), bh / Math.max(8, y1 - y0)), ox = 10 + (bw - (x1 - x0) * k) / 2, oy = top + (bh - (y1 - y0) * k) / 2;
    const P = (x, y) => [ox + (x - x0) * k, oy + (y - y0) * k];
    UI.panel(g, 6, top - 2, bw + 8, bh + 4, { alpha: .6 });
    for (const id of G.eorder) { const e = G.edges[id]; g.strokeStyle = e.gate && !S7.sim.gateOpen(e.gate) ? '#a07020' : '#8a84a0'; g.lineWidth = 1; g.beginPath(); e.pts.forEach((p, i) => { const q = P(p.x, p.y); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.stroke(); }
    for (const id in G.nodes) { const n = G.nodes[id], q = P(n.x, n.y); g.fillStyle = n.kind === 'exit' ? col.gold : n.edges.length >= 3 ? '#fff' : '#a49cb8'; g.fillRect(q[0] - 2, q[1] - 2, 4, 4); }
    for (const sp of A.spots) if (sp.kind !== 'pickup') { const s3 = S7.sim.spotPos(sp), q = P(s3.x, s3.y); g.fillStyle = '#6ae0a8'; g.fillRect(q[0] - 1, q[1] - 5, 3, 3); }
    const h = P(st.x, st.y); g.fillStyle = col.red; g.beginPath(); g.arc(h[0], h[1], 3.5, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.stroke();
    for (const e of st.enemies) if (!e.dead && e.visible > 0) { const q = P(e.x, e.y); g.fillStyle = '#ff9a3a'; g.fillRect(q[0] - 1, q[1] - 1, 3, 3); }
    UI.text(g, 'OBJECTIVE', bw + 20, top, col.gold); let y = top + 11; for (const l of UI.wrap(st.objective || 'Survive.', 120, {})) { UI.text(g, l, bw + 20, y, '#e8e4f0'); y += 9; }
    y += 6; UI.text(g, 'KEY', bw + 20, y, col.gold); y += 11; UI.text(g, 'RED DOT  YOU', bw + 20, y, col.red); UI.text(g, 'GOLD  EXIT', bw + 20, y + 9, col.gold); UI.text(g, 'GREEN  PEOPLE', bw + 20, y + 18, '#6ae0a8'); UI.text(g, 'BROWN  LOCKED', bw + 20, y + 27, '#a07020');
  }
};

// ---------------------------------------------------------------- Results
SCREENS.Results = class {
  constructor(res) { this.res = res; this.t = 0; }
  update(dt, n) { this.t += dt; if ((n.ok || n.back || n.clk) && this.t > .8) { UI.pop(); } }
  draw(r) {
    const W = r.W, H = r.H, s = this.res.stats; r.overlay(g => {
      frame(g, W, H, 'TARGET ' + this.res.target + ' CLEARED', 'THE DEPARTMENT IS PLEASED');
      const rows = [['WHITEOUTS THAWED', s.kills], ['WARM SPOT HITS', s.crits], ['DAMAGE TAKEN', s.damage], ['TIME', S7.fmtTime(s.time)], ['ACCURACY', s.acc + '%'], ['LIFT PINS', s.pins + '/7']];
      rows.forEach((q, i) => { const y = 50 + i * 14; if (this.t > .15 * i) { UI.text(g, q[0], 30, y, '#cfc8dc'); const v = String(q[1]); UI.text(g, v, W / 2 + 20 - UI.w(v) + 30, y, '#fff'); } });
      if (this.t > 1) { S7.E.font.title(g, this.res.rank, W / 2 + 70, 56, { scale: 5, colors: ['#ffffff', '#d81e2a'], outline: '#000' }); UI.text(g, 'RANK', W / 2 + 74, 46, col.gold); }
      if (this.t > .8) UI.promptRow(g, [['confirm', 'CONTINUE']], W - 8, H - 14, 'right');
    });
  }
};

// ---------------------------------------------------------------- Game over
SCREENS.GameOver = class {
  constructor() {
    this.list = new UI.FocusList([
      { label: 'CONTINUE (THE SWEEP ARRIVES)', onPick: () => { S7.sim.continueAfterOver(); } },
      { label: 'QUIT TO TITLE', onPick: () => { S7.quitToTitle(); } }], { x: 40, y: 90, w: 240, rowH: 14 }); this.t = 0;
  }
  update(dt, n) { this.t += dt; if (this.t > .6) this.list.update(n); }
  draw(r) {
    const W = r.W, H = r.H; this.list.o.x = W / 2 - 110; this.list.o.w = 220; this.list.o.y = H / 2 + 6;
    r.overlay(g => { UI.dim(g, W, H, .85); S7.E.font.title(g, 'NO ONE LEFT TO WEAR YOU', W / 2, H / 2 - 36, { scale: 2, align: 'center', colors: ['#ffffff', '#7ac8ff'], outline: '#000' }); UI.text(g, 'All seven coats are frozen. The Sweep is coming. He is not in a hurry.', W / 2, H / 2 - 12, '#cfc8dc', { align: 'center' }); if (this.t > .6) this.list.draw(g); });
  }
};
S7.sim.continueAfterOver = function () {
  const st = S7.st; st.over = false; st.mode = 'rail';
  for (const id of S7.ROSTER) { const r = st.roster[id]; r.frozen = false; r.hp = Math.round(S7.sim.personaMax(id) * .5); r.ammo = S7.reg.weapons[S7.reg.personas[id].weapon].mag; }
  st.red = Math.round(st.red * .5); S7.bus.emit('rescue', { n: 7 });
  const a = st.area, n = S7.graph().A.nodes; const keep = { enemies: [] };
  S7.sim.loadArea(a, st.node && S7.graph().nodes[st.node] ? st.node : Object.keys(S7.graph().nodes)[0]); st.fadeIn = .6;
  if (S7.graph().A.boss && st.boss === null && !st.bosses[S7.graph().A.boss]) S7.sim.startBoss(S7.graph().A.boss);
  UI.pop(); S7.sim.toast('THE SWEEP CHIPPED YOU ALL FREE. IT COST HALF YOUR RED.');
};

// ---------------------------------------------------------------- About / Credits
SCREENS.About = class {
  constructor(credits) { this.y = 0; this.credits = !!credits; this.t = 0; }
  update(dt, n) {
    this.t += dt; const I = S7.game.input; const sp = (I.down('down') ? 70 : I.down('up') ? -70 : 0); this.y = Math.max(0, this.y + (sp || (this.credits ? 16 : 0)) * dt);
    if (n.back || (n.ok && !this.credits) || (n.ok && this.t > 3)) { UI.pop(); if (this.credits) S7.quitToTitle(); }
  }
  draw(r) {
    const W = r.W, H = r.H; r.overlay(g => {
      frame(g, W, H, this.credits ? 'THE END' : 'ABOUT SKILLER7', 'v' + S7.VERSION);
      g.save(); g.beginPath(); g.rect(0, 34, W, H - 50); g.clip();
      let y = 40 - this.y; for (const ln of S7.ABOUT) {
        if (ln[0] === '#') { y += 4; UI.text(g, ln.slice(1), 14, y, col.gold); y += 11; }
        else { for (const l of UI.wrap(ln, W - 28, {})) { UI.text(g, l, 14, y, '#e0dcec'); y += 9; } y += 1; }
      }
      this.max = y + this.y; g.restore();
      if (this.y > this.max - H) this.y = Math.max(0, this.max - H);
      UI.promptRow(g, [['cancel', 'BACK']], W - 8, H - 12, 'right'); UI.text(g, 'UP / DOWN SCROLLS', 10, H - 12, col.dim);
    });
  }
};

// ---------------------------------------------------------------- Echo Run results
SCREENS.EchoResult = class {
  constructor(res, best) { this.res = res; this.best = best; this.t = 0; this.list = new UI.FocusList([{ label: 'RACE AGAIN', onPick: () => { UI.pop(); S7.startEchoRun(); } }, { label: 'BACK TO THE TITLE', onPick: () => { UI.pop(); S7.quitToTitle(); } }], { x: 0, y: 0, w: 200, rowH: 14 }); }
  update(dt, n) { this.t += dt; if (this.t > .7) this.list.update(n); }
  draw(r) {
    const W = r.W, H = r.H, e = this.res; this.list.o.x = W / 2 - 100; this.list.o.y = H - 56;
    r.overlay(g => {
      frame(g, W, H, 'ECHO RUN', 'THE BLACK RUN, AGAINST YOUR ECHO');
      const rows = [['RAW TIME', S7.fmtTime(e.raw)], ['TARGETS THAWED', e.hits + '/' + e.total], ['TIME CUT', '-' + e.cut + ' S'], ['FINAL TIME', S7.fmtTime(e.time)], ['BEST', this.best ? S7.fmtTime(this.best) : 'none yet']];
      rows.forEach((q, i) => { const y = 46 + i * 14; UI.text(g, q[0], W / 2 - 100, y, i === 3 ? col.gold : '#cfc8dc'); UI.text(g, q[1], W / 2 + 100 - UI.w(q[1]), y, i === 3 ? col.gold : '#fff'); });
      if (this.best && e.time <= this.best + .001) UI.text(g, 'NEW BEST: YOUR ECHO RUNS THIS LINE NEXT TIME', W / 2, 120, '#6ae0a8', { align: 'center' });
      if (this.t > .7) this.list.draw(g);
    });
  }
};
S7.bus.on('echo', d => {
  if (d.kind !== 'finish' || S7.attract) return;
  if (S7.hub.active) { S7.sim.toast('RESULT SENT TO THE HUB'); return; }
  const old = S7.hub.loadEcho(); UI.push(new S7.screens.EchoResult(d.result, old ? old.time : null));
});

/* ===== src/84-dev.js ===== */
// Dev mode: reached from the pause menu. Cheats, warps, spawns and live sliders for every balance variable, with reset to defaults.
S7.dev = { overlays: { rails: false, stats: false }, speed: 1 };
S7.screens.Dev = class {
  constructor() { this.tab = 0; this.tabs = ['TOOLS', 'WARP', 'SPAWN', 'TUNING']; this.build(); }
  build() {
    const st = S7.st, sim = S7.sim;
    const toggle = (label, get, set) => ({ label, value: () => get() ? 'ON' : 'OFF', onPick: () => set(!get()), onLeft: () => set(false), onRight: () => set(true) });
    const tools = [
      toggle('GOD MODE', () => st.cheats.god, v => st.cheats.god = v), toggle('INFINITE RED', () => st.cheats.infRed, v => st.cheats.infRed = v),
      toggle('INFINITE AMMO', () => st.cheats.infAmmo, v => st.cheats.infAmmo = v), toggle('FAST RAILS', () => st.cheats.fast, v => st.cheats.fast = v),
      toggle('SHOW RAILS', () => S7.dev.overlays.rails, v => S7.dev.overlays.rails = v), toggle('SHOW STATS', () => S7.dev.overlays.stats, v => S7.dev.overlays.stats = v),
      { label: 'REVEAL ALL WHITEOUTS', onPick: () => { for (const e of st.enemies) e.visible = 30; sim.toast('ALL REVEALED'); } },
      { label: 'THAW ALL WHITEOUTS', onPick: () => { for (const e of st.enemies.slice()) if (!e.dead) sim.killEnemy(e, true); } },
      { label: 'HEAL AND REFILL EVERYONE', onPick: () => { for (const id of S7.ROSTER) { const r = st.roster[id]; r.frozen = false; r.hp = sim.personaMax(id); r.ammo = S7.reg.weapons[S7.reg.personas[id].weapon].mag; } sim.toast('EVERYONE IS WARM'); } },
      { label: 'FREEZE THIS COAT', onPick: () => { UI.stack.length = 0; sim.hurtHero(9999, 'dev'); } },
      { label: 'THAW FROZEN COATS (SWEEP)', onPick: () => { sim.reviveFrozen(); } },
      { label: '+50 RED', onPick: () => { st.red = Math.min(sim.redMax(), st.red + 50); } }, { label: '+5 RIME', onPick: () => { st.rime += 5; } },
      { label: 'UNLOCK ALL COATS', onPick: () => { for (const id of S7.ROSTER) st.roster[id].unlocked = true; } },
      { label: 'GIVE ALL KEY ITEMS AND PINS', onPick: () => { for (const k in S7.reg.items) st.items[k] = 1; st.pins = S7.PINS.map(p => p[0]); for (const d of S7.DOSSIER) if (!st.dossier.includes(d[0])) st.dossier.push(d[0]); } },
      { label: 'OPEN EVERY GATE HERE', onPick: () => { const A = S7.graph().A; for (const g in (A.gates || {})) sim.openGate(g, 'dev'); } },
      { label: 'SKIP CUTSCENE / DIALOG', onPick: () => { if (st.beat) { st.beat.i = st.beat.steps.length; st.talk = null; st.mode = 'rail'; st.beat = null; st.cut = null; st.card = null; } } },
      { label: 'SAVE QUICKLY (AUTOSAVE)', onPick: () => { S7.game.saves.autosave(); sim.toast('AUTOSAVED'); } },
      { label: 'RESET ALL SLIDERS', onPick: () => { S7.resetTune(); sim.toast('SLIDERS RESET'); } }
    ];
    const warp = [];
    for (const id of S7.AREA_ORDER) { const A = S7.reg.areas[id]; warp.push({ label: A.title + ': ' + A.sub, onPick: () => { UI.stack.length = 0; if (st.echo) st.echo = null; S7.sim.loadArea(id, id === 'room7' ? 'c' : Object.keys(A.nodes && typeof A.nodes !== 'function' ? A.nodes : S7.graph().nodes)[0]); S7.pres.load(id); sim.toast('WARPED TO ' + A.title); } }); }
    warp.push({ label: 'WARP TO THE NEXT NODE', onPick: () => { const G = S7.graph(), ids = Object.keys(G.nodes), i = (ids.indexOf(st.node) + 1) % ids.length; const n = G.nodes[ids[i]]; sim.loadArea(st.area, n.id); } });
    const spawn = Object.keys(S7.reg.enemies).map(k => ({ label: 'SPAWN ' + S7.reg.enemies[k].name.toUpperCase(), onPick: () => { const a = st.mode === 'aim' ? st.aim.yaw : st.face; sim.spawnEnemy(k, st.x + Math.cos(a) * 9, st.y + Math.sin(a) * 9); } }));
    spawn.push({ label: 'START BOSS HERE', onPick: () => { const b = S7.graph().A.boss; if (b) { st.bosses[b] = false; sim.startBoss(b); } else sim.toast('NO BOSS IN THIS AREA'); } });
    spawn.push({ label: 'START ECHO RUN', onPick: () => { UI.stack.length = 0; S7.startEchoRun(); } });
    spawn.push({ label: 'PLAY A BEAT: TARGET 00 BOSS', onPick: () => { UI.stack.length = 0; sim.playBeat('t00_boss'); } });
    const tune = [{ label: 'RESET ALL TO DEFAULTS', onPick: () => S7.resetTune() }];
    let lastGroup = ''; for (const k in S7.TUNING) { const t = S7.TUNING[k]; tune.push({ label: t.label.toUpperCase(), slider: true, min: t.min, max: t.max, get: () => t.v, set: v => S7.setTune(k, Math.round(v / t.step) * t.step), value: null, onLeft: () => S7.setTune(k, +(t.v - t.step).toFixed(3)), onRight: () => S7.setTune(k, +(t.v + t.step).toFixed(3)), onPick: () => { t.v = t.def; }, extra: () => t.v.toFixed(2) }); }
    this.lists = [tools, warp, spawn, tune].map((items, i) => new UI.FocusList(items, { x: 8, y: 52, w: 300, rowH: 12, rows: 11 }));
  }
  update(dt, n) {
    if (n.tabL) { this.tab = (this.tab + 3) % 4; S7.audio.sfx('select'); } if (n.tabR) { this.tab = (this.tab + 1) % 4; S7.audio.sfx('select'); }
    const l = this.lists[this.tab]; l.o.w = S7.game.W - 16; if (this.tab !== 3 || !n.dx) { const nn = this.tab === 3 ? Object.assign({}, n, { dx: 0 }) : n; l.update(nn); }
    if (this.tab === 3 && n.dx) { const c = l.items[l.i]; if (c && (n.dx < 0 ? c.onLeft : c.onRight)) (n.dx < 0 ? c.onLeft : c.onRight)(); }
    if (S7.game.input.down('right') && this.tab === 3) { const c = l.items[l.i]; if (c && c.onRight && S7.game.input.repeat('right', .25, .04)) c.onRight(); }
    if (S7.game.input.down('left') && this.tab === 3) { const c = l.items[l.i]; if (c && c.onLeft && S7.game.input.repeat('left', .25, .04)) c.onLeft(); }
    if (n.back) UI.pop();
  }
  draw(r) {
    const W = r.W, H = r.H; const l = this.lists[this.tab]; l.o.w = W - 16;
    r.overlay(g => {
      frame(g, W, H, 'DEV MODE', 'NOT FOR GUESTS');
      this.tabs.forEach((t, i) => { const x = 8 + i * 58; g.fillStyle = i === this.tab ? col.red : '#2a2236'; g.fillRect(x, 36, 55, 11); UI.text(g, t, x + 27 - UI.w(t) / 2, 38, '#fff'); });
      l.draw(g);
      if (this.tab === 3) { const t = Object.values(S7.TUNING); l.items.forEach((c, k) => { if (!c.extra) return; const rr = l.rect(k); if (k < l.scroll || k >= l.scroll + 11) return; UI.text(g, c.extra(), rr[0] + rr[2] - 112 - UI.w(c.extra()), rr[1] + 3, '#fff'); }); }
      UI.promptRow(g, [['scan', 'PREV TAB'], ['ring', 'NEXT TAB'], ['confirm', 'DO'], ['cancel', 'CLOSE']], W - 8, H - 14, 'right');
    });
  }
};
// overlays drawn in the world while dev mode asks for them
S7.dev.draw = function (r) {
  if (!S7.dev.overlays.rails && !S7.dev.overlays.stats) return;
  const G = S7.graph(), pres = S7.pres, st = S7.st;
  r.overlay(g => {
    if (S7.dev.overlays.rails && pres.world) for (const id of G.eorder) { const e = G.edges[id]; g.strokeStyle = e.gate ? '#ffb030' : '#40ff90'; g.lineWidth = 1; g.beginPath(); let first = true; for (let i = 0; i < e.pts.length; i += Math.max(1, Math.floor(e.pts.length / 24))) { const p = e.pts[i], q = S7.ui.proj(p.x, p.y, p.z + .1); if (!q) { first = true; continue; } first ? g.moveTo(q[0], q[1]) : g.lineTo(q[0], q[1]); first = false; } g.stroke(); }
    if (S7.dev.overlays.stats) { const lines = ['AREA ' + st.area + '  MODE ' + st.mode, 'EDGE ' + st.edge + '  S ' + st.s.toFixed(1) + '  SPD ' + st.speed.toFixed(1), 'ENEMIES ' + st.enemies.filter(e => !e.dead).length + '  PROJ ' + st.projectiles.length, 'TIME ' + st.time.toFixed(1)]; lines.forEach((l, i) => UI.text(g, l, 6, 40 + i * 9, '#0f0')); }
  });
};

/* ===== src/85-bot.js ===== */
// The bot: plays the real sim through intents. Used by attract mode (it cheats freely) and by the scripted playthrough in tests.
const bot = S7.bot = { idx: 0, t: 0, v: null, route: [], talkT: 0, active: false, aimT: 0 };
const sm = S7.sim, sx = S7.st;
// the vignettes the attract mode loops through: each one is a slice of the demo
bot.VIGNETTES = [
  { id: 'lobby', area: '00A', node: 'start', time: 46, route: ['j2', 'j4'], flags: { keys: ['servicekey'], pins: ['pin1'], personas: ['rurik'] }, openGates: true },
  { id: 'rooms', area: 'room7', node: 'c', time: 18, route: ['ward', 'bench', 'c'], flags: {}, personas: ['rurik'] },
  { id: 'grau', area: '00C', node: 'n0', time: 50, route: [], boss: 'grau', personas: ['gustav'], bossHp: .28 },
  { id: 'village', area: '01A', node: 'start', time: 46, route: ['v1', 'v4', 'v5'], flags: { keys: ['tbar'] }, openGates: true, personas: ['jodl'] },
  { id: 'blackrun', area: '01C', node: 'base', time: 52, route: [], ride: true, personas: ['anselma'] },
  { id: 'king', area: '01F', node: 'f0', time: 52, route: [], boss: 'king', personas: ['baron'], bossHp: .26 }
];
bot.setup = function (idx) {
  const v = bot.VIGNETTES[idx % bot.VIGNETTES.length]; bot.v = v; bot.idx = idx; bot.t = 0; bot.talkT = 0; bot.route = (v.route || []).slice(); bot.fireT = 0; bot.stall = 0;
  S7.newState({ difficulty: 'normal' });
  for (const id of S7.ROSTER) { sx.roster[id].unlocked = true; }
  Object.assign(sx.cheats, { god: true, infRed: true, infAmmo: true });
  sx.red = 120; sx.rime = 8; sx.persona = (v.personas && v.personas[0]) || 'rurik';
  if (v.flags) { for (const k of v.flags.keys || []) sx.items[k] = 1; for (const p of v.flags.pins || []) sx.pins.push(p); }
  if (v.area !== 'room7') { sx.bosses.grau = v.id !== 'grau' && v.id !== 'lobby' && v.id !== 'rooms'; }
  sm.loadArea(v.area, v.node);
  if (v.openGates) { const A = S7.graph().A; for (const g in (A.gates || {})) sx.gates[A.id + ':' + g] = true; }
  if (v.boss) { sm.startBoss(v.boss); sx.boss.hp = sx.boss.hpMax = sx.boss.hpMax * (v.bossHp || 1); }
  if (v.ride) { sx.flags.ride = true; }
  sx.mode = ['rail', 'junction', 'ski', 'lift'].includes(sx.mode) ? sx.mode : 'rail';
  sx.done = sx.done || {};
  bot.active = true; sx.dossier.push('d_seen');
};
const blank = S7.noIntent;
function dists(goal) {   // shortest distances (metres) from every node to the goal
  const G = S7.graph(), d = { [goal]: 0 }, q = [goal];
  while (q.length) { q.sort((a, b) => d[a] - d[b]); const n = q.shift(); for (const e of G.nodes[n].edges) { const m = e.a === n ? e.b : e.a, nd = d[n] + e.len; if (d[m] === undefined || nd < d[m] - 1e-6) { d[m] = nd; q.push(m); } } }
  return d;
}
function pathTo(from, to) {   // the first edge to take from `from` toward `to`
  const G = S7.graph(), d = dists(to); if (d[from] === undefined) return null; let best = null, bv = 1e9;
  for (const e of G.nodes[from].edges) { const m = e.a === from ? e.b : e.a; const v = (d[m] === undefined ? 1e9 : d[m]) + e.len; if (v < bv) { bv = v; best = { e, n: m }; } }
  return best;
}
function aimAt(I, tx, ty, tz, rate = 3) {
  const a = sx.aim, eye = [sx.x, sx.y, sx.z + 1.55], dx = tx - eye[0], dy = ty - eye[1], dz = tz - eye[2];
  const yaw = Math.atan2(dy, dx), pit = Math.atan2(dz, Math.hypot(dx, dy)), ey = S7.angDiff(a.yaw, yaw), ep = pit - a.pitch;
  I.lookStick = [S7.clamp(ey * rate, -1, 1), -S7.clamp(ep * rate, -1, 1)]; return Math.hypot(ey, ep);
}
bot.intents = function (dt) {
  const I = blank(), v = bot.v; bot.t += dt;
  if (!v) return I;
  // keep the show going: cheat-reveal everything near
  for (const e of sx.enemies) if (!e.dead && Math.hypot(e.x - sx.x, e.y - sx.y) < 30) e.visible = Math.max(e.visible, .3);
  if (sx.mode === 'talk') { bot.talkT += dt; const tk = sx.talk; if (tk && tk.shown >= tk.text.length && bot.talkT > 1.1) { I.confirm = true; bot.talkT = 0; } return I; }
  if (sx.mode === 'cutscene') { if (bot.t > 6 && sx.card === null && sx.talk === null) I.skipScene = true; return I; }
  if (sx.mode === 'transition' || sx.mode === 'frozen' || sx.mode === 'gameover') return I;
  if (sx.cheats.god) for (const id of S7.ROSTER) { const r = sx.roster[id]; r.frozen = false; r.hp = Math.max(r.hp, 30); }
  // target selection: the nearest live enemy, or the boss's Warm Spot while it is open
  let tgt = null, bd = 1e9;
  for (const e of sx.enemies) { if (e.dead || e.spawnT > 0) continue; const d = Math.hypot(e.x - sx.x, e.y - sx.y); if (d < bd && d < (sx.mode === 'ski' ? 38 : 22)) { bd = d; tgt = e; } }
  const b = sx.boss;
  if (b && !b.dead) {
    I.aim = true; I.ring = false;
    const wp = b.warmPos(); let err = aimAt(I, wp[0], wp[1], wp[2], 4);
    if (b.warmOpen() && err < .03) { I.fire = I.firePressed = true; }
    else if (!b.warmOpen() && tgt && bd < 12) { aimAt(I, tgt.x, tgt.y, tgt.z + 1.25, 4); I.firePressed = I.fire = true; }
    if (sx.scanCd <= 0 && tgt) I.scan = true;
    if (bot.t % 7 < dt) I.skill = true;
    // slide around the ring when a danger zone is up: handled by god mode
    if (sx.mode === 'aim' && sx.preAim === 'junction') {}
    return I;
  }
  if (tgt && bd < 20) {
    I.aim = true;
    const w = tgt.def.warm, sc = tgt.visible > 0 ? w[1] : tgt.def.h * .6;
    const bx = tgt.x + Math.cos(tgt.face) * tgt.def.r * .6, by = tgt.y + Math.sin(tgt.face) * tgt.def.r * .6;
    const err = sx.mode === 'aim' ? aimAt(I, bx, by, tgt.z + sc, 4) : 9;
    if (sx.mode === 'ski' && sx.speed > 2) I.turn = true;
    if (err < .035 && !(tgt.def.shield && tgt.shieldUp)) { I.fire = I.firePressed = true; }
    if (sx.scanCd <= 0 && tgt.visible <= 0) I.scan = true;
    if (sx.mode !== 'aim' && sx.mode !== 'lift' && sx.mode !== 'ski') { I.go = false; }
    return I;
  }
  // gates: wear the right coat and use its skill
  if (sx.blocked) {
    const g = sm.gateOf();
    if (g && g.who && sx.persona !== g.who && sx.switchT <= 0) { sm.switchTo(g.who, true); I.go = false; return I; }
    if (g && sx.switchT <= 0 && bot.t - (bot.gateT || -9) > 1.5) { bot.gateT = bot.t; I.interact = true; }
    return I;
  }
  // nothing to shoot: follow the route
  const G = S7.graph(), A = G.A;
  if (sx.mode === 'ski') { I.go = true; return I; }
  if (sx.mode === 'lift') { return I; }
  if (A.boss && sx.bosses[A.boss] && !bot.route.length) { const out = Object.keys(G.nodes).find(k => G.nodes[k].kind === 'exit'); if (out) bot.route = [out]; }
  if (sx.node && bot.route[0] === sx.node) bot.route.shift();
  while (bot.route.length && !G.nodes[bot.route[0]]) bot.route.shift();
  const want = bot.route[0];
  if (sx.mode === 'junction') {
    let pick = 0;
    if (want) { const step = pathTo(sx.node, want); if (step) pick = Math.max(0, sx.options.findIndex(o => o.edge === step.e.id)); }
    else { const i = sx.options.findIndex(o => G.edges[o.edge].kind === 'ski' && !G.edges[o.edge].steep); pick = i >= 0 ? i : 0; }
    I.branch = pick; return I;
  }
  if (sx.mode === 'rail') {
    if (!want) { I.go = false; return I; }
    const e = G.edges[sx.edge], d = dists(want);
    if (sx.node) {   // standing on a node: face the right way along the best edge
      const step = pathTo(sx.node, want);
      if (step) { const ed = step.e, dir = ed.a === sx.node ? 1 : -1; if (ed.id !== sx.edge || dir !== sx.dir) { st_dir(ed); } }
      I.go = true;
    } else {          // mid-edge: turn about if the other end is the way
      const ahead = sx.dir > 0 ? e.b : e.a, behind = sx.dir > 0 ? e.a : e.b, dAhead = (d[ahead] === undefined ? 1e9 : d[ahead]) + (sx.dir > 0 ? e.len - sx.s : sx.s), dBehind = (d[behind] === undefined ? 1e9 : d[behind]) + (sx.dir > 0 ? sx.s : e.len - sx.s);
      if (dBehind + 1 < dAhead && bot.t - (bot.turnT || -9) > 1) { bot.turnT = bot.t; I.turn = true; } else I.go = true;
    }
  }
  return I;
};
function st_dir(e) {   // point the walker down the chosen edge when standing on a node
  sx.edge = e.id; if (e.a === sx.node) { sx.s = 0; sx.dir = 1; } else { sx.s = e.len; sx.dir = -1; } sm.placeHero();
}
bot.nextVignette = function () { bot.setup((bot.idx + 1) % bot.VIGNETTES.length); };
bot.step = function (dt) { if (bot.t > (bot.v ? bot.v.time : 40)) { bot.nextVignette(); return true; } return false; };

/* ===== src/87-hub.js ===== */
// AI Hub integration (Session Protocol v1, ghost mode): in a session the game opens straight into Echo Run, sends its racer
// to the others, and reports its time. On its own, Echo Run races your own recorded echo.
const Hub = S7.hub = { active: false, info: null, ended: false, sent: 0, prog: 0, finished: false, last: null };
Hub.init = async function () {
  const A = typeof window !== 'undefined' && window.AIHub; if (!A || !A.active) return null;
  try { const info = await A.connect({ mode: 'ghost', seats: [1, 4] }); if (info) { Hub.active = true; Hub.info = info; Hub.attach(); } return info; } catch (e) { return null; }
};
Hub.attach = function () {
  const A = window.AIHub;
  A.on('message', (d, from) => { const ec = S7.st.echo; if (!ec || !d || typeof d !== 'object') return; const pl = (A.players || []).find(p => p.id === from); ec.others[from] = { area: d.a, edge: d.e, s: +d.s || 0, persona: S7.reg.personas[d.p] ? d.p : 'rurik', name: pl ? pl.name : 'P' + from }; });
  A.on('leave', d => { const ec = S7.st.echo; if (ec && ec.others) delete ec.others[d.id]; });
  A.on('time-up', () => { Hub.report(true); });
  A.on('end', () => { Hub.ended = true; });
};
Hub.sessionTime = () => { try { return window.AIHub.time(); } catch (e) { return -Infinity; } };
Hub.tick = function (dt) {
  const st = S7.st, ec = st.echo; if (!Hub.active || !ec || Hub.ended) return;
  const tm = Hub.sessionTime();
  if (!ec.started) { ec.countdown = tm === -Infinity ? 3 : Math.max(0, -tm / 1000); if (tm !== -Infinity && tm >= 0) { ec.countdown = 0.001; } }
  Hub.sent -= dt;
  if (Hub.sent <= 0 && ec.started) { Hub.sent = .125; window.AIHub.send({ a: st.area, e: st.edge, s: +st.s.toFixed(1), p: st.persona }, { reliable: false }); }
  Hub.prog -= dt;
  if (Hub.prog <= 0) { Hub.prog = 1; const G = S7.graph(); let dist = 0; for (const id of ['s1', 's2', 's3']) { if (id === st.edge) { dist += st.s; break; } dist += G.edges[id].len; } window.AIHub.progress({ score: Math.round(dist), label: Math.round(dist) + ' m' }); }
  if (ec.finished && !Hub.finished) Hub.report(false);
};
Hub.report = function (timeUp) {
  if (!Hub.active || Hub.finished) return; const ec = S7.st.echo; if (!ec) return; Hub.finished = true;
  try {
    if (ec.result) window.AIHub.result({ time: Math.max(1, Math.round(Hub.sessionTime() - ec.result.cut * 1000)), stats: { 'Targets thawed': ec.result.hits + '/' + ec.result.total, 'Time cut': ec.result.cut + ' s' }, awards: ec.result.hits === ec.result.total ? [{ title: 'Clean Sweep', detail: 'Every target thawed' }] : [] });
    else { const G = S7.graph(); let dist = 0; for (const id of ['s1', 's2', 's3']) { if (id === S7.st.edge) { dist += S7.st.s; break; } dist += G.edges[id].len; } window.AIHub.result({ score: Math.round(dist) }); }
  } catch (e) { S7.fail('hub result', e); }
};
// the solo echo: your best run, kept in storage
Hub.loadEcho = function () { try { const t = localStorage.getItem('skiller7:echo'); return t ? JSON.parse(t) : null; } catch (e) { return null; } };
Hub.saveEcho = function (time, rec) { try { const old = Hub.loadEcho(); if (!old || time < old.time) localStorage.setItem('skiller7:echo', JSON.stringify({ time, rec })); } catch (e) { /* storage blocked */ } };
S7.bus.on('echo', d => { if (d.kind === 'finish') { const ec = S7.st.echo; Hub.saveEcho(d.result.time, ec.rec); Hub.last = d.result; } });

/* ===== content/10-data.js ===== */
// Content as data: weapons, the Seven, Whiteouts, items, upgrades, the Dossier.
const D = S7.def;

// ---- weapons: rate = shots/s, mag, reload s, dmg per pellet, spread (rad), range m, pellets, kind ----
D('weapons', 'revolver', { name: 'Station Revolver', rate: 2.4, mag: 6, reload: 1.3, dmg: 3, spread: .006, range: 40, pellets: 1, kind: 'hitscan', sfx: 'shot_rev' });
D('weapons', 'poles', { name: 'Pole Pistols', rate: 7, mag: 14, reload: 1.1, dmg: 1.2, spread: .02, range: 30, pellets: 1, kind: 'hitscan', sfx: 'shot_pole' });
D('weapons', 'rifle', { name: 'Hunting Rifle', rate: .9, mag: 4, reload: 1.8, dmg: 8, spread: .001, range: 90, pellets: 1, kind: 'hitscan', sfx: 'shot_rifle', scope: true });
D('weapons', 'shotgun', { name: 'Fur-Lined Shotgun', rate: 1.1, mag: 2, reload: 1.6, dmg: 1.7, spread: .075, range: 18, pellets: 8, kind: 'hitscan', sfx: 'shot_shotgun' });
D('weapons', 'alphorn', { name: 'Alphorn', rate: 1.4, mag: 5, reload: 1.2, dmg: 2.2, spread: .035, range: 26, pellets: 1, kind: 'hitscan', sfx: 'shot_horn', stun: .8 });
D('weapons', 'camera', { name: 'Press Camera', rate: 1.6, mag: 8, reload: 1.1, dmg: 1.6, spread: .004, range: 45, pellets: 1, kind: 'hitscan', sfx: 'shot_cam', reveal: 5, stun: .6 });
D('weapons', 'launcher', { name: 'Avalanche Launcher', rate: .55, mag: 3, reload: 2.2, dmg: 7, spread: .004, range: 50, pellets: 1, kind: 'blast', blast: 3.4, sfx: 'shot_launch' });
D('weapons', 'sweep', { name: 'Chipping Pick', rate: 1, mag: 1, reload: 1, dmg: 1, spread: 0, range: 3, pellets: 1, kind: 'hitscan', sfx: 'shot_pole' });

// ---- the Seven: HP, weapon, skill, look (E.Humanoid options), voice (Animalese settings) ----
const P = (id, o) => D('personas', id, o);
P('rurik', { name: 'Rurik Kessel', title: 'Ski Patrolman', hp: 100, weapon: 'revolver', skill: 'flare', skillName: 'Flare', skillCost: 12, color: '#d81e2a', blurb: 'Steady. Honest. Has pulled 212 people off mountains and put one back.',
  look: { size: 1.3, build: 'heroic', hat: { style: 'beanie', color: '#d81e2a' }, outfit: 'coat', weapon: 'gun', colors: { cloth: '#d81e2a', pants: '#20242e', boot: '#101218', hair: '#4a3a30' } }, voice: { base: 150, wob: .18, rate: 1 } });
P('anselma', { name: 'Anselma Brandt', title: 'Downhill Racer', hp: 70, weapon: 'poles', skill: 'tuck', skillName: 'Tuck', skillCost: 10, color: '#f5b700', blurb: 'Has never been late. Has been early to several funerals.',
  look: { size: 1.25, build: 'chibi', hat: { style: 'racehelmet', color: '#f5b700' }, outfit: 'shirt', weapon: 'gun', colors: { cloth: '#f5b700', pants: '#1a2230', boot: '#101218', hair: '#c44' } }, voice: { base: 330, wob: .25, rate: 1.35 } });
P('baron', { name: 'Baron Ludo von Tanne', title: 'Telemark Aristocrat', hp: 80, weapon: 'rifle', skill: 'longlook', skillName: 'Long Look', skillCost: 0, color: '#3f7a52', blurb: 'Kneels to shoot, bows to nobody. Owns four valleys and no opinions.',
  look: { size: 1.35, build: 'heroic', hat: { style: 'felt', color: '#3f7a52' }, outfit: 'coat', weapon: 'gun', colors: { cloth: '#3f7a52', pants: '#4a3c2a', boot: '#2a1c12', hair: '#c8c0b0' } }, voice: { base: 120, wob: .1, rate: .8 } });
P('gustav', { name: 'Gustav Pelz', title: 'Fur-Coated Tycoon', hp: 120, weapon: 'shotgun', skill: 'rain', skillName: 'Make It Rain', skillCost: 0, color: '#7a3b5a', blurb: 'Buys the view, then the mountain, then the person standing in front of it.',
  look: { size: 1.4, build: 'bulky', hat: { style: 'ushanka', color: '#6a5a4a' }, outfit: 'coat', weapon: 'gun', colors: { cloth: '#7a3b5a', pants: '#1c1820', boot: '#101018', hair: '#2a2a2a' } }, voice: { base: 95, wob: .08, rate: .75 } });
P('jodl', { name: 'Jodl Oberacher', title: 'Yodeler', hp: 75, weapon: 'alphorn', skill: 'echo', skillName: 'Echo', skillCost: 18, color: '#3b82f6', blurb: 'Sings one note. The mountain answers, and sometimes the glass.',
  look: { size: 1.3, build: 'chibi', hat: { style: 'felt', color: '#3b82f6' }, outfit: 'shirt', weapon: 'gun', colors: { cloth: '#3b82f6', pants: '#5a3a22', boot: '#3a2414', hair: '#d8a050' } }, voice: { base: 260, wob: .5, rate: 1.1 } });
P('vesper', { name: 'Vesper Lux', title: 'Press Photographer', hp: 60, weapon: 'camera', skill: 'flash', skillName: 'Flash', skillCost: 22, color: '#a8a8b8', blurb: 'Saw everything. Developed none of it. Prints are extra.',
  look: { size: 1.25, build: 'chibi', hat: { style: 'beret', color: '#202028' }, outfit: 'coat', weapon: 'gun', colors: { cloth: '#a8a8b8', pants: '#202028', boot: '#101018', hair: '#202028' } }, voice: { base: 210, wob: .22, rate: 1.2 } });
P('mara', { name: 'Mara Stollen', title: 'Avalanche Engineer', hp: 90, weapon: 'launcher', skill: 'charge', skillName: 'Charge', skillCost: 20, color: '#e07a1a', blurb: 'Knows precisely how much snow wants to fall. Helps it.',
  look: { size: 1.3, build: 'heroic', hat: { style: 'hardhat', color: '#e07a1a' }, outfit: 'coat', weapon: 'gun', colors: { cloth: '#e07a1a', pants: '#2a2a30', boot: '#101018', hair: '#3a2a20' } }, voice: { base: 175, wob: .15, rate: .95 } });
S7.ROSTER = ['rurik', 'anselma', 'baron', 'gustav', 'jodl', 'vesper', 'mara'];

// ---- Whiteouts (hp is before the Whiteout health slider; r = body radius, h = height, warm = Warm Spot offset ratio) ----
const W = (id, o) => D('enemies', id, o);
W('giggler', { name: 'Giggler', hp: 3, speed: 2.3, r: .42, h: 1.7, warm: [0, 1.28, .2], dmg: 14, laugh: 'giggle', color: '#e8eef5', rig: { size: 1.3, build: 'chibi', hat: { style: 'beanie', color: '#e8eef5' }, outfit: 'shirt', weapon: null, colors: { cloth: '#e8eef5', pants: '#cfd8e4', boot: '#9aa4b4' } }, drop: [4, 1], blurb: 'Laughs itself out of sight. Explodes of happiness.' });
W('bellhop', { name: 'Bellhop', hp: 7, speed: 1.8, r: .5, h: 1.8, warm: [0, 1.25, .2], dmg: 20, laugh: 'chuckle', color: '#b8283a', shield: { period: 3.2, open: 1.3 }, rig: { size: 1.35, build: 'heroic', hat: { style: 'pillbox', color: '#b8283a' }, outfit: 'coat', weapon: null, colors: { cloth: '#b8283a', pants: '#e8eef5', boot: '#202028' } }, drop: [8, 2], blurb: 'Pushes a luggage cart that blocks the Warm Spot. It lifts the cart to wave.' });
W('skier', { name: 'Schuss', hp: 2, speed: 5.4, r: .38, h: 1.6, warm: [0, 1.2, .2], dmg: 12, laugh: 'whoop', color: '#a8d8f4', dodge: true, rig: { size: 1.25, build: 'chibi', hat: { style: 'goggles', color: '#8fd0f0' }, outfit: 'shirt', weapon: null, colors: { cloth: '#a8d8f4', pants: '#d8e8f4', boot: '#5a6a7a' } }, drop: [5, 1], skis: true, blurb: 'Fast, giddy and sidesteps. Wait for it to land.' });
W('sumo', { name: 'Snow Sumo', hp: 16, speed: 1.1, r: .75, h: 2.1, warm: [0, 1.5, .26], warm2: [0, .8, -.3], dmg: 34, laugh: 'boom', color: '#d8e0ea', rig: { size: 1.7, build: 'bulky', hat: null, outfit: 'shirt', weapon: null, hair: 'bald', colors: { cloth: '#d8e0ea', pants: '#e8eef5', boot: '#aab4c4' } }, drop: [14, 4], blurb: 'Two Warm Spots: one on the chest, one on the back of the belt.' });
W('thrower', { name: 'Snowball Tenor', hp: 3, speed: 1.4, r: .42, h: 1.7, warm: [0, 1.3, .2], dmg: 10, laugh: 'trill', color: '#c0d0e8', ranged: { range: 12, every: 2.8, speed: 7 }, rig: { size: 1.3, build: 'chibi', hat: { style: 'felt', color: '#c0d0e8' }, outfit: 'coat', weapon: null, colors: { cloth: '#c0d0e8', pants: '#8a98b0', boot: '#4a5a6a' } }, drop: [6, 2], blurb: 'Keeps its distance and sings snowballs at you.' });

// ---- items, collectibles, upgrades ----
D('items', 'servicekey', { name: 'Service Key', text: 'Brass, warm to the touch. Opens the staff lift to Floor 3.' });
D('items', 'gondolaticket', { name: 'Gondola Ticket', text: 'Valid for one ascent. The date is tomorrow.' });
D('items', 'tbar', { name: 'T-Bar Token', text: 'A token for the T-bar. The bar is also a token for you.' });
S7.PINS = [
  ['pin1', 'Pin 1926', 'Lift Pin: the first lift boy, Pim, was hired the day the lift opened.'],
  ['pin2', 'Pin Nada', 'Lift Pin: Nada means nothing. Nobody has ever read it aloud twice.'],
  ['pin3', 'Pin Föhn', 'Lift Pin: the warm wind arrives on a Thursday. It is always a Thursday.'],
  ['pin4', 'Pin Cuckoo', 'Lift Pin: the clock in Room 7 has not struck since the featherbed.'],
  ['pin5', 'Pin Marmot', 'Lift Pin: Murmel has not slept since the Accord. Gratuity is customary.'],
  ['pin6', 'Pin Black', 'Lift Pin: the Black Run is black because nobody has returned the colour.'],
  ['pin7', 'Pin Seven', 'Lift Pin: there are seven of you. There has always been seven of you.']
];
S7.UPGRADES = [
  { id: 'edge', name: 'Sharper Edges', text: 'Bullets cut deeper. +15% damage per wax.', max: 3, cost: [3, 6, 10] },
  { id: 'fur', name: 'Fur Lining', text: 'More health in every coat. +15% per wax.', max: 3, cost: [3, 6, 10] },
  { id: 'lens', name: 'Long Lens', text: 'The Scan reaches further and lingers. +20% per wax.', max: 3, cost: [4, 7, 11] },
  { id: 'pocket', name: 'Deep Pockets', text: 'Carry more Red. +40 per wax.', max: 3, cost: [3, 6, 9] },
  { id: 'cold', name: 'Cold Blood', text: 'Red heals more. +25% per wax.', max: 3, cost: [4, 7, 11] },
  { id: 'quick', name: 'Quick Hands', text: 'Reload faster. -20% time per wax.', max: 3, cost: [3, 5, 8] }
];
S7.DOSSIER = [
  ['d_oma', 'OMA HOLLE', 'She is 104 and holds the mountain down with a featherbed. When she shakes it, seven people fall out of the wardrobe.'],
  ['d_foehn', 'MISTER FÖHN', 'The warm wind. He wants everyone to laugh until they are no longer in the room.'],
  ['d_whiteout', 'WHITEOUTS', 'People Föhn has touched. They laugh themselves invisible. They leave footprints, and breath, and a Warm Spot.'],
  ['d_scan', 'THE SCAN', 'A ring of cold from the chest. Anything laughing inside it is shown for a moment, against its will.'],
  ['d_seven', 'THE SEVEN', 'One body, seven coats. Whoever you are, someone else is wearing you at the next junction.'],
  ['d_red', 'RED', 'It is what is left when a Whiteout thaws. Heals, pays, and stains the snow in a way the snow dislikes.'],
  ['d_rime', 'RIME', 'Frozen crystal from the Warm Spot. Wax your coats with it at the Bench.'],
  ['d_sweep', 'THE SWEEP', 'He skis in from Room 7 when someone freezes. He does not talk. His pick says enough.'],
  ['d_accord', 'THE THAW ACCORD', 'A treaty between six neutral states, signed in pencil. It is raining on the pencil.'],
  ['d_murmel', 'MURMEL', 'A resort mascot bungeed to a ski rack. Knows things. Gratuity is customary.'],
  ['d_pim', 'PIM', 'Lift boy, 1926. Still waiting for someone to sit on the chair.']
];

/* ===== content/20-areas.js ===== */
// Areas as data: level rows, rail graph (nodes + edges), spots, waves, triggers. Coordinates: x east, y south, in metres.
const mkgrid = (w, h) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? '#' : '.'));
const put = (g, x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y] && g[y][x] !== undefined) g[y][x] = ch; return g; };
const rows = g => g.map(r => r.join(''));
const A = (id, o) => S7.def('areas', id, Object.assign({ edges: [], spots: [], spawns: {}, waves: {}, triggers: [], props: [], blocks: [], nodes: {} }, o));

// ---------------------------------------------------------------- ROOM 7
{
  const g = mkgrid(18, 12);
  A('room7', {
    title: 'ROOM 7', sub: 'THE FEATHERBED', target: null, safe: true, music: 'room7', ambience: 'roomtone', mood: 'room',
    w: 18, h: 12, rows: rows(g), ground: 'planks', colors: { base: '#5a3a28', dark: '#3a2418', light: '#7a5238' }, wallColor: '#6a4a3a',
    sky: '#0a0608', fog: { color: '#120a0c', near: 40, far: 420 }, ambient: ['#6a5a6a', '#2a1a1c', 1.5],
    cam: { at: [9, 11.7, 5.8], look: [9, 5, 0.5], fov: 64 },
    nodes: { c: { t: [9, 6.2] }, clock: { t: [3.4, 3.4] }, bench: { t: [8.5, 3.0] }, ward: { t: [14.6, 3.4] }, bed: { t: [3.4, 8.3] }, ros: { t: [12.4, 9.1] }, door: { t: [15, 8.6], kind: 'exit', to: ['room7', 'door'] } },
    edges: [
      { id: 'c-clock', a: 'c', b: 'clock', kind: 'walk' }, { id: 'c-bench', a: 'c', b: 'bench', kind: 'walk' }, { id: 'c-ward', a: 'c', b: 'ward', kind: 'walk' },
      { id: 'c-bed', a: 'c', b: 'bed', kind: 'walk' }, { id: 'c-ros', a: 'c', b: 'ros', kind: 'walk' }, { id: 'c-door', a: 'c', b: 'door', kind: 'walk' }],
    spots: [
      { id: 'clock', node: 'clock', kind: 'save', label: 'CUCKOO CLOCK' }, { id: 'bench', node: 'bench', kind: 'bench', label: 'WAX BENCH' },
      { id: 'ward', node: 'ward', kind: 'wardrobe', label: 'WARDROBE' }, { id: 'bed', node: 'bed', kind: 'npc', who: 'oma', talk: 'oma', label: 'OMA HOLLE' },
      { id: 'ros', node: 'ros', kind: 'npc', who: 'rosalind', talk: 'rosalind', label: 'SISTER ROSALIND' }, { id: 'door', node: 'door', kind: 'leave', label: 'THE CORRIDOR' }],
    props: [['thing', 'bedbig', 3.4, 8.3, 0], ['thing', 'cuckoo', 3.4, 2.2, 1.2], ['thing', 'bench', 8.5, 2.2, 0], ['thing', 'wardrobe', 14.6, 2.0, 0], ['thing', 'rug', 9, 6.5, 0],
      ['thing', 'window', 9, 0.4, 1.4], ['light', 9, 6, 3, { color: '#ffd0a0', reach: 22, power: 1.4 }], ['light', 3.4, 3, 2, { color: '#ffb070', reach: 9, power: .9 }]]
  });
}

// ---------------------------------------------------------------- 00A HOTEL NADA LOBBY
{
  const g = mkgrid(40, 28);
  for (const [x, y] of [[13, 9], [27, 9], [13, 17], [27, 17], [20, 21], [6, 14]]) put(g, x, y, x, y, 'P');
  A('00A', {
    title: 'GRAND HOTEL NADA', sub: 'THE LOBBY', target: 0, music: 'hotel', ambience: 'hotel', mood: 'hotel',
    w: 40, h: 28, rows: rows(g), ground: 'tiles', colors: { base: '#e6e2da', dark: '#2a2226', light: '#f4efe6', size: 8 }, wallColor: '#4a2a32',
    sky: '#05040a', fog: { color: '#0a0608', near: 60, far: 520 }, ambient: ['#7a6a74', '#241a22', 1.7],
    nodes: {
      start: { t: [35.5, 24.5], kind: 'entry' }, j1: { t: [28.5, 21.5], kind: 'junction' }, j2: { t: [20.5, 14.5], kind: 'junction' }, j3: { t: [9.5, 21.5], kind: 'junction' },
      j4: { t: [20.5, 6.5] }, j5: { t: [7.5, 11.5] }, east: { t: [35.5, 13.5] }, bar: { t: [4.5, 25] }, cloak: { t: [4.5, 5] }, elev: { t: [20.5, 2.6], kind: 'exit', to: ['00C', 'n0'], needs: 'servicekey' }
    },
    edges: [
      { id: 'e1', a: 'start', b: 'j1', kind: 'walk' }, { id: 'e2', a: 'j1', b: 'j2', kind: 'walk', via: [[24, 18.5]] }, { id: 'e3', a: 'j2', b: 'j3', kind: 'walk', via: [[15, 18.5]] },
      { id: 'e4', a: 'j1', b: 'j3', kind: 'walk', via: [[20, 24.5]] }, { id: 'e5', a: 'j2', b: 'j4', kind: 'walk' }, { id: 'e6', a: 'j2', b: 'east', kind: 'walk', via: [[28, 13.5]] },
      { id: 'e7', a: 'j3', b: 'bar', kind: 'walk', gate: 'rope' }, { id: 'e8', a: 'j3', b: 'j5', kind: 'walk', via: [[8, 16.5]] },
      { id: 'e9', a: 'j5', b: 'cloak', kind: 'walk', gate: 'glass' }, { id: 'e10', a: 'j4', b: 'elev', kind: 'walk', gate: 'lock' }],
    gates: { rope: { kind: 'buyout', price: 25, who: 'gustav', label: 'MEMBERS ONLY', text: 'A velvet rope. Members only. Membership costs 25 Red.' },
      glass: { kind: 'echowall', who: 'jodl', label: 'GLASS WALL', text: 'A wall of hotel glass hums at one note. Someone with the right voice could shatter it.' },
      lock: { kind: 'key', item: 'servicekey', label: 'STAFF LIFT', text: 'The staff lift. It wants a brass Service Key.' } },
    spots: [
      { id: 'murmel', node: 'east', kind: 'npc', who: 'murmel', talk: 'murmel_00A', label: 'MURMEL' },
      { id: 'phone', node: 'j4', kind: 'phone', talk: 'concierge_00A', label: 'HOUSE PHONE' },
      { id: 'pin1', node: 'bar', kind: 'pickup', item: 'pin1', label: 'LIFT PIN' }, { id: 'rime1', node: 'bar', kind: 'pickup', item: 'rime', n: 4, label: 'RIME' },
      { id: 'key', node: 'cloak', kind: 'pickup', item: 'servicekey', label: 'SERVICE KEY' }, { id: 'pin2', node: 'east', kind: 'pickup', item: 'pin2', label: 'LIFT PIN' },
      { id: 'v1', edge: 'e2', s: .5, kind: 'pickup', item: 'red', n: 14, label: 'RED' }, { id: 'v2', edge: 'e4', s: .5, kind: 'pickup', item: 'red', n: 12, label: 'RED' },
      { id: 'v3', edge: 'e6', s: .6, kind: 'pickup', item: 'red', n: 14, label: 'RED' }, { id: 'v4', edge: 'e8', s: .5, kind: 'pickup', item: 'red', n: 14, label: 'RED' }],
    spawns: { a: [18, 11], b: [23, 11], c: [14, 14], d: [26, 15], e: [12, 25], f: [14, 20], g: [8, 8], h: [10, 14], i: [18, 4], k: [23, 4], l: [22, 9], m: [18, 9] },
    waves: {
      w1: { spawn: [['giggler', 'a', 0], ['giggler', 'b', 1.8]] },
      w2: { spawn: [['giggler', 'e', 0], ['bellhop', 'f', 1.5]] },
      w3: { spawn: [['giggler', 'g', 0], ['giggler', 'h', 1.2], ['thrower', 'g', 2.5]] },
      w4: { spawn: [['bellhop', 'i', 0], ['bellhop', 'k', 2], ['giggler', 'l', 3]] },
      w5: { spawn: [['giggler', 'c', 0], ['skier', 'd', 1], ['giggler', 'm', 2]] }
    },
    triggers: [
      { id: 'card', node: 'start', once: true, beat: 't00_card' },
      { id: 'tut_scan', edge: 'e1', s: .95, once: true, beat: 't00_first', wave: 'w5' },
      { id: 'tw1', node: 'j2', once: true, wave: 'w1', beat: 't00_junction' }, { id: 'tw2', node: 'j3', once: true, wave: 'w2' },
      { id: 'tw3', node: 'j5', once: true, wave: 'w3' }, { id: 'tw4', node: 'j4', once: true, wave: 'w4', beat: 't00_phone' }],
    props: [['thing', 'chandelier', 20, 14, 5.4], ['thing', 'desk', 31.5, 18.5, 0], ['thing', 'bar', 4.5, 23, 0], ['thing', 'liftdoor', 20.5, 1.3, 0], ['thing', 'runner', 20, 14, 0],
      ['thing', 'glasswall', 4.5, 8, 0], ['thing', 'rope', 5.5, 24, 0], ['thing', 'marmot', 36.5, 15, 0], ['thing', 'plant', 33, 4, 0], ['thing', 'plant', 37, 22, 0],
      ['shape', 'table', 33, 8, 0], ['shape', 'chair', 31.8, 8, 0], ['shape', 'chair', 34.2, 8, 3.14], ['shape', 'bookcase', 37.2, 9.5, 0],
      ['light', 20, 14, 4.8, { color: '#ffe0b0', reach: 30, power: 1.6, flicker: .03 }], ['light', 10, 22, 3.5, { color: '#ff9a70', reach: 14, power: 1 }], ['light', 6, 6, 3.5, { color: '#a0d0ff', reach: 12, power: .9 }], ['light', 32, 18, 3.5, { color: '#ffd8a0', reach: 14, power: 1 }]]
  });
}

// ---------------------------------------------------------------- 00C BOSS: BELLCAPTAIN GRAU
{
  const g = mkgrid(26, 26);
  A('00C', {
    title: 'ELEVATOR SHAFT', sub: 'THE BELLCAPTAIN', target: 0, boss: 'grau', music: 'boss1', ambience: 'shaft', mood: 'shaft',
    w: 26, h: 26, rows: rows(g), ground: 'tiles', colors: { base: '#8a7a50', dark: '#241c14', light: '#b8a070', size: 8 }, wallColor: '#3a2c20',
    sky: '#04030a', fog: { color: '#0a0604', near: 50, far: 420 }, ambient: ['#6a5a50', '#201814', 1.5],
    cam: { at: [13, 25.0, 6.5], look: [13, 11, 1.2], fov: 70 },
    nodes: (() => { const n = {}; for (let i = 0; i < 8; i++) { const a = Math.PI / 2 + i * Math.PI / 4; n['n' + i] = { t: [13 + Math.cos(a) * 7.5, 14 + Math.sin(a) * 7.5] }; } n.out = { t: [13, 24.2], kind: 'exit', to: ['01A', 'start'] }; return n; })(),
    edges: (() => { const e = []; for (let i = 0; i < 8; i++) e.push({ id: 'r' + i, a: 'n' + i, b: 'n' + ((i + 1) % 8), kind: 'walk', arc: true }); e.push({ id: 'ro', a: 'n0', b: 'out', kind: 'walk', locked: 'boss' }); return e; })(),
    spots: [], spawns: { a: [8, 8], b: [18, 8], c: [6, 14], d: [20, 14] },
    waves: { hop: { spawn: [['bellhop', 'a', 0], ['giggler', 'b', 1]] }, hop2: { spawn: [['giggler', 'c', 0], ['giggler', 'd', .8], ['thrower', 'a', 2]] } },
    triggers: [{ id: 'bossstart', node: 'n0', once: true, beat: 't00_boss', boss: 'grau' }],
    props: [['thing', 'bellframe', 13, 4.2, 0], ['light', 13, 8, 5, { color: '#ffc080', reach: 26, power: 1.6, flicker: .08 }], ['light', 13, 20, 4, { color: '#ff8060', reach: 16, power: 1 }]]
  });
}

// ---------------------------------------------------------------- 01A OBERGLÜCK VILLAGE
{
  const g = mkgrid(56, 40);
  A('01A', {
    title: 'OBERGLÜCK', sub: 'THE VILLAGE', target: 1, music: 'village', ambience: 'wind', mood: 'dusk', snow: true,
    w: 56, h: 40, rows: rows(g), ground: 'snow', colors: { base: '#eaf0f8', dark: '#9fb0cc', light: '#ffffff' }, wallColor: '#6a5a50',
    sky: ['#4a3a6a', '#e89a8a'], fog: { color: '#c8a6b8', near: 60, far: 600 }, ambient: ['#c8b8e0', '#5a5a7a', 1.7],
    nodes: {
      start: { t: [6.5, 34.5], kind: 'entry' }, v1: { t: [16.5, 30.5] }, v2: { t: [28.5, 28.5] }, v3: { t: [14.5, 20.5] }, v4: { t: [28.5, 18.5] }, v5: { t: [42.5, 22.5] },
      v6: { t: [30.5, 8.5] }, shop: { t: [49.5, 22.5] }, garden: { t: [6.5, 12.5] }, station: { t: [41.5, 5.5], kind: 'exit', to: ['01C', 'base'], needs: 'tbar' }
    },
    edges: [
      { id: 'a1', a: 'start', b: 'v1', kind: 'walk', via: [[11, 33.5]] }, { id: 'a2', a: 'v1', b: 'v2', kind: 'walk', via: [[22, 31]] }, { id: 'a3', a: 'v1', b: 'v3', kind: 'walk', via: [[15, 25.5]] },
      { id: 'a4', a: 'v2', b: 'v4', kind: 'walk' }, { id: 'a5', a: 'v3', b: 'v4', kind: 'walk', via: [[21, 19]] }, { id: 'a6', a: 'v4', b: 'v5', kind: 'walk', via: [[35, 21]] },
      { id: 'a7', a: 'v4', b: 'v6', kind: 'walk', via: [[28.5, 13]] }, { id: 'a8', a: 'v5', b: 'shop', kind: 'walk', gate: 'shopdoor' }, { id: 'a9', a: 'v3', b: 'garden', kind: 'walk', gate: 'garden' },
      { id: 'a10', a: 'v6', b: 'station', kind: 'walk', gate: 'serac' }],
    gates: {
      shopdoor: { kind: 'echowall', who: 'jodl', label: 'FROZEN SHOP', text: 'The shop window has frozen into one fragile note. Sing it down.' },
      garden: { kind: 'buyout', price: 30, who: 'gustav', label: 'PRIVATE GARDEN', text: 'A gardener demands 30 Red to "not look".' },
      serac: { kind: 'charge', who: 'mara', label: 'ICE SERAC', text: 'A serac blocks the lift station. A shaped charge would persuade it.' } },
    spots: [
      { id: 'murmel', node: 'v2', kind: 'npc', who: 'murmel', talk: 'murmel_01A', label: 'MURMEL' }, { id: 'pim', node: 'v3', kind: 'npc', who: 'pim', talk: 'pim_01A', label: 'PIM' },
      { id: 'phone', node: 'v4', kind: 'phone', talk: 'concierge_01A', label: 'RED PHONE BOX' },
      { id: 'tbar', node: 'shop', kind: 'pickup', item: 'tbar', label: 'T-BAR TOKEN' }, { id: 'pin3', node: 'garden', kind: 'pickup', item: 'pin3', label: 'LIFT PIN' }, { id: 'coatm', node: 'garden', kind: 'pickup', item: 'coat_mara', label: 'A COAT' }, { id: 'rime2', node: 'garden', kind: 'pickup', item: 'rime', n: 5, label: 'RIME' },
      { id: 'pin4', node: 'shop', kind: 'pickup', item: 'pin4', label: 'LIFT PIN' }, { id: 'coat', node: 'v6', kind: 'pickup', item: 'coat_vesper', label: 'A COAT' },
      { id: 'v1', edge: 'a2', s: .5, kind: 'pickup', item: 'red', n: 16, label: 'RED' }, { id: 'v2', edge: 'a5', s: .5, kind: 'pickup', item: 'red', n: 16, label: 'RED' }, { id: 'v3', edge: 'a7', s: .5, kind: 'pickup', item: 'red', n: 16, label: 'RED' }],
    spawns: { a: [20, 24], b: [24, 22], c: [12, 28], d: [34, 24], e: [38, 14], f: [24, 12], g: [32, 10], h: [10, 16], i: [44, 26], k: [36, 8], l: [20, 14], m: [30, 24] },
    waves: {
      w1: { spawn: [['giggler', 'c', 0], ['giggler', 'a', 1], ['skier', 'b', 2.5]] },
      w2: { spawn: [['skier', 'd', 0], ['skier', 'e', .7], ['thrower', 'm', 2], ['giggler', 'l', 3]] },
      w3: { spawn: [['sumo', 'f', 0], ['giggler', 'g', 2]] },
      w4: { spawn: [['bellhop', 'k', 0], ['thrower', 'g', 1], ['skier', 'f', 2]] },
      w5: { spawn: [['sumo', 'i', 0], ['skier', 'd', 2]] }
    },
    triggers: [
      { id: 'card', node: 'start', once: true, beat: 't01_card' },
      { id: 'tw1', node: 'v1', once: true, wave: 'w1', beat: 't01_arrive' }, { id: 'tw2', node: 'v4', once: true, wave: 'w2' },
      { id: 'tw3', node: 'v3', once: true, wave: 'w3', beat: 't01_pim' }, { id: 'tw4', node: 'v6', once: true, wave: 'w4' }, { id: 'tw5', node: 'v5', once: true, wave: 'w5' }],
    props: [['thing', 'chalet', 9, 28, 0], ['thing', 'chalet', 20, 36, 0], ['thing', 'chalet', 20, 10, 0], ['thing', 'chalet', 36, 31, 0], ['thing', 'chalet', 48, 28, 0], ['thing', 'chalet', 8, 5, 0], ['thing', 'chalet', 46, 14, 0],
      ['thing', 'fir', 4, 30, 0], ['thing', 'fir', 36, 12, 0], ['thing', 'fir', 24, 4, 0], ['thing', 'fir', 50, 36, 0], ['thing', 'fir', 12, 38, 0], ['thing', 'fir', 52, 8, 0], ['thing', 'fir', 3, 20, 0],
      ['thing', 'snowman', 33, 28, 0], ['thing', 'marmot', 29.8, 29, 0], ['thing', 'phonebox', 29.6, 18, 0], ['thing', 'serac', 36.5, 7, 0], ['thing', 'tstation', 43.5, 4, 0], ['thing', 'frozenshop', 51, 22, 0], ['thing', 'gardengate', 7.8, 13.5, 0],
      ['light', 28, 18, 4, { color: '#ff6a5a', reach: 10, power: 1 }], ['light', 14, 22, 4, { color: '#ffd090', reach: 14, power: 1 }], ['light', 40, 22, 4, { color: '#ffd090', reach: 14, power: 1 }], ['light', 8, 33, 4, { color: '#ffd090', reach: 14, power: 1 }]]
  });
}

// ---------------------------------------------------------------- 01C THE BLACK RUN (terrain: lift up, then ski down)
S7.blackRunHeight = (x, y) => (250 - y) * .2 + Math.sin(x * .07 + y * .02) * 2.2 + Math.sin(y * .06) * 1.4;
A('01C', {
  title: 'THE BLACK RUN', sub: 'T-BAR AND DOWNHILL', target: 1, music: 'blackrun', ambience: 'wind', mood: 'night', snow: true, terrain: true,
  w: 160, h: 270, height: S7.blackRunHeight, ground: 'snow',
  sky: ['#05060f', '#2a3a6a'], fog: { color: '#0a1020', near: 90, far: 700 }, ambient: ['#8a9ad0', '#2a3050', 1.5],
  nodes: {
    base: { t: [70, 246], kind: 'entry' }, top: { t: [64, 14], kind: 'junction' }, mid: { t: [62, 128], kind: 'junction' }, rest: { t: [70, 252], kind: 'exit', to: ['01F', 'f0'] },
    fork: { t: [50, 66] }, join: { t: [60, 190] }
  },
  edges: [
    { id: 'lift', a: 'base', b: 'top', kind: 'lift', via: [[70, 130]] },
    { id: 's1', a: 'top', b: 'mid', kind: 'ski', via: [[44, 40], [52, 84], [70, 108]] },
    { id: 's1b', a: 'top', b: 'mid', kind: 'ski', via: [[74, 52], [64, 90]], steep: true },
    { id: 's2', a: 'mid', b: 'join', kind: 'ski', via: [[34, 150], [76, 172]] },
    { id: 's2b', a: 'mid', b: 'join', kind: 'ski', via: [[90, 150], [74, 172]], steep: true },
    { id: 's3', a: 'join', b: 'rest', kind: 'ski', via: [[44, 214], [78, 236]] }],
  spots: [
    { id: 'murmel', node: 'top', kind: 'npc', who: 'murmel', talk: 'murmel_01C', label: 'MURMEL' }, { id: 'pin5', edge: 's1', s: .5, kind: 'pickup', item: 'pin5', label: 'LIFT PIN' },
    { id: 'pin6', edge: 's2b', s: .5, kind: 'pickup', item: 'pin6', label: 'LIFT PIN' }, { id: 'rime3', edge: 's1b', s: .5, kind: 'pickup', item: 'rime', n: 5, label: 'RIME' },
    { id: 'r1', edge: 's1', s: .3, kind: 'pickup', item: 'red', n: 12, label: 'RED' }, { id: 'r2', edge: 's2', s: .4, kind: 'pickup', item: 'red', n: 12, label: 'RED' }, { id: 'r3', edge: 's3', s: .4, kind: 'pickup', item: 'red', n: 12, label: 'RED' }],
  spawns: {},
  waves: {},
  triggers: [
    { id: 'tl', edge: 'lift', s: .15, once: true, beat: 't01_lift', run: { type: 'lift1' } },
    { id: 'tl2', edge: 'lift', s: .55, once: true, run: { type: 'lift2' } },
    { id: 'tk1', edge: 's1', s: .1, once: false, run: { type: 'ski1' } }, { id: 'tk1b', edge: 's1b', s: .1, run: { type: 'ski1' } },
    { id: 'tk2', edge: 's2', s: .1, run: { type: 'ski2' } }, { id: 'tk2b', edge: 's2b', s: .1, run: { type: 'ski2' } }, { id: 'tk3', edge: 's3', s: .1, run: { type: 'ski3' } }],
  props: []
});

// ---------------------------------------------------------------- 01F THE SUMMIT: POWDER KING
{
  const g = mkgrid(34, 34);
  A('01F', {
    title: 'THE SUMMIT', sub: 'THE POWDER KING', target: 1, boss: 'king', music: 'boss2', ambience: 'wind', mood: 'ice', snow: true,
    w: 34, h: 34, rows: rows(g), ground: 'snow', colors: { base: '#d8e8f8', dark: '#7a9ac8', light: '#ffffff' }, wallColor: '#6a90c0',
    sky: ['#0a0a22', '#5a7ac0'], fog: { color: '#2a3a6a', near: 60, far: 520 }, ambient: ['#a0b8f0', '#2a3a6a', 1.7],
    cam: { at: [17, 33.0, 8.0], look: [17, 13, 3.4], fov: 74 },
    nodes: (() => { const n = {}; for (let i = 0; i < 8; i++) { const a = Math.PI / 2 + i * Math.PI / 4; n['f' + i] = { t: [17 + Math.cos(a) * 9, 19 + Math.sin(a) * 9] }; } n.f0 = { t: [17, 28], kind: 'entry' }; n.out = { t: [17, 31.4], kind: 'exit', to: ['room7', 'door'] }; return n; })(),
    edges: (() => { const e = []; for (let i = 0; i < 8; i++) e.push({ id: 'q' + i, a: 'f' + i, b: 'f' + ((i + 1) % 8), kind: 'walk', arc: true }); e.push({ id: 'qo', a: 'f0', b: 'out', kind: 'walk', locked: 'boss' }); return e; })(),
    spots: [], spawns: { a: [8, 10], b: [26, 10], c: [6, 20], d: [28, 20] },
    waves: { add1: { spawn: [['skier', 'a', 0], ['skier', 'b', .5], ['giggler', 'c', 1.5]] }, add2: { spawn: [['thrower', 'a', 0], ['thrower', 'b', .4], ['giggler', 'd', 2]] } },
    triggers: [{ id: 'bossstart', node: 'f0', once: true, beat: 't01_boss', boss: 'king' }],
    props: [['thing', 'colossus', 17, 8, 0], ['light', 17, 10, 6, { color: '#a0c0ff', reach: 30, power: 1.6 }], ['light', 17, 24, 4, { color: '#ffffff', reach: 16, power: 1 }]]
  });
}
{   // trees along the Black Run: scattered by a seeded stream, kept clear of the rails
  const A = S7.reg.areas['01C'], rng = S7.rng(99), segs = [];
  for (const e of A.edges) { const pts = [A.nodes[e.a].t, ...(e.via || []), A.nodes[e.b].t]; for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1]]); }
  const dseg = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = S7.clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l, 0, 1); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
  let n = 0;
  for (let k = 0; k < 900 && n < 80; k++) { const x = rng.range(8, 150), y = rng.range(6, 262); if (segs.some(s => dseg(x, y, s[0], s[1]) < 9)) continue; A.props.push(['thing', 'fir', x, y, 0]); n++; }
  A.props.push(['thing', 'tstation', 66, 248, 0], ['thing', 'tstation', 60, 8, 0], ['light', 64, 16, 5, { color: '#ffd090', reach: 20, power: 1 }], ['light', 70, 247, 5, { color: '#ffd090', reach: 20, power: 1 }]);
}
S7.AREA_ORDER = ['room7', '00A', '00C', '01A', '01C', '01F'];

/* ===== content/30-story.js ===== */
// Story: beats as data. Killer7's register: deadpan, cryptic, euphemistic. Tokens like {go} become the player's own button.
const say = (who, text, o) => Object.assign({ say: who, text }, o);
const BEAT = (id, steps) => { S7.reg.beats[id] = steps; };
S7.NAMES = { oma: 'OMA HOLLE', rosalind: 'SISTER ROSALIND', murmel: 'MURMEL', pim: 'PIM', concierge: 'THE CONCIERGE', grau: 'BELLCAPTAIN GRAU', king: 'THE POWDER KING', sweep: 'THE SWEEP', foehn: 'MISTER FÖHN', narrator: '' };

BEAT('intro', [
  { card: 'PIZ NADA', sub: 'IT HAS SNOWED HERE FOR A HUNDRED YEARS', t: 3.2 },
  say('oma', 'Come closer, dears. Not you, the one behind you. Yes. All seven.'),
  say('oma', 'I am a hundred and four. I am holding the mountain down with a featherbed. It is a very large featherbed.'),
  say('oma', 'Mister Föhn has sent his warm wind. It makes people laugh until they are no longer in the room. We call them Whiteouts.'),
  say('oma', 'The Department of Discretion sends me guests. You will check them out for me.'),
  say('rosalind', 'She means you will shoot them, Sir. Please use the corridor door when you are ready. The Wardrobe is to the right. The Bench is for waxing. The clock is for remembering.'),
  say('rosalind', 'Hold {ring} to choose a coat. Stand at the Clock and press {interact} to save. Mind the cuckoo.'),
  { flag: 'intro_done' }, { dossier: 'd_oma' }, { dossier: 'd_foehn' }, { dossier: 'd_seven' }
]);
BEAT('oma', t => !t.bosses.grau ? [say('oma', 'The Bellcaptain has taken the lift. Go and ask him to ring down.'), say('oma', 'Do wipe your boots. There is a hundred years on them.')]
  : !t.bosses.king ? [say('oma', 'You smell of brass, dear. Good. Now the village. It has been laughing since Thursday.'), say('oma', 'The Powder King sits at the top. He is made of everyone who stayed too long.')]
  : [say('oma', 'You are all still here. How odd. How lovely.')]);
BEAT('rosalind', t => [say('rosalind', 'The Wardrobe holds your coats, Sir. Whoever you are, someone else is wearing you.'), say('rosalind', t.pins.length < 7 ? 'Lift Pins, Sir? You have ' + t.pins.length + ' of seven. They are in the strangest places. I put one in the soup.' : 'Seven pins. The Department will be thrilled. It will not say so.'), say('rosalind', 'Tea is at four. It was always four. There is no tea.')]);
BEAT('coat_mara', [say('mara', 'A hard hat with a lamp. And a note: "Do not light." I will light it later.'), { dossier: 'd_seven' }]);
BEAT('coat_vesper', [say('vesper', 'A coat with a camera in the pocket. How considerate.'), { dossier: 'd_seven' }]);
BEAT('got_key', [say('rurik', 'Brass. Warm. The staff lift will take it.')]);

// ---- Target 00: Turn-Down Service
BEAT('t00_card', [{ card: 'TARGET 00', sub: 'TURN-DOWN SERVICE', t: 3 }, say('concierge', 'Welcome to the Grand Hotel Nada. Checkout is at eleven. Everyone checks out at eleven.'), { music: 'hotel' }]);
BEAT('t00_first', [
  say('rurik', 'Something is laughing. I cannot see it.'),
  say('rurik', 'Hold {aim} to look. Press {scan} and the cold will show me what is laughing. Then {fire} at the glowing Warm Spot.', { mood: 'tutorial' }),
  { dossier: 'd_whiteout' }
]);
BEAT('t00_junction', [say('anselma', 'A junction. Lean on the stick toward the way you want, then hold {go}. Tap {turn} to turn about.')]);
BEAT('t00_phone', [say('concierge', 'The house telephone. How may I direct your call to the afterlife?'), say('concierge', 'The Bellcaptain keeps the lift. He rings when he is lonely. Shoot what glows while the bell is still ringing.')]);
BEAT('murmel_00A', t => [
  say('murmel', 'Psst. Over here. I am a marmot. I am bungeed to a ski rack. This is my professional life.'),
  say('murmel', !t.items.servicekey ? 'The key is in the cloakroom behind a wall of hotel glass. The glass hums one note. Wear the Yodeler and press {skill} at the wall.' : 'You have the brass. The staff lift is north of the middle. Go on.'),
  say('murmel', 'A gentleman in fur can open a rope. It costs Red. Gratuity is customary.'), { dossier: 'd_murmel' }
]);
BEAT('concierge_00A', [say('concierge', 'This is the house telephone. You have been placed on hold. The hold music is the sound of snow.')]);
BEAT('t00_boss', [
  { card: 'THE BELLCAPTAIN', sub: 'AUGUSTIN GRAU, LIFT 1', t: 2.6 },
  say('grau', 'Another guest. How lovely. I carry the luggage of the dead, and I am so very tired of it.'),
  say('grau', 'Ring, ring. Ring, ring. The bell has a warm spot. The warm spot has a bell.'),
  say('rurik', 'When the bell rings, the Warm Spot opens. Shoot it then. Move on the ring between shots.', { mood: 'tutorial' }),
  { boss: 'grau' }
]);
BEAT('t00_boss_down', [
  { wait: .8 }, say('grau', 'Checkout... is... at eleven.'), { shake: 1 },
  say('grau', 'Please leave a review. Someone is always reading.'),
  { unlock: 'baron' }, { result: 0 }, { card: 'CHECKED OUT', sub: 'TARGET 00 COMPLETE', t: 2.6 },
  say('oma', '(From a long way away.) Good, dears. Come back and wax. The mountain has more rooms.'),
  { go: ['room7', 'door'] }
]);

// ---- Target 01: Après
BEAT('t01_card', [{ card: 'TARGET 01', sub: 'APRÈS', t: 3 }, say('narrator', 'Oberglück. Six chalets. Four hundred ghosts. It is après-ski, forever.'), { music: 'village' }]);
BEAT('t01_arrive', [say('anselma', 'The snow is trying very hard to look like nothing happened.')]);
BEAT('murmel_01A', t => [
  say('murmel', 'A new village, the same marmot. I live everywhere. It is a tragedy of leasing.'),
  say('murmel', !t.items.tbar ? 'To go up, you need a T-Bar token. The shop east of the red phone has one. The shop is frozen. Frozen things shatter at the right note.' : 'Token in hand. The lift station is behind an ice serac. The Engineer knows ice. She likes ice. Ice does not like her.'),
  say('murmel', 'A gardener at the west hedge wants thirty Red to look the other way. Behind it hangs a coat for ice. A tycoon looks the other way for free but charges for it.'), { dossier: 'd_murmel' }
]);
BEAT('pim_01A', [
  say('pim', 'Hello! I am Pim. I am the lift boy. It is 1926. There are no chairs today, only the chair.'),
  say('pim', 'I wait. Someone always sits eventually. Not today. Today the warm wind sits for me.'),
  say('pim', 'Press {scan} when you hear laughing. Do not look for them. Look for what they leave: feet in the snow, breath in the air.'), { dossier: 'd_whiteout' }
]);
BEAT('t01_pim', [say('pim', '(A whisper from nowhere.) Two Warm Spots on the big one. Front and back. It is shy.')]);
BEAT('concierge_01A', [say('concierge', 'Red telephone. Reservations for the afterlife. Your table is by the window. The window is a snowdrift.')]);
BEAT('t01_lift', [say('mara', 'The T-bar. Four hundred meters of cable and nowhere to hide. {aim} works up here too.'), { dossier: 'd_accord' }]);
BEAT('murmel_01C', [say('murmel', 'Top of the Black Run. It is black because nobody has returned the colour.'), say('murmel', 'Ski it, hold {go}. Tap {turn} for a hockey stop and you can aim. Or tuck and trust the mountain.')]);
BEAT('t01_boss', [
  { card: 'THE POWDER KING', sub: 'MADE OF EVERYONE WHO STAYED TOO LONG', t: 2.8 },
  say('king', 'Ha. Ha. Ha. I am the party at the end of the world. Stay. The snow is lovely. It has your name on it.'),
  say('foehn', '(A warm breeze.) Laugh with him. Everyone does, in the end.'),
  say('vesper', 'He breathes in before every slide. When his chest opens, I will have a picture of it. So will you.', { mood: 'tutorial' }),
  { boss: 'king' }
]);
BEAT('t01_boss_down', [
  { wait: .8 }, say('king', 'Ha... ha... ha.'), { shake: 1 }, say('king', 'Is this the part where it stops snowing?'),
  { result: 1 }, { card: 'THAWED', sub: 'TARGET 01 COMPLETE', t: 2.6 },
  say('foehn', 'Oh, that one was sweet. Do come again. The wind is always warm somewhere.'),
  { go: ['room7', 'door'] }
]);
BEAT('epilogue', [
  { card: 'ROOM 7', sub: 'THURSDAY, AGAIN', t: 2.6 },
  say('oma', 'Seven coats. One body. Zero guests. That is a good number.'),
  say('rosalind', 'Tea, Sir? ... There is still no tea. But I made the effort.'),
  say('sweep', '...', { name: 'THE SWEEP' }),
  say('oma', 'It will snow again tomorrow. It always does. Go to sleep, dears. I will hold the mountain.'),
  { credits: true }
]);

/* ===== content/90-about.js ===== */
// The About / Credits text: the Source Information, Testing Feedback, Engine Feedback and Prompt Feedback sections.
S7.ABOUT = [
  'SKILLER7: SEVEN KILLERS, ONE MOUNTAIN. An original game inspired by Killer7. Every name, face, line and note in it is new.',
  '#SOURCE INFORMATION',
  'Date: 2026-11-04 02:31:41',
  'Source: Killer7',
  'Plan: PLAN.md (written by claude-opus-5-5 at max effort), built from at a smaller scope.',
  'Genre and Perspective: on-rails action-adventure shooter (AI Hub genre: Shooter). Third-person cinematic rail cameras while moving, first person while aiming.',
  'Tech: my-3D2dge v0.85.2 (the 2D engine runs the game; its 3D module, three.js r182 and Rapier 0.19.3 from a CDN, draws it). Plain JavaScript, one build script, no bundler. AI Hub session client 1.4.0.',
  'Art Direction: the engine\'s native look: PS1-resolution picture, pixel-art rigs on cards in 3D, the Comic cel filter. Snow white, black ink, saturated red. New hats, props, skis and guns.',
  'Animation: the engine\'s procedural rigs (E.Humanoid) with their poses, plus our hat styles; skis, the Sweep\'s kneel and first-person guns drawn with the 3D pen.',
  'Audio: all in code. Chip-synth songs, SFX voices, our own laughter synth and Animalese-style gibberish voices. No audio files.',
  'Online: AI Hub Session Protocol v1, ghost mode: Echo Run, a downhill time trial with the other players as ghosts. Alone, Echo Run races your own best run.',
  'Testing: headless Node suites (sim checks, systems checks, a scripted bot playthrough of the whole demo), a content validator, headless Chromium (boot, the whole demo in the real page, the AI Hub harness with 2 and 4 players, latency, loss and host-leave).',
  'Research: none beyond PLAN.md and the engine\'s manual.',
  'Environment: Claude Code CLI (headless); Linux; browser unknown.',
  'Model: Anthropic, claude-sonnet-5-5, reasoning effort medium.',
  'Usage: unknown.',
  '#TESTING FEEDBACK',
  'How many issues did testing catch? About 11: Room 7\'s door could not be walked through, a coat for the ice gate was never findable, a skill press reset the charge fuse, Target 00\'s results never showed, junction clicks were ignored, the hub reported no progress, the gun view went black under the filter, the terrain camera sat underground, the lift camera lost the hero, and two stale-state leaks.',
  'How many were critical? Five: the Room 7 door, the missing coat, the charge fuse, the hub progress and the black aim view.',
  'Most helpful test: the scripted playthrough, a bot that plays the real sim from a new game to the credits (and the same run in the real page with game.advance).',
  'Least helpful test: re-running the engine\'s own kit tests after a three-line engine patch; they passed and told me nothing about the game.',
  '#ENGINE FEEDBACK',
  'Liked most: the 3D module\'s fixed cameras, rigs drawn as cards and the Comic cel filter gave a Killer7 look almost for free, and the whole sim runs headless under Node with game.advance.',
  'Got stuck or guessed wrong: the engine\'s first-person overlay pass goes black when the cel filter is on (WebGL path), fog distances are in engine units not metres, and game.go() before game.start() has finished only warns.',
  'Most important thing built myself: the rail walker and its camera director, aim, scan and Warm Spot combat, the story beat runner, a controller-first canvas UI kit with glyph prompts, and the laughter and Animalese synths.',
  'Hardest part: learning the 3D module\'s units and conventions (pen frames, camera yaw and pitch, fog, terrain extents) from a header comment alone.',
  'Changed in the engine: eight new hat styles (beanie, ushanka, felt, hardhat, pillbox, racehelmet, beret, goggles) for the Seven; PlayStation button symbols as the default; and, in an AI Hub session, Options is ignored while Create is held. Each is marked S7 PATCH.',
  'One thing I would change: make the first-person overlay pass work under any filter, so a gun view model needs no workaround.',
  '#PROMPT FEEDBACK',
  'Liked most: the plan gave a real design, with numbers, a flow with timings and a tests chapter, and TASK.md\'s hard list (attract, dev sliders, hub, 10-foot UI) was unambiguous.',
  'Confusing: the plan is sized for a far bigger effort than the stated medium effort, and it never says what to cut first.',
  'Hardest thing: fitting a plan for nine areas, three bosses and forty source files into one working, finished vertical slice with no stubs.',
  'What I would change: mark every plan feature must, should or could, and say how much of the plan a lower effort level is expected to deliver.'
];

/* ===== src/90-things3d.js ===== */
// Props drawn by code: S7.things3d(W3) adds our kinds to World3D.THINGS. Units are engine units (16 = 1 m), origin at the base.
S7.things3d = function (W3) {
  const T = W3.THINGS, u = 16;
  const wood = '#6a4a32', dark = '#2a1c14', gold = '#d8b050', red = '#c8202c', snow = '#f2f6fc', ice = '#9fd0f0';
  T.bedbig = (p) => { p.box(0, 0, 8, 56, 40, 10, '#4a2a1c').box(0, 0, 16, 52, 36, 14, '#f4efe6').box(-16, 0, 22, 14, 30, 10, '#fffaf0').box(-26, 0, 20, 4, 40, 26, '#3a2014'); p.ball(6, 0, 26, 18, 14, 8, '#f8f4ea'); };
  T.cuckoo = (p, t, time) => { p.box(0, 0, 0, 16, 10, 20, '#6a3a22').cone(0, 0, 12, 0, 0, 24, 10, '#3a2014').ball(0, -5.2, 2, 4, 1, 4, '#f6f0dc').glow(0, -6, 2, .5, '#222'); const o = Math.max(0, Math.sin(time * .8)) > .96 ? 6 : 0; p.box(0, -6 - o, 9, 4, 4, 3, '#e8c040'); };
  T.bench = (p) => { p.box(0, 0, 14, 44, 18, 4, '#8a5a30').box(-18, 0, 6, 4, 14, 12, '#3a2414').box(18, 0, 6, 4, 14, 12, '#3a2414').box(0, 0, 18, 8, 4, 3, '#cfd6e0').box(-10, 0, 17, 5, 5, 2, '#e8c040').glow(10, 0, 20, 1.2, '#ffa050'); };
  T.wardrobe = (p) => { p.box(0, 0, 22, 44, 18, 44, '#4a2a1c').box(-11, -9.2, 22, 20, 1, 40, '#5a3622').box(11, -9.2, 22, 20, 1, 40, '#5a3622').ball(-2, -10, 22, 1.2, 1.2, 1.2, gold).ball(2, -10, 22, 1.2, 1.2, 1.2, gold); for (let i = 0; i < 7; i++) p.glow(-12 + i * 4, -10.4, 40, .7, ['#d81e2a', '#f5b700', '#3f7a52', '#7a3b5a', '#3b82f6', '#a8a8b8', '#e07a1a'][i]); };
  T.rug = (p) => { p.box(0, 0, .3, 70, 46, .6, '#7a1a24').box(0, 0, .6, 62, 38, .4, '#a0303a').box(0, 0, .9, 40, 22, .3, '#5a1018'); };
  T.window = (p) => { p.box(0, 0, 0, 30, 2, 44, '#10182c').box(0, 1, 0, 26, 1, 40, '#7aa0d8').glow(0, 2, 6, 6, '#a0c0f0').box(0, 0, 0, 2, 3, 44, '#2a1c14').box(0, 0, 0, 30, 3, 2, '#2a1c14'); };
  T.chandelier = (p, t, time) => { p.tube(0, 0, 0, 0, 0, 40, .5, '#222'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; p.tube(0, 0, 0, Math.cos(a) * 18, Math.sin(a) * 18, -4, .6, gold); p.glow(Math.cos(a) * 18, Math.sin(a) * 18, -2, 1.4 + Math.sin(time * 6 + i) * .15, '#ffe0a0'); } p.ball(0, 0, -2, 4, 4, 4, gold); };
  T.desk = (p) => { p.box(0, 0, 10, 72, 22, 20, '#3a2418').box(0, 0, 21, 76, 26, 3, '#5a3a24').box(-20, 0, 25, 8, 6, 5, '#e8e4dc').glow(-20, 0, 29, .8, '#ff4040').tube(24, 0, 22, 24, 0, 30, .5, gold).ball(24, 0, 32, 2, 2, 1.4, gold); };
  T.bar = (p) => { p.box(0, 0, 9, 96, 14, 18, '#3a1c14').box(0, 0, 19, 100, 18, 3, '#6a3a22'); for (let i = 0; i < 6; i++) { p.tube(-36 + i * 14, 8, 32, -36 + i * 14, 8, 44, 1.2, ['#c82020', '#2a9a5a', '#e0b040'][i % 3]); } p.box(0, 14, 36, 90, 2, 24, '#2a1810'); p.glow(0, 12, 46, 2, '#ffd080'); };
  T.liftdoor = (p, t, time) => { p.box(0, 0, 24, 50, 4, 48, '#8a7a50').box(-12, -2.2, 24, 22, 1, 44, '#b8a070').box(12, -2.2, 24, 22, 1, 44, '#b8a070').box(0, -2, 52, 36, 2, 6, '#2a1c14').glow(0, -3.5, 51, 1.2, '#ff5030'); };
  T.runner = (p) => { p.box(0, 0, .35, 36, 380, .5, '#8c1c28').box(0, 0, .7, 26, 380, .3, '#a02838'); };
  T.glasswall = (p, t, time) => { p.box(0, 0, 24, 56, 3, 48, '#bfe8f4').glow(0, 0, 24, 3.5, '#8fd8f0').box(0, 0, 24, 58, 4, 2, '#4a6a7a').box(0, 0, 49, 58, 4, 2, '#4a6a7a'); };
  T.rope = (p) => { p.tube(-24, 0, 14, 24, 0, 14, 1, '#b01830').tube(-24, 0, 14, 24, 0, 14, 1.4, '#b01830'); p.tube(-24, 0, 0, -24, 0, 18, 1.4, gold).ball(-24, 0, 19, 2.4, 2.4, 2.4, gold).tube(24, 0, 0, 24, 0, 18, 1.4, gold).ball(24, 0, 19, 2.4, 2.4, 2.4, gold); };
  T.marmot = (p, t, time) => { p.ball(0, 0, 8, 8, 6, 8, '#8a6a4a').ball(0, -5, 14, 4.4, 4, 4.4, '#a07a58').ball(-2, -8.6, 15, .9, .6, .9, '#111').ball(2, -8.6, 15, .9, .6, .9, '#111').ball(0, -9, 13, 1.6, 1, 1.2, '#e0a0a0').ball(-3, -4, 18, 1.4, 1, 1.4, '#6a4a30').ball(3, -4, 18, 1.4, 1, 1.4, '#6a4a30'); p.box(0, 8, 14, 30, 1, 2, '#666'); p.box(0, 8, 30, 3, 1, 30, '#666'); p.tube(4, 4, 14, 14, 8, 28, .5, '#333'); };
  T.plant = (p) => { p.box(0, 0, 5, 10, 10, 10, '#6a3a22'); for (let i = 0; i < 6; i++) { const a = i * 1.05; p.ball(Math.cos(a) * 5, Math.sin(a) * 5, 18 + (i % 2) * 4, 3, 3, 8, '#2a6a3a'); } };
  T.bellframe = (p, t, time) => { p.box(0, 0, 40, 120, 6, 4, '#3a2a1a').box(-58, 0, 20, 6, 6, 44, '#3a2a1a').box(58, 0, 20, 6, 6, 44, '#3a2a1a'); for (let i = -1; i <= 1; i++) { const sw = Math.sin(time * 2 + i) * 3; p.tube(i * 30, 0, 40, i * 30 + sw, 0, 28, .8, '#444'); p.cone(i * 30 + sw, 0, 12, i * 30 + sw, 0, 28, 7, gold); p.glow(i * 30 + sw, 0, 12, 1.2, '#fff0a0'); } };
  T.chalet = (p) => { p.box(0, 0, 18, 56, 40, 36, '#6a4a30').box(0, 0, 40, 60, 44, 3, '#4a2a18'); p.cone(0, 0, 38, 0, 0, 66, 36, snow); p.box(0, -20.5, 12, 10, 1, 20, '#3a2214'); p.glow(-14, -20.6, 20, 2.2, '#ffd080').glow(14, -20.6, 20, 2.2, '#ffd080'); p.box(0, 0, 40, 40, 30, 8, snow); };
  T.fir = (p) => { p.tube(0, 0, 0, 0, 0, 12, 2.4, '#4a3020'); p.cone(0, 0, 8, 0, 0, 34, 14, '#1c4a34').cone(0, 0, 22, 0, 0, 50, 11, '#245a3c').cone(0, 0, 36, 0, 0, 62, 8, '#2c6a46').cone(0, 0, 44, 0, 0, 62, 6.5, snow); };
  T.snowman = (p) => { p.ball(0, 0, 8, 9, 9, 8, snow).ball(0, 0, 21, 7, 7, 7, snow).ball(0, 0, 31, 5, 5, 5, snow).cone(0, -4, 31, 0, -11, 31, 1.2, '#e07020').ball(-1.8, -4.4, 33, .8, .8, .8, '#111').ball(1.8, -4.4, 33, .8, .8, .8, '#111').box(0, 0, 36, 8, 8, 4, '#111'); };
  T.phonebox = (p, t, time) => { p.box(0, 0, 18, 18, 18, 36, red).box(0, -9.2, 20, 14, 1, 24, '#ffd8d0').box(0, 0, 38, 20, 20, 3, '#901820'); p.glow(0, 0, 33, 1.4, '#ffd880'); };
  T.serac = (p, t, time) => { p.cone(-6, 0, 0, -6, 0, 78, 24, ice).cone(14, 6, 0, 14, 6, 62, 20, '#b8e0f8').cone(-18, -6, 0, -18, -6, 54, 14, '#8cc0e8').glow(-4, -22, 30, 3, '#a0e0ff'); };
  T.tstation = (p) => { p.box(0, 0, 18, 44, 30, 36, '#5a3a2a').box(0, 0, 38, 50, 36, 4, '#2a1c14').cone(0, 0, 38, 0, 0, 56, 30, snow); p.tube(-20, 20, 0, -20, 20, 90, 1.6, '#555'); p.tube(-20, 20, 90, 120, 20, 96, .5, '#222'); p.glow(0, -16, 20, 2, '#ffd080'); };
  T.frozenshop = (p) => { p.box(0, 0, 18, 40, 44, 36, '#5a4a6a').box(0, 0, 38, 44, 48, 3, '#3a2a4a').cone(0, 0, 38, 0, 0, 58, 32, snow); p.box(-21, 0, 16, 2, 30, 20, '#bfe8f4').glow(-22, 0, 16, 3, '#a0e0ff'); };
  T.gardengate = (p) => { for (let i = -2; i <= 2; i++) p.tube(i * 6, 0, 0, i * 6, 0, 22, .8, '#222'); p.tube(-14, 0, 14, 14, 0, 14, .8, '#222'); p.box(-16, 0, 14, 3, 3, 28, '#333').box(16, 0, 14, 3, 3, 28, '#333'); };
  T.colossus = (p, t, time) => {
    const b = Math.sin(time * 1.6) * 1.2; p.ball(0, 0, 40 + b, 38, 30, 44, snow).ball(0, 0, 86 + b, 26, 22, 26, '#f4f8ff').ball(0, 0, 118 + b, 18, 16, 18, snow).ball(-30, 0, 70, 12, 12, 30, '#e0eaf6').ball(30, 0, 70, 12, 12, 30, '#e0eaf6');
    p.box(0, -16, 124 + b, 22, 12, 6, '#111').cone(0, -16, 116 + b, 0, -34, 116 + b, 3, '#e07020').ball(-7, -16, 123, 3, 2, 3, '#111').ball(7, -16, 123, 3, 2, 3, '#111').box(0, 0, 138 + b, 26, 24, 10, '#1a1a22').box(0, 0, 146 + b, 16, 16, 12, '#1a1a22');
    for (let i = 0; i < 5; i++) p.ball(-8 + i * 4, -14, 108 + b + (i % 2), 1.8, 1.2, 1.8, '#222');
    for (let i = 0; i < 3; i++) p.ball(0, -22, 80 - i * 16 + b, 2.4, 2, 2.4, '#222');
  };
};

/* ===== src/91-present3d.js ===== */
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

/* ===== src/95-scenes.js ===== */
// Scenes: title (with attract after 10 s idle), play, attract. Room 7 is a mode of play.
const SC = S7.scenes = {};
const sim5 = S7.sim, st5 = S7.st;
let game5 = null;
S7.touchOnly = () => { try { const mm = q => window.matchMedia && window.matchMedia(q).matches; const pads = (navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : []); return mm('(hover: none) and (pointer: coarse)') && !pads.length && !('onkeydown' in window && mm('(hover: hover)')); } catch (e) { return false; } };
S7.quitToTitle = function () { if (S7.hub.active) return; UI.stack.length = 0; game5.go('title'); };
S7.newGame = function () {
  S7.newState({ difficulty: (game5.settings.difficulty || 'Normal').toLowerCase() }); UI.stack.length = 0;
  sim5.loadArea('room7', 'c'); sim5.enterRoom7(); st5.fadeIn = .6; game5.go('play');
};
S7.startEchoRun = function () {
  const old = S7.hub.loadEcho(); sim5.startEcho({ ghost: old ? old.rec : null, countdown: 3 }); UI.stack.length = 0; game5.go('play');
};
S7.continueGame = function () {
  const s = game5.saves.latest(); if (!s) return false; return game5.saves.load(s.slot);
};

// ---- the shared per-step sim drive
function drive(dt, I) {
  sim5.update(dt, I);
  if (st5.area !== S7.pres.areaId && st5.mode !== 'transition') S7.pres.load(st5.area);
  S7.pres.step(dt);
  if (st5.echo) S7.hub.tick(dt);
  if (st5.fadeIn > 0) st5.fadeIn = Math.max(0, st5.fadeIn - dt);
}
let prevPtr = null;
function clicks(game, I) {
  const cur = game.input.pointer(), moved = !!(cur && prevPtr && (cur[0] !== prevPtr[0] || cur[1] !== prevPtr[1])); prevPtr = cur ? cur.slice() : null;
  const hp = game.input.lastDevice !== 'gamepad' && moved && cur;
  if (hp) for (const z of UI.zones) if (z.kind === 'branch' && hp[0] >= z.r[0] && hp[0] < z.r[0] + z.r[2] && hp[1] >= z.r[1] && hp[1] < z.r[1] + z.r[3]) I.hover = z.i;
  const c = game.input.clicked && game.input.clicked(); if (!c) return;
  for (const z of UI.zones) if (c[0] >= z.r[0] && c[0] < z.r[0] + z.r[2] && c[1] >= z.r[1] && c[1] < z.r[1] + z.r[3]) {
    if (z.kind === 'branch') I.branch = z.i; else if (z.kind === 'spot') I.clickSpot = z.id; else if (z.kind === 'slot') { S7.sim.switchTo(S7.ROSTER[z.i]); } else if (z.kind === 'talk') I.confirm = true; break;
  }
}

// ---------------------------------------------------------------- title
SC.title = {
  enter() {
    if (S7.hub.active) return;   // in an AI Hub round there is no title: the hub starts and ends rounds
    this.idle = 0; this.t = 0; this.touch = S7.touchOnly();
    S7.newState({ difficulty: 'normal' }); sim5.loadArea('room7', 'c'); st5.cheats.god = true; S7.pres.load('room7'); S7.audio.music('title'); S7.audio.ambience('hum');
    const g = game5, items = [];
    const last = g.saves.latest ? g.saves.latest() : null;
    if (!this.touch) {
      if (last) items.push({ label: 'CONTINUE', onPick: () => { if (!S7.continueGame()) S7.audio.sfx('deny'); } });
      items.push({ label: 'NEW GAME', onPick: () => S7.newGame() }, { label: 'ECHO RUN', onPick: () => S7.startEchoRun() });
    }
    items.push({ label: 'SETTINGS', onPick: () => g.menu('settings') });
    if (!this.touch) items.push({ label: 'CONTROLS', onPick: () => g.menu('controls') });
    items.push({ label: 'ABOUT', onPick: () => UI.push(new S7.screens.About(false)) });
    this.list = new UI.FocusList(items, { x: 20, y: 120, w: 110, rowH: 14 });
  },
  update(dt) {
    if (S7.hub.active) { game5.go('play'); return; }
    const g = game5, n = UI.updateTop(dt, g) ? null : UI.readNav(g);
    this.t += dt; const any = g.input.anyPressed() || (g.input.pointer() && (this._p ? (g.input.pointer()[0] !== this._p[0] || g.input.pointer()[1] !== this._p[1]) : false)); this._p = g.input.pointer() ? g.input.pointer().slice() : null;
    if (any || UI.top()) this.idle = 0; else this.idle += dt;
    if (n) { this.list.o.y = g.H - 14 * this.list.items.length - 24; this.list.update(n); }
    if (this.idle >= 10 && !UI.top() && !g.paused) { game5.go('attract'); return; }
    st5.mode = 'rail'; sim5.update(dt, S7.noIntent()); S7.pres.step(dt);
  },
  draw(r) {
    if (S7.hub.active) return;
    S7.pres.draw(r); const W = r.W, H = r.H;
    r.overlay(g => {
      g.fillStyle = '#000'; g.globalAlpha = .45; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
      S7.E.font.title(g, 'SKILLER7', 18, 24, { scale: 4, colors: ['#ffffff', '#d81e2a'], outline: '#000', depth: 3, depthColor: '#4a0810' });
      UI.text(g, 'SEVEN KILLERS, ONE MOUNTAIN', 20, 62, '#e8e4f0'); UI.text(g, 'A GAME INSPIRED BY KILLER7', 20, 72, col.dim);
      if (this.touch) { UI.panel(g, W / 2 - 150, H / 2 - 30, 300, 36, { fill: '#000', alpha: .8, border: col.red }); UI.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', W / 2, H / 2 - 20, '#fff', { align: 'center' }); UI.text(g, 'Open settings below. The demo plays by itself.', W / 2, H / 2 - 8, col.dim, { align: 'center' }); }
      this.list.draw(g);
      UI.text(g, 'v' + S7.VERSION, W - 8 - UI.w('v' + S7.VERSION), H - 10, col.dim);
      if (!this.touch) UI.promptRow(g, [['confirm', 'SELECT']], W - 8, H - 24, 'right');
      if (this.idle > 6 && this.idle < 10) UI.text(g, 'DEMO IN ' + Math.ceil(10 - this.idle), W - 10 - UI.w('DEMO IN 0'), 8, col.dim);
    });
    UI.drawStack(r);
  }
};

// ---------------------------------------------------------------- play
SC.play = {
  pausable: true,
  enter() {
    game5.lights && (game5.lights.enabled = false);
    S7.pres.load(st5.area); S7.attract = false;
    if (st5.area === 'room7' && !st5.flags.intro_done && !st5.echo) sim5.playBeat('intro');
    S7.audio.music(S7.graph().A.music); S7.audio.ambience(S7.graph().A.ambience === 'wind' ? 'wind' : S7.graph().A.ambience === 'shaft' ? 'shaft' : 'hum');
    if (st5.echo) S7.audio.music('blackrun');
    this.ptr = null;
  },
  update(dt) {
    const g = game5;
    if (UI.updateTop(dt, g)) { S7.pres.step(0); return; }
    const mouse = st5.mode === 'aim' ? S7.pres.takeMouse() : (S7.pres.takeMouse(), [0, 0]);
    const locked = S7.pres.world && S7.pres.world.camera.locked, ptr = g.input.pointer();
    let look = mouse;
    if (st5.mode === 'aim' && !locked && g.settings.aimAssist !== false && g.input.lastDevice === 'mouse' && ptr) look = [(ptr[0] - g.W / 2) / (g.W / 2) * 5, (ptr[1] - g.H / 2) / (g.H / 2) * 5];
    const I = S7.intents(g, { mouse: look, pointer: ptr, W: g.W, H: g.H });
    clicks(g, I);
    if (S7.hub.ended) return;
    drive(dt, I);
  },
  draw(r) { S7.pres.draw(r); UI.hud(r, game5); S7.dev.draw(r); UI.drawStack(r); }
};

// ---------------------------------------------------------------- attract: the bot plays the real game; any input leaves
SC.attract = {
  enter() { this.t = 0; S7.attract = true; UI.stack.length = 0; S7.bot.setup(S7.bot.idx || 0); S7.pres.load(st5.area); S7.audio.music(S7.graph().A.music); this.p0 = game5.input.pointer() ? game5.input.pointer().slice() : null; this.grace = .6; },
  update(dt) {
    const g = game5; this.t += dt; this.grace -= dt;
    const p = g.input.pointer(), moved = p && this.p0 && Math.hypot(p[0] - this.p0[0], p[1] - this.p0[1]) > 6;
    if (this.grace < 0 && (g.input.anyPressed() || moved)) { S7.attract = false; g.go('title'); return; }
    const I = S7.bot.intents(dt); drive(dt, I);
    if (S7.bot.step(dt)) S7.pres.load(st5.area);
    S7.audio.ambience(S7.graph().A.ambience === 'wind' ? 'wind' : 'hum');
  },
  draw(r) { S7.pres.draw(r); UI.hud(r, game5); const W = r.W, H = r.H; r.overlay(g => { if (Math.floor(this.t * 1.5) % 2 === 0) UI.text(g, 'DEMO PLAY - PRESS ANY BUTTON', W / 2, H - 28, '#fff', { align: 'center', scale: 1 }); }); }
};
S7.bindScenes = g => { game5 = g; };

// ---------------------------------------------------------------- events that open screens
S7.bus.on('open', d => { if (S7.attract) return; const sc = S7.screens; if (d.screen === 'wardrobe') UI.push(new sc.Wardrobe()); else if (d.screen === 'bench') UI.push(new sc.Bench()); else if (d.screen === 'map') UI.push(new sc.Notes(0)); else if (d.screen === 'save') { sim5.saveHere(); game5.saves.show('save'); } });
S7.bus.on('result', d => { if (!S7.attract) UI.push(new S7.screens.Results({ target: d.target, stats: d.stats, rank: d.rank })); });
S7.bus.on('gameover', () => { if (!S7.attract) UI.push(new S7.screens.GameOver()); });
S7.bus.on('credits', () => { if (S7.attract) return; UI.push(new S7.screens.About(true)); S7.audio.music('credits'); });
S7.bus.on('arrived', d => {
  if (S7.attract) return; const st = S7.st;
  try { if (game5 && game5.saves && !st.echo) game5.saves.autosave(); } catch (e) { /* storage blocked */ }
  if (d.area === 'room7' && st.bosses.king && !st.flags.epilogue_done) { st.flags.epilogue_done = true; sim5.playBeat('epilogue'); }
  st.fadeIn = .5;
});
S7.bus.on('area', d => { if (!S7.attract && S7.st.area === '00A' && !S7.st.flags.t00_card) { S7.st.flags.t00_card = true; } });

/* ===== src/99-start.js ===== */
// S7.start: make the game, boot the 3D side, wire the sim to the scenes, the pause menu and saves, and the debug handle.
S7.start = async function (opts) {
  const E = S7.E, W3 = opts.World3D;
  const cfg = {
    canvas: 'screen', res: 'ps1', expand: true, bg: null, input: S7.INPUT, id: 'skiller7',
    menu: {
      controls: S7.CONTROLS, quit: 'title',
      settings: [...W3.SETTINGS.map(s => s.key === 'filter3d' ? Object.assign({}, s, { value: 'cel' }) : s),
        { key: 'difficulty', label: 'Difficulty', group: 'Game', value: 'Normal', options: ['Easy', 'Normal', 'Hard'], help: 'Easy: weaker blasts. Hard: sturdier Whiteouts and harder blasts.' },
        { key: 'aimAssist', label: 'Mouse aim without capture', group: 'Game', value: true, help: 'If the mouse is not captured, the pointer near the screen edge turns the view.' }],
      items: [['FIELD NOTES', () => { S7.game.resume(); if (['rail', 'junction'].includes(S7.st.mode)) UI.push(new S7.screens.Notes(0)); }], ['DEV MODE', () => { S7.game.resume(); UI.push(new S7.screens.Dev()); }], ['ABOUT', () => { S7.game.resume(); UI.push(new S7.screens.About(false)); }]],
      saves: {
        version: 1,
        write: () => ({ data: S7.sim.serialize(), place: S7.graph().A.title + ' / ' + S7.graph().A.sub, level: S7.st.pins.length + ' pins' }),
        read: save => { S7.newState({ difficulty: save.data.difficulty }); S7.sim.deserialize(save.data); S7.st.fadeIn = .6; UI.stack.length = 0; S7.game.go('play'); }
      }
    }
  };
  const game = S7.game = new E.Game(cfg);
  UI.game = game; S7.bindScenes(game);
  game.saves.canSave = false;
  S7.audio.defineAll(game.audio); S7.audio.wire();
  S7.newState({ difficulty: 'normal' });
  const hubInfo = await S7.hub.init();
  const steps = [['The 3D engine', () => S7.pres.boot(W3, game)]];
  if (hubInfo) steps.push(['The Black Run', () => { S7.sim.startEcho({ ghost: null, countdown: 3 }); S7.pres.load('01C'); }], ['Ready', () => { try { window.AIHub.ready(); } catch (e) { /* no hub */ } }]);
  else steps.push(['Room 7', () => { S7.sim.loadArea('room7', 'c'); S7.pres.load('room7'); }]);
  const boot = { title: 'SKILLER7', steps };
  S7.debugHandle(game);
  game.start({ scenes: { title: SC_title(), attract: S7.scenes.attract, play: Object.assign({}, S7.scenes.play, { update(dt) { game.saves.canSave = S7.st.area === 'room7' && S7.st.mode !== 'transition'; S7.scenes.play.update(dt); } }) }, scene: hubInfo ? 'play' : 'title', boot });
  S7.started = true;
};
function SC_title() { return S7.scenes.title; }

// ---- the handle for tests and tools
S7.debugHandle = function (game) {
  const st = S7.st, sim = S7.sim;
  game.debug = {
    snapshot: () => ({ scene: game.sceneName, mode: st.mode, area: st.area, node: st.node, edge: st.edge, s: +st.s.toFixed(2), dir: st.dir, speed: +st.speed.toFixed(2), persona: st.persona, hp: Math.round(st.roster[st.persona].hp), red: Math.round(st.red), rime: st.rime,
      items: Object.keys(st.items), pins: st.pins.length, flags: Object.assign({}, st.flags), objective: st.objective, enemies: { alive: st.enemies.filter(e => !e.dead).length, revealed: st.enemies.filter(e => !e.dead && e.visible > 0).length }, boss: st.boss ? { id: st.boss.id, phase: st.boss.phase, hp: Math.round(st.boss.hp), state: st.boss.state } : null, bosses: Object.assign({}, st.bosses), aim: { yaw: +st.aim.yaw.toFixed(2), pitch: +st.aim.pitch.toFixed(2) }, time: +st.time.toFixed(2), modal: S7.ui.stack.length, echo: st.echo ? { t: +st.echo.t.toFixed(1), hits: st.echo.hits, finished: st.echo.finished } : null }),
    teleport: (area, node) => { sim.loadArea(area, node); if (S7.pres.ready && game.sceneName === 'play') S7.pres.load(area); },
    setPersona: id => { st.roster[id].unlocked = true; st.persona = id; },
    give: (item, n = 1) => { st.items[item] = (st.items[item] || 0) + n; }, addRed: n => { st.red += n; }, addRime: n => { st.rime += n; },
    tune: (k, v) => S7.setTune(k, v), cheat: (name, on = true) => { st.cheats[name] = on; },
    killAll: () => { for (const e of st.enemies.slice()) if (!e.dead) sim.killEnemy(e, true); }, revealAll: () => { for (const e of st.enemies) e.visible = 60; },
    freeze: id => { st.persona = id || st.persona; sim.freezePersona(); }, wave: id => sim.startWave(id), beat: id => sim.playBeat(id), boss: id => { st.bosses[id] = false; sim.startBoss(id); },
    skipCutscene: () => { if (st.beat) { st.beat.i = st.beat.steps.length; st.beat = null; st.talk = null; st.cut = null; st.card = null; st.mode = 'rail'; } },
    hash: () => { let h = 0x811c9dc5; const s = JSON.stringify([st.area, st.edge, +st.s.toFixed(3), st.persona, st.red, st.rime, Object.keys(st.flags), st.enemies.map(e => [e.id, +e.x.toFixed(2), +e.y.toFixed(2), +e.hp.toFixed(2)]), st.boss && st.boss.hp, st.roster]); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); },
    intent: opts => S7.sim.update(1 / 60, Object.assign(S7.noIntent(), opts)),
    bot: { setup: i => S7.bot.setup(i), step: dt => { const I = S7.bot.intents(dt); sim.update(dt, I); return S7.bot.step(dt); } }
  };
  game.stateHash = () => game.debug.hash();
};

})();