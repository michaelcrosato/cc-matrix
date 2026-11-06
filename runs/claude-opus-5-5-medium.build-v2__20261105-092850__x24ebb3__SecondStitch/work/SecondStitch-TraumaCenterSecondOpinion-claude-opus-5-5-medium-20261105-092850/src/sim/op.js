// The operation: createOp / step / drainEvents. Plain data and pure functions; no engine, DOM or clock.
import { config as liveConfig, DIFFICULTY } from '../core/config.js';
import { hashString, nextRandom } from '../core/rng.js';
import { LINES } from '../content/lines.js';
import { dist } from './geom.js';
import { KINDS, removeEnt, spawn, entBySid, visible, toolFor, aimPoint, entById } from './entities.js';
import { TOOLS, toolStep } from './tools.js';
import { STRAINS } from './strains/index.js';
import { rate, MISTAKE_COST } from './scoring.js';

const DT = 1 / 60;
const DEFS = new Map();
export const registerOp = (def) => { DEFS.set(def.id, def); return def; };
export const defOf = (sim) => DEFS.get(sim.opId);

function makeSeat(i, def, opts) {
  const tool = def.startTool ?? def.tools[0] ?? 'drain';
  const gift = opts.gifts?.[i] ?? (i % 2 === 0 ? (def.surgeon === 'sabine' ? 'look' : 'quiet') : 'look');
  return {
    i, x: [1.5, -1.5, 1.5, -1.5][i], z: [1.2, 1.2, -1.2, -1.2][i], table: 0, tool, lastTool: tool, gift,
    useHeld: false, grab: null, grabT: 0, cool: 0, dryT: 0, strayT: 0, stroke: null, side: 0, drawing: 0, dressing: null,
    giftHeld: false, tagHeld: false, swHeld: 0, trail: [], score: 0, stitches: 0, drained: 0, devSum: 0, devT: 0, saves: 0,
    ratings: { CLEAN: 0, GOOD: 0, SLOPPY: 0, MISTAKE: 0 }, padL: false, padR: false, beatHit: -1, out: false,
  };
}

export function createOp(def, { seed = 1, seats = 1, difficulty = 'resident', cfg = liveConfig, stage = 0, cheats = {}, gifts = null, retried = false, session = false } = {}) {
  registerOp(def);
  const diff = DIFFICULTY[difficulty] ?? DIFFICULTY.resident;
  const tablesDef = def.tables ?? [{ vitals: def.vitals.start }];
  const coop = 1 + (cfg.coopScale ?? 0.25) * (seats - 1);
  const time = def.time * diff.time * cfg.timeLimit;
  const sim = {
    opId: def.id, seed, rng: (hashString(def.id) ^ seed) | 0, difficulty, session,
    t: 0, realT: 0, clock: time, clockMax: time, phase: 'play', stage: -1, stageT: 0,
    tables: tablesDef.map((t) => ({ vitals: t.vitals, drain: def.vitals.drain, fake: null, lost: false, name: t.name ?? null, low: false })),
    ents: [], nextId: 1, drops: [], films: [], scars: [], flags: {}, fired: {}, counters: {},
    tools: [...def.tools], def_film: !!def.film, composure: def.composure ?? 40, giftOn: !!(def.gifts && def.gifts.length),
    score: 0, streak: 0, bestStreak: 0, mistakes: 0, doses: def.doses, port: def.port ?? [-5.2, 2.2],
    ratings: { CLEAN: 0, GOOD: 0, SLOPPY: 0, MISTAKE: 0 },
    codeBlues: 0, saves: diff.saves, unscriptedBlue: false, retried, looks: 0, codeBlue: null, massage: null,
    quiet: false, quietSeat: -1, heart: null, ghost: null, mimic: null, cold: null, pain: def.pain ?? null,
    voiceOff: !!def.noVoice, noHint: !!def.noHint || !diff.hint, hint: null, doctor: def.surgeon ?? 'ilya',
    music: def.music ?? 'or-calm', lastQuip: -9, lineIx: {}, coop, camera: null,
    seats: Array.from({ length: seats }, (_, i) => makeSeat(i, def, { gifts })),
    cfg, cheats: { god: false, infComposure: false, freezeClock: false, unlimitedMistakes: false, ...cheats },
    events: [], ring: [], ringN: 0, checkpoint: null, meta: {},
  };
  if (stage > 0) {
    for (let i = 0; i < stage && i < def.stages.length; i++) if (def.stages[i].jump) runCmds(sim, def.stages[i].jump, true);
    sim.stage = stage - 1;
    sim.ents.length = 0;
  }
  nextStage(sim);
  return sim;
}

export const drainEvents = (sim) => { const e = sim.events; sim.events = []; return e; };

/** Copy of the state without the things that aren't part of a moment. */
export function cloneState(sim) {
  const { ring, checkpoint, events, cfg, meta } = sim;
  sim.ring = null; sim.checkpoint = null; sim.events = null; sim.cfg = null; sim.meta = null;
  const c = structuredClone(sim);
  sim.ring = ring; sim.checkpoint = checkpoint; sim.events = events; sim.cfg = cfg; sim.meta = meta;
  return c;
}
export function hashSim(sim) { return hashString(JSON.stringify(cloneState(sim))).toString(16); }

/* ---- comm ---- */
export function say(sim, who, text, force = false) {
  if (sim.voiceOff && !force) return;
  sim.events.push({ t: 'say', who, text });
}
export function sayKey(sim, key) {
  const [who] = key.split('.');
  const pool = LINES[key];
  if (!pool) return;
  const n = (sim.lineIx[key] = (sim.lineIx[key] ?? -1) + 1);
  const line = pool[n % pool.length];
  say(sim, who === 'false' ? 'reyes' : who, line);
}

/* ---- vitals and mistakes ---- */
export function addVitals(sim, table, v) {
  const t = sim.tables[table] ?? sim.tables[0];
  t.vitals = Math.max(0, Math.min(99, t.vitals + v));
}
export function hurt(sim, table, v) {
  if (sim.cheats.god) { const t = sim.tables[table]; t.vitals = Math.max(5, t.vitals - v); return; }
  addVitals(sim, table, -v);
}
export function mistake(sim, seat, reason, x, z) {
  sim.mistakes++;
  sim.ratings.MISTAKE++;
  seat.ratings.MISTAKE++;
  sim.score = Math.max(0, sim.score - MISTAKE_COST);
  seat.score = Math.max(0, seat.score - MISTAKE_COST);
  sim.streak = 0;
  hurt(sim, seat.table, sim.cfg.mistakePenalty);
  sim.events.push({ t: 'rate', r: 'MISTAKE', x, z, seat: seat.i, reason, pts: -MISTAKE_COST });
  sayKey(sim, 'reyes.mistake');
  if (sim.cfg.maxMistakes > 0 && !sim.cheats.unlimitedMistakes && sim.mistakes >= sim.cfg.maxMistakes) lose(sim, 'mistakes');
}
export function addScar(sim, scar) {
  sim.scars.push(scar);
  if (sim.scars.length > 60) sim.scars.shift();
}
export function lose(sim, why) {
  if (sim.phase === 'lost' || sim.phase === 'won') return;
  sim.phase = 'lost';
  sim.loseWhy = why;
  sim.codeBlue = null;
  sim.events.push({ t: 'lost', why });
}
export function win(sim) {
  if (sim.phase === 'lost' || sim.phase === 'won') return;
  sim.phase = 'won';
  sim.events.push({ t: 'won' });
}

/* ---- strains ---- */
export function signal(sim, ownerId, sig, ent, seat) {
  const owner = entById(sim, ownerId);
  if (!owner || owner.k !== 'strain') return;
  STRAINS[owner.type]?.on?.(sim, owner, sig, ent, seat);
}
export function inSystole(sim) { return !!sim.heart && sim.heart.phase < 0.35; }

/* ---- commands: what stages and entities can do, as data ---- */
export function runCmds(sim, cmds, silent = false) {
  for (const c of Array.isArray(cmds) ? cmds : [cmds]) {
    if (c.say) { if (!silent) { if (Array.isArray(c.say)) say(sim, c.say[0], c.say[1], !!c.force); else sayKey(sim, c.say); } }
    if (c.spawn) for (const d of c.spawn) spawn(sim, d);
    if (c.remove) for (const sid of c.remove) { const e = entBySid(sim, sid); if (e) removeEnt(sim, e); }
    if (c.removeKinds) for (const e of [...sim.ents]) if (c.removeKinds.includes(e.k)) removeEnt(sim, e);
    if (c.unlock) { const list = Array.isArray(c.unlock) ? c.unlock : [c.unlock]; for (const u of list) { if (u === 'gift') sim.giftOn = true; else if (TOOLS.includes(u)) { if (!sim.tools.includes(u)) { sim.tools.push(u); sim.events.push({ t: 'unlock', tool: u }); } } else { const e = entBySid(sim, u); if (e) delete e.locked; } } }
    if (c.setDrain != null) for (const t of sim.tables) t.drain = c.setDrain;
    if (c.music) { sim.music = c.music; sim.events.push({ t: 'music', id: c.music }); }
    if (c.camera) { sim.camera = c.camera; sim.events.push({ t: 'camera', id: c.camera }); }
    if (c.flag) sim.flags[c.flag] = true;
    if (c.codeBlue) enterCodeBlue(sim, c.table ?? 0, true);
    if (c.massage) enterMassage(sim, c.massage);
    if (c.vitals != null) addVitals(sim, c.table ?? 0, c.vitals);
    if (c.setVitals != null) sim.tables[c.table ?? 0].vitals = c.setVitals;
    if (c.fake !== undefined) sim.tables[c.table ?? 0].fake = c.fake;
    if (c.composure != null) sim.composure = Math.min(100, Math.max(sim.composure, c.composure));
    if (c.hurt != null) hurt(sim, c.table ?? 0, c.hurt);
    if (c.pain != null) sim.pain = c.pain;
    if (c.cold != null) sim.cold = c.cold ? { t: c.cold, max: c.cold } : null;
    if (c.pinkUp) sim.events.push({ t: 'pinkUp' });
    if (c.sfx) sim.events.push({ t: 'sfx', id: c.sfx, x: 0, z: 0 });
    if (c.voice != null) sim.voiceOff = !c.voice;
    if (c.fx) sim.events.push({ t: 'fx', id: c.fx });
    if (c.prompt) sim.events.push({ t: 'prompt', text: c.prompt });
    if (c.mimic != null) sim.mimic = c.mimic ? { hits: 0, cool: 0 } : null;
    if (c.heart) sim.heart = { bpm: c.heart, phase: 0.4, beats: 0 };
    if (c.noHeart) sim.heart = null;
    if (c.addTime != null) { sim.clock += c.addTime; sim.clockMax = Math.max(sim.clockMax, sim.clock); }
    if (c.tag) sim.tagOn = true;
    if (c.win) win(sim);
  }
}

function nextStage(sim) {
  const def = defOf(sim);
  sim.stage++;
  sim.stageT = 0;
  sim.fired = {};
  if (sim.stage >= def.stages.length) { win(sim); return; }
  const st = def.stages[sim.stage];
  if (st.skipIf && sim.meta[st.skipIf]) { nextStage(sim); return; }
  sim.events.push({ t: 'stage', i: sim.stage, id: st.id });
  if (st.begin) runCmds(sim, st.begin);
  if (st.say) runCmds(sim, { say: st.say });
  if (st.spawn) for (const d of st.spawn) spawn(sim, d);
  if (st.music) runCmds(sim, { music: st.music });
  if (sim.phase === 'play' || sim.phase === 'codeblue') {
    sim.checkpoint = cloneState(sim);
    sim.checkpointStage = sim.stage;
  }
}

/** Is a stage's `until` satisfied? */
export function check(sim, u) {
  if (!u) return false;
  if (u.all) return u.all.every((c) => check(sim, c));
  if (u.any) return u.any.some((c) => check(sim, c));
  if (u.clear) return !sim.ents.some((e) => u.clear.includes(e.k) && !e.isFalse && (u.table == null || e.table === u.table));
  if (u.flag) return !!sim.flags[u.flag];
  if (u.meta) return !!sim.meta[u.meta];
  if (u.time != null) return sim.stageT >= u.time;
  if (u.sids) return !u.sids.some((sid) => entBySid(sim, sid));
  return false;
}

function stageLogic(sim) {
  const def = defOf(sim);
  const st = def.stages[sim.stage];
  if (!st) return;
  if (st.timed) for (let i = 0; i < st.timed.length; i++) {
    const tm = st.timed[i];
    if (sim.fired[`t${i}`]) continue;
    const go = tm.t != null ? sim.stageT >= tm.t : check(sim, tm.when);
    if (go) { sim.fired[`t${i}`] = true; runCmds(sim, tm); }
  }
  const low = st.on?.vitalsBelow;
  if (low) for (const k of Object.keys(low)) {
    const key = `v${k}`;
    if (!sim.fired[key] && sim.tables.some((t) => t.vitals < +k)) { sim.fired[key] = true; runCmds(sim, low[k]); }
  }
  if (check(sim, st.until)) {
    if (st.then) runCmds(sim, st.then);
    if (sim.phase === 'play') nextStage(sim);
    else sim.pendingStage = true;
  }
}

/* ---- Code Blue ---- */
export function enterCodeBlue(sim, table, scripted) {
  if (sim.cheats.god && !scripted) return;
  sim.codeBlue = { t: 12, shocks: 0, need: 2, charge: 0, needle: 0, charging: false, cool: 0.5, scripted, table, zone: sim.cfg.codeBlueZone, centre: 0.72, bad: 0 };
  sim.phase = 'codeblue';
  sim.quiet = false;
  if (!scripted) { sim.codeBlues++; sim.unscriptedBlue = true; }
  else sim.tables[table].vitals = Math.min(sim.tables[table].vitals, 0);
  sim.events.push({ t: 'codeblue', on: true, scripted, table });
}
function codeBlueStep(sim, inputs) {
  const cb = sim.codeBlue;
  cb.t -= DT;
  cb.cool = Math.max(0, cb.cool - DT);
  const anyL = inputs.some((i) => i?.padL), anyR = inputs.some((i) => i?.padR);
  const both = (anyL && anyR) || inputs.some((i) => i?.padL && i?.padR);
  if (both && cb.cool <= 0) {
    if (!cb.charging) sim.events.push({ t: 'sfx', id: 'charge' });
    cb.charging = true;
    cb.charge += DT;
    cb.needle = 0.5 - 0.5 * Math.cos((cb.charge / 1.2) * Math.PI * 2);
  } else if (cb.charging) {
    cb.charging = false;
    const good = Math.abs(cb.needle - cb.centre) <= cb.zone / 2;
    cb.charge = 0;
    cb.cool = 0.35;
    sim.events.push({ t: 'shock', good, n: cb.shocks + (good ? 1 : 0) });
    if (good) {
      cb.shocks++;
      for (const i of inputs.keys()) if (inputs[i]?.padL || inputs[i]?.padR || inputs.length === 1) sim.seats[i].saves++;
      if (cb.shocks >= cb.need) {
        sim.tables[cb.table].vitals = Math.max(25, sim.tables[cb.table].vitals);
        sim.phase = 'play';
        sim.codeBlue = null;
        sim.events.push({ t: 'codeblue', on: false });
        if (cb.scripted) sim.flags.scriptedBlueDone = true;
        sim.flags.blueDone = true;
        return;
      }
    } else cb.t -= 3;
  }
  if (cb.t <= 0) { sim.tables[cb.table].lost = true; lose(sim, 'codeblue'); }
}

/* ---- Massage ---- */
export function enterMassage(sim, need) {
  sim.massage = { need, count: 0, last: 0, t: 0, period: 60 / 66, window: 0.26, timer: 40, heldL: false, heldR: false };
  sim.phase = 'massage';
  sim.quiet = false;
  sim.events.push({ t: 'massage', on: true });
}
function massageStep(sim, inputs) {
  const m = sim.massage;
  m.t += DT;
  m.timer -= DT;
  const L = inputs.some((i) => i?.padL), R = inputs.some((i) => i?.padR);
  const press = L && !m.heldL ? 1 : R && !m.heldR ? 2 : 0;
  m.heldL = L; m.heldR = R;
  if (press) {
    const ph = (m.t % m.period), off = Math.min(ph, m.period - ph);
    if (off <= m.window && press !== m.last) {
      m.count++;
      m.last = press;
      sim.events.push({ t: 'squeeze', side: press, n: m.count });
      rate(sim, sim.seats[0], off < 0.12 ? 'CLEAN' : 'GOOD', 0, 0);
    } else {
      sim.events.push({ t: 'sfx', id: 'tick', x: 0, z: 0 });
    }
    if (m.count >= m.need) {
      sim.massage = null;
      sim.phase = 'play';
      sim.flags.massaged = true;
      sim.events.push({ t: 'massage', on: false });
      return;
    }
  }
  if (m.timer <= 0) lose(sim, 'massage');
}

/* ---- gifts ---- */
function giftStep(sim, seat, inp) {
  const g = !!inp.gift;
  const rising = g && !seat.giftHeld;
  seat.giftHeld = g;
  if (!sim.giftOn) return;
  if (seat.gift === 'quiet') {
    if (sim.quiet && sim.quietSeat === seat.i) {
      if (!g || sim.composure <= 0) { sim.quiet = false; sim.quietSeat = -1; sim.events.push({ t: 'quiet', on: false }); }
    } else if (rising && !sim.quiet) {
      if (sim.composure >= 20) { sim.quiet = true; sim.quietSeat = seat.i; sim.counters.quiet = (sim.counters.quiet ?? 0) + 1; sim.events.push({ t: 'quiet', on: true }); sim.flags.usedQuiet = true; }
      else sim.events.push({ t: 'sfx', id: 'tick', x: seat.x, z: seat.z });
    }
  } else if (seat.gift === 'look' && rising) {
    const cost = sim.cfg.lookCost;
    if (sim.composure >= cost && sim.ring.length > 0) secondLook(sim, cost);
    else sim.events.push({ t: 'sfx', id: 'tick', x: seat.x, z: seat.z });
  }
}

export function secondLook(sim, cost) {
  const framesBack = Math.round(sim.cfg.lookSeconds * 10);
  const idx = Math.max(0, sim.ring.length - framesBack);
  const past = sim.ring[idx];
  const ghosts = sim.seats.map((s) => s.trail.slice());
  const keepSeats = sim.seats.map((s) => ({ x: s.x, z: s.z, tool: s.tool, lastTool: s.lastTool, table: s.table, score: s.score, ratings: s.ratings, stitches: s.stitches, saves: s.saves, gift: s.gift }));
  const { ring, checkpoint, events, cfg, meta, checkpointStage } = sim;
  const composure = Math.max(0, sim.composure - cost);
  const looks = sim.looks + 1;
  const copy = structuredClone(past);
  for (const k of Object.keys(sim)) delete sim[k];
  Object.assign(sim, copy, { ring: ring.slice(0, idx), checkpoint, events, cfg, meta, checkpointStage, composure, looks });
  sim.seats.forEach((s, i) => {
    Object.assign(s, keepSeats[i], { grab: null, stroke: null, useHeld: false, side: 0, drawing: 0, dressing: null, trail: [], giftHeld: true });
  });
  sim.ghost = { seats: ghosts, i: 0, t: 0 };
  sim.flags.usedLook = true;
  sim.meta.looked = true;
  sim.events.push({ t: 'look', from: idx });
}

/* ---- the step ---- */
const NO_INPUT = {};
export function step(sim, inputs = []) {
  if (sim.phase === 'won' || sim.phase === 'lost') return;
  sim.realT += DT;
  const ins = sim.seats.map((_, i) => inputs[i] ?? NO_INPUT);
  if (sim.phase === 'codeblue') {
    readPositions(sim, ins);
    codeBlueStep(sim, ins);
    if (sim.phase === 'play' && sim.pendingStage) { sim.pendingStage = false; nextStage(sim); }
    return;
  }
  if (sim.phase === 'massage') {
    readPositions(sim, ins);
    massageStep(sim, ins);
    if (sim.phase === 'play' && sim.pendingStage) { sim.pendingStage = false; nextStage(sim); }
    return;
  }
  readPositions(sim, ins);
  const seatsNow = sim.seats;
  for (const seat of seatsNow) {
    if (seat.out) continue;
    const inp = ins[seat.i];
    selectTool(sim, seat, inp);
    if (inp.tag && !seat.tagHeld && sim.tagOn) tagDoctors(sim, seat);
    seat.tagHeld = !!inp.tag;
    giftStep(sim, seat, inp);
    if (sim.seats !== seatsNow) break; // a Second Look swapped the whole state
  }
  const slow = sim.quiet ? sim.cfg.quietSlow : 1;
  const dt = DT * slow;
  sim.t += dt;
  sim.stageT += dt;
  if (sim.quiet && !sim.cheats.infComposure) sim.composure = Math.max(0, sim.composure - sim.cfg.quietDrain * DT);
  if (sim.cheats.infComposure) sim.composure = 100;
  for (const seat of sim.seats) {
    if (seat.out) continue;
    toolStep(sim, seat, ins[seat.i]);
    if (sim.phase !== 'play') return;
    trail(sim, seat, ins[seat.i]);
  }
  worldStep(sim, dt);
  if (sim.phase !== 'play') return;
  stageLogic(sim);
  if (sim.phase === 'play') {
    updateHint(sim);
    if (++sim.ringN >= 6) { sim.ringN = 0; pushRing(sim); }
  }
}

function pushRing(sim) {
  if (sim.seats.every((s) => s.gift !== 'look')) return;
  sim.ring.push(cloneState(sim));
  if (sim.ring.length > 42) sim.ring.shift();
}

function readPositions(sim, ins) {
  for (const seat of sim.seats) {
    const inp = ins[seat.i];
    if (inp.x != null) { seat.x = inp.x; seat.z = inp.z; }
    if (inp.table != null && inp.table !== seat.table && sim.tables[inp.table]) {
      seat.table = inp.table;
      sim.events.push({ t: 'table', seat: seat.i, table: inp.table });
      if (seat.grab) seat.grab = null;
    }
  }
}

function selectTool(sim, seat, inp) {
  if (inp.tool && inp.tool !== seat.tool && TOOLS.includes(inp.tool) && (sim.tools.includes(inp.tool))) {
    seat.lastTool = seat.tool;
    seat.tool = inp.tool;
    seat.drawing = 0;
    seat.stroke = null;
    if (seat.grab) seat.grab = null;
    sim.events.push({ t: 'tool', seat: seat.i, tool: inp.tool });
  }
}

function tagDoctors(sim, seat) {
  sim.doctor = sim.doctor === 'ilya' ? 'sabine' : 'ilya';
  seat.gift = seat.gift === 'quiet' ? 'look' : 'quiet';
  if (sim.quiet) { sim.quiet = false; sim.quietSeat = -1; sim.events.push({ t: 'quiet', on: false }); }
  sim.events.push({ t: 'tag', doctor: sim.doctor });
}

function trail(sim, seat, inp) {
  if (sim.ringN !== 0) return;
  seat.trail.push(+seat.x.toFixed(2), +seat.z.toFixed(2), inp.use > 0.15 ? 1 : 0);
  if (seat.trail.length > 150) seat.trail.splice(0, 3);
}

function worldStep(sim, dt) {
  const def = defOf(sim);
  // the clock
  if (!sim.cheats.freezeClock) {
    sim.clock -= dt;
    if (sim.clock <= 0) {
      sim.clock = 0;
      if (def.clockWins) { win(sim); return; }
      lose(sim, 'clock');
      return;
    }
  }
  // grown bleeders
  for (const e of sim.ents) if (e.k === 'bleeder' && e.r < (e.rMax ?? 1.4)) e.r += (e.grow ?? 0.12) * dt;
  // vitals
  if (!sim.quiet) {
    const diff = DIFFICULTY[sim.difficulty] ?? DIFFICULTY.resident;
    sim.tables.forEach((t, ti) => {
      let bleed = 0;
      for (const e of sim.ents) if (e.table === ti) { const w = KINDS[e.k].bleed; if (w) bleed += w; }
      const d = Math.min(2, t.drain * diff.drain * sim.cfg.vitalsDrain * sim.coop + bleed * sim.cfg.bleedDrain) * DT;
      hurt(sim, ti, d);
      const low = t.vitals < 30;
      if (low && !t.low) { sim.events.push({ t: 'lowVitals', table: ti }); if (ti === sim.seats[0].table) sayKey(sim, 'reyes.lowVitals'); }
      t.low = low;
    });
    for (let ti = 0; ti < sim.tables.length; ti++) {
      if (sim.tables[ti].vitals <= 0) {
        if (sim.codeBlues < sim.saves) enterCodeBlue(sim, ti, false);
        else { sim.tables[ti].lost = true; lose(sim, 'vitals'); }
        return;
      }
    }
  }
  // cold time
  if (sim.cold) {
    sim.cold.t -= dt;
    if (sim.cold.t <= 0) { sim.cold.t = 0; lose(sim, 'cold'); return; }
  }
  // heartbeat
  if (sim.heart) {
    const before = sim.heart.phase;
    sim.heart.phase = (sim.heart.phase + (sim.heart.bpm / 60) * dt) % 1;
    if (sim.heart.phase < before) { sim.heart.beats++; sim.events.push({ t: 'beat', bpm: sim.heart.bpm }); }
  }
  // strains
  for (const e of [...sim.ents]) {
    if (e.k === 'strain') { STRAINS[e.type]?.step?.(sim, e, dt); if (sim.phase !== 'play') return; }
    if (e.expires != null) {
      e.expires -= dt;
      if (e.expires <= 0) {
        const owner = e.owner, sig = e.onExpire;
        removeEnt(sim, e);
        if (sig) signal(sim, owner, sig, e, sim.seats[0]);
        if (e.expireCmds) runCmds(sim, e.expireCmds);
      }
    }
  }
  // droplets and film
  dropsStep(sim, dt);
  for (let i = sim.films.length - 1; i >= 0; i--) { sim.films[i].t -= dt; if (sim.films[i].t <= 0) sim.films.splice(i, 1); }
  // ghost hand
  if (sim.ghost) { sim.ghost.t += DT; sim.ghost.i = Math.floor(sim.ghost.t * 10); if (sim.ghost.i * 3 >= (sim.ghost.seats[0]?.length ?? 0)) sim.ghost = null; }
  // the mimic
  if (sim.mimic) mimicStep(sim);
}

function dropsStep(sim, dt) {
  for (let i = sim.drops.length - 1; i >= 0; i--) {
    const d = sim.drops[i];
    if (d.home) {
      const s = sim.seats[0], m = Math.hypot(s.x - d.x, s.z - d.z) || 1;
      d.vx += ((s.x - d.x) / m) * 0.9 * dt; d.vz += ((s.z - d.z) / m) * 0.5 * dt;
    }
    d.x += d.vx * dt; d.z += d.vz * dt; d.life -= dt;
    if (sim.films.some((f) => dist(f.x, f.z, d.x, d.z) < 0.7)) { sim.drops.splice(i, 1); sim.events.push({ t: 'sfx', id: 'fizz', x: d.x, z: d.z }); continue; }
    if (d.life <= 0 || d.z > 3.3) {
      sim.drops.splice(i, 1);
      hurt(sim, d.table, 1);
      if (sim.ents.filter((e) => e.k === 'nick').length < 8) spawn(sim, { k: 'nick', at: [d.x, Math.min(3, d.z)], table: d.table });
      sim.events.push({ t: 'sfx', id: 'dropHit', x: d.x, z: d.z });
    }
  }
}

function mimicStep(sim) {
  const m = sim.mimic, s = sim.seats[0];
  m.cool = Math.max(0, m.cool - DT);
  const i = s.trail.length - 3 * 30;
  if (i < 0) { m.x = null; return; }
  m.x = s.trail[i]; m.z = s.trail[i + 1]; m.use = s.trail[i + 2];
  if (m.use && m.cool <= 0 && dist(m.x, m.z, s.x, s.z) < 0.7) {
    m.cool = 1.2;
    m.hits++;
    hurt(sim, s.table, 2);
    spawn(sim, { k: 'nick', at: [m.x, m.z], table: s.table });
    sim.events.push({ t: 'sfx', id: 'mimicCut', x: m.x, z: m.z });
    sayKey(sim, 'mimic.hit');
  }
}

function updateHint(sim) {
  sim.hint = null;
  if (sim.noHint) return;
  const table = sim.seats[0].table;
  let best = null;
  const P = { marker: -1, core: 0, eye: 0, dressing: 9 };
  let bp = 1e9;
  for (const e of sim.ents) {
    if (e.table !== table || !visible(e)) continue;
    const c = KINDS[e.k].cls;
    if (c === 'strain') continue;
    const tool = toolFor(e);
    if (!tool && c !== 'marker' && c !== 'dressing') continue;
    const p = P[e.k] ?? 3;
    if (p < bp) { bp = p; best = e; }
  }
  if (!best) {
    const hidden = sim.ents.find((e) => e.table === table && e.scan && !e.seen);
    if (hidden && sim.tools.includes('scanner')) sim.hint = { x: hidden.x, z: hidden.z, tool: 'scanner', k: 'hidden' };
    return;
  }
  const [x, z] = aimPoint(best);
  sim.hint = { x, z, tool: toolFor(best), k: best.k, id: best.id };
}

export function stageProgress(sim) { return { stage: sim.stage, total: defOf(sim).stages.length }; }
void nextRandom; void rate;

/** A balance value changed while an op runs: including the ones an op otherwise reads only when it starts. */
export function applyLiveConfig(sim, k, v, before) {
  sim.cfg[k] = v;
  if (k === 'timeLimit' && before > 0) { sim.clock *= v / before; sim.clockMax *= v / before; }
  if (k === 'coopScale') sim.coop = 1 + v * (sim.seats.length - 1);
  if (k === 'irae' && sim.heart) sim.heart.bpm = Math.max(40, sim.heart.bpm + (v - before));
  if (k === 'strainHp' && before > 0) for (const e of sim.ents) {
    if (e.k === 'strain' && e.hp != null) e.hp = Math.max(1, Math.round(e.hp * (v / before)));
    if (e.k === 'eye' && e.eyeHp != null) e.eyeHp = Math.max(1, Math.round(e.eyeHp * (v / before)));
  }
}

/** Dev Mode actions. */
export const dev = {
  completeStage(sim) { const def = defOf(sim), st = def.stages[sim.stage]; sim.ents.length = 0; sim.drops.length = 0; for (const s of sim.seats) { s.grab = null; s.stroke = null; } if (st?.then) runCmds(sim, st.then); sim.phase = 'play'; sim.codeBlue = null; sim.massage = null; nextStage(sim); },
  winOp(sim) { sim.phase = 'play'; win(sim); },
  failOp(sim) { lose(sim, 'dev'); },
  codeBlue(sim) { enterCodeBlue(sim, sim.seats[0].table, true); },
  spawn(sim, kind) {
    const s = sim.seats[0], table = s.table;
    const at = [s.x, s.z];
    const map = {
      pool: { k: 'pool', at, r: 0.9, table },
      bleeder: { k: 'bleeder', at, r: 0.5, table },
      laceration: { k: 'laceration', a: [at[0] - 0.8, at[1]], b: [at[0] + 0.8, at[1]], table },
      hook: { k: 'hook', at, dir: [0.4, -1], pull: 1.1, arc: 0.3, table },
      strain: { k: 'strain', type: 'introit', hp: 1, at, table },
    };
    if (map[kind]) spawn(sim, map[kind]);
  },
};
