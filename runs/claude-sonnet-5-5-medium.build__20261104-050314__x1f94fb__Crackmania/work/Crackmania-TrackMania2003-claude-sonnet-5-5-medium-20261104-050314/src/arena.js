// An arena: one course built in a 3D world (road sections, pits, gates, scenery), its cars, the run clock and gates, the bot.
import { compile, bounds } from './course.js';
import { ENVS, CARS, U } from './data.js';
import { CFG } from './config.js';
const E = globalThis.My3D2dge, W3 = E.World3D;
export const HOLD = { steer: 0, gas: 0, brake: 0, top: 1e-4 };
const SURF_COLOR = { dirt: '#8a6a44', ice: '#9ccbe4' };

/** the level: a flat ground over the course's bounds, walls round the edge, pits (the "crack") under every jump gap */
export function levelRows(c, env) {
  const b = bounds(c, 60 * U), T = 16, ox = 0, oy = 0;
  const cols = Math.ceil(b.x1 / T) + 1, rows = Math.ceil(b.y1 / T) + 1;
  const grid = Array.from({ length: rows }, (_, cy) => Array.from({ length: cols }, (_, cx) => (!cx || !cy || cx === cols - 1 || cy === rows - 1) ? '#' : '.'));
  for (const p of c.pits) {
    const dx = Math.cos(p.a), dy = Math.sin(p.a), L = Math.hypot(p.x1 - p.x0, p.y1 - p.y0);
    for (let cy = 1; cy < rows - 1; cy++) for (let cx = 1; cx < cols - 1; cx++) {
      const wx = (ox + cx + .5) * T, wy = (oy + cy + .5) * T, rx = wx - p.x0, ry = wy - p.y0, al = rx * dx + ry * dy, ac = -rx * dy + ry * dx;
      if (al > 10 && al < L - 10 && Math.abs(ac) < p.hw + 16) grid[cy][cx] = ' ';
    }
  }
  // scenery: seeded scatter of props clear of the road
  const rnd = E.rng(c.def.id.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)), kinds = { dust: ['k', 'k', 'x'], hedge: ['T', 'T', 'k', 'o'], frost: ['P', 'P', 'k'] }[env.id];
  const near = (wx, wy) => { for (let i = 0; i < c.line.length; i += 2) { const p = c.line[i]; if ((p.x - wx) ** 2 + (p.y - wy) ** 2 < (11 * U) ** 2) return true; } return false; };
  for (let n = 0; n < 220; n++) {
    const cx = 2 + Math.floor(rnd() * (cols - 4)), cy = 2 + Math.floor(rnd() * (rows - 4));
    if (grid[cy][cx] !== '.' || near((ox + cx + .5) * T, (oy + cy + .5) * T)) continue;
    grid[cy][cx] = kinds[Math.floor(rnd() * kinds.length)];
  }
  return { rows: grid.map(r => r.join('')), ox, oy, T };
}

export function makeArena(game, courseDef, o = {}) {
  const env = ENVS[courseDef.env], c = o.compiled || compile(courseDef), L = levelRows(c, env), tmp = {};
  const level = {
    rows: L.rows, ground: env.ground, colors: env.colors, side: env.side, color: env.colors.dark,
    legend: { k: { shape: 'rock', scale: 1.6 }, T: { shape: 'tree', scale: 1.5 }, P: { shape: 'pine', scale: 1.6 }, o: { shape: 'bush', scale: 1.4 }, x: { shape: 'barrel', scale: 1.2 } }
  };
  // the world is placed at level origin 0,0: shift the whole course so the level's origin is the world's
  const world = new W3(game, { level, gravity: CFG.gravity * U, fog: { color: env.fog[0], near: env.fog[1], far: env.fog[2] }, sky: env.sky, ambient: ['#e0eaff', '#8a7a5a', 2.2],
    sun: { color: env.sun, intensity: 2.6, dir: [-.5, .4, -.7], area: 700 }, torchLights: 0, camera: { mode: 'behind', far: 2600 }, onDraw: w => arena.draw(w) });
  const arena = { game, world, course: c, env, def: courseDef, cars: [], tracks: [], t: 0, ghosts: [], hooks: {}, decor: [] };
  c.sections.forEach(s => {
    const path = new E.Path(s.pts, { smooth: 'catmull' });
    const pads = (s.padPts || []).map(p => [path.nearest(p[0], p[1]), 0]);
    arena.tracks.push(world.track({ path, width: s.width, kerb: 6, bank: .2, wallH: 8, walls: true, pads, off: env.off, surface: s.surface, color: SURF_COLOR[s.surface] || env.road, kerbs: env.kerbs, wall: env.wall, line: s.surface === 'dirt' ? null : '#e8e4d0' }));
  });
  arena.draw = w => drawArena(arena, w);
  arena.spawn = (spec = {}) => spawnCar(arena, spec);
  arena.gateOf = i => c.gates[i];
  arena.dispose = () => { try { world.dispose(); } catch (e) { /* already gone */ } };
  if (env.id === 'dust') { const rnd = E.rng(3); for (let n = 0; n < 40; n++) { const p = c.line[Math.floor(rnd() * c.line.length)]; const a = rnd() * 6.28, d = (16 + rnd() * 50) * U; arena.decor.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, s: .8 + rnd() * .8 }); } }
  return arena;
}

function spawnCar(arena, spec) {
  const c = arena.course, g = spec.gate || c.start, car = CARS[spec.car || arena.env.car];
  const row = spec.slot || 0, off = (row % 2 ? 1 : -1) * 30 * (row ? 1 : 0), back = Math.floor(row / 2) * 64;
  const x = g.x - Math.cos(g.angle) * back + Math.cos(g.angle + Math.PI / 2) * off, y = g.y - Math.sin(g.angle) * back + Math.sin(g.angle + Math.PI / 2) * off;
  const v = arena.world.vehicle({ kind: 'car', x, y, z: g.z + 6, angle: g.angle, color: spec.color || car.color, top: car.top, accel: car.accel, brake: car.brake, turn: car.turn, grip: car.grip, drift: car.drift, hop: 0, surfaces: Object.assign({ boost: {} }, car.surfaces) });
  v.base = { top: car.top, accel: car.accel, brake: car.brake, turn: car.turn, grip: car.grip };
  v.data.car = car; v.data.name = spec.name || ''; v.data.gate = g; v.data.slot = row;
  if (spec.ghost) { v.setSolid(false); v.data.ghost = true; v.visible = false; v.data.gcol = spec.color || '#c8d8ff'; }
  arena.cars.push(v); return v;
}

/** the live tuning applied to a car, then its intent run */
export function drive(arena, v, dt, intent) {
  const b = v.base, o = v.o;
  o.top = b.top * CFG.topSpeed; o.accel = b.accel * CFG.accel; o.brake = b.brake * CFG.brake; o.turn = b.turn * CFG.steer; o.grip = b.grip * CFG.grip;
  if (v.surface === 'boost' && v.onGround && v.boostT < .3) v.boost(CFG.boostTime, CFG.boostPower);
  v.update(dt, null, intent);
}

/** gates, pad rings and scenery drawn each frame with the pen */
function drawArena(arena, w) {
  const pen = w.pen, t = arena.game.real || 0, c = arena.course, env = arena.env;
  c.gates.forEach((g, i) => {
    const kind = g.kind, passed = arena.run && arena.run.passed && arena.run.passed.has(i), col = kind === 'finish' ? '#f4f4f4' : kind === 'start' ? '#4ae04a' : passed ? '#7a8a98' : env.accent;
    const hw = g.hw - 20, dx = -Math.sin(g.angle), dy = Math.cos(g.angle);
    pen.at(g.x, g.y, g.z, g.angle, 1, 0, 0);
    pen.tube(0, -hw - 4, 0, 0, -hw - 4, 38, 1.8, col).tube(0, hw + 4, 0, 0, hw + 4, 38, 1.8, col);
    pen.box(0, 0, 37, 2, hw * 2 + 8, 5, col);
    if (kind === 'finish') for (let k = 0; k < 8; k++) pen.box(1.4, -hw + 2 + k * (hw * 2 / 8), 37, 1, hw / 4, 4, k % 2 ? '#111' : '#fff');
    else pen.box(1.4, 0, 37, 1, hw * 1.4, 3, kind === 'start' ? '#0a3a0a' : '#10202a');
    pen.at();
  });
  for (const v of arena.cars) { // ghost cars: a pale glowing hull drawn by hand (the engine draws vehicles opaque)
    if (!v.data.ghost || v.z < -500) continue; const col = v.data.gcol, t2 = Math.sin(t * 6) * .5;
    pen.at(v.x, v.y, v.z, v.angle, 1, v.tilt[0], v.tilt[1]).box(0, 0, 5.4, 26, 13, 4.2, col).box(-2, 0, 9.6, 12, 10, 3.6, '#ffffff').glow(0, 0, 8 + t2, 5, col).glow(12, 0, 6, 2, '#ffffff');
    pen.at();
  }
  for (const d of arena.decor) { // cacti: a pen tube trunk with two arms
    pen.at(d.x, d.y, w.ground(d.x, d.y), 0, d.s, 0, 0).tube(0, 0, 0, 0, 0, 26, 2.2, '#3a8a4a').tube(0, 0, 14, 7, 0, 14, 1.4, '#3a8a4a').tube(7, 0, 14, 7, 0, 22, 1.4, '#3a8a4a').tube(0, 0, 10, -6, 0, 10, 1.4, '#3a8a4a').tube(-6, 0, 10, -6, 0, 18, 1.4, '#3a8a4a');
    pen.at();
  }
}

// ---------------------------------------------------------------- the run: countdown, gates, clock, respawn
export class Run {
  constructor(arena, car, o = {}) {
    Object.assign(this, { arena, car, steps: 0, phase: 'intro', count: o.count ?? 360, passed: new Set(), cps: 0, respawns: 0, finished: false, finishSteps: 0, splits: [], last: car.data.gate, lastIndex: 0, events: [], missing: 0, prev: [car.x, car.y, car.z], penalty: 0 });
    this.cpTotal = arena.course.cpCount; arena.run = this;
  }
  emit(e) { this.events.push(e); }
  /** one fixed step: advance the clock, test the gates */
  update() {
    const v = this.car, c = this.arena.course;
    if (this.phase === 'intro' || this.phase === 'countdown') { if (--this.count <= 0) { this.phase = 'racing'; this.emit({ t: 'go' }); } else this.phase = this.count > 360 ? 'intro' : 'countdown'; this.prev = [v.x, v.y, v.z]; return; }
    if (this.phase !== 'racing') return;
    this.steps++;
    const cur = [v.x, v.y, v.z];
    c.gates.forEach((g, i) => {
      if (g.kind === 'start' || this.passed.has(i) && g.kind !== 'finish') return;
      const nx = Math.cos(g.angle), ny = Math.sin(g.angle), a = (this.prev[0] - g.x) * nx + (this.prev[1] - g.y) * ny, b = (cur[0] - g.x) * nx + (cur[1] - g.y) * ny;
      if (!(a < 0 && b >= 0) && !(g.kind === 'cp' && a > 0 && b <= 0)) return;
      const lat = Math.abs(-(cur[0] - g.x) * ny + (cur[1] - g.y) * nx), dz = Math.abs(cur[2] - g.z);
      if (lat > g.hw + 8 || dz > 70) return;
      if (g.kind === 'cp') { this.passed.add(i); this.cps++; this.last = g; this.splits.push(this.steps); this.emit({ t: 'cp', n: this.cps, steps: this.steps }); }
      else if (g.kind === 'finish') {
        if (this.cps < this.cpTotal) { if (!this.missing || this.steps - this.missing > 120) { this.missing = this.steps; this.emit({ t: 'missing' }); } }
        else { this.phase = 'finished'; this.finished = true; this.finishSteps = this.steps + Math.round(this.penalty * 120); this.emit({ t: 'finish', steps: this.finishSteps }); }
      }
    });
    this.prev = cur;
    if (v.z < this.last.z - 120 || v.z < -80) this.respawn();
  }
  respawn() {
    const v = this.car, g = this.last, h = g.kind === 'cp' || g.kind === 'start' ? g : this.arena.course.start;
    v.place(g.x, g.y, g.z + 6); v.vx = v.vy = v.vz = 0; v.angle = v.facing = g.angle; v.speed = 0; v.slide = 0; v.boostT = 0; v.spinT = 0; v.drifting = 0;
    this.respawns++; this.penalty += CFG.respawnPenalty; this.prev = [g.x, g.y, g.z]; this.emit({ t: 'respawn' });
  }
  restart() {
    const v = this.car, g = this.arena.course.start;
    v.place(g.x, g.y, g.z + 6); v.vx = v.vy = v.vz = 0; v.angle = v.facing = g.angle; v.speed = 0; v.slide = 0; v.boostT = 0; v.spinT = 0;
    Object.assign(this, { steps: 0, phase: 'countdown', count: 120, passed: new Set(), cps: 0, respawns: 0, splits: [], last: g, finished: false, finishSteps: 0, penalty: 0, prev: [g.x, g.y, g.z] });
    this.emit({ t: 'restart' });
  }
}
export const stepsToMs = s => Math.floor(s * 1000 / 120);
export const fmt = s => { const ms = Math.floor(s * 1000 / 120), m = Math.floor(ms / 60000), sec = Math.floor(ms / 1000) % 60, cs = Math.floor(ms / 10) % 100; return `${m}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`; };

// ---------------------------------------------------------------- the bot: pure pursuit along the course's line
export class Bot {
  constructor(arena, car, o = {}) { this.arena = arena; this.car = car; this.i = 0; this.skill = o.skill ?? 1; this.cheat = !!o.cheat; this.stuck = 0; this.rnd = E.rng(o.seed || 5); this.jit = 0; }
  control(dt) {
    const v = this.car, line = this.arena.course.line, n = line.length;
    let best = 1e18, bi = this.i;
    for (let k = Math.max(0, this.i - 2); k < Math.min(n, this.i + 12); k++) { const p = line[k], d = (p.x - v.x) ** 2 + (p.y - v.y) ** 2 + ((p.z - v.z) * 2) ** 2; if (d < best) { best = d; bi = k; } }
    this.i = bi;
    const sp = Math.abs(v.speed), look = 120 + sp * .22; let tgt = line[Math.min(n - 1, bi + 1)], dsum = 0, k = bi;
    while (k < n - 1 && dsum < look) { dsum += Math.hypot(line[k + 1].x - line[k].x, line[k + 1].y - line[k].y); k++; }
    tgt = line[k];
    if ((this.arena.run && this.arena.run.phase) === 'racing' && this.skill < 1 && this.rnd() < .02) this.jit = (this.rnd() - .5) * (1 - this.skill) * 40;
    const al = Math.atan2(tgt.y - v.y + this.jit, tgt.x - v.x), err = E.angDiff(v.angle, al);
    // brake for the sharpest bend ahead
    let curv = 0; for (let m = bi; m < Math.min(n - 1, bi + 12); m++) { const dd = Math.hypot(line[m + 1].x - line[m].x, line[m + 1].y - line[m].y) || 1; curv = Math.max(curv, Math.abs(E.angDiff(line[m].angle, line[m + 1].angle)) / dd); }
    const fast = line[Math.min(n - 1, bi + 3)].jump; // never brake into a ramp
    const vmax = fast ? 9999 : Math.max(160, 0.8 * v.o.turn / Math.max(curv, 1e-4) * this.skill), onIce = v.surface === 'ice';
    const target = Math.min(v.o.top * (v.boostT > 0 ? 1.45 : 1), onIce ? Math.min(vmax, 330) : vmax);
    const gas = sp < target ? 1 : 0, brake = sp > target * 1.06 ? 1 : 0;
    if (this.cheat) { const p = line[bi]; v.vx += (p.x - v.x) * 1.5 * dt; v.vy += (p.y - v.y) * 1.5 * dt; }
    return { steer: E.clamp(err * 3, -1, 1), gas, brake, drift: false };
  }
}

/** headless: drive the course with a bot at a skill, return { steps, respawns, finished } */
export function botRun(game, courseDef, o = {}) {
  const a = makeArena(game, courseDef), v = a.spawn({}), run = new Run(a, v, { count: 5 }), bot = new Bot(a, v, o);
  let stuck = 0, last = [v.x, v.y];
  for (let i = 0; i < 120 * (o.maxSec || 150) && !run.finished; i++) {
    const intent = run.phase === 'racing' ? bot.control(1 / 120) : HOLD;
    drive(a, v, 1 / 120, intent); a.world.step(1 / 120); run.update();
    if (run.phase === 'racing') { stuck = Math.hypot(v.x - last[0], v.y - last[1]) < .6 ? stuck + 1 : 0; last = [v.x, v.y]; if (stuck > 150 || (v.speed < 40 && v.z < -30)) { run.respawn(); stuck = 0; bot.i = Math.max(0, bot.i - 4); } }
  }
  const out = { steps: run.finishSteps, respawns: run.respawns, finished: run.finished, cps: run.cps };
  a.dispose(); return out;
}
