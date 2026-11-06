// The network's copy of the sim: fixed-point ints in positional arrays. Plain data only.
// Keyframes (reliable, 1 Hz, whole state, <= 16 KB); snapshots (unreliable, 12 Hz, what moved, <= 1100
// bytes); event batches (reliable, up to 4 Hz). The view reads a plain state object from either source.
import { GEL_COLS, GEL_ROWS, TOOLS } from './entities.js';

const I = (v) => Math.round(v * 100);
const TOOL_I = (t) => { const i = [...TOOLS, 'dressing'].indexOf(t); return i; };
const TOOL_N = (i) => [...TOOLS, 'dressing'][i] ?? null;

// Fields of an entity that a client needs but that never change, by kind, are in the keyframe; these are the
// two kind-specific numbers a snapshot carries.
function ab(e) {
  switch (e.k) {
    case 'pool': case 'bleeder': return [I(e.r), 0];
    case 'incision': case 'dressing': return [I(e.s), 0];
    case 'laceration': return [e.next, e.flip];
    case 'mask': return [Math.round((e.painted ?? 0) * 100), 0];
    case 'polyp': case 'egg': case 'cyst': case 'eye': case 'halo': case 'clot': return [Math.round((e.heat ?? 0) * 100), (e.open ? 1 : 0) + (e.locked ? 2 : 0) + (e.scanned ? 4 : 0)];
    case 'fragment': case 'clamp': case 'donor': return [Math.round(e.rot ?? 0), (e.placed ? 1 : 0) + ((e.holders ?? 0) ? 2 : 0)];
    default: return [I(e.s ?? 0), (e.free ? 1 : 0) + ((e.holders ?? 0) ? 2 : 0) + (e.locked ? 4 : 0) + (e.hidden ? 8 : 0)];
  }
}
function applyAb(e, a, b) {
  switch (e.k) {
    case 'pool': case 'bleeder': e.r = a / 100; break;
    case 'incision': case 'dressing': e.s = a / 100; break;
    case 'laceration': e.next = a; e.flip = b; break;
    case 'mask': e.painted = a / 100; break;
    case 'polyp': case 'egg': case 'cyst': case 'eye': case 'halo': case 'clot': e.heat = a / 100; e.open = !!(b & 1); e.locked = !!(b & 2); e.scanned = !!(b & 4); break;
    case 'fragment': case 'clamp': case 'donor': e.rot = a; e.placed = !!(b & 1); e.holders = b & 2 ? 1 : 0; break;
    default: e.s = a / 100; e.free = !!(b & 1); e.holders = b & 2 ? 1 : 0; e.locked = !!(b & 4); e.hidden = !!(b & 8); break;
  }
}

function gelBits(gel) {
  // A coarse bitset, as hex.
  let s = '', nib = 0, n = 0;
  for (let i = 0; i < gel.length; i++) {
    nib = (nib << 1) | (gel[i] > 0 ? 1 : 0);
    if (++n === 4) { s += nib.toString(16); nib = 0; n = 0; }
  }
  if (n) s += (nib << (4 - n)).toString(16);
  return s.replace(/0+$/, '');
}
function gelApply(bits, gel) {
  gel.fill(0);
  for (let i = 0; i < bits.length; i++) {
    const nib = parseInt(bits[i], 16);
    for (let k = 0; k < 4; k++) if (nib & (8 >> k)) gel[i * 4 + k] = 8;
  }
}

const roundPath = (p) => (p ? p.map((q) => [Math.round(q[0] * 100) / 100, Math.round(q[1] * 100) / 100]) : p);

/** Everything a late or lossy client needs. */
export function encodeKey(sim) {
  return {
    t: 'k', n: sim.tick, op: sim.opId, st: sim.status, c: I(sim.clock), c0: I(sim.clock0), s: sim.stage, o: sim.objective, x: sim.context, ctx: sim.mistakes, sc: sim.score, st2: sim.streak,
    tools: sim.tools, gifts: sim.giftsUnlocked ? 1 : 0, comp: Math.round(sim.composure), d: sim.doses, m: sim.music, cold: sim.cold,
    tb: sim.tables.map((t) => ({ i: t.i, a: t.arena, v: I(t.vitals), f: t.fake, r: t.ring, g: gelBits(t.gel), mk: t.marks.slice(-50).map((m) => ({ ...m, path: roundPath(m.path), cells: m.cells ? m.cells.slice(0, 12) : undefined })), n: t.name })),
    e: sim.ents.filter((e) => !e.dead).map((e) => {
      const { path, cells, ...rest } = e;
      const out = { ...rest };
      delete out.onDone; delete out.onReveal; delete out.onDead; delete out.home; delete out.wasted; delete out.age; delete out.devSum; delete out.devT; delete out.devLen; delete out.eyes; delete out.plates; delete out.halos; delete out.way;
      if (path) out.path = roundPath(path);
      if (cells) out.cells = cells;
      if (e.home) out.home = e.home;
      return out;
    }),
    p: sim.seats.map((s) => seatRow(s)), h: sim.heart ? [Math.round(sim.heart.bpm), Math.round(sim.heart.phase * 100), sim.heart.calm ? 1 : 0, sim.heart.systole ? 1 : 0] : null,
    cb: sim.codeBlue, ms: sim.massage, q: sim.quiet ? 1 : 0, pr: sim.prompt, pain: sim.pain, g: sim.handGhost,
  };
}
const seatRow = (s) => [s.id, I(s.x), I(s.z), TOOL_I(s.tool), (s.act ? 1 : 0) + (s.onTarget ? 2 : 0) + (s.grab ? 4 : 0) + (s.gone ? 8 : 0), Math.round(s.score), s.table, s.gift === 'look' ? 2 : s.gift === 'quiet' ? 1 : 0, TOOL_I(s.act), Math.round((s.draw ?? 0) * 100)];

/** What moved since `last`, a Map of the last values sent. */
export function encodeSnap(sim, last) {
  const e = [];
  for (const o of sim.ents) {
    if (o.dead) continue;
    const [a, b] = ab(o);
    const row = [o.n, I(o.x), I(o.z), a, b];
    const key = row.join(',');
    if (last.get(o.n) !== key) { last.set(o.n, key); e.push(row); }
  }
  const msg = {
    t: 's', n: sim.tick, c: I(sim.clock), v: sim.tables.map((t) => I(t.vitals)), comp: Math.round(sim.composure), d: sim.doses, sc: sim.score, q: sim.quiet ? 1 : 0, mi: sim.mistakes,
    p: sim.seats.map((s) => seatRow(s)), e,
  };
  if (sim.drops.length) msg.dr = sim.drops.filter((d) => !d.dead).slice(0, 24).map((d) => [I(d.x), I(d.z)]);
  if (sim.heart) msg.h = [Math.round(sim.heart.bpm), Math.round(sim.heart.phase * 100), sim.heart.calm ? 1 : 0, sim.heart.systole ? 1 : 0];
  if (sim.codeBlue) msg.cb = [Math.round(sim.codeBlue.charge * 100), sim.codeBlue.shocks, Math.round(sim.codeBlue.t * 10), sim.codeBlue.charging ? 1 : 0];
  if (sim.massage) msg.ms = [sim.massage.n, sim.massage.next === 'a' ? 0 : 1, Math.round(sim.massage.phase * 100)];
  return msg;
}

/** A plain state object the view can read. */
export function emptyView(def, seats) {
  return {
    def, opId: def.id, tick: 0, status: 'playing', clock: def.time, clock0: def.time, stage: 0, objective: '', context: null, mistakes: 0, score: 0, streak: 0, tools: [...(def.tools ?? [])], giftsUnlocked: true, composure: 40, doses: def.doses ?? 3, music: def.music, cold: null,
    tables: (def.tables ?? [{ arena: def.arena }]).map((t, i) => ({ i, arena: t.arena ?? def.arena, vitals: def.vitals.start, fake: null, ring: t.ring ?? def.ring ?? [-5.1, 2.1], gel: new Array(GEL_COLS * GEL_ROWS).fill(0), marks: [], name: t.name ?? null })),
    ents: [], drops: [], seats: seats.map((s, i) => ({ id: i, x: 0, z: 0.5, tx: 0, tz: 0.5, table: 0, tool: 'drain', gift: i % 2 ? 'look' : 'quiet', surgeon: 'ilya', bot: null, act: null, onTarget: false, grab: null, score: 0, draw: 0, gone: false, name: s.name })),
    heart: null, codeBlue: null, massage: null, quiet: false, prompt: null, pain: 0, handGhost: null, ghostPlay: null,
  };
}

function applySeatRows(view, rows) {
  for (const r of rows) {
    const s = view.seats[r[0]];
    if (!s) continue;
    s.tx = r[1] / 100;
    s.tz = r[2] / 100;
    s.tool = TOOL_N(r[3]) ?? s.tool;
    s.act = r[4] & 1 ? (TOOL_N(r[8]) ?? s.tool) : null;
    s.onTarget = !!(r[4] & 2);
    s.grab = r[4] & 4 ? 'held' : null;
    s.gone = !!(r[4] & 8);
    s.score = r[5];
    s.table = r[6];
    s.gift = r[7] === 2 ? 'look' : r[7] === 1 ? 'quiet' : null;
    s.draw = (r[9] ?? 0) / 100;
  }
}

export function applyKey(view, k) {
  view.tick = k.n;
  view.status = k.st;
  view.clock = k.c / 100;
  view.stage = k.s;
  view.objective = k.o;
  view.context = k.x;
  view.mistakes = k.ctx;
  view.score = k.sc;
  view.streak = k.st2;
  view.tools = k.tools;
  view.giftsUnlocked = !!k.gifts;
  view.composure = k.comp;
  view.doses = k.d;
  view.music = k.m;
  view.cold = k.cold;
  view.quiet = !!k.q;
  view.prompt = k.pr;
  view.pain = k.pain;
  view.handGhost = k.g;
  k.tb.forEach((t) => {
    const v = view.tables[t.i];
    if (!v) return;
    v.vitals = t.v / 100;
    v.fake = t.f;
    v.ring = t.r;
    gelApply(t.g, v.gel);
    v.marks = t.mk;
  });
  // Entities: replace, keeping interpolated positions of what's already here.
  const old = new Map(view.ents.map((e) => [e.n, e]));
  view.ents = k.e.map((e) => {
    const o = old.get(e.n);
    return { ...e, tx: e.x, tz: e.z, x: o ? o.x : e.x, z: o ? o.z : e.z };
  });
  applySeatRows(view, k.p);
  setHeart(view, k.h);
  view.codeBlue = k.cb;
  view.massage = k.ms;
  return view;
}
export function applySnap(view, s) {
  if (s.n < view.tick) return view;
  view.tick = s.n;
  view.clock = s.c / 100;
  s.v.forEach((v, i) => { if (view.tables[i]) view.tables[i].vitals = v / 100; });
  view.composure = s.comp;
  view.doses = s.d;
  view.score = s.sc;
  view.quiet = !!s.q;
  view.mistakes = s.mi;
  applySeatRows(view, s.p);
  for (const r of s.e) {
    const e = view.ents.find((o) => o.n === r[0]);
    if (!e) continue;
    e.tx = r[1] / 100;
    e.tz = r[2] / 100;
    applyAb(e, r[3], r[4]);
  }
  view.drops = (s.dr ?? []).map((d) => ({ x: d[0] / 100, z: d[1] / 100, table: 0, dead: false }));
  setHeart(view, s.h);
  if (s.cb && view.codeBlue) { view.codeBlue.charge = s.cb[0] / 100; view.codeBlue.shocks = s.cb[1]; view.codeBlue.t = s.cb[2] / 10; view.codeBlue.charging = !!s.cb[3]; }
  if (s.ms && view.massage) { view.massage.n = s.ms[0]; view.massage.next = s.ms[1] ? 'b' : 'a'; view.massage.phase = s.ms[2] / 100; }
  return view;
}
function setHeart(view, h) {
  if (!h) { view.heart = null; return; }
  view.heart = view.heart ?? { beat: 0 };
  view.heart.bpm = h[0];
  view.heart.phase = h[1] / 100;
  view.heart.calm = !!h[2];
  view.heart.systole = !!h[3];
}
/** Glide positions toward the last received, about 120 ms behind. */
export function smoothView(view, dt) {
  const k = Math.min(1, dt * 9);
  for (const e of view.ents) { if (e.tx != null) { e.x += (e.tx - e.x) * k; e.z += (e.tz - e.z) * k; } }
  for (const s of view.seats) { s.x += (s.tx - s.x) * Math.min(1, dt * 12); s.z += (s.tz - s.z) * Math.min(1, dt * 12); }
}
const KEEP_EVENTS = new Set(['say', 'rating', 'mistake', 'grab', 'pop', 'dish', 'stitch', 'knot', 'cutDone', 'sizzle', 'ping', 'reveal', 'inject', 'doseWasted', 'heal', 'music', 'stage', 'quietOn', 'quietOff', 'rewind', 'codeBlue', 'clear', 'badShock', 'revived', 'massageStart', 'massagePress', 'massageDone', 'knock', 'coreOut', 'strainHit', 'strainDying', 'strainDead', 'eyeOpen', 'weeperCrawl', 'sob', 'sobWave', 'thump', 'bpm', 'flare', 'plateOff', 'round', 'arrest', 'fx', 'won', 'lost', 'toolUnlocked', 'wrongTool']);
export const netEvents = (evs) => evs.filter((e) => KEEP_EVENTS.has(e.e)).map((e) => {
  const c = { ...e };
  if (c.x != null) c.x = Math.round(c.x * 100) / 100;
  if (c.z != null) c.z = Math.round(c.z * 100) / 100;
  return c;
});
