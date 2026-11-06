// The bot: reads sim state and produces one seat's input. One piece of code with four jobs: attract
// mode, the whole-game test playthrough, the balance report and the Op 9 partner.
// Its memory lives in seat.bot (plain data), so rewinds and hashes include it.
import { pathAt, pathHeading } from '../core/geom.js';
import { nextRandom } from '../core/rng.js';
import { nextTask, stitchPoint, TOOLS } from './entities.js';

const speedOf = (b) => 2 + 9.5 * b.skill;

function moveTo(b, seat, x, z, speed, dt = 1 / 60) {
  const dx = x - b.x, dz = z - b.z;
  const d = Math.hypot(dx, dz);
  const st = speed * dt;
  if (d <= st) { b.x = x; b.z = z; return true; }
  b.x += (dx / d) * st;
  b.z += (dz / d) * st;
  return false;
}

function ensureMem(seat) {
  const b = seat.bot;
  if (b.x == null) { b.x = seat.x; b.z = seat.z; b.wait = 0; b.side = 1; b.t = 0; b.hold = 0; b.lastMistakes = 0; b.giftT = 0; b.pressCool = 0; b.table = seat.table; b.focus = null; b.skill = b.skill ?? 0.7; }
  return b;
}

export function botInput(sim, seat) {
  const b = ensureMem(seat);
  b.t += 1 / 60;
  // A seat may have been moved by a tag or a rewind.
  if (Math.hypot(seat.x - b.x, seat.z - b.z) > 1.5) { b.x = seat.x; b.z = seat.z; }
  const out = { x: b.x, z: b.z, tool: seat.tool, use: false, gift: false, steady: false, a: false, b: false, rot: 0, table: b.table, force: 1 };
  if (b.idle || b.skill <= 0) return out;

  if (sim.codeBlue) return paddles(sim, b, out);
  if (sim.massage) return massage(sim, b, out);

  // Triage between tables.
  const myTable = chooseTable(sim, seat, b);
  if (myTable !== seat.table) { b.table = myTable; out.table = myTable; return out; }

  // Gifts.
  gifts(sim, seat, b, out);

  if (b.wait > 0) { b.wait -= 1 / 60; return out; }

  // Low vitals: a dose first.
  const t = sim.tables[seat.table];
  const dosing = !b.god && !b.noDose && sim.doses > 0 && sim.tools.includes('syringe') && t.vitals < (b.doseAt ?? 34) && !seat.grab && !seat.cutting;
  if (dosing || (seat.tool === 'syringe' && seat.draw > 0)) return dose(sim, seat, b, out, t);

  // Droplets pile up: drain them when there are many.
  if (sim.drops.length >= 3 && sim.tools.includes('drain') && !seat.grab && !seat.cutting) {
    const d = nearestDrop(sim, seat, b);
    if (d) {
      out.tool = 'drain';
      moveTo(b, seat, d.x, d.z, speedOf(b));
      out.x = b.x; out.z = b.z;
      out.use = seat.tool === 'drain' && Math.hypot(d.x - b.x, d.z - b.z) < 0.7;
      return out;
    }
  }

  const task = pickTask(sim, seat, b);
  // Between jobs a human takes a moment to look up.
  const taskId = task?.e?.id ?? null;
  if (taskId !== b.lastTask) {
    if (b.lastTask != null && !seat.grab && !seat.cutting) b.wait = Math.pow(1 - b.skill, 1.5) * 2.4 * (0.6 + 0.8 * nextRandom(sim));
    b.lastTask = taskId;
    if (b.wait > 0) return out;
  }
  if (!task) {
    // Nothing to do: drift toward the middle of our half and wait.
    const hx = seat.region === 'left' ? -2.5 : seat.region === 'right' ? 2.5 : 0;
    moveTo(b, seat, hx, -0.4, 3);
    out.x = b.x; out.z = b.z;
    if (seat.grab) out.use = false;
    return out;
  }
  doTask(sim, seat, b, out, task);
  return out;
}

function regionOk(seat, x) {
  if (seat.region === 'left') return x <= 0.5;
  if (seat.region === 'right') return x >= -0.5;
  return true;
}

function pickTask(sim, seat, b) {
  // Hold on to what we're doing.
  const held = seat.grab ? sim.ents.find((e) => e.id === seat.grab && !e.dead) : null;
  if (held) return { e: held, tool: 'forceps', x: held.x, z: held.z };
  const cutting = seat.cutting ? sim.ents.find((e) => e.id === seat.cutting && !e.dead) : null;
  if (cutting) {
    const p = pathAt(cutting.path, cutting.s);
    return { e: cutting, tool: cutting.k === 'dressing' ? 'dressing' : 'scalpel', x: p[0], z: p[1] };
  }
  const sut = seat.sutId ? sim.ents.find((e) => e.id === seat.sutId && !e.dead) : null;
  if (sut) {
    const p = stitchPoint(sut, sut.next);
    return { e: sut, tool: 'suture', x: p[0], z: p[1] };
  }
  if (sim.context) return nextTask(sim, seat, sim.context);
  // Anything that needs two hands comes first, wherever it is.
  const two = sim.ents.find((e) => e.twoHanded && !e.dead);
  if (two && !two.locked) return { e: two, tool: 'forceps', x: two.x, z: two.z };

  if (seat.region) {
    const clone = { ...seat };
    // Filter by half of the field.
    const saved = sim.ents;
    sim.ents = saved.filter((e) => regionOk(seat, e.x));
    const r = nextTask(sim, clone);
    sim.ents = saved;
    if (r) return r;
    return null;
  }
  return nextTask(sim, seat);
}

function doTask(sim, seat, b, out, task) {
  const { e, tool } = task;
  const context = sim.context;
  const speed = speedOf(b);
  if (tool !== 'dressing' && tool !== 'marker') {
    out.tool = tool;
    if (seat.tool !== tool && TOOLS.includes(tool)) {
      // Switching takes a moment for a human.
      moveTo(b, seat, task.x, task.z, speed);
      out.x = b.x; out.z = b.z;
      return;
    }
  }
  const heart = sim.heart;
  const fine = tool === 'scalpel' || tool === 'forceps' || tool === 'laser';
  const beatBad = heart && !heart.calm && fine && (heart.systole || heart.phase > 0.92);
  const noise = Math.pow(1 - b.skill, 0.8) * 0.8;
  const wob = noise ? Math.sin(b.t * 7.3 + seat.id) * noise : 0;

  switch (tool) {
    case 'drain': {
      moveTo(b, seat, task.x, task.z, speed);
      out.use = Math.hypot(task.x - b.x, task.z - b.z) < e.r + 0.25;
      break;
    }
    case 'scanner': {
      moveTo(b, seat, task.x, task.z, speed);
      out.use = Math.hypot(task.x - b.x, task.z - b.z) < 1.6;
      break;
    }
    case 'laser': {
      moveTo(b, seat, task.x, task.z, speed);
      const near = Math.hypot(task.x - b.x, task.z - b.z) < e.r + 0.08;
      out.use = near && !beatBad;
      if (e.k === 'cyst' && !e.real) out.use = false;
      break;
    }
    case 'gel': {
      moveTo(b, seat, task.x, task.z, Math.min(speed, e.k === 'nick' ? speed : 6 + 3 * b.skill));
      out.use = Math.hypot(task.x - b.x, task.z - b.z) < 0.6;
      break;
    }
    case 'scalpel':
    case 'dressing': {
      const cutting = seat.cutting === e.id;
      if (!cutting) {
        moveTo(b, seat, task.x, task.z, speed);
        const close = Math.hypot(task.x - b.x, task.z - b.z) < 0.2;
        out.use = close && !beatBad && !(seat.noCut && seat.useWas);
        if (seat.noCut) out.use = false;
        if (beatBad && e.short) break;
      } else {
        // A stroke: quick for short ones on a beating heart.
        const v = (e.short ? 3.4 : 2.2) + 4 * b.skill;
        const next = pathAt(e.path, e.s + 0.35);
        const h = pathHeading(e.path, e.s);
        const nx = next[0] - Math.sin(h) * wob, nz = next[1] + Math.cos(h) * wob;
        moveTo(b, seat, nx, nz, v);
        out.use = true;
        if (heart && !heart.calm && heart.systole) { out.use = false; }
      }
      break;
    }
    case 'forceps': {
      if (seat.grab === e.id) {
        out.use = true;
        if (e.to) {
          const arrived = moveTo(b, seat, e.to[0], e.to[1], Math.min(speed, 6));
          if (e.rotTo != null) {
            let dr = ((e.rotTo - e.rot + 540) % 360) - 180;
            if (Math.abs(dr) > 1) out.rot = Math.sign(dr) * Math.min(Math.abs(dr), 4 + 3 * b.skill);
          }
          const rotOk = e.rotTo == null || Math.abs(((e.rotTo - e.rot + 540) % 360) - 180) < (b.skill > 0.8 ? 2 : 6);
          if (arrived && rotOk) out.use = false;
        } else if (e.free) {
          out.use = false;
        } else {
          let v = e.speedLimit ? e.speedLimit * 0.62 : 1.6 + 2.6 * b.skill;
          if (e.tether) v = 2.2;
          if (e.twoHanded) {
            const other = sim.seats.find((o) => o !== seat && o.grab === e.id);
            if (!other) v = 0;
            else v = 1.4;
          }
          const next = pathAt(e.path, e.s + 0.4);
          moveTo(b, seat, next[0], next[1] + wob * 0.9, v);
        }
      } else {
        moveTo(b, seat, task.x, task.z, speed);
        const close = Math.hypot(task.x - b.x, task.z - b.z) < 0.28;
        out.use = close && !beatBad && !seat.noGrab;
        if (seat.noGrab) out.use = false;
      }
      break;
    }
    case 'suture': {
      const a = e.a;
      let p;
      if (e.next === 0 && !e.flip) {
        // Start from the nearer end.
        const p0 = stitchPoint({ ...e, flip: 1 }, 0), p1 = stitchPoint({ ...e, flip: -1 }, 0);
        p = Math.hypot(p0[0] - b.x, p0[1] - b.z) <= Math.hypot(p1[0] - b.x, p1[1] - b.z) ? p0 : p1;
      } else p = stitchPoint(e, e.next);
      const nx = -Math.sin(a), nz = Math.cos(a);
      const gx = p[0] + nx * b.side * 0.42, gz = p[1] + nz * b.side * 0.42;
      if (seat.sutId !== e.id && Math.hypot(gx - b.x, gz - b.z) > 0.2) {
        moveTo(b, seat, gx, gz, speed);
        out.use = Math.hypot(gx - b.x, gz - b.z) < 0.9;
      } else {
        const v = 1.7 + 0.7 * b.skill;
        out.use = true;
        if (b.hes > 0) { b.hes -= 1 / 60; break; }
        const arrived = moveTo(b, seat, gx, gz, v);
        if (arrived) {
          b.side = -b.side;
          // Unsteady hands lose the rhythm now and then.
          if (nextRandom(sim) < (1 - b.skill) * 0.3) b.hes = 0.55;
        }
      }
      break;
    }
    default:
      moveTo(b, seat, task.x, task.z, speed);
      break;
  }
  out.x = b.x;
  out.z = b.z;
  if (context) out.tool = seat.tool;
}

function dose(sim, seat, b, out, t) {
  out.tool = 'syringe';
  if (seat.tool !== 'syringe') return out;
  const [rx, rz] = t.ring;
  const there = moveTo(b, seat, rx, rz, speedOf(b));
  out.x = b.x; out.z = b.z;
  if (there && !seat.drawn) out.use = true;
  else if (there && seat.drawn) out.use = false;
  else out.use = seat.draw > 0;
  return out;
}

function gifts(sim, seat, b, out) {
  if (!seat.gift || !sim.giftsUnlocked || b.noGift) return;
  const lowest = sim.tables[seat.table].vitals;
  if (seat.gift === 'quiet') {
    const pressure = lowest < 28 || sim.ents.some((e) => e.k === 'core' && !e.dead) || (sim.heart && !sim.heart.calm && sim.heart.bpm > 92) || (sim.prompt && sim.composure >= 20);
    if (b.god) { out.gift = pressure && Math.sin(b.t * 0.7) > 0; return; }
    if (b.skill >= 0.45 && pressure && sim.composure > (sim.quiet ? 2 : 35)) out.gift = true;
  } else if (seat.gift === 'look') {
    const madeMistake = sim.mistakes > b.lastMistakes;
    b.lastMistakes = sim.mistakes;
    const wantPrompt = sim.flags.clotBurst && !sim.persist.clotShown;
    if (b.pressCool > 0) b.pressCool -= 1 / 60;
    if (((b.skill >= 0.6 && madeMistake) || wantPrompt) && sim.composure >= sim.cfg.secondLookCost && b.pressCool <= 0) {
      out.gift = true;
      b.pressCool = 2;
      b.lastMistakes = Math.max(0, sim.mistakes - 1);
    }
  }
}

function nearestDrop(sim, seat, b) {
  let best = null, bd = Infinity;
  for (const d of sim.drops) {
    if (d.table !== seat.table || d.dead || !regionOk(seat, d.x)) continue;
    const dd = Math.hypot(d.x - b.x, d.z - b.z);
    if (dd < bd) { bd = dd; best = d; }
  }
  return best;
}

function chooseTable(sim, seat, b) {
  if (sim.tables.length < 2) return 0;
  if (seat.grab || seat.cutting || seat.sutId) return seat.table;
  const here = sim.ents.some((e) => e.table === seat.table && e.task && !e.dead);
  let urgent = -1, low = 1000;
  for (const t of sim.tables) {
    const has = sim.ents.some((e) => e.table === t.i && e.task && !e.dead);
    if (has && t.vitals < low) { low = t.vitals; urgent = t.i; }
  }
  if (urgent < 0) return seat.table;
  if (!here) return urgent;
  if (urgent !== seat.table && low < 26 && sim.tables[seat.table].vitals > low + 12) return urgent;
  return seat.table;
}

function paddles(sim, b, out) {
  const cb = sim.codeBlue;
  const zone = sim.cfg.codeBlueZone;
  const CENTER = 0.74;
  if (!cb.charging) {
    if (b.pressCool > 0) { b.pressCool -= 1 / 60; return out; }
    out.a = out.b = true;
    return out;
  }
  const err = Math.abs(cb.charge - CENTER);
  const miss = (1 - b.skill) * 0.35 * nextRandom(sim);
  if (err <= zone * (0.3 + miss)) {
    b.pressCool = 0.35;
    return out; // let go
  }
  out.a = out.b = true;
  return out;
}

function massage(sim, b, out) {
  const m = sim.massage;
  const toBeat = Math.min(m.phase, m.period - m.phase);
  const want = toBeat < 0.05 + (1 - b.skill) * 0.12;
  if (want && b.lastPress !== m.beat + '-' + m.next) {
    out[m.next] = true;
    b.lastPress = m.beat + '-' + m.next;
  }
  return out;
}
