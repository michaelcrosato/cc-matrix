/** @file All eight instruments act on body targets through a complete, explicit response matrix. */
import { RESPONSE, TOOLS } from '../../data/tools';
import type { Operation, Rules, Seat, Target } from '../../data/types';
import { clamp, distanceTo, dist, nearest, pathLength } from './geometry';
import { event, finishTarget, patientAt, rate, slip, spawn } from './state';
export function hidden(s: Operation, t: Target): boolean {
  if (t.parent) {
    const flap = s.targets.find((f) => f.id === t.parent);
    if (flap && !flap.done && flap.lift < 0.8) return true;
  }
  return s.targets.some(
    (p) =>
      p.kind === 'pool' &&
      !p.done &&
      p.site === t.site &&
      p.hp > 0.35 &&
      Math.hypot(p.x - t.x, p.z - t.z) < p.radius * 0.7 &&
      t.kind !== 'pool',
  );
}
export function lacquered(s: Operation, t: Target): boolean {
  return s.targets.some(
    (p) => p.kind === 'balm' && !p.done && p.site === t.site && Math.hypot(p.x - t.x, p.z - t.z) < p.radius,
  );
}
function refuse(s: Operation, seat: Seat, text: string): void {
  if (s.tick - seat.refuseAt < 70) return;
  seat.refuseAt = s.tick;
  event(s, 'refusal', text, seat.x, seat.z);
}
const pickLocked = (p: Seat): boolean => p.grab > 0 && (p.tool === 0 || p.tool === 2);
export function targetAt(s: Operation, seat: Seat): Target | undefined {
  if (pickLocked(seat)) {
    const locked = s.targets.find((t) => t.id === seat.grab && !t.done);
    if (locked) return locked;
  }
  const candidates = s.targets.filter(
    (t) => !t.done && t.site === seat.site && distanceTo(t, seat.x, seat.z) < (t.path.length ? 1.25 : t.radius + 0.45),
  );
  const tool = TOOLS[seat.tool];
  const effective = (t: Target): boolean =>
    RESPONSE[tool][t.kind] === 'effect' &&
    !(t.kind === 'solace' && ((seat.tool === 0 && t.generation === 3) || (seat.tool === 4 && t.generation < 3)));
  return candidates.sort(
    (a, b) =>
      Number(effective(b)) - Number(effective(a)) ||
      Number(b.required) - Number(a.required) ||
      distanceTo(a, seat.x, seat.z) - distanceTo(b, seat.x, seat.z),
  )[0];
}
function extract(s: Operation, r: Rules, p: Seat, t: Target, held: boolean): void {
  if (!p.grab) {
    p.grab = t.id;
    p.start = [p.x, p.z];
    event(s, 'tool', 'GRIP', p.x, p.z, p.id);
  }
  if (t.kind === 'flap') {
    t.lift = clamp(Math.hypot(p.start[0] - p.x, p.start[1] - p.z) / 1.7, 0, 1);
    if (!held) {
      if (t.lift >= 0.8) {
        t.clip = s.fieldTicks + r.balance.clipSeconds * 6000;
        event(s, 'tool', 'FLAP CLIPPED', t.x, t.z);
      } else t.lift = 0;
      p.grab = 0;
    }
    return;
  }
  const travel = dist([p.x, p.z], p.start);
  if (travel >= 1.2) {
    const speed = dist([p.x, p.z], [p.px, p.pz]) * 60;
    finishTarget(s, r, p, t, t.kind === 'mass' ? 300 : t.kind === 'shard' ? 100 : 50, speed > 8 ? 'ROUGH' : 'TEXTBOOK');
    if (speed > 8) spawn(s, { kind: 'bleeder', at: [t.x, t.z], site: t.site, required: false });
    p.grab = 0;
  }
  if (!held) p.grab = 0;
}
function cut(s: Operation, r: Rules, p: Seat, t: Target): void {
  if (t.kind === 'solace') {
    if (t.generation >= 3) {
      refuse(s, p, 'Small enough. Laser now.');
      return;
    }
    if (!p.grab) {
      p.grab = t.id;
      p.start = [p.x, p.z];
    }
    if (dist(p.start, [p.x, p.z]) >= 1.5) {
      t.done = true;
      rate(s, r, p, 'TEXTBOOK', 200);
      for (const sign of [-1, 1])
        spawn(s, {
          kind: 'solace',
          at: [t.x + sign * 0.6, t.z + sign * 0.15],
          site: t.site,
          generation: t.generation + 1,
          parent: t.parent,
        });
      p.grab = 0;
    }
    return;
  }
  if (t.kind === 'mass' && t.dose) {
    refuse(s, p, 'The edge is free. Lift the mass with Forceps.');
    return;
  }
  const n = nearest(t.path, p.x, p.z),
    length = pathLength(t.path);
  if (n.distance >= r.balance.cutTolerance) {
    if (++p.healthy > 12) slip(s, r, p, 'Off the guide. Easy, Doctor.');
    return;
  }
  p.healthy = 0;
  if (t.progress === 0 && n.along > 0.8) {
    refuse(s, p, 'Begin on the first dot. Follow the guide in order.');
    return;
  }
  if (n.along < t.progress + 1.2) {
    t.progress = Math.max(t.progress, n.along);
    t.last += n.distance;
    t.cycle++;
  }
  if (t.progress >= length - 0.18) {
    const mean = t.last / Math.max(1, t.cycle),
      rating = mean < 0.18 ? 'TEXTBOOK' : mean < 0.4 ? 'CLEAN' : 'ROUGH';
    if (t.kind === 'mass') {
      t.dose = 1;
      rate(s, r, p, rating, 200);
      event(s, 'say', 'Forceps. Lift it into the tray.');
    } else finishTarget(s, r, p, t, 200, rating);
  }
}
function sew(s: Operation, r: Rules, p: Seat, t: Target): void {
  if (lacquered(s, t)) {
    refuse(s, p, 'Balm seals the wound. Dissolve it with Gel first.');
    return;
  }
  p.grab = t.id;
  const n = nearest(t.path, p.x, p.z),
    spacing = r.balance.stitchSpacing,
    need = Math.ceil(pathLength(t.path) / spacing);
  if (n.distance < 0.12 || n.distance > 1.2) return;
  if (n.side !== t.last && (t.stitches.length === 0 || dist(t.stitches.at(-1)!, n.point) >= spacing * 0.6)) {
    t.stitches.push(n.point);
    t.last = n.side;
    t.progress = t.stitches.length / need;
    event(s, 'stitch', 'STITCH', n.point[0], n.point[1], p.id);
    s.lastProgress = s.tick;
    if (t.stitches.length >= need) finishTarget(s, r, p, t, 20 * need, t.cycle > need * 130 ? 'CLEAN' : 'TEXTBOOK');
  }
  t.cycle++;
}
function laser(s: Operation, r: Rules, p: Seat, t: Target): void {
  p.healthy = 0;
  if (p.cooldown > 0) return;
  const damage = (r.oneHit ? 100 : r.balance.laserPower) / 60;
  if (t.kind === 'solace' && t.generation < 3) {
    refuse(s, p, 'It likes the warmth. Divide it with the Scalpel first.');
    return;
  }
  if (t.kind === 'reverie') {
    if (t.scanned < s.fieldTicks) {
      refuse(s, p, 'Find its pulse with the Scanner first.');
      return;
    }
    if (t.exposed < s.fieldTicks) {
      t.exposed = s.fieldTicks + 18000;
      t.dose++;
      event(s, 'tool', 'SURFACED', t.x, t.z);
    }
  }
  if (t.kind === 'balm') {
    t.radius -= damage * 0.8;
    s.patients[patientAt(s, p.site)] -= 0.5 / 60;
    if (t.radius < 0.2) finishTarget(s, r, p, t, 30);
    return;
  }
  t.progress += damage;
  const need = t.kind === 'lull' ? 1.5 : t.kind === 'mote' ? 0.6 : t.kind === 'reverie' ? 5 : 1.2;
  if (
    t.progress >=
      need *
        (['lull', 'solace', 'reverie', 'mote'].includes(t.kind)
          ? r.balance.strainHp *
            (r.difficulty === 'Intern' ? 0.75 : r.difficulty === 'Attending' ? 1.25 : 1) *
            (1 + r.balance.coopHp * Math.max(0, s.humans - 1))
          : 1) &&
    (t.kind !== 'reverie' || t.dose >= 3)
  )
    finishTarget(s, r, p, t, ['lull', 'reverie', 'solace'].includes(t.kind) ? 500 : 100);
}
function binder(s: Operation, r: Rules, p: Seat, t: Target): void {
  if (t.kind === 'matron' && (s.fieldTicks - t.born) % 48000 > 15000) {
    refuse(s, p, 'Armoured. Wait for the yawn.');
    return;
  }
  if (t.kind === 'mercy' && s.targets.some((m) => m.kind === 'mote' && !m.done)) {
    refuse(s, p, 'The motes shield her. Laser every one.');
    return;
  }
  if (t.kind === 'binder' && !s.seats.some((seat) => seat.giftUntil > s.tick)) {
    refuse(s, p, 'These points need a Gift. Press Space.');
    return;
  }
  t.progress += 1 / 60;
  p.charge = 0;
  if (t.progress >= 0.4) {
    t.progress = 0;
    t.dose++;
    p.cooldown = 24;
    rate(s, r, p, 'TEXTBOOK', 100);
    event(s, 'binder', 'BINDER', t.x, t.z, p.id);
    const need = t.kind === 'matron' || t.kind === 'node' ? 2 : t.kind === 'mercy' ? 3 : 1;
    if (t.dose >= need) {
      t.done = true;
      rate(s, r, p, 'TEXTBOOK', 500);
      if (t.kind === 'node')
        for (const f of s.targets) if (f.site === t.site && f.kind === 'balm') f.clip = s.fieldTicks + 36000;
    }
  }
}
function gel(s: Operation, r: Rules, p: Seat, t: Target): void {
  if (t.kind === 'balm') {
    t.radius -= 1 / 60;
    if (t.radius < 0.18) finishTarget(s, r, p, t, 30);
    return;
  }
  let sector: number;
  if (t.path.length) sector = Math.round((nearest(t.path, p.x, p.z).along / pathLength(t.path)) * 11);
  else sector = Math.floor(((Math.atan2(p.z - t.z, p.x - t.x) + Math.PI) / (2 * Math.PI)) * 12) % 12;
  for (let i = sector - 1; i <= sector + 1; i++) {
    if (t.path.length && dist(t.path[0], t.path.at(-1)!) > 0.1) {
      if (i >= 0 && i <= 11) t.mask |= 1 << i;
    } else t.mask |= 1 << ((i + 12) % 12);
  }
  t.progress += 1 / 60;
  const count = t.mask.toString(2).replaceAll('0', '').length;
  if (count >= 11 && t.progress > 0.35) finishTarget(s, r, p, t, 50);
}
export function useTool(s: Operation, r: Rules, p: Seat, held: boolean): void {
  const was = p.held;
  p.held = held;
  p.cooldown = Math.max(0, p.cooldown - 1);
  if (!held) p.heat = Math.max(0, p.heat - 2 / 60);
  if (p.tool === 4 && held) {
    if (p.cooldown > 0) return;
    p.heat += 1 / 60;
    if (p.heat >= r.balance.laserHeat) {
      p.cooldown = 120;
      p.heat = 0;
      event(s, 'say', 'Laser overheated. Two seconds, Doctor.');
      return;
    }
  }
  if (p.tool === 5 && !held && was && p.charge > 0 && p.cooldown === 0) {
    const dose =
      p.charge >= 0.75 && p.charge <= 0.95
        ? 24
        : p.charge > 0.95
          ? 6
          : r.balance.stabilizer * Math.min(1, p.charge / 0.75);
    s.patients[patientAt(s, p.site)] = Math.min(100, s.patients[patientAt(s, p.site)] + dose);
    rate(s, r, p, dose === 24 ? 'TEXTBOOK' : dose >= 12 ? 'CLEAN' : 'ROUGH', 20);
    event(s, 'inject', `+${Math.round(dose)} VITALS`, p.x, p.z);
    p.charge = 0;
    p.cooldown = 120;
  }
  if (p.grab && p.tool === 1) {
    const grab = s.targets.find((t) => t.id === p.grab && !t.done);
    if (grab) {
      extract(s, r, p, grab, held);
      return;
    }
    p.grab = 0;
  }
  if (!held) {
    if (p.tool !== 0 && p.tool !== 2) p.grab = 0;
    return;
  }
  if (p.tool === 7) {
    for (const t of s.targets)
      if (!t.done && t.site === p.site && Math.hypot(t.x - p.x, t.z - p.z) <= 3 && !hidden(s, t)) {
        if (t.buried && t.scanned < s.fieldTicks) {
          event(s, 'scan', 'FOUND', t.x, t.z);
          rate(s, r, p, 'CLEAN', 30);
        }
        t.scanned = s.fieldTicks + 36000;
        if (t.kind === 'decoy') finishTarget(s, r, p, t, 30);
      }
    return;
  }
  const t = targetAt(s, p);
  if (p.tool === 5) {
    if (p.cooldown > 0) return;
    if (t && ['matron', 'node', 'mercy', 'binder'].includes(t.kind) && !hidden(s, t)) {
      binder(s, r, p, t);
      return;
    }
    p.charge = clamp(p.charge + 1 / 60, 0, 1.2);
    return;
  }
  if (!t) {
    if (p.tool === 0) {
      p.healthy++;
      if (p.healthy > 12) slip(s, r, p, 'There is no incision guide here.');
    }
    if (p.tool === 4) {
      if (Math.hypot(p.start[0] - p.x, p.start[1] - p.z) > 0.3) {
        p.healthy = 0;
        p.start = [p.x, p.z];
      }
      p.healthy++;
      if (p.healthy > 60) {
        slip(s, r, p, 'That is healthy tissue. Move the beam.');
        p.healthy = 0;
      }
    }
    return;
  }
  if (hidden(s, t)) {
    refuse(s, p, t.parent ? 'Lift the flap with Forceps.' : 'Blood hides it. Drain the pool first.');
    return;
  }
  if (t.buried && t.scanned < s.fieldTicks) {
    refuse(s, p, 'It is below the surface. Scanner first.');
    return;
  }
  if (RESPONSE[TOOLS[p.tool]][t.kind] !== 'effect') {
    refuse(s, p, RESPONSE[TOOLS[p.tool]][t.kind]);
    return;
  }
  switch (p.tool) {
    case 0:
      cut(s, r, p, t);
      break;
    case 1:
      if (t.kind === 'mass' && !t.dose) refuse(s, p, 'Cut all the way around the mass first.');
      else extract(s, r, p, t, held);
      break;
    case 2:
      sew(s, r, p, t);
      break;
    case 3:
      if (lacquered(s, t)) {
        refuse(s, p, 'Gel the lacquer first.');
        break;
      }
      t.hp -= r.balance.drainRate / 70;
      if (t.hp <= 0.04) finishTarget(s, r, p, t, 30);
      break;
    case 4:
      laser(s, r, p, t);
      break;
    case 6:
      gel(s, r, p, t);
      break;
  }
}
