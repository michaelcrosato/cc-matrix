import { DIFFICULTY, getConfig } from '../core/config.js';
import { makeRng } from '../core/rng.js';
import { angDiff, coverage, dist, makeEntity, pathMetrics, toolFor, woundFrame } from './geom.js';
import { applyRank, ratePoints } from './score.js';
import { noteEyeLaser, notePlate, noteSob, startStrain, tickStrains } from './strains.js';

const FIELD = { x: 8, z: 4.5 };

export function createOp(def, opts = {}) {
  const config = opts.config || getConfig();
  const difficulty = opts.difficulty || 'resident';
  const diff = DIFFICULTY[difficulty] || DIFFICULTY.resident;
  const rng = makeRng(opts.seed ?? 1);
  const human = Math.max(1, opts.seats || 1);
  const consult = !!opts.consult;
  const partner = !!def.partner && !consult;
  const seatCount = partner ? Math.max(2, human) : human;
  const seats = [];
  for (let i = 0; i < seatCount; i++) {
    const gift = giftOf(def, i, consult);
    seats.push({
      id: i,
      x: -1.2 + i * 0.8,
      z: 1.4,
      tool: (def.tools && def.tools[0]) || 'forceps',
      use: false,
      score: 0,
      holding: -1,
      draw: 0,
      dry: 0,
      bruised: false,
      gift,
      human: consult ? true : i === 0,
      pref: def.partner ? (i === 0 ? 'R' : 'L') : '',
      stitches: 0,
      cleans: 0,
      sloppies: 0,
      botSkill: i === 0 ? 1 : 0.85,
    });
  }
  const starts = Array.isArray(def.vitals?.start) ? def.vitals.start : [def.vitals?.start ?? 80];
  const tables = starts.map((v, i) => ({ id: i, vitals: v }));
  const coop = 1 + config.coopScale * Math.max(0, (consult ? human : 1) - 1);
  const sim = {
    id: def.id,
    title: def.title,
    arena: def.arena || 'forearm',
    def,
    config,
    difficulty,
    diff,
    rng,
    seed: opts.seed ?? 1,
    seats,
    tables,
    active: 0,
    vitals: tables[0].vitals,
    baseDrain: (def.vitals?.drain ?? 0.1) * diff.drain * coop,
    timeLeft: (def.time ?? 180) * diff.time * config.timeLimitMul,
    timeMax: (def.time ?? 180) * diff.time * config.timeLimitMul,
    doses: def.doses ?? 3,
    doseMax: def.doses ?? 3,
    mistakes: 0,
    score: 0,
    streak: 0,
    composure: 40,
    entities: [],
    stages: (def.stages || []).map((s) => ({ ...s, spawned: [], entered: false })),
    stageIndex: 0,
    flags: {},
    persist: {
      quietUnlocked: !!(def.gifts || []).includes('quiet') || consult,
      lookUnlocked: !!(def.gifts || []).includes('look') || consult,
      lookUses: 0,
      rewound: false,
      needRewind: false,
      rankCap: opts.cap || null,
      unscriptedBlue: false,
      bluesLeft: diff.blues,
      clotSeen: false,
    },
    phase: 'play',
    reason: '',
    t: 0,
    realT: 0,
    uid: 1,
    events: [],
    hist: [],
    histAcc: 0,
    god: !!opts.god,
    devSpeed: opts.devSpeed || 1,
    par: def.par || 1,
    bpm: config.diesBpm,
    beatPhase: 0,
    diastole: true,
    heart: !!def.heart,
    cold: null,
    pain: 0,
    lie: false,
    strain: null,
    say: '',
    unlocked: new Set(def.tools || []),
    hints: def.hints !== false && diff.hint,
    consult,
    partner,
    strainHpMul: def.strainHp || 1,
    ghost: [],
    massageT: 0,
    massageCount: 0,
    massageBeat: -1,
    massageOpen: false,
    finalScore: 0,
    rank: 'C',
    pristine: false,
    shown: 0,
  };
  if (def.heart) sim.heart = true;
  enterStage(sim);
  mirrorVitals(sim);
  return sim;
}

function giftOf(def, index, consult) {
  if (consult) return index % 2 === 0 ? 'quiet' : 'look';
  if (def.surgeon === 'sabine') return 'look';
  if (def.surgeon === 'both') return index % 2 === 0 ? 'quiet' : 'look';
  return 'quiet';
}

export function findEnt(sim, id) {
  for (const e of sim.entities) if (e.id === id) return e;
  return null;
}

function spawn(sim, spec) {
  const e = makeEntity({ ...spec, id: spec.id || `g${sim.uid++}` });
  sim.entities.push(e);
  return e;
}

function enterStage(sim) {
  const st = sim.stages[sim.stageIndex];
  if (!st) {
    win(sim);
    return;
  }
  st.entered = true;
  st.spawned = [];
  for (const spec of st.spawn || []) {
    const e = spawn(sim, spec);
    st.spawned.push(e.id);
  }
  if (st.say) sim.say = st.say;
  if (st.unlock) for (const t of st.unlock) sim.unlocked.add(t);
  if (st.quiet) sim.persist.quietUnlocked = true;
  if (st.look) sim.persist.lookUnlocked = true;
  if (st.flag) sim.flags[st.flag] = true;
  if (st.heart) sim.heart = true;
  if (st.cold) sim.cold = st.cold;
  if (st.lie) sim.lie = true;
  if (st.strain) startStrain(sim, st.strain);
  sim.stageSnap = capture(sim);
  if (st.massage) {
    sim.phase = 'massage';
    sim.massageT = 0;
    sim.massageCount = 0;
    sim.massageBeat = -1;
  }
  if (st.codeblue) beginCode(sim, true, sim.active);
  sim.stageT = 0;
}

function stageClear(sim, st) {
  if (!st) return false;
  if (st.until === 'flag') return !!sim.flags[st.flag];
  if (st.until === 'strain') return !!sim.flags.strainDead;
  if (st.until === 'kinds') {
    const list = sim.entities.filter((e) => st.kinds.includes(e.kind) && !e.optional);
    if (!list.length) return sim.stageT > 0.4;
    return list.every((e) => e.done);
  }
  if (!st.spawned.length) return sim.stageT > 0.2;
  return st.spawned.every((id) => {
    const e = findEnt(sim, id);
    return !e || e.done || e.optional;
  });
}

function advanceStage(sim) {
  if (sim.phase !== 'play') return;
  const st = sim.stages[sim.stageIndex];
  if (!st || !stageClear(sim, st)) return;
  sim.stageIndex += 1;
  if (sim.stageIndex >= sim.stages.length) win(sim);
  else enterStage(sim);
}

function win(sim) {
  if (sim.phase === 'won' || sim.phase === 'lost') return;
  sim.phase = 'won';
  applyRank(sim);
}

function lose(sim, reason) {
  if (sim.phase === 'won' || sim.phase === 'lost') return;
  sim.phase = 'lost';
  sim.reason = reason;
  sim.rank = 'C';
  sim.finalScore = 0;
}

function pushEvent(sim, ev) {
  sim.events.push(ev);
  if (sim.events.length > 48) sim.events.shift();
}

export function drainEvents(sim) {
  const e = sim.events;
  sim.events = [];
  return e;
}

function rate(sim, seat, kind, x, z) {
  if (kind === 'CLEAN') {
    sim.streak += 1;
    seat.cleans += 1;
    sim.composure = Math.min(100, sim.composure + sim.config.composureGain);
  } else {
    sim.streak = 0;
    if (kind === 'SLOPPY' || kind === 'MISTAKE') seat.sloppies += 1;
  }
  const pts = ratePoints(kind, sim.streak);
  sim.score += pts;
  seat.score += pts;
  pushEvent(sim, { type: 'rate', rate: kind, seat: seat?.id ?? 0, x, z, pts });
  if (kind === 'MISTAKE') addMistake(sim, seat);
}

function addMistake(sim, seat) {
  if (sim.god) return;
  sim.mistakes += 1;
  const table = sim.tables[sim.active];
  table.vitals -= sim.config.mistakePenalty;
  sim.vitals = sim.tables[sim.active].vitals;
  pushEvent(sim, { type: 'mistake', seat: seat?.id ?? 0 });
  if (sim.config.maxMistakes > 0 && sim.mistakes >= sim.config.maxMistakes) lose(sim, 'mistakes');
}

function mirrorVitals(sim) {
  sim.vitals = sim.tables[sim.active].vitals;
  sim.shown = sim.lie ? 99 : Math.max(0, Math.round(sim.vitals));
}

export function step(sim, inputs = {}, dt = 1 / 60) {
  if (sim.phase === 'won' || sim.phase === 'lost') return sim;
  dt = Math.max(0, Math.min(0.25, dt));
  sim.realT += dt;
  const quiet = updateQuiet(sim, inputs, dt);
  const simDt = dt * (quiet ? sim.config.quietScale : 1) * (sim.devSpeed || 1);
  sim.t += simDt;
  sim.stageT = (sim.stageT || 0) + simDt;
  if (sim.heart) {
    sim.beatPhase = (sim.beatPhase + simDt * (sim.bpm / 60)) % 1;
    sim.diastole = sim.beatPhase >= 0.35;
  } else sim.diastole = true;

  recordHist(sim);
  moveSeats(sim, inputs, dt);
  if (tryLook(sim, inputs)) return sim;

  if (sim.phase === 'codeblue') {
    stepCode(sim, inputs, dt);
    return sim;
  }
  if (sim.phase === 'massage') {
    stepMassage(sim, inputs, simDt);
    drainVitals(sim, simDt, quiet);
    tickClock(sim, simDt);
    checkVitals(sim);
    return sim;
  }

  applyTools(sim, inputs, simDt);
  if (sim.pendingGhostMistake) {
    sim.pendingGhostMistake = false;
    rate(sim, sim.seats[0], 'MISTAKE', sim.seats[0].x, sim.seats[0].z);
  }
  tickPassive(sim, simDt);
  tickStrains(sim, simDt);
  if (sim.flags.needFib && sim.phase === 'play') {
    sim.flags.needFib = false;
    beginCode(sim, true, sim.active);
    return sim;
  }
  drainVitals(sim, simDt, quiet);
  tickClock(sim, simDt);
  if (sim.cold != null && sim.phase === 'play') {
    sim.cold -= simDt;
    if (sim.cold <= 0) lose(sim, 'cold');
  }
  checkVitals(sim);
  if (sim.vitals < 50 && sim.def?.tools?.includes('syringe')) sim.unlocked.add('syringe');
  advanceStage(sim);
  return sim;
}

function updateQuiet(sim, inputs, dt) {
  let want = false;
  for (const seat of sim.seats) {
    const input = inputs[seat.id] || inputs[String(seat.id)] || {};
    if (seat.gift === 'quiet' && input.gift && sim.persist.quietUnlocked) want = true;
  }
  if (want && !sim.quietOn && sim.composure < 20) want = false;
  if (want && sim.phase === 'codeblue') want = false;
  sim.quietOn = want && sim.composure > 0 && sim.phase === 'play';
  if (sim.quietOn && !sim.god) {
    sim.composure = Math.max(0, sim.composure - sim.config.quietDrain * dt);
    if (sim.composure <= 0) sim.quietOn = false;
  }
  return sim.quietOn;
}

function moveSeat(sim, seat, input, dt) {
  const tol = sim.config.toolTol;
  if (input.tool && sim.unlocked.has(input.tool)) seat.tool = input.tool;
  else if (input.tool === 'dressing' || input.tool === 'syringe') seat.tool = input.tool;
  seat.use = !!input.use;
  seat.giftDown = !!input.gift;
  if (input.table != null && input.table !== sim.active) sim.active = input.table | 0;
  if (input.place) {
    seat.x = Math.max(-FIELD.x, Math.min(FIELD.x, input.x));
    seat.z = Math.max(-FIELD.z, Math.min(FIELD.z, input.z));
  } else if (input.seek) {
    let sp = input.speed || sim.config.cursorSpeed;
    if (input.steady) sp *= sim.config.steadyFactor;
    const dx = (input.x ?? seat.x) - seat.x;
    const dz = (input.z ?? seat.z) - seat.z;
    const d = Math.hypot(dx, dz) || 1;
    const stepLen = Math.min(Math.hypot(dx, dz), sp * dt);
    seat.x += (dx / d) * stepLen;
    seat.z += (dz / d) * stepLen;
  } else if (input.sx || input.sz) {
    const mag = Math.min(1, Math.hypot(input.sx || 0, input.sz || 0));
    let sp = sim.config.cursorSpeed * Math.pow(mag, 2.2);
    if (input.steady) sp *= sim.config.steadyFactor;
    if (sim.config.aimAssist > 0) {
      const near = sim.entities.some((e) => !e.done && !e.hidden && dist(seat.x, seat.z, e.x, e.z) < 0.6 * tol);
      if (near) sp *= 0.6;
    }
    const m = mag || 1;
    seat.x += ((input.sx || 0) / m) * sp * dt;
    seat.z += ((input.sz || 0) / m) * sp * dt;
  }
  if (input.angle != null && seat.holding != null && seat.holding !== -1) {
    const held = findEnt(sim, seat.holding);
    if (held && held.kind === 'fragment') held.ang = input.angle;
  }
}

/** One seat, same integrator as a full step. Clients use this for their own tip. */
export function predictSeat(sim, id, input, dt = 1 / 60) {
  const seat = sim?.seats?.[id];
  if (!seat) return;
  moveSeat(sim, seat, input || {}, dt);
}

function moveSeats(sim, inputs, dt) {
  for (const seat of sim.seats) {
    const input = inputs[seat.id] || inputs[String(seat.id)] || {};
    moveSeat(sim, seat, input, dt);
  }
}

function tryLook(sim, inputs) {
  if (sim.phase === 'codeblue') return false;
  for (const seat of sim.seats) {
    const input = inputs[seat.id] || {};
    const held = !!(input.gift && seat.gift === 'look' && sim.persist.lookUnlocked);
    if (!held) {
      seat.lookLatch = false;
      continue;
    }
    if (seat.lookLatch) continue;
    if (sim.composure < sim.config.lookCost) continue;
    const targetT = sim.realT - sim.config.lookSeconds;
    let best = null;
    for (const h of sim.hist) if (h.t <= targetT + 1e-6) best = h;
    if (!best) continue;
    sim.composure = Math.max(0, sim.composure - sim.config.lookCost);
    sim.persist.lookUses += 1;
    sim.persist.needRewind = false;
    sim.persist.rewound = true;
    seat.lookLatch = true;
    restore(sim, best.data);
    pushEvent(sim, { type: 'look', seat: seat.id });
    return true;
  }
  return false;
}

function recordHist(sim) {
  sim.histAcc += 1 / 60 * 0 + (sim.realT - (sim.histAt || 0));
  if (sim.hist.length && sim.realT - sim.hist[sim.hist.length - 1].t < 0.099) return;
  sim.hist.push({ t: sim.realT, data: capture(sim) });
  sim.histAt = sim.realT;
  if (sim.hist.length > 80) sim.hist.shift();
}

function capture(sim) {
  return {
    entities: structuredClone(sim.entities),
    tables: sim.tables.map((t) => ({ id: t.id, vitals: t.vitals })),
    mistakes: sim.mistakes,
    timeLeft: sim.timeLeft,
    stageIndex: sim.stageIndex,
    stageSpawned: sim.stages.map((st) => [...(st.spawned || [])]),
    stageEntered: sim.stages.map((st) => !!st.entered),
    score: sim.score,
    streak: sim.streak,
    doses: sim.doses,
    flags: { ...sim.flags },
    strain: sim.strain ? structuredClone(sim.strain) : null,
    phase: sim.phase === 'codeblue' ? 'play' : sim.phase,
    bpm: sim.bpm,
    beatPhase: sim.beatPhase,
    cold: sim.cold,
    pain: sim.pain,
    lie: sim.lie,
    t: sim.t,
    rng: sim.rng.state(),
    unlocked: [...sim.unlocked],
    active: sim.active,
    heart: sim.heart,
    ghost: structuredClone(sim.ghost || []),
    holds: sim.seats.map((s) => ({ holding: s.holding, tool: s.tool, score: s.score, draw: s.draw })),
  };
}

function restore(sim, data) {
  sim.entities = data.entities;
  sim.tables = data.tables.map((t) => ({ ...t }));
  sim.mistakes = data.mistakes;
  sim.timeLeft = data.timeLeft;
  sim.stageIndex = data.stageIndex;
  sim.stages.forEach((st, i) => {
    st.spawned = data.stageSpawned[i] ? [...data.stageSpawned[i]] : [];
    st.entered = !!data.stageEntered[i];
  });
  sim.score = data.score;
  sim.streak = data.streak;
  sim.doses = data.doses;
  sim.flags = { ...data.flags };
  sim.strain = data.strain;
  sim.phase = data.phase === 'won' || data.phase === 'lost' ? 'play' : data.phase;
  sim.bpm = data.bpm;
  sim.beatPhase = data.beatPhase;
  sim.cold = data.cold;
  sim.pain = data.pain;
  sim.lie = data.lie;
  sim.t = data.t;
  sim.rng.set(data.rng);
  sim.unlocked = new Set(data.unlocked);
  sim.active = data.active;
  sim.heart = data.heart;
  sim.ghost = data.ghost || [];
  sim.seats.forEach((s, i) => {
    const h = data.holds[i];
    if (!h) return;
    s.holding = h.holding;
    s.tool = h.tool;
    s.score = h.score;
    s.draw = h.draw;
  });
  mirrorVitals(sim);
}

function beginCode(sim, scripted, table) {
  sim.phase = 'codeblue';
  sim.code = { left: 12, good: 0, needle: 0, dir: 1, hold: false, scripted: !!scripted, table: table || 0 };
  if (!scripted) sim.persist.bluesLeft -= 1;
  pushEvent(sim, { type: 'codeblue', scripted: !!scripted });
}

function stepCode(sim, inputs, dt) {
  const c = sim.code;
  c.left -= dt;
  const speed = 2 / 1.2;
  c.needle += c.dir * speed * dt;
  if (c.needle >= 1) {
    c.needle = 1;
    c.dir = -1;
  }
  if (c.needle <= 0) {
    c.needle = 0;
    c.dir = 1;
  }
  let hold = false;
  for (const seat of sim.seats) {
    const input = inputs[seat.id] || {};
    if (input.charge || (input.sideL && input.sideR) || (input.use && input.alt)) hold = true;
  }
  if (c.hold && !hold) {
    const half = sim.config.blueZone / 2;
    if (Math.abs(c.needle - 0.5) <= half) c.good += 1;
    else c.left -= 3;
    pushEvent(sim, { type: 'shock', good: c.good });
  }
  c.hold = hold;
  if (c.good >= 2) {
    const table = sim.tables[c.table] || sim.tables[0];
    table.vitals = 25;
    mirrorVitals(sim);
    sim.phase = 'play';
    if (c.scripted) sim.flags.blueDone = true;
    else sim.persist.unscriptedBlue = true;
    pushEvent(sim, { type: 'cleared' });
    return;
  }
  if (c.left <= 0) lose(sim, 'codeblue');
}

function stepMassage(sim, inputs, dt) {
  sim.massageT += dt;
  const period = 60 / Math.max(40, sim.bpm);
  const beatIndex = Math.floor(sim.massageT / period);
  if (beatIndex !== sim.massageBeat) {
    sim.massageBeat = beatIndex;
    sim.massageOpen = true;
    sim.massageWindow = 0.2;
  }
  if (!sim.massageOpen) return;
  sim.massageWindow -= dt;
  const wantL = sim.massageCount % 2 === 0;
  let pressed = false;
  for (const seat of sim.seats) {
    const input = inputs[seat.id] || {};
    if (wantL ? input.sideL || input.use : input.sideR || input.alt) pressed = true;
  }
  if (pressed) {
    sim.massageCount += 1;
    sim.massageOpen = false;
    rate(sim, sim.seats[0], 'CLEAN', 0, 0);
    if (sim.massageCount >= 8) {
      sim.flags.massaged = true;
      sim.phase = 'play';
    }
  } else if (sim.massageWindow <= 0) sim.massageOpen = false;
}

function applyTools(sim, inputs, dt) {
  for (const seat of sim.seats) {
    const input = inputs[seat.id] || {};
    const using = !!input.use && (sim.unlocked.has(seat.tool) || seat.tool === 'dressing');
    if (seat.tool === 'syringe') stepSyringe(sim, seat, input, dt);
    if (!using) {
      if (seat.tool === 'drain') {
        seat.dry = 0;
        seat.bruised = false;
      }
      releaseHold(sim, seat, false);
      continue;
    }
    if (seat.tool === 'drain') stepDrain(sim, seat, dt);
    else if (seat.tool === 'forceps') stepForceps(sim, seat, dt);
    else if (seat.tool === 'scalpel') stepScalpel(sim, seat, dt);
    else if (seat.tool === 'suture') stepSuture(sim, seat, dt);
    else if (seat.tool === 'laser') stepLaser(sim, seat, dt);
    else if (seat.tool === 'scanner') stepScanner(sim, seat);
    else if (seat.tool === 'gel') stepGel(sim, seat, dt);
    else if (seat.tool === 'dressing') stepDressing(sim, seat, dt);
  }
  // gel heals nicks that sit under painted cells
  for (const nick of sim.entities) {
    if (nick.kind !== 'nick' || nick.done) continue;
    let covered = false;
    for (const g of sim.entities) {
      if ((g.kind !== 'gel' && g.kind !== 'film') || !g.cells) continue;
      for (const c of g.cells) {
        if (c.on && dist(nick.x, nick.z, c.x, c.z) <= 0.8) covered = true;
      }
    }
    nick.coverT = (nick.coverT || 0) + (covered ? dt : -nick.coverT);
    if (nick.coverT >= 1) nick.done = true;
  }
}

function sameTable(e, seat, sim) {
  return (e.table || 0) === (sim.active || 0);
}

function stepDrain(sim, seat, dt) {
  let on = false;
  for (const e of sim.entities) {
    if (e.done || !sameTable(e, seat, sim)) continue;
    if (e.kind === 'pool') {
      if (dist(seat.x, seat.z, e.x, e.z) <= e.r + 0.4 * sim.config.toolTol) {
        on = true;
        e.r -= sim.config.drainRate * dt;
        if (e.r < 0.2) finish(sim, seat, e, 'CLEAN');
      }
    } else if (e.kind === 'droplet') {
      if (dist(seat.x, seat.z, e.x, e.z) <= 0.7) {
        on = true;
        e.done = true;
      }
    }
  }
  if (on) {
    seat.dry = 0;
    seat.bruised = false;
  } else {
    seat.dry += dt;
    if (seat.dry >= 0.6 && !seat.bruised) {
      seat.bruised = true;
      spawn(sim, { kind: 'nick', x: seat.x, z: seat.z, optional: true, table: sim.active });
      rate(sim, seat, 'SLOPPY', seat.x, seat.z);
    }
  }
}

function releaseHold(sim, seat, using) {
  if (using || seat.holding == null || seat.holding === -1) return;
  const e = findEnt(sim, seat.holding);
  seat.holding = -1;
  if (!e || e.done) return;
  e.grabbedBy = -1;
  if (e.kind === 'fragment') {
    const d = Math.abs(angDiff(e.ang, e.targetAng));
    if (d <= 15) {
      const kind = d <= 5 ? 'CLEAN' : 'GOOD';
      e.ang = e.targetAng;
      finish(sim, seat, e, kind);
    }
    return;
  }
  if (e.free && (e.path || e.kind === 'clamp' || e.kind === 'unclamp')) {
    const mean = e.devN ? e.devSum / e.devN : 0;
    const kind = mean <= 0.12 ? 'CLEAN' : mean <= 0.3 ? 'GOOD' : 'SLOPPY';
    finish(sim, seat, e, kind);
    return;
  }
  if (e.tether && e.pulled > 0.2) {
    e.pulled = 0;
    spawn(sim, { kind: 'wound', x: e.x, z: e.z, len: 0.9, dx: 1, dz: 0, table: e.table });
    rate(sim, seat, 'SLOPPY', e.x, e.z);
  }
}

function stepForceps(sim, seat, dt) {
  let held = seat.holding != null && seat.holding !== -1 ? findEnt(sim, seat.holding) : null;
  if (!held) {
    let best = null;
    let bestD = 0.45 * sim.config.toolTol;
    for (const e of sim.entities) {
      if (e.done || e.grabbedBy >= 0 || !sameTable(e, seat, sim)) continue;
      if (e.hidden && !e.marked) continue;
      const tool = toolFor(e);
      if (tool !== 'forceps') continue;
      if (e.window === 'diastole' && !sim.diastole) {
        nickWindow(sim, seat, e);
        continue;
      }
      const d = dist(seat.x, seat.z, e.x, e.z);
      if (d <= bestD) {
        best = e;
        bestD = d;
      }
    }
    if (best) {
      if (best.kind === 'clamp' || best.kind === 'unclamp') {
        best.hold = (best.hold || 0) + dt;
        if (best.hold >= 0.35) tryUnclamp(sim, seat, best);
        return;
      }
      if (best.kind === 'tether') {
        best.hold = (best.hold || 0) + dt;
        const hands = sim.seats.filter((s) => s.use && s.tool === 'forceps' && (dist(s.x, s.z, best.x, best.z) < 0.7 || dist(s.x, s.z, best.x2, best.z2) < 0.7)).length;
        if (hands >= best.hands && best.hold >= 0.5) finish(sim, seat, best, 'CLEAN');
        return;
      }
      best.grabbedBy = seat.id;
      seat.holding = best.id;
      held = best;
    }
  }
  if (!held || held.done) return;
  if (held.kind === 'fragment') return;
  if (!held.path) return;
  if (held.window === 'diastole' && !sim.diastole) {
    nickWindow(sim, seat, held);
    return;
  }
  const m = pathMetrics(held.path, seat.x, seat.z);
  held.devSum += m.dev;
  held.devN += 1;
  if (m.dev > 1) {
    held.grabbedBy = -1;
    seat.holding = -1;
    held.pulled = Math.max(0, held.pulled - 0.3);
    spawn(sim, { kind: 'nick', x: seat.x, z: seat.z, optional: true, table: held.table });
    rate(sim, seat, 'MISTAKE', seat.x, seat.z);
    return;
  }
  let delta = m.along - held.pulled;
  if (held.speedLimit && dt > 0 && delta / dt > held.speedLimit) {
    held.pulled = Math.max(0, held.pulled - 0.35);
    pushEvent(sim, { type: 'snap', id: held.id });
    return;
  }
  if (delta > 0) held.pulled = m.along;
  if (held.pulled >= (held.pull || m.length) - 0.05) {
    held.free = true;
    const mean = held.devN ? held.devSum / held.devN : 0;
    const kind = mean <= 0.12 ? 'CLEAN' : mean <= 0.3 ? 'GOOD' : 'SLOPPY';
    if (held.kind === 'plate' && held.phase === 'lift') {
      held.phase = 'burn';
      held.free = false;
      held.pulled = 0;
      held.path = null;
      held.grabbedBy = -1;
      seat.holding = -1;
      held.windowHit = false;
      rate(sim, seat, kind, held.x, held.z);
      return;
    }
    finish(sim, seat, held, kind);
  }
}

function tryUnclamp(sim, seat, e) {
  if (e.kind === 'unclamp' && e.order > 0) {
    const prev = sim.entities.find((x) => x.kind === 'unclamp' && x.order === e.order - 1);
    if (prev && !prev.done) {
      e.hold = 0;
      return;
    }
  }
  if (e.kind === 'unclamp' && e.firstClot && !sim.persist.rewound) {
    sim.persist.needRewind = true;
    sim.persist.clotSeen = true;
    const table = sim.tables[sim.active];
    table.vitals = Math.max(1, table.vitals - 12);
    mirrorVitals(sim);
    spawn(sim, { kind: 'pool', x: e.x, z: e.z, r: 0.8, bleed: true, table: e.table });
    sim.say = 'Again.';
    e.hold = 0;
    pushEvent(sim, { type: 'clot' });
    return;
  }
  finish(sim, seat, e, 'CLEAN');
}

function nickWindow(sim, seat, e) {
  if (e.windowHit) return;
  e.windowHit = true;
  spawn(sim, { kind: 'nick', x: e.x, z: e.z, optional: true, table: e.table });
  rate(sim, seat, 'SLOPPY', e.x, e.z);
}

function stepScalpel(sim, seat, dt) {
  let best = null;
  let bestD = 1e9;
  for (const e of sim.entities) {
    if (e.done || !sameTable(e, seat, sim) || !e.path) continue;
    if (toolFor(e) !== 'scalpel') continue;
    if (e.hidden && !e.marked) continue;
    const start = e.path[0];
    const d0 = dist(seat.x, seat.z, start.x, start.z);
    const dev = e.started ? pathMetrics(e.path, seat.x, seat.z).dev : d0;
    if (!e.started && d0 > 0.5 * sim.config.toolTol) continue;
    if (e.started && dev > 1.25) continue;
    const rank = (e.started ? 0 : 1) + dev;
    if (rank < bestD) {
      best = e;
      bestD = rank;
    }
  }
  const e = best;
  if (!e) return;
  if (!e.started) e.started = true;
  if (e.window === 'diastole' && !sim.diastole) {
    nickWindow(sim, seat, e);
    return;
  }
  const m = pathMetrics(e.path, seat.x, seat.z);
  e.devSum += m.dev;
  e.devN += 1;
  e.maxAlong = Math.max(e.maxAlong || 0, m.along);
  if (m.dev > 0.8) {
    if (!e.cutPunish) {
      e.cutPunish = true;
      spawn(sim, { kind: 'pool', x: seat.x, z: seat.z, r: 0.55, bleed: true, table: e.table });
      rate(sim, seat, 'MISTAKE', seat.x, seat.z);
    }
  } else e.cutPunish = false;
  const doneCut = e.maxAlong >= (e.pull || m.length) * 0.9 && dist(seat.x, seat.z, e.path[e.path.length - 1].x, e.path[e.path.length - 1].z) < 0.5;
  if (doneCut) {
    const mean = e.devSum / Math.max(1, e.devN);
    const kind = mean <= 0.12 ? 'CLEAN' : mean <= 0.3 ? 'GOOD' : 'SLOPPY';
    if (e.kind === 'plate') {
      e.phase = 'lift';
      e.path = e.liftPath;
      e.pull = e.path ? pathMetrics(e.path, e.path[0].x, e.path[0].z).length : 0.55;
      e.pulled = 0;
      e.free = false;
      e.started = false;
      e.maxAlong = 0;
      e.devSum = 0;
      e.devN = 0;
      e.windowHit = false;
      rate(sim, seat, kind, e.x, e.z);
    } else finish(sim, seat, e, kind);
  }
  void dt;
}

function stepSuture(sim, seat, dt) {
  let best = null;
  let bestD = 1.4;
  for (const e of sim.entities) {
    if (e.done || !e.slots || !sameTable(e, seat, sim)) continue;
    if (e.hidden && !e.marked) continue;
    const d = dist(seat.x, seat.z, (e.x + e.x2) / 2, (e.z + e.z2) / 2);
    if (d < bestD) {
      best = e;
      bestD = d;
    }
  }
  const list = best ? [best] : [];
  for (const e of list) {
    const f = woundFrame(e);
    const px = seat.x - e.x;
    const pz = seat.z - e.z;
    const signed = px * f.nx + pz * f.nz;
    const along = (px * f.dx + pz * f.dz) / f.len;
    if (!e.sideSign) e.sideSign = Math.sign(signed) || 1;
    const amp = Math.abs(signed);
    if (Math.sign(signed || e.sideSign) === e.sideSign) e.amp = Math.max(e.amp, amp);
    const sign = Math.sign(signed) || e.sideSign;
    if (sign !== e.sideSign && e.amp >= 0.25) {
      const slot = e.slots[e.nextSlot];
      const near = slot && Math.abs(along - slot.at) <= 0.4 * sim.config.toolTol;
      const interval = e.lastTie ? sim.t - e.lastTie : 0.45;
      if (near) {
        let kind = 'GOOD';
        if (interval >= 0.2 && interval <= 0.7) kind = 'CLEAN';
        else if (interval < 0.08 || interval > 1.2) kind = 'SLOPPY';
        slot.tied = true;
        e.nextSlot += 1;
        e.lastTie = sim.t;
        seat.stitches += 1;
        rate(sim, seat, kind, seat.x, seat.z);
        if (e.nextSlot >= e.slots.length) finish(sim, seat, e, null);
      } else rate(sim, seat, 'SLOPPY', seat.x, seat.z);
      e.amp = Math.abs(signed);
      e.sideSign = sign;
    }
  }
  void dt;
}

function stepLaser(sim, seat, dt) {
  let on = false;
  for (const e of sim.entities) {
    if (e.done || !sameTable(e, seat, sim)) continue;
    if (toolFor(e) !== 'laser') continue;
    if (e.hidden && !e.marked) continue;
    if (dist(seat.x, seat.z, e.x, e.z) > 0.5 * sim.config.toolTol) continue;
    if (e.window === 'diastole' && !sim.diastole) {
      nickWindow(sim, seat, e);
      continue;
    }
    on = true;
    const burn = e.burn || sim.config.laserTime;
    e.heat += dt / burn;
    if (e.heat >= 1) {
      e.heat = 0;
      if (e.kind === 'cyst' && !e.real) {
        rate(sim, seat, 'MISTAKE', e.x, e.z);
        e.done = true;
        continue;
      }
      if (e.kind === 'eye') {
        if (e.open === false) continue;
        noteEyeLaser(sim, e);
        rate(sim, seat, 'CLEAN', e.x, e.z);
        continue;
      }
      if (e.kind === 'plate') {
        finish(sim, seat, e, 'CLEAN');
        notePlate(sim);
        continue;
      }
      finish(sim, seat, e, 'CLEAN');
    }
  }
  if (!on) {
    seat.stray = (seat.stray || 0) + dt;
    if (seat.stray >= 0.5) {
      seat.stray = 0;
      spawn(sim, { kind: 'nick', x: seat.x, z: seat.z, optional: true, table: sim.active });
      rate(sim, seat, 'MISTAKE', seat.x, seat.z);
    }
  } else seat.stray = 0;
}

function stepScanner(sim, seat) {
  for (const e of sim.entities) {
    if (e.done || !e.hidden || !sameTable(e, seat, sim)) continue;
    if (dist(seat.x, seat.z, e.x, e.z) <= 2.2) {
      e.hidden = false;
      e.marked = true;
      pushEvent(sim, { type: 'scan', id: e.id });
    }
  }
}

function stepGel(sim, seat, dt) {
  for (const e of sim.entities) {
    if (e.done || !e.cells || !sameTable(e, seat, sim)) continue;
    let painted = false;
    for (const c of e.cells) {
      if (!c.on && dist(seat.x, seat.z, c.x, c.z) <= 0.8) {
        c.on = 1;
        painted = true;
      }
    }
    if (!painted && e.kind !== 'sob') continue;
    const cov = coverage(e);
    if (cov >= (e.need || 0.92)) {
      const elapsed = sim.t - (e.born || sim.t);
      const kind = e.kind === 'sob' ? 'CLEAN' : elapsed < 4 ? 'CLEAN' : elapsed < 8 ? 'GOOD' : 'SLOPPY';
      finish(sim, seat, e, kind);
      if (e.kind === 'sob') noteSob(sim);
    }
  }
  void dt;
}

function stepDressing(sim, seat, dt) {
  for (const e of sim.entities) {
    if (e.done || e.kind !== 'dressing' || !e.path || !sameTable(e, seat, sim)) continue;
    const m = pathMetrics(e.path, seat.x, seat.z);
    if (m.dev < 0.5) e.pulled = Math.max(e.pulled, m.along);
    if (e.pulled >= (e.pull || m.length) - 0.08) finish(sim, seat, e, 'CLEAN');
  }
  void dt;
}

function stepSyringe(sim, seat, input, dt) {
  const using = !!input.use && seat.tool === 'syringe' && sim.unlocked.has('syringe');
  if (using) {
    seat.draw += dt;
    return;
  }
  if (seat.draw >= sim.config.syringeDraw && sim.doses > 0) {
    const ring = sim.entities.find((e) => e.kind === 'ring' && !e.done && sameTable(e, seat, sim)) || sim.entities.find((e) => e.kind === 'ring' && !e.done);
    const inside = ring && dist(seat.x, seat.z, ring.x, ring.z) <= ring.r;
    sim.doses -= 1;
    if (inside) {
      const table = sim.tables[ring.table || sim.active];
      table.vitals = Math.min(99, table.vitals + sim.config.syringeDose);
      mirrorVitals(sim);
      if (sim.heart) sim.bpm = Math.max(48, sim.bpm - 12);
      rate(sim, seat, 'CLEAN', ring.x, ring.z);
      pushEvent(sim, { type: 'inject' });
    } else rate(sim, seat, 'SLOPPY', seat.x, seat.z);
  }
  seat.draw = 0;
}

function finish(sim, seat, e, kind) {
  if (e.done) return;
  e.done = true;
  e.safeUntil = sim.t + 4;
  e.grabbedBy = -1;
  if (seat && seat.holding === e.id) seat.holding = -1;
  if (kind) rate(sim, seat, kind, e.x, e.z);
  if (e.hiddenBy) {
    /* reveal handled below for pools */
  }
  if (e.kind === 'pool') {
    for (const h of sim.entities) if (h.hiddenBy === e.id) {
      h.hidden = false;
      h.marked = true;
    }
  }
  if (e.vitalOnDone) {
    const table = sim.tables[e.table || 0];
    table.vitals = Math.min(99, table.vitals + e.vitalOnDone);
    mirrorVitals(sim);
  }
  if (e.painOnDone) {
    sim.pain += e.painOnDone;
    pushEvent(sim, { type: 'pain', pain: sim.pain });
  }
  pushEvent(sim, { type: 'done', id: e.id, kind: e.kind });
}

function tickPassive(sim, dt) {
  for (const e of sim.entities) {
    if (e.kind === 'droplet' && !e.done) {
      let vx = e.vx || 0;
      let vz = e.vz || -1.5;
      if (sim.strain?.name === 'lacrimosa') {
        const alive = sim.entities.filter((x) => x.kind === 'eye' && !x.done).length;
        if (alive <= 2) {
          const seat = sim.seats[0];
          vx = (seat.x - e.x) * 0.4;
          vz = (seat.z - e.z) * 0.4;
        }
      }
      e.x += vx * dt * sim.config.strainSpeed;
      e.z += vz * dt * sim.config.strainSpeed;
      const film = sim.entities.find((g) => g.kind === 'film' && !g.done && dist(g.x, g.z, e.x, e.z) < (g.r || 1));
      if (film) e.done = true;
      if (e.z < -3.5 || e.x < -7 || e.x > 7) {
        e.done = true;
        sim.tables[0].vitals -= 1;
        spawn(sim, { kind: 'nick', x: e.x, z: Math.max(-3.2, e.z), optional: true });
      }
    }
    if (e.kind === 'sob' && !e.done && e.life) {
      e.life -= dt;
      if (e.life <= 0 && coverage(e) < (e.need || 0.8)) {
        sim.tables[sim.active].vitals -= 25;
        mirrorVitals(sim);
        e.life = 6;
        for (const c of e.cells) c.on = 0;
        pushEvent(sim, { type: 'sob' });
      }
    }
    if (e.kind === 'film' && !e.done) {
      e.life -= dt;
      if (e.life <= 0) e.done = true;
    }
    if (e.window === 'diastole') e.windowHit = sim.diastole ? false : e.windowHit;
  }
}

function drainVitals(sim, dt, quiet) {
  if (quiet || sim.god || sim.phase !== 'play') return;
  for (const table of sim.tables) {
    let bleeders = 0;
    for (const e of sim.entities) {
      if (e.done || (e.table || 0) !== table.id) continue;
      if (e.bleed || e.kind === 'pool' || e.kind === 'bleeder') bleeders += 1;
    }
    const extra = Math.min(2, bleeders * sim.config.bleedDrain);
    table.vitals -= (sim.baseDrain * sim.config.vitalsDrainMul + extra) * dt;
  }
  mirrorVitals(sim);
}

function tickClock(sim, dt) {
  if (sim.god || sim.freezeClock || sim.phase !== 'play') return;
  sim.timeLeft -= dt;
  if (sim.timeLeft <= 0) {
    sim.timeLeft = 0;
    lose(sim, 'time');
  }
}

function checkVitals(sim) {
  if (sim.god || sim.phase !== 'play') return;
  for (let i = 0; i < sim.tables.length; i++) {
    if (sim.tables[i].vitals > 0) continue;
    sim.tables[i].vitals = 0;
    if (sim.persist.bluesLeft <= 0) {
      lose(sim, 'vitals');
      return;
    }
    beginCode(sim, false, i);
    return;
  }
  mirrorVitals(sim);
}

export function hashSim(sim) {
  const body = {
    p: sim.phase,
    v: sim.tables.map((t) => Math.round(t.vitals * 100) / 100),
    time: Math.round(sim.timeLeft * 100) / 100,
    score: sim.score,
    mis: sim.mistakes,
    st: sim.stageIndex,
    dose: sim.doses,
    ents: sim.entities.map((e) => [e.id, e.done ? 1 : 0, Math.round(e.x * 50), Math.round(e.z * 50), Math.round((e.r || 0) * 50), Math.round((e.pulled || 0) * 50)]),
    seats: sim.seats.map((s) => [Math.round(s.x * 50), Math.round(s.z * 50), s.tool]),
    rng: sim.rng.state(),
    flags: sim.flags,
  };
  const str = JSON.stringify(body);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function devCheat(sim, action, arg) {
  if (!sim) return;
  if (action === 'god') sim.god = !sim.god;
  else if (action === 'freeze') sim.freezeClock = !sim.freezeClock;
  else if (action === 'composure') sim.composure = 100;
  else if (action === 'mistakes') sim.config.maxMistakes = sim.config.maxMistakes === 0 ? 5 : 0;
  else if (action === 'unlock') {
    for (const t of ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner', 'dressing']) sim.unlocked.add(t);
  } else if (action === 'complete') {
    const st = sim.stages[sim.stageIndex];
    for (const id of st?.spawned || []) {
      const e = findEnt(sim, id);
      if (e) e.done = true;
    }
    sim.flags.strainDead = true;
    sim.flags.blueDone = true;
    sim.flags.massaged = true;
    if (sim.strain) sim.strain.dead = true;
  } else if (action === 'win') win(sim);
  else if (action === 'fail') lose(sim, 'dev');
  else if (action === 'blue') beginCode(sim, true, sim.active);
  else if (action === 'spawn') {
    const spec = { x: 0.2, z: 0.1, r: 0.75, ...(arg || {}) };
    if (!spec.kind) spec.kind = 'pool';
    if (spec.kind === 'strain') {
      startStrain(sim, spec.name || 'introit');
      return;
    }
    if (spec.kind === 'laceration') spec.kind = 'wound';
    spawn(sim, spec);
  }
  else if (action === 'stage') {
    sim.stageIndex = Math.max(0, Math.min(sim.stages.length - 1, arg | 0));
    sim.phase = 'play';
    enterStage(sim);
  }
}

export function retryStage(sim) {
  if (!sim.stageSnap) return sim;
  const cursors = sim.seats.map((s) => ({ x: s.x, z: s.z }));
  restore(sim, sim.stageSnap);
  sim.seats.forEach((s, i) => {
    s.x = cursors[i].x;
    s.z = cursors[i].z;
  });
  sim.persist.rankCap = 'B';
  sim.phase = 'play';
  return sim;
}
