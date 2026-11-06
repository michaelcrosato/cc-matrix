// Network codec: keyframes (whole state, <= 16 KB) and snapshots (<= 1,100 bytes, positional arrays).
const r2 = (v) => Math.round(v * 100) / 100;
const STRIP = new Set(['pts', '_pts', 'rec', 'path', 'then', 'shape']);
export function encodeEnt(e) {
  const o = {}; for (const [k, v] of Object.entries(e)) { if (STRIP.has(k) && !(k === 'path' && e.k === 'cut') && !(k === 'shape')) continue; if (k === 'got') { o.got = v.join(''); continue; } o[k] = typeof v === 'number' ? r2(v) : v; }
  return o;
}
export function encodeKey(sim, events = []) {
  return {
    t: r2(sim.t), tick: sim.tick, stage: sim.stage, clock: r2(sim.clock), tables: sim.tables.map((t) => ({ v: r2(t.vitals), d: t.dead ? 1 : 0 })), doses: sim.doses, composure: r2(sim.composure), quiet: sim.quiet ? 1 : 0,
    score: { pts: sim.score.pts, clean: sim.score.clean, good: sim.score.good, sloppy: sim.score.sloppy, mistakes: sim.score.mistakes, streak: sim.score.streak, maxStreak: sim.score.maxStreak, per: sim.score.per },
    seats: sim.seats.map((s) => ({ id: s.id, doctor: s.doctor, x: r2(s.x), z: r2(s.z), tb: s.tb, sel: s.sel, tool: s.tool, use: s.use ? 1 : 0, grab: s.grab, cut: s.cut, syr: s.syr ?? null })),
    ents: sim.ents.map(encodeEnt), flags: sim.flags, rings: sim.rings, cb: sim.cb, mass: sim.mass, heart: sim.heart, over: sim.over, why: sim.why, unlocked: sim.unlocked, nid: sim.nid, ev: events,
  };
}
export function decodeKey(k, sim) {
  sim.t = k.t; sim.tick = k.tick; sim.stage = k.stage; sim.clock = k.clock; k.tables.forEach((t, i) => { sim.tables[i] = { vitals: t.v, drain: sim.tables[i]?.drain ?? 0, dead: !!t.d }; }); sim.doses = k.doses; sim.composure = k.composure; sim.quiet = !!k.quiet;
  Object.assign(sim.score, k.score); k.seats.forEach((s, i) => { const q = sim.seats[i] ?? (sim.seats[i] = { id: s.id }); const local = q.local; const keep = local ? [q.x, q.z] : null; Object.assign(q, s, { use: !!s.use }); q.tx = s.x; q.tz = s.z; if (local && Math.hypot(keep[0] - s.x, keep[1] - s.z) < 1) { q.x = keep[0]; q.z = keep[1]; } });
  sim.ents = k.ents.map((e) => { const o = { ...e }; if (typeof o.got === 'string') o.got = o.got.split('').map(Number); return o; });
  sim.flags = k.flags; sim.rings = k.rings || []; sim.cb = k.cb; sim.mass = k.mass; sim.heart = k.heart; sim.over = k.over; sim.why = k.why; sim.unlocked = k.unlocked;
  return sim;
}
// snapshot: seats [id,x,z,tb,use,tool,grab] and moving entities [id,x,z,progress], plus vitals/clock
const TOOLN = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner', 'dress'];
export function encodeSnap(sim, n, last) {
  const seats = sim.seats.map((s) => [s.id, Math.round(s.x * 100), Math.round(s.z * 100), s.tb, s.use ? 1 : 0, TOOLN.indexOf(s.tool), s.grab ? 1 : 0]);
  const ents = []; for (const e of sim.ents) { if (ents.length >= 22) break; const p = last.get(e.id); const cur = Math.round(e.x * 50) * 100000 + Math.round(e.z * 50); if (p !== cur || e.held || e.k === 'drop') { last.set(e.id, cur); ents.push([e.id, Math.round(e.x * 100), Math.round(e.z * 100), Math.round((e.p ?? e.s ?? e.heat ?? e.r ?? 0) * 100)]); } }
  return { t: 's', n, tm: Math.round(sim.t * 100), v: sim.tables.map((t) => Math.round(t.vitals)), c: Math.round(sim.clock), sc: sim.score.pts, hb: sim.heart ? [Math.round(sim.heart.phase * 100), sim.heart.sys ? 1 : 0, Math.round(sim.heart.bpm)] : 0, s: seats, e: ents };
}
export function applySnap(sim, s) {
  s.v.forEach((v, i) => { if (sim.tables[i]) sim.tables[i].vitals = v; }); sim.clock = s.c; sim.score.pts = s.sc;
  for (const q of s.s) { const st = sim.seats.find((x) => x.id === q[0]); if (!st) continue; st.tx = q[1] / 100; st.tz = q[2] / 100; st.tb = q[3]; st.use = !!q[4]; st.tool = TOOLN[q[5]] || st.tool; if (!st.local) { st.x += (st.tx - st.x) * 0.5; st.z += (st.tz - st.z) * 0.5; } }
  for (const q of s.e) { const e = sim.ents.find((x) => x.id === q[0]); if (e) { e.x = q[1] / 100; e.z = q[2] / 100; } }
  if (s.hb && sim.heart) { sim.heart.phase = s.hb[0] / 100; sim.heart.sys = !!s.hb[1]; sim.heart.bpm = s.hb[2]; }
}
export const jsonSize = (o) => JSON.stringify(o).length;
