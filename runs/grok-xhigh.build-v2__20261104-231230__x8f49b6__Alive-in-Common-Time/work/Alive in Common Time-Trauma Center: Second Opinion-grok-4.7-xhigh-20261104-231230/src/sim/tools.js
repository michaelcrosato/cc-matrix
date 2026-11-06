import { award } from './scoring.js';
import { DT, IV, angDiff, dist, distPointSeg, overTray, polyLen, projectPoly, segHit } from './field.js';

const CELL = 0.04;

function rising(seat, key) {
  return !!seat.cmd[key] && !seat.prev[key];
}

function toolPower(sim) {
  let m = sim.mods.tool;
  if (sim.sforzandoT > 0) m *= sim.tuning.sforzandoToolMult;
  return m;
}

function onBeat(sim, window) {
  const bpm = Math.max(20, sim.beat.bpm);
  const beatDur = 60 / bpm;
  const since = sim.beat.phase * beatDur;
  const until = (1 - sim.beat.phase) * beatDur;
  return Math.min(since, until) <= window;
}

function gradeBand(mean, tol) {
  if (mean <= 0.35 * tol) return 'FLAWLESS';
  if (mean <= 0.7 * tol) return 'CLEAN';
  return 'ROUGH';
}

export function moveSeat(sim, seat, dt) {
  const f = seat.cmd;
  const tun = sim.tuning;
  const prevX = seat.x;
  const prevY = seat.y;
  let x = seat.x;
  let y = seat.y;
  const steady = !!f.steady;
  const held = sim.entities.find((e) => e.alive && e.holder === seat.id && e.embedded);
  if (f.source === 'abs') {
    const tx = Number.isFinite(f.x) ? f.x : x;
    const ty = Number.isFinite(f.y) ? f.y : y;
    if (held) {
      const dx = tx - x;
      const dy = ty - y;
      const mag = Math.hypot(dx, dy);
      const max = 4 * dt;
      if (mag > max && mag > 0) {
        x += (dx / mag) * max;
        y += (dy / mag) * max;
      } else {
        x = tx;
        y = ty;
      }
    } else {
      x = tx;
      y = ty;
      const gate = nearestGate(sim, seat, x, y);
      if (gate && dist(x, y, gate.x, gate.y) < 0.12) {
        x += (gate.x - x) * 0.1 * dt * 12;
        y += (gate.y - y) * 0.1 * dt * 12;
      }
    }
  } else {
    const sx = f.x || 0;
    const sy = f.y || 0;
    const mag = Math.hypot(sx, sy);
    if (mag > 0.12) {
      const sm = Math.min(1, mag);
      const speed = tun.tipSpeed * sm ** tun.stickCurve * (steady ? tun.steadyFactor : 1);
      x += (sx / mag) * speed * dt;
      y += (sy / mag) * speed * dt;
    }
    if (tun.aimAssist > 0) {
      const g = nearestGuide(sim, x, y, seat);
      if (g && dist(x, y, g.x, g.y) < 0.12) {
        const pull = tun.aimAssist * dt * 12;
        x += (g.x - x) * pull;
        y += (g.y - y) * pull;
      }
    }
  }
  [seat.x, seat.y] = sim.clampTip(x, y);
  seat.vx = (seat.x - prevX) / dt;
  seat.vy = (seat.y - prevY) / dt;
  seat.speed = Math.hypot(seat.vx, seat.vy);
  seat.prevX = prevX;
  seat.prevY = prevY;
}

function nearestGuide(sim, x, y, seat) {
  let best = null;
  let bestD = 0.12;
  for (const e of sim.entities) {
    if (!e.alive || e.site !== seat.site || e.covered) continue;
    let p = null;
    if (e.kind === 'incision' && !e.done) p = pointAt(e, e.along || 0);
    else if (e.kind === 'wound' && !e.done) p = e.gates[e.gate] || null;
    else if (e.kind === 'circleCut' && !e.done && e.points) p = pointAt(e, e.along || 0);
    if (!p) continue;
    const d = dist(x, y, p.x, p.y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

function nearestGate(sim, seat, x, y) {
  let best = null;
  let bestD = 1e9;
  for (const e of sim.entities) {
    if (!e.alive || e.kind !== 'wound' || e.done || e.site !== seat.site) continue;
    const g = e.gates[e.gate];
    if (!g) continue;
    const d = dist(x, y, g.x, g.y);
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  return bestD < 0.2 ? best : null;
}

function pointAt(e, along) {
  const pts = e.points;
  let left = along;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    const len = Math.hypot(dx, dy) || 1e-9;
    if (left <= len) return { x: pts[i - 1][0] + dx * (left / len), y: pts[i - 1][1] + dy * (left / len) };
    left -= len;
  }
  const last = pts[pts.length - 1];
  return { x: last[0], y: last[1] };
}

function blocked(e) {
  return e.hidden && !e.marked;
}

export function stepTools(sim, dt) {
  for (const seat of sim.seats) {
    if (seat.out) continue;
    const f = seat.cmd;
    if (f.tool && f.tool !== seat.tool) {
      seat.tool = f.tool;
      sim.events.push({ type: 'tool', seat: seat.id, tool: seat.tool });
    }
    const use = Math.max(0, Math.min(1, f.use || 0));
    seat.use = use;
    seat.steady = !!f.steady;
    if (rising(seat, 'swap')) sim.swapLead(seat);
    if (Number.isInteger(f.site)) sim.setSite(seat, f.site);
    if (f.siteDelta) sim.nudgeSite(seat, f.siteDelta);
    if (rising(seat, 'special')) tryGift(sim, seat);
    if (rising(seat, 'alt')) doAlt(sim, seat);
    stepSyringe(sim, seat, dt);
    stepDefib(sim, seat, dt);
    const power = toolPower(sim);
    if (sim.hushPhase !== 'inhale') {
      switch (seat.tool) {
        case 'scalpel': stepScalpel(sim, seat, dt, use); break;
        case 'forceps': stepForceps(sim, seat, dt, use); break;
        case 'suction': stepSuction(sim, seat, dt, use, power); break;
        case 'gel': stepGel(sim, seat, dt, use, power); break;
        case 'suture': stepSuture(sim, seat, dt, use); break;
        case 'laser': stepLaser(sim, seat, dt, use, power); break;
        case 'scanner': stepScanner(sim, seat, dt, use); break;
        case 'clamp': stepClamp(sim, seat, use); break;
        default: break;
      }
    }
    seat.prev = {
      alt: !!f.alt, syringe: !!f.syringe, special: !!f.special, swap: !!f.swap,
      use: use > 0.4, steady: !!f.steady,
    };
  }
}

function tryGift(sim, seat) {
  if (seat.composure < 100) return;
  seat.composure = 0;
  const gift = sim.giftFor(seat);
  if (gift === 'hush') {
    sim.hushPhase = 'inhale';
    sim.hushT = 0.4;
    sim.hushSeat = seat.id;
    sim.events.push({ type: 'hush', phase: 'inhale', seat: seat.id });
  } else {
    sim.sforzandoT = sim.tuning.sforzandoDuration;
    sim.events.push({ type: 'sforzando', seat: seat.id });
    for (const e of sim.entities) {
      if (!e.alive || !e.strain) continue;
      e.stunned = Math.max(e.stunned || 0, sim.tuning.sforzandoStun);
      if (e.hp > 0) e.hp = Math.max(1, e.hp * (1 - sim.tuning.sforzandoDamage));
    }
  }
}

function doAlt(sim, seat) {
  const held = sim.entities.find((e) => e.alive && e.holder === seat.id);
  if (held) {
    releaseItem(sim, seat, held);
    return;
  }
  const clamp = nearestKind(sim, seat, 'bleeder', 0.12, (e) => e.clamped);
  if (clamp) {
    clamp.clamped = false;
    sim.clampsUsed = Math.max(0, sim.clampsUsed - 1);
    sim.events.push({ type: 'unclamp', id: clamp.id });
    return;
  }
  for (const e of sim.entities) {
    if (e.alive && e.kind === 'wound' && e.site === seat.site && e.readyTie) tieWound(sim, seat, e, true);
  }
}

function nearestKind(sim, seat, kind, r, pred) {
  let best = null;
  let bestD = r;
  for (const e of sim.entities) {
    if (!e.alive || e.kind !== kind || e.site !== seat.site) continue;
    if (pred && !pred(e)) continue;
    const d = dist(seat.x, seat.y, e.x, e.y);
    if (d <= bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function stepSyringe(sim, seat, dt) {
  const held = !!seat.cmd.syringe;
  if (!held) {
    seat.syringeHold = 0;
    return;
  }
  seat.syringeHold += dt;
  const site = nearestKind(sim, seat, 'injection', 0.14, (e) => !e.done && !blocked(e));
  if (site) {
    if (seat.syringeHold >= 0.8) {
      site.done = true;
      site.alive = false;
      sim.injected = (sim.injected || 0) + 1;
      const grade = onBeat(sim, sim.tuning.clampWindow) ? 'FLAWLESS' : 'CLEAN';
      award(sim, seat, grade, site.x, site.y, 'inject');
      seat.stats.Saves += 1;
      seat.syringeHold = 0;
      sim.events.push({ type: 'inject', id: site.id });
      if (sim.phase?.id === 'dip') sim.flags.stabilized = true;
    }
    return;
  }
  if (seat.syringeCd > 0) return;
  if (seat.syringeHold >= 0.5 && dist(seat.x, seat.y, IV.x, IV.y) < 0.35) {
    sim.vitals = Math.min(100, sim.vitals + sim.tuning.stabilizerHeal);
    seat.syringeCd = sim.tuning.stabilizerCooldown;
    seat.syringeHold = 0;
    seat.stats.Saves += 1;
    sim.flags.stabilized = true;
    sim.events.push({ type: 'stabilize', seat: seat.id, vitals: sim.vitals });
    award(sim, seat, 'CLEAN', IV.x, IV.y, 'stabilize');
  }
}

function stepDefib(sim, seat, dt) {
  if (!sim.arrest) {
    seat.charge = 0;
    seat.charging = false;
    return;
  }
  const holding = !!seat.steady && seat.use > 0.5;
  if (holding) {
    seat.charging = true;
    seat.charge += dt;
    const half = sim.tuning.defibWindow / 2;
    if (seat.charge > 1.2 + half) releaseShock(sim, seat, false);
    return;
  }
  if (seat.charging) releaseShock(sim, seat, true);
}

function releaseShock(sim, seat, voluntary) {
  const charge = seat.charge;
  seat.charge = 0;
  seat.charging = false;
  if (!sim.arrest) return;
  const half = sim.tuning.defibWindow / 2;
  const perfect = voluntary && Math.abs(charge - 1.2) <= half;
  const eye = sim.entities.find((e) => e.alive && e.kind === 'fermata' && e.eye);
  if (eye && eye.hp > 0 && !sim.arrest.tutorial) {
    sim.arrest.clock = Math.max(0, sim.arrest.clock - 2);
    sim.events.push({ type: 'shock', weak: true, seat: seat.id, why: 'eye' });
    return;
  }
  if (!perfect) {
    sim.arrest.clock = Math.max(0, sim.arrest.clock - 2);
    sim.events.push({ type: 'shock', weak: true, seat: seat.id });
    return;
  }
  sim.arrestsSurvived += 1;
  const late = sim.arrest.clock < 2;
  const back = sim.arrest.savedVitals;
  sim.arrest = null;
  if (back != null) sim.vitals = Math.max(sim.vitals, Math.min(100, back));
  sim.events.push({ type: 'shock', weak: false, seat: seat.id, late });
  award(sim, seat, 'FLAWLESS', seat.x, seat.y, 'defib');
  seat.stats.Saves += 1;
  if (late) seat.lastSecond = true;
  sim.shockers = sim.shockers || [];
  sim.shockers.push(seat.id);
  if (sim.shockers.length >= 2) {
    sim.score += 500;
    sim.events.push({ type: 'syncShock' });
  }
}

function stepScalpel(sim, seat, dt, use) {
  const cutting = use > 0.5;
  const tol = sim.scalpelTol;
  let onLine = false;
  for (const e of sim.entities) {
    if (!e.alive || e.site !== seat.site || e.done) continue;
    if (e.kind === 'incision' || e.kind === 'circleCut') onLine = cutPoly(sim, seat, e, dt, cutting, tol) || onLine;
    if ((e.kind === 'tether' || e.kind === 'link') && cutting) {
      trySever(sim, seat, e);
      if (distPointSeg(seat.x, seat.y, e.x1, e.y1, e.x2, e.y2).d <= 0.22) onLine = true;
    }
  }
  if (cutting && !onLine && seat.speed > 0.15) {
    seat.nickT = (seat.nickT || 0) + dt;
    if (seat.nickT >= 0.4) {
      seat.nickT = 0;
      nick(sim, seat, 'bare');
    }
  } else seat.nickT = 0;
}

function cutPoly(sim, seat, e, dt, cutting, tol) {
  if (!e.len) e.len = polyLen(e.points);
  const proj = projectPoly(e.points, seat.x, seat.y);
  if (!proj) return false;
  const near = proj.d <= tol;
  if (!cutting) {
    if (near) seat.onCut = e.id;
    return near;
  }
  if (!e.started) {
    const start = e.points[0];
    if (dist(seat.x, seat.y, start[0], start[1]) <= 0.08) e.started = true;
    else return near;
  }
  if (!near) {
    if (seat.onCut === e.id && !seat.lineNick) {
      seat.lineNick = true;
      nick(sim, seat, 'line');
    }
    return false;
  }
  seat.lineNick = false;
  seat.onCut = e.id;
  if (proj.along > (e.along || 0)) {
    e.devSum = (e.devSum || 0) + proj.d;
    e.devN = (e.devN || 0) + 1;
    e.maxSpeed = Math.max(e.maxSpeed || 0, seat.speed);
    e.along = proj.along;
  }
  const end = e.points[e.points.length - 1];
  const atEnd = dist(seat.x, seat.y, end[0], end[1]) <= 0.06 && e.along >= e.len * 0.72;
  if (e.along >= e.len - 0.05 || atEnd) finishCut(sim, seat, e, tol);
  return true;
}

function finishCut(sim, seat, e, tol) {
  e.done = true;
  e.alive = e.kind === 'circleCut' ? false : false;
  const mean = e.devN ? e.devSum / e.devN : 0;
  let grade = gradeBand(mean, tol);
  if ((e.maxSpeed || 0) > 1.8 && grade !== 'MISS') grade = grade === 'FLAWLESS' || grade === 'CLEAN' ? 'ROUGH' : grade;
  if ((e.maxSpeed || 0) > 1.8) grade = 'ROUGH';
  award(sim, seat, grade, seat.x, seat.y, 'cut');
  sim.events.push({ type: 'cut', id: e.id });
  if (e.opens) sim.flags.opened = true;
}

function trySever(sim, seat, e) {
  if (e.cut || blocked(e)) return;
  if (seat.speed < 0.15) return;
  const hit = segHit(
    { x: seat.prevX, y: seat.prevY },
    { x: seat.x, y: seat.y },
    { x: e.x1, y: e.y1 },
    { x: e.x2, y: e.y2 },
  );
  if (!hit) return;
  if (e.kind === 'link' && e.index !== e.chainActive) {
    sim.hurt(4, 'wronglink');
    sim.events.push({ type: 'reheal', id: e.chain });
    const chain = sim.entities.find((c) => c.id === e.chain);
    if (chain) reheal(chain);
    award(sim, seat, 'MISS', hit.x, hit.y, 'sever');
    return;
  }
  e.cut = true;
  e.alive = e.kind === 'tether' ? false : e.alive;
  award(sim, seat, 'CLEAN', hit.x, hit.y, 'sever');
  sim.events.push({ type: 'sever', id: e.id });
  if (e.kind === 'link') {
    e.free = true;
    e.cut = true;
    e.cutAtBeat = sim.beat.count;
    const chain = sim.entities.find((c) => c.id === e.chain);
    const link = chain?.links?.[e.index];
    if (link) {
      link.cut = true;
      link.free = true;
      link.cutAtBeat = sim.beat.count;
    }
    if (chain) chain.active = nextOpenLink(chain);
  }
}

/** Tail-first: the active link is the highest index that is not yet cut. */
function nextOpenLink(chain) {
  for (let i = chain.links.length - 1; i >= 0; i--) {
    if (!chain.links[i].cut) return i;
  }
  return 0;
}

function reheal(chain) {
  const cut = chain.links.filter((l) => l.cut && !l.tray);
  const back = cut.slice(-2);
  for (const l of back) {
    l.cut = false;
    l.free = false;
  }
  chain.active = nextOpenLink(chain);
}

function nick(sim, seat, why) {
  award(sim, seat, 'MISS', seat.x, seat.y, 'nick');
  sim.hurt(3, 'nick');
  sim.spawn({ kind: 'pool', site: seat.site, at: [seat.x, seat.y], vol: 0.18, cap: 0.5 });
  sim.events.push({ type: 'nick', why, x: seat.x, y: seat.y });
}

function stepForceps(sim, seat, dt, use) {
  const holding = sim.entities.find((e) => e.alive && e.holder === seat.id);
  if (holding) {
    if (use < 0.4) releaseItem(sim, seat, holding);
    else pullHeld(sim, seat, holding, dt);
    return;
  }
  if (use < 0.4) return;
  const item = nearestGrabbable(sim, seat, 0.1);
  if (!item) return;
  if (item.kind === 'note') {
    item.pinch = (item.pinch || 0) + dt;
    if (item.pinch >= 0.2) popNote(sim, seat, item);
    return;
  }
  item.holder = seat.id;
  item.varSum = 0;
  item.varN = 0;
  item.pull = item.pull || 0;
  sim.events.push({ type: 'grip', id: item.id, seat: seat.id });
}

function nearestGrabbable(sim, seat, r) {
  let best = null;
  let bestD = r;
  for (const e of sim.entities) {
    if (!e.alive || e.site !== seat.site || e.holder || e.tray || blocked(e)) continue;
    if (!e.grabbable) continue;
    if (e.kind === 'adagio' && !(e.stunned > 0)) continue;
    if (e.kind === 'coda' && e.hp > 0) continue;
    if (e.kind === 'fermata' && e.hp > 0) continue;
    const d = dist(seat.x, seat.y, e.x, e.y);
    if (d <= bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function pullHeld(sim, seat, e, dt) {
  e.x = seat.x;
  e.y = seat.y;
  if (!e.embedded) return;
  const axis = (e.axis || 0) * Math.PI / 180;
  const spd = seat.speed;
  if (spd < 0.02) return;
  const move = Math.atan2(seat.vy, seat.vx);
  const diff = Math.abs(angDiff(move, axis));
  if (diff > (50 * Math.PI) / 180) return;
  if (spd > sim.tuning.pullTol) {
    award(sim, seat, 'MISS', e.x, e.y, 'tear');
    sim.hurt(4, 'tear');
    e.holder = null;
    sim.events.push({ type: 'tear', id: e.id });
    return;
  }
  const along = seat.vx * Math.cos(axis) + seat.vy * Math.sin(axis);
  e.pull += Math.max(0, along) * dt;
  e.varSum += spd * spd;
  e.varN += 1;
  if (e.pull >= e.embed) {
    e.embedded = false;
    sim.events.push({ type: 'pop', id: e.id });
  }
}

function releaseItem(sim, seat, e) {
  e.holder = null;
  if (e.embedded) return;
  if (overTray(seat.x, seat.y)) {
    e.tray = true;
    e.alive = false;
    e.site = 'tray';
    e.x = 1.62 + ((e.id % 5) - 2) * 0.04;
    e.y = 0.05 + (e.id % 7) * 0.05;
    const mean = e.varN ? e.varSum / e.varN : 0;
    const variance = Math.max(0, mean - (e.pull > 0 ? 1 : 0));
    let grade = 'CLEAN';
    if (e.kind === 'shard' || e.kind === 'tumor' || e.kind === 'adagio' || e.kind === 'coda' || e.kind === 'ring' || e.kind === 'link' || e.kind === 'fermata' || e.kind === 'crescendo') {
      const v = e.varN > 1 ? variance : 0;
      grade = v < 0.15 ? 'FLAWLESS' : v < 0.8 ? 'CLEAN' : 'ROUGH';
    }
    award(sim, seat, grade, e.x, e.y, 'extract');
    sim.events.push({ type: 'tray', id: e.id });
    sim.onRemoved(e);
  } else {
    sim.hurt(1, 'drop');
    e.x = seat.x;
    e.y = seat.y;
    sim.events.push({ type: 'drop', id: e.id });
  }
}

function stepSuction(sim, seat, dt, use, power) {
  if (use <= 0) return;
  const rate = sim.tuning.suctionRate * use * power;
  for (const e of sim.entities) {
    if (!e.alive || e.kind !== 'pool' || e.site !== seat.site) continue;
    if (dist(seat.x, seat.y, e.x, e.y) > 0.16) continue;
    e.vol -= rate * dt;
    if (e.vol <= e.cap * 0.05) {
      const grade = e.overflowed ? 'CLEAN' : 'FLAWLESS';
      e.alive = false;
      award(sim, seat, grade, e.x, e.y, 'drain');
      sim.events.push({ type: 'drained', id: e.id });
    }
  }
}

function stepGel(sim, seat, dt, use, power) {
  if (use <= 0.05) return;
  const r = sim.tuning.gelRadius;
  for (const e of sim.entities) {
    if (!e.alive || e.site !== seat.site || blocked(e)) continue;
    if (e.kind === 'gelZone') paintZone(sim, seat, e, r);
    if (e.kind === 'scratch' && dist(seat.x, seat.y, e.x, e.y) <= r) {
      e.coat = (e.coat || 0) + dt * power;
      if (e.coat >= 1) {
        e.alive = false;
        award(sim, seat, 'CLEAN', e.x, e.y, 'heal');
      }
    }
    if (e.kind === 'spore' && dist(seat.x, seat.y, e.x, e.y) <= r) {
      e.alive = false;
      award(sim, seat, 'CLEAN', e.x, e.y, 'spore');
    }
    if ((e.kind === 'nest' || e.kind === 'hole') && !e.sealed && dist(seat.x, seat.y, e.x, e.y) <= r) {
      e.seal = (e.seal || 0) + dt * power;
      if (e.seal >= 1) sealNest(sim, seat, e);
    }
  }
}

function paintZone(sim, seat, e, r) {
  if (!e.grid) {
    const [x0, y0, x1, y1] = e.rect;
    e.x0 = x0;
    e.y0 = y0;
    e.x1 = x1;
    e.y1 = y1;
    e.cols = Math.max(1, Math.ceil((x1 - x0) / CELL));
    e.rows = Math.max(1, Math.ceil((y1 - y0) / CELL));
    e.grid = new Uint8Array(e.cols * e.rows);
    e.painted = 0;
    e.elapsed = 0;
  }
  e.elapsed += DT;
  const x0 = e.x0;
  const y0 = e.y0;
  for (let row = 0; row < e.rows; row++) {
    for (let col = 0; col < e.cols; col++) {
      const i = row * e.cols + col;
      if (e.grid[i]) continue;
      const cx = x0 + (col + 0.5) * CELL;
      const cy = y0 + (row + 0.5) * CELL;
      if (dist(seat.x, seat.y, cx, cy) <= r) {
        e.grid[i] = 1;
        e.painted += 1;
      }
    }
  }
  e.coverage = e.painted / e.grid.length;
  if (!e.done && e.coverage >= 0.9) {
    e.done = true;
    e.alive = false;
    const par = e.parTime || 8;
    const grade = e.elapsed <= par ? 'FLAWLESS' : e.elapsed <= par * 1.6 ? 'CLEAN' : 'ROUGH';
    award(sim, seat, grade, seat.x, seat.y, 'gel');
    sim.events.push({ type: 'gelled', id: e.id });
  }
}

function sealNest(sim, seat, e) {
  e.sealed = true;
  e.alive = false;
  award(sim, seat, 'CLEAN', e.x, e.y, 'seal');
  sim.events.push({ type: 'sealed', id: e.id });
}

function stepSuture(sim, seat, dt, use) {
  for (const e of sim.entities) {
    if (!e.alive || e.kind !== 'wound' || e.done || e.site !== seat.site || blocked(e)) continue;
    if (e.readyTie) {
      e.tieT += dt;
      if (seat.speed >= 1.5 && use > 0.5) tieWound(sim, seat, e, false);
      else if (e.tieT >= 1.5) tieWound(sim, seat, e, false, true);
      continue;
    }
    const g = e.gates[e.gate];
    if (!g) continue;
    const gateR = sim.stitchGateR;
    const d = dist(seat.x, seat.y, g.x, g.y);
    if (use > 0.5 && d > 0.3 && e.gate > 0) {
      if (!e.torn) {
        e.torn = true;
        award(sim, seat, 'MISS', seat.x, seat.y, 'stitch');
      }
    } else e.torn = false;
    if (use > 0.5 && d <= gateR && !g.hit) {
      g.hit = true;
      e.devSum = (e.devSum || 0) + d;
      e.devN = (e.devN || 0) + 1;
      e.gate += 1;
      sim.events.push({ type: 'gate', id: e.id, gate: e.gate });
      if (e.gate >= e.gates.length) {
        e.readyTie = true;
        e.tieT = 0;
      }
    }
  }
}

function tieWound(sim, seat, e, fromAlt, auto) {
  if (e.done) return;
  e.done = true;
  e.alive = false;
  const mean = e.devN ? e.devSum / e.devN : 0;
  let grade = gradeBand(mean, sim.stitchGateR);
  if (auto) grade = grade === 'FLAWLESS' ? 'CLEAN' : grade;
  if (!fromAlt && !auto && seat.speed < 1.5) grade = grade === 'FLAWLESS' ? 'CLEAN' : grade;
  award(sim, seat, grade, seat.x, seat.y, 'tie');
  sim.events.push({ type: 'tied', id: e.id });
}

function stepLaser(sim, seat, dt, use, power) {
  if (seat.laserVent > 0) {
    seat.laserVent -= dt;
    return;
  }
  if (use <= 0.05) {
    seat.laserTime = 0;
    seat.laserOn = null;
    return;
  }
  seat.laserTime = (seat.laserTime || 0) + dt;
  if (seat.laserTime >= 6) {
    seat.laserVent = 1.5;
    seat.laserTime = 0;
    sim.events.push({ type: 'vent', seat: seat.id });
    return;
  }
  const clamped = Math.max(0.3, Math.min(1, use));
  let hit = null;
  let hitD = 0.05;
  for (const e of sim.entities) {
    if (!e.alive || e.site !== seat.site || blocked(e) || !(e.hp > 0)) continue;
    if (e.kind === 'tremolo' && !(e.pinned > 0)) continue;
    if (e.kind === 'adagio' && !e.core) continue;
    if (e.kind === 'coda' && !e.coreOpen) continue;
    const d = dist(seat.x, seat.y, e.x, e.y);
    if (d <= hitD) {
      hitD = d;
      hit = e;
    }
  }
  if (!hit) {
    // A dropped baton still blocks the downbeat. Let the beam rest on it
    // without scorching, and singe the cue that sits beside that arm.
    const sink = sim.entities.find((e) => e.alive && e.kind === 'baton' && e.site === seat.site && !(e.hp > 0) && dist(seat.x, seat.y, e.x, e.y) <= 0.05);
    if (sink) {
      seat.offT = 0;
      for (const note of sim.entities) {
        if (!note.alive || note.kind !== 'note' || note.site !== seat.site) continue;
        if (dist(seat.x, seat.y, note.x, note.y) > 0.14) continue;
        note.burnT = (note.burnT || 0) + dt;
        if (note.burnT >= 0.25) popNote(sim, seat, note);
      }
      return;
    }
    seat.offT = (seat.offT || 0) + dt;
    if (seat.offT > 0.25) {
      sim.hurt(sim.tuning.laserBurn * clamped * dt, 'burn');
      seat.burned = true;
      sim.events.push({ type: 'scorch', x: seat.x, y: seat.y });
    }
    return;
  }
  seat.offT = 0;
  // A beam on a baton also singes a cue sitting just beside it.
  for (const note of sim.entities) {
    if (!note.alive || note.kind !== 'note' || note.site !== seat.site || note === hit) continue;
    if (dist(seat.x, seat.y, note.x, note.y) > 0.14) continue;
    note.burnT = (note.burnT || 0) + dt;
    if (note.burnT >= 0.25) popNote(sim, seat, note);
  }
  if (hit.kind === 'note') {
    hit.burnT = (hit.burnT || 0) + dt;
    if (hit.burnT >= 0.25) popNote(sim, seat, hit);
    return;
  }
  let dps = sim.tuning.laserDps * clamped * power;
  if (hit.kind === 'adagio' && hit.core) dps *= 3;
  if (hit.kind === 'coda' && hit.coreOpen) dps *= 3;
  if (hit.kind === 'baton' && hit.windup) dps *= 1;
  hit.hp -= dps * dt;
  if (seat.burned) hit.scorched = true;
  if (hit.hp <= 0) killLaser(sim, seat, hit);
}

function killLaser(sim, seat, e) {
  const grade = e.scorched ? 'CLEAN' : 'FLAWLESS';
  if (e.kind === 'baton') {
    e.hp = 0;
    award(sim, seat, 'CLEAN', e.x, e.y, 'laser');
    return;
  }
  if (e.kind === 'adagio' || e.kind === 'coda') {
    e.hp = 0;
    e.stunned = e.kind === 'adagio' ? 5 : 0;
    e.grabbable = true;
    award(sim, seat, grade, e.x, e.y, 'laser');
    sim.events.push({ type: 'downed', id: e.id });
    return;
  }
  if (e.kind === 'fermata') {
    e.hp = 0;
    e.grabbable = true;
    award(sim, seat, grade, e.x, e.y, 'laser');
    return;
  }
  e.alive = e.kind === 'feeder' ? false : false;
  e.hp = 0;
  award(sim, seat, grade, e.x, e.y, 'laser');
  sim.events.push({ type: 'lasered', id: e.id, kind: e.kind });
  if (e.kind === 'feeder') sim.onFeederDead(e);
}

function popNote(sim, seat, e) {
  e.alive = false;
  award(sim, seat, 'CLEAN', e.x, e.y, 'note');
  sim.events.push({ type: 'note', id: e.id });
}

function stepScanner(sim, seat, dt, use) {
  if (use <= 0.5) return;
  const r = sim.tuning.scannerRadius;
  for (const e of sim.entities) {
    if (!e.alive || e.site !== seat.site) continue;
    if (dist(seat.x, seat.y, e.x, e.y) > r) {
      e.dwell = 0;
      continue;
    }
    e.dwell = (e.dwell || 0) + dt;
    if (e.hidden && !e.marked && e.dwell >= 0.6) {
      e.marked = true;
      e.hidden = false;
      sim.events.push({ type: 'mark', id: e.id });
    }
    if (e.kind === 'tremolo' && !(e.pinned > 0) && e.dwell >= 1) {
      e.pinned = 3;
      e.dwell = 0;
      sim.events.push({ type: 'pin', id: e.id });
    }
  }
}

function stepClamp(sim, seat, use) {
  if (!(use > 0.5) || seat.prev.use) return;
  const b = nearestKind(sim, seat, 'bleeder', 0.1, (e) => !e.clamped);
  if (!b) return;
  if (sim.clampsUsed >= 4 && !sim.cheats.infiniteClamps) {
    sim.bark('clampReminder');
    return;
  }
  b.clamped = true;
  sim.clampsUsed += 1;
  const win = sim.tuning.clampWindow;
  let grade = 'ROUGH';
  if (onBeat(sim, win)) grade = 'FLAWLESS';
  else if (onBeat(sim, win * 2)) grade = 'CLEAN';
  award(sim, seat, grade, b.x, b.y, 'clamp');
  sim.events.push({ type: 'clamp', id: b.id, grade });
}

export { onBeat };
