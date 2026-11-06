import { dist, pathLength, pathMetrics, toolFor, woundFrame } from './geom.js';

const RANK = {
  sob: 0,
  eye: 1,
  pore: 2,
  core: 3,
  plate: 4,
  tether: 5,
  bleeder: 6,
  pool: 7,
  droplet: 8,
  clamp: 9,
  unclamp: 10,
  fragment: 11,
  incision: 12,
  tumor: 13,
  cyst: 14,
  egg: 15,
  polyp: 16,
  magnet: 17,
  hook: 18,
  prop: 19,
  debris: 20,
  extraction: 21,
  organ: 22,
  stalk: 23,
  wound: 24,
  gel: 25,
  dressing: 26,
  ring: 40,
};

function approach(seat, x, z, skill, dt) {
  const sp = (8 + 14 * skill);
  const dx = x - seat.x;
  const dz = z - seat.z;
  const d = Math.hypot(dx, dz);
  if (d <= sp * dt || d < 0.03) return { x, z };
  const s = (sp * dt) / d;
  return { x: seat.x + dx * s, z: seat.z + dz * s };
}

function pointAlong(path, along) {
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const ax = path[i].x;
    const az = path[i].z;
    const bx = path[i + 1].x;
    const bz = path[i + 1].z;
    const seg = Math.hypot(bx - ax, bz - az) || 1e-6;
    if (acc + seg >= along) {
      const u = (along - acc) / seg;
      return { x: ax + (bx - ax) * u, z: az + (bz - az) * u };
    }
    acc += seg;
  }
  const last = path[path.length - 1];
  return { x: last.x, z: last.z };
}

function claimed(sim, seat, e) {
  if (!e.side || !seat.pref || e.side === seat.pref) return true;
  return !sim.seats.some((s) => s.id !== seat.id && s.pref === e.side);
}

function lookReady(sim) {
  const target = sim.realT - sim.config.lookSeconds;
  let best = null;
  for (const h of sim.hist) if (h.t <= target + 1e-6) best = h;
  return !!(best && best.data.stageIndex === sim.stageIndex && sim.composure >= sim.config.lookCost);
}

function selectable(sim, seat, e) {
  if (!e || e.done || e.optional && e.kind === 'nick') return false;
  if ((e.table || 0) !== (sim.active || 0) && e.kind !== 'ring') {
    /* table filter happens after we choose a table */
  }
  if (e.kind === 'cyst' && e.real === false) return false;
  if (e.kind === 'eye' && e.open === false) return false;
  if (e.kind === 'ring') return false;
  if (e.kind === 'nick' || e.kind === 'film') return false;
  if (e.kind === 'unclamp' && e.firstClot && !sim.persist.rewound && !lookReady(sim)) return false;
  if (e.kind === 'unclamp' && e.order > 0) {
    const prev = sim.entities.find((x) => x.kind === 'unclamp' && x.order === e.order - 1);
    if (prev && !prev.done) return false;
  }
  if (!claimed(sim, seat, e)) return false;
  if (e.hidden && !e.marked && !sim.unlocked.has('scanner')) return false;
  return true;
}

function pickTable(sim, seat) {
  const tables = sim.tables.map((t) => t.id);
  let best = sim.active || 0;
  let bestScore = 1e9;
  for (const table of tables) {
    let score = table === sim.active ? 0 : 2;
    let any = false;
    for (const e of sim.entities) {
      if ((e.table || 0) !== table) continue;
      if (!selectable(sim, { ...seat, pref: seat.pref }, { ...e, table: 0 }) && e.table) {
        /* re-check without table mismatch by temporary */
      }
      if (e.done || e.kind === 'nick' || e.kind === 'ring' || e.kind === 'film') continue;
      if (e.kind === 'cyst' && e.real === false) continue;
      if (e.kind === 'eye' && e.open === false) continue;
      if (!claimed(sim, seat, e)) continue;
      any = true;
      score += (RANK[e.kind] ?? 30) * 0.01;
    }
    if (any && score < bestScore) {
      bestScore = score;
      best = table;
    }
  }
  return best;
}

function sutureLock(sim, seat) {
  const id = seat._su && seat._su.id;
  if (!id) return null;
  const locked = sim.entities.find((e) => e.id === id && !e.done && (e.kind === 'wound' || e.kind === 'bleeder'));
  if (!locked || (locked.table || 0) !== (sim.active || 0)) return null;
  return locked;
}

function pickEntity(sim, seat) {
  if (seat.holding != null && seat.holding !== -1) {
    const held = sim.entities.find((e) => e.id === seat.holding && !e.done);
    if (held) return held;
  }
  let best = null;
  let bestKey = 1e9;
  for (const e of sim.entities) {
    if ((e.table || 0) !== (sim.active || 0)) continue;
    if (e.done || e.kind === 'nick' || e.kind === 'ring' || e.kind === 'film') continue;
    if (e.kind === 'cyst' && e.real === false) continue;
    if (e.kind === 'eye' && e.open === false) continue;
    if (e.kind === 'unclamp' && e.firstClot && !sim.persist.rewound && !lookReady(sim)) continue;
    if (e.kind === 'unclamp' && e.order > 0) {
      const prev = sim.entities.find((x) => x.kind === 'unclamp' && x.order === e.order - 1);
      if (prev && !prev.done) continue;
    }
    if (!claimed(sim, seat, e)) continue;
    if (e.hidden && !e.marked && !sim.unlocked.has('scanner')) continue;
    let key = RANK[e.kind] ?? 30;
    if (e.started) key -= 5;
    if (e.life && e.life < 4) key -= 3;
    if (e.kind === 'droplet' && e.z > -1.6) key += 20;
    key += dist(seat.x, seat.z, e.x, e.z) * 0.02;
    if (key < bestKey) {
      bestKey = key;
      best = e;
    }
  }
  const locked = sutureLock(sim, seat);
  if (locked && (!best || (RANK[best.kind] ?? 30) >= RANK.wound)) return locked;
  return best;
}

function sutureAim(sim, seat, e) {
  const f = woundFrame(e);
  const slot = e.slots[e.nextSlot] || e.slots[e.slots.length - 1];
  if (!seat._su) seat._su = { side: 1, at: sim.t - 1, id: 0 };
  const st = seat._su;
  if (st.id !== e.id) {
    st.id = e.id;
    st.side = 1;
    st.at = sim.t - 0.5;
  }
  if (sim.t - st.at >= 0.45) {
    st.side *= -1;
    st.at = sim.t;
  }
  const along = slot.at;
  const amp = 0.48 * st.side;
  return {
    x: e.x + (f.dx / f.len) * along + f.nx * amp,
    z: e.z + (f.dz / f.len) * along + f.nz * amp,
  };
}

function pathAim(sim, seat, e, skill, dt) {
  const path = e.path;
  if (!path?.length) return { x: e.x, z: e.z };
  const len = e.pull || pathLength(path);
  const closed = dist(path[0].x, path[0].z, path[path.length - 1].x, path[path.length - 1].z) < 0.08;
  const scalpel = e.kind === 'incision' || e.kind === 'pore' || e.kind === 'tumor' || (e.kind === 'plate' && e.phase !== 'lift');
  if (scalpel && !e.started) return { x: path[0].x, z: path[0].z };
  if (!scalpel && e.kind !== 'dressing' && seat.holding !== e.id) return { x: path[0].x, z: path[0].z };
  const here = pathMetrics(path, seat.x, seat.z);
  if (here.dev > 0.2) return pointAlong(path, here.along);
  let cap = (6 + 12 * skill) * dt;
  if (e.speedLimit) cap = Math.min(cap, e.speedLimit * 0.65 * dt);
  let along = Math.min(len, here.along + cap);
  if (closed) along = Math.min(len * 0.93, along);
  return pointAlong(path, along);
}

/**
 * One seat's input for this frame. Skill 0 is not used: idle tests pass no input at all.
 * @param {number} [dt]
 */
export function botInput(sim, seatIndex, skill = 1, dt = 1 / 60) {
  const seat = sim.seats[seatIndex];
  if (!seat || skill <= 0) return {};
  const input = { use: false, gift: false, charge: false, sideL: false, sideR: false, alt: false };

  if (sim.phase === 'codeblue') {
    const c = sim.code;
    const half = (sim.config.blueZone || 0.2) / 2;
    const inZone = Math.abs(c.needle - 0.5) <= half - 0.01;
    input.charge = skill >= 0.45 ? !inZone : c.needle < 0.28;
    return input;
  }
  if (sim.phase === 'massage') {
    if (sim.massageOpen) {
      const wantL = sim.massageCount % 2 === 0;
      if (wantL) input.sideL = true;
      else input.sideR = true;
    }
    return input;
  }
  if (sim.phase !== 'play') return input;

  if (seat.gift === 'look' && sim.persist.lookUnlocked && sim.persist.needRewind && !seat.lookLatch && sim.composure >= sim.config.lookCost) {
    input.gift = true;
    return input;
  }

  const table = pickTable(sim, seat);
  if (table !== sim.active) {
    input.table = table;
    return input;
  }

  const low = Math.min(...sim.tables.map((t) => t.vitals));
  if (seat.gift === 'quiet' && sim.persist.quietUnlocked && low < 28 && sim.composure > 24 && !sim.entities.some((e) => !e.done && (e.kind === 'pore' || e.kind === 'sob' || e.kind === 'plate'))) {
    input.gift = true;
  }

  const ring = sim.entities.find((e) => e.kind === 'ring' && !e.done);
  if (ring && sim.doses > 0 && low < 46 && sim.unlocked.has('syringe') && !sim.entities.some((e) => !e.done && (e.kind === 'pore' || e.kind === 'core' || e.kind === 'sob'))) {
    const p = approach(seat, ring.x, ring.z, skill, dt);
    input.place = true;
    input.x = p.x;
    input.z = p.z;
    input.tool = 'syringe';
    input.use = seat.draw < sim.config.syringeDraw;
    return input;
  }

  const e = pickEntity(sim, seat);
  if (!e) return input;

  if (e.hidden && !e.marked) {
    const p = approach(seat, e.x, e.z, skill, dt);
    input.place = true;
    input.x = p.x;
    input.z = p.z;
    input.tool = 'scanner';
    input.use = true;
    return input;
  }

  if (e.window === 'diastole' && !sim.diastole) {
    const p = approach(seat, e.x, e.z, skill, dt);
    input.place = true;
    input.x = p.x;
    input.z = p.z;
    input.tool = toolFor(e) || seat.tool;
    input.use = false;
    return input;
  }

  if (e.kind === 'fragment') {
    const p = approach(seat, e.x, e.z, skill, dt);
    input.place = true;
    input.x = p.x;
    input.z = p.z;
    input.tool = 'forceps';
    if (seat.holding === e.id) {
      input.use = false;
      input.angle = e.targetAng;
    } else input.use = true;
    return input;
  }

  if (e.kind === 'wound' || e.kind === 'bleeder') {
    const aim = sutureAim(sim, seat, e);
    input.place = true;
    input.x = aim.x;
    input.z = aim.z;
    input.tool = 'suture';
    input.use = true;
    return input;
  }

  if (e.kind === 'gel' || e.kind === 'sob') {
    const cell = (e.cells || []).find((c) => !c.on) || { x: e.x, z: e.z };
    const p = approach(seat, cell.x, cell.z, skill, dt);
    input.place = true;
    input.x = p.x;
    input.z = p.z;
    input.tool = 'gel';
    input.use = true;
    return input;
  }

  if (e.kind === 'tether') {
    const useEnd = seat.pref === 'L' || seat.id % 2 === 1;
    const x = useEnd ? e.x2 : e.x;
    const z = useEnd ? e.z2 : e.z;
    const p = approach(seat, x, z, skill, dt);
    input.place = true;
    input.x = p.x;
    input.z = p.z;
    input.tool = 'forceps';
    input.use = true;
    return input;
  }

  if (e.kind === 'clamp' || e.kind === 'unclamp') {
    const p = approach(seat, e.x, e.z, skill, dt);
    input.place = true;
    input.x = p.x;
    input.z = p.z;
    input.tool = 'forceps';
    input.use = true;
    return input;
  }

  const tool = toolFor(e) || 'forceps';
  let aim = { x: e.x, z: e.z };
  if (e.path && (tool === 'scalpel' || tool === 'forceps' || tool === 'dressing' || e.kind === 'dressing')) {
    aim = pathAim(sim, seat, e, skill, dt);
  }
  if (tool === 'laser' || tool === 'drain' || tool === 'scanner') aim = { x: e.x, z: e.z };
  const p = tool === 'laser' || tool === 'drain' ? approach(seat, aim.x, aim.z, skill, dt) : aim;
  const placed = tool === 'laser' || tool === 'drain' ? p : aim;
  input.place = true;
  input.x = placed.x;
  input.z = placed.z;
  input.tool = e.kind === 'dressing' ? 'dressing' : tool;
  const close = dist(seat.x, seat.z, e.x, e.z);
  if (tool === 'laser') input.use = close < 0.42 * (sim.config.toolTol || 1);
  else if (tool === 'drain') input.use = true;
  else input.use = true;
  return input;
}
