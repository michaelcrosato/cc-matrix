/**
 * @file Building an operation: targets, distance, the state hash, and `createFromCase`. Field time is 6000 ticks
 * a second (100 per step). Hands arrive already in metres. Nothing here reads the wall clock.
 */
import { defaultBalance, diffOf } from './balance';
import { caseById } from './cases';
import type { CaseDef, Difficulty, Hand, Kind, Op, PhaseDef, Seat, Spawn, Target } from './types';

/** Bosses and flaps are not copied for extra surgeons. Their HP still scales. */
const UNIQUE_KIND = new Set(['matron', 'mercy', 'reverie', 'balmNode', 'flap', 'solace']);

/** Field ticks in one real second at full speed. */
export const FIELD_SECOND = 6000;

/** A number stable across Node and the browser: three decimal places. */
export function q(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Distance between two points on the sheet. */
export function hypot(x: number, z: number, x2: number, z2: number): number {
  return Math.hypot(x - x2, z - z2);
}

/** Distance from a point to a wound segment. */
export function segmentDistance(x: number, z: number, target: Target): number {
  const dx = target.x2 - target.x;
  const dz = target.z2 - target.z;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-6) return hypot(x, z, target.x, target.z);
  let u = ((x - target.x) * dx + (z - target.z) * dz) / len2;
  u = Math.max(0, Math.min(1, u));
  return hypot(x, z, target.x + dx * u, target.z + dz * u);
}

/** Which side of a wound the cursor is on. 0 when it sits on the line. */
export function segmentSide(x: number, z: number, target: Target): number {
  const cross = (target.x2 - target.x) * (z - target.z) - (target.z2 - target.z) * (x - target.x);
  if (Math.abs(cross) < 0.02) return 0;
  return cross > 0 ? 1 : -1;
}

/** Fraction along a wound, 0 at the start and 1 at the end. */
export function segmentU(x: number, z: number, target: Target): number {
  const dx = target.x2 - target.x;
  const dz = target.z2 - target.z;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-6) return 0;
  return Math.max(0, Math.min(1, ((x - target.x) * dx + (z - target.z) * dz) / len2));
}

/** How close a cursor is to a target, using the segment for wounds and the polyline for guides. */
export function nearDistance(x: number, z: number, target: Target): number {
  if (target.kind === 'wound') return segmentDistance(x, z, target);
  if (target.kind === 'guide' && target.path.length >= 4) {
    let best = Infinity;
    for (let i = 0; i < target.path.length; i += 2) {
      best = Math.min(best, hypot(x, z, target.path[i], target.path[i + 1]));
    }
    return best;
  }
  return hypot(x, z, target.x, target.z);
}

/** An empty target. Callers overwrite the fields they care about. */
export function blankTarget(id: number, kind: Kind, x: number, z: number): Target {
  return {
    id,
    kind,
    phase: 0,
    site: 0,
    patient: 0,
    x,
    z,
    x2: x + 1,
    z2: z,
    done: false,
    tag: '',
    under: -1,
    locked: false,
    hidden: false,
    reveal: 0,
    volume: 0,
    volumeMax: 0,
    bleed: 0,
    deep: false,
    bleeding: false,
    lacquer: false,
    stitches: 0,
    need: 0,
    stitchAt: [],
    path: [],
    cut: 0,
    samples: 0,
    distSum: 0,
    loop: false,
    burn: 0,
    burnNeed: 1,
    hp: 1,
    gen: 1,
    radius: 0.45,
    stroke: 0,
    cover: 0,
    coverNeed: 18,
    lift: 0,
    clipped: 0,
    vulnerable: false,
    dose: 0,
    doseNeed: 1,
    surfaced: false,
    exposures: 0,
    laserDamage: 0,
    timer: 0,
    telegraph: 0,
    spawnBleeders: 0,
    unlock: '',
    holder: -1,
    ox: x,
    oz: z,
    optional: false,
  };
}

/** Kind defaults so a spawn line stays short. */
function kindDefaults(target: Target, hpScale: number): void {
  if (target.kind === 'pool') {
    target.volume = target.volume || 2.2;
    target.volumeMax = target.volume;
    target.bleed = target.bleed || 0.45;
  } else if (target.kind === 'wound') {
    target.bleeding = true;
    const length = Math.max(0.5, hypot(target.x, target.z, target.x2, target.z2));
    target.need = target.need || Math.max(2, Math.ceil(length / 0.45));
    target.bleed = target.deep ? 1.2 : 0.45;
  } else if (target.kind === 'guide') {
    target.burnNeed = 0;
  } else if (target.kind === 'nodule') {
    target.burnNeed = 1.2 * hpScale;
  } else if (target.kind === 'bleeder') {
    target.burnNeed = 0.35;
    target.bleed = 0.25;
  } else if (target.kind === 'lull') {
    target.burnNeed = 1.5 * hpScale;
    target.radius = 0.45;
    target.timer = 0;
  } else if (target.kind === 'matron') {
    target.hp = 2 * hpScale;
    target.doseNeed = 2;
    target.radius = 1.2;
    target.timer = 0;
  } else if (target.kind === 'solace') {
    target.burnNeed = 1 * hpScale;
    target.radius = target.gen <= 1 ? 0.9 : target.gen === 2 ? 0.6 : 0.35;
    target.hp = target.radius;
  } else if (target.kind === 'mote') {
    target.burnNeed = 0.6 * hpScale;
    target.radius = 0.28;
  } else if (target.kind === 'reverie') {
    target.hidden = true;
    target.burnNeed = 5 * hpScale;
    target.radius = 0.4;
  } else if (target.kind === 'decoy') {
    target.hidden = true;
  } else if (target.kind === 'mass') {
    target.hidden = target.hidden || target.locked;
  } else if (target.kind === 'binder') {
    target.doseNeed = target.doseNeed || 1;
  } else if (target.kind === 'abrasion' || target.kind === 'numb') {
    target.coverNeed = target.coverNeed || 16;
    target.radius = 0.55;
  } else if (target.kind === 'balmCell') {
    target.burnNeed = 0.2;
    target.radius = 0.25;
  } else if (target.kind === 'balmNode') {
    target.doseNeed = 2;
    target.radius = 0.4;
  } else if (target.kind === 'flap') {
    target.radius = 0.35;
  } else if (target.kind === 'mercy') {
    target.radius = 1.4;
    target.hp = 3;
  } else if (target.kind === 'tendril') {
    target.radius = 0.3;
  }
}

/** Add a target to an operation and return it. */
export function addTarget(op: Op, spawn: Spawn, phase: number): Target {
  const hpScale = diffOf(op.difficulty).hp * op.balance.strainHp * coopScale(op);
  const target = blankTarget(op.nextId, spawn.kind, spawn.x, spawn.z);
  op.nextId += 1;
  target.phase = phase;
  target.site = spawn.site ?? 0;
  target.patient = spawn.patient ?? Math.min(target.site, Math.max(0, op.patients.length - 1));
  if (spawn.x2 !== undefined) target.x2 = spawn.x2;
  if (spawn.z2 !== undefined) target.z2 = spawn.z2;
  if (spawn.volume !== undefined) target.volume = spawn.volume;
  if (spawn.bleed !== undefined) target.bleed = spawn.bleed;
  if (spawn.deep) target.deep = true;
  if (spawn.path) target.path = spawn.path.slice();
  if (spawn.loop) target.loop = true;
  if (spawn.hp !== undefined) target.hp = spawn.hp;
  if (spawn.gen !== undefined) target.gen = spawn.gen;
  if (spawn.hidden !== undefined) target.hidden = spawn.hidden;
  if (spawn.tag) target.tag = spawn.tag;
  if (spawn.under !== undefined) target.under = spawn.under;
  if (spawn.locked) target.locked = true;
  if (spawn.need !== undefined) target.need = spawn.need;
  if (spawn.burnNeed !== undefined) target.burnNeed = spawn.burnNeed;
  if (spawn.doseNeed !== undefined) target.doseNeed = spawn.doseNeed;
  if (spawn.coverNeed !== undefined) target.coverNeed = spawn.coverNeed;
  if (spawn.radius !== undefined) target.radius = spawn.radius;
  if (spawn.unlock) target.unlock = spawn.unlock;
  if (spawn.spawnBleeders) target.spawnBleeders = spawn.spawnBleeders;
  if (spawn.optional) target.optional = true;
  kindDefaults(target, hpScale);
  if (spawn.burnNeed !== undefined) target.burnNeed = spawn.burnNeed * hpScale;
  op.targets.push(target);
  return target;
}

/** Parasite HP scale for extra surgeons. One surgeon is 1. */
export function coopScale(op: Op): number {
  return 1 + op.balance.coopHp * Math.max(0, op.seats.length - 1);
}

/** A seat at the centre of the field. */
export function makeSeat(id: number, gift: Seat['gift'], charges: number): Seat {
  return {
    id,
    x: 0,
    z: 0,
    site: 0,
    tool: 0,
    use: false,
    prevUse: false,
    prevPaddle: false,
    drop: false,
    score: 0,
    chain: 0,
    bestChain: 1,
    gift,
    charges,
    giftLeft: 0,
    giftKind: '',
    lock: -1,
    lockBeat: 0,
    lockGood: 0,
    lockPerfect: 0,
    syringe: 0,
    syringeCd: 0,
    laserHeat: 0,
    laserCool: 0,
    harm: 0,
    hold: -1,
    cutting: -1,
    sutureSide: 0,
    stitchId: -1,
    binderHold: 0,
    lastGift: -9999,
    px: 0,
    pz: 0,
    memo: '',
  };
}

/** A hand that changes nothing: stay, let go. */
export function idleHand(seat: Seat): Hand {
  return {
    x: seat.x,
    z: seat.z,
    tool: seat.tool,
    use: false,
    drop: false,
    gift: false,
    paddle: false,
    site: -1,
    swap: false,
    hint: false,
  };
}

/** Build an operation from a case. `seats` includes only human or bot seats, not the colleague. */
export function createFromCase(
  id: string,
  opts: {
    seed?: number;
    difficulty?: Difficulty;
    seats?: number;
    attract?: boolean;
    simple?: boolean;
    gift?: Seat['gift'];
    colleague?: boolean;
  },
): Op {
  const def = caseById(id);
  return createFromDef(def, opts);
}

/** Build an operation from an already-resolved case definition. */
export function createFromDef(
  def: CaseDef,
  opts: {
    seed?: number;
    difficulty?: Difficulty;
    seats?: number;
    attract?: boolean;
    simple?: boolean;
    gift?: Seat['gift'];
    colleague?: boolean;
  } = {},
): Op {
  const difficulty = opts.difficulty ?? 'resident';
  const diff = diffOf(difficulty);
  const seats = Math.max(1, Math.min(4, opts.seats ?? 1));
  const op = emptyOp(def, difficulty, opts.seed ?? 1, seats, opts.gift);
  op.attract = opts.attract ?? false;
  op.simple = opts.simple ?? false;
  op.slipLimit = diff.slips;
  op.slipDefault = diff.slips;
  op.balance.slips = diff.slips;
  op.clockMax = Math.round(def.seconds * FIELD_SECOND * diff.clock);
  op.clock = op.clockMax;
  op.patients = def.patients.map((patient, index) => ({
    id: index,
    name: patient.name,
    vitals: patient.vitals,
    alive: true,
    coded: false,
  }));
  op.sites = def.sites.map((site) => ({ ...site }));
  op.phases = def.phases.map((phase) => ({ ...phase, spawn: phase.spawn.map((spawn) => ({ ...spawn })) }));
  op.colleague = opts.colleague ?? def.colleague;
  op.roll = def.roll;
  op.swapOk = def.swap;
  op.codeAllowed = def.code;
  op.par = def.par;
  enterPhase(op);
  return op;
}

/** The shell of an operation, before its first phase spawns. */
function emptyOp(
  def: CaseDef,
  difficulty: Difficulty,
  seed: number,
  seats: number,
  gift: Seat['gift'] | undefined,
): Op {
  const leadGift = gift ?? def.gift;
  const made: Seat[] = [];
  for (let i = 0; i < seats; i++) {
    const seatGift = i === 0 ? leadGift : i === 1 && def.swap ? 'second' : 'none';
    const charges = seatGift === 'none' ? 0 : def.charges;
    made.push(makeSeat(i, seatGift === 'none' ? 'none' : seatGift, charges));
  }
  return {
    id: def.id,
    title: def.title,
    seed,
    difficulty,
    tick: 0,
    field: 0,
    clock: 0,
    clockMax: 0,
    slips: 0,
    slipLimit: 5,
    slipDefault: 5,
    status: 'playing',
    fail: '',
    phase: 0,
    phases: [],
    sites: [],
    patients: [],
    seats: made,
    targets: [],
    nextId: 1,
    code: null,
    balance: defaultBalance(),
    attract: false,
    holdVitals: false,
    holdClock: false,
    radial: false,
    simple: false,
    colleague: false,
    helper: '',
    roll: false,
    swapOk: false,
    persona: 'wren',
    events: [],
    injected: false,
    giftUsed: false,
    codeCleared: false,
    teach: '',
    hint: '',
    par: def.par,
    codeAllowed: def.code,
    mercyKills: 0,
    mercyRound: 0,
    mercyExposed: 0,
    mercyBindSpawned: false,
    lastBind: 0,
    bestChain: 1,
    score: 0,
  };
}

/** A tiny operation for a unit test or a dev spawn. One site, one patient, a long clock. */
export function createBare(
  opts: { code?: boolean; vitals?: number; difficulty?: Difficulty; seats?: number } = {},
): Op {
  const def: CaseDef = {
    id: 'case:bare',
    title: 'Bare',
    surgeon: 'Wren',
    seconds: 600,
    gift: 'stillpoint',
    charges: 2,
    colleague: false,
    swap: false,
    roll: false,
    code: opts.code ?? true,
    rule: 'fixture',
    patients: [
      {
        name: 'Fixture',
        age: 40,
        line: 'A test patient.',
        vitals: opts.vitals ?? 80,
        postcards: { S: 'Fine.', A: 'Fine.', B: 'Fine.', C: 'Fine.' },
      },
    ],
    sites: [{ id: 'site', name: 'Field' }],
    phases: [{ id: 'work', hint: 'Work.', until: 'clear', spawn: [], onEnter: '', teach: '' }],
    storyBefore: '',
    storyAfter: '',
    par: 1000,
  };
  return createFromDef(def, { difficulty: opts.difficulty ?? 'resident', seats: opts.seats ?? 1, seed: 1 });
}

/** Spawn a phase's targets. Exported for the phase runner. */
export function spawnPhase(op: Op, phase: PhaseDef, index: number): void {
  const extra = Math.max(0, op.seats.length - 1);
  const ordinary = phase.spawn.filter((spawn) => !UNIQUE_KIND.has(spawn.kind));
  for (const spawn of phase.spawn) placeSpawn(op, spawn, index);
  const duplicates = Math.round(ordinary.length * 0.25 * extra);
  for (let n = 0; n < duplicates; n++) {
    const spawn = ordinary[n % ordinary.length];
    const copy = 1 + Math.floor(n / ordinary.length);
    placeSpawn(op, { ...spawn, z: spawn.z + 3.2 * copy }, index);
  }
  linkFlaps(op, index);
}

/** `under:tag` on a spawn points at the flap that was given that tag. Ids do not exist until spawn. */
function linkFlaps(op: Op, index: number): void {
  const flaps = new Map<string, number>();
  for (const target of op.targets) {
    if (target.phase === index && target.kind === 'flap' && target.tag) flaps.set(target.tag, target.id);
  }
  for (const target of op.targets) {
    if (target.phase !== index || !target.tag.startsWith('under:')) continue;
    const id = flaps.get(target.tag.slice('under:'.length));
    if (id !== undefined) target.under = id;
  }
}

/** One spawn, jittered a hair by the seed so three seeds are not the same picture. */
function placeSpawn(op: Op, spawn: Spawn, phase: number): Target {
  const jx = jitter(op.seed, op.nextId);
  const jz = jitter(op.seed, op.nextId + 17);
  return addTarget(
    op,
    {
      ...spawn,
      x: spawn.x + jx,
      z: spawn.z + jz,
      x2: spawn.x2 !== undefined ? spawn.x2 + jx : undefined,
      z2: spawn.z2 !== undefined ? spawn.z2 + jz : undefined,
    },
    phase,
  );
}

/** A stable offset in -0.08..0.08. Seed 1 is not zero, so paths still differ. */
export function jitter(seed: number, n: number): number {
  const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 0.16;
}

/** Start the current phase: hint, teach, spawns, entrance. */
export function enterPhase(op: Op): void {
  const phase = op.phases[op.phase];
  if (!phase) {
    return;
  }
  op.hint = phase.hint;
  op.teach = phase.teach;
  op.codeCleared = false;
  spawnPhase(op, phase, op.phase);
  if (phase.onEnter === 'dip') {
    for (const patient of op.patients) patient.vitals = Math.min(patient.vitals, 40);
  }
  if (phase.onEnter === 'flatline') {
    const patient = op.patients[0];
    patient.vitals = 0;
    op.events.push({ type: 'flatline', text: 'Flatline.' });
  }
  if (phase.onEnter === 'mercy-expose') op.mercyExposed = 1;
  op.events.push({ type: 'phase', text: phase.hint });
}

/** Hash the gameplay state. Bot memos and event text stay out, so a replay of hands reproduces it. */
export function hashOp(op: Op): string {
  const parts: string[] = [
    String(op.tick),
    String(op.phase),
    op.status,
    String(q(op.field)),
    String(q(op.clock)),
    String(op.slips),
    String(op.score),
    op.radial ? 'r' : '-',
    op.holdVitals ? 'v' : '-',
    op.holdClock ? 'k' : '-',
  ];
  for (const patient of op.patients) parts.push(String(q(patient.vitals)), patient.alive ? '1' : '0');
  for (const seat of op.seats) {
    parts.push(String(q(seat.x)), String(q(seat.z)), String(seat.tool), String(seat.score), String(q(seat.chain)));
  }
  for (const target of op.targets) {
    parts.push(
      String(target.id),
      target.kind,
      target.done ? '1' : '0',
      String(q(target.x)),
      String(q(target.z)),
      String(q(target.volume)),
      String(q(target.burn)),
      String(target.stitches),
      String(target.cut),
      String(q(target.hp)),
      String(target.gen),
      target.hidden ? '1' : '0',
      String(target.dose),
      String(q(target.lift)),
    );
  }
  if (op.code) parts.push('code', String(op.code.tries), String(q(op.code.left)));
  let h = 2166136261;
  const text = parts.join(',');
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/** A short picture of an operation for a failing test. */
export function debugOp(op: Op): string {
  const left = op.targets.filter((target) => !target.done && target.phase === op.phase);
  const vitals = op.patients.map((patient) => Math.round(patient.vitals)).join('/');
  return `${op.id} ${op.status} ${op.fail} phase ${op.phase}/${op.phases.length} tick ${op.tick} vitals ${vitals} slips ${op.slips} left ${left.map((target) => target.kind + target.id).join(',')}`;
}
