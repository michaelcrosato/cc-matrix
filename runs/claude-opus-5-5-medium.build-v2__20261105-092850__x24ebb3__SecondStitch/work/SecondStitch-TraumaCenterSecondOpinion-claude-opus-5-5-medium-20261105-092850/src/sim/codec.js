// Network packing. A keyframe carries the whole state the view reads; a snapshot only what moves.
import { TOOLS } from './tools.js';

const r1 = (v) => Math.round(v * 10), r2 = (v) => Math.round(v * 100);
const round2 = (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v);
const SKIP_ENT = new Set(['then', 'sig', 'devSum', 'devT', 'x0', 'z0', 'rushT', 'rush', 'path', 'expireCmds', 'waste', 'r0', 'first', 'owner', 'onExpire', 'sid']);
export function encodeKey(sim) {
  const ents = sim.ents.map((e) => { const o = {}; for (const k of Object.keys(e)) if (!SKIP_ENT.has(k)) o[k] = e[k]; return o; });
  const seats = sim.seats.map((s) => ({ i: s.i, x: s.x, z: s.z, table: s.table, tool: s.tool, gift: s.gift, useHeld: s.useHeld, grab: s.grab, drawing: s.drawing, score: s.score, stitches: s.stitches, saves: s.saves, out: s.out, ratings: s.ratings, stroke: s.stroke, dressing: s.dressing }));
  const scars = sim.scars.filter((s) => s.k !== 'gel').slice(-14);
  return JSON.stringify({ t: 'k', opId: sim.opId, clock: sim.clock, clockMax: sim.clockMax, phase: sim.phase, stage: sim.stage, tables: sim.tables, ents, seats, drops: sim.drops, films: sim.films.slice(-12), scars, flags: sim.flags, tools: sim.tools, composure: sim.composure, giftOn: sim.giftOn, tagOn: !!sim.tagOn, score: sim.score, streak: sim.streak, mistakes: sim.mistakes, doses: sim.doses, port: sim.port, codeBlue: sim.codeBlue, massage: sim.massage, quiet: sim.quiet, heart: sim.heart, cold: sim.cold, pain: sim.pain, voiceOff: sim.voiceOff, noHint: sim.noHint, hint: sim.hint, doctor: sim.doctor, music: sim.music, mimic: sim.mimic, t2: sim.t }, round2);
}
export function decodeKey(text, state) {
  const k = typeof text === 'string' ? JSON.parse(text) : text;
  const keep = { events: state.events, cfg: state.cfg, ring: state.ring, meta: state.meta, checkpoint: null, lineIx: state.lineIx, counters: state.counters, ratings: state.ratings };
  Object.assign(state, k, keep);
  state.t = k.t2;
  return state;
}
/** The moving parts, as fixed-point ints in positional arrays. Must stay under 1,100 bytes. */
export function encodeSnap(sim, n) {
  const seats = sim.seats.map((s) => [r1(s.x), r1(s.z), TOOLS.indexOf(s.tool), s.useHeld ? 1 : 0, s.grab ?? 0, s.table, Math.round(s.score)]);
  const ents = [];
  for (const e of sim.ents) {
    if (ents.length >= 26) break;
    let a = 0;
    switch (e.k) { case 'pool': case 'bleeder': a = r1(e.r); break; case 'laceration': a = e.tied; break; case 'mask': a = e.painted; break; case 'eye': a = e.shut ? -1 : r2(e.heat ?? 0); break; default: a = e.s != null ? r1(e.s) : e.heat != null ? r2(e.heat) : 0; }
    ents.push([e.id, r1(e.x), r1(e.z), a]);
  }
  const drops = [];
  for (const d of sim.drops.slice(0, 12)) drops.push(r1(d.x), r1(d.z));
  return { t: 's', n, c: r1(sim.clock), v: sim.tables.map((t) => Math.round(t.fake ?? t.vitals)), f: sim.tables.map((t) => (t.fake != null ? 1 : 0)), o: Math.round(sim.composure), p: sim.score, k: sim.streak, m: sim.mistakes, d: sim.doses, q: sim.quiet ? 1 : 0, h: sim.heart ? [Math.round(sim.heart.bpm), r2(sim.heart.phase)] : 0, seats, ents, drops, st: sim.stage };
}
export function applySnap(state, s, mySeat = -1) {
  state.clock = s.c / 10;
  s.v.forEach((v, i) => { const t = state.tables[i]; if (!t) return; if (s.f[i]) t.fake = v; else { t.fake = null; t.vitals = v; } });
  state.composure = s.o; state.score = s.p; state.streak = s.k; state.mistakes = s.m; state.doses = s.d; state.quiet = !!s.q; state.stage = s.st;
  if (s.h && state.heart) { state.heart.bpm = s.h[0]; state.heart.phase = s.h[1] / 100; }
  s.seats.forEach((a, i) => {
    const q = state.seats[i];
    if (!q) return;
    if (i !== mySeat) { q.nx = a[0] / 10; q.nz = a[1] / 10; q.tool = TOOLS[a[2]] ?? q.tool; q.table = a[5]; } else { q.serverX = a[0] / 10; q.serverZ = a[1] / 10; q.tool = TOOLS[a[2]] ?? q.tool; q.table = a[5]; }
    q.useHeld = !!a[3] || (i === mySeat && q.useHeld); q.grab = a[4] || null; q.score = a[6];
  });
  for (const a of s.ents) {
    const e = state.ents.find((q) => q.id === a[0]);
    if (!e) continue;
    e.nx = a[1] / 10; e.nz = a[2] / 10;
    switch (e.k) { case 'pool': case 'bleeder': e.r = a[3] / 10; break; case 'laceration': e.tied = a[3]; break; case 'mask': break; case 'eye': if (a[3] === -1) e.shut = true; else { e.shut = false; e.heat = a[3] / 100; } break; default: if (e.s != null) e.s = a[3] / 10; else if (e.heat != null) e.heat = a[3] / 100; }
  }
  state.drops = [];
  for (let i = 0; i < s.drops.length; i += 2) state.drops.push({ x: s.drops[i] / 10, z: s.drops[i + 1] / 10, table: 0, vx: 0, vz: 0, life: 1 });
}
/** Glide everything toward where the network says it is. */
export function smoothState(state, dt) {
  const k = Math.min(1, dt * 11);
  for (const s of state.seats) if (s.nx != null) { s.x += (s.nx - s.x) * k; s.z += (s.nz - s.z) * k; }
  for (const e of state.ents) if (e.nx != null) { e.x += (e.nx - e.x) * k; e.z += (e.nz - e.z) * k; }
}
export const NET_EVENTS = new Set(['say', 'prompt', 'sfx', 'rate', 'stitch', 'done', 'dish', 'placed', 'pinkUp', 'music', 'quiet', 'look', 'codeblue', 'shock', 'squeeze', 'knock', 'strainHit', 'strainDead', 'wave', 'fx', 'tag', 'inject', 'lowVitals', 'bpm', 'won', 'lost']);
void r2;
