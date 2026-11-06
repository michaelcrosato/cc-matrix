// The bot: reads sim state, produces seat input. One piece of code with four jobs: attract mode,
// the whole-game test, the balance report and the Op 9 partner.
import { aimPoint, entById, KINDS, toolFor, visible } from './entities.js';
import { dist, pointAt } from './geom.js';
import { defOf, inSystole } from './op.js';

export function createBot(seatIndex = 0, skill = 0.7, opts = {}) {
  return { seat: seatIndex, skill, zone: opts.zone ?? null, seed: 12345 + seatIndex * 77, task: null, waitT: 0, x: null, z: null, wob: 0, useT: 0, hand: 1, pulse: 0, cheat: !!opts.cheat, phaseT: 0, table: 0, tableT: 0, ...opts };
}

function rnd(b) { b.seed = (b.seed * 1664525 + 1013904223) >>> 0; return b.seed / 4294967296; }

const PRIORITY = { marker: -1, core: 0, stalk: 0, eye: 1, incision: 1.5, plate: 1, mask: 2, bleeder: 3, pool: 3, hook: 4, prop: 4, magnet: 4, tumor: 4, organ: 4, fragment: 4, clamp: 4, graft: 3, polyp: 5, egg: 5, clot: 1, cyst: 5, laceration: 6, nick: 7, dressing: 8 };

function chooseTask(sim, seat, bot) {
  let best = null, bs = 1e9;
  const others = sim.seats.filter((s) => s !== seat);
  for (const e of sim.ents) {
    const c = KINDS[e.k].cls;
    if (e.table !== seat.table || c === 'strain' || !visible(e) || e.locked || e.shut) continue;
    if (e.placed) continue;
    const tool = toolFor(e);
    if (!tool && c !== 'dressing' && c !== 'marker') continue;
    if (tool && !sim.tools.includes(tool)) continue;
    if (c === 'nick' && !sim.tools.includes('gel') && !sim.tools.includes('suture')) continue;
    if (e.order != null && sim.ents.some((o) => o.k === e.k && o.order < e.order)) continue;
    if (bot.zone && !e.shared) { const onLeft = e.x < 0; if ((bot.zone === 'left') !== onLeft) continue; }
    if (e.k === 'cyst' && e.isFalse && e.tested) continue;
    const [ax, az] = aimPoint(e);
    let score = (PRIORITY[e.k] ?? 5) * 8 + dist(seat.x, seat.z, ax, az);
    if (others.some((s) => s.taskId === e.id) && !e.shared) score += 30;
    if (e.k === 'incision' && e.expires == null && !e.owner) score += 8;
    if (e.owner != null && (e.k === 'incision')) score -= 12;
    if (score < bs) { bs = score; best = e; }
  }
  return best;
}

/** One seat's input for one step. */
export function botInput(sim, bot) {
  const seat = sim.seats[bot.seat];
  if (bot.x == null || Math.abs(bot.x - seat.x) + Math.abs(bot.z - seat.z) > 3) { bot.x = seat.x; bot.z = seat.z; }
  const skill = bot.skill;
  const inp = { x: bot.x, z: bot.z, tool: seat.tool, use: 0, gift: false, steady: false, drop: false, rot: 0, padL: false, padR: false, table: seat.table };
  const dt = 1 / 60;
  if (skill <= 0) return inp;

  // Code Blue
  if (sim.phase === 'codeblue') {
    const cb = sim.codeBlue;
    if (cb.cool > 0 && !cb.charging) return inp;
    const miss = (1 - skill) * cb.zone * (rnd(bot) < 0.5 ? 0.8 : 0.3);
    if (!cb.charging) { inp.padL = inp.padR = true; bot.hold = true; return inp; }
    const rising = (cb.charge % 1.2) < 0.6;
    const inZone = Math.abs(cb.needle - cb.centre) <= cb.zone / 2 - 0.005 + miss * 0.1;
    if (rising && inZone && cb.charge > 0.05) return inp; // release
    inp.padL = inp.padR = true;
    return inp;
  }
  // Massage
  if (sim.phase === 'massage') {
    const m = sim.massage;
    const ph = m.t % m.period;
    const near = Math.min(ph, m.period - ph) < 0.08;
    if (near && m.t - (bot.lastSqueeze ?? -9) > 0.4) {
      bot.lastSqueeze = m.t;
      bot.hand = m.last === 1 ? 2 : 1;
      bot.sqT = 0.1;
    }
    bot.sqT = (bot.sqT ?? 0) - dt;
    if (bot.sqT > 0) { if (bot.hand === 1) inp.padL = true; else inp.padR = true; }
    return inp;
  }
  if (sim.phase !== 'play') return inp;

  // wait out reaction delays
  bot.waitT -= dt;

  // table management
  if (sim.tables.length > 1) {
    bot.tableT -= dt;
    const here = sim.ents.some((e) => e.table === seat.table && visible(e) && KINDS[e.k].cls !== 'strain' && toolFor(e) !== undefined);
    const danger = sim.tables.findIndex((t) => t.vitals < 25);
    if (!seat.grab && !seat.stroke && bot.tableT <= 0) {
      let want = -1;
      if (!here) {
        for (let i = 1; i < sim.tables.length; i++) { const t = (seat.table + i) % sim.tables.length; if (sim.ents.some((e) => e.table === t)) { want = t; break; } }
      } else if (danger >= 0 && danger !== seat.table && sim.ents.some((e) => e.table === danger)) want = danger;
      if (want >= 0) { inp.table = want; bot.tableT = 1.2; bot.task = null; return inp; }
    }
  }

  // gifts
  giftLogic(sim, seat, bot, inp, skill);

  // emergency syringe
  const tv = sim.tables[seat.table];
  const lowAt = 18 + 25 * skill;
  if ((tv.vitals < lowAt || bot.syr) && sim.doses > 0 && sim.tools.includes('syringe') && !seat.grab && !seat.stroke && !(seat.dressing)) {
    return syringe(sim, seat, bot, inp, skill);
  }
  // Dies Irae: slow the heart down before it fibrillates.
  if (sim.heart && sim.heart.bpm >= 108 && sim.doses > 1 && !seat.grab && !seat.stroke && skill > 0.6 && !sim.flags.iraeArrest) return syringe(sim, seat, bot, inp, skill, true);

  // scan for hidden things if nothing else
  let e = seat.grab ? entById(sim, seat.grab) : seat.stroke ? entById(sim, seat.stroke) : (bot.task != null ? entById(sim, bot.task) : null);
  if (e && (e.table !== seat.table || !visible(e) || e.shut)) e = null;
  if (e && !seat.grab && !seat.stroke) {
    const better = chooseTask(sim, seat, bot);
    if (better && better !== e && (PRIORITY[better.k] ?? 5) + 1 < (PRIORITY[e.k] ?? 5)) e = better;
  }
  if (!e) {
    if (bot.waitT > 0) return move(bot, seat, inp, bot.x, bot.z, 1);
    e = chooseTask(sim, seat, bot);
    if (e) { bot.task = e.id; bot.waitT = 0.2 + (1 - skill) * 4 * rnd(bot); return move(bot, seat, inp, bot.x, bot.z, 1); }
  }
  seat.taskId = e?.id ?? null;
  const hidden = sim.ents.find((c) => c.table === seat.table && c.scan && !c.seen && (!bot.zone || (bot.zone === 'left') === c.x < 0));
  const untested = sim.ents.find((c) => c.k === 'cyst' && !c.tested && c.table === seat.table);
  if (untested && sim.tools.includes('scanner')) return scanAt(sim, bot, seat, inp, untested, skill);
  if (!e) {
    if (hidden && sim.tools.includes('scanner')) return scanAt(sim, bot, seat, inp, hidden, skill);
    // Nothing to do yet: hover and paint a film or watch for droplets.
    return idle(sim, bot, seat, inp, skill);
  }
  // droplets are urgent when near
  if (sim.drops.length && !seat.grab && !seat.stroke && sim.tools.includes('drain') && (e.k === 'polyp' || e.k === 'laceration' || e.k === 'nick')) {
    const d = nearestDrop(sim, seat);
    if (d) return chaseDrop(bot, seat, inp, d, skill);
  }
  if (bot.waitT > 0 && !seat.grab && !seat.stroke) return move(bot, seat, inp, bot.x, bot.z, 1);
  bot.task = e.id;
  return drive(sim, seat, bot, inp, e, skill);
}

function nearestDrop(sim, seat) {
  let best = null, bd = 1e9;
  for (const d of sim.drops) { if (d.table !== seat.table) continue; const q = dist(seat.x, seat.z, d.x, d.z); if (q < bd) { bd = q; best = d; } }
  return best;
}
function chaseDrop(bot, seat, inp, d, skill) {
  inp.tool = 'drain';
  if (seat.tool !== 'drain') return move(bot, seat, inp, bot.x, bot.z, 1);
  move(bot, seat, inp, d.x, d.z, speedOf(skill));
  inp.use = dist(bot.x, bot.z, d.x, d.z) < 0.65 ? 1 : 0;
  return inp;
}

function idle(sim, bot, seat, inp, skill) {
  const d = nearestDrop(sim, seat);
  if (d && sim.tools.includes('drain')) return chaseDrop(bot, seat, inp, d, skill);
  const strain = sim.ents.find((s) => s.k === 'strain' && s.x != null && s.mode === 'roam');
  if (strain) return move(bot, seat, inp, strain.x, strain.z, speedOf(skill) * 0.6);
  return inp;
}

const speedOf = (skill) => 2 + skill * 9;

function move(bot, seat, inp, tx, tz, speed) {
  const dt = 1 / 60;
  const amp = (1 - bot.skill) * 1.05 * (bot.noiseScale ?? 1);
  bot.wob += dt * 5;
  const dx = tx - bot.x, dz = tz - bot.z, m = Math.hypot(dx, dz);
  const stepLen = Math.min(m, speed * dt);
  if (m > 1e-6) { bot.x += (dx / m) * stepLen; bot.z += (dz / m) * stepLen; }
  inp.x = bot.x + Math.sin(bot.wob) * amp; inp.z = bot.z + Math.cos(bot.wob * 1.37) * amp;
  return inp;
}

function equip(seat, inp, tool) {
  inp.tool = tool;
  return seat.tool === tool;
}

function scanAt(sim, bot, seat, inp, e, skill) {
  if (!equip(seat, inp, 'scanner')) return move(bot, seat, inp, bot.x, bot.z, 1);
  move(bot, seat, inp, e.x, e.z, speedOf(skill));
  inp.use = dist(bot.x, bot.z, e.x, e.z) < 1.8 ? 1 : 0;
  return inp;
}

function syringe(sim, seat, bot, inp, skill, force) {
  bot.syr = true;
  inp.tool = 'syringe';
  if (seat.tool !== 'syringe') return move(bot, seat, inp, bot.x, bot.z, 1);
  const [px, pz] = sim.port;
  move(bot, seat, inp, px, pz, speedOf(skill));
  const at = dist(bot.x, bot.z, px, pz);
  if (seat.drawing < 1) { inp.use = 1; return inp; }
  if (at < 0.7) { inp.use = 0; bot.syr = false; return inp; }
  inp.use = 1;
  void force;
  return inp;
}

function giftLogic(sim, seat, bot, inp, skill) {
  if (!sim.giftOn || skill < 0.35) return;
  if (seat.gift === 'quiet') {
    const stageId = defOf(sim).stages[sim.stage]?.id;
    const crisis = stageId === 'crash' || sim.tables[seat.table].vitals < 20 || (sim.ents.some((e) => e.k === 'core') && skill > 0.7);
    if (bot.quietOn) {
      inp.gift = sim.quiet && sim.composure > 3;
      bot.quietOn = inp.gift && (crisis || sim.composure > 50);
      if (!bot.quietOn) inp.gift = false;
    } else if (crisis && sim.composure >= 30 && !sim.quiet) { inp.gift = true; bot.quietOn = true; }
    if (bot.cheat && !sim.flags.usedQuiet && sim.t > 3) { inp.gift = true; bot.quietOn = true; }
  } else if (seat.gift === 'look') {
    const stageId = defOf(sim).stages[sim.stage]?.id;
    if (stageId === 'burst' && !seat.giftHeld && sim.composure >= sim.cfg.lookCost) inp.gift = true;
    else if (bot.cheat && !sim.meta.demoLook && sim.t > 8 && sim.composure >= sim.cfg.lookCost) { sim.meta.demoLook = true; inp.gift = true; }
  }
}

function drive(sim, seat, bot, inp, e, skill) {
  const c = KINDS[e.k].cls;
  const tool = toolFor(e);
  bot.noiseScale = c === 'burn' ? 0.3 : 1; // nobody waves a laser about on purpose
  if (tool && !equip(seat, inp, tool)) {
    // can't switch mid-grab
    return move(bot, seat, inp, bot.x, bot.z, 1);
  }
  const fast = speedOf(skill);
  const blocked = e.onBeat && sim.heart && heartRisk(sim);
  switch (c) {
    case 'marker': return move(bot, seat, inp, e.x, e.z, fast);
    case 'pool': {
      move(bot, seat, inp, e.x, e.z, fast);
      inp.use = dist(bot.x, bot.z, e.x, e.z) <= e.r + 0.3 ? 1 : 0;
      return inp;
    }
    case 'nick': {
      if (seat.tool === 'suture') { move(bot, seat, inp, e.x, e.z, fast); inp.use = 1; return inp; }
      move(bot, seat, inp, e.x, e.z, fast);
      inp.use = dist(bot.x, bot.z, e.x, e.z) < 0.5 ? 1 : 0;
      return inp;
    }
    case 'lac': {
      const dx = e.b[0] - e.a[0], dz = e.b[1] - e.a[1], L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
      const t = ((e.tied + 0.5) / e.slots) * L;
      const sx = e.a[0] + ux * t, sz = e.a[1] + uz * t;
      const d = dist(bot.x, bot.z, sx, sz);
      if (d > 1) { move(bot, seat, inp, sx, sz, fast); bot.zig = 1; return inp; }
      if (bot.zig == null || bot.zigFor !== e.id) { bot.zig = 1; bot.zigFor = e.id; }
      const tx = sx - uz * bot.zig * 0.42, tz = sz + ux * bot.zig * 0.42;
      if (dist(bot.x, bot.z, tx, tz) < 0.06) bot.zig = -bot.zig;
      move(bot, seat, inp, tx, tz, 2.4 + skill * 1.4);
      inp.use = 1;
      return inp;
    }
    case 'cut': {
      const p = pointAt(e.pts, e.s), d = dist(bot.x, bot.z, p[0], p[1]);
      if (seat.stroke !== e.id && d > 0.3) { move(bot, seat, inp, p[0], p[1], fast); return inp; }
      if (blocked) { move(bot, seat, inp, p[0], p[1], fast); return inp; }
      const q = pointAt(e.pts, Math.min(e.len, e.s + 0.35));
      move(bot, seat, inp, q[0], q[1], 2 + skill * 4.5);
      inp.use = 1;
      return inp;
    }
    case 'dressing': {
      const p = pointAt(e.pts, e.s), d = dist(bot.x, bot.z, p[0], p[1]);
      if (seat.dressing !== e.id && d > 0.5) { move(bot, seat, inp, p[0], p[1], fast); return inp; }
      const q = pointAt(e.pts, Math.min(e.len, e.s + 0.4));
      move(bot, seat, inp, q[0], q[1], 3 + skill * 6);
      inp.use = 1;
      return inp;
    }
    case 'pull': {
      if (seat.grab === e.id) {
        if (e.free) { inp.use = dist(bot.x, bot.z, e.x, e.z) < 0.3 && seat.grabT > 0.05 ? 0 : 1; return inp; }
        if (blocked) { inp.use = 1; return inp; }
        const q = pointAt(e.pts, Math.min(e.len, e.s + 0.3));
        const v = e.maxSpeed ? Math.min(e.maxSpeed * 0.7, 2 + skill * 4) : 2 + skill * 5;
        move(bot, seat, inp, q[0], q[1], v);
        inp.use = 1;
        return inp;
      }
      move(bot, seat, inp, e.x, e.z, fast);
      if (blocked) return inp;
      inp.use = dist(bot.x, bot.z, e.x, e.z) <= 0.35 ? 1 : 0;
      return inp;
    }
    case 'place': {
      if (seat.grab === e.id) {
        const g = e.goal;
        if (!g) { inp.use = 0; return inp; }
        if (g[2] != null) {
          const off = ((g[2] - e.rot) % 360 + 540) % 360 - 180;
          if (Math.abs(off) > 2) inp.rot = Math.sign(off) * Math.min(1, Math.abs(off) / 30 + 0.15);
        }
        move(bot, seat, inp, g[0], g[1], 2 + skill * 7);
        const ok = dist(bot.x, bot.z, g[0], g[1]) < 0.2 && (g[2] == null || Math.abs(((g[2] - e.rot) % 360 + 540) % 360 - 180) < 4);
        inp.use = ok ? 0 : 1;
        return inp;
      }
      move(bot, seat, inp, e.x, e.z, fast);
      inp.use = dist(bot.x, bot.z, e.x, e.z) <= 0.35 ? 1 : 0;
      return inp;
    }
    case 'burn': {
      move(bot, seat, inp, e.x, e.z, fast);
      if (blocked) return inp;
      inp.use = dist(bot.x, bot.z, e.x, e.z) < 0.25 ? 1 : 0;
      return inp;
    }
    case 'mask': {
      let bi = -1, bd = 1e9;
      for (let i = 0; i < e.dots.length; i += 3) {
        if (e.dots[i + 2]) continue;
        const d = dist(bot.x, bot.z, e.dots[i], e.dots[i + 1]);
        if (d < bd) { bd = d; bi = i; }
      }
      if (bi < 0) return inp;
      move(bot, seat, inp, e.dots[bi], e.dots[bi + 1], Math.min(fast, 4 + skill * 5));
      inp.use = bd < 0.75 ? 1 : 0;
      return inp;
    }
    default: return inp;
  }
}

/** True when acting now would land in systole (bots look a little ahead). */
function heartRisk(sim) {
  const h = sim.heart;
  return inSystole(sim) || h.phase > 0.93;
}
