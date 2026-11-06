/** @file A surgeon bot uses the same quantized hands as humans, for proof, attract and the AI colleague. */
import { getCase } from './data/cases';
import { recommended } from './data/tools';
import type { Hand, Operation, Point, Rules, Target } from './data/types';
import { clamp, dist, pathAt, pathLength } from './scenes/op/geometry';
import { beatPeriod, shockLevel } from './scenes/op/gift';
import { hidden, lacquered } from './scenes/op/tools';
export function botHand(s: Operation, id = 0, rules?: Rules, limited = false): Hand {
  const p = s.seats[id],
    c = getCase(s.caseId),
    phase = c.phases[s.phase];
  const h: Hand = [p.x, p.z, p.tool, 0, p.giftCounter, p.shockCounter, p.site, p.swapCounter, 0];
  const go = (point: Point, tool: number, use = true, site = p.site): Hand => {
    const d = dist([p.x, p.z], point),
      speed = limited ? 0.06 : 0.095,
      ratio = d > speed ? speed / d : 1;
    h[0] = p.x + (point[0] - p.x) * ratio;
    h[1] = p.z + (point[1] - p.z) * ratio;
    h[2] = tool;
    h[3] = use ? 1 : 0;
    h[6] = site;
    return h;
  };
  if (s.code) {
    const v = shockLevel(s);
    if (v >= 0.7 && v <= 0.8) h[5]++;
    return h;
  }
  if (p.pulseAt) {
    const period = beatPeriod(s);
    if ((s.tick + 1) % period < 2 && s.tick - p.pulseAt > period * (p.beats + 0.5)) h[4]++;
  } else if (
    p.gift > 0 &&
    p.giftUntil <= s.tick &&
    ((!limited && phase.gift) ||
      s.patients.some((v) => v < 28) ||
      s.seats.some((q) => q.id !== id && (q.giftUntil > s.tick || q.pulseAt > 0)))
  ) {
    h[4]++;
  }
  if (limited && s.seats.some((q) => q.giftUntil > s.tick) && p.gift > 0 && p.giftUntil <= s.tick) h[4]++;
  if (p.tool === 5 && p.charge > 0) {
    h[2] = 5;
    h[3] = p.charge < 0.85 ? 1 : 0;
    return h;
  }
  if (!limited && p.cooldown === 0 && Math.min(...s.patients) < 48) {
    h[2] = 5;
    h[0] = 6.8;
    h[1] = 3.35;
    h[3] = 1;
    if (s.patients.length > 1) h[6] = s.patients.indexOf(Math.min(...s.patients));
    return h;
  }
  const live = s.targets.filter((t) => !t.done && t.kind !== 'flap');
  if (p.grab && p.tool === 1) {
    const t = s.targets.find((t) => t.id === p.grab && !t.done);
    if (t) {
      if (t.kind === 'flap') {
        if (t.lift > 0.85 && !limited) {
          h[3] = 0;
          return h;
        }
        return go([p.start[0], Math.max(-3.35, p.start[1] - 1.75)], 1, true, t.site);
      }
      return go([clamp(p.start[0] + 1.28, -7, 7), p.start[1]], 1, true, t.site);
    }
  }
  const flap = live
    .map((t) => (t.parent ? s.targets.find((f) => f.id === t.parent && !f.done) : undefined))
    .find((f) => f && f.lift < 0.8);
  if (flap) return go([flap.x, flap.z], 1, true, flap.site);
  let candidates = live;
  if (limited)
    candidates = live.filter(
      (t) =>
        ['pool', 'bleeder', 'numb', 'abrasion', 'mote', 'cocoon', 'shard'].includes(t.kind) ||
        (t.kind === 'solace' && t.generation === 3),
    );
  const priority = (t: Target): number =>
    hidden(s, t)
      ? 100
      : t.kind === 'balm'
        ? 0
        : t.kind === 'pool'
          ? 1
          : t.kind === 'mote'
            ? 2
            : t.kind === 'wound' && t.deep && t.required
              ? 3
              : t.required
                ? 4
                : 9;
  candidates.sort((a, b) => priority(a) - priority(b) || a.id - b.id);
  const assigned = candidates.filter((t, i) =>
    !limited && s.seats.filter((q) => q.active).length > 1 ? i % Math.min(2, s.seats.length) === id % 2 : true,
  );
  const locked =
    (p.tool === 0 || p.tool === 2) && p.grab ? s.targets.find((t) => t.id === p.grab && !t.done) : undefined;
  const t = locked ?? assigned[0] ?? candidates[0];
  if (!t) return h;
  if (hidden(s, t)) {
    const pool = live.find((p) => p.kind === 'pool' && p.site === t.site);
    if (pool) return go([pool.x, pool.z], 3, true, pool.site);
    return h;
  }
  if (lacquered(s, t) && ['wound', 'pool'].includes(t.kind)) {
    const film = live.find((f) => f.kind === 'balm' && f.site === t.site);
    if (film) return go([film.x, film.z], 6, true, film.site);
  }
  if (t.buried && t.scanned < s.fieldTicks + 500) return go([t.x, t.z], 7, true, t.site);
  let tool = recommended(t.kind),
    point: Point = [t.x, t.z],
    use = true;
  if (t.kind === 'incision' || (t.kind === 'mass' && !t.dose)) {
    tool = 0;
    point = pathAt(t.path, t.progress + 0.065);
    use = dist([p.x, p.z], point) < 0.25;
  }
  if (t.kind === 'mass' && t.dose) tool = 1;
  if (t.kind === 'solace') {
    tool = t.generation < 3 ? 0 : 4;
    if (tool === 0) {
      if (!p.grab) point = [t.x - 0.78, t.z];
      else point = [p.start[0] + 1.58, p.start[1]];
      use = dist([p.x, p.z], point) < 0.15 || p.grab === t.id;
    }
  }
  if (t.kind === 'wound') {
    const n = t.stitches.length,
      total = pathLength(t.path),
      along = clamp(n * (rules?.balance.stitchSpacing ?? 0.45) + 0.02, 0.02, total - 0.04),
      base = pathAt(t.path, along),
      next = pathAt(t.path, along + 0.02),
      dx = next[0] - base[0],
      dz = next[1] - base[1],
      length = Math.hypot(dx, dz) || 1,
      side = t.last >= 0 ? -0.58 : 0.58;
    point = [base[0] - (dz / length) * side, base[1] + (dx / length) * side];
    use = dist([p.x, p.z], point) < 0.13;
  }
  if (t.kind === 'abrasion' || t.kind === 'numb') {
    let bit = 0;
    while (bit < 12 && t.mask & (1 << bit)) bit++;
    if (t.path.length) point = pathAt(t.path, pathLength(t.path) * Math.min(0.985, (Math.min(11, bit) + 0.1) / 11));
    else {
      const a = ((Math.min(11, bit) + 0.5) / 12) * Math.PI * 2 - Math.PI;
      point = [t.x + Math.cos(a) * 0.4, t.z + Math.sin(a) * 0.4];
    }
  }
  if (t.kind === 'reverie') tool = t.scanned < s.fieldTicks + 500 ? 7 : 4;
  if (t.kind === 'matron' && (s.fieldTicks - t.born) % 48000 > 14500) use = false;
  if (t.kind === 'binder' && !s.seats.some((q) => q.giftUntil > s.tick)) {
    if (p.gift === 0 && p.giftUntil > s.tick) return h;
    use = false;
  }
  if (tool === 1 && !p.grab) use = dist([p.x, p.z], point) < 0.15;
  return go(point, tool, use, t.site);
}
export function botHands(s: Operation, rules?: Rules): Hand[] {
  return s.seats.map((p) => botHand(s, p.id, rules));
}
