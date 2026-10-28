import { characterById } from "./characters.js";
import { lapForProgress, placeKart, pointOnCourse, sampleCourse } from "./courses.js";
import { ITEM_DEFS, SHIELD_ITEMS, makeHeld, rollItem } from "./items.js";
import { neutralAction } from "./input.js";
import { clamp, moveToward, mulberry32, wrapAngle } from "./math.js";

const DRIFT_STAGE_1 = 0.55;
const DRIFT_STAGE_2 = 1.15;
const HOP_TIME = 0.32;
const SHOWCASE = [
  "spark",
  "ricochet",
  "homing",
  "slick",
  "scatter",
  "phantom",
  "triSpark",
  "sparkStorm",
  "aegis",
  "brownout",
  "pilfer",
  "crownseeker",
];

function pushEvent(race, event) {
  race.events.push(event);
  if (race.events.length > 48) race.events.splice(0, race.events.length - 32);
}

function makeKart(entry, index, mode, attract) {
  const stats = characterById(entry.characterId);
  return {
    id: index,
    name: entry.name || stats.name,
    characterId: stats.id,
    stats,
    isPlayer: !!entry.isPlayer,
    playerIndex: entry.isPlayer ? entry.playerIndex : null,
    cpu: !entry.isPlayer,
    cheat: !!attract,
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    speed: 0,
    steer: 0,
    progress: 0,
    lateral: 0,
    displayLap: 1,
    rank: index + 1,
    finished: false,
    finishTime: null,
    eliminated: false,
    balloons: mode === "battle" ? 3 : 0,
    hits: 0,
    offroad: false,
    hopT: 0,
    hopCd: 0,
    hopLatch: false,
    drifting: false,
    driftDir: 0,
    driftCharge: 0,
    driftStage: 0,
    pendingTurbo: 0,
    miniTurboT: 0,
    miniTurboStage: 0,
    boostT: 0,
    stormT: 0,
    stormPulse: 0,
    aegisT: 0,
    brownoutT: 0,
    spinT: 0,
    fooled: false,
    startLatched: false,
    startEarly: false,
    startBoost: false,
    startPenaltyT: 0,
    held: null,
    trailing: false,
    roulette: null,
    useLatch: false,
    itemLock: 0,
    slowT: 0,
    wallLock: 0,
    radius: 0.78 + stats.weight * 0.22,
    cheatItem: 0,
    lapTimes: [],
    lapMark: 0,
    prevLap: 1,
  };
}

function makeBoxes(course, enabled) {
  if (!enabled) return [];
  if (course.kind === "arena") {
    return (course.boxSpots || []).map((spot, id) => ({
      id,
      x: spot.x,
      z: spot.z,
      alive: true,
      timer: 0,
    }));
  }
  return (course.boxSpots || []).map((spot, id) => ({
    id,
    progress: spot.progress,
    lateral: spot.lateral,
    alive: true,
    timer: 0,
  }));
}

export function createRace(options) {
  const course = options.course;
  const mode = options.mode || "cup";
  const attract = !!options.attract;
  const entrants = options.entrants || [];
  const karts = entrants.map((entry, index) => makeKart(entry, index, mode, attract));
  if (course.kind === "arena") {
    karts.forEach((kart, index) => {
      const spawn = course.spawns[index % course.spawns.length];
      kart.x = spawn.x;
      kart.z = spawn.z;
      kart.y = 0;
      kart.heading = spawn.heading;
    });
  } else {
    karts.forEach((kart, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2 === 0 ? -2.35 : 2.35;
      placeKart(course, kart, -8 - row * 3.6, col);
    });
  }
  const itemBoxes = options.itemBoxes !== false && mode !== "trial";
  const race = {
    course,
    mode,
    attract,
    itemBoxes,
    phase: "countdown",
    timeToGo: 3.4,
    countdownLabel: "3",
    goShow: 0,
    clock: 0,
    karts,
    boxes: makeBoxes(course, itemBoxes),
    projectiles: [],
    hazards: [],
    events: [{ type: "countdown", value: 3 }],
    rng: mulberry32(options.seed == null ? 1 : options.seed),
    winner: null,
    order: [],
    conePos: null,
    coneImpulse: null,
  };
  if (mode === "trial" && karts[0]) {
    karts[0].held = makeHeld("triSpark");
  }
  updateRanks(race);
  return race;
}

export function finishOrder(race) {
  return [...race.karts]
    .sort((a, b) => a.rank - b.rank)
    .map((kart) => ({
      id: kart.id,
      name: kart.name,
      rank: kart.rank,
      time: kart.finishTime,
      finished: kart.finished,
      balloons: kart.balloons,
      eliminated: kart.eliminated,
      characterId: kart.characterId,
    }));
}

function hopHeight(kart) {
  if (kart.hopT <= 0) return 0;
  const u = 1 - kart.hopT / HOP_TIME;
  return Math.sin(Math.max(0, Math.min(1, u)) * Math.PI) * 1.15;
}

function projectProgress(course, kart) {
  let best = kart.progress;
  let bestD = Infinity;
  const start = kart.progress - 12;
  const end = kart.progress + 42;
  for (let i = 0; i <= 54; i++) {
    const progress = start + ((end - start) * i) / 54;
    const sample = sampleCourse(course, progress);
    const d = (sample.x - kart.x) ** 2 + (sample.z - kart.z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = progress;
    }
  }
  for (let i = -6; i <= 6; i++) {
    const progress = best + i * 0.3;
    const sample = sampleCourse(course, progress);
    const d = (sample.x - kart.x) ** 2 + (sample.z - kart.z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = progress;
    }
  }
  kart.progress = best;
  return sampleCourse(course, best);
}

function noteLap(race, kart) {
  const next = lapForProgress(kart.progress, race.course.length);
  if (next > kart.prevLap && kart.speed > 1) {
    kart.lapTimes.push(race.clock - kart.lapMark);
    kart.lapMark = race.clock;
    kart.prevLap = next;
  }
  kart.displayLap = kart.finished ? 3 : next;
  if (!kart.finished && kart.progress >= race.course.length * 3 && kart.speed > 1) {
    kart.finished = true;
    kart.finishTime = race.clock;
    kart.displayLap = 3;
    kart.speed = Math.min(kart.speed, kart.stats.top);
    pushEvent(race, { type: "finish", kart: kart.id, time: race.clock });
  }
}

function desiredSpeed(kart, input) {
  let top = kart.stats.top;
  if (kart.cheat) top *= 1.22;
  if (kart.offroad && !kart.cheat) top *= 0.56;
  if (kart.brownoutT > 0) top *= 0.55;
  if (kart.boostT > 0 || kart.miniTurboT > 0) top += 7 + (kart.miniTurboStage || 0) * 2;
  if (kart.startPenaltyT > 0 && kart.boostT <= 0 && kart.miniTurboT <= 0) top *= 0.4;
  if (kart.spinT > 0) return 0;
  if (input.brake && !input.accel && kart.speed <= 3) return -kart.stats.reverse;
  if (input.brake && kart.speed > 3) return input.accel ? top * 0.42 : 0;
  if (input.accel || kart.boostT > 0 || kart.miniTurboT > 0) return Math.abs(top) * Math.sign(top || 1);
  return 0;
}

function updateDrift(kart, input, dt) {
  const hopEdge = !!input.hop && !kart.hopLatch;
  kart.hopLatch = !!input.hop;
  if (kart.spinT > 0) {
    kart.drifting = false;
    return;
  }
  if (hopEdge && kart.hopCd <= 0) {
    kart.hopT = HOP_TIME;
    kart.hopCd = 0.16;
    if (kart.speed > 7 && Math.abs(input.steer) > 0.2) {
      kart.drifting = true;
      kart.driftDir = Math.sign(input.steer);
      kart.driftCharge = 0;
      kart.driftStage = 0;
    }
  }
  if (kart.hopCd > 0) kart.hopCd = Math.max(0, kart.hopCd - dt);
  if (kart.hopT > 0) kart.hopT = Math.max(0, kart.hopT - dt);
  if (!kart.drifting) return;
  const held = !!input.hop && Math.abs(input.steer) > 0.12 && Math.sign(input.steer) === kart.driftDir;
  if (held) {
    kart.driftCharge += dt;
    kart.driftStage = kart.driftCharge >= DRIFT_STAGE_2 ? 2 : kart.driftCharge >= DRIFT_STAGE_1 ? 1 : 0;
    kart.heading += kart.driftDir * kart.stats.handle * 0.5 * dt;
    return;
  }
  if (kart.driftStage >= 1) kart.pendingTurbo = kart.driftStage;
  kart.drifting = false;
  kart.driftCharge = 0;
  kart.driftStage = 0;
}

function applyTurbo(kart) {
  if (!kart.pendingTurbo) return;
  const stage = kart.pendingTurbo;
  kart.pendingTurbo = 0;
  kart.miniTurboStage = stage;
  kart.miniTurboT = 0.42 + stage * 0.22;
  kart.speed += 6 + stage * 3;
  kart.boostT = Math.max(kart.boostT, 0.18);
}

function boxPosition(race, box) {
  if (race.course.kind === "arena") return { x: box.x, y: 0.8, z: box.z };
  return pointOnCourse(race.course, box.progress, box.lateral, 0.85);
}

function finishRoulette(race, kart) {
  const place = kart.roulette.place || kart.rank || 1;
  const kind = rollItem(place, race.karts.length, race.rng);
  kart.held = makeHeld(kind);
  kart.roulette = null;
  kart.trailing = false;
  pushEvent(race, { type: "item", phase: "roll", kind, kart: kart.id });
}

function spawnProjectile(race, kart, kind) {
  const speed = kind === "ricochet" ? 46 : kind === "homing" ? 38 : 36;
  race.projectiles.push({
    kind,
    x: kart.x + Math.sin(kart.heading) * 1.8,
    z: kart.z + Math.cos(kart.heading) * 1.8,
    y: kart.y + 0.5,
    heading: kart.heading,
    speed,
    userId: kart.id,
    life: 6.5,
    bounces: 0,
    progressGuess: kart.progress,
  });
  pushEvent(race, { type: "item", phase: "use", kind, kart: kart.id });
}

function spawnHazard(race, kart, kind, index, forward) {
  const dist = forward ? 2.2 + index * 1.2 : 1.6 + index * 1.25;
  const side = (index - 1) * 0.75;
  const dir = forward ? 1 : -1;
  race.hazards.push({
    kind,
    x: kart.x + Math.sin(kart.heading) * dist * dir + Math.cos(kart.heading) * side,
    z: kart.z + Math.cos(kart.heading) * dist * dir - Math.sin(kart.heading) * side,
    life: kind === "phantom" ? 16 : 14,
    armed: 0.22,
    ownerGrace: 0.7,
    userId: kart.id,
  });
}

function throwHeld(race, kart) {
  const kind = kart.held.kind;
  kart.trailing = false;
  kart.held = null;
  kart.itemLock = 0.45;
  if (ITEM_DEFS[kind].projectile) spawnProjectile(race, kart, kind);
  else spawnHazard(race, kart, kind === "scatter" ? "slick" : kind, 0, true);
}

function inflict(race, victim, attacker, kind) {
  if (!victim || victim.finished || victim.eliminated) return false;
  if (victim.aegisT > 0 && kind !== "aegis-pop") {
    if (attacker && attacker !== victim && attacker.aegisT <= 0) inflict(race, attacker, victim, "aegis-pop");
    return false;
  }
  if (victim.trailing && victim.held && SHIELD_ITEMS.includes(victim.held.kind) && kind !== "shield" && kind !== "aegis-pop") {
    victim.trailing = false;
    victim.held = null;
    pushEvent(race, { type: "impact", x: victim.x, z: victim.z, kind: "shield" });
    return false;
  }
  const spin = kind === "phantom" ? 1.35 : kind === "crownseeker" ? 1.25 : kind === "aegis-pop" ? 0.95 : 0.78;
  victim.spinT = Math.max(victim.spinT, spin);
  victim.speed *= 0.22;
  victim.drifting = false;
  victim.pendingTurbo = 0;
  if (kind === "phantom") victim.fooled = true;
  if (kind === "crownseeker") {
    victim.held = null;
    victim.roulette = null;
    victim.trailing = false;
  }
  if (race.mode === "battle" && kind !== "shield") {
    if (victim.balloons > 0) victim.balloons -= 1;
    if (victim.balloons <= 0) {
      victim.eliminated = true;
      victim.speed = 0;
    }
  }
  if (attacker && attacker !== victim) attacker.hits += 1;
  pushEvent(race, { type: "impact", x: victim.x, z: victim.z, kind });
  return true;
}

function useHeld(race, kart, input) {
  if (!kart.held || kart.spinT > 0) return;
  const kind = kart.held.kind;
  const shield = SHIELD_ITEMS.includes(kind);
  if (kart.trailing && shield) {
    if (!input.brake) throwHeld(race, kart);
    return;
  }
  if (shield && input.brake) {
    kart.trailing = true;
    kart.itemLock = 0.25;
    pushEvent(race, { type: "item", phase: "trail", kind, kart: kart.id });
    return;
  }
  if (kind === "spark" || kind === "triSpark") {
    kart.boostT = Math.max(kart.boostT, 0.62);
    kart.speed = Math.max(kart.speed, kart.stats.top + 6.5);
    kart.held.charges -= 1;
    if (kart.held.charges <= 0) kart.held = null;
    kart.itemLock = 0.28;
    pushEvent(race, { type: "item", phase: "use", kind, kart: kart.id });
    return;
  }
  if (kind === "sparkStorm") {
    kart.stormT = 3.4;
    kart.stormPulse = 0;
    kart.held = null;
    kart.itemLock = 0.4;
    pushEvent(race, { type: "item", phase: "use", kind, kart: kart.id });
    return;
  }
  if (kind === "aegis") {
    kart.aegisT = 2.8;
    kart.held = null;
    kart.itemLock = 0.4;
    pushEvent(race, { type: "item", phase: "use", kind, kart: kart.id });
    return;
  }
  if (kind === "brownout") {
    for (const other of race.karts) {
      if (other !== kart && !other.finished && !other.eliminated) other.brownoutT = Math.max(other.brownoutT, 3.6);
    }
    kart.held = null;
    kart.itemLock = 0.4;
    pushEvent(race, { type: "item", phase: "use", kind, kart: kart.id });
    return;
  }
  if (kind === "pilfer") {
    const target = kartAhead(race, kart) || race.karts.find((other) => other !== kart && other.held && !other.eliminated);
    if (target && target.held) {
      const stolen = { kind: target.held.kind, charges: target.held.charges };
      target.held = null;
      target.trailing = false;
      target.roulette = null;
      kart.held = stolen;
      pushEvent(race, { type: "item", phase: "use", kind, kart: kart.id });
    } else {
      if (target) inflict(race, target, kart, "pilfer");
      kart.held = null;
      pushEvent(race, { type: "item", phase: "use", kind, kart: kart.id });
    }
    kart.itemLock = 0.45;
    return;
  }
  if (kind === "scatter") {
    for (let i = 0; i < 3; i++) spawnHazard(race, kart, "slick", i, false);
    kart.held = null;
    kart.itemLock = 0.4;
    pushEvent(race, { type: "item", phase: "use", kind, kart: kart.id });
    return;
  }
  if (kind === "slick" || kind === "phantom") {
    spawnHazard(race, kart, kind, 0, false);
    kart.held = null;
    kart.itemLock = 0.35;
    pushEvent(race, { type: "item", phase: "use", kind, kart: kart.id });
    return;
  }
  if (ITEM_DEFS[kind] && ITEM_DEFS[kind].projectile) {
    spawnProjectile(race, kart, kind);
    kart.held = null;
    kart.itemLock = 0.35;
  }
}

function kartAhead(race, kart) {
  let best = null;
  let bestGap = Infinity;
  for (const other of race.karts) {
    if (other === kart || other.finished || other.eliminated) continue;
    const gap = other.progress - kart.progress;
    const near = Math.hypot(other.x - kart.x, other.z - kart.z);
    const score = race.course.kind === "arena" ? near : gap >= -2 ? gap : Infinity;
    if (score < bestGap && score < (race.course.kind === "arena" ? 40 : 80)) {
      bestGap = score;
      best = other;
    }
  }
  return best;
}

function cpuInput(race, kart) {
  const input = neutralAction();
  if (kart.spinT > 0 || kart.eliminated || kart.finished) return input;
  input.accel = true;
  if (race.course.kind === "circuit") {
    const look = 10 + Math.max(0, kart.speed) * 0.35;
    const sample = sampleCourse(race.course, kart.progress + look);
    const desired = Math.atan2(sample.x - kart.x, sample.z - kart.z);
    const diff = wrapAngle(desired - kart.heading);
    input.steer = clamp(diff / 0.55, -1, 1);
    if (Math.abs(diff) > 1.05 && kart.speed > 16) input.brake = true;
    if (!kart.drifting && Math.abs(input.steer) > 0.78 && kart.speed > 12 && kart.hopCd <= 0) input.hop = true;
    if (kart.drifting) {
      input.steer = kart.driftDir || input.steer;
      input.hop = kart.driftStage < 2;
      input.brake = false;
    }
  } else {
    const target = race.karts.find((other) => other !== kart && !other.eliminated) || kart;
    const desired = Math.atan2(target.x - kart.x, target.z - kart.z);
    input.steer = clamp(wrapAngle(desired - kart.heading) / 0.6, -1, 1);
  }
  if (kart.itemLock > 0 || kart.roulette) input.useItem = false;
  else if (kart.held) {
    const def = ITEM_DEFS[kart.held.kind];
    if (def && def.shield && kart.cheat && kart.cheatItem % 2 === 0 && !kart.trailing) input.brake = true;
    input.useItem = true;
  }
  return input;
}

function stepKart(race, kart, input, dt) {
  if (kart.itemLock > 0) kart.itemLock = Math.max(0, kart.itemLock - dt);
  if (kart.boostT > 0) kart.boostT = Math.max(0, kart.boostT - dt);
  if (kart.miniTurboT > 0) kart.miniTurboT = Math.max(0, kart.miniTurboT - dt);
  if (kart.aegisT > 0) kart.aegisT = Math.max(0, kart.aegisT - dt);
  if (kart.brownoutT > 0) kart.brownoutT = Math.max(0, kart.brownoutT - dt);
  if (kart.startPenaltyT > 0) kart.startPenaltyT = Math.max(0, kart.startPenaltyT - dt);
  if (kart.spinT > 0) kart.spinT = Math.max(0, kart.spinT - dt);
  if (kart.fooled && kart.spinT <= 0) kart.fooled = false;
  if (kart.stormT > 0) {
    kart.stormT = Math.max(0, kart.stormT - dt);
    kart.stormPulse -= dt;
    if (kart.stormPulse <= 0) {
      kart.boostT = Math.max(kart.boostT, 0.32);
      kart.speed = Math.max(kart.speed, kart.stats.top + 6);
      kart.stormPulse = 0.42;
      pushEvent(race, { type: "item", phase: "pulse", kind: "sparkStorm", kart: kart.id });
    }
  }

  if (kart.cheat && !kart.held && !kart.roulette && kart.itemLock <= 0 && kart.spinT <= 0) {
    const kind = SHOWCASE[kart.cheatItem % SHOWCASE.length];
    kart.cheatItem += 1;
    kart.held = makeHeld(kind);
    kart.itemLock = 0.15;
  }

  const useEdge = !!input.useItem && !kart.useLatch;
  kart.useLatch = !!input.useItem;
  if (kart.roulette) {
    kart.roulette.t += dt;
    const cpuStop = kart.cpu && kart.roulette.t >= (kart.cheat ? 0.22 : 0.5);
    if (useEdge || kart.roulette.t >= kart.roulette.max || cpuStop) finishRoulette(race, kart);
  } else if (useEdge) {
    useHeld(race, kart, input);
  }

  if (kart.spinT > 0) {
    kart.heading += dt * 9;
    kart.drifting = false;
    kart.speed = moveToward(kart.speed, 0, 18 * dt);
  } else {
    updateDrift(kart, input, dt);
    if (!kart.drifting) {
      const reverse = kart.speed < -0.5 ? -1 : 1;
      const grip = kart.offroad && !kart.cheat ? 0.62 : 1;
      const control = kart.brownoutT > 0 ? 0.68 : 1;
      kart.heading += (input.steer || 0) * kart.stats.handle * grip * control * reverse * dt;
    }
    const target = desiredSpeed(kart, kart.spinT > 0 ? neutralAction() : input);
    let rate = target > kart.speed ? kart.stats.accel : input.brake ? kart.stats.brake : 7;
    if (kart.startPenaltyT > 0 && target >= 0) rate *= 0.35;
    if (kart.boostT > 0 || kart.miniTurboT > 0) rate = Math.max(rate, 34);
    kart.speed = moveToward(kart.speed, target, rate * dt);
  }

  kart.steer = input.steer || 0;
  kart.x += Math.sin(kart.heading) * kart.speed * dt;
  kart.z += Math.cos(kart.heading) * kart.speed * dt;

  if (race.course.kind === "circuit") {
    const sample = projectProgress(race.course, kart);
    kart.lateral = (kart.x - sample.x) * sample.right.x + (kart.z - sample.z) * sample.right.z;
    kart.y = sample.y + hopHeight(kart);
    kart.offroad = Math.abs(kart.lateral) > race.course.roadHalf;
    noteLap(race, kart);
    if (kart.cpu && !kart.cheat && kart.speed < 2 && kart.spinT <= 0 && input.accel) {
      kart.slowT += dt;
      if (kart.slowT > 1.4) {
        const ahead = sampleCourse(race.course, kart.progress + 8);
        kart.heading = Math.atan2(ahead.x - kart.x, ahead.z - kart.z);
        kart.speed = 10;
        kart.slowT = 0;
      }
    } else kart.slowT = 0;
  } else {
    kart.y = hopHeight(kart);
    kart.offroad = false;
    kart.displayLap = 1;
  }
}

function resolveCircuitWalls(race, dt) {
  for (const kart of race.karts) {
    if (kart.finished || kart.eliminated) continue;
    const sample = projectProgress(race.course, kart);
    const lateral = (kart.x - sample.x) * sample.right.x + (kart.z - sample.z) * sample.right.z;
    kart.lateral = lateral;
    const limit = race.course.wallHalf;
    if (Math.abs(lateral) > limit && !kart.cheat) {
      const sign = Math.sign(lateral) || 1;
      const excess = Math.abs(lateral) - limit;
      kart.x -= sample.right.x * sign * excess;
      kart.z -= sample.right.z * sign * excess;
      kart.lateral = sign * limit;
      kart.speed *= 0.72;
      kart.heading -= sign * 0.35;
      if (!kart.wallLock) {
        kart.wallLock = 0.4;
        pushEvent(race, { type: "impact", x: kart.x, z: kart.z, kind: "wall" });
      }
    }
    if (kart.wallLock > 0) kart.wallLock = Math.max(0, kart.wallLock - dt);
    kart.offroad = Math.abs(kart.lateral) > race.course.roadHalf;
    kart.y = sample.y + hopHeight(kart);
    noteLap(race, kart);
  }
}

function pushOutOfBox(kart, box) {
  const dx = kart.x - box.x;
  const dz = kart.z - box.z;
  const hitX = Math.abs(dx) < box.hx + kart.radius;
  const hitZ = Math.abs(dz) < box.hz + kart.radius;
  if (!hitX || !hitZ) return false;
  const penX = box.hx + kart.radius - Math.abs(dx);
  const penZ = box.hz + kart.radius - Math.abs(dz);
  if (penX < penZ) kart.x += Math.sign(dx || 1) * penX;
  else kart.z += Math.sign(dz || 1) * penZ;
  kart.speed *= 0.74;
  return true;
}

function resolveArena(race) {
  const limitX = race.course.width / 2 - 1.2;
  const limitZ = race.course.depth / 2 - 1.2;
  for (const kart of race.karts) {
    if (kart.eliminated) continue;
    let hit = false;
    if (Math.abs(kart.x) > limitX) {
      kart.x = Math.sign(kart.x) * limitX;
      hit = true;
    }
    if (Math.abs(kart.z) > limitZ) {
      kart.z = Math.sign(kart.z) * limitZ;
      hit = true;
    }
    for (const obstacle of race.course.obstacles) {
      if (obstacle.type === "cyl") {
        const dx = kart.x - obstacle.x;
        const dz = kart.z - obstacle.z;
        const dist = Math.hypot(dx, dz) || 0.0001;
        const min = obstacle.r + kart.radius;
        if (dist < min) {
          kart.x = obstacle.x + (dx / dist) * min;
          kart.z = obstacle.z + (dz / dist) * min;
          hit = true;
        }
      } else if (pushOutOfBox(kart, obstacle)) hit = true;
    }
    if (hit && !kart.cheat) {
      kart.speed *= 0.78;
      pushEvent(race, { type: "impact", x: kart.x, z: kart.z, kind: "wall" });
    }
    kart.y = hopHeight(kart);
  }
}

function resolveKarts(race) {
  const karts = race.karts.filter((kart) => !kart.finished && !kart.eliminated);
  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i];
      const b = karts[j];
      let dx = b.x - a.x;
      let dz = b.z - a.z;
      let dist = Math.hypot(dx, dz);
      const min = a.radius + b.radius;
      if (dist >= min) continue;
      if (dist < 1e-4) {
        dx = 1;
        dz = 0;
        dist = 1e-4;
      }
      const nx = dx / dist;
      const nz = dz / dist;
      const overlap = min - dist;
      const shareA = b.stats.weight / (a.stats.weight + b.stats.weight);
      const shareB = a.stats.weight / (a.stats.weight + b.stats.weight);
      a.x -= nx * overlap * shareA;
      a.z -= nz * overlap * shareA;
      b.x += nx * overlap * shareB;
      b.z += nz * overlap * shareB;
      a.speed -= 1.4 * shareA;
      b.speed -= 1.4 * shareB;
      if (a.aegisT > 0 && b.aegisT <= 0) inflict(race, b, a, "aegis-pop");
      else if (b.aegisT > 0 && a.aegisT <= 0) inflict(race, a, b, "aegis-pop");
      pushEvent(race, { type: "impact", x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, kind: "bump" });
    }
  }
}

function resolveCone(race) {
  if (!race.conePos) return;
  const cx = race.conePos.x;
  const cz = race.conePos.z;
  for (const kart of race.karts) {
    if (kart.finished || kart.eliminated) continue;
    const dx = kart.x - cx;
    const dz = kart.z - cz;
    const dist = Math.hypot(dx, dz) || 0.0001;
    const min = kart.radius + 0.7;
    if (dist >= min) continue;
    const nx = dx / dist;
    const nz = dz / dist;
    kart.x += nx * (min - dist);
    kart.z += nz * (min - dist);
    kart.speed *= 0.86;
    race.coneImpulse = { x: -nx * 8, y: 2, z: -nz * 8 };
    pushEvent(race, { type: "impact", x: cx, z: cz, kind: "cone" });
  }
}

function reflectHeading(heading, nx, nz) {
  const vx = Math.sin(heading);
  const vz = Math.cos(heading);
  const dot = vx * nx + vz * nz;
  return Math.atan2(vx - 2 * dot * nx, vz - 2 * dot * nz);
}

function bounceProjectile(race, projectile) {
  if (race.course.kind === "arena") {
    const limitX = race.course.width / 2 - 0.6;
    const limitZ = race.course.depth / 2 - 0.6;
    if (Math.abs(projectile.x) > limitX && projectile.kind === "ricochet") {
      projectile.x = Math.sign(projectile.x) * limitX;
      projectile.heading = reflectHeading(projectile.heading, Math.sign(projectile.x), 0);
      projectile.bounces += 1;
    }
    if (Math.abs(projectile.z) > limitZ && projectile.kind === "ricochet") {
      projectile.z = Math.sign(projectile.z) * limitZ;
      projectile.heading = reflectHeading(projectile.heading, 0, Math.sign(projectile.z));
      projectile.bounces += 1;
    }
    return;
  }
  if (projectile.kind !== "ricochet") return;
  let best = projectile.progressGuess || 0;
  let bestD = Infinity;
  for (let i = -10; i <= 24; i++) {
    const progress = (projectile.progressGuess || 0) + i;
    const guess = sampleCourse(race.course, progress);
    const d = (guess.x - projectile.x) ** 2 + (guess.z - projectile.z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = progress;
    }
  }
  projectile.progressGuess = best;
  const near = sampleCourse(race.course, best);
  const lateral = (projectile.x - near.x) * near.right.x + (projectile.z - near.z) * near.right.z;
  if (Math.abs(lateral) > race.course.wallHalf - 0.3) {
    const sign = Math.sign(lateral) || 1;
    projectile.heading = reflectHeading(projectile.heading, near.right.x * sign, near.right.z * sign);
    projectile.x = near.x + near.right.x * sign * (race.course.wallHalf - 0.6);
    projectile.z = near.z + near.right.z * sign * (race.course.wallHalf - 0.6);
    projectile.bounces += 1;
  }
}

function projectileTarget(race, projectile) {
  const user = race.karts[projectile.userId];
  if (projectile.kind === "crownseeker") {
    const ranked = [...race.karts].filter((kart) => !kart.finished && !kart.eliminated).sort((a, b) => a.rank - b.rank);
    const leader = ranked[0];
    if (leader && leader !== user) return leader;
    return ranked[1] || null;
  }
  let best = null;
  let bestScore = Infinity;
  for (const kart of race.karts) {
    if (kart === user || kart.finished || kart.eliminated) continue;
    const ahead = race.course.kind === "circuit" ? kart.progress >= (user ? user.progress - 2 : 0) : true;
    if (!ahead && projectile.kind === "homing") continue;
    const dist = Math.hypot(kart.x - projectile.x, kart.z - projectile.z);
    if (dist < bestScore) {
      bestScore = dist;
      best = kart;
    }
  }
  return best;
}

function stepProjectiles(race, dt) {
  for (const projectile of race.projectiles) {
    if (projectile.kind === "homing" || projectile.kind === "crownseeker") {
      const target = projectileTarget(race, projectile);
      if (target) {
        const desired = Math.atan2(target.x - projectile.x, target.z - projectile.z);
        const diff = wrapAngle(desired - projectile.heading);
        const turn = (projectile.kind === "crownseeker" ? 2.6 : 3.4) * dt;
        projectile.heading += clamp(diff, -turn, turn);
      }
    }
    projectile.x += Math.sin(projectile.heading) * projectile.speed * dt;
    projectile.z += Math.cos(projectile.heading) * projectile.speed * dt;
    projectile.life -= dt;
    bounceProjectile(race, projectile);
    if (projectile.life <= 0 || projectile.bounces > 5) {
      projectile.life = -1;
      continue;
    }
    for (const kart of race.karts) {
      if (kart.id === projectile.userId || kart.finished || kart.eliminated) continue;
      if (Math.hypot(kart.x - projectile.x, kart.z - projectile.z) < kart.radius + 0.48) {
        inflict(race, kart, race.karts[projectile.userId], projectile.kind);
        projectile.life = -1;
        break;
      }
    }
  }
  race.projectiles = race.projectiles.filter((projectile) => projectile.life > 0);
}

function stepHazards(race, dt) {
  for (const hazard of race.hazards) {
    hazard.life -= dt;
    hazard.armed -= dt;
    hazard.ownerGrace -= dt;
    if (hazard.armed > 0) continue;
    for (const kart of race.karts) {
      if (kart.finished || kart.eliminated) continue;
      if (kart.id === hazard.userId && hazard.ownerGrace > 0) continue;
      if (Math.hypot(kart.x - hazard.x, kart.z - hazard.z) < kart.radius + 0.55) {
        inflict(race, kart, race.karts[hazard.userId], hazard.kind === "phantom" ? "phantom" : "slick");
        hazard.life = -1;
        break;
      }
    }
  }
  race.hazards = race.hazards.filter((hazard) => hazard.life > 0);
}

function stepShields(race) {
  for (const kart of race.karts) {
    if (!kart.trailing || !kart.held || kart.finished) continue;
    const x = kart.x - Math.sin(kart.heading) * 1.7;
    const z = kart.z - Math.cos(kart.heading) * 1.7;
    for (const other of race.karts) {
      if (other === kart || other.finished || other.eliminated) continue;
      if (Math.hypot(other.x - x, other.z - z) < other.radius + 0.45) {
        inflict(race, other, kart, kart.held.kind === "slick" ? "slick" : "ricochet");
        kart.trailing = false;
        kart.held = null;
        break;
      }
    }
  }
}

function stepBoxes(race, dt) {
  for (const box of race.boxes) {
    if (!box.alive) {
      box.timer -= dt;
      if (box.timer <= 0) {
        box.alive = true;
        box.timer = 0;
      }
    }
  }
  for (const kart of race.karts) {
    if (kart.finished || kart.eliminated || kart.held || kart.roulette || kart.trailing) continue;
    for (const box of race.boxes) {
      if (!box.alive) continue;
      const pos = boxPosition(race, box);
      if (Math.hypot(kart.x - pos.x, kart.z - pos.z) < 2.35) {
        box.alive = false;
        box.timer = 5;
        kart.roulette = { t: 0, max: 1.7, place: kart.rank, result: null };
        pushEvent(race, { type: "item", phase: "pickup", kart: kart.id });
        break;
      }
    }
  }
}

function updateRanks(race) {
  const order = [...race.karts];
  if (race.mode === "battle") {
    order.sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
      if (b.balloons !== a.balloons) return b.balloons - a.balloons;
      return b.hits - a.hits;
    });
  } else {
    order.sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
  }
  order.forEach((kart, index) => {
    kart.rank = index + 1;
  });
  race.order = order.map((kart) => kart.id);
}

function checkEnd(race) {
  if (race.phase !== "racing") return;
  if (race.mode === "battle") {
    const alive = race.karts.filter((kart) => !kart.eliminated);
    if (alive.length <= 1) {
      race.phase = "finished";
      race.winner = alive[0] || null;
    }
    return;
  }
  if (race.attract && (race.karts.some((kart) => kart.finished) || race.clock > 150)) {
    race.phase = "finished";
    return;
  }
  const humans = race.karts.filter((kart) => kart.isPlayer);
  if (humans.length > 0 && humans.every((kart) => kart.finished)) race.phase = "finished";
  else if (race.karts.every((kart) => kart.finished)) race.phase = "finished";
}

function stepCountdown(race, inputs, dt) {
  const previous = race.countdownLabel;
  race.timeToGo -= dt;
  const window = 0.35;
  race.karts.forEach((kart, index) => {
    if (kart.cpu) return;
    const input = (inputs && inputs[index]) || neutralAction();
    if (input.accel && !kart.startLatched && race.timeToGo > 0) {
      kart.startLatched = true;
      if (race.timeToGo > window) kart.startEarly = true;
      else kart.startBoost = true;
    }
  });
  const label = race.timeToGo > 2 ? "3" : race.timeToGo > 1 ? "2" : race.timeToGo > 0 ? "1" : "GO";
  if (label !== previous && label !== "GO") {
    race.countdownLabel = label;
    pushEvent(race, { type: "countdown", value: Number(label) });
  }
  if (race.timeToGo > 0) return;
  race.phase = "racing";
  race.countdownLabel = "GO";
  race.goShow = 0.9;
  pushEvent(race, { type: "countdown", value: 0 });
  for (const kart of race.karts) {
    if ((kart.cpu || kart.cheat) && !kart.startEarly) kart.speed = kart.stats.top * (kart.cheat ? 0.95 : 0.35);
    if (kart.cheat) kart.boostT = Math.max(kart.boostT, 1);
    if (kart.startBoost) {
      kart.boostT = Math.max(kart.boostT, 0.8);
      kart.speed = Math.max(kart.speed, kart.stats.top * 0.9);
    } else if (kart.startEarly) {
      kart.startPenaltyT = 1.2;
      kart.speed = 0;
    }
  }
}

function stepFixed(race, inputs, dt) {
  if (race.phase === "countdown") {
    stepCountdown(race, inputs, dt);
    return;
  }
  if (race.phase !== "racing") return;
  race.clock += dt;
  if (race.goShow > 0) race.goShow = Math.max(0, race.goShow - dt);
  race.karts.forEach((kart, index) => {
    if (kart.finished || kart.eliminated) return;
    const provided = inputs && inputs[index] ? inputs[index] : null;
    const input = kart.cpu ? cpuInput(race, kart) : provided || neutralAction();
    stepKart(race, kart, input, dt);
  });
  if (race.course.kind === "circuit") resolveCircuitWalls(race, dt);
  else resolveArena(race);
  resolveKarts(race);
  resolveCone(race);
  for (const kart of race.karts) applyTurbo(kart);
  stepShields(race);
  stepProjectiles(race, dt);
  stepHazards(race, dt);
  stepBoxes(race, dt);
  updateRanks(race);
  checkEnd(race);
}

export function stepRace(race, inputs, dt) {
  let left = Math.max(0, Math.min(dt, 8));
  const slice = 1 / 60;
  if (left === 0) return race;
  while (left > 0.000001) {
    const h = Math.min(slice, left);
    stepFixed(race, inputs, h);
    left -= h;
  }
  return race;
}

export function boxWorldPosition(race, box) {
  return boxPosition(race, box);
}
