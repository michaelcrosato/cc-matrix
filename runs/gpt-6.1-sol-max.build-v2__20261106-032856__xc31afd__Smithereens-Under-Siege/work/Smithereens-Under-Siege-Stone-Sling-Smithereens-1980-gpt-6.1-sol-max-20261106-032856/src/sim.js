import {
  ARENA,
  STONES,
  DEFAULTS,
  DT,
  clamp,
  tickOf,
  tuning,
  rngStep,
} from './config.js';
import { COURTS, RIVALS, castleBlocks, connected } from './content.js';

export function createWorld(o = {}) {
  const court =
      o.customCourt || COURTS[o.court ?? Math.floor((o.bout || 0) / 2) % 5],
    config = tuning(o.config);
  return {
    version: 1,
    tick: 0,
    seed: o.seed || 71,
    rng: o.seed || 71,
    mode: o.mode || 'quick',
    court: court.id,
    courtDef: court,
    bout: o.bout || 0,
    phase: 'playing',
    deadline: tickOf(o.duration || 90),
    config,
    allowed: o.allowed || [0, 1, 2],
    players: [0, 1].map((seat) => ({
      seat,
      stone: 0,
      held: false,
      charge: -1,
      chargeTime: 1.4,
      ready: 0,
      crewUntil: 0,
      launcherUntil: 0,
      protectUntil: 0,
      seq: -1,
      score: 0,
      last: [null, null, null],
      launchTick: -1000,
      returnTick: -1000,
    })),
    castles: [
      castleBlocks(court, 0, config.healthScale),
      castleBlocks(court, 1, config.healthScale),
    ],
    shots: [],
    throws: {},
    nextShot: 1,
    events: [],
    coverage: {
      launch: [0, 0, 0],
      castle: 0,
      crew: 0,
      launcher: 0,
      collapse: 0,
      split: 0,
      recovery: 0,
      cancel: 0,
      results: 0,
    },
    revision: 0,
    outcome: null,
    cheated: false,
    invulnerable: false,
  };
}
export function emit(w, type, fields = {}) {
  w.events.push({ type, tick: w.tick, ...fields });
  if (w.events.length > 160) w.events.splice(0, w.events.length - 160);
}
export function readyAt(p) {
  return Math.max(p.ready, p.crewUntil, p.launcherUntil);
}
export function canAct(w, p) {
  return w.phase === 'playing' && w.tick >= readyAt(p);
}
export function powerOf(w, p) {
  return p.charge < 0
    ? 0
    : clamp(((w.tick - p.charge) * DT) / p.chargeTime, 0, 1);
}
export function cancel(w, seat, feedback = true) {
  const p = w.players[seat];
  if (!p) return;
  p.held = false;
  p.charge = -1;
  if (feedback) {
    w.coverage.cancel++;
    emit(w, 'cancel', { seat });
  }
}
export function command(w, seat, c) {
  const p = w.players[seat];
  if (!p || !c || w.phase !== 'playing') return false;
  if (c.seq !== undefined) {
    if (!Number.isSafeInteger(c.seq) || c.seq <= p.seq) return false;
    p.seq = c.seq;
  }
  if (c.kind === 'cancel') {
    cancel(w, seat);
    return true;
  }
  if (c.kind === 'stone') {
    if (
      p.charge >= 0 ||
      !w.allowed.includes(c.stone) ||
      !Number.isInteger(c.stone)
    )
      return false;
    p.stone = c.stone;
    return true;
  }
  if (c.kind === 'begin') {
    if (p.held || w.tick < p.crewUntil || w.tick < p.launcherUntil)
      return false;
    p.held = true;
    if (canAct(w, p)) begin(w, p);
    return true;
  }
  if (c.kind === 'release') {
    const active = p.held && p.charge >= 0;
    p.held = false;
    if (!active) {
      p.charge = -1;
      return false;
    }
    let power = powerOf(w, p);
    if (Number.isFinite(c.duration)) {
      // Host-validated local hold duration; authority still owns availability and begin.
      const elapsed = (w.tick - p.charge) * DT;
      power = clamp(
        clamp(c.duration, Math.max(0, elapsed - 0.32), elapsed + 0.32) /
          p.chargeTime,
        0,
        1,
      );
    }
    p.charge = -1;
    if (power < 0.065) {
      w.coverage.cancel++;
      emit(w, 'cancel', { seat, short: true });
      return true;
    }
    launch(w, seat, power);
    return true;
  }
  return false;
}
function begin(w, p) {
  p.charge = w.tick;
  p.chargeTime = w.config.chargeTime;
  emit(w, 'wind', { seat: p.seat });
}
export function projectile(w, seat, stone, power) {
  const dir = seat ? -1 : 1,
    speed = 100 + (w.config.speed - 100) * clamp(power, 0, 1);
  return {
    id: w.nextShot,
    throw: w.nextShot,
    seat,
    stone,
    x: ARENA.launch[seat] + dir * 12,
    z: ARENA.ground + 24,
    vx: dir * Math.cos(ARENA.angle) * speed,
    vz: Math.sin(ARENA.angle) * speed,
    g: w.config.gravity,
    age: 0,
    fragment: false,
  };
}
function launch(w, seat, power) {
  const p = w.players[seat],
    s = projectile(w, seat, p.stone, power);
  w.nextShot++;
  w.shots.push(s);
  w.throws[s.throw] = { targets: [], tick: w.tick };
  p.launchTick = w.tick;
  p.ready =
    w.tick +
    tickOf(
      [w.config.roundReload, w.config.heavyReload, w.config.splitReload][
        p.stone
      ],
    );
  w.coverage.launch[p.stone]++;
  emit(w, 'launch', {
    seat,
    stone: p.stone,
    power,
    x: s.x,
    z: s.z,
    id: s.throw,
  });
}
// Slab intersection of the complete step against a radius-expanded target.
export function sweep(x, z, nx, nz, b, r = 0) {
  let lo = 0,
    hi = 1;
  for (const [a, d, min, max] of [
    [x, nx - x, b.x - r, b.x + b.w + r],
    [z, nz - z, b.z - r, b.z + b.h + r],
  ]) {
    if (Math.abs(d) < 1e-10) {
      if (a < min || a > max) return null;
      continue;
    }
    let a0 = (min - a) / d,
      a1 = (max - a) / d;
    if (a0 > a1) [a0, a1] = [a1, a0];
    lo = Math.max(lo, a0);
    hi = Math.min(hi, a1);
    if (lo > hi) return null;
  }
  return lo;
}
export function targets(w, seat) {
  const p = w.players[seat],
    out = w.castles[seat]
      .filter((b) => !b.foundation && b.hp > 0)
      .map((b) => ({ ...b, kind: 'castle', seat, key: `b${seat}:${b.id}` }));
  if (w.tick >= p.crewUntil)
    out.push({
      x: ARENA.crew[seat] - 7,
      z: ARENA.ground,
      w: 14,
      h: 29,
      kind: 'crew',
      seat,
      key: `c${seat}`,
    });
  if (w.tick >= p.launcherUntil)
    out.push({
      x: ARENA.launch[seat] - 18,
      z: ARENA.ground,
      w: 36,
      h: 24,
      kind: 'launcher',
      seat,
      key: `l${seat}`,
    });
  return out;
}
export function stepProjectile(w, s, dt = DT, list = targets(w, 1 - s.seat)) {
  const nx = s.x + s.vx * dt,
    nz = s.z + s.vz * dt - 0.5 * s.g * dt * dt;
  let best = null;
  const r = s.fragment ? 2 : STONES[s.stone].radius;
  for (const b of list) {
    const t = sweep(s.x, s.z, nx, nz, b, r);
    if (
      t !== null &&
      (!best ||
        t < best.t - 1e-9 ||
        (Math.abs(t - best.t) < 1e-9 && b.key < best.target.key))
    )
      best = { t, target: b };
  }
  const surface =
    (s.x + nx) / 2 > 300 && (s.x + nx) / 2 < 660
      ? ARENA.water
      : ARENA.ground - 1;
  if (nz <= surface) {
    const t = clamp((s.z - surface) / (s.z - nz || 1), 0, 1);
    if (!best || t < best.t)
      best = {
        t,
        target: {
          kind: surface === ARENA.water ? 'water' : 'ground',
          key: '~ground',
        },
      };
  }
  s.x += (nx - s.x) * (best ? best.t : 1);
  s.z += (nz - s.z) * (best ? best.t : 1);
  s.vz -= s.g * dt;
  s.age += dt;
  if (best) return { ...best.target, x: s.x, z: s.z, time: s.age };
  if (s.x < -60 || s.x > 1020 || s.age > 8)
    return { kind: 'away', x: s.x, z: s.z, time: s.age };
  return null;
}
export function fragments(s) {
  return [-1, 0, 1].map((k, i) => ({
    ...s,
    id: s.id * 10 + i + 1,
    vx: s.vx * (1 + k * 0.075),
    vz: 10 + k * 9,
    fragment: true,
    age: s.age,
  }));
}
export function predict(w, seat, stone, power, { path = false } = {}) {
  const s = projectile(w, seat, stone, power),
    todo = [s],
    hits = [],
    points = [],
    list = targets(w, 1 - seat);
  let n = 0;
  while (todo.length && n++ < 5000) {
    const a = todo.shift();
    let hit = null;
    for (let i = 0; i < 1100; i++) {
      hit = stepProjectile(w, a, DT, list);
      if (path && i % 8 === 0) points.push([a.x, a.z]);
      if (hit) {
        hits.push({ ...hit, stone, fragment: a.fragment });
        break;
      }
      if (stone === 2 && !a.fragment && a.vz <= 0) {
        todo.push(...fragments(a));
        break;
      }
    }
  }
  return { hits, points };
}
export function health(w, seat) {
  const b = w.castles[seat];
  return (
    b.reduce((s, a) => s + a.hp, 0) / (b.reduce((s, a) => s + a.max, 0) || 1)
  );
}
export function remaining(w, seat) {
  return w.castles[seat].filter((b) => !b.foundation && b.hp > 0).length;
}
export function collapse(w, seat) {
  const b = w.castles[seat],
    seen = connected(b),
    lost = b.filter((a) => !a.foundation && a.hp > 0 && !seen.has(a.id));
  for (const a of lost) {
    a.hp = 0;
    emit(w, 'fall', {
      seat,
      id: a.id,
      x: a.x,
      z: a.z,
      w: a.w,
      h: a.h,
      material: a.material,
    });
  }
  if (lost.length) {
    w.coverage.collapse += lost.length;
    w.revision++;
    emit(w, 'collapse', { seat, count: lost.length });
  }
  return lost.length;
}
export function resolveImpact(w, s, hit) {
  const p = w.players[s.seat],
    enemy = w.players[1 - s.seat],
    tr =
      w.throws[s.throw] || (w.throws[s.throw] = { targets: [], tick: w.tick });
  p.last[s.stone] = { x: hit.x, z: hit.z, kind: hit.kind, tick: w.tick };
  if (hit.kind === 'castle') {
    const b = w.castles[hit.seat].find((a) => a.id === hit.id);
    if (!b || b.hp <= 0) return;
    if (!tr.targets.includes(hit.key)) {
      p.score += 3;
      tr.targets.push(hit.key);
    }
    if (!w.invulnerable)
      b.hp = Math.max(
        0,
        b.hp -
          STONES[s.stone].damage * w.config.damage * (s.fragment ? 0.8 : 1),
      );
    w.coverage.castle++;
    w.revision++;
    emit(w, 'hit', {
      seat: hit.seat,
      by: s.seat,
      kind: 'castle',
      x: hit.x,
      z: hit.z,
      stone: s.stone,
      id: b.id,
    });
    if (b.hp === 0)
      emit(w, 'fall', {
        seat: hit.seat,
        id: b.id,
        x: b.x,
        z: b.z,
        w: b.w,
        h: b.h,
        material: b.material,
      });
    // A heavy stone chips its immediate neighbours, without extra direct-hit score.
    if (s.stone === 1 && !w.invulnerable)
      for (const a of w.castles[hit.seat])
        if (
          a.id !== b.id &&
          !a.foundation &&
          a.hp > 0 &&
          Math.hypot(a.x - b.x, a.z - b.z) < 23
        ) {
          const hp = a.hp;
          a.hp = Math.max(0, a.hp - 20 * w.config.damage);
          if (hp > 0 && a.hp === 0)
            emit(w, 'fall', {
              seat: hit.seat,
              id: a.id,
              x: a.x,
              z: a.z,
              w: a.w,
              h: a.h,
              material: a.material,
            });
        }
    collapse(w, hit.seat);
  } else if (hit.kind === 'crew' || hit.kind === 'launcher') {
    const until = Math.max(enemy.crewUntil, enemy.launcherUntil);
    if (
      tr.targets.includes(hit.key) ||
      w.tick < enemy[hit.kind === 'crew' ? 'crewUntil' : 'launcherUntil'] ||
      (w.tick >= until && w.tick < enemy.protectUntil)
    ) {
      emit(w, 'shield', { seat: hit.seat, x: hit.x, z: hit.z });
      return;
    }
    tr.targets.push(hit.key);
    p.score += hit.kind === 'crew' ? 7 : 13;
    enemy[hit.kind === 'crew' ? 'crewUntil' : 'launcherUntil'] =
      w.tick +
      tickOf(
        hit.kind === 'crew' ? w.config.crewDisable : w.config.launcherDisable,
      );
    enemy.protectUntil =
      Math.max(enemy.crewUntil, enemy.launcherUntil) +
      tickOf(w.config.protection);
    cancel(w, hit.seat, false);
    w.coverage[hit.kind]++;
    emit(w, 'hit', {
      seat: hit.seat,
      by: s.seat,
      kind: hit.kind,
      x: hit.x,
      z: hit.z,
      stone: s.stone,
    });
  } else if (hit.kind !== 'away')
    emit(w, hit.kind, { x: hit.x, z: hit.z, seat: s.seat });
}
export function finish(w, reason = 'timeout', forced) {
  if (w.outcome) return w.outcome;
  let winner = forced;
  if (winner === undefined) {
    const a = remaining(w, 0),
      b = remaining(w, 1);
    if (!a || !b) winner = !a && !b ? -1 : a ? 0 : 1;
    else {
      const delta = health(w, 0) - health(w, 1);
      winner =
        Math.abs(delta) > 1e-9
          ? delta > 0
            ? 0
            : 1
          : w.players[0].score === w.players[1].score
            ? -1
            : w.players[0].score > w.players[1].score
              ? 0
              : 1;
    }
  }
  w.phase = 'ceremony';
  w.outcome = {
    winner,
    reason,
    tick: w.tick,
    direct: w.players.map((p) => p.score),
    banked: w.players.map((p, i) =>
      i === winner ? p.score * (w.bout + 1) : 0,
    ),
    health: [health(w, 0), health(w, 1)],
  };
  w.players.forEach((p) => cancel(w, p.seat, false));
  w.shots = [];
  w.coverage.results++;
  emit(w, 'outcome', w.outcome);
  return w.outcome;
}
export function step(w) {
  if (w.phase !== 'playing') return;
  w.tick++;
  for (const p of w.players) {
    if (p.held && p.charge < 0 && canAct(w, p)) begin(w, p);
    const end = Math.max(p.crewUntil, p.launcherUntil);
    if (end > 0 && end === w.tick) {
      p.returnTick = w.tick;
      w.coverage.recovery++;
      emit(w, 'recovery', { seat: p.seat });
    }
  }
  const impacts = [],
    next = [];
  for (const s of w.shots) {
    const hit = stepProjectile(w, s);
    if (hit) impacts.push([s, hit]);
    else if (s.stone === 2 && !s.fragment && s.vz <= 0) {
      next.push(...fragments(s));
      w.coverage.split++;
      emit(w, 'split', { x: s.x, z: s.z, seat: s.seat });
    } else next.push(s);
  }
  w.shots = next;
  for (const [s, h] of impacts) resolveImpact(w, s, h);
  if (!remaining(w, 0) || !remaining(w, 1)) finish(w, 'demolition');
  else if (w.tick >= w.deadline) finish(w, 'timeout');
  for (const id in w.throws)
    if (w.tick - w.throws[id].tick > tickOf(12)) delete w.throws[id];
}
export function advance(w, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) step(w);
  return w;
}
export function applyTuning(w, changes) {
  const old = w.config;
  w.config = tuning({ ...old, ...changes });
  if (old.healthScale !== w.config.healthScale) {
    for (const blocks of w.castles)
      for (const b of blocks)
        if (!b.foundation) {
          const f = b.hp / b.max;
          b.max = (b.max / old.healthScale) * w.config.healthScale;
          b.hp = b.max * f;
        }
  }
  w.cheated = true;
}
export function shotValue(w, seat, result, profile) {
  let value = -5;
  const seen = new Set();
  for (const h of result.hits) {
    if (h.kind === 'castle') {
      if (seen.has(h.key)) continue;
      seen.add(h.key);
      const b = w.castles[1 - seat].find((a) => a.id === h.id);
      if (!b) continue;
      const dmg =
        STONES[h.stone].damage * (h.fragment ? 0.8 : 1) * w.config.damage;
      value += Math.min(b.hp, dmg) * 0.16 + 3;
      if (dmg >= b.hp) {
        const after = connected(w.castles[1 - seat], new Set([b.id]));
        value +=
          w.castles[1 - seat].filter(
            (a) => !a.foundation && a.hp > 0 && !after.has(a.id),
          ).length * 7;
      }
      if (profile.kind === 'broad' && h.stone === 2) value += 3;
      if (profile.kind === 'mason' && h.stone === 1) value += 6;
    } else if (h.kind === 'crew' || h.kind === 'launcher') {
      const p = w.players[1 - seat],
        at = w.tick + tickOf(h.time);
      if (at >= p.protectUntil && at >= readyAt(p))
        value +=
          (h.kind === 'launcher' ? 13 : 8) * profile.harass +
          (p.charge >= 0 ? 4 : 0);
    }
  }
  return value;
}
export function planShot(w, seat, profile = RIVALS[8], goal = null) {
  let best = null;
  const choices = [];
  const powers = [];
  for (let p = 0.12; p <= 0.991; p += profile.kind === 'rookie' ? 0.018 : 0.009)
    powers.push(p);
  for (const stone of (profile.stones || w.allowed).filter((s) =>
    w.allowed.includes(s),
  ))
    for (const power of powers) {
      const pred = predict(w, seat, stone, power);
      let v = shotValue(w, seat, pred, profile) - [0, 1, 2][stone] * 0.9;
      if (goal) {
        v = pred.hits.some((h) => h.kind === goal)
          ? 50 + v
          : goal === 'castle'
            ? v
            : -100;
      }
      if (!best || v > best.value) {
        best = { stone, power, value: v, hits: pred.hits };
      }
      if (v > 0) choices.push({ stone, power, value: v, hits: pred.hits });
    }
  return best || { stone: 0, power: 0.7, value: 0, hits: [] };
}
export function createAI(profile = RIVALS[0]) {
  return {
    profile,
    at: 0,
    plan: null,
    goal: null,
    seen: -1,
    release: 0,
    shots: 0,
  };
}
export function aiStep(w, seat, ai) {
  if (w.phase !== 'playing') return;
  const p = w.players[seat];
  if (p.charge >= 0) {
    if (w.tick >= ai.release) command(w, seat, { kind: 'release' });
    return;
  }
  if (!canAct(w, p) || p.held) {
    ai.plan = null;
    return;
  }
  if (w.tick < ai.at) return;
  if (!ai.plan) {
    ai.plan = planShot(w, seat, ai.profile, ai.goal);
    const error = (ai.rangeError =
      (rngStep(w) - 0.5) * 2 * ai.profile.error * w.config.aiError);
    ai.plan.power = clamp(ai.plan.power + error, 0.09, 0.97);
    ai.at =
      w.tick +
      tickOf(
        ai.profile.reaction * w.config.aiReaction * (0.8 + rngStep(w) * 0.4),
      );
    ai.seen = w.revision;
    return;
  }
  if (ai.seen !== w.revision) {
    ai.plan = planShot(w, seat, ai.profile, ai.goal);
    ai.plan.power = clamp(ai.plan.power + (ai.rangeError || 0), 0.09, 0.97);
    ai.seen = w.revision;
  }
  command(w, seat, { kind: 'stone', stone: ai.plan.stone });
  command(w, seat, { kind: 'begin' });
  ai.release = w.tick + tickOf(ai.plan.power * p.chargeTime);
  ai.plan = null;
  ai.shots++;
  ai.at = w.tick + tickOf(ai.profile.reaction * w.config.aiReaction);
}
// Compact full-state packets repair any lost prior snapshot; all geometry is regenerated from the court ID.
export function pack(w, seq = 0) {
  return {
    t: 's',
    v: 1,
    n: seq,
    k: w.tick,
    c: w.court,
    b: w.bout,
    d: w.deadline,
    r: w.rng,
    i: w.nextShot,
    f: w.phase === 'playing' ? 0 : 1,
    p: w.players.map((p) => [
      p.stone,
      +p.held,
      p.charge,
      Math.round(p.chargeTime * 1000),
      p.ready,
      p.crewUntil,
      p.launcherUntil,
      p.protectUntil,
      p.seq,
      p.score,
      p.launchTick,
    ]),
    h: w.castles.map((bs) =>
      bs
        .filter((b) => !b.foundation)
        .map((b) =>
          Math.round((b.hp / b.max) * 255)
            .toString(16)
            .padStart(2, '0'),
        )
        .join(''),
    ),
    l: w.players.map((p) =>
      p.last.map((m) =>
        m ? [Math.round(m.x * 10), Math.round(m.z * 10), m.kind] : null,
      ),
    ),
    s: w.shots.map((s) => [
      s.id,
      s.throw,
      s.seat,
      s.stone,
      ...[s.x, s.z, s.vx, s.vz].map((v) => Math.round(v * 10)),
      Math.round(s.g),
      +s.fragment,
      Math.round(s.age * 100),
    ]),
    o: w.outcome
      ? [
          w.outcome.winner,
          w.outcome.reason,
          w.outcome.tick,
          ...w.outcome.direct,
        ]
      : null,
  };
}
export function unpack(w, s) {
  if (
    !s ||
    s.v !== 1 ||
    !Number.isInteger(s.k) ||
    s.k < w.tick ||
    s.c !== w.court ||
    !Array.isArray(s.p) ||
    s.p.length !== 2 ||
    !Array.isArray(s.h) ||
    !Array.isArray(s.s)
  )
    return false;
  w.tick = s.k;
  w.deadline = s.d;
  w.rng = s.r;
  w.nextShot = s.i;
  w.phase = s.f ? 'ceremony' : 'playing';
  for (let i = 0; i < 2; i++) {
    const a = s.p[i],
      p = w.players[i];
    [
      p.stone,
      p.held,
      p.charge,
      p.chargeTime,
      p.ready,
      p.crewUntil,
      p.launcherUntil,
      p.protectUntil,
      p.seq,
      p.score,
      p.launchTick,
    ] = a;
    p.chargeTime /= 1000;
    p.held = !!p.held;
    if (Array.isArray(s.l?.[i])) {
      p.last = s.l[i].map((m) =>
        m ? { x: m[0] / 10, z: m[1] / 10, kind: m[2], tick: s.k } : null,
      );
    }
    let j = 0;
    for (const b of w.castles[i])
      if (!b.foundation) {
        b.hp = (parseInt(s.h[i].slice(j, j + 2), 16) / 255) * b.max;
        j += 2;
      }
  }
  w.shots = s.s.map((a) => ({
    id: a[0],
    throw: a[1],
    seat: a[2],
    stone: a[3],
    x: a[4] / 10,
    z: a[5] / 10,
    vx: a[6] / 10,
    vz: a[7] / 10,
    g: a[8],
    fragment: !!a[9],
    age: a[10] / 100,
  }));
  if (s.o) {
    const a = s.o;
    w.outcome = {
      winner: a[0],
      reason: a[1],
      tick: a[2],
      direct: [a[3], a[4]],
      banked: [0, 0],
      health: [health(w, 0), health(w, 1)],
    };
  }
  return true;
}
