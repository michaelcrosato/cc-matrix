// The operation simulation: plain data plus pure functions. `sim = createOp(def, opts)`,
// `step(sim, inputsBySeat)` at 60 Hz, `drainEvents(sim)`. No engine, no DOM, no clock.
// State survives structuredClone: that gives The Second Look, determinism, tests, the bot,
// the headless host and network snapshots from one rule.
import { createConfig, DIFFICULTIES } from '../core/config.js';
import { clamp, dist } from '../core/geom.js';
import { hashText, nextRandom, rrange } from '../core/rng.js';
import { botInput } from './bot.js';
import { CARRY_KINDS, GEL_COLS, GEL_ROWS, gelCell, isOpenTask, makeEnt, POOL_KINDS } from './entities.js';
import { MISTAKE_POINTS, POINTS, streakMultiplier } from './scoring.js';
import { stepHeart } from './strains/diesirae.js';
import { STRAINS } from './strains/index.js';
import { useTools } from './tools.js';

export const DT = 1 / 60;
export const SAFE = { x: 6, zMin: -3.6, zMax: 3 };

// Not part of a rewind or a state hash.
const TRANSIENT = new Set(['def', 'cfg', 'hist', 'events', 'trails', 'cheats', 'persist', 'lookUses', 'composure', 'ghostPlay', 'checkpoint', 'api']);

export function cloneState(sim) {
  const o = {};
  for (const k of Object.keys(sim)) if (!TRANSIENT.has(k)) o[k] = structuredClone(sim[k]);
  o.composure = sim.composure;
  return o;
}
export function stateHash(sim) {
  const o = {};
  for (const k of Object.keys(sim)) if (!TRANSIENT.has(k)) o[k] = sim[k];
  o.composure = sim.composure;
  return hashText(JSON.stringify(o));
}

const newSeat = (i, spec = {}) => ({
  id: spec.id ?? i, x: spec.x ?? (i === 0 ? 0 : (i % 2 ? 3 : -3)), z: spec.z ?? (i < 2 ? 0.5 : 1.5), table: 0,
  tool: spec.tool ?? null, gift: spec.gift ?? null, surgeon: spec.surgeon ?? 'ilya', bot: spec.bot ? { ...spec.bot } : null, region: spec.region ?? null, name: spec.name ?? null,
  useWas: false, toolWas: null, act: null, onTarget: false, grab: null, cutting: null, draw: 0, drawn: false,
  sutSide: 0, sutId: null, stray: 0, dry: 0, noGrab: false, noCut: false, gone: false, score: 0,
  stats: { clean: 0, good: 0, sloppy: 0, mistakes: 0, stitches: 0, saves: 0, doses: 0, heals: 0, drops: 0, cuts: 0, cutDev: 0 },
  giftWas: false, aWas: false, bWas: false, tagWas: false,
});

/**
 * @param def  an op (src/content/ops)
 * @param o    { seed, seats:[{id,gift,surgeon,bot}], difficulty, config, startStage, cheats, capRank }
 */
export function createOp(def, o = {}) {
  const diff = DIFFICULTIES[o.difficulty ?? 'resident'] ?? DIFFICULTIES.resident;
  const cfg = o.config ?? createConfig();
  const specs = o.seats ?? [{ id: 0 }];
  const tableDefs = def.tables ?? [{ arena: def.arena, vitals: def.vitals.start }];
  const sim = {
    def, cfg, cheats: o.cheats ?? {}, events: [], hist: [], trails: {}, persist: {}, lookUses: 0, ghostPlay: null, checkpoint: null, api: null,
    opId: def.id, seed: o.seed ?? 1, rng: (o.seed ?? 1) | 0, tick: 0, nextId: 1, diffId: diff.id, status: 'playing', failReason: null,
    clock: def.time * diff.time, clock0: def.time * diff.time, stage: -1, stageT: 0, flags: {}, once: {}, timedDone: [], context: null, objective: '',
    tables: tableDefs.map((t, i) => ({
      i, arena: t.arena ?? def.arena, vitals: t.vitals ?? def.vitals.start, fake: null, drain: t.drain ?? def.vitals.drain, ring: t.ring ?? def.ring ?? [-5.1, 2.1],
      gel: new Array(GEL_COLS * GEL_ROWS).fill(0), marks: [], blues: 0, lost: false, name: t.name ?? null,
    })),
    ents: [], drops: [], seats: specs.map((s, i) => newSeat(i, s)), doses: def.doses ?? 3, tools: [...(def.tools ?? [])], gifts: [...(def.gifts ?? [])],
    giftsUnlocked: (def.gifts ?? []).length > 0, composure: 40, quiet: false, quietT: 0, codeBlue: null, massage: null, heart: null, music: def.music ?? null, prompt: null,
    mistakes: 0, score: 0, streak: 0, bestStreak: 0, capRank: o.capRank ?? null, unscriptedBlue: false, stats: { clean: 0, good: 0, sloppy: 0 }, coop: 1 + (o.coopScale ?? cfg.coopScale) * (specs.filter((s) => !s.bot).length - 1),
    pain: 0, handGhost: null, tag: 0, counters: {}, cold: null,
  };
  if (def.partner) sim.seats.push(newSeat(1, { ...def.partner, id: 1 }));
  sim.api = makeApi(sim);
  for (const s of sim.seats) {
    s.tool = s.tool ?? sim.tools[0] ?? 'drain';
    s.toolWas = s.tool;
    if (!s.gift && sim.giftsUnlocked) s.gift = s.surgeon === 'sabine' ? 'look' : 'quiet';
    sim.trails[s.id] = [];
  }
  if (o.composure != null) sim.composure = o.composure;
  const start = clamp(o.startStage ?? 0, 0, def.stages.length - 1);
  for (let i = 0; i < start; i++) {
    enterStage(sim, i);
    // Skipping: everything those stages would have left open is treated as done.
    for (const e of sim.ents) {
      if (e.k?.startsWith('strain:')) {
        // A strain carries on only into the stage that is waiting for it to die.
        if (e.deadFlag && JSON.stringify(def.stages[start]?.until ?? {}).includes(e.deadFlag)) { if (e.hidden) reveal(sim, e); continue; }
        e.dead = true;
        for (const o of sim.ents) if (o.owner === e.id) o.dead = true;
        if (sim.heart?.strain === e.id) sim.heart = null;
        sim.drops.length = 0;
        continue;
      }
      if (CARRY_KINDS.has(e.k) && e.to && !e.placed) { e.x = e.to[0]; e.z = e.to[1]; e.rot = e.rotTo ?? e.rot; e.placed = true; e.task = false; continue; }
      if (isOpenTask(e) && !e.owner) e.dead = true;
    }
    sweep(sim);
    if (def.stages[i].after) runCommands(sim, def.stages[i].after);
    sim.events.length = 0;
  }
  enterStage(sim, start);
  return sim;
}

/** The rest of the sim's internals, for tools.js and strains. */
function makeApi(sim) {
  const api = {
    emit: (e, data) => emit(sim, e, data),
    rate: (seat, q, x, z, w = 1, quiet = false) => rate(sim, seat, q, x, z, w, quiet),
    mistake: (seat, x, z, why, table) => mistake(sim, seat, x, z, why, table),
    spawn: (spec) => spawn(sim, spec),
    remove: (e) => removeEnt(sim, e),
    reveal: (e) => reveal(sim, e),
    addMark: (table, m) => addMark(sim, table, m),
    addCutProgress: () => {},
    finish: (e, seat, q, w = 1) => finishEnt(sim, e, seat, q, w),
    placed: (e, seat, q) => placed(sim, e, seat, q),
    snapBack: (e, seat) => snapBack(sim, e, seat),
    say: (s) => say(sim, s),
    run: (cmds) => runCommands(sim, cmds),
    get: (id) => sim.ents.find((e) => e.id === id && !e.dead),
    notify: (e, what, seat) => notifyOwner(sim, e, what, seat),
    hurt: (amount, table = 0) => { const t = sim.tables[table]; t.vitals = Math.max(0, t.vitals - amount); },
    random: () => nextRandom(sim),
    range: (a, b) => rrange(sim, a, b),
  };
  return api;
}

function emit(sim, e, data = {}) {
  sim.events.push({ e, ...data });
}
export function drainEvents(sim) {
  const out = sim.events;
  sim.events = [];
  return out;
}
function say(sim, line) {
  if (!line) return;
  if (Array.isArray(line)) { for (const l of line) say(sim, l); return; }
  const bar = line.indexOf('|');
  emit(sim, 'say', { who: line.slice(0, bar), text: line.slice(bar + 1) });
}

function rate(sim, seat, q, x, z, w = 1, quiet = false) {
  sim.stats[q]++;
  seat.stats[q]++;
  if (q === 'clean') {
    sim.streak++;
    sim.bestStreak = Math.max(sim.bestStreak, sim.streak);
    sim.composure = Math.min(100, sim.composure + sim.cfg.composurePerClean * w);
  } else sim.streak = 0;
  const pts = Math.round(POINTS[q] * w * streakMultiplier(q === 'clean' ? sim.streak - 1 : 0));
  sim.score += pts;
  seat.score += pts;
  emit(sim, 'rating', { q, x, z, pts, streak: sim.streak, seat: seat.id, table: seat.table, small: quiet });
}

function mistake(sim, seat, x, z, why, tableIndex) {
  const t = sim.tables[tableIndex ?? seat?.table ?? 0];
  t.vitals = Math.max(0, t.vitals - sim.cfg.mistakePenalty);
  sim.mistakes++;
  sim.score -= MISTAKE_POINTS;
  sim.streak = 0;
  if (seat) { seat.score -= MISTAKE_POINTS; seat.stats.mistakes++; }
  emit(sim, 'mistake', { x, z, why, seat: seat?.id, table: t.i });
  if (!sim.cheats.unlimitedMistakes && sim.cfg.maxMistakes > 0 && sim.mistakes >= sim.cfg.maxMistakes) lose(sim, 'mistakes');
}

function lose(sim, reason) {
  if (sim.status !== 'playing') return;
  sim.status = 'lost';
  sim.failReason = reason;
  emit(sim, 'lost', { reason });
}
function win(sim) {
  if (sim.status !== 'playing') return;
  sim.status = 'won';
  emit(sim, 'won', {});
}

function spawn(sim, spec) {
  if (spec.k?.startsWith('strain:')) return spawnStrain(sim, spec);
  const e = makeEnt(sim, spec);
  // Hidden by something already gone: nothing to hide under.
  if (e.hiddenBy && !sim.ents.some((o) => o.id === e.hiddenBy && !o.dead)) { e.hidden = false; e.hiddenBy = null; }
  sim.ents.push(e);
  if (e.k === 'laceration' || e.k === 'nick') emit(sim, 'wound', { x: e.x, z: e.z, k: e.k, table: e.table });
  if (spec.lance && !e.hidden) applyLance(sim, e);
  return e;
}
function spawnStrain(sim, spec) {
  const e = makeEnt(sim, spec);
  sim.ents.push(e);
  STRAINS[e.k.slice(7)].init(sim, e, sim.api);
  return e;
}
function applyLance(sim, e) {
  if (e.k === 'tumor') {
    e.locked = true;
    spawn(sim, { k: 'incision', id: `${e.id}-ring`, at: [e.x, e.z], ring: e.r ?? 1.1, table: e.table, unlocks: e.id, ringFor: e.id });
  } else if (e.lance) {
    e.locked = true;
    const a = e.lanceAng ?? 0;
    const c = Math.cos((a * Math.PI) / 180) * 0.55, s = Math.sin((a * Math.PI) / 180) * 0.55;
    spawn(sim, { k: 'incision', id: `${e.id}-lance`, at: [e.x - c, e.z - s], ang: a, len: 1.1, table: e.table, unlocks: e.id, short: true });
  }
}
function reveal(sim, e) {
  if (!e.hidden) return;
  e.hidden = false;
  e.hiddenBy = null;
  emit(sim, 'reveal', { id: e.id, k: e.k, x: e.x, z: e.z });
  applyLance(sim, e);
  if (e.onReveal) runCommands(sim, e.onReveal);
}
function addMark(sim, table, m) {
  const marks = sim.tables[table].marks;
  marks.push(m);
  if (marks.length > 180) marks.shift();
}
function removeEnt(sim, e) {
  e.dead = true;
  for (const s of sim.seats) {
    if (s.grab === e.id) s.grab = null;
    if (s.cutting === e.id) s.cutting = null;
    if (s.sutId === e.id) s.sutId = null;
  }
  for (const o of sim.ents) if (o.hiddenBy === e.id && !o.dead) reveal(sim, o);
}
function finishEnt(sim, e, seat, q, w = 1) {
  rate(sim, seat, q, e.x, e.z, w);
  if (e.k === 'incision') {
    addMark(sim, e.table, { t: 'cut', path: e.path, short: !!e.short });
    emit(sim, 'cutDone', { x: e.x, z: e.z });
  }
  if (e.k === 'dressing') addMark(sim, e.table, { t: 'dressing', path: e.path });
  if (e.k === 'hook') addMark(sim, e.table, { t: 'hole', x: e.home?.[0] ?? e.x, z: e.home?.[1] ?? e.z });
  if (e.k === 'mask') addMark(sim, e.table, { t: 'gelpatch', cells: e.cells.filter((c) => c[2]).map((c) => [c[0], c[1]]) });
  if (e.unlocks) {
    const t = sim.ents.find((o) => o.id === e.unlocks && !o.dead);
    if (t) { t.locked = false; emit(sim, 'unlocked', { id: t.id, x: t.x, z: t.z }); }
  }
  removeEnt(sim, e);
  if (e.owner) notifyOwner(sim, e, 'done', seat);
  if (e.onDone) runCommands(sim, e.onDone);
  emit(sim, 'done', { id: e.id, k: e.k, x: e.x, z: e.z, table: e.table });
}
function placed(sim, e, seat, q) {
  rate(sim, seat, q, e.x, e.z);
  e.holders = 0;
  emit(sim, 'placed', { id: e.id, k: e.k, x: e.x, z: e.z });
  if (e.owner) notifyOwner(sim, e, 'placed', seat);
  if (e.onDone) runCommands(sim, e.onDone);
}
function snapBack(sim, e, seat) {
  e.s = 0;
  e.x = e.home[0];
  e.z = e.home[1];
  e.speed = 0;
  e.holders = 0;
  emit(sim, 'snapBack', { x: e.x, z: e.z, id: e.id });
  if (e.owner) notifyOwner(sim, e, 'snap', seat);
}
function notifyOwner(sim, e, what, seat) {
  const owner = sim.ents.find((o) => o.id === e.owner && !o.dead);
  if (owner) STRAINS[owner.k.slice(7)].on?.(sim, owner, what, e, seat, sim.api);
}

// ---------------------------------------------------------------- Commands
export function runCommands(sim, cmds) {
  if (!cmds) return;
  for (const c of Array.isArray(cmds) ? cmds : [cmds]) {
    if (c.say) say(sim, c.say);
    if (c.spawn) for (const s of c.spawn) spawn(sim, s);
    if (c.remove) for (const id of c.remove) { const e = sim.ents.find((o) => o.id === id && !o.dead); if (e) removeEnt(sim, e); }
    if (c.unlock) {
      for (const u of [].concat(c.unlock)) {
        if (u === 'gift') {
          if (!sim.giftsUnlocked) emit(sim, 'giftUnlocked', {});
          sim.giftsUnlocked = true;
          for (const s of sim.seats) s.gift = s.gift ?? (s.surgeon === 'sabine' ? 'look' : 'quiet');
          if (!sim.gifts.length) sim.gifts = ['quiet'];
        } else if (!sim.tools.includes(u)) {
          sim.tools.push(u);
          emit(sim, 'toolUnlocked', { tool: u });
        }
      }
    }
    if (c.setDrain != null) for (const t of sim.tables) t.drain = c.setDrain;
    if (c.music) { sim.music = c.music; emit(sim, 'music', { id: c.music }); }
    if (c.flag) sim.flags[c.flag] = true;
    if (c.clearFlag) delete sim.flags[c.clearFlag];
    if (c.persist) sim.persist[c.persist] = true;
    if (c.codeBlue) startCodeBlue(sim, c.table ?? 0, true, c.codeBlue === true ? {} : c.codeBlue);
    if (c.massage) startMassage(sim, c.massage);
    if (c.vitals != null) { const t = sim.tables[c.table ?? 0]; t.vitals = clamp(t.vitals + c.vitals, 0, 99); if (t.fake != null && c.vitals > 0) t.fake = t.vitals; }
    if (c.setVitals != null) { const t = sim.tables[c.table ?? 0]; t.vitals = clamp(c.setVitals, 0, 99); }
    if (c.composure != null) sim.composure = Math.max(sim.composure, c.composure);
    if (c.pain != null) { sim.pain = c.pain; emit(sim, 'pain', { pain: c.pain }); }
    if (c.painUp != null) { sim.pain += c.painUp; emit(sim, 'pain', { pain: sim.pain }); }
    if (c.prompt !== undefined) { sim.prompt = c.prompt ? { text: c.prompt, t: c.promptT ?? 6 } : null; emit(sim, 'prompt', { text: c.prompt }); }
    if (c.fake !== undefined) { const t = sim.tables[c.table ?? 0]; if (c.fake === null && t.fake != null) emit(sim, 'trueVitals', { v: t.vitals }); t.fake = c.fake; }
    if (c.fx) emit(sim, 'fx', { fx: c.fx, x: c.x, z: c.z });
    if (c.perfuse) { const e = sim.ents.find((o) => o.id === c.perfuse); if (e) e.perfuse = 1e-3; }
    if (c.rand) randomSpawn(sim, c.rand);
    if (c.cold !== undefined) { sim.cold = c.cold; emit(sim, 'cold', { cold: c.cold }); }
    if (c.lock) { const e = sim.ents.find((o) => o.id === c.lock && !o.dead); if (e) e.locked = true; }
    if (c.unlockEnt) { const e = sim.ents.find((o) => o.id === c.unlockEnt && !o.dead); if (e) { e.locked = false; e.task = true; } }
    if (c.ifPersist) runCommands(sim, sim.persist[c.ifPersist] ? c.then : c.else);
    if (c.count) {
      sim.counters[c.count] = (sim.counters[c.count] ?? 0) + 1;
      const line = c.lines?.[sim.counters[c.count] - 1];
      if (line) say(sim, line);
    }
    if (c.doses != null) sim.doses += c.doses;
    if (c.finish) win(sim);
    if (c.camera) emit(sim, 'camera', c.camera);
    if (c.cue) emit(sim, 'cue', { cue: c.cue });
    if (c.table != null && c.focus) emit(sim, 'focusTable', { table: c.table });
  }
}
/** Randomly placed entities for waves: positions come from the sim's own generator. */
function randomSpawn(sim, r) {
  const n = Math.max(1, Math.round(r.n ?? 1));
  for (let i = 0; i < n; i++) {
    let x = 0, z = 0;
    for (let tries = 0; tries < 12; tries++) {
      x = rrange(sim, r.xMin ?? -SAFE.x + 0.5, r.xMax ?? SAFE.x - 0.5);
      z = rrange(sim, SAFE.zMin + 0.4, SAFE.zMax - 0.4);
      if (x > 5 && z > 2.4) continue;
      if (!sim.ents.some((e) => !e.dead && dist(e.x, e.z, x, z) < 1.1)) break;
    }
    const spec = { ...r.spec, at: [x, z] };
    if (Array.isArray(spec.r)) spec.r = rrange(sim, spec.r[0], spec.r[1]);
    if (Array.isArray(spec.dir)) spec.dir = rrange(sim, spec.dir[0], spec.dir[1]);
    if (Array.isArray(spec.ang)) spec.ang = rrange(sim, spec.ang[0], spec.ang[1]);
    if (spec.k === 'laceration' || spec.k === 'hook') {
      // Keep the whole of it inside the safe zone.
      const dirA = (((spec.k === 'laceration' ? spec.ang : spec.dir) ?? 0) * Math.PI) / 180;
      const l = spec.len ?? spec.pull ?? 1.2;
      const ex = x + Math.cos(dirA) * l, ez = z + Math.sin(dirA) * l;
      if (ex < -SAFE.x || ex > SAFE.x || ez < SAFE.zMin || ez > SAFE.zMax) spec[spec.k === 'laceration' ? 'ang' : 'dir'] = ((spec.k === 'laceration' ? spec.ang : spec.dir) ?? 0) + 180;
    }
    spawn(sim, spec);
  }
}

// ---------------------------------------------------------------- Stages
function enterStage(sim, i) {
  const st = sim.def.stages[i];
  sim.stage = i;
  sim.stageT = 0;
  sim.timedDone = [];
  sim.context = st.context ?? null;
  sim.objective = st.objective ?? sim.objective;
  sim.checkpoint = null;
  if (st.tools) for (const t of st.tools) if (!sim.tools.includes(t)) sim.tools.push(t);
  emit(sim, 'stage', { i, id: st.id, objective: sim.objective });
  if (st.music) { sim.music = st.music; emit(sim, 'music', { id: st.music }); }
  if (st.say) say(sim, st.say);
  if (st.do) runCommands(sim, st.do);
  if (st.spawn) for (const s of st.spawn) spawn(sim, s);
  sim.checkpoint = cloneState(sim);
  sim.checkpoint.hintStage = i;
}
export function stageDone(sim, u) {
  if (!u) return false;
  if (u.all) return u.all.every((c) => stageDone(sim, c));
  if (u.any) return u.any.some((c) => stageDone(sim, c));
  if (u.clear === true) { if (sim.ents.some(isOpenTask)) return false; }
  else if (u.clear) { if (sim.ents.some((e) => isOpenTask(e) && u.clear.includes(e.k))) return false; }
  if (u.flag && !sim.flags[u.flag]) return false;
  if (u.time != null && sim.stageT < u.time) return false;
  return !!(u.clear || u.flag || u.time != null);
}
function runStage(sim, dt) {
  const st = sim.def.stages[sim.stage];
  sim.stageT += dt;
  if (st.timed) {
    for (let i = 0; i < st.timed.length; i++) {
      const c = st.timed[i];
      if (c.every) {
        const count = sim.timedDone[i] ?? 0;
        const interval = c.every / (c.scaled ? sim.coop : 1);
        if (sim.stageT >= (c.at ?? 0) + count * interval && (c.times == null || count < c.times)) {
          sim.timedDone[i] = count + 1;
          runCommands(sim, c);
        }
      } else if (!sim.timedDone[i] && sim.stageT >= c.at) {
        sim.timedDone[i] = 1;
        runCommands(sim, c);
      }
    }
  }
  if (st.on) {
    if (st.on.vitalsBelow) {
      for (const k of Object.keys(st.on.vitalsBelow)) {
        const key = `vb${sim.stage}-${k}`;
        if (!sim.once[key] && sim.tables.some((t) => t.vitals < Number(k))) {
          sim.once[key] = 1;
          runCommands(sim, st.on.vitalsBelow[k]);
        }
      }
    }
    if (st.on.flag) {
      for (const k of Object.keys(st.on.flag)) {
        const key = `fl${sim.stage}-${k}`;
        if (!sim.once[key] && sim.flags[k]) {
          sim.once[key] = 1;
          runCommands(sim, st.on.flag[k]);
        }
      }
    }
  }
  // Ops-wide rules that survive stage changes.
  if (sim.def.anyStage?.vitalsBelow) {
    for (const k of Object.keys(sim.def.anyStage.vitalsBelow)) {
      const key = `any-${k}`;
      if (!sim.once[key] && sim.tables.some((t) => t.vitals < Number(k))) {
        sim.once[key] = 1;
        runCommands(sim, sim.def.anyStage.vitalsBelow[k]);
      }
    }
  }
  if (stageDone(sim, st.until) && sim.status === 'playing') {
    if (st.after) runCommands(sim, st.after);
    if (sim.status !== 'playing') return;
    if (sim.stage + 1 >= sim.def.stages.length) win(sim);
    else enterStage(sim, sim.stage + 1);
  }
}
function sweep(sim) {
  if (sim.ents.some((e) => e.dead)) sim.ents = sim.ents.filter((e) => !e.dead);
  if (sim.drops.some((d) => d.dead)) sim.drops = sim.drops.filter((d) => !d.dead);
}

// ---------------------------------------------------------------- Code Blue and Massage
function startCodeBlue(sim, table, scripted = false, opts = {}) {
  if (sim.codeBlue) return;
  sim.codeBlue = { table, t: opts.time ?? 12, shocks: 0, need: opts.need ?? 2, charge: 0, charging: false, scripted, fib: !!opts.fib, then: opts.then ?? null, restore: opts.restore ?? 25, phase: 0 };
  for (const s of sim.seats) { s.useWas = false; if (s.grab) { const e = sim.ents.find((o) => o.id === s.grab); if (e) e.holders = 0; s.grab = null; } s.cutting = null; }
  emit(sim, 'codeBlue', { table, scripted, fib: !!opts.fib });
}
function stepCodeBlue(sim, inputs) {
  const cb = sim.codeBlue;
  cb.t -= DT;
  let a = false, b = false;
  for (const s of sim.seats) {
    const inp = s.bot ? botInput(sim, s) : inputs[s.id];
    if (inp) {
      s.x = clamp(inp.x ?? s.x, -8, 8);
      s.z = clamp(inp.z ?? s.z, -4.5, 4.5);
      if (s.bot && sim.seats.some((o) => !o.bot && !o.gone)) continue; // Partners don't take the paddles while a human is at the table.
      a = a || !!inp.a;
      b = b || !!inp.b;
    }
  }
  const both = a && b;
  if (both) {
    cb.charging = true;
    cb.phase += DT / 1.2;
    const p = cb.phase % 2;
    cb.charge = p < 1 ? p : 2 - p;
  } else if (cb.charging) {
    cb.charging = false;
    const zoneW = sim.cfg.codeBlueZone;
    const hit = Math.abs(cb.charge - ZONE_CENTER) <= zoneW / 2;
    cb.phase = 0;
    const lastCharge = cb.charge;
    cb.charge = 0;
    if (hit) {
      cb.shocks++;
      emit(sim, 'clear', { shocks: cb.shocks, need: cb.need, charge: lastCharge });
      if (cb.shocks >= cb.need) {
        const t = sim.tables[cb.table];
        t.vitals = Math.max(t.vitals, cb.restore);
        const scripted = cb.scripted, then = cb.then;
        for (const s of sim.seats) { s.useWas = true; s.stats.saves += s.bot ? 0 : 1 / sim.seats.filter((o) => !o.bot).length; }
        sim.codeBlue = null;
        if (!scripted) sim.unscriptedBlue = true;
        emit(sim, 'revived', { table: cb.table, fib: cb.fib });
        if (then) runCommands(sim, then);
        return;
      }
    } else {
      cb.t -= 3;
      emit(sim, 'badShock', { charge: lastCharge });
    }
  }
  if (cb.t <= 0 && !sim.cheats.god) lose(sim, 'flatline');
  else if (cb.t <= 0) cb.t = 12;
}
export const ZONE_CENTER = 0.74;

function startMassage(sim, m) {
  sim.massage = { n: 0, need: m.beats ?? 8, next: 'a', period: 60 / (m.bpm ?? 72), phase: 0, then: m.then ?? null, misses: 0, lastBeatDone: -1, beat: 0 };
  for (const s of sim.seats) { s.aWas = true; s.bWas = true; if (s.grab) { const e = sim.ents.find((o) => o.id === s.grab); if (e) e.holders = 0; s.grab = null; } s.cutting = null; }
  emit(sim, 'massageStart', { need: sim.massage.need });
}
function stepMassage(sim, inputs) {
  const m = sim.massage;
  m.phase += DT;
  if (m.phase >= m.period) { m.phase -= m.period; m.beat++; emit(sim, 'massageBeat', { beat: m.beat }); }
  let pressA = false, pressB = false;
  for (const s of sim.seats) {
    const inp = s.bot ? botInput(sim, s) : inputs[s.id];
    if (!inp) continue;
    s.x = clamp(inp.x ?? s.x, -8, 8);
    s.z = clamp(inp.z ?? s.z, -4.5, 4.5);
    if (inp.a && !s.aWas) pressA = true;
    if (inp.b && !s.bWas) pressB = true;
    s.aWas = !!inp.a;
    s.bWas = !!inp.b;
  }
  const press = m.next === 'a' ? pressA : pressB;
  const wrong = m.next === 'a' ? pressB : pressA;
  const toBeat = Math.min(m.phase, m.period - m.phase);
  if (press) {
    if (toBeat <= 0.26) {
      m.n++;
      m.next = m.next === 'a' ? 'b' : 'a';
      const q = toBeat <= 0.11 ? 'clean' : 'good';
      rate(sim, sim.seats[0], q, 0, 0, 0.5);
      emit(sim, 'massagePress', { n: m.n, need: m.need, q });
      if (m.n >= m.need) {
        const then = m.then;
        sim.massage = null;
        emit(sim, 'massageDone', {});
        for (const s of sim.seats) s.useWas = true;
        if (then) runCommands(sim, then);
        return;
      }
    } else {
      m.misses++;
      emit(sim, 'massageMiss', {});
      const t = sim.tables[0];
      t.vitals = Math.max(0, t.vitals - 1);
    }
  } else if (wrong) {
    emit(sim, 'massageWrong', {});
  }
  const t = sim.tables[0];
  if (!sim.cheats.god) t.vitals = Math.max(0, t.vitals - 0.6 * DT);
  if (t.vitals <= 0) {
    sim.massage = null;
    checkVitals(sim);
  }
}

function checkVitals(sim) {
  for (const t of sim.tables) {
    if (t.vitals > 0) continue;
    if (sim.cheats.god) { t.vitals = 30; continue; }
    if (sim.codeBlue) continue;
    const saves = DIFFICULTIES[sim.diffId].saves;
    if (t.blues < saves) {
      t.blues++;
      startCodeBlue(sim, t.i, false);
      return;
    }
    lose(sim, 'flatline');
    return;
  }
}

// ---------------------------------------------------------------- The Second Look
function trySecondLook(sim, seat) {
  const cost = sim.cfg.secondLookCost;
  if (sim.codeBlue || sim.massage) return false;
  if (sim.composure < cost && !sim.cheats.infComposure) { emit(sim, 'giftDenied', { seat: seat.id }); return false; }
  const span = Math.round(sim.cfg.secondLookSeconds * 10);
  const snap = sim.hist.length > span ? sim.hist[sim.hist.length - 1 - span] : sim.hist[0];
  if (!snap) return false;
  const composure = sim.cheats.infComposure ? sim.composure : sim.composure - cost;
  const keep = sim.seats.map((s) => ({ x: s.x, z: s.z, tool: s.tool, table: s.table }));
  const trail = sim.trails[seat.id].slice();
  for (const k of Object.keys(snap)) if (k !== 'composure') sim[k] = structuredClone(snap[k]);
  sim.composure = composure;
  sim.lookUses++;
  sim.seats.forEach((s, i) => {
    Object.assign(s, keep[i]);
    s.grab = null; s.cutting = null; s.sutId = null; s.sutSide = 0; s.useWas = false; s.noGrab = false; s.noCut = false; s.giftWas = true;
  });
  for (const e of sim.ents) if (e.holders) e.holders = 0;
  sim.hist = [];
  sim.ghostPlay = { t: 0, trail, seat: seat.id, span: sim.cfg.secondLookSeconds };
  sim.persist.looked = true;
  sim.prompt = null;
  emit(sim, 'rewind', { seat: seat.id, seconds: sim.cfg.secondLookSeconds });
  if (sim.def.onRewind) runCommands(sim, sim.def.onRewind);
  return true;
}

// ---------------------------------------------------------------- The step
const IDLE = { use: false };

export function step(sim, inputs = {}) {
  if (sim.status !== 'playing') return;
  sim.tick++;
  const dt = DT;
  if (sim.cheats.infComposure) sim.composure = 100;
  if (sim.ghostPlay) {
    sim.ghostPlay.t += dt;
    if (sim.ghostPlay.t > sim.ghostPlay.span) sim.ghostPlay = null;
  }
  if (sim.codeBlue) { stepCodeBlue(sim, inputs); sweep(sim); return; }
  if (sim.massage) { stepMassage(sim, inputs); sweep(sim); return; }

  // Hands: seats take their input; gifts decide the world's clock.
  let quietNow = false;
  const frame = sim.seats.map((s) => {
    if (s.gone) return IDLE;
    const inp = (s.bot ? botInput(sim, s) : inputs[s.id]) ?? IDLE;
    if (inp.x != null) s.x = clamp(inp.x, -8, 8);
    if (inp.z != null) s.z = clamp(inp.z, -4.5, 4.5);
    if (inp.table != null && sim.tables[inp.table]) {
      if (s.table !== inp.table) { emit(sim, 'tableSwitch', { seat: s.id, table: inp.table }); if (s.grab) s.grab = null; s.cutting = null; }
      s.table = inp.table;
    }
    if (inp.tool && sim.tools.includes(inp.tool)) s.tool = inp.tool;
    if (inp.tag && !s.tagWas && sim.def.partner && !s.bot) doTag(sim, s);
    s.tagWas = !!inp.tag;
    return inp;
  });
  sim.seats.forEach((s, i) => {
    const inp = frame[i];
    if (s.gone || !sim.giftsUnlocked || !s.gift) return;
    if (s.gift === 'quiet') {
      if (inp.gift) {
        const needed = sim.quiet ? 0.01 : 20;
        if (sim.composure >= needed) quietNow = true;
        else if (!s.giftWas) emit(sim, 'giftDenied', { seat: s.id });
      }
    } else if (s.gift === 'look') {
      if (inp.gift && !s.giftWas) trySecondLook(sim, s);
    }
    s.giftWas = !!inp.gift;
  });
  if (quietNow !== sim.quiet) { sim.quiet = quietNow; emit(sim, quietNow ? 'quietOn' : 'quietOff', {}); }
  if (sim.quiet && !sim.cheats.infComposure) {
    sim.composure = Math.max(0, sim.composure - sim.cfg.quietDrain * dt);
    if (sim.composure <= 0) { sim.quiet = false; emit(sim, 'quietOff', { empty: true }); }
  }
  const dtWorld = sim.quiet ? dt * sim.cfg.quietSlow : dt;

  sim.seats.forEach((s, i) => { if (!s.gone) useTools(sim, sim.api, s, frame[i], dt); });

  // The world.
  for (const e of sim.ents) {
    if (e.dead) continue;
    e.age += dtWorld;
    if (POOL_KINDS.has(e.k) && e.grow && e.r < e.max && !e.hidden) e.r = Math.min(e.max, e.r + e.grow * dtWorld);
    if (e.k?.startsWith('strain:')) STRAINS[e.k.slice(7)].update(sim, e, dtWorld, sim.api, frame);
    if (e.perfuse) e.perfuse = Math.min(1, e.perfuse + dtWorld / 3);
    if (e.scanT) e.scanT = Math.max(0, e.scanT - dtWorld);
  }
  stepHeart(sim, dtWorld, sim.api);
  for (const e of sim.ents) {
    if (e.k !== 'marker' || e.dead || e.hidden) continue;
    if (sim.seats.some((s) => s.table === e.table && !s.gone && dist(s.x, s.z, e.x, e.z) <= 0.55)) {
      emit(sim, 'marker', { x: e.x, z: e.z });
      removeEnt(sim, e);
      if (e.onDone) runCommands(sim, e.onDone);
    }
  }
  if (sim.cold != null) {
    sim.cold -= dtWorld;
    if (sim.cold <= 0 && !sim.cheats.god) { sim.cold = 0; lose(sim, 'cold'); }
  }
  for (const d of sim.drops) stepDrop(sim, d, dtWorld);
  for (const t of sim.tables) {
    for (let i = 0; i < t.gel.length; i++) if (t.gel[i] > 0) t.gel[i] = Math.max(0, t.gel[i] - dtWorld);
  }
  if (sim.prompt) { sim.prompt.t -= dt; if (sim.prompt.t <= 0) sim.prompt = null; }

  // Vitals and clock.
  const diff = DIFFICULTIES[sim.diffId];
  if (!sim.quiet) {
    for (const t of sim.tables) {
      let open = 0;
      for (const e of sim.ents) {
        if (e.dead || e.table !== t.i || e.hidden) continue;
        if (POOL_KINDS.has(e.k)) open += 1;
        else if (e.k === 'nick') open += 0.4;
        else if (e.k === 'laceration' && e.bleed) open += 0.5;
      }
      const base = t.drain * diff.drain * sim.cfg.vitalsDrainMul * sim.coop;
      const bleed = Math.min(2, sim.cfg.bleedDrain * open) * diff.drain;
      if (!sim.cheats.god) t.vitals = Math.max(0, t.vitals - (base + bleed) * dtWorld);
    }
  }
  if (!sim.cheats.freezeClock) {
    sim.clock -= dtWorld / sim.cfg.timeMul;
    if (sim.clock <= 0) {
      sim.clock = 0;
      if (sim.def.surviveClock) win(sim);
      else lose(sim, 'clock');
    }
  }
  checkVitals(sim);
  if (sim.status === 'playing' && !sim.codeBlue) runStage(sim, dtWorld);
  sweep(sim);

  // Memory.
  if (sim.tick % 4 === 0) {
    for (const s of sim.seats) {
      const tr = sim.trails[s.id];
      tr.push([s.x, s.z, s.act ? 1 : 0, s.tool]);
      if (tr.length > 90) tr.shift();
    }
  }
  if (sim.tick % 6 === 0 && !sim.codeBlue && !sim.massage && sim.seats.some((s) => s.gift === 'look')) {
    sim.hist.push(cloneState(sim));
    const keep = Math.round(sim.cfg.secondLookSeconds * 10) + 2;
    while (sim.hist.length > keep) sim.hist.shift();
  }
}

function doTag(sim, seat) {
  const other = sim.seats.find((o) => o !== seat);
  if (!other) return;
  for (const k of ['surgeon', 'gift']) { const v = seat[k]; seat[k] = other[k]; other[k] = v; }
  const x = seat.x, z = seat.z, tool = seat.tool;
  seat.x = other.x; seat.z = other.z; seat.tool = other.tool;
  other.x = x; other.z = z; other.tool = tool;
  seat.grab = null; other.grab = null; seat.cutting = null; other.cutting = null;
  for (const e of sim.ents) if (e.holders) e.holders = 0;
  sim.tag++;
  emit(sim, 'tag', { surgeon: seat.surgeon, x: seat.x, z: seat.z });
}

function stepDrop(sim, d, dt) {
  if (d.dead) return;
  d.age += dt;
  const t = sim.tables[d.table];
  if (d.chase) {
    const seat = sim.seats.find((s) => s.table === d.table && !s.bot) ?? sim.seats[0];
    const dx = seat.x - d.x, dz = seat.z - d.z, l = Math.hypot(dx, dz) || 1;
    d.vx += (dx / l) * 1.3 * dt;
    d.vz += (dz / l) * 0.9 * dt;
    const sp = Math.hypot(d.vx, d.vz);
    if (sp > 1.9) { d.vx *= 1.9 / sp; d.vz *= 1.9 / sp; }
  }
  d.x += d.vx * dt;
  d.z += d.vz * dt;
  const c = gelCell(d.x, d.z);
  if (c >= 0 && t.gel[c] > 0) {
    d.dead = true;
    emit(sim, 'dropGel', { x: d.x, z: d.z });
    return;
  }
  if (d.age >= d.life || d.z > 3.4) {
    d.dead = true;
    if (!sim.cheats.god) t.vitals = Math.max(0, t.vitals - 1);
    spawn(sim, { k: 'nick', at: [clamp(d.x, -6, 6), Math.min(d.z, 3.1)], table: d.table });
    emit(sim, 'dropLand', { x: d.x, z: d.z });
  }
}

/** Retry from the start of the current stage (rank capped at B). */
export function retryStage(sim) {
  const cp = sim.checkpoint;
  if (!cp) return false;
  for (const k of Object.keys(cp)) if (k !== 'hintStage') sim[k] = structuredClone(cp[k]);
  sim.status = 'playing';
  sim.failReason = null;
  sim.capRank = 'B';
  sim.hist = [];
  sim.events = [];
  sim.codeBlue = null;
  sim.massage = null;
  sim.checkpoint = cp;
  for (const s of sim.seats) { s.grab = null; s.cutting = null; s.useWas = false; }
  emit(sim, 'stage', { i: sim.stage, id: sim.def.stages[sim.stage].id, objective: sim.objective, retry: true });
  return true;
}

/** Dev Mode actions. */
export const dev = {
  completeStage(sim) {
    for (const e of sim.ents) if (isOpenTask(e)) removeEnt(sim, e);
    const st = sim.def.stages[sim.stage];
    sweep(sim);
    if (st.after) runCommands(sim, st.after);
    if (sim.stage + 1 >= sim.def.stages.length) win(sim);
    else enterStage(sim, sim.stage + 1);
  },
  winOp(sim) { win(sim); },
  failOp(sim) { lose(sim, 'dev'); },
  codeBlue(sim) { startCodeBlue(sim, sim.seats[0].table, false); },
  spawn(sim, kind) {
    const s = sim.seats[0];
    const SPECS = {
      pool: { k: 'pool', r: 1, task: false },
      bleeder: { k: 'bleeder', r: 0.7, task: false },
      laceration: { k: 'laceration', len: 1.8, ang: 20, task: false },
      hook: { k: 'hook', pull: 1.2, dir: -70, arc: 0.8, task: false },
      strain: { k: 'strain:introit', hp: 1, task: false },
    };
    spawn(sim, { ...SPECS[kind], at: [clamp(s.x, -5, 5), clamp(s.z, -3, 2.4)], table: s.table });
  },
};
