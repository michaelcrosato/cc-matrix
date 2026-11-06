import {
  ARENA,
  DEFAULTS,
  WEAPONS,
  WAVES,
  BOSS_PHASES,
  ROUTES,
  QUIPS,
} from "../content/campaign.js";
export const FIXED_DT = 1 / 120;
export const bound = (n, a, b) => Math.max(a, Math.min(b, n));
const qround = (n) => Math.round(n * 10) / 10;
const pathCache = new Map();
function pathFor(route) {
  if (!pathCache.has(route))
    pathCache.set(
      route,
      new globalThis.My3D2dge.Path(ROUTES[route], { smooth: "catmull" }),
    );
  return pathCache.get(route);
}
export function randomWorld(w) {
  let a = (w.rng = (w.rng + 0x6d2b79f5) >>> 0);
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}
export function emit(w, type, data = {}) {
  const ev = { id: ++w.eventId, tick: w.tick, type, ...data };
  w.events.push(ev);
  if (w.events.length > 48) w.events.shift();
  return ev;
}
export function createWorld({
  seed = 1982,
  seats = [{ id: 0, name: "PILOT 1" }],
  tuning = {},
  assists = {},
  demo = false,
} = {}) {
  const tune = { ...DEFAULTS, ...tuning };
  const w = {
    v: 1,
    seed: seed >>> 0,
    rng: seed >>> 0,
    tick: 0,
    time: 0,
    hostileTime: 0,
    phase: "countdown",
    phaseTime: 0,
    wave: 0,
    bossPhase: 0,
    boss: null,
    players: seats.slice(0, 4).map((p, i) => ({
      id: p.id,
      name: String(p.name || "PILOT " + (i + 1)).slice(0, 32),
      seat: i,
      x: 170 + i * 95,
      y: ARENA.lane,
      vx: 0,
      hp: 3,
      inv: 0,
      recoil: 0,
      cool: 0,
      connected: true,
      kills: 0,
      intercepts: 0,
      hitCount: 0,
      brakeSeq: -1,
      lastSeq: -1,
      inputAt: -999,
      action: { move: 0, target: null, fire: false, brake: 0 },
    })),
    enemies: [],
    threats: [],
    shots: [],
    nextId: 1,
    eventId: 0,
    events: [],
    score: 0,
    brake: 0,
    brakeLeft: 0,
    brakeCooldown: 0,
    attackClock: 4.8,
    attackIndex: 0,
    targetIndex: 0,
    hintIndex: 0,
    seen: [],
    clears: [],
    outcome: null,
    tuning: tune,
    assists: { autoFire: false, slow: false, emergency: false, ...assists },
    modified:
      demo || Object.keys(DEFAULTS).some((k) => tune[k] !== DEFAULTS[k]),
    demo,
    stats: { ships: 0, intercepts: 0, hits: 0, brakes: 0, bonus: 0 },
    finishCount: 0,
  };
  emit(w, "begin");
  return w;
}
export function acceptAction(w, from, packet) {
  const p = w.players.find((p) => p.id === from && p.connected);
  if (
    !p ||
    !packet ||
    packet.k !== "a" ||
    !Number.isSafeInteger(packet.n) ||
    packet.n < 0 ||
    packet.n <= p.lastSeq ||
    !Number.isFinite(packet.m) ||
    Math.abs(packet.m) > 1 ||
    !(
      packet.x === null ||
      (Number.isFinite(packet.x) &&
        packet.x >= ARENA.left &&
        packet.x <= ARENA.right)
    ) ||
    typeof packet.f !== "boolean" ||
    !Number.isSafeInteger(packet.b) ||
    packet.b < 0 ||
    packet.b > 1e9
  )
    return false;
  p.lastSeq = packet.n;
  p.inputAt = w.time;
  p.action = {
    move: packet.m,
    target: packet.x,
    fire: packet.f,
    brake: packet.b,
  };
  return true;
}
export function leaveWorld(w, id) {
  const p = w.players.find((p) => p.id === id);
  if (p) {
    p.connected = false;
    p.action = { move: 0, target: null, fire: false, brake: 0 };
    w.shots = w.shots.filter((s) => s.owner !== id);
    emit(w, "leave", { owner: id });
    checkTeam(w);
  }
}
function checkTeam(w) {
  if (
    !w.outcome &&
    w.players.filter((p) => p.connected).every((p) => p.hp <= 0)
  )
    finishWorld(w, false);
}
export function finishWorld(
  w,
  won,
  reason = won ? "rift-sealed" : "machines-lost",
) {
  if (w.outcome) return false;
  w.outcome = { won, reason, score: w.score, tick: w.tick };
  w.finishCount++;
  w.threats = [];
  w.shots = [];
  w.phase = won ? "ending" : "results";
  w.phaseTime = 0;
  emit(w, won ? "victory" : "defeat", {
    line: won ? QUIPS.victory : QUIPS.defeat,
  });
  return true;
}
export function startEncounter(w, wave = w.wave, bossPhase = null) {
  w.enemies = [];
  w.threats = [];
  w.shots = [];
  w.phaseTime = 0;
  w.attackIndex = 0;
  w.attackClock = 4.8;
  w.hintIndex = 0;
  w.boss = null;
  if (bossPhase !== null || wave >= 8) {
    w.wave = 8;
    w.bossPhase = bossPhase ?? 0;
    const b = BOSS_PHASES[w.bossPhase];
    w.phase = "finale";
    w.boss = {
      id: w.nextId++,
      x: 320,
      y: 116,
      hp: b.hp,
      max: b.hp,
      clock: 0,
      open: false,
      r: 24,
    };
    w.attackClock = 1.7;
    emit(w, "boss", { line: b.line, phase: w.bossPhase });
  } else {
    w.wave = wave;
    w.phase = "playing";
    const c = WAVES[wave];
    for (let i = 0; i < c.ships; i++) {
      const group = Math.floor(i / c.groupSize),
        route = c.routes[group % c.routes.length],
        slot = i % c.groupSize;
      w.enemies.push({
        id: w.nextId++,
        i,
        group,
        route,
        d: -(group * 1.15 + slot * c.spacing) * 125,
        x: 320,
        y: 65,
        px: 320,
        py: 65,
        hp: c.hp,
        max: c.hp,
        kind: (group + wave) % 3,
        a: 0,
        r: 12,
        formed: false,
        hit: 0,
      });
    }
    emit(w, "wave", { wave, line: c.line, cue: c.cue });
  }
  if (!w.seen.includes(w.wave === 8 ? "boss" + w.bossPhase : "wave" + w.wave))
    w.seen.push(w.wave === 8 ? "boss" + w.bossPhase : "wave" + w.wave);
}
function waveClear(w) {
  w.clears.push(w.wave);
  const bonus =
    w.players.filter((p) => p.connected).reduce((a, p) => a + p.hp * 12, 0) +
    Math.min(40, w.stats.intercepts * 2);
  w.stats.bonus += bonus;
  w.score += bonus;
  w.phase = "intermission";
  w.phaseTime = 0;
  w.threats = [];
  w.shots = [];
  for (const p of w.players)
    if (p.connected) {
      if (p.hp === 0) p.hp = 1;
      else p.hp = Math.min(3, p.hp + 1);
      p.inv = 2;
      emit(w, "recover", { owner: p.id, x: p.x, y: p.y });
    }
  emit(w, "clear", { bonus, line: QUIPS.clear[w.wave % QUIPS.clear.length] });
}
export function activateBrake(w, owner) {
  if (
    w.outcome ||
    w.brake < 100 - 1e-6 ||
    w.brakeLeft > 0 ||
    w.brakeCooldown > 0
  )
    return false;
  w.brake = 0;
  w.brakeLeft = w.tuning.brakeDuration;
  w.brakeCooldown = 2;
  w.stats.brakes++;
  emit(w, "brake", { owner, line: QUIPS.brake[w.stats.brakes % 2] });
  return true;
}
function chargeWorld(w, amount) {
  const before = w.brake;
  w.brake = bound(w.brake + amount * w.tuning.chargeGain, 0, 100);
  if (before < 100 && w.brake === 100) emit(w, "charged");
}
function targetWorld(w) {
  const ps = w.players
    .filter((p) => p.connected && p.hp > 0)
    .sort((a, b) => a.id - b.id);
  return ps.length ? ps[w.targetIndex++ % ps.length] : null;
}
export function spawnThreat(w, kind, options = {}) {
  if (!WEAPONS[kind] || w.threats.length >= 14 || w.outcome) return null;
  const p = targetWorld(w);
  if (!p) return null;
  const e = w.enemies.filter((f) => f.d >= 0)[
    Math.floor(
      randomWorld(w) * Math.max(1, w.enemies.filter((f) => f.d >= 0).length),
    )
  ];
  const x = options.x ?? (e ? e.x : 320 + (randomWorld(w) - 0.5) * 300),
    y = options.y ?? (e ? e.y + 10 : 140);
  const t = {
    id: w.nextId++,
    kind,
    x: bound(x, 48, 592),
    y,
    px: x,
    py: y,
    vx: 0,
    vy: 0,
    age: 0,
    warn:
      options.warn ??
      (WAVES[w.wave]?.warning ?? 0.8) * (kind === "hunter" ? 1.5 : 1),
    state: "warn",
    target: p.id,
    tx: p.x,
    ty: p.y,
    r: WEAPONS[kind].r,
    life: 14,
    ground: false,
    from: 0,
    to: 0,
    safe: 0,
  };
  if (kind === "dart") {
    t.vx = bound((p.x - t.x) * 0.1, -12, 12);
    t.vy = w.tuning.missileSpeed * (1 + w.wave * 0.035);
  }
  if (kind === "mine") {
    t.vx = 0;
    t.vy = 52 + w.wave * 1.6;
    t.life = 9;
  }
  if (kind === "hunter") {
    t.tx = bound(p.x + p.vx * w.tuning.prediction, 44, 596);
    t.ty = ARENA.lane;
  }
  if (kind === "roller") {
    // Bound one sweep to a short segment. Its opposite half remains an explicit refuge.
    if (w.threats.some((t) => t.kind === "roller")) return null;
    t.x = bound(p.x + (randomWorld(w) > 0.5 ? 55 : -55), 115, 525);
    t.px = t.x;
    t.vy = 61;
    const direction = t.x < 320 ? 1 : -1;
    t.from = t.x;
    t.to = bound(t.x + direction * 110, 92, 548);
    t.safe = direction > 0 ? t.from - 38 : t.from + 38;
    const landingTime = Math.max(0, (ARENA.lane - t.y) / 61) + t.warn;
    const safeCandidates = [
      Math.min(t.from, t.to) - 35,
      Math.max(t.from, t.to) + 35,
    ].filter((x) => x >= ARENA.left + 7 && x <= ARENA.right - 7);
    const safeFor = (pilot, sx) =>
      Math.abs(pilot.x - sx) <
        w.tuning.playerSpeed * Math.max(0.3, landingTime - 0.2) &&
      !w.threats.some((q) => {
        if (q.kind === "hunter" && q.state === "warn")
          return Math.abs(q.tx - sx) < 38;
        const futureX = q.x + q.vx * landingTime,
          futureY = q.y + Math.max(0, q.vy) * landingTime;
        return (
          q.life > landingTime &&
          Math.abs(futureX - sx) < 38 &&
          futureY > ARENA.lane - 60 &&
          futureY < ARENA.lane + 35
        );
      });
    if (
      w.players.some(
        (q) =>
          q.connected &&
          q.hp > 0 &&
          !safeCandidates.some((sx) => safeFor(q, sx)),
      )
    )
      return null;
    t.safe =
      safeCandidates
        .filter((sx) => safeFor(p, sx))
        .sort((a, b) => Math.abs(a - p.x) - Math.abs(b - p.x))[0] ?? t.safe;
    if (
      w.players.some(
        (q) =>
          q.connected &&
          q.hp > 0 &&
          Math.min(
            Math.abs(q.x - (Math.min(t.from, t.to) - 25)),
            Math.abs(q.x - (Math.max(t.from, t.to) + 25)),
          ) >
            w.tuning.playerSpeed *
              (Math.max(1, (ARENA.lane - t.y) / 61) + 0.65),
      )
    )
      return null;
  }
  // Never place another lower-lane aim mark inside an active roller's nearest refuge.
  const roller = w.threats.find((t) => t.kind === "roller");
  if (
    roller &&
    kind !== "roller" &&
    (Math.abs((kind === "hunter" ? t.tx : t.x) - roller.safe) < 52 ||
      (kind === "mine" && Math.abs(p.x - roller.safe) < 52))
  )
    return null;
  if (
    kind === "hunter" &&
    roller &&
    t.tx > Math.min(roller.from, roller.to) - 45 &&
    t.tx < Math.max(roller.from, roller.to) + 45
  )
    t.tx = bound(roller.safe + (roller.safe < 320 ? -75 : 75), 44, 596);
  w.threats.push(t);
  emit(w, "launch", { kind, x: t.x, y: t.y });
  if (!w.seen.includes(kind)) w.seen.push(kind);
  return t;
}
function stepThreat(w, t, hdt) {
  t.px = t.x;
  t.py = t.y;
  t.age += hdt;
  t.life -= hdt;
  if (t.state === "warn") {
    t.warn -= hdt;
    if (t.warn > 0) return;
    t.state = "air";
    if (t.kind === "hunter") {
      const dx = t.tx - t.x,
        dy = t.ty - t.y,
        s = 125 + w.wave * 2,
        d = Math.hypot(dx, dy);
      t.vx = (dx / d) * s;
      t.vy = (dy / d) * s;
      emit(w, "commit", { id: t.id });
    }
  }
  if (t.kind === "mine") {
    const p = w.players.find(
      (p) => p.id === t.target && p.connected && p.hp > 0,
    );
    const speed = 56 + w.wave * 1.6;
    const want = Math.atan2(ARENA.lane - t.y, (p ? p.x : t.tx) - t.x),
      angle = Math.atan2(t.vy, t.vx);
    const diff = Math.atan2(Math.sin(want - angle), Math.cos(want - angle));
    if (!t.turnCue && Math.abs(diff) > 0.3) {
      t.turnCue = true;
      emit(w, "mineTurn", { id: t.id, x: t.x, y: t.y });
    }
    const a =
      angle + bound(diff, -w.tuning.mineTurn * hdt, w.tuning.mineTurn * hdt);
    t.vx = Math.cos(a) * speed;
    t.vy = Math.max(21, Math.sin(a) * speed);
  }
  if (t.kind === "roller" && t.ground) {
    t.vx = Math.sign(t.to - t.from) * w.tuning.rollerSpeed;
    t.vy = 0;
    if ((t.to - t.x) * t.vx <= 0) t.life = 0;
  }
  t.x += t.vx * hdt;
  t.y += t.vy * hdt;
  if (t.kind === "roller" && !t.ground && t.y >= ARENA.lane) {
    t.y = ARENA.lane;
    t.x = t.from;
    t.ground = true;
    t.state = "ground";
    t.life = Math.min(
      t.life,
      Math.abs(t.to - t.from) / w.tuning.rollerSpeed + 0.1,
    );
    emit(w, "land", { x: t.x, y: t.y });
  }
  if (t.y > 334 || t.x < 20 || t.x > 620) t.life = 0;
}
// Relative segment-circle test, continuous for both fast shots and moving targets.
export function sweptHit(a, b, r) {
  const x = a.px - b.px,
    y = a.py - b.py,
    dx = a.x - a.px - (b.x - b.px),
    dy = a.y - a.py - (b.y - b.py);
  const den = dx * dx + dy * dy;
  const t = den ? bound(-(x * dx + y * dy) / den, 0, 1) : 0;
  return (x + dx * t) ** 2 + (y + dy * t) ** 2 <= r * r;
}
function hitPlayer(w, p, t) {
  if (p.inv > 0 || p.hp <= 0 || !p.connected) return;
  p.hp--;
  p.hitCount++;
  w.stats.hits++;
  p.inv = 2.2;
  p.x = bound(p.x + (p.x < t.x ? -12 : 12), ARENA.left, ARENA.right);
  p.vx = 0;
  // One damage event, then dissolve all overlapping dangers. No chain damage this tick.
  for (const q of w.threats)
    if (Math.hypot(q.x - p.x, q.y - p.y) < 54) q.life = 0;
  emit(w, "hit", {
    owner: p.id,
    x: p.x,
    y: p.y,
    line: QUIPS.hurt[w.stats.hits % 2],
  });
  checkTeam(w);
}
export function stepWorld(w, dt = FIXED_DT) {
  if (w.outcome) {
    if (w.phase === "ending") {
      w.phaseTime += dt;
      if (w.phaseTime > 6) {
        w.phase = "results";
        emit(w, "results");
      }
    }
    return;
  }
  w.tick++;
  w.time += dt;
  w.phaseTime += dt;
  for (const p of w.players) {
    p.inv = Math.max(0, p.inv - dt);
    p.recoil = Math.max(0, p.recoil - dt * 7);
  }
  if (w.phase === "countdown") {
    if (w.phaseTime >= 2) startEncounter(w, 0);
    return;
  }
  if (w.phase === "intermission") {
    if (w.phaseTime >= 3.2) startEncounter(w, w.wave + 1);
    return;
  }
  if (!["playing", "finale"].includes(w.phase)) return;
  w.brakeCooldown = Math.max(0, w.brakeCooldown - dt);
  for (const p of w.players) {
    if (!p.connected || p.hp <= 0) continue;
    const active = w.time - p.inputAt < 0.48,
      a = active
        ? p.action
        : { move: 0, target: null, fire: false, brake: p.brakeSeq };
    if (a.brake > p.brakeSeq) {
      p.brakeSeq = a.brake;
      if (a.brake > 0) activateBrake(w, p.id);
    }
    p.px = p.x;
    p.py = p.y;
    let move = a.move;
    if (Math.abs(move) < 0.08 && a.target !== null)
      move = bound((a.target - p.x) / (w.tuning.playerSpeed * dt), -1, 1);
    p.vx = move * w.tuning.playerSpeed;
    p.x = bound(p.x + p.vx * dt, ARENA.left, ARENA.right);
    p.cool -= dt;
    if (
      (a.fire || w.assists.autoFire) &&
      p.cool <= 0 &&
      !w.shots.some((s) => s.owner === p.id)
    ) {
      w.shots.push({
        id: w.nextId++,
        owner: p.id,
        x: p.x,
        y: p.y - 14,
        px: p.x,
        py: p.y - 14,
        r: 3,
        hit: false,
      });
      p.cool = w.tuning.fireInterval;
      p.recoil = 1;
      emit(w, "shot", { owner: p.id, x: p.x, y: p.y - 14 });
    }
    if (
      w.assists.emergency &&
      w.brake >= 100 &&
      w.threats.some(
        (t) => Math.hypot(t.x - p.x, t.y - p.y) < 65 && t.state !== "warn",
      )
    )
      activateBrake(w, p.id);
  }
  const hdt =
    dt *
    (w.brakeLeft > 0 ? w.tuning.slowFactor : 1) *
    (w.assists.slow ? 0.72 : 1);
  if (w.brakeLeft > 0) {
    w.brakeLeft = Math.max(0, w.brakeLeft - dt);
    if (w.brakeLeft === 0) emit(w, "release");
  }
  w.hostileTime += hdt;
  const c = WAVES[w.wave];
  for (const f of w.enemies) {
    f.px = f.x;
    f.py = f.y;
    f.hit = Math.max(0, f.hit - dt);
    f.d += 125 * hdt;
    const path = pathFor(f.route);
    if (f.d < 0) continue;
    if (f.d < path.length) {
      const p = path.at(f.d);
      f.x = bound(p.x, 42, 598);
      f.y = p.y;
      f.a = p.angle;
    } else {
      f.formed = true;
      const phase = (w.hostileTime * c.speed) / 110 + f.group * 1.7;
      f.x = bound(
        320 + Math.sin(phase) * 195 + ((f.i % 8) - 3.5) * 19,
        48,
        592,
      );
      f.y = 101 + f.group * 26 + Math.cos(phase * 1.6 + f.i * 0.5) * 15;
      f.a = Math.cos(phase) * 0.3;
    }
  }
  if (w.boss) {
    const b = w.boss,
      bc = BOSS_PHASES[w.bossPhase];
    b.px = b.x;
    b.py = b.y;
    b.clock += hdt;
    b.x = 320 + Math.sin(w.hostileTime * 0.55) * 175;
    b.y = 116 + Math.sin(w.hostileTime * 0.8) * 12;
    const before = b.open;
    b.open = b.clock % (bc.open + bc.closed) > bc.closed;
    if (before !== b.open) emit(w, b.open ? "weakpoint" : "shield");
  }
  w.attackClock -= hdt;
  if (w.attackClock <= 0) {
    const mix = w.boss ? BOSS_PHASES[w.bossPhase].mix : c.mix;
    const kind = mix[w.attackIndex++ % mix.length];
    spawnThreat(w, kind);
    const interval = w.boss ? BOSS_PHASES[w.bossPhase].interval : c.interval;
    w.attackClock =
      ((interval * w.tuning.enemyInterval) / DEFAULTS.enemyInterval) *
      (w.players.filter((p) => p.connected).length > 1 ? 0.85 : 1);
  }
  if (
    c &&
    w.hintIndex < c.hints.length &&
    w.phaseTime >= c.hints[w.hintIndex][0]
  ) {
    emit(w, "hint", { line: c.hints[w.hintIndex++][1] });
  }
  for (const t of w.threats) stepThreat(w, t, hdt);
  for (const s of w.shots) {
    s.px = s.x;
    s.py = s.y;
    s.y -= w.tuning.shotSpeed * dt;
    // Nearest eligible collision along the swept ray; interceptions precede hull damage.
    const targets = [
      ...w.threats.filter((t) => !t.ground && t.life > 0 && t.state !== "warn"),
      ...w.enemies.filter((f) => f.d >= 0 && f.hp > 0),
      ...(w.boss ? [w.boss] : []),
    ]
      .filter((t) => sweptHit(s, t, s.r + t.r))
      .sort((a, b) => b.y - a.y || a.id - b.id);
    const t = targets[0];
    if (!t) continue;
    s.hit = true;
    const owner = w.players.find((p) => p.id === s.owner);
    if (t.kind && WEAPONS[t.kind]) {
      t.life = 0;
      w.score += WEAPONS[t.kind].score;
      w.stats.intercepts++;
      if (owner) owner.intercepts++;
      chargeWorld(w, WEAPONS[t.kind].charge);
      emit(w, "intercept", {
        kind: t.kind,
        x: t.x,
        y: t.y,
        owner: s.owner,
        points: WEAPONS[t.kind].score,
      });
    } else if (t === w.boss) {
      if (t.open) {
        t.hp--;
        w.score += 3;
        chargeWorld(w, 1);
        emit(w, "bossHit", { x: t.x, y: t.y });
      } else emit(w, "blocked", { x: t.x, y: t.y });
    } else {
      t.hp--;
      t.hit = 0.12;
      if (t.hp <= 0) {
        w.score += 5;
        w.stats.ships++;
        if (owner) owner.kills++;
        chargeWorld(w, 2);
        emit(w, "kill", { x: t.x, y: t.y, owner: s.owner, points: 5 });
      } else emit(w, "hullHit", { x: t.x, y: t.y });
    }
  }
  w.shots = w.shots.filter((s) => !s.hit && s.y > -10);
  w.enemies = w.enemies.filter((f) => f.hp > 0);
  w.threats = w.threats.filter((t) => t.life > 0);
  for (const t of w.threats) {
    if (t.state === "warn") continue;
    for (const p of w.players) {
      if (
        p.hp > 0 &&
        p.connected &&
        p.inv <= 0 &&
        sweptHit(t, { ...p, px: p.px ?? p.x, py: p.y }, t.r + 6)
      ) {
        hitPlayer(w, p, t);
        break;
      }
    }
    if (w.outcome) return;
  }
  w.threats = w.threats.filter((t) => t.life > 0);
  if (w.boss && w.boss.hp <= 0) {
    w.threats = [];
    w.shots = [];
    emit(w, "phaseBreak", { x: w.boss.x, y: w.boss.y });
    if (w.bossPhase === 2) {
      w.score += 300;
      finishWorld(w, true);
    } else {
      w.bossPhase++;
      const next = w.bossPhase;
      for (const p of w.players)
        if (p.connected) {
          p.hp = Math.min(3, p.hp + 1);
          p.inv = 2;
        }
      startEncounter(w, 8, next);
      w.brake = Math.max(w.brake, 65);
    }
  } else if (!w.boss && !w.enemies.length) waveClear(w);
}
export function botAction(w, p) {
  // Ordinary action planner: aim at predicted hulls, intercept hazards and choose reachable safe positions.
  const incoming = w.threats
    .filter((t) => t.state !== "warn" && !t.ground && t.life > 0 && t.y > 160)
    .sort((a, b) => b.y - a.y);
  let tx = p.x;
  const danger = incoming.find((t) => Math.abs(t.x - p.x) < 55) || incoming[0];
  if (danger) {
    const time =
      (p.y - 14 - danger.y) / (w.tuning.shotSpeed + Math.max(0, danger.vy));
    tx = bound(danger.x + danger.vx * Math.max(0, time), 42, 598);
  } else if (w.boss) {
    const b = w.boss,
      flight = (p.y - b.y) / w.tuning.shotSpeed;
    tx = 320 + Math.sin((w.hostileTime + flight) * 0.55) * 175;
  } else {
    const foes = w.enemies.filter((f) => f.d >= 0);
    const f = foes.reduce(
      (best, f) =>
        !best ||
        Math.abs(f.x - p.x) + (f.y < 75 ? 120 : 0) <
          Math.abs(best.x - p.x) + (best.y < 75 ? 120 : 0)
          ? f
          : best,
      null,
    );
    if (f) {
      const flight = (p.y - f.y) / w.tuning.shotSpeed;
      tx = f.formed
        ? bound(
            320 +
              Math.sin(
                ((w.hostileTime + flight) * WAVES[w.wave].speed) / 110 +
                  f.group * 1.7,
              ) *
                195 +
              ((f.i % 8) - 3.5) * 19,
            48,
            592,
          )
        : f.x;
    }
  }
  const rollers = w.threats.filter(
    (t) => t.ground || (t.kind === "roller" && t.y > 230),
  );
  for (const r of rollers) {
    const lo = Math.min(r.from, r.to) - 24,
      hi = Math.max(r.from, r.to) + 24;
    if ((tx > lo && tx < hi) || (p.x > lo && p.x < hi))
      tx = Math.abs(p.x - lo) < Math.abs(p.x - hi) ? lo - 5 : hi + 5;
  }
  // Evade committed diamonds below the muzzle; point shots cannot save a cannon then.
  for (const t of incoming)
    if (t.y > 270 && Math.abs(t.x - p.x) < 30)
      tx = p.x + (p.x < t.x ? -70 : 70);
  return {
    move: 0,
    target: bound(tx, ARENA.left, ARENA.right),
    fire: true,
    brake: w.brake >= 100 && incoming.length >= 2 ? 1 : 0,
  };
}
export function worldPacket(w) {
  // Quantized complete revisions fit one reliable Hub message; no decorative traffic.
  return {
    k: "w",
    n: w.tick,
    t: qround(w.time),
    s: w.seed,
    r: w.rng,
    p: w.phase,
    pt: qround(w.phaseTime),
    w: w.wave,
    bp: w.bossPhase,
    sc: w.score,
    b: [qround(w.brake), qround(w.brakeLeft), qround(w.hostileTime)],
    ps: w.players.map((p) => [
      p.id,
      p.seat,
      qround(p.x),
      p.hp,
      qround(p.inv),
      qround(p.vx),
      p.connected ? 1 : 0,
      qround(p.recoil),
      p.kills,
      p.intercepts,
    ]),
    es: w.enemies.map((f) => [
      f.id,
      qround(f.x),
      qround(f.y),
      f.hp,
      f.kind,
      f.d < 0 ? 0 : 1,
      qround(f.a),
      f.max,
    ]),
    ts: w.threats.map((t) => [
      t.id,
      Object.keys(WEAPONS).indexOf(t.kind),
      qround(t.x),
      qround(t.y),
      t.state === "warn" ? 0 : t.ground ? 2 : 1,
      qround(t.warn),
      qround(t.tx),
      qround(t.vx),
      qround(t.vy),
      qround(t.from),
      qround(t.to),
      qround(t.safe),
    ]),
    ss: w.shots.map((s) => [s.id, s.owner, qround(s.x), qround(s.y)]),
    bs: w.boss
      ? [
          w.boss.id,
          qround(w.boss.x),
          qround(w.boss.y),
          w.boss.hp,
          w.boss.max,
          w.boss.open ? 1 : 0,
        ]
      : null,
    ev: w.events
      .slice(-8)
      .map((e) => [
        e.id,
        e.type,
        e.x ?? null,
        e.y ?? null,
        e.kind ?? null,
        e.line ?? null,
        e.owner ?? null,
        e.points ?? null,
      ]),
    o: w.outcome,
    st: w.stats,
    mod: w.modified,
    as: w.assists,
  };
}
export function applyWorldPacket(old, p, roster = []) {
  if (
    !p ||
    p.k !== "w" ||
    !Number.isSafeInteger(p.n) ||
    (old && p.n < old.tick) ||
    !Array.isArray(p.ps) ||
    p.ps.length > 4 ||
    !Array.isArray(p.es) ||
    p.es.length > 64 ||
    !Array.isArray(p.ts) ||
    p.ts.length > 16 ||
    !Array.isArray(p.ss) ||
    p.ss.length > 4 ||
    !Number.isFinite(p.sc)
  )
    return null;
  // Sender is authenticated by each transport. Reject malformed/nonfinite graphs before any renderer sees them.
  const nums = [
    p.n,
    p.t,
    p.w,
    p.bp,
    p.sc,
    ...p.b,
    ...p.ps.flat(),
    ...p.es.flat(),
    ...p.ts.flat(),
    ...p.ss.flat(),
    ...(p.bs || []),
  ];
  if (!nums.every(Number.isFinite)) return null;
  return {
    v: 1,
    seed: p.s,
    rng: p.r,
    tick: p.n,
    time: p.t,
    hostileTime: p.b[2],
    phase: p.p,
    phaseTime: p.pt,
    wave: p.w,
    bossPhase: p.bp,
    score: p.sc,
    brake: p.b[0],
    brakeLeft: p.b[1],
    modified: p.mod,
    assists: p.as,
    stats: p.st,
    outcome: p.o,
    demo: false,
    players: p.ps.map((a) => ({
      id: a[0],
      seat: a[1],
      name: roster.find((r) => r.id === a[0])?.name || "PILOT " + (a[1] + 1),
      x: a[2],
      y: ARENA.lane,
      hp: a[3],
      inv: a[4],
      vx: a[5],
      connected: !!a[6],
      recoil: a[7],
      kills: a[8],
      intercepts: a[9],
    })),
    enemies: p.es.map((a) => ({
      id: a[0],
      x: a[1],
      y: a[2],
      hp: a[3],
      kind: a[4],
      d: a[5] ? 1 : -1,
      a: a[6],
      max: a[7],
    })),
    threats: p.ts.map((a) => ({
      id: a[0],
      kind: Object.keys(WEAPONS)[a[1]],
      x: a[2],
      y: a[3],
      state: a[4] === 0 ? "warn" : a[4] === 2 ? "ground" : "air",
      ground: a[4] === 2,
      warn: a[5],
      tx: a[6],
      vx: a[7],
      vy: a[8],
      from: a[9],
      to: a[10],
      safe: a[11],
      r: 8,
    })),
    shots: p.ss.map((a) => ({ id: a[0], owner: a[1], x: a[2], y: a[3] })),
    boss: p.bs
      ? {
          id: p.bs[0],
          x: p.bs[1],
          y: p.bs[2],
          hp: p.bs[3],
          max: p.bs[4],
          open: !!p.bs[5],
          r: 24,
        }
      : null,
    events: p.ev.map((a) => ({
      id: a[0],
      type: a[1],
      x: a[2],
      y: a[3],
      kind: a[4],
      line: a[5],
      owner: a[6],
      points: a[7],
    })),
  };
}
