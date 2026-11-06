/* Seeded shared authority. DOM, rendering, audio and transport are deliberately absent. */
(function (root) {
  'use strict';
  const C = root.NightContent;
  const DT = 1 / 120, W = 384, H = 240, BORDER = 4;
  const defaults = Object.freeze({ speed: 88, focusSpeed: .75, sting: 68, health: 100, concentration: 1.42, recoveryDelay: .8, recoveryRate: 34, lossInterval: .55, rayWidth: 12, warning: 1.15, hunterSpeed: 1, maturation: 1, spawnInterval: 1 });
  const tuningDefs = [
    ['speed', 'Movement · units/s', 48, 150, 1], ['focusSpeed', 'Focus · speed factor', .45, .95, .05],
    ['sting', 'Sting · damage/s', 30, 140, 2], ['health', 'Gardener · health', 50, 200, 5],
    ['concentration', 'Focus · sting factor', 1.05, 2.5, .05], ['recoveryDelay', 'Recovery delay · s', .2, 2, .1],
    ['recoveryRate', 'Recovery · health/s', 10, 80, 2], ['lossInterval', 'Bee loss grace · s', .25, 1.5, .05],
    ['rayWidth', 'Ray thickness · units', 6, 30, 1], ['warning', 'Entrance warning · s', .6, 3, .1],
    ['hunterSpeed', 'Hunter · speed factor', .5, 1.5, .05], ['maturation', 'Maturation · time factor', .5, 2, .1], ['spawnInterval', 'Rival interval · time factor', .6, 2, .1]
  ].map(([key, label, min, max, step]) => ({ key, label, min, max, step, default: defaults[key] }));
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  const norm = (x, y) => { const d = Math.hypot(x, y); return d > 0 ? [x / d, y / d] : [0, 0]; };
  const clone = (v) => JSON.parse(JSON.stringify(v));
  function rng(w) { let n = w.rng | 0; n ^= n << 13; n ^= n >>> 17; n ^= n << 5; w.rng = n >>> 0; return w.rng / 4294967296; }
  function emit(w, type, obj = {}) { const e = { id: ++w.eventSeq, type, tick: w.tick, ...obj }; w.events.push(e); w.stats[type] = (w.stats[type] || 0) + 1; return e; }
  function radius(p, focus = p.focus) { return p.bees ? (focus ? 5.6 : 8.4) + Math.sqrt(p.bees / 12) * (focus ? 2.6 : 5.1) : 0; }
  function rectHit(x, y, r, o) { const dx = x - clamp(x, o.x, o.x + o.w), dy = y - clamp(y, o.y, o.y + o.h); return dx * dx + dy * dy < r * r - .001; }
  function free(w, x, y, r, extra) {
    if (x < BORDER + r || x > W - BORDER - r || y < BORDER + r || y > H - BORDER - r) return false;
    if (w.obstacles.some((o) => rectHit(x, y, r, o))) return false;
    if (w.husks.some((h) => (x - h.x) ** 2 + (y - h.y) ** 2 < (r + h.r) ** 2 - .001)) return false;
    if (extra && (x - extra.x) ** 2 + (y - extra.y) ** 2 < (r + extra.r) ** 2 - .001) return false;
    return true;
  }
  function move(w, e, dx, dy, r = e.r) {
    const ox = e.x, oy = e.y;
    if (free(w, e.x + dx, e.y, r)) e.x += dx;
    if (free(w, e.x, e.y + dy, r)) e.y += dy;
    return Math.abs(e.x - ox) + Math.abs(e.y - oy) > .001;
  }
  function nearestFree(w, x, y, r) {
    if (free(w, x, y, r)) return { x, y };
    for (let d = 2; d <= 440; d += 2) for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12, px = clamp(x + Math.cos(a) * d, r + BORDER, W - r - BORDER), py = clamp(y + Math.sin(a) * d, r + BORDER, H - r - BORDER);
      if (free(w, px, py, r)) return { x: px, y: py };
    }
    return { x: W / 2, y: H - 24 };
  }
  function create(opts = {}) {
    const seed = (Number(opts.seed) >>> 0) || 1, n = opts.players === 2 ? 2 : 1;
    const w = { version: 1, seed, rng: seed, tick: 0, time: 0, stage: 0, stageTime: 0, phase: 'playing', players: [], targets: [], rivals: [], husks: [], obstacles: [], score: 0, streak: 0, kills: 0, totalTargets: 0, eventSeq: 0, entitySeq: 0, events: [], stats: {}, tuning: { ...defaults }, assisted: false, invulnerable: false, checkpoint: null };
    for (const def of tuningDefs) if (Number.isFinite(opts.tuning?.[def.key])) w.tuning[def.key] = clamp(opts.tuning[def.key], def.min, def.max);
    w.assisted = (opts.stage | 0) > 0 || tuningDefs.some((def) => w.tuning[def.key] !== defaults[def.key]);
    for (let i = 0; i < n; i++) w.players.push({ id: i, x: 176 + i * 32, y: 208, vx: 0, vy: 0, bees: 12, charge: true, focus: false, r: 13.5, hitUntil: 0, contact: false, raySeen: 0, emptySince: 0, contribution: 0, connected: true });
    loadStage(w, clamp(opts.stage | 0, 0, C.stages.length - 1), false);
    return w;
  }
  function loadStage(w, index, assisted = true) {
    w.stage = clamp(index | 0, 0, C.stages.length - 1); w.phase = 'playing'; w.stageTime = 0; w.targets = []; w.rivals = []; w.husks = []; w.events = [];
    const s = C.stages[w.stage]; w.obstacles = clone(s.obstacles); w.schedule = clone(s.targets); w.totalTargets = w.schedule.length; w.kills = 0; w.spawnCursor = 0; w.nextRival = s.rivals.first; w.stageLost = false; w.resultTimer = 0; w.invulnerable = false; w.topology = 0;
    w.assisted ||= assisted;
    for (const p of w.players) { const pos = nearestFree(w, w.players.length === 1 ? 192 : 176 + p.id * 32, 208, 13.5); Object.assign(p, pos, { vx: 0, vy: 0, bees: p.connected === false ? 0 : 12, charge: true, focus: false, r: 13.5, hitUntil: w.time + 1.2, contact: false, raySeen: p.raySeen || 0, emptySince: w.time }); }
    w.checkpoint = { stage: w.stage, score: w.score, streak: w.streak, seed: w.seed };
    for (const p of w.players) if (p.bees) emit(w, 'replenish', { x: p.x, y: p.y, player: p.id });
    return w;
  }
  function next(w) { if (w.phase !== 'result') return false; if (w.stage >= C.stages.length - 1) { w.phase = 'won'; emit(w, 'win'); return true; } loadStage(w, w.stage + 1, false); return true; }
  function retry(w) { if (!w.checkpoint) return false; const cp = clone(w.checkpoint); w.score = cp.score; w.streak = cp.streak; w.rng = ((w.seed ^ ((cp.stage + 1) * 2654435761)) >>> 0) || 1; loadStage(w, cp.stage, true); return true; }
  function restart(w) { const fresh = create({ seed: w.seed, players: w.players.length }); for (const key of Object.keys(w)) delete w[key]; Object.assign(w, fresh); return w; }
  function addPlayer(w) { if (w.players.length >= 2 || !['result', 'playing'].includes(w.phase) || (w.phase === 'playing' && w.stageTime > .1)) return false; w.players.push({ id: 1, x: 208, y: 208, vx: 0, vy: 0, bees: 12, charge: true, focus: false, r: 13.5, hitUntil: w.time + 1, contact: false, raySeen: 0, emptySince: w.time, contribution: 0, connected: true }); return true; }
  function leave(w, id) { const p = w.players.find((p) => p.id === id); if (p) { p.connected = false; p.bees = 0; p.vx = p.vy = 0; p.contact = false; } }
  function spawnTarget(w, spec) {
    const ent = C.stages[w.stage].entrances[spec.entrance || 0], bell = spec.type === 'bell', n = w.players.filter((p) => p.connected !== false).length;
    const maxHealth = w.tuning.health * (bell ? (n === 2 ? 6 : 4.3) : (n === 2 ? 1.55 : 1));
    const t = { id: ++w.entitySeq, type: spec.type, x: spec.x ?? ent.x, y: spec.y ?? ent.y, r: bell ? 13 : 7.5, health: maxHealth, maxHealth, dir: spec.dir ?? ent.dir, warning: w.tuning.warning, contact: false, recovering: false, lastHit: -100, contributions: [0, 0], turnTimer: 0, stuck: 0, bossPhase: bell ? 'move' : null, bossTimer: 0, bossNext: 1, born: w.stageTime };
    Object.assign(t, nearestFree(w, t.x, t.y, t.r)); w.targets.push(t); emit(w, 'warning', { x: t.x, y: t.y, target: t.id, kind: 'target' }); return t;
  }
  function spawnRival(w, entrance) {
    const s = C.stages[w.stage], ent = s.entrances[entrance ?? Math.floor(rng(w) * s.entrances.length)];
    const e = { id: ++w.entitySeq, x: ent.x, y: ent.y, r: 9.5, stage: 'scout', warning: w.tuning.warning, age: 0, angle: ent.dir * Math.PI / 2, turn: 0, born: w.stageTime };
    Object.assign(e, nearestFree(w, e.x, e.y, e.r)); w.rivals.push(e); emit(w, 'warning', { x: e.x, y: e.y, rival: e.id, kind: 'rival' }); return e;
  }
  function warning(w, e, dt) {
    if (e.warning <= 0) return false;
    const safe = w.players.every((p) => !p.bees || dist2(p, e) > (p.r + e.r + 16) ** 2);
    e.warning = Math.max(safe ? 0 : .12, e.warning - dt); return true;
  }
  function fire(w, p) {
    if (!p.charge) { emit(w, 'dry', { player: p.id, x: p.x, y: p.y }); return; }
    p.charge = false; p.emptySince = w.time;
    const dead = w.rivals.filter((e) => Math.abs(e.y - p.y) <= w.tuning.rayWidth / 2 + e.r);
    const ids = new Set(dead.map((e) => e.id)); w.rivals = w.rivals.filter((e) => !ids.has(e.id));
    w.score += dead.length * 25; emit(w, 'ray', { player: p.id, x: p.x, y: p.y, width: w.tuning.rayWidth, count: dead.length });
    for (const e of dead) emit(w, 'rivalDown', { x: e.x, y: e.y, rival: e.id });
  }
  function refill(w, target) {
    const empty = w.players.filter((p) => p.bees > 0 && !p.charge);
    if (!empty.length) return;
    const contributors = empty.filter((p) => target.contributions[p.id] > 0).sort((a, b) => target.contributions[b.id] - target.contributions[a.id] || a.id - b.id);
    const p = contributors[0] || empty.sort((a, b) => a.emptySince - b.emptySince || a.id - b.id)[0];
    p.charge = true; emit(w, 'charge', { player: p.id, x: p.x, y: p.y, target: target.id });
  }
  function topologyOK(w, h) {
    const step = 8, cols = 48, rows = 30, r = 8.2, cells = new Uint8Array(cols * rows); let start = -1, count = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (free(w, x * step + 4, y * step + 4, r, h)) { cells[y * cols + x] = 1; start = y * cols + x; count++; }
    if (start < 0) return false;
    const q = [start]; cells[start] = 2;
    for (let i = 0; i < q.length; i++) { const n = q[i], x = n % cols, y = Math.floor(n / cols); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = ny * cols + nx; if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && cells[k] === 1) { cells[k] = 2; q.push(k); } } }
    return q.length === count;
  }
  function makeHusk(w, t) {
    let h = { id: t.id, x: t.x, y: t.y, r: t.type === 'bell' ? 13 : 9, born: w.time, type: t.type };
    // The fixed footprint is established before cosmetic settling. A threatened choke
    // shifts the shell at most one tile into an adjacent safe spot, deterministically.
    const offsets = [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8], [16, 0], [-16, 0], [0, 16], [0, -16]];
    let placed = false;
    for (const [dx, dy] of offsets) { const c = { ...h, x: t.x + dx, y: t.y + dy }; if (free(w, c.x, c.y, c.r) && topologyOK(w, c)) { h = c; placed = true; break; } }
    if (!placed) {
      // Keep every earlier shell. Search the nearest legal adjacent cell instead
      // of sealing a route or erasing a useful obstacle. Collision is fixed now.
      for (let d = 24; d <= 384 && !placed; d += 8) for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8, c = { ...h, x: t.x + Math.cos(a) * d, y: t.y + Math.sin(a) * d };
        if (free(w, c.x, c.y, c.r) && topologyOK(w, c)) { h = c; placed = true; break; }
      }
    }
    if (placed) w.husks.push(h); else throw new Error('No safe shell placement in validated arena');
    if (Math.hypot(h.x - t.x, h.y - t.y) > .1) emit(w, 'settle', { x: h.x, y: h.y, fromX: t.x, fromY: t.y, target: t.id });
    w.topology++;
    for (const e of w.rivals) if (!free(w, e.x, e.y, e.r)) Object.assign(e, nearestFree(w, e.x, e.y, e.r));
    for (const p of w.players) if (p.bees && !free(w, p.x, p.y, p.r)) { const pos = nearestFree(w, p.x, p.y, p.r); Object.assign(p, pos); p.hitUntil = Math.max(p.hitUntil, w.time + .3); }
    for (const other of w.targets) if (other.id !== t.id && !other.contact && !free(w, other.x, other.y, other.r)) { const pos = nearestFree(w, other.x, other.y, other.r); Object.assign(other, pos); other.stuck = 0; emit(w, 'nudge', { x: other.x, y: other.y, target: other.id }); }
    return h;
  }
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  function nearestPlayer(w, e) { return w.players.filter((p) => p.bees > 0).sort((a, b) => dist2(a, e) - dist2(b, e) || a.id - b.id)[0]; }
  function targetMotion(w, t, dt) {
    if (warning(w, t, dt)) return;
    if (t.type === 'bell') { bellMotion(w, t, dt); return; }
    t.turnTimer -= dt;
    const p = nearestPlayer(w, t), speed = (27 + w.stage * 1.1) * (.26 + .74 * t.health / t.maxHealth), turn = t.type === 'left' ? 3 : 1;
    let d = dirs[t.dir];
    if (p && t.turnTimer <= 0 && dist2(p, t) < 40 ** 2 && (p.x - t.x) * d[0] + (p.y - t.y) * d[1] > 0) { const nd = (t.dir + turn) % 4, vd = dirs[nd]; if (free(w, t.x + vd[0] * 7, t.y + vd[1] * 7, t.r)) t.dir = nd; t.turnTimer = .85; d = dirs[t.dir]; }
    if (!move(w, t, d[0] * speed * dt, d[1] * speed * dt)) {
      let changed = false;
      for (const n of [turn, (4 - turn) % 4, 2]) { const nd = (t.dir + n) % 4, vd = dirs[nd]; if (free(w, t.x + vd[0] * Math.max(2, speed * dt), t.y + vd[1] * Math.max(2, speed * dt), t.r)) { t.dir = nd; changed = true; break; } }
      t.stuck += dt; if (!changed && t.stuck > 1.2 && !t.contact) { Object.assign(t, nearestFree(w, t.x, t.y, t.r + 2)); t.stuck = 0; emit(w, 'nudge', { x: t.x, y: t.y, target: t.id }); }
    } else t.stuck = 0;
  }
  function bellMotion(w, t, dt) {
    t.bossTimer += dt;
    const points = [[192, 48], [336, 48], [336, 192], [48, 192], [48, 48]];
    if (t.bossPhase === 'move') {
      const goal = points[t.bossNext % points.length], [dx, dy] = norm(goal[0] - t.x, goal[1] - t.y);
      if (Math.hypot(goal[0] - t.x, goal[1] - t.y) < 4 || t.bossTimer >= 5) { t.bossPhase = 'expose'; t.bossTimer = 0; emit(w, 'expose', { x: t.x, y: t.y, target: t.id }); }
      else { const moved = move(w, t, dx * 48 * dt, dy * 48 * dt); if (!moved) t.bossTimer += dt * 2; }
    } else if (t.bossPhase === 'expose' && t.bossTimer >= (w.players.length > 1 ? 4.8 : 4.1)) { t.bossPhase = 'pulse'; t.bossTimer = 0; emit(w, 'pulseWarning', { x: t.x, y: t.y, target: t.id }); }
    else if (t.bossPhase === 'pulse' && t.bossTimer >= 1.2) {
      for (const p of w.players) if (p.bees && dist2(p, t) < 96 ** 2) { const [dx, dy] = norm(p.x - t.x || 1, p.y - t.y); for (let n = 0; n < 24; n++) move(w, p, dx * 2, dy * 2); }
      emit(w, 'pulse', { x: t.x, y: t.y, target: t.id }); t.bossPhase = 'move'; t.bossTimer = 0; t.bossNext++;
    }
  }
  function rivalMotion(w, e, dt) {
    if (warning(w, e, dt)) return;
    e.age += dt; const cfg = C.stages[w.stage].rivals;
    const stage = e.age >= cfg.huntAt * w.tuning.maturation ? 'hunter' : e.age >= cfg.guardAt * w.tuning.maturation ? 'guard' : 'scout';
    if (stage !== e.stage) { e.stage = stage; emit(w, 'mature', { x: e.x, y: e.y, rival: e.id, stage }); }
    const p = nearestPlayer(w, e); let desired = e.angle, speed = 24;
    if (stage === 'scout') { desired += Math.sin(e.age * .8 + e.id) * .7 * dt; }
    else if (stage === 'guard') { const t = w.targets.filter((t) => !t.warning).sort((a, b) => dist2(a, e) - dist2(b, e))[0]; if (t) { const a = e.age * .9 + e.id, x = t.x + Math.cos(a) * 26, y = t.y + Math.sin(a) * 26; desired = Math.atan2(y - e.y, x - e.x); } else if (p) desired = Math.atan2(p.y - e.y, p.x - e.x); speed = 33; }
    else if (p) { desired = Math.atan2(p.y + p.vy * .15 - e.y, p.x + p.vx * .15 - e.x); speed = (cfg.speed + Math.min(10, w.stageTime / 30)) * w.tuning.hunterSpeed; }
    let delta = ((desired - e.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI; e.angle += clamp(delta, -2.6 * dt, 2.6 * dt);
    if (!move(w, e, Math.cos(e.angle) * speed * dt, Math.sin(e.angle) * speed * dt)) e.angle += Math.PI / 2;
  }
  function step(w, actions = [], dt = DT) {
    if (!Number.isFinite(dt) || dt <= 0) return w; dt = Math.min(dt, .05); w.events = [];
    if (w.phase !== 'playing') { w.resultTimer = (w.resultTimer || 0) + dt; return w; }
    w.tick++; w.time += dt; w.stageTime += dt;
    // Fixed order: validate+spend input rays, movement, AI, contact, deaths+refills,
    // scheduled entrances, then completion. A same-tick kill refills a spent charge.
    for (const p of w.players) {
      p.contact = false; if (!p.bees || p.connected === false) { p.vx = p.vy = 0; continue; }
      const a = actions[p.id] || {}, x = Number.isFinite(a.x) ? clamp(a.x, -1, 1) : 0, y = Number.isFinite(a.y) ? clamp(a.y, -1, 1) : 0, len = Math.max(1, Math.hypot(x, y));
      const presses = Number.isSafeInteger(a.ray) && a.ray >= 0 ? a.ray : p.raySeen;
      if (presses > p.raySeen) { p.raySeen = presses; fire(w, p); }
      p.focus = !!a.focus; w.stats[p.focus ? 'focusTicks' : 'roamTicks'] = (w.stats[p.focus ? 'focusTicks' : 'roamTicks'] || 0) + 1; const nextR = radius(p);
      if (nextR <= p.r || free(w, p.x, p.y, nextR)) p.r = nextR; else { p.focus = true; p.r = radius(p, true); }
      const speed = w.tuning.speed * (p.focus ? w.tuning.focusSpeed : 1), ox = p.x, oy = p.y;
      move(w, p, x / len * speed * dt, y / len * speed * dt); p.vx = (p.x - ox) / dt; p.vy = (p.y - oy) / dt;
    }
    for (const t of w.targets) targetMotion(w, t, dt);
    for (const e of w.rivals) rivalMotion(w, e, dt);
    for (const p of w.players) if (p.bees && w.time >= p.hitUntil && w.rivals.some((e) => e.warning <= 0 && dist2(e, p) <= (p.r + e.r) ** 2)) {
      p.hitUntil = w.time + w.tuning.lossInterval;
      if (!w.invulnerable) { p.bees--; w.stageLost = true; p.r = radius(p); emit(w, 'loss', { x: p.x, y: p.y, player: p.id, bees: p.bees }); }
      const nearest = w.rivals.filter((e) => e.warning <= 0).sort((a, b) => dist2(a, p) - dist2(b, p))[0];
      if (nearest) { const [dx, dy] = norm(p.x - nearest.x || 1, p.y - nearest.y); move(w, p, dx * 3, dy * 3); }
    }
    const dead = [];
    for (const t of w.targets) {
      const wasContact = t.contact; t.contact = false;
      const eligible = t.warning <= 0 && (t.type !== 'bell' || t.bossPhase === 'expose');
      if (eligible) for (const p of w.players) if (p.bees && dist2(p, t) <= (p.r + t.r) ** 2) {
        const damage = w.tuning.sting * (p.bees / 12) * (p.focus ? w.tuning.concentration : 1) * dt;
        t.health = Math.max(0, t.health - damage); t.contributions[p.id] += damage; p.contribution += damage; p.contact = t.contact = true; t.lastHit = w.time; t.recovering = false;
      }
      if (t.contact && !wasContact) emit(w, 'sting', { x: t.x, y: t.y, target: t.id });
      if (!t.contact && t.health < t.maxHealth && w.time - t.lastHit > w.tuning.recoveryDelay && t.type !== 'bell') {
        if (!t.recovering) emit(w, 'recover', { x: t.x, y: t.y, target: t.id });
        t.recovering = true; t.health = Math.min(t.maxHealth, t.health + w.tuning.recoveryRate * dt);
        if (t.health === t.maxHealth) { t.contributions = [0, 0]; t.recovering = false; }
      }
      if (t.health <= 0) dead.push(t);
    }
    for (const t of dead.sort((a, b) => a.id - b.id)) {
      w.kills++; const points = t.type === 'bell' ? 1250 : 200; w.score += points; makeHusk(w, t); refill(w, t); emit(w, 'collapse', { x: t.x, y: t.y, target: t.id, points, kind: t.type });
    }
    if (dead.length) { const ids = new Set(dead.map((t) => t.id)); w.targets = w.targets.filter((t) => !ids.has(t.id)); }
    if (!w.players.some((p) => p.bees > 0)) { w.phase = 'failed'; w.rivals = []; emit(w, 'fail'); return w; }
    const cfg = C.stages[w.stage];
    while (w.spawnCursor < w.schedule.length && w.stageTime >= w.schedule[w.spawnCursor].at) { spawnTarget(w, w.schedule[w.spawnCursor]); w.spawnCursor++; }
    if (w.stageTime >= w.nextRival) {
      if (w.rivals.length < cfg.rivals.cap + (w.players.length > 1 ? 1 : 0)) spawnRival(w);
      w.nextRival = w.stageTime + cfg.rivals.interval * w.tuning.spawnInterval;
    }
    if (w.kills >= w.totalTargets && w.spawnCursor >= w.schedule.length && !w.targets.length) {
      w.rivals = []; const survivors = w.players.reduce((n, p) => n + p.bees, 0), perfect = !w.stageLost; w.streak = perfect ? w.streak + 1 : 0;
      const bonus = survivors * 10 * (1 + w.streak); w.score += bonus; w.lastResult = { stage: w.stage, survivors, perfect, bonus, score: w.score, streak: w.streak }; w.phase = w.stage === C.stages.length - 1 ? 'won' : 'result'; w.resultTimer = 0;
      emit(w, 'clear', { bonus, survivors, perfect }); if (w.phase === 'won') emit(w, 'win');
    }
    return w;
  }
  function setTuning(w, key, value) { const d = tuningDefs.find((d) => d.key === key); if (!d || !Number.isFinite(value)) return false; w.tuning[key] = clamp(value, d.min, d.max); w.assisted = true; return true; }
  function resetTuning(w) { w.tuning = { ...defaults }; w.assisted = true; }
  function snapshot(w) { const s = clone(w); s.events = []; return s; }
  function restore(s) { if (!s || s.version !== 1 || !Array.isArray(s.players) || !Number.isFinite(s.tick)) throw new Error('Invalid world snapshot'); const w = clone(s); w.events = []; return w; }
  function validateContent(stages = C.stages) {
    const errors = [], ids = new Set();
    for (const [i, s] of stages.entries()) {
      const prefix = `stage ${i + 1}`; if (!s.id || ids.has(s.id)) errors.push(`${prefix}: missing/duplicate identifier`); ids.add(s.id);
      if (!s.bounds || s.bounds.x !== 0 || s.bounds.y !== 0 || s.bounds.w !== W || s.bounds.h !== H) errors.push(`${prefix}: unsupported arena bounds`);
      if (!Array.isArray(s.entrances) || !s.entrances.length) errors.push(`${prefix}: no entrance cells`);
      if (!Array.isArray(s.targets) || !s.targets.length) errors.push(`${prefix}: no completion schedule`);
      if (s.finish?.type !== 'all-targets') errors.push(`${prefix}: unsupported completion condition`);
      let previous = -1;
      for (const t of s.targets || []) { if (!['left', 'right', 'bell'].includes(t.type)) errors.push(`${prefix}: unsupported target ${t.type}`); if (!Number.isFinite(t.at) || t.at < 0 || t.at < previous) errors.push(`${prefix}: invalid schedule`); previous = t.at; if (t.x === undefined && !s.entrances?.[t.entrance || 0]) errors.push(`${prefix}: missing target entrance`); }
      for (const o of s.obstacles || []) if (![o.x, o.y, o.w, o.h].every(Number.isFinite) || o.w <= 0 || o.h <= 0 || o.x < BORDER || o.y < BORDER || o.x + o.w > W - BORDER || o.y + o.h > H - BORDER) errors.push(`${prefix}: impossible obstacle footprint`);
      if (!s.rivals || !(s.rivals.interval > 0) || !(s.rivals.cap > 0) || s.rivals.huntAt <= s.rivals.guardAt) errors.push(`${prefix}: invalid rival rules`);
      const dummy = { obstacles: s.obstacles || [], husks: [] }; if (!topologyOK(dummy)) errors.push(`${prefix}: disconnected focus navigation`);
      for (const e of s.entrances || []) if (!free(dummy, e.x, e.y, 7.5)) errors.push(`${prefix}: blocked entrance`);
    }
    return errors;
  }
  const botCache = new WeakMap();
  function navigation(w, p, goal, r = 8) {
    const step = 8, cols = 48, rows = 30, total = cols * rows;
    const sx = clamp(Math.floor(p.x / step), 0, cols - 1), sy = clamp(Math.floor(p.y / step), 0, rows - 1), tx = clamp(Math.floor(goal.x / step), 0, cols - 1), ty = clamp(Math.floor(goal.y / step), 0, rows - 1);
    const queue = [sy * cols + sx], from = new Int32Array(total).fill(-1); from[queue[0]] = queue[0]; let best = queue[0], bestD = Infinity;
    for (let i = 0; i < queue.length; i++) { const n = queue[i], x = n % cols, y = Math.floor(n / cols), d = (x - tx) ** 2 + (y - ty) ** 2; if (d < bestD) { best = n; bestD = d; } if (d <= 1) { best = n; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = ny * cols + nx; if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && from[k] < 0 && free(w, nx * step + 4, ny * step + 4, r)) { from[k] = n; queue.push(k); } }
    }
    const path = []; for (let n = best; from[n] >= 0 && from[n] !== n; n = from[n]) path.push({ x: n % cols * step + 4, y: Math.floor(n / cols) * step + 4 }); path.reverse(); return path;
  }
  function lineFree(w, a, b, r) { const d = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.ceil(d / 4); for (let i = 1; i <= steps; i++) if (!free(w, a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps, r)) return false; return true; }
  function bot(w, id = 0) {
    const p = w.players[id]; if (!p?.bees || w.phase !== 'playing') return { x: 0, y: 0, focus: false, ray: p?.raySeen || 0 };
    let caches = botCache.get(w); if (!caches) botCache.set(w, caches = []); let cache = caches[id]; if (!cache) cache = caches[id] = { path: [], target: null, at: -100, topology: -1 };
    const rivals = w.rivals.filter((e) => e.warning <= 0), close = rivals.filter((e) => dist2(p, e) < 100 ** 2), row = rivals.filter((e) => Math.abs(e.y - p.y) <= w.tuning.rayWidth / 2 + e.r);
    let ray = p.raySeen;
    if (p.charge && row.some((e) => dist2(p, e) < 90 ** 2)) ray++;
    let target = w.targets.filter((t) => t.warning <= 0).sort((a, b) => {
      const da = dist2(p, a) * (a.type === 'bell' && a.bossPhase !== 'expose' ? 3 : 1) * (.5 + a.health / a.maxHealth), db = dist2(p, b) * (b.type === 'bell' && b.bossPhase !== 'expose' ? 3 : 1) * (.5 + b.health / b.maxHealth); return da - db || a.id - b.id;
    })[0];
    let goal = target || { x: 192 + Math.cos(w.stageTime * .18 + id * Math.PI) * 112, y: 120 + Math.sin(w.stageTime * .18 + id * Math.PI) * 72 };
    if (target?.type === 'bell' && target.bossPhase === 'pulse') { const [dx, dy] = norm(p.x - target.x || 1, p.y - target.y); goal = { x: p.x + dx * 60, y: p.y + dy * 60 }; }
    // A charged bee lines up the closest immediate hunter before the sting.
    const hunter = close.sort((a, b) => dist2(a, p) - dist2(b, p))[0];
    if (p.charge && hunter && !row.length && dist2(p, hunter) < 65 ** 2) goal = { x: p.x + (p.x < hunter.x ? -1 : 1) * 26, y: hunter.y };
    let focus = !!target && dist2(p, target) < 24 ** 2 && !(hunter && dist2(p, hunter) < 40 ** 2 && !p.charge);
    if (!lineFree(w, p, goal, radius(p, false))) focus = true;
    const r = radius(p, focus), direct = lineFree(w, p, goal, r);
    let waypoint = goal;
    if (!direct) {
      if (cache.target !== target?.id || w.tick - cache.at >= 30 || cache.topology !== w.topology || !cache.path.length) { cache.path = navigation(w, p, goal, r); cache.target = target?.id; cache.at = w.tick; cache.topology = w.topology; }
      while (cache.path.length > 1 && dist2(p, cache.path[0]) < 5 ** 2) cache.path.shift();
      waypoint = cache.path[0] || goal;
      for (let i = Math.min(cache.path.length - 1, 8); i >= 1; i--) if (lineFree(w, p, cache.path[i], r)) { waypoint = cache.path[i]; break; }
    }
    let [x, y] = norm(waypoint.x - p.x, waypoint.y - p.y);
    if (target && dist2(p, target) < (r + target.r - 3) ** 2 && (!hunter || dist2(p, hunter) > 32 ** 2 || p.charge)) { x = clamp((target.x - p.x) * 3 / w.tuning.speed, -1, 1); y = clamp((target.y - p.y) * 3 / w.tuning.speed, -1, 1); }
    return { x, y, focus, ray };
  }
  root.NightSim = { create, step, next, retry, restart, loadStage, addPlayer, leave, snapshot, restore, setTuning, resetTuning, defaults, tuningDefs, bot, validateContent, radius, free, spawnRival, spawnTarget, topologyOK, navigation, DT };
})(globalThis);
