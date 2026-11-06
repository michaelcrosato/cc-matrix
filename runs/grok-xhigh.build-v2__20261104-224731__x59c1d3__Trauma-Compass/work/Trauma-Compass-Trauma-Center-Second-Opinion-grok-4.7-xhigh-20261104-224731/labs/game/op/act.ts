/**
 * @file What a hand does to the field for one step. Valid work changes tissue. Anything else is a named refusal
 * and costs nothing. Slips are the exception: the scalpel and the laser wound healthy tissue on purpose.
 */
import { award, heal, POINTS, rateCut, rateInject } from './ratings';
import { pairOf, refusalLine } from './table';
import type { Op, Seat, Target, Tool } from './types';
import { TOOLS } from './types';
import { addTarget, hypot, nearDistance, segmentSide, segmentU } from './world';

/** Reach for "you are on it", metres. */
const REACH = 0.55;

/** Apply every seat's tool for this step. */
export function actAll(op: Op): void {
  for (const seat of op.seats) actSeat(op, seat);
}

/** One seat. */
export function actSeat(op: Op, seat: Seat): void {
  const tool = TOOLS[seat.tool] ?? 'scalpel';
  const use = seat.use && op.status === 'playing' && !op.code;
  const edge = use && !seat.prevUse;
  if (seat.drop) release(op, seat);
  const near = nearest(op, seat, tool);
  if (tool === 'syringe') {
    syringe(op, seat, near, use, edge);
  } else if (near && pairOf(tool, near.kind).effect === 'refuse') {
    if (edge) bark(op, seat, near, refusalLine(tool, near.kind));
    seat.harm = 0;
  } else if (near && use) {
    const applied = apply(op, seat, near, tool, use, edge);
    if (!applied && edge) bark(op, seat, near, specialRefusal(tool, near) || refusalLine(tool, near.kind));
  } else if (use) {
    bodyContact(op, seat, tool);
  } else {
    seat.harm = 0;
  }
  if (!use && seat.hold >= 0) release(op, seat);
  seat.prevUse = seat.use;
  seat.px = seat.x;
  seat.pz = seat.z;
  if (seat.laserCool > 0) seat.laserCool -= 1;
  if (!use && seat.laserHeat > 0) seat.laserHeat = Math.max(0, seat.laserHeat - 1 / 60);
  if (seat.syringeCd > 0) seat.syringeCd -= 1;
}

/** The closest target on this site that this tool is allowed to notice. */
export function nearest(op: Op, seat: Seat, tool: Tool): Target | null {
  let best: Target | null = null;
  let bestD = tool === 'scanner' ? op.balance.scanner : 0.85;
  for (const target of op.targets) {
    if (!notice(op, seat, target, tool)) continue;
    const distance = nearDistance(seat.x, seat.z, target);
    const limit = target.kind === 'solace' ? target.radius + 0.25 : bestD;
    if (distance <= limit && (best === null || distance < bestD)) {
      best = target;
      bestD = distance;
    }
  }
  return best;
}

/** Whether the seat can currently touch this target with this tool. */
function notice(op: Op, seat: Seat, target: Target, tool: Tool): boolean {
  if (target.done || target.site !== seat.site) return false;
  if (target.locked && tool !== 'scanner') return false;
  if (target.hidden && tool !== 'scanner') return false;
  if (target.under >= 0 && !flapOpen(op, target.under)) return false;
  return true;
}

/** A flap is open when it is clipped or held high. */
export function flapOpen(op: Op, id: number): boolean {
  const flap = op.targets.find((target) => target.id === id);
  if (!flap) return true;
  return flap.clipped > 0 || flap.lift >= 0.8 || flap.holder >= 0;
}

/** Run the effect. False means the state refused it (lacquer, armour, the wrong generation). */
function apply(op: Op, seat: Seat, target: Target, tool: Tool, use: boolean, edge: boolean): boolean {
  const effect = pairOf(tool, target.kind).effect;
  if (effect === 'cut') return cut(op, seat, target, use);
  if (effect === 'split') return split(op, seat, target, use);
  if (effect === 'grab') return grab(op, seat, target, use);
  if (effect === 'lift') return lift(op, seat, target, use);
  if (effect === 'stitch') return stitch(op, seat, target, use);
  if (effect === 'drain') return drain(op, seat, target, use);
  if (effect === 'burn') return burn(op, seat, target, use);
  if (effect === 'inject') return inject(op, seat, use, edge);
  if (effect === 'bind') return bind(op, seat, target, use);
  if (effect === 'paint') return paint(op, seat, target, use);
  if (effect === 'reveal') return reveal(op, seat, use);
  if (effect === 'pop') return pop(op, seat, target, use);
  if (effect === 'slip') return slipContact(op, seat, tool, use);
  return false;
}

/** A line for a state the table allows but this moment does not. */
function specialRefusal(tool: Tool, target: Target): string {
  if (tool === 'laser' && target.kind === 'solace' && target.gen < 3)
    return 'Laser will not touch that, Doctor. It likes the warmth.';
  if (tool === 'suture' && target.lacquer) return 'Thread will not hold. Gel that lacquer first.';
  if (tool === 'drain' && target.lacquer) return 'The drain just skates. Gel that lacquer first.';
  if (tool === 'laser' && target.kind === 'reverie' && !target.surfaced)
    return 'It is still under the sheet. Scan, then burn.';
  if (tool === 'syringe' && target.kind === 'matron' && !target.vulnerable)
    return 'The armour is shut. Wait for the yawn.';
  if (tool === 'gel' && target.kind === 'wound' && target.stitches < target.need) return 'Close it before you ice it.';
  if (target.locked) return 'Not yet. Finish the cut.';
  return '';
}

/** Refusal bark. No score, no slip. */
function bark(op: Op, seat: Seat, target: Target | null, text: string): void {
  op.events.push({
    type: 'refusal',
    text,
    x: seat.x,
    z: seat.z,
    tool: TOOLS[seat.tool],
    kind: target?.kind,
    seat: seat.id,
  });
}

/** Draw along a guide. Completing it rates the mean distance. */
function cut(op: Op, seat: Seat, target: Target, use: boolean): boolean {
  if (!use || target.path.length < 4) return false;
  const next = Math.min(target.cut, target.path.length / 2 - 1);
  const nx = target.path[next * 2];
  const nz = target.path[next * 2 + 1];
  const distance = hypot(seat.x, seat.z, nx, nz);
  if (target.cut === 0 && distance > 0.45) return false;
  seat.cutting = target.id;
  target.samples += 1;
  target.distSum += distance;
  if (distance < 0.24) target.cut += 1;
  if (target.cut >= target.path.length / 2) finishCut(op, seat, target);
  return true;
}

/** Rate the cut and unlock whatever it was guarding. */
function finishCut(op: Op, seat: Seat, target: Target): void {
  const mean = target.samples > 0 ? target.distSum / target.samples : 1;
  const rating = rateCut(mean, op.balance.scalpel);
  award(op, seat, rating, POINTS.cut, 'Incision');
  target.done = true;
  if (target.unlock) {
    for (const other of op.targets) if (other.tag === target.unlock) other.locked = false;
  }
  if (target.spawnBleeders > 0) {
    for (let i = 0; i < target.spawnBleeders; i++) {
      addTarget(
        op,
        {
          kind: 'bleeder',
          x: target.x + i * 0.45 - 0.4,
          z: target.z + 0.3,
          site: target.site,
          patient: target.patient,
        },
        target.phase,
      );
    }
  }
  if (target.tag === 'flinch') op.events.push({ type: 'drama', text: 'IT MOVED.' });
  seat.cutting = -1;
}

/** A long scalpel stroke through Solace splits it into the next generation. */
function split(op: Op, seat: Seat, target: Target, use: boolean): boolean {
  if (!use || target.kind !== 'solace') return false;
  const moved = hypot(seat.x, seat.z, seat.px, seat.pz);
  if (hypot(seat.x, seat.z, target.x, target.z) > target.radius + 0.3) return false;
  target.stroke += moved;
  if (target.stroke < 1.5 || target.gen >= 3) return true;
  target.done = true;
  const alive = op.targets.filter((item) => item.kind === 'solace' && !item.done).length;
  if (alive < 12) {
    const gen = target.gen + 1;
    const angle = target.id * 1.7;
    const spread = 1.45;
    addTarget(
      op,
      {
        kind: 'solace',
        x: target.x + Math.cos(angle) * spread,
        z: target.z + Math.sin(angle) * spread,
        gen,
        site: target.site,
        patient: target.patient,
      },
      target.phase,
    );
    if (alive + 1 < 12) {
      addTarget(
        op,
        {
          kind: 'solace',
          x: target.x + Math.cos(angle + 2.2) * spread,
          z: target.z + Math.sin(angle + 2.2) * spread,
          gen,
          site: target.site,
          patient: target.patient,
        },
        target.phase,
      );
    }
  }
  award(op, seat, 'CLEAN', 40, 'Split');
  op.events.push({ type: 'split', text: 'It divides.', x: target.x, z: target.z });
  return true;
}

/** Grab a shard, mass, cocoon, or tendril and pull it free. */
function grab(op: Op, seat: Seat, target: Target, use: boolean): boolean {
  if (!use) return false;
  if (target.holder >= 0 && target.holder !== seat.id) return false;
  if (seat.hold !== target.id) {
    if (hypot(seat.x, seat.z, target.x, target.z) > REACH) return false;
    claim(op, seat, target);
    return true;
  }
  const pulled = hypot(seat.x, seat.z, target.ox, target.oz);
  target.x = seat.x;
  target.z = seat.z;
  if (pulled < op.balance.forceps) return true;
  const speed = hypot(seat.x, seat.z, seat.px, seat.pz) * 60;
  const rating = speed > 8 ? 'ROUGH' : 'CLEAN';
  const base =
    target.kind === 'mass'
      ? POINTS.mass
      : target.kind === 'shard' || target.kind === 'cocoon'
        ? POINTS.shard
        : POINTS.shard;
  award(op, seat, rating, base, 'Retrieved');
  if (rating === 'ROUGH') {
    addTarget(
      op,
      { kind: 'pool', x: seat.x, z: seat.z, volume: 0.8, bleed: 0.3, site: target.site, patient: target.patient },
      target.phase,
    );
  }
  target.done = true;
  if (target.tag === 'flinch') op.events.push({ type: 'drama', text: 'IT MOVED.' });
  release(op, seat);
  return true;
}

/** Lift a flap. High enough, and the clip holds it. */
function lift(op: Op, seat: Seat, target: Target, use: boolean): boolean {
  if (!use) return false;
  if (seat.hold !== target.id) {
    if (hypot(seat.x, seat.z, target.x, target.z) > REACH) return false;
    claim(op, seat, target);
    return true;
  }
  target.x = seat.x;
  target.z = seat.z;
  const pulled = hypot(seat.x, seat.z, target.ox, target.oz);
  target.lift = Math.min(1, pulled / op.balance.forceps);
  if (target.lift >= 0.8) {
    target.clipped = 8 * 6000;
    target.done = true;
  }
  return true;
}

/** Zigzag across a wound. Each crossing that lands far enough from the last is a stitch. */
function stitch(op: Op, seat: Seat, target: Target, use: boolean): boolean {
  if (target.lacquer || target.stitches >= target.need) return !target.lacquer && target.stitches >= target.need;
  if (seat.stitchId !== target.id) {
    seat.stitchId = target.id;
    if (target.stitches === 0) seat.sutureSide = 0;
  }
  if (!use) return false;
  if (segmentU(seat.x, seat.z, target) < 0 && nearDistance(seat.x, seat.z, target) > 0.8) return false;
  if (nearDistance(seat.x, seat.z, target) > 0.8) return false;
  const side = segmentSide(seat.x, seat.z, target);
  if (side !== 0 && seat.sutureSide !== 0 && side !== seat.sutureSide) {
    const at = segmentU(seat.x, seat.z, target);
    const spaced = target.stitchAt.every(
      (prev) =>
        Math.abs(prev - at) * Math.max(0.5, hypot(target.x, target.z, target.x2, target.z2)) >=
        op.balance.suture * 0.85,
    );
    if (spaced) {
      target.stitchAt.push(at);
      target.stitches += 1;
      if (target.stitches >= target.need) finishStitch(op, seat, target);
    }
  }
  if (side !== 0) seat.sutureSide = side;
  return true;
}

/** Rate a closed wound. */
function finishStitch(op: Op, seat: Seat, target: Target): void {
  target.bleeding = false;
  target.done = true;
  const length = Math.max(0.5, hypot(target.x, target.z, target.x2, target.z2));
  const gaps = target.stitchAt.slice().sort((a, b) => a - b);
  let even = true;
  for (let i = 1; i < gaps.length; i++)
    if (Math.abs(gaps[i] - gaps[i - 1]) * length > op.balance.suture * 1.8) even = false;
  award(op, seat, even ? 'TEXTBOOK' : 'CLEAN', POINTS.stitch, 'Closed');
}

/** Shrink a pool. */
function drain(op: Op, seat: Seat, target: Target, use: boolean): boolean {
  if (target.lacquer || !use) return false;
  if (nearDistance(seat.x, seat.z, target) > 0.75) return false;
  target.volume = Math.max(0, target.volume - op.balance.drain / 60);
  if (target.volume <= 0) {
    target.done = true;
    target.bleed = 0;
    award(op, seat, 'CLEAN', POINTS.pool, 'Dry');
  }
  return true;
}

/** Hold a beam on something that burns. */
function burn(op: Op, seat: Seat, target: Target, use: boolean): boolean {
  if (!use) return false;
  if (seat.laserCool > 0) return true;
  if (target.kind === 'solace' && target.gen < 3) return false;
  seat.laserHeat += 1 / 60;
  if (seat.laserHeat >= 6) {
    seat.laserHeat = 0;
    seat.laserCool = 120;
    op.events.push({ type: 'heat', text: 'The laser needs a breath.', seat: seat.id });
    return true;
  }
  if (nearDistance(seat.x, seat.z, target) > 0.5 && hypot(seat.x, seat.z, target.x, target.z) > target.radius + 0.2)
    return false;
  if (target.kind === 'reverie') {
    if (target.hidden) return false;
    if (!target.surfaced) {
      target.surfaced = true;
      target.timer = Math.round(2.2 * 6000);
      target.exposures += 1;
    }
    target.laserDamage += 1 / 60;
    if (target.laserDamage >= target.burnNeed) finishBurn(op, seat, target);
    return true;
  }
  target.burn += 1 / 60;
  if (target.kind === 'balmCell') {
    const patient = op.patients[target.patient];
    if (patient && target.burn < 1 / 60 + 0.001) patient.vitals = Math.max(0, patient.vitals - 0.5);
  }
  if (target.burn >= target.burnNeed) finishBurn(op, seat, target);
  return true;
}

/** A burn finished: pop, kill, or clear. */
function finishBurn(op: Op, seat: Seat, target: Target): void {
  target.done = true;
  const parasite =
    target.kind === 'lull' || target.kind === 'solace' || target.kind === 'mote' || target.kind === 'reverie';
  award(op, seat, 'CLEAN', parasite ? POINTS.parasite : 40, 'Burned');
  if (target.kind === 'lull') {
    addTarget(
      op,
      { kind: 'cocoon', x: target.x, z: target.z, site: target.site, patient: target.patient },
      target.phase,
    );
  }
  if (target.kind === 'mote') op.mercyKills += 1;
  if (target.kind === 'reverie') target.exposures += 1;
}

/** A binder point, a Matron, or a Balm node close enough to dose, preferred over whatever else is near. */
function bindTarget(op: Op, seat: Seat): Target | null {
  let best: Target | null = null;
  let bestD = REACH;
  for (const target of op.targets) {
    if (target.done || target.site !== seat.site) continue;
    if (target.kind !== 'binder' && target.kind !== 'matron' && target.kind !== 'balmNode') continue;
    if (!notice(op, seat, target, 'syringe')) continue;
    const distance = hypot(seat.x, seat.z, target.x, target.z);
    if (distance <= bestD) {
      best = target;
      bestD = distance;
    }
  }
  return best;
}

/** Syringe: binder on a point or a Matron, otherwise the stabiliser. */
function syringe(op: Op, seat: Seat, near: Target | null, use: boolean, edge: boolean): void {
  const bindable =
    bindTarget(op, seat) ??
    (near && (near.kind === 'binder' || near.kind === 'matron' || near.kind === 'balmNode') ? near : null);
  if (bindable) {
    const applied = bind(op, seat, bindable, use);
    if (!applied && edge)
      bark(op, seat, bindable, specialRefusal('syringe', bindable) || refusalLine('syringe', bindable.kind));
    return;
  }
  if (near && pairOf('syringe', near.kind).effect === 'refuse') {
    if (edge) bark(op, seat, near, refusalLine('syringe', near.kind));
    return;
  }
  inject(op, seat, use, edge);
}

/** Charge the stabiliser and inject on release. */
function inject(op: Op, seat: Seat, use: boolean, edge: boolean): boolean {
  if (seat.syringeCd > 0 && !use) return false;
  if (use) {
    seat.syringe = Math.min(1, seat.syringe + 1 / 60);
    return true;
  }
  if (seat.syringe <= 0.02) return false;
  if (edge) return true;
  const rated = rateInject(seat.syringe);
  award(op, seat, rated.rating, 30, 'Stabilised');
  heal(op, seat, rated.vitals);
  op.injected = true;
  seat.syringe = 0;
  seat.syringeCd = 120;
  return true;
}

/** Hold the binder on a marked point, or in a yawning Matron. */
function bind(op: Op, seat: Seat, target: Target, use: boolean): boolean {
  if (target.kind === 'matron' && !target.vulnerable) return false;
  if (target.kind === 'binder' && target.tag === 'gift' && seat.giftLeft <= 0 && seat.lock < 0) return false;
  if (!use) {
    seat.binderHold = 0;
    return false;
  }
  if (hypot(seat.x, seat.z, target.x, target.z) > REACH) return false;
  seat.binderHold += 1;
  if (seat.binderHold < 24) return true;
  seat.binderHold = 0;
  target.dose += 1;
  award(op, seat, 'CLEAN', 40, 'Dose');
  if (target.kind === 'matron') {
    target.hp -= target.hp > 1 ? 1 : target.hp;
    if (target.dose >= target.doseNeed || target.hp <= 0) {
      target.done = true;
      award(op, seat, 'CLEAN', POINTS.parasite, 'Matron');
    }
  } else if (target.dose >= target.doseNeed) {
    target.done = true;
    if (target.kind === 'balmNode') {
      for (const cell of op.targets)
        if (cell.kind === 'balmCell' && cell.patient === target.patient) cell.timer = 6 * 6000;
    }
  }
  op.lastBind = op.tick;
  return true;
}

/** Paint gel. Closed wounds, numb patches, abrasions, and Balm all take it. */
function paint(op: Op, seat: Seat, target: Target, use: boolean): boolean {
  if (!use) return false;
  if (target.kind === 'wound' && target.stitches < target.need) return false;
  if (
    nearDistance(seat.x, seat.z, target) > op.balance.gel &&
    hypot(seat.x, seat.z, target.x, target.z) > op.balance.gel
  )
    return false;
  target.cover += 1;
  if (target.kind === 'balmCell') {
    target.done = true;
    return true;
  }
  if (target.cover >= target.coverNeed) {
    target.done = true;
    target.bleeding = false;
    award(op, seat, 'CLEAN', 25, 'Sealed');
  }
  return true;
}

/** Ping. Buried things within range become visible. Decoys pop. */
function reveal(op: Op, seat: Seat, use: boolean): boolean {
  if (!use) return false;
  let found = false;
  for (const target of op.targets) {
    if (target.done || target.site !== seat.site || !target.hidden) continue;
    if (hypot(seat.x, seat.z, target.x, target.z) > op.balance.scanner) continue;
    target.hidden = false;
    target.reveal = target.kind === 'reverie' ? 6 * 6000 : 0;
    found = true;
    if (target.kind === 'decoy') {
      target.done = true;
      op.events.push({ type: 'pop', text: 'A decoy.', x: target.x, z: target.z });
    } else {
      op.events.push({ type: 'find', text: 'There.', x: target.x, z: target.z, kind: target.kind });
    }
  }
  return found;
}

/** Scanner on a decoy that is already the nearest target. */
function pop(op: Op, seat: Seat, target: Target, use: boolean): boolean {
  if (!use) return false;
  target.hidden = false;
  target.done = true;
  op.events.push({ type: 'pop', text: 'A decoy.', x: target.x, z: target.z, seat: seat.id });
  return true;
}

/** Harmful contact with bare tissue. */
function slipContact(op: Op, seat: Seat, tool: Tool, use: boolean): boolean {
  return bodyContact(op, seat, tool) || use;
}

/** No valid target under the cursor. The knife and the laser can still slip. */
function bodyContact(op: Op, seat: Seat, tool: Tool): boolean {
  if (tool !== 'scalpel' && tool !== 'laser') {
    seat.harm = 0;
    return false;
  }
  if (tool === 'laser' && seat.laserCool > 0) return false;
  seat.harm += 1;
  const limit = tool === 'scalpel' ? 12 : 60;
  if (seat.harm >= limit) {
    seat.harm = 0;
    award(op, seat, 'SLIP', 0, tool === 'scalpel' ? 'Off the line' : 'Healthy tissue');
    addTarget(
      op,
      { kind: 'pool', x: seat.x, z: seat.z, volume: 0.6, bleed: 0.2, site: seat.site, patient: 0 },
      op.phase,
    );
  }
  return true;
}

/** Take a target with the forceps, dropping anything this hand already held. */
function claim(op: Op, seat: Seat, target: Target): void {
  if (seat.hold >= 0 && seat.hold !== target.id) release(op, seat);
  seat.hold = target.id;
  target.holder = seat.id;
  target.ox = seat.x;
  target.oz = seat.z;
}

/** Let go of whatever the forceps hold. */
function release(op: Op, seat: Seat): void {
  if (seat.hold >= 0) {
    const held = op.targets.find((target) => target.id === seat.hold);
    if (held) held.holder = -1;
  }
  seat.hold = -1;
}
