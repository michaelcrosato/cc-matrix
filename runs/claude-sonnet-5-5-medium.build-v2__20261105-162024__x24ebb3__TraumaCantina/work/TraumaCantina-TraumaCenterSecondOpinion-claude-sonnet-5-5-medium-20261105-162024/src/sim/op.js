// The operation sim. Plain data in, plain data out: step(sim, inputsBySeat) at 60 Hz, drainEvents(sim).
import { cfg, DIFFS } from '../core/config.js';
import { dist, clamp, pathLen } from './geom.js';
import { hooks, normalizeEnt, ev, spawn, remove, byId, active, bleeders, addVitals, rate, rnd, runCmds, startCodeBlue, nick } from './core.js';
import { stepTool, TOOLS, TOOL_OF, toolTargets } from './tools.js';
import { stepStrains, initStrain, STRAINS } from './strains.js';

export const DT = 1 / 60;
export function mkSeat(id, doctor = 'ilya', o = {}) {
  return { id, doctor, bot: false, x: 0, z: 0, tb: 0, sel: 'drain', tool: 'drain', use: false, use2: false, pUse: false, pUse2: false, force: 1, steady: false, gift: false, pGift: false, grab: null, cut: null, rotIn: 0, ...o };
}

export function createOp(def, opts = {}) {
  const diff = DIFFS[opts.difficulty || 'resident'];
  const seats = (opts.seats || [{ id: 0, doctor: def.surgeon }]).map((s, i) => mkSeat(s.id ?? i, s.doctor ?? def.surgeon, { bot: !!s.bot, x: -2 + i, z: 2, ...s }));
  const n = seats.filter((s) => !s.bot || true).length;
  const scale = 1 + cfg.coopScale * (Math.max(1, opts.humans ?? seats.length) - 1);
  const tbDefs = def.tables || [{ vitals: def.vitals.start, drain: def.vitals.drain }];
  const sim = {
    id: def.id, defId: def.id, rs: (opts.seed ?? 1) >>> 0, t: 0, tick: 0, nid: 0, diffId: opts.difficulty || 'resident', scale,
    tables: tbDefs.map((t) => ({ vitals: t.vitals, drain: t.drain, dead: false })), seats, ents: [], flags: {}, events: [], rings: [],
    stage: -1, stageT: 0, clock: def.time * diff.time * cfg.timeMul, clockMax: def.time * diff.time * cfg.timeMul, doses: def.doses, savesLeft: diff.saves,
    unlocked: [...(opts.unlocked ?? def.tools)], giftsOn: { quiet: !!opts.quietOn || def.gifts?.includes('quiet'), look: def.gifts?.includes('look') || false },
    composure: opts.composure ?? 40, quiet: false, awakened: !!opts.quietOn, composureShown: false,
    score: { pts: 0, clean: 0, good: 0, sloppy: 0, mistakes: 0, streak: 0, maxStreak: 0, per: {} }, cb: null, mass: null, over: null, why: null,
    lookUsed: 0, unscriptedCB: false, retried: !!opts.retried, cheat: opts.cheat || {}, fired: {}, hintOn: diff.hint && !def.noHint, _hist: [], _tip: [],
  };
  hooks.init = initStrain;
  if (opts.startStage) sim.stage = opts.startStage - 1;
  nextStage(sim, def);
  sim.def = undefined; Object.defineProperty(sim, 'def', { value: def, enumerable: false, writable: true });
  return sim;
}
const stageDef = (sim) => sim.def.stages[sim.stage];
function nextStage(sim, def = sim.def) {
  sim.stage++; sim.stageT = 0; const st = def.stages[sim.stage];
  if (!st) { sim.over = 'win'; ev(sim, 'win'); return; }
  sim.stageFired = {};
  if (st.say) ev(sim, 'say', { key: st.say });
  if (st.tb !== undefined) { for (const s of sim.seats) s.tb = st.tb; }
  if (st.cmds) runCmds(sim, st.cmds);
  for (const o of st.spawn || []) spawn(sim, structuredClone(o), st.tb ?? 0);
  ev(sim, 'stage', { i: sim.stage, id: st.id, title: st.title, hint: st.hint });
}
function check(sim, u, st) {
  if (!u) return false;
  if (u.all) return u.all.every((x) => check(sim, x, st));
  if (u.any) return u.any.some((x) => check(sim, x, st));
  if (u.clear) return !sim.ents.some((e) => u.clear.includes(e.k) && (u.tb === undefined || e.tb === u.tb));
  if (u.clearIds) return !sim.ents.some((e) => u.clearIds.includes(e.id));
  if (u.flag) return !!sim.flags[u.flag];
  if (u.done) return !!sim.flags['done:' + u.done];
  if (u.time !== undefined) return sim.stageT >= u.time;
  if (u.noMass) return !sim.mass;
  return false;
}
export const stageIndex = (sim) => sim.stage;
export function drainEvents(sim) { const e = sim.events; sim.events = []; return e; }

function snap(sim) { const { _hist, _tip, events, ...rest } = sim; return structuredClone(rest); }
function cursors(sim, dt) {
  const eff = cfg.cursorSpeed;
  for (const s of sim.seats) {
    const inp = s.inp || {};
    if (inp.px !== undefined && inp.px !== null) { s.x = clamp(inp.px, -7.6, 7.6); s.z = clamp(inp.pz, -4.2, 4.2); }
    else {
      const ax = inp.ax || 0, az = inp.az || 0, m = Math.hypot(ax, az);
      if (m > 0.01) {
        let sp = eff * Math.pow(Math.min(1, m), 2.2) * (s.steady ? cfg.steadyFactor : 1);
        if (cfg.aimAssist < 1) { for (const e of sim.ents) { if (e.tb === s.tb && TOOL_OF[e.k] === s.tool && !e.hid && dist(s.x, s.z, e.x, e.z) < 0.6) { sp *= cfg.aimAssist; break; } } }
        s.x = clamp(s.x + (ax / m) * sp * dt, -7.6, 7.6); s.z = clamp(s.z + (az / m) * sp * dt, -4.2, 4.2);
      }
    }
  }
}
function applyInputs(sim, inputs) {
  for (const s of sim.seats) {
    const i = (inputs && inputs[s.id]) || {}; s.inp = i;
    s.pUse2 = s.use2;
    s.use = !!i.use; s.use2 = !!i.use2; s.force = i.force ?? (s.use ? 1 : 0); s.steady = !!i.steady; s.rotIn = i.rot || 0;
    s.gift = !!i.gift;
    if (i.tool && sim.unlocked.includes(i.tool) && TOOLS.includes(i.tool)) s.sel = i.tool;
    s.tool = s.sel;
    if (sim.ents.some((e) => e.k === 'dress' && e.tb === s.tb && active(sim, e))) s.tool = 'dress';
    if (i.tbd && sim.tables.length > 1 && !s.pTb) { s.tb = (s.tb + i.tbd + sim.tables.length) % sim.tables.length; ev(sim, 'tbSwitch', { seat: s.id, tb: s.tb }); }
    s.pTb = !!i.tbd;
    if (i.tag && !s.pTag && sim.seats.length > 1 && sim.flags.tagOK) { const o = sim.seats.find((q) => q.id !== s.id); [s.doctor, o.doctor] = [o.doctor, s.doctor]; ev(sim, 'tag', { seat: s.id }); }
    s.pTag = !!i.tag;
  }
}

export function step(sim, inputs, dt = DT) {
  if (sim.over) return sim;
  sim.tick++; applyInputs(sim, inputs);
  cursors(sim, dt);
  if (sim.cb) { stepCodeBlue(sim, dt); return sim; }
  gifts(sim, dt);
  const sdt = sim.quiet ? dt * cfg.quietSlow : dt;
  // tools use the real clock; the world uses the slowed one
  for (const s of sim.seats) stepTool(sim, s, dt);
  stepMass(sim, dt);
  world(sim, sdt, dt);
  // history for The Second Look (10 Hz)
  if (sim.tick % 6 === 0) {
    sim._hist.push({ t: sim.t, snap: snap(sim) }); const keep = Math.ceil(cfg.lookSeconds * 10) + 2; while (sim._hist.length > keep) sim._hist.shift();
    sim._tip.push(sim.seats.map((s) => [s.x, s.z, s.tb, s.use ? 1 : 0, s.tool])); while (sim._tip.length > keep) sim._tip.shift();
  }
  return sim;
}

function gifts(sim, dt) {
  let q = false;
  for (const s of sim.seats) {
    if (s.doctor === 'ilya' && sim.giftsOn.quiet) {
      const can = sim.cheat.composure || sim.composure >= (sim.quiet ? 0.01 : 20);
      if (s.gift && can) { q = true; }
    }
    if (s.doctor === 'sabine' && sim.giftsOn.look && s.gift && !s.pGift) lookRewind(sim, s);
    s.pGift = s.gift;
  }
  if (q && !sim.quiet) ev(sim, 'quiet', { on: true });
  if (!q && sim.quiet) ev(sim, 'quiet', { on: false });
  sim.quiet = q;
  if (q && !sim.cheat.composure) { sim.composure = Math.max(0, sim.composure - cfg.quietDrain * dt); }
}
function lookRewind(sim, seat) {
  if (sim.cb || sim.composure < cfg.lookCost && !sim.cheat.composure || !sim._hist.length) { ev(sim, 'lookFail', { seat: seat.id }); return; }
  const target = sim._hist[0], ghost = sim._tip.map((r) => r.map((q) => q.slice()));
  const keep = sim.seats.map((s) => ({ id: s.id, x: s.x, z: s.z, sel: s.sel, use: s.use, pUse: true, tb: s.tb, gift: s.gift, inp: s.inp, doctor: s.doctor, pGift: true, pTag: s.pTag, pTb: s.pTb }));
  const comp = sim.composure - (sim.cheat.composure ? 0 : cfg.lookCost), lu = sim.lookUsed + 1, hist = sim._hist, tip = sim._tip, ev0 = sim.events, fl = sim.flags, cheat = sim.cheat;
  const restored = structuredClone(target.snap);
  for (const k of Object.keys(sim)) if (k !== '_hist' && k !== '_tip' && k !== 'events') delete sim[k];
  Object.assign(sim, restored);
  sim._hist = hist; sim._tip = tip; sim.events = ev0; sim.cheat = cheat;
  sim.composure = comp; sim.lookUsed = lu; sim.tick = sim.tick;
  for (const k of keep) { const s = sim.seats.find((q) => q.id === k.id); if (s) Object.assign(s, k); }
  for (const s of sim.seats) { s.grab = null; s.cut = null; s.lacId = null; s.sut = null; s.syr = null; }
  sim._hist.length = 0; sim._tip.length = 0;
  ev(sim, 'rewind', { ghost, seat: seat.id, secs: cfg.lookSeconds });
}

function world(sim, sdt, dt) {
  sim.t += sdt; sim.stageT += sdt;
  const st = stageDef(sim), def = sim.def;
  // timeline
  for (const [i, tl] of (def.timeline || []).entries()) if (!sim.fired[i] && sim.t >= tl.at) { sim.fired[i] = true; runCmds(sim, tl.cmds || tl); }
  // entity passives
  for (const e of [...sim.ents]) {
    if (typeof e.hid === 'string' && e.hid.startsWith('p:') && !sim.ents.some((x) => x.id === e.hid.slice(2))) { e.hid = null; ev(sim, 'reveal', { id: e.id, x: e.x, z: e.z, tb: e.tb }); }
    if (e.k === 'polyp' || e.k === 'cyst' || e.k === 'egg') { if (e.heat > 0 && sim.t - (e.lz ?? -9) > 0.25) e.heat = Math.max(0, e.heat - sdt * 1.5); }
    if (e.k === 'eyeT' && !e.sk && e.heat > 0 && sim.t - (e.lz ?? -9) > 0.25) e.heat = Math.max(0, e.heat - sdt * 1.5);
    if (e.k === 'nick') e.age = (e.age || 0) + sdt;
    if (e.k === 'drag' && e.fall) { /* reserved */ }
    if (e.k === 'lac' && e.urgent && e.tied < e.n && !e.noBleed) { /* counts as bleeder */ }
  }
  stepStrains(sim, sdt);
  stepTether2(sim);
  // vitals
  for (let tb = 0; tb < sim.tables.length; tb++) {
    const t = sim.tables[tb]; if (t.dead) continue;
    const bleed = bleeders(sim, tb) * cfg.bleedDrain;
    if (!sim.quiet && !sim.cheat.god) {
      const rate0 = t.drain * (sim.diffId ? DIFFS[sim.diffId].drain : 1) * cfg.drainMul * sim.scale * (sim.def.drainScale?.(sim) ?? 1);
      const prev = t.vitals; t.vitals = Math.max(0, t.vitals - Math.min(2, rate0 + bleed) * sdt);
      if (prev >= 30 && t.vitals < 30) ev(sim, 'low', { tb, lv: 30 }); if (prev >= 15 && t.vitals < 15) ev(sim, 'low', { tb, lv: 15 });
    }
    if (sim.cheat.god) t.vitals = Math.max(t.vitals, 60);
    if (t.vitals <= 0 && !sim.cb) {
      if (sim.tables.length > 1) { t.dead = true; fail(sim, 'patient lost'); return; }
      if (sim.savesLeft > 0) { sim.savesLeft--; const cb = startCodeBlue(sim, false); cb.tb = tb; } else { fail(sim, 'vitals'); return; }
    }
  }
  // cold-time bar
  if (sim.cold > 0) { sim.cold -= sdt; if (sim.cold <= 0) { sim.cold = 0; fail(sim, 'cold time'); return; } }
  // clock
  if (!sim.cheat.freezeClock) { sim.clock -= sdt; if (sim.clock <= 0) { sim.clock = 0; fail(sim, 'time'); return; } }
  if (sim.score.mistakes >= cfg.maxMistakes && cfg.maxMistakes > 0 && !sim.cheat.unlimited) { fail(sim, 'mistakes'); return; }
  // stage conditions
  if (st) {
    for (const [lv, c] of Object.entries(st.on?.vitalsBelow || {})) if (!sim.stageFired['v' + lv] && sim.tables[0].vitals < +lv) { sim.stageFired['v' + lv] = true; runCmds(sim, c); }
    if (st.on?.time) for (const [at, c] of Object.entries(st.on.time)) if (!sim.stageFired['t' + at] && sim.stageT >= +at) { sim.stageFired['t' + at] = true; runCmds(sim, c); }
    if (st.on?.flag) for (const [fl, c] of Object.entries(st.on.flag)) if (!sim.stageFired['f' + fl] && sim.flags[fl]) { sim.stageFired['f' + fl] = true; runCmds(sim, c); }
    if (check(sim, st.until, st)) { ev(sim, 'stageDone', { i: sim.stage, id: st.id }); if (st.after) runCmds(sim, st.after); nextStage(sim); }
  }
  // falling bleed particles etc are view-side
}
function fail(sim, why) { sim.over = 'fail'; sim.why = why; ev(sim, 'fail', { why }); }
export const forceFail = fail;
export const forceWin = (sim) => { sim.over = 'win'; ev(sim, 'win'); };

function stepTether2(sim) {
  for (const e of sim.ents) {
    if (e.k !== 'hook2') continue;
    const hold = sim.seats.filter((s) => s.tb === e.tb && s.use && s.tool === 'forceps' && dist(s.x, s.z, e.x, e.z) < 1.2);
    e.holders = hold.length;
    if (hold.length >= 2) {
      const mx = (hold[0].x + hold[1].x) / 2, mz = (hold[0].z + hold[1].z) / 2; e.p = dist(mx, mz, e.ox, e.oz); e.x = mx; e.z = mz;
      if (e.p >= e.pull) { remove(sim, e.id); STRAINS.miserere.onPop(sim, e); startCodeBlue(sim, true); ev(sim, 'bigPull', {}); return; }
    } else if (e.p > 0) { e.p = Math.max(0, e.p - 1.5 / 60); e.x = e.ox + (e.x - e.ox) * 0.9; e.z = e.oz + (e.z - e.oz) * 0.9; }
  }
}

function stepMass(sim, dt) {
  const m = sim.mass; if (!m) return;
  const h = sim.heart; if (h) { /* heart phase advances in wrath.step */ }
  const ph = h ? h.phase : 0;
  for (const s of sim.seats) {
    for (const side of ['L', 'R']) {
      const now = side === 'L' ? s.use : s.use2, prev = side === 'L' ? s.pUseM : s.pUse2M;
      if (side === 'L') s.pUseM = now; else s.pUse2M = now;
      if (now && !prev) {
        const inWin = ph < 0.25 || ph > 0.75;
        if (inWin && m.last !== side && sim.t - (m.lt ?? -9) > 0.25) { m.n++; m.last = side; m.lt = sim.t; ev(sim, 'massage', { n: m.n, side, tb: m.tb }); rate(sim, s, 'clean', 0, 0, { why: 'massage' }); if (m.n >= m.need) { sim.mass = null; ev(sim, 'massDone'); return; } }
        else ev(sim, 'massMiss', { side });
      }
    }
  }
}
function stepCodeBlue(sim, dt) {
  const cb = sim.cb; cb.flash = Math.max(0, cb.flash - dt);
  const both = sim.seats.some((s) => s.use) && sim.seats.some((s) => s.use2) || sim.seats.some((s) => s.use && s.use2);
  cb.left -= dt;
  if (both) { if (!cb.charging) { cb.charging = true; cb.charge = 0; ev(sim, 'cbCharge'); } cb.charge += dt; const ph = (cb.charge / 1.2) % 2; cb.pos = ph < 1 ? ph : 2 - ph; }
  else if (cb.charging) {
    cb.charging = false; const good = Math.abs(cb.pos - 0.7) <= cb.zone / 2 * (cfg.codeBlueZone / 0.2) / (cb.zone / 0.2 * 0.2 / 0.2);
    const zone = cfg.codeBlueZone; const ok = Math.abs(cb.pos - 0.7) <= zone / 2;
    if (ok) { cb.goods++; cb.flash = 0.4; ev(sim, 'shock', { good: true, goods: cb.goods }); if (cb.goods >= (cb.need ?? 2)) {
      if (cb.fib) { sim.heart.bpm = 90; ev(sim, 'fibEnd'); }
      else addVitals(sim, cb.tb, 25 - sim.tables[cb.tb].vitals);
      sim.cb = null; ev(sim, 'cbSaved', { scripted: cb.scripted }); runCmds(sim, sim.def.cbThen || []); return; } }
    else { cb.left -= 3; ev(sim, 'shock', { good: false }); }
  }
  if (cb.left <= 0) { sim.cb = null; fail(sim, 'code blue'); }
}

// ---- results ----
export function rankOf(pct) { return pct >= 0.85 ? 'S' : pct >= 0.7 ? 'A' : pct >= 0.5 ? 'B' : 'C'; }
export function result(sim, def = sim.def) {
  const sc = sim.score, vit = sim.tables.reduce((a, t) => a + t.vitals, 0) / sim.tables.length;
  const timeBonus = Math.round(sim.clock * 5), vitBonus = Math.round(vit * 10);
  let total = sc.pts + timeBonus + vitBonus; if (sim.lookUsed) total = Math.round(total * (1 - 0.05 * sim.lookUsed));
  const par = def.par * (1 + 0.8 * (sim.seats.filter((s) => !s.bot).length - 1));
  const pct = total / par; let rank = rankOf(pct);
  const order = 'SABC'; let cap = null;
  if (sim.unscriptedCB) cap = 'A'; if (sim.retried) cap = 'B';
  if (cap && order.indexOf(rank) < order.indexOf(cap)) rank = cap;
  const pristine = rank === 'S' && sc.mistakes === 0;
  return { total, pct, rank, pristine, timeBonus, vitBonus, vit: Math.round(vit), timeLeft: Math.round(sim.clock), mistakes: sc.mistakes, maxStreak: sc.maxStreak, clean: sc.clean, good: sc.good, sloppy: sc.sloppy, points: sc.pts, capped: cap };
}
export function hash(sim) {
  const s = JSON.stringify([sim.t.toFixed(3), sim.tables, sim.score, sim.ents.map((e) => [e.id, e.k, +(e.x ?? 0).toFixed(3), +(e.z ?? 0).toFixed(3)]), sim.seats.map((x) => [x.x.toFixed(3), x.z.toFixed(3)]), sim.stage]);
  let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0;
}
export { TOOLS, toolTargets };
