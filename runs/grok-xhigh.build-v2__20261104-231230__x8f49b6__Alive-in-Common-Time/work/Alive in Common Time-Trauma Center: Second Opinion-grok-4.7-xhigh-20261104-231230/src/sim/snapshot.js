/** Compact snapshots. Unreliable `s` sheds static geometry. Keyframe `k` round-trips the view. */

const Q = 100;

function q(n) {
  return typeof n === 'number' && Number.isFinite(n) ? Math.round(n * Q) : 0;
}
function u(n) {
  return n / Q;
}

const FLAG_BITS = ['hidden', 'marked', 'tray', 'clamped', 'grabbable', 'exposed', 'fleeing', 'embedded', 'core', 'coreOpen', 'windup', 'readyTie', 'cut', 'started', 'tutorial'];

function flagBits(e) {
  let b = 0;
  for (let i = 0; i < FLAG_BITS.length; i++) if (e[FLAG_BITS[i]]) b |= 1 << i;
  return b;
}
function applyBits(o, b) {
  if (!b) return;
  for (let i = 0; i < FLAG_BITS.length; i++) if (b & (1 << i)) o[FLAG_BITS[i]] = true;
}

function packEntity(e) {
  const row = {
    i: e.id, k: e.kind, s: e.site, x: q(e.x || 0), y: q(e.y || 0), f: flagBits(e),
  };
  if (e.hp != null) row.h = q(e.hp);
  if (e.holder != null) row.ho = e.holder;
  if (e.need) row.n = e.need;
  if (e.strain) row.st = e.strain;
  if (e.vol != null) row.v = q(e.vol);
  if (e.size != null) row.z = q(e.size);
  if (e.coverage != null) row.c = q(e.coverage);
  if (e.pinned) row.p = q(e.pinned);
  if (e.stunned) row.sn = q(e.stunned);
  if (e.axis != null) row.ax = e.axis;
  if (e.embed != null) row.em = q(e.embed);
  if (e.pull != null) row.pu = q(e.pull);
  if (e.along != null) row.al = q(e.along);
  if (e.gate != null) row.ga = e.gate;
  if (e.parent != null) row.pa = e.parent;
  if (e.chain != null) row.ch = e.chain;
  if (e.index != null) row.ix = e.index;
  if (e.chainActive != null) row.ca = e.chainActive;
  if (e.x1 != null) row.x1 = q(e.x1);
  if (e.y1 != null) row.y1 = q(e.y1);
  if (e.x2 != null) row.x2 = q(e.x2);
  if (e.y2 != null) row.y2 = q(e.y2);
  if (e.rect) row.r = e.rect.map(q);
  if (e.points) row.pts = e.points.flatMap((p) => [q(p[0]), q(p[1])]);
  if (e.gates) row.g = e.gates.map((g) => [q(g.x), q(g.y), g.hit ? 1 : 0]);
  return row;
}

function unpackEntity(row) {
  const e = { id: row.i, kind: row.k, site: row.s, x: u(row.x), y: u(row.y), alive: true };
  applyBits(e, row.f || 0);
  if (row.h != null) e.hp = u(row.h);
  if (row.ho != null) e.holder = row.ho;
  if (row.n) e.need = row.n;
  if (row.st) e.strain = row.st;
  if (row.v != null) e.vol = u(row.v);
  if (row.z != null) e.size = u(row.z);
  if (row.c != null) e.coverage = u(row.c);
  if (row.p) e.pinned = u(row.p);
  if (row.sn) e.stunned = u(row.sn);
  if (row.ax != null) e.axis = row.ax;
  if (row.em != null) e.embed = u(row.em);
  if (row.pu != null) e.pull = u(row.pu);
  if (row.al != null) e.along = u(row.al);
  if (row.ga != null) e.gate = row.ga;
  if (row.pa != null) e.parent = row.pa;
  if (row.ch != null) e.chain = row.ch;
  if (row.ix != null) e.index = row.ix;
  if (row.ca != null) e.chainActive = row.ca;
  if (row.x1 != null) e.x1 = u(row.x1);
  if (row.y1 != null) e.y1 = u(row.y1);
  if (row.x2 != null) e.x2 = u(row.x2);
  if (row.y2 != null) e.y2 = u(row.y2);
  if (row.r) e.rect = row.r.map(u);
  if (row.pts) {
    e.points = [];
    for (let i = 0; i < row.pts.length; i += 2) e.points.push([u(row.pts[i]), u(row.pts[i + 1])]);
  }
  if (row.g) e.gates = row.g.map((g) => ({ x: u(g[0]), y: u(g[1]), hit: !!g[2] }));
  return e;
}

function packSeat(s) {
  return [s.id, q(s.x), q(s.y), s.tool, q(s.use || 0), s.site, q(s.composure || 0), s.score || 0, s.combo || 0, s.out ? 1 : 0, s.color || '', q(s.charge || 0)];
}

function unpackSeat(row, prev) {
  const base = prev || {};
  return {
    ...base,
    id: row[0], x: u(row[1]), y: u(row[2]), tool: row[3], use: u(row[4]), site: row[5],
    composure: u(row[6]), score: row[7], combo: row[8], out: !!row[9], color: row[10] || base.color,
    charge: u(row[11] || 0),
    name: base.name, gift: base.gift, stats: base.stats || { Cuts: 0, Stitches: 0, Burns: 0, Saves: 0, Accuracy: 100 },
  };
}

/** Fields the operative view reads. A decoded snapshot must carry all of them. */
export const VIEW_FIELDS = ['tick', 'op', 'phase', 'vitals', 'timer', 'score', 'bpm', 'beat', 'beatInBar', 'bar', 'site', 'hush', 'arrest', 'seats', 'entities', 'phaseTools', 'sites', 'flags', 'objective'];

function worldOf(state) {
  return {
    tick: state.tick, op: state.op, phase: state.phase, phaseIndex: state.phaseIndex,
    objective: state.objective, vitals: state.vitals, vitalsMin: state.vitalsMin,
    timer: state.timer, score: state.score, misses: state.misses, combo: state.combo,
    bpm: state.bpm, beat: state.beat, beatInBar: state.beatInBar, beatPhase: state.beatPhase,
    bar: state.bar, site: state.site, doctor: state.doctor, hush: state.hush,
    arrest: state.arrest, complete: state.complete, failed: state.failed, over: state.over,
    rank: state.rank, phaseTools: state.phaseTools, sites: state.sites, flags: state.flags,
    notes: state.notes, clampsUsed: state.clampsUsed,
  };
}

export function keyframeOf(sim) {
  const state = sim.state || sim;
  const msg = {
    t: 'k',
    w: worldOf(state),
    ents: (state.entities || []).map(packEntity),
  };
  msg.seats = (state.seats || []).map((s) => ({
    id: s.id, name: s.name, color: s.color, gift: s.gift, stats: s.stats,
    x: q(s.x), y: q(s.y), tool: s.tool, use: q(s.use || 0), site: s.site,
    composure: q(s.composure || 0), score: s.score || 0, combo: s.combo || 0, out: !!s.out,
    charge: q(s.charge || 0),
  }));
  return msg;
}

export function unreliableOf(sim, sinceTick = -1) {
  const state = sim.state || sim;
  const mv = [];
  for (const e of state.entities || []) {
    const moved = e.kind === 'adagio' || e.kind === 'note' || e.kind === 'spore' || e.kind === 'tremolo'
      || e.kind === 'feeder' || e.kind === 'pool' || e.kind === 'crescendo' || e.holder != null
      || e.kind === 'baton' || e.kind === 'coda' || e.kind === 'legato' || e.kind === 'link';
    if (!moved && e.kind !== 'scratch' && e.kind !== 'bleeder') continue;
    mv.push([e.id, q(e.x || 0), q(e.y || 0), e.hp == null ? null : q(e.hp), flagBits(e), e.holder ?? null, q(e.vol || 0), q(e.size || 0), q(e.coverage || 0)]);
  }
  return {
    t: 's',
    k: state.tick,
    since: sinceTick,
    v: q(state.vitals),
    m: q(state.timer),
    sc: state.score,
    b: state.beat,
    bp: q(state.beatPhase || 0),
    bpm: q(state.bpm),
    bar: state.bar,
    bib: state.beatInBar,
    site: state.site,
    h: state.hush || 0,
    ar: state.arrest ? q(state.arrest.clock) : 0,
    ph: state.phase,
    tips: (state.seats || []).map(packSeat),
    mv,
  };
}

export function bytesOf(msg) {
  return new TextEncoder().encode(JSON.stringify(msg)).length;
}

export function decodeKeyframe(msg) {
  const w = msg.w;
  const seats = (msg.seats || []).map((s) => ({
    id: s.id, name: s.name, color: s.color, gift: s.gift, stats: s.stats || {},
    x: u(s.x), y: u(s.y), tool: s.tool, use: u(s.use), site: s.site,
    composure: u(s.composure), score: s.score, combo: s.combo, out: !!s.out, charge: u(s.charge || 0),
  }));
  return { ...w, seats, entities: (msg.ents || []).map(unpackEntity) };
}

/** Apply an unreliable snapshot onto a decoded keyframe. Drops anything older than the base tick. */
export function applyUnreliable(base, msg) {
  if (!base || !msg || msg.t !== 's') return base;
  if (base.tick != null && msg.k < base.tick) return base;
  const next = {
    ...base,
    tick: msg.k, vitals: u(msg.v), timer: u(msg.m), score: msg.sc, beat: msg.b,
    beatPhase: u(msg.bp), bpm: u(msg.bpm), bar: msg.bar, beatInBar: msg.bib, site: msg.site,
    hush: msg.h || null, phase: msg.ph || base.phase,
    arrest: msg.ar ? { ...(base.arrest || {}), clock: u(msg.ar) } : null,
  };
  const byId = new Map((base.seats || []).map((s) => [s.id, s]));
  next.seats = (msg.tips || []).map((row) => unpackSeat(row, byId.get(row[0])));
  const ents = new Map((base.entities || []).map((e) => [e.id, { ...e }]));
  for (const row of msg.mv || []) {
    const prev = ents.get(row[0]) || { id: row[0], alive: true, kind: 'note', site: next.site };
    prev.x = u(row[1]);
    prev.y = u(row[2]);
    if (row[3] != null) prev.hp = u(row[3]);
    applyBits(prev, row[4] || 0);
    if (row[5] != null) prev.holder = row[5];
    if (row[6]) prev.vol = u(row[6]);
    if (row[7]) prev.size = u(row[7]);
    if (row[8]) prev.coverage = u(row[8]);
    ents.set(row[0], prev);
  }
  next.entities = [...ents.values()];
  return next;
}
