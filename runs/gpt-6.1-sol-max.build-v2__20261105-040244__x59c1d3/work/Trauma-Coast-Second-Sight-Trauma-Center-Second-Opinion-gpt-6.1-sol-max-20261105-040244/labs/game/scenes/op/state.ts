/** @file Operation creation, target creation and visible scoring events, with no page dependencies. */
import { getCase } from '../../data/cases';
import { defaults } from '../../data/balance';
import type { Operation, Point, Rating, Rules, Seat, Spawn, Target } from '../../data/types';
export const defaultRules = (): Rules => ({
  balance: defaults(),
  difficulty: 'Resident',
  simpleGift: false,
  attract: false,
  freezeVitals: false,
  freezeClock: false,
  infiniteGift: false,
  oneHit: false,
});
export const patientAt = (s: Operation, site: number): number => (s.patients.length > 1 ? site : 0);
export function event(s: Operation, type: string, text: string, x = 0, z = 0, seat = 0): void {
  s.events.push({ n: ++s.eventId, type, text, x, z, seat });
  if (s.events.length > 48) s.events.shift();
}
export function seat(id: number, kind: 'still' | 'pulse' | 'none', gift: number): Seat {
  return {
    id,
    x: 0,
    z: 0,
    px: 0,
    pz: 0,
    site: 0,
    tool: 3,
    held: false,
    charge: 0,
    cooldown: 0,
    heat: 0,
    healthy: 0,
    lastSlip: -1000,
    refuseAt: -1000,
    grab: 0,
    start: [0, 0],
    gift,
    giftUntil: 0,
    giftStarted: 0,
    lastBeat: -1,
    giftKind: kind,
    pulseAt: 0,
    beats: 0,
    perfect: 0,
    good: 0,
    giftCounter: 0,
    shockCounter: 0,
    swapCounter: 0,
    score: 0,
    slips: 0,
    chain: 1,
    best: 1,
    active: true,
  };
}
export function spawn(s: Operation, spec: Spawn): Target {
  let p: Point = spec.at ?? spec.path?.[0] ?? [0, 0];
  if (['pool', 'shard', 'nodule'].includes(spec.kind)) {
    const jitter = ((Math.imul(s.seed + s.nextId, 1103515245) >>> 0) % 1000) / 1000 - 0.5;
    p = [p[0] + jitter * 0.25, p[1] - jitter * 0.2];
  }
  const t: Target = {
    kind: spec.kind,
    site: spec.site ?? 0,
    deep: spec.deep ?? false,
    buried: spec.buried ?? false,
    generation: spec.generation ?? 1,
    parent: spec.parent ?? 0,
    required: spec.required ?? true,
    radius: spec.radius ?? 0.65,
    hp: spec.hp ?? 1,
    id: s.nextId++,
    x: p[0],
    z: p[1],
    baseX: p[0],
    baseZ: p[1],
    path: spec.path?.map((p) => [...p]) ?? [],
    progress: 0,
    done: false,
    born: s.fieldTicks,
    exposed: 0,
    scanned: 0,
    cycle: 0,
    lift: 0,
    clip: 0,
    dose: 0,
    mask: 0,
    last: 0,
    stitches: [],
  };
  if (t.parent === -1)
    t.parent = [...s.targets].reverse().find((f) => f.kind === 'flap' && f.site === t.site && !f.done)?.id ?? 0;
  if (t.kind === 'flap') t.required = false;
  if (t.kind === 'lull') t.hp = 1.5;
  if (t.kind === 'reverie') {
    t.hp = 5;
    t.buried = true;
  }
  if (t.kind === 'solace') t.radius = [0.9, 0.6, 0.35][t.generation - 1] ?? 0.35;
  if (t.kind === 'balm') t.radius = spec.radius ?? 1.1;
  if (t.kind === 'mass') t.radius = 1.3;
  s.targets.push(t);
  return t;
}
export function startPhase(s: Operation, phase: number): void {
  const c = getCase(s.caseId);
  s.phase = phase;
  s.phaseAt = s.fieldTicks;
  s.phaseWait = 0;
  const p = c.phases[phase];
  if (c.id === 'crosstalk' && p.code && s.codes[0] > 0) {
    startPhase(s, phase + 1);
    return;
  }
  s.hint = p.hint;
  s.lastProgress = s.tick;
  for (const t of s.targets) if (t.kind === 'flap') t.done = true;
  for (const spec of p.spawn) spawn(s, spec);
  const candidates = p.spawn.filter((x) => ['pool', 'shard', 'wound', 'lull', 'nodule', 'mote'].includes(x.kind));
  for (let i = 0; i < Math.ceil(candidates.length * 0.25 * (s.humans - 1)); i++) {
    const spec = candidates[i % candidates.length],
      offset = i % 2 ? -0.5 : 0.5,
      at: Point = [
        Math.max(-6, Math.min(6, (spec.at?.[0] ?? 0) + offset)),
        Math.max(-2.5, Math.min(2.5, (spec.at?.[1] ?? 0) + 0.6)),
      ];
    spawn(s, { ...spec, at, path: spec.path?.map((p) => [p[0] + offset, p[1] + 0.6]) });
  }
  if (p.goal === 'stabilize') s.patients[0] = 40;
  if (p.gift && s.seats[0].gift === 0) s.seats[0].gift = 1;
  if (p.close) {
    for (const t of s.targets) if (!t.done && t.kind !== 'flap') t.required = true;
  }
  if (p.code) {
    s.patients[0] = 0;
    s.code = {
      patient: 0,
      until: s.fieldTicks + 48000,
      tries: 0,
      scripted: true,
      needsAll: !!p.allPaddles,
      shockSeats: [],
    };
    event(s, 'code', 'CODE. Both triggers, in the green band.');
  }
  if (p.drama) event(s, 'drama', p.drama);
  event(s, 'phase', p.title);
}
export function createOperation(id: string, seed = 1, humanSeats = 1, phase = 0, rules = defaultRules()): Operation {
  const c = getCase(id),
    n = c.id === 'gala-night' || c.id === 'gala-shift' ? c.sites.length : 1;
  const s: Operation = {
    caseId: c.id,
    humans: humanSeats,
    difficulty: rules.difficulty,
    seed,
    tick: 0,
    fieldTicks: 0,
    phase: 0,
    phaseAt: 0,
    phaseWait: 0,
    status: 'playing',
    reason: '',
    patients: Array.from({ length: n }, () => c.vitals),
    left: Math.round(
      c.seconds *
        6000 *
        (rules.difficulty === 'Intern' ? 1.3 : rules.difficulty === 'Attending' ? 0.85 : 1) *
        rules.balance.clock,
    ),
    clockScale: rules.balance.clock,
    targets: [],
    seats: Array.from({ length: humanSeats }, (_, i) =>
      seat(
        i,
        i > 1 ? 'none' : i === 0 ? (c.lead === 'wren' ? 'still' : 'pulse') : c.lead === 'wren' ? 'pulse' : 'still',
        c.gift,
      ),
    ),
    nextId: 1,
    score: 0,
    chain: 1,
    best: 1,
    slips: 0,
    rating: '',
    eventId: 0,
    events: [],
    lastProgress: 0,
    hint: '',
    code: null,
    codes: Array.from({ length: n }, () => 0),
    bossRound: 0,
    consultUntil: 0,
    retry: phase > 0,
    dev: false,
  };
  if (c.ai && humanSeats === 1) s.seats.push(seat(1, c.lead === 'wren' ? 'pulse' : 'still', c.gift));
  startPhase(s, Math.min(phase, c.phases.length - 1));
  return s;
}
export function rate(
  s: Operation,
  rules: Rules,
  seat: Seat,
  rating: Rating,
  base: number,
  x = seat.x,
  z = seat.z,
): void {
  const quality = { TEXTBOOK: 1.5, CLEAN: 1, ROUGH: 0.5, SLIP: 0 }[rating];
  if (quality >= 1) {
    const add = seat.giftUntil > s.tick && seat.giftKind === 'pulse' ? 0.2 : 0.1;
    s.chain = Math.min(2, s.chain + add);
    seat.chain = Math.min(2, seat.chain + add);
  }
  const points = Math.round(base * quality * s.chain);
  s.score += points;
  seat.score += points;
  s.best = Math.max(s.best, s.chain);
  seat.best = Math.max(seat.best, seat.chain);
  s.rating = rating;
  s.lastProgress = s.tick;
  if (seat.giftUntil > s.tick && seat.giftKind === 'pulse')
    s.patients[patientAt(s, seat.site)] = Math.min(100, s.patients[patientAt(s, seat.site)] + rules.balance.pulseHeal);
  event(s, 'rating', rating, x, z, seat.id);
}
export function finishTarget(
  s: Operation,
  rules: Rules,
  seat: Seat,
  t: Target,
  base = 100,
  rating: Rating = 'TEXTBOOK',
): void {
  t.done = true;
  if (['shard', 'mass', 'cocoon'].includes(t.kind)) t.last = s.tick;
  rate(s, rules, seat, rating, base, t.x, t.z);
  if (t.kind === 'wound' || t.kind === 'incision')
    spawn(s, {
      kind: t.kind === 'incision' ? 'wound' : 'abrasion',
      at: [t.x, t.z],
      path: t.path,
      site: t.site,
      required: getCase(s.caseId).phases[s.phase].close === true,
    });
  if (t.kind === 'lull') spawn(s, { kind: 'cocoon', at: [t.x, t.z], site: t.site });
}
export function fail(s: Operation, reason: string): void {
  s.status = 'lost';
  s.reason = reason;
  event(s, 'lost', reason);
}
export function slip(s: Operation, rules: Rules, seat: Seat, text: string): void {
  if (s.tick - seat.lastSlip < 60) return;
  seat.lastSlip = s.tick;
  s.slips++;
  seat.slips++;
  s.chain = 1;
  seat.chain = 1;
  s.patients[patientAt(s, seat.site)] -= 6;
  rate(s, rules, seat, 'SLIP', 0);
  event(s, 'say', text, seat.x, seat.z);
  spawn(s, {
    kind: 'wound',
    at: [seat.x, seat.z],
    path: [
      [seat.x - 0.6, seat.z],
      [seat.x + 0.6, seat.z],
    ],
    site: seat.site,
    required: false,
  });
  const limit =
    rules.balance.slipLimit !== 5
      ? rules.balance.slipLimit
      : rules.difficulty === 'Intern'
        ? 10
        : rules.difficulty === 'Attending'
          ? 3
          : 5;
  if (s.slips > limit && !rules.attract) fail(s, 'Too many slips. Hand over the instruments.');
}
export function scoreTotal(s: Operation): number {
  return (
    s.score +
    Math.ceil(s.left / 6000) * 10 +
    Math.round(Math.min(...s.patients)) * 20 +
    (s.slips === 0 ? 2000 : 0) +
    (s.seats[0].gift ? 1000 : 0)
  );
}
export function rank(s: Operation): string {
  const c = getCase(s.caseId),
    total = scoreTotal(s);
  let result = total >= c.ranks[3] ? 'S' : total >= c.ranks[2] ? 'A' : total >= c.ranks[1] ? 'B' : 'C';
  if (result === 'S' && s.slips === 0 && s.difficulty === 'Attending') result = '★';
  if (s.retry && ['A', 'S', '★'].includes(result)) result = 'B';
  return result;
}
