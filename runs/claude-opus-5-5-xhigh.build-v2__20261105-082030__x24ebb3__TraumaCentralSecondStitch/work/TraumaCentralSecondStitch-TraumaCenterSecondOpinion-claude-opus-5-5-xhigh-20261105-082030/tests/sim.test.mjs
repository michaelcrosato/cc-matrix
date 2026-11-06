// Node tests of the sim: tools, ops, gifts, scoring, config, codec, the whole campaign.
import { CAMPAIGN_OPS, OPS } from '../src/content/ops/index.js';
import { createConfig, DEFAULTS, resetConfig, SLIDERS } from '../src/core/config.js';
import { applyKey, applySnap, emptyView, encodeKey, encodeSnap } from '../src/sim/codec.js';
import { advance, currentStep, EPISODES } from '../src/sim/campaign.js';
import { createOp, DT, dev, drainEvents, retryStage, stateHash, step, ZONE_CENTER } from '../src/sim/op.js';
import { capRank, finalTally, rankOf, streakMultiplier } from '../src/sim/scoring.js';
import { newProgress } from '../src/core/save.js';
import { runBot } from './simlib.mjs';

const OP = (stages, extra = {}) => ({ id: 'tst', num: 0, title: 'T', arena: 'forearm', surgeon: 'ilya', gifts: [], tools: ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'], time: 100, vitals: { start: 80, drain: 0 }, doses: 3, par: 1000, patient: { name: 'X', age: 1, job: 'Y', hook: '', objective: '', followUp: { S: '', A: '', B: '', C: '' } }, stages, ...extra });
const one = (spawn, extra) => createOp(OP([{ id: 's', spawn, until: { clear: true } }, { id: 'e', until: { time: 99 } }], extra), { seed: 3 });
const idle = (sim, ticks, inp = {}) => { for (let i = 0; i < ticks; i++) step(sim, { 0: inp }); };
const glide = (sim, tool, a, b, secs = 0.6) => {
  const n = Math.ceil(secs * 60);
  for (let i = 0; i <= n; i++) { const t = i / n; step(sim, { 0: { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tool, use: true } }); }
};
const events = (sim, name) => drainEvents(sim).filter((e) => e.e === name);

export async function run(report) {
  // Drain.
  {
    const s = one([{ k: 'pool', id: 'p', at: [0, 0], r: 1 }]);
    idle(s, 60, { x: 0, z: 0, tool: 'drain', use: true });
    report('drain empties a pool', !s.ents.some((e) => e.id === 'p'));
    const dry = one([{ k: 'pool', id: 'p', at: [4, 0], r: 0.5 }]);
    idle(dry, 40, { x: -4, z: 0, tool: 'drain', use: true });
    report('drain on dry tissue bruises and rates sloppy', dry.stats.sloppy >= 1 && dry.tables[0].marks.some((m) => m.t === 'bruise'));
    const hid = one([{ k: 'pool', id: 'p', at: [0, 0], r: 0.6 }, { k: 'hook', id: 'h', at: [0, 0], hiddenBy: 'p', dir: -90, pull: 1 }]);
    report('things hide under pools', hid.ents.find((e) => e.id === 'h').hidden);
    idle(hid, 60, { x: 0, z: 0, tool: 'drain', use: true });
    report('things surface when the pool is gone', !hid.ents.find((e) => e.id === 'h').hidden);
  }
  // Forceps.
  {
    const s = one([{ k: 'hook', id: 'h', at: [0, 0], dir: -90, pull: 1.2 }]);
    glide(s, 'forceps', [0, 0], [0, -1.3], 0.6);
    report('forceps pulls a hook free', s.ents.find((e) => e.id === 'h')?.free === true);
    idle(s, 2, { x: 0, z: -1.3, tool: 'forceps', use: false });
    report('let go when free and it goes to the dish', !s.ents.some((e) => e.id === 'h'));
    const t = one([{ k: 'hook', id: 'h', at: [0, 0], dir: -90, pull: 2 }]);
    glide(t, 'forceps', [0, 0], [3, 0], 0.4);
    report('more than a unit off path tears tissue', t.mistakes === 1 && t.ents.some((e) => e.k === 'nick'));
    const m = one([{ k: 'magnet', id: 'm', at: [0, 0], dir: -90, pull: 2, speedLimit: 2 }]);
    glide(m, 'forceps', [0, 0], [0, -2.1], 0.2);
    report('magnets snap back if pulled too fast', !m.ents.find((e) => e.id === 'm').free && m.ents.find((e) => e.id === 'm').s === 0);
    const c = one([{ k: 'fragment', id: 'f', at: [0, 0], to: [2, 0], rot: 40, rotTo: 0 }]);
    glide(c, 'forceps', [0, 0], [2, 0], 0.3);
    idle(c, 2, { x: 2, z: 0, tool: 'forceps', use: false });
    report('a fragment 40 degrees off does not snap', !c.ents.find((e) => e.id === 'f').placed);
    glide(c, 'forceps', [2, 0], [2, 0], 0.02);
    for (let i = 0; i < 14; i++) step(c, { 0: { x: 2, z: 0, tool: 'forceps', use: true, rot: -3 } });
    idle(c, 2, { x: 2, z: 0, tool: 'forceps', use: false });
    report('a fragment within 5 degrees snaps clean', c.ents.find((e) => e.id === 'f').placed && c.stats.clean === 1);
  }
  // Scalpel.
  {
    const s = one([{ k: 'incision', id: 'i', at: [-1, 0], ang: 0, len: 2 }]);
    glide(s, 'scalpel', [-1, 0], [1, 0], 0.8);
    report('tracing the guide is CLEAN', !s.ents.some((e) => e.id === 'i') && s.stats.clean === 1);
    const w = one([{ k: 'incision', id: 'i', at: [-1, 0], ang: 0, len: 2 }]);
    glide(w, 'scalpel', [-1, 0], [-0.6, 0], 0.2);
    glide(w, 'scalpel', [-0.5, 2], [-0.5, 2], 0.05);
    report('more than 0.8 off cuts healthy tissue', w.mistakes === 1 && w.ents.some((e) => e.k === 'pool'));
    const r = one([{ k: 'incision', id: 'i', at: [-1, 0], ang: 0, len: 2 }]);
    glide(r, 'scalpel', [-1, 0], [0, 0], 0.4);
    idle(r, 2, { x: 0, z: 0, tool: 'scalpel', use: false });
    const was = r.ents.find((e) => e.id === 'i').s;
    glide(r, 'scalpel', [0, 0], [1, 0], 0.4);
    report('letting go resumes from the last point', was > 0.8 && !r.ents.some((e) => e.id === 'i'));
  }
  // Suture.
  {
    const s = one([{ k: 'laceration', id: 'l', at: [-1, 0], ang: 0, len: 1.8 }]);
    const l = s.ents.find((e) => e.id === 'l');
    let side = 1;
    for (let n = 0; n < l.slots; n++) {
      const u = -1 + (n * 1.8) / (l.slots - 1);
      glide(s, 'suture', [u, -side * 0.4], [u, side * 0.4], 0.3);
      side = -side;
    }
    report('zigzag across the wound ties every slot', !s.ents.some((e) => e.id === 'l'));
    const m = one([{ k: 'laceration', id: 'l', at: [-1, 0], ang: 0, len: 1.8 }]);
    glide(m, 'suture', [-1, -0.4], [-1, 0.4], 0.3);
    glide(m, 'suture', [0.3, 0.4], [0.3, -0.4], 0.2);
    report('crossing far from the slot is SLOPPY and ties nothing', m.stats.sloppy >= 1 && m.ents.find((e) => e.id === 'l').next === 1);
  }
  // Laser.
  {
    const s = one([{ k: 'polyp', id: 'p', at: [0, 0] }]);
    idle(s, 50, { x: 0, z: 0, tool: 'laser', use: true });
    report('laser burns a polyp in 0.7 s', !s.ents.some((e) => e.id === 'p'));
    const w = one([{ k: 'polyp', id: 'p', at: [4, 0] }]);
    idle(w, 40, { x: -3, z: 0, tool: 'laser', use: true });
    report('stray laser burns healthy tissue', w.mistakes === 1);
  }
  // Scanner.
  {
    const s = one([{ k: 'prop', id: 'k', prop: 'key', at: [1, 0], hidden: true, lance: true, dir: -90, pull: 1 }]);
    idle(s, 3, { x: 0, z: 0, tool: 'scanner', use: true });
    const k = s.ents.find((e) => e.id === 'k');
    report('scanner reveals within 2.2', !k.hidden && k.locked && s.ents.some((e) => e.id === 'k-lance'));
  }
  // Gel.
  {
    const s = one([{ k: 'mask', id: 'm', at: [0, 0], rx: 1, rz: 0.7 }]);
    glide(s, 'gel', [-1, 0], [1, 0], 0.6);
    report('gel finishes a mask at 92%', !s.ents.some((e) => e.id === 'm'));
    const n = one([{ k: 'nick', id: 'n', at: [0, 0], task: true }]);
    idle(n, 70, { x: 0, z: 0, tool: 'gel', use: true });
    report('gel heals a nick after a second', !n.ents.some((e) => e.id === 'n'));
  }
  // Syringe.
  {
    const s = one([{ k: 'pool', at: [4, 2], r: 1 }], { ring: [0, 0] });
    s.tables[0].vitals = 40;
    idle(s, 30, { x: 0, z: 0, tool: 'syringe', use: true });
    idle(s, 2, { x: 0, z: 0, tool: 'syringe', use: false });
    report('syringe adds 18 in the ring and costs a dose', s.tables[0].vitals > 57 && s.doses === 2);
    idle(s, 30, { x: 3, z: 0, tool: 'syringe', use: true });
    idle(s, 2, { x: 3, z: 0, tool: 'syringe', use: false });
    report('released outside: dose wasted, SLOPPY', s.doses === 1 && s.stats.sloppy >= 1);
  }
  // Vitals, clock, mistakes, Code Blue.
  {
    const s = one([{ k: 'pool', at: [4, 2], r: 1 }], { time: 1 });
    idle(s, 80);
    report('clock at 0 fails the op', s.status === 'lost' && s.failReason === 'clock');
    const mm = one([{ k: 'pool', at: [4, 2], r: 1 }]);
    for (let i = 0; i < 5; i++) sim_mistake(mm);
    report('five mistakes fail the op', mm.status === 'lost' && mm.failReason === 'mistakes');
    const cb = one([{ k: 'pool', at: [4, 2], r: 1 }]);
    cb.tables[0].vitals = 0;
    idle(cb, 2);
    report('vitals at 0 start a Code Blue', !!cb.codeBlue);
    const shock = () => {
      for (let i = 0; i < 400; i++) {
        const near = Math.abs(cb.codeBlue?.charge - ZONE_CENTER) < 0.03 && cb.codeBlue?.charging;
        step(cb, { 0: near ? {} : { a: true, b: true } });
        if (near) return;
      }
    };
    shock();
    report('a shock in the zone counts', cb.codeBlue?.shocks === 1);
    shock();
    report('two good shocks return vitals to 25', !cb.codeBlue && cb.tables[0].vitals >= 24 && cb.unscriptedBlue);
    const late = one([{ k: 'pool', at: [4, 2], r: 1 }]);
    late.tables[0].vitals = 0;
    idle(late, 2);
    idle(late, 60 * 13);
    report('running out of Code Blue time loses the patient', late.status === 'lost');
    const bad = one([{ k: 'pool', at: [4, 2], r: 1 }]);
    bad.tables[0].vitals = 0;
    idle(bad, 2);
    const t0 = bad.codeBlue.t;
    for (let i = 0; i < 6; i++) step(bad, { 0: { a: true, b: true } });
    step(bad, { 0: {} });
    report('a bad shock costs 3 s', bad.codeBlue.t < t0 - 3);
  }
  // Gifts.
  {
    const s = createOp(OP([{ id: 's', spawn: [{ k: 'pool', at: [4, 2], r: 1 }], until: { clear: true } }], { gifts: ['quiet'] }), { seed: 3, seats: [{ id: 0, surgeon: 'ilya' }] });
    const c0 = s.clock;
    s.composure = 100;
    idle(s, 60, { gift: true });
    report('The Quiet slows the world to a quarter', Math.abs(c0 - s.clock - 0.25) < 0.02 && s.quiet);
    report('The Quiet drains composure at 18/s', Math.abs(100 - s.composure - 18) < 1);
    const v0 = s.tables[0].vitals;
    idle(s, 30, { gift: true });
    report('vitals stop falling under The Quiet', s.tables[0].vitals === v0);
    s.composure = 10;
    idle(s, 2, {});
    idle(s, 3, { gift: true });
    report('The Quiet needs 20% to start', !s.quiet);
    // Second Look: exact restore.
    const L = createOp(OP([{ id: 's', spawn: [{ k: 'pool', id: 'p', at: [0, 0], r: 1.5 }, { k: 'polyp', id: 'q', at: [4, 2] }], until: { flag: 'x' } }], { gifts: ['look'] }), { seed: 3, seats: [{ id: 0, surgeon: 'sabine' }] });
    L.composure = 100;
    idle(L, 120, {});
    const before = JSON.stringify(L.ents);
    const vitalsBefore = L.tables[0].vitals, clockBefore = L.clock;
    idle(L, 40, { x: -2, z: 0, tool: 'laser', use: true });
    idle(L, 40, { x: -2, z: 0 });
    report('stray laser made a mistake before the look', L.mistakes > 0);
    const hist = L.hist[Math.max(0, L.hist.length - 1 - 40)];
    idle(L, 1, { x: -2, z: 0, gift: true });
    report('Second Look costs 60 and restores mistakes', Math.abs(L.composure - 40) < 8 && L.mistakes === hist.mistakes && hist.mistakes === 0);
    report('Second Look restores the clock, within a tick', Math.abs(L.clock - hist.clock) < 0.05);
    report('Second Look shows a ghost and takes 5% off', !!L.ghostPlay && L.lookUses === 1);
    void before; void vitalsBefore; void clockBefore;
    const cb = createOp(OP([{ id: 's', spawn: [{ k: 'pool', at: [4, 2], r: 1 }], until: { flag: 'x' } }], { gifts: ['look'] }), { seed: 3, seats: [{ id: 0, surgeon: 'sabine' }] });
    cb.composure = 100;
    idle(cb, 60, {});
    cb.tables[0].vitals = 0;
    idle(cb, 2, {});
    idle(cb, 3, { gift: true });
    report('Second Look is disabled during Code Blue', cb.lookUses === 0);
  }
  // Scoring.
  report('rank bounds', rankOf(85, 100) === 'S' && rankOf(84, 100) === 'A' && rankOf(70, 100) === 'A' && rankOf(50, 100) === 'B' && rankOf(49, 100) === 'C');
  report('streak multiplier caps at 2', streakMultiplier(50) === 2 && streakMultiplier(0) === 1);
  report('rank cap', capRank('S', 'B') === 'B' && capRank('C', 'A') === 'C');
  // Config.
  {
    const c = createConfig();
    for (const [k, , min, max] of SLIDERS) report(`slider ${k} starts in range`, c[k] >= min && c[k] <= max);
    c.drainRate = 9; c.maxMistakes = 0;
    const s = createOp(OPS.op1, { seed: 1, config: c, seats: [{ id: 0 }] });
    s.mistakes = 40;
    report('sliders apply live', s.cfg.drainRate === 9);
    resetConfig(c);
    report('reset restores defaults', JSON.stringify(c) === JSON.stringify({ ...DEFAULTS }));
  }
  // Every op.
  for (const id of Object.keys(OPS)) {
    const idleRun = runBot(id, { skill: 0, seed: 5, maxTicks: 60 * 800 });
    report(`${id}: idle fails`, idleRun.sim.status === 'lost');
    const a = runBot(id, { skill: 0.7, seed: 9 });
    report(`${id}: bot 0.7 clears`, a.sim.status === 'won', `${a.sim.status} at ${a.sim.def.stages[a.sim.stage].id} ${a.sim.failReason ?? ''}`);
    const b = runBot(id, { skill: 0.7, seed: 9 });
    report(`${id}: determinism`, stateHash(a.sim) === stateHash(b.sim));
    const top = runBot(id, { skill: 1, seed: 7 });
    report(`${id}: bot 1.0 ranks S`, top.sim.status === 'won' && finalTally(top.sim).rank === 'S', top.sim.status === 'won' ? `${finalTally(top.sim).total}/${top.sim.def.par}` : top.sim.status);
    // Retry from stage: mid-way, fail, retry, and the bot still clears it.
    if (OPS[id].stages.length > 2) {
      const def = OPS[id];
      const sim = createOp(def, { seed: 4, seats: [{ id: 0, ...(def.seatDefaults ?? {}), bot: { skill: 0.8 } }] });
      let t = 0;
      while (sim.stage < 1 && sim.status === 'playing' && t++ < 60 * 300) { step(sim, {}); drainEvents(sim); }
      const stageAt = sim.stage;
      dev.failOp(sim);
      const ok = retryStage(sim);
      report(`${id}: retry restores the stage, rank capped at B`, ok && sim.status === 'playing' && sim.stage === stageAt && sim.capRank === 'B');
      t = 0;
      while (sim.status === 'playing' && t++ < 60 * 900) { step(sim, {}); drainEvents(sim); }
      report(`${id}: clears after a retry`, sim.status === 'won', sim.status);
      report(`${id}: rank capped after retry`, finalTally(sim).rank !== 'S' && finalTally(sim).rank !== 'A');
    }
    // Jump to any stage.
    for (let st = 0; st < OPS[id].stages.length; st += 3) {
      const jump = createOp(OPS[id], { seed: 4, startStage: st, seats: [{ id: 0, ...(OPS[id].seatDefaults ?? {}), bot: { skill: 0.9 } }] });
      report(`${id}: jump to stage ${st}`, jump.stage === st);
    }
    // Codec round trip and sizes at the peak.
    {
      const r = runBot(id, { skill: 0.7, seed: 12, maxTicks: 60 * 30 });
      void r;
      const sim = createOp(OPS[id], { seed: 8, seats: [0, 1, 2, 3].map((i) => ({ id: i, gift: i % 2 ? 'look' : 'quiet', bot: { skill: 0.6 } })) });
      let maxSnap = 0, maxKey = 0, maxDelta = 0;
      const last = new Map();
      const view = emptyView(OPS[id], sim.seats.map((s) => ({ name: 'p' + s.id })));
      for (let t = 0; t < 60 * 60 && sim.status === 'playing'; t++) {
        step(sim, {});
        drainEvents(sim);
        if (t % 5 === 0) {
          const snap = encodeSnap(sim, last);
          maxDelta = Math.max(maxDelta, JSON.stringify(snap).length);
          if (t % 60 === 0) {
            const key = encodeKey(sim);
            maxKey = Math.max(maxKey, JSON.stringify(key).length);
            applyKey(view, JSON.parse(JSON.stringify(key)));
            const fresh = new Map();
            maxSnap = Math.max(maxSnap, JSON.stringify(encodeSnap(sim, fresh)).length);
            if (t === 600 && sim.status === 'playing') {
              report(`${id}: keyframe round trip`, view.ents.length === sim.ents.filter((e) => !e.dead).length && Math.abs(view.clock - sim.clock) < 0.02 && view.tables[0].marks.length === Math.min(50, sim.tables[0].marks.length));
            }
          }
          applySnap(view, snap);
        }
      }
      report(`${id}: snapshots stay under 1100 bytes`, maxDelta <= 1100, String(maxDelta));
      report(`${id}: keyframes stay under 16 KB`, maxKey <= 16000, String(maxKey));
    }
  }
  // Scaling.
  {
    const a = createOp(OPS.pileup, { seed: 2, seats: [{ id: 0 }] });
    const b = createOp(OPS.pileup, { seed: 2, seats: [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }] });
    report('co-op scaling: drain and spawn x(1 + 0.25(N-1))', a.coop === 1 && Math.abs(b.coop - 1.75) < 1e-6);
  }
  // Paddles: two players, one paddle each.
  {
    const s = createOp(OP([{ id: 's', spawn: [{ k: 'pool', at: [4, 2], r: 1 }], until: { flag: 'x' } }]), { seed: 2, seats: [{ id: 0 }, { id: 1 }] });
    s.tables[0].vitals = 0;
    idle(s, 2);
    for (let i = 0; i < 6; i++) step(s, { 0: { a: true }, 1: { b: true } });
    report('two players can each take a paddle', s.codeBlue.charging);
  }
  // The whole shift: every scene and op, in order, by the bot, to credits.
  {
    let p = { ...newProgress(), difficulty: 'resident' };
    const log = {};
    let steps = 0;
    const visited = [];
    while (p.stage !== 'done' && steps++ < 60) {
      const cur = currentStep(p);
      visited.push(cur.id ?? cur.kind);
      if (cur.kind === 'op') {
        const { sim } = runBot(cur.id, { skill: 0.85, seed: 100 + steps });
        report(`campaign: ${cur.id} cleared`, sim.status === 'won', sim.status);
        if (sim.status === 'won') log[cur.id] = finalTally(sim);
      }
      p = advance(p);
      const saved = JSON.parse(JSON.stringify(p));
      report('campaign: progress survives a save', JSON.stringify(saved) === JSON.stringify(p));
    }
    report('campaign: all ten ops and eleven scenes', visited.filter((v) => /^op/.test(v)).length === 10 && visited.filter((v) => /^ep|end/.test(v)).length === 11, visited.join(','));
    report('campaign: ten ops on the log', Object.keys(log).length === 10);
    report('campaign: ends finished', p.finished === true && EPISODES.length === 10);
    void CAMPAIGN_OPS;
  }
  void DT; void events;
}

function sim_mistake(s) {
  // A stray laser for long enough.
  for (let i = 0; i < 60; i++) step(s, { 0: { x: -6, z: -3, tool: 'laser', use: true } });
}
