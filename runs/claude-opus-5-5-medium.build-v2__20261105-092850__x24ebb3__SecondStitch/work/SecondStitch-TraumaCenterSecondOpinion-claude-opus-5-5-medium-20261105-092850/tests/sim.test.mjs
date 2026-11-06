// Sim tests: tools, ops, gifts, scoring, slider reset, codec, the whole campaign.
import { applyLiveConfig, createOp, step, drainEvents, hashSim, cloneState, dev, defOf, mistake } from '../src/sim/op.js';
import { correctDrift, integrateTip } from '../src/input/cursor.js';
import { createBot, botInput } from '../src/sim/bot.js';
import { OPS, CAMPAIGN_OPS, CONSULT_OPS, SESSION_LIST } from '../src/content/ops/index.js';
import { awardsFor, rate, results, rankOf, capRank } from '../src/sim/scoring.js';
import { config, defaults, resetConfig, SLIDERS } from '../src/core/config.js';
import { encodeKey, encodeSnap, decodeKey, applySnap } from '../src/sim/codec.js';
import { CAMPAIGN, recordOp } from '../src/sim/campaign.js';
import { SCENES } from '../src/content/scenes/index.js';
import { DEFAULT_SAVE } from '../src/core/save.js';
import { play } from './balance.mjs';

const mini = (stages, extra = {}) => ({ id: `t${Math.random()}`, title: 'T', arena: 'forearm', surgeon: 'ilya', gifts: [], tools: ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'], startTool: 'drain', patient: { name: 'X', objective: 'X', followUp: {} }, time: 100, vitals: { start: 80, drain: 0 }, doses: 3, par: 1000, stages, ...extra });
const hold = (sim, input, n) => { const ev = []; for (let i = 0; i < n; i++) { step(sim, [input]); ev.push(...drainEvents(sim)); } return ev; };
const walk = (sim, tool, pts, speed = 3, use = 1) => { // walk a held tool along points
  const ev = [];
  let [x, z] = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const [tx, tz] = pts[i], d = Math.hypot(tx - x, tz - z), n = Math.max(1, Math.ceil((d / speed) * 60));
    for (let k = 1; k <= n; k++) { step(sim, [{ x: x + ((tx - x) * k) / n, z: z + ((tz - z) * k) / n, tool, use }]); ev.push(...drainEvents(sim)); }
    x = tx; z = tz;
  }
  return ev;
};
const rates = (ev) => ev.filter((e) => e.t === 'rate').map((e) => e.r);

export async function run(ok) {
  resetConfig();
  /* Drain */
  { const sim = createOp(mini([{ id: 'a', spawn: [{ k: 'pool', at: [0, 0], r: 1 }], until: { clear: ['pool'] } }, { id: 'b', until: { time: 99 } }])); drainEvents(sim);
    const ev = hold(sim, { x: 0, z: 0, tool: 'drain', use: 1 }, 60);
    ok('drain: clears a pool', sim.ents.length === 0, `left ${sim.ents.length}`);
    ok('drain: rated CLEAN', rates(ev).includes('CLEAN'), rates(ev).join());
    const sim2 = createOp(mini([{ id: 'a', spawn: [{ k: 'pool', at: [5, 2], r: 1 }], until: { clear: ['pool'] } }])); drainEvents(sim2);
    const ev2 = hold(sim2, { x: -4, z: -2, tool: 'drain', use: 1 }, 40);
    ok('drain: dry tissue bruises, SLOPPY', rates(ev2).includes('SLOPPY') && sim2.scars.some((s) => s.k === 'bruise')); }
  /* Forceps */
  { const sim = createOp(mini([{ id: 'a', spawn: [{ k: 'hook', at: [0, 0], dir: [0, -1], pull: 1.2, arc: 0 }], until: { clear: ['hook'] } }, { id: 'b', until: { time: 99 } }])); drainEvents(sim);
    const ev = walk(sim, 'forceps', [[0, 0], [0, -1.3]], 1.5);
    ok('forceps: pulled free', !sim.ents.length || sim.ents[0].free);
    hold(sim, { x: 0, z: -1.3, tool: 'forceps', use: 0 }, 3);
    const ev2 = drainEvents(sim); void ev; void ev2;
    ok('forceps: flicks into the dish on release', sim.ents.length === 0, JSON.stringify(sim.ents.map((e) => e.k)));
    const s2 = createOp(mini([{ id: 'a', spawn: [{ k: 'hook', at: [0, 0], dir: [0, -1], pull: 1.2, arc: 0 }], until: { clear: ['hook'] } }])); drainEvents(s2);
    walk(s2, 'forceps', [[0, 0], [3, 0]], 6);
    ok('forceps: off path tears (nick, mistake)', s2.mistakes >= 1 && s2.ents.some((e) => e.k === 'nick'));
    const s3 = createOp(mini([{ id: 'a', spawn: [{ k: 'magnet', at: [0, 0], dir: [1, 0], pull: 2, maxSpeed: 2 }], until: { clear: ['magnet'] } }])); drainEvents(s3);
    const ev3 = walk(s3, 'forceps', [[0, 0], [2, 0]], 8);
    ok('magnet: too fast snaps back', rates(ev3).includes('SLOPPY') && s3.ents.some((e) => e.k === 'magnet' && e.s < 1.9));
    const s4 = createOp(mini([{ id: 'a', spawn: [{ k: 'core', at: [0, 0], tether: true, autoFree: true, dir: [1, 0], pull: 2.5 }], until: { clear: ['core'] } }])); drainEvents(s4);
    walk(s4, 'forceps', [[0, 0], [1, 0]], 3); hold(s4, { x: 1, z: 0, tool: 'forceps', use: 0 }, 2);
    ok('tether: letting go early snaps back and lacerates', s4.ents.some((e) => e.k === 'laceration') && s4.mistakes === 1); }
  /* Scalpel */
  { const sim = createOp(mini([{ id: 'a', spawn: [{ k: 'incision', line: [[-2, 0], [2, 0]] }], until: { clear: ['incision'] } }])); drainEvents(sim);
    const ev = walk(sim, 'scalpel', [[-2, 0], [2, 0]], 3);
    ok('scalpel: clean trace rates CLEAN', rates(ev).includes('CLEAN'), rates(ev).join());
    const s2 = createOp(mini([{ id: 'a', spawn: [{ k: 'incision', line: [[-2, 0], [2, 0]] }], until: { clear: ['incision'] } }])); drainEvents(s2);
    walk(s2, 'scalpel', [[-2, 0], [-1, 0], [-1, 2]], 3);
    ok('scalpel: cutting healthy tissue spawns a pool and a mistake', s2.ents.some((e) => e.k === 'pool') && s2.mistakes === 1);
    ok('scalpel: letting go resumes from the last point', s2.ents.find((e) => e.k === 'incision').s > 0.5); }
  /* Suture */
  { const sim = createOp(mini([{ id: 'a', spawn: [{ k: 'laceration', a: [-1, 0], b: [1, 0] }], until: { clear: ['laceration'] } }, { id: 'b', until: { time: 99 } }])); drainEvents(sim);
    const lac = sim.ents[0]; const pts = [[-1, 0.4]];
    for (let i = 0; i < lac.slots; i++) { const x = -1 + (2 * (i + 0.5)) / lac.slots; pts.push([x, i % 2 ? 0.4 : -0.4]); }
    const ev = walk(sim, 'suture', pts, 2.8);
    ok('suture: zigzag ties every slot', !sim.ents.some((e) => e.k === 'laceration'), JSON.stringify(sim.ents.map((e) => e.tied)));
    ok('suture: rhythm scores CLEAN', rates(ev).filter((r) => r === 'CLEAN').length >= 2, rates(ev).join());
    const s2 = createOp(mini([{ id: 'a', spawn: [{ k: 'laceration', a: [-3, 0], b: [3, 0] }], until: { clear: ['laceration'] } }])); drainEvents(s2);
    const ev2 = walk(s2, 'suture', [[2, 0.5], [2, -0.5], [2, 0.5]], 3);
    ok('suture: crossing far from the slot is SLOPPY with no stitch', s2.ents[0].tied === 0 && rates(ev2).includes('SLOPPY'), `${s2.ents[0].tied} ${rates(ev2)}`); }
  /* Laser */
  { const sim = createOp(mini([{ id: 'a', spawn: [{ k: 'polyp', at: [0, 0] }], until: { clear: ['polyp'] } }, { id: 'b', until: { time: 99 } }])); drainEvents(sim);
    hold(sim, { x: 0, z: 0, tool: 'laser', use: 1 }, 60);
    ok('laser: burns a target', !sim.ents.length && sim.mistakes === 0);
    const s2 = createOp(mini([{ id: 'a', spawn: [{ k: 'polyp', at: [5, 2] }], until: { clear: ['polyp'] } }])); drainEvents(s2);
    hold(s2, { x: -3, z: 0, tool: 'laser', use: 1 }, 40);
    ok('laser: healthy tissue burns (mistake)', s2.mistakes === 1 && s2.scars.some((s) => s.k === 'burn')); }
  /* Scanner, gel, syringe */
  { const sim = createOp(mini([{ id: 'a', spawn: [{ k: 'polyp', at: [1, 0], scan: true }, { k: 'polyp', at: [5, 0], scan: true }], until: { clear: ['polyp'] } }])); drainEvents(sim);
    hold(sim, { x: 0, z: 0, tool: 'scanner', use: 1 }, 3);
    ok('scanner: reveals within reach only', sim.ents[0].seen && !sim.ents[1].seen); }
  { const sim = createOp(mini([{ id: 'a', spawn: [{ k: 'mask', rect: [0, 0, 1.2, 1.2] }], until: { clear: ['mask'] } }, { id: 'b', until: { time: 99 } }])); drainEvents(sim);
    hold(sim, { x: 0, z: 0, tool: 'gel', use: 1 }, 10);
    ok('gel: paints a mask to done', !sim.ents.some((e) => e.k === 'mask'));
    const s2 = createOp(mini([{ id: 'a', spawn: [{ k: 'nick', at: [0, 0] }, { k: 'polyp', at: [5, 2] }], until: { clear: ['polyp'] } }])); drainEvents(s2);
    hold(s2, { x: 0, z: 0, tool: 'gel', use: 1 }, 70);
    ok('gel: heals a nick after a second', !s2.ents.some((e) => e.k === 'nick')); }
  { const sim = createOp(mini([{ id: 'a', until: { time: 99 } }], { port: [0, 0], vitals: { start: 40, drain: 0 } })); drainEvents(sim);
    hold(sim, { x: 0, z: 0, tool: 'syringe', use: 1 }, 30); hold(sim, { x: 0, z: 0, tool: 'syringe', use: 0 }, 2);
    ok('syringe: dose raises vitals', Math.round(sim.tables[0].vitals) === 58 && sim.doses === 2, String(sim.tables[0].vitals));
    hold(sim, { x: 5, z: 2, tool: 'syringe', use: 1 }, 30); const ev = hold(sim, { x: 5, z: 2, tool: 'syringe', use: 0 }, 2);
    ok('syringe: outside the ring wastes a dose, SLOPPY', sim.doses === 1 && rates(ev).includes('SLOPPY')); }
  /* Bone mend */
  { const sim = createOp(mini([{ id: 'a', spawn: [{ k: 'fragment', at: [0, 0], rot: 40, goal: [2, 0, 0] }], until: { clear: ['fragment'] } }, { id: 'b', until: { time: 99 } }])); drainEvents(sim);
    walk(sim, 'forceps', [[0, 0], [2, 0]], 3); hold(sim, { x: 2, z: 0, tool: 'forceps', use: 0 }, 2);
    ok('bone mend: wrong angle will not seat', sim.ents.some((e) => e.k === 'fragment'));
    walk(sim, 'forceps', [[2, 0], [2.01, 0]], 3);
    for (let i = 0; i < 40 && Math.abs(sim.ents[0].rot) > 2; i++) { step(sim, [{ x: 2, z: 0, tool: 'forceps', use: 1, rot: -1 }]); }
    hold(sim, { x: 2, z: 0, tool: 'forceps', use: 0 }, 2);
    ok('bone mend: turned, it seats', !sim.ents.some((e) => e.k === 'fragment'), JSON.stringify(sim.ents)); }
  /* Clock and fail paths */
  { const sim = createOp(mini([{ id: 'a', until: { time: 999 } }], { time: 1 }));
    for (let i = 0; i < 120; i++) step(sim, []);
    ok('clock: reaching 0 fails', sim.phase === 'lost' && sim.loseWhy === 'clock');
    const s2 = createOp(mini([{ id: 'a', spawn: [{ k: 'polyp', at: [5, 2] }], until: { clear: ['polyp'] } }])); drainEvents(s2);
    for (let i = 0; i < 400 && s2.phase === 'play'; i++) step(s2, [{ x: -3, z: 0, tool: 'laser', use: 1 }]);
    ok('mistakes: five fail the op', s2.phase === 'lost' && s2.loseWhy === 'mistakes', `${s2.phase} ${s2.mistakes}`); }
  /* Code Blue */
  { const sim = createOp(mini([{ id: 'a', until: { time: 999 } }], { vitals: { start: 1, drain: 2 } }));
    for (let i = 0; i < 120 && sim.phase === 'play'; i++) step(sim, []);
    ok('code blue: starts at 0 vitals', sim.phase === 'codeblue');
    const shock = (good) => { let guard = 0; while (sim.codeBlue && guard++ < 300) { const cb = sim.codeBlue; if (cb.cool > 0 && !cb.charging) { step(sim, [{}]); continue; } const inZone = Math.abs(cb.needle - cb.centre) < cb.zone / 2 - 0.01; if (cb.charging && (good ? inZone : cb.needle < 0.1 && cb.charge > 0.02)) { step(sim, [{}]); return; } step(sim, [{ padL: true, padR: true }]); } };
    const t0 = sim.codeBlue.t; shock(false);
    ok('code blue: a bad shock costs 3 s', sim.codeBlue && t0 - sim.codeBlue.t > 3, String(t0 - sim.codeBlue?.t));
    shock(true); shock(true);
    ok('code blue: two good shocks bring vitals back to 25', sim.phase === 'play' && sim.tables[0].vitals >= 24, `${sim.phase} ${sim.tables[0].vitals}`);
    for (let i = 0; i < 1000 && sim.phase === 'play'; i++) step(sim, []);
    ok('code blue: Resident gets one save, second time is the end', sim.phase === 'lost', sim.phase); }
  { const sim = createOp(mini([{ id: 'a', until: { time: 999 } }], { vitals: { start: 50, drain: 0 } })); dev.codeBlue(sim);
    for (let i = 0; i < 800 && sim.phase === 'codeblue'; i++) step(sim, [{}]);
    ok('code blue: running out of time loses the patient', sim.phase === 'lost' && sim.loseWhy === 'codeblue'); }
  /* The Quiet */
  { const sim = createOp(mini([{ id: 'a', until: { time: 999 } }], { gifts: ['quiet'], composure: 100, vitals: { start: 50, drain: 2 } })); drainEvents(sim);
    const c0 = sim.clock;
    hold(sim, { gift: true }, 60);
    ok('quiet: the world runs at 1/4', Math.abs(c0 - sim.clock - 0.25) < 0.02, String(c0 - sim.clock));
    ok('quiet: vitals stop falling', sim.tables[0].vitals === 50, String(sim.tables[0].vitals));
    ok('quiet: drains composure 18 per second', Math.abs(sim.composure - 82) < 0.5, String(sim.composure));
    const s2 = createOp(mini([{ id: 'a', until: { time: 999 } }], { gifts: ['quiet'], composure: 10 })); step(s2, [{ gift: true }]);
    ok('quiet: needs 20 composure', !s2.quiet); }
  /* The Second Look: exact restore */
  { const def = mini([{ id: 'a', spawn: [{ k: 'pool', at: [0, 0], r: 14 }, { k: 'hook', at: [4, 0], dir: [0, -1], pull: 1 }], until: { clear: ['pool', 'hook'] } }], { surgeon: 'sabine', gifts: ['look'], composure: 100, vitals: { start: 80, drain: 0.5 } });
    const sim = createOp(def, { seed: 7 }); drainEvents(sim);
    const movie = [];
    for (let i = 0; i < 400; i++) { step(sim, [{ x: 0, z: 0, tool: 'drain', use: 1 }]); if (sim.ringN === 0) movie.push(cloneState(sim)); drainEvents(sim); }
    const backTo = sim.ring[sim.ring.length - 40];
    const want = { r: backTo.ents[0].r, clock: backTo.clock, vit: backTo.tables[0].vitals, stage: backTo.stage };
    step(sim, [{ x: 0, z: 0, tool: 'drain', use: 0, gift: true }]);
    ok('second look: entities, vitals, clock restored exactly', Math.abs(sim.ents[0].r - want.r) < 0.05 && Math.abs(sim.clock - want.clock) < 0.05 && Math.abs(sim.tables[0].vitals - want.vit) < 0.1, JSON.stringify({ now: [sim.ents[0].r, sim.clock, sim.tables[0].vitals], want }));
    ok('second look: costs composure, leaves a ghost, counts', sim.composure < 45 && sim.ghost && sim.looks === 1);
    const before = createOp(def, { seed: 1, seats: 1 }); before.score = 1000; before.clock = 0; const f = results(before, def).total;
    before.looks = 1; const g = results(before, def).total;
    ok('second look: 5% off the final score', Math.abs(g / f - 0.95) < 0.01, `${f} ${g}`); }
  /* Scoring */
  ok('rank: bounds', rankOf(85, 100) === 'S' && rankOf(84, 100) === 'A' && rankOf(70, 100) === 'A' && rankOf(69, 100) === 'B' && rankOf(50, 100) === 'B' && rankOf(49, 100) === 'C');
  ok('rank: caps', capRank('S', 'A') === 'A' && capRank('C', 'B') === 'C');
  { const def = OPS.op1, s = createOp(def); s.score = 999999; s.unscriptedBlue = true; const r = results(s, def); ok('rank: unscripted Code Blue caps at A', r.rank === 'A' && !r.pristine, r.rank); }
  /* Sliders */
  { config.vitalsDrain = 3; config.maxMistakes = 0; const s = createOp(OPS.op1, { cfg: config }); ok('sliders: live config reaches a sim', s.cfg.vitalsDrain === 3); resetConfig(); ok('sliders: reset restores defaults', Object.keys(defaults).every((k) => config[k] === defaults[k])); ok('sliders: every slider has a default inside its range', SLIDERS.every(([k, , a, b]) => defaults[k] >= a && defaults[k] <= b), SLIDERS.filter(([k, , a, b]) => !(defaults[k] >= a && defaults[k] <= b)).map((s) => s[0]).join()); }
  /* Every op: idle fails, bot clears, determinism, retry */
  for (const id of [...CAMPAIGN_OPS, ...SESSION_LIST]) {
    const idle = play(id, 0);
    ok(`${id}: idle fails`, idle.sim.phase === 'lost', idle.sim.phase);
    const a = play(id, 0.7, 11);
    ok(`${id}: bot 0.7 clears`, a.sim.phase === 'won', `${a.sim.phase} ${a.sim.loseWhy} stage ${a.sim.stage}`);
    const b = play(id, 0.7, 11);
    ok(`${id}: determinism`, hashSim(a.sim) === hashSim(b.sim));
    const full = play(id, 1, 3);
    ok(`${id}: bot 1.0 clears`, full.sim.phase === 'won', `${full.sim.phase} ${full.sim.loseWhy} stage ${full.sim.stage}`);
    // Peak network sizes
    const peak = peakSizes(id);
    ok(`${id}: snapshot under 1100 bytes`, peak.snap <= 1100, String(peak.snap));
    ok(`${id}: keyframe under 16 KB`, peak.key <= 16000, String(peak.key));
    // Retry
    const def = OPS[id];
    const r = createOp(def, { seats: def.seats ?? 1 });
    ok(`${id}: a stage checkpoint exists`, !!r.checkpoint);
  }
  /* The plan's balance targets, section 12 */
  { const BOSSES = new Set(['op5', 'op7', 'op8', 'op9']);
    ok('balance 0.4: clears Ops 1 to 3', ['op1', 'op2', 'op3'].every((id) => play(id, 0.4).sim.phase === 'won'));
    const at7 = CAMPAIGN_OPS.map((id) => ({ id, ...play(id, 0.7) }));
    ok('balance 0.7: clears all', at7.every((r) => r.sim.phase === 'won'), at7.filter((r) => r.sim.phase !== 'won').map((r) => r.id).join());
    const ranks = at7.map((r) => r.res.rank);
    ok('balance 0.7: mostly B or A', ranks.filter((r) => r === 'A' || r === 'B').length > ranks.length / 2, ranks.join(''));
    ok('balance 0.7: at least 20% clock left outside bosses', at7.filter((r) => !BOSSES.has(r.id)).every((r) => r.sim.clock / r.sim.clockMax >= 0.2), at7.map((r) => Math.round((r.sim.clock / r.sim.clockMax) * 100)).join());
    const at1 = CAMPAIGN_OPS.map((id) => play(id, 1).res.rank);
    ok('balance 1.0: S on all', at1.every((r) => r === 'S'), at1.join('')); }
  /* Retry mid-op keeps the stage */
  { const def = OPS.op1, s = createOp(def); dev.completeStage(s); dev.completeStage(s); const cp = s.checkpoint; ok('retry: checkpoint lands on the current stage', cp && cp.stage === 2, String(cp?.stage)); }
  /* Codec round trip */
  { const def = OPS.op5, s = createOp(def); const bot = createBot(0, 0.8); for (let i = 0; i < 1800 && s.phase === 'play'; i++) { step(s, [botInput(s, bot)]); drainEvents(s); }
    const c = createOp(def); decodeKey(encodeKey(s), c); ok('codec: keyframe restores the state the view reads', c.ents.length === s.ents.length && Math.abs(c.clock - s.clock) < 0.1 && c.score === s.score);
    applySnap(c, JSON.parse(JSON.stringify(encodeSnap(s, 1))), -1); ok('codec: a snapshot applies', c.seats[0].nx != null && c.score === s.score); }
  /* Every Dev Mode slider does something to a running op */
  { const run = (mut, seats = 1, frames = 600, def = OPS.op1) => { const c = { ...defaults }; const s = createOp(def, { seats, cfg: c, seed: 2 }); mut?.(s); for (let i = 0; i < frames && s.phase === 'play'; i++) { step(s, []); drainEvents(s); } return s; };
    const v0 = run(null, 2).tables[0].vitals, v1 = run((s) => applyLiveConfig(s, 'coopScale', 1, 0.25), 2).tables[0].vitals;
    ok('slider coop scale: more seats drain faster, live', v1 < v0 - 0.01, `${v0} ${v1}`);
    const lone = createOp(OPS.op1, { seats: 1, cfg: { ...defaults } }); applyLiveConfig(lone, 'coopScale', 1, 0.25);
    ok('slider coop scale: alone it changes nothing', lone.coop === 1);
    const t = createOp(OPS.op1, { cfg: { ...defaults } }), c0 = t.clock; applyLiveConfig(t, 'timeLimit', 2, 1);
    ok('slider time limit: scales the running clock', Math.abs(t.clock - c0 * 2) < 1e-6);
    const boss = createOp(OPS.op5, { stage: 1, cfg: { ...defaults }, seed: 2 }); for (let i = 0; i < 5; i++) step(boss, []);
    const st = boss.ents.find((e) => e.k === 'strain'), hp0 = st.hp; applyLiveConfig(boss, 'strainHp', 2, 1);
    ok('slider strain HP: a running Introit has more HP', st.hp === hp0 * 2 && boss.cfg.strainHp === 2, `${hp0} ${st.hp}`);
    const weep = createOp(OPS.op7, { stage: 1, cfg: { ...defaults }, seed: 2 }); for (let i = 0; i < 5; i++) step(weep, []);
    const eye = weep.ents.find((e) => e.k === 'eye'), e0 = eye.eyeHp; applyLiveConfig(weep, 'strainHp', 2, 1);
    ok('slider strain HP: running eyes too', eye.eyeHp === e0 * 2, `${e0} ${eye.eyeHp}`);
    const h = createOp(OPS.op8, { stage: 1, cfg: { ...defaults }, seed: 2 }); for (let i = 0; i < 5; i++) step(h, []); const b0 = h.heart.bpm; applyLiveConfig(h, 'irae', 92, 72);
    ok('slider base BPM: moves the running heart', h.heart.bpm === b0 + 20);
    // Aim assist: the same stick push moves less near a target, and more damped along a stroke.
    const tipA = { x: 0, z: 0 }, tipB = { x: 0, z: 0 }, tipC = { x: 0, z: 0 };
    integrateTip(tipA, 1, 0, { speed: 10, steadyFactor: 0.4, assist: 0, near: true });
    integrateTip(tipB, 1, 0, { speed: 10, steadyFactor: 0.4, assist: 0.4, near: true });
    integrateTip(tipC, 1, 0, { speed: 10, steadyFactor: 0.4, assist: 0.4, near: false });
    ok('slider aim assist: 60% speed near a target at Low, none at 0', Math.abs(tipB.x / tipA.x - 0.6) < 1e-6 && tipC.x === tipA.x, `${tipA.x} ${tipB.x} ${tipC.x}`);
    const sA = { x: 0, z: 0 }, sB = { x: 0, z: 0 };
    integrateTip(sA, 0, 1, { speed: 10, steadyFactor: 0.4, assist: 0, stroke: [1, 0] });
    integrateTip(sB, 0, 1, { speed: 10, steadyFactor: 0.4, assist: 0.4, stroke: [1, 0] });
    ok('slider aim assist: perpendicular drift damped 50% on a stroke', Math.abs(sB.z / sA.z - 0.5) < 1e-6, `${sA.z} ${sB.z}`);
    // Each remaining slider, by what it changes.
    const mutFx = (k, v, check) => { const a = { ...defaults, [k]: v }; return check(a); };
    ok('slider drain rate', mutFx('drainRate', 3, (c) => { const s = createOp(OPS.op1, { stage: 1, cfg: c }); step(s, [{ x: -3, z: 0.5, tool: 'drain', use: 1 }]); const e = s.ents.find((q) => q.sid === 'p1'); return e.r < 1.5 - 2.9 / 60; }));
    ok('slider mistake cost', mutFx('mistakePenalty', 20, (c) => { const s = createOp(OPS.op1, { cfg: c }); const v = s.tables[0].vitals; mistake(s, s.seats[0], 'x', 0, 0); return v - s.tables[0].vitals === 20; }));
    ok('slider max mistakes: 0 means unlimited', mutFx('maxMistakes', 0, (c) => { const s = createOp(OPS.op1, { cfg: c }); for (let i = 0; i < 9; i++) mistake(s, s.seats[0], 'x', 0, 0); return s.phase === 'play'; }));
    ok('slider vitals drain', run((s) => applyLiveConfig(s, 'vitalsDrain', 3, 1)).tables[0].vitals < run().tables[0].vitals);
    ok('slider bleed drain', (() => { const mk = (b) => { const s = createOp(OPS.op1, { stage: 1, cfg: { ...defaults, bleedDrain: b } }); for (let i = 0; i < 120; i++) step(s, []); return s.tables[0].vitals; }; return mk(1) < mk(0); })());
    ok('slider composure gain', mutFx('composureGain', 20, (c) => { const s = createOp(OPS.op5, { cfg: c }), v = s.composure; rate(s, s.seats[0], 'CLEAN', 0, 0); return s.composure === v + 20; }));
    ok('slider quiet slow', mutFx('quietSlow', 0.5, (c) => { const s = createOp(OPS.op5, { cfg: c, stage: 1 }); s.composure = 100; const k = s.clock; for (let i = 0; i < 60; i++) step(s, [{ gift: true }]); return Math.abs(k - s.clock - 0.5) < 0.03; }));
    ok('slider quiet drain', mutFx('quietDrain', 40, (c) => { const s = createOp(OPS.op5, { cfg: c, stage: 1 }); s.composure = 100; for (let i = 0; i < 60; i++) step(s, [{ gift: true }]); return Math.abs(s.composure - 60) < 1; }));
    ok('slider syringe dose', mutFx('syringeDose', 30, (c) => { const s = createOp(OPS.op1, { cfg: c }); s.tables[0].vitals = 40; const p = s.port; for (let i = 0; i < 30; i++) step(s, [{ x: p[0], z: p[1], tool: 'syringe', use: 1 }]); step(s, [{ x: p[0], z: p[1], tool: 'syringe', use: 0 }]); return s.tables[0].vitals > 69; }));
    ok('slider laser time', mutFx('laserTime', 2, (c) => { const s = createOp({ ...OPS.op2, id: 'lz', stages: [{ id: 'a', spawn: [{ k: 'polyp', at: [0, 0] }], until: { clear: ['polyp'] } }, { id: 'b', until: { time: 99 } }] }, { cfg: c }); for (let i = 0; i < 60; i++) step(s, [{ x: 0, z: 0, tool: 'laser', use: 1 }]); return s.ents.some((e) => e.k === 'polyp'); }));
    ok('slider tool tolerance', mutFx('toolTolerance', 3, (c) => { const s = createOp({ ...OPS.op2, id: 'tl', stages: [{ id: 'a', spawn: [{ k: 'hook', at: [0, 0], dir: [0, -1], pull: 1 }], until: { clear: ['hook'] } }] }, { cfg: c }); step(s, [{ x: 1, z: 0, tool: 'forceps', use: 1 }]); return s.seats[0].grab != null; }));
    ok('slider look cost and seconds', mutFx('lookCost', 10, (c) => { const s = createOp(OPS.op6, { cfg: { ...c, lookSeconds: 1 }, seed: 1 }); s.composure = 15; for (let i = 0; i < 90; i++) step(s, [{}]); const clk = s.clock; step(s, [{ gift: true }]); return s.looks === 1 && Math.abs(s.clock - clk - 1) < 0.15; }));
    ok('slider strain speed', (() => { const go = (sp) => { const s = createOp(OPS.op5, { stage: 1, seed: 2, cfg: { ...defaults, strainSpeed: sp } }); for (let i = 0; i < 120; i++) step(s, []); return s.ents.find((e) => e.k === 'strain').s; }; return go(2) > go(1) * 1.5; })());
    ok('slider code blue zone', mutFx('codeBlueZone', 0.5, (c) => { const s = createOp(OPS.op1, { cfg: c }); dev.codeBlue(s); return s.codeBlue.zone === 0.5; }));
    ok('slider cursor speed and steady factor', (() => { const a = { x: 0, z: 0 }, b = { x: 0, z: 0 }; integrateTip(a, 1, 0, { speed: 20, steadyFactor: 0.4 }); integrateTip(b, 1, 0, { speed: 10, steady: true, steadyFactor: 0.5 }); return a.x === (20 / 60) && Math.abs(b.x - 5 / 60) < 1e-9; })());
  }
  /* A client's tip: moves at once, eases only past a unit of drift */
  { const near = { x: 0, z: 0 }, far = { x: 0, z: 0 };
    ok('drift: under a unit, left alone', correctDrift(near, 0.9, 0) === false && near.x === 0);
    ok('drift: over a unit, eases toward the host', correctDrift(far, 1.5, 0) === true && far.x > 0 && far.x < 0.2, String(far.x));
    ok('drift: no host position yet, left alone', correctDrift({ x: 0, z: 0 }, null, null) === false); }
  /* Awards stay inside the hub's limits */
  { const seat = (id, c) => ({ id, ratings: { CLEAN: c, SLOPPY: c }, stitches: c, saves: c, drained: c });
    const one = awardsFor([seat(0, 5)]), count = {}; one.forEach((a) => { count[a.id] = (count[a.id] ?? 0) + 1; });
    ok('awards: at most 3 per player, even alone', Math.max(...Object.values(count)) <= 3 && one.length > 0, JSON.stringify(count));
    ok('awards: titles and details fit', awardsFor([seat(0, 1), seat(1, 2)]).every((a) => a.title.length <= 24 && a.detail.length <= 40)); }
  /* Whole-game scripted playthrough */
  { const save = DEFAULT_SAVE(); let i = 0, scenes = 0, ops = 0, bad = '';
    while (i < CAMPAIGN.length) {
      const e = CAMPAIGN[i];
      if (e.scene) { if (!SCENES[e.scene]?.beats?.length) bad = `missing ${e.scene}`; scenes++; }
      else if (e.op) { const { sim, res } = play(e.op, 0.8, 21); if (sim.phase !== 'won') bad = `${e.op} lost: ${sim.loseWhy}@${sim.stage}`; recordOp(save, e.op, res); ops++; }
      save.next = ++i;
      const reloaded = JSON.parse(JSON.stringify(save)); Object.assign(save, reloaded);
    }
    ok('playthrough: every scene and op to credits', !bad && scenes === 11 && ops === 10 && save.next === CAMPAIGN.length, bad || `${scenes} ${ops}`);
    ok('playthrough: the Log and Consult unlock', CONSULT_OPS.every((id) => id === 'pileup' || save.cleared[id]));
    ok('playthrough: every op recorded and ranked', CAMPAIGN_OPS.every((id) => save.cleared[id] && save.ranks[id])); }
  void defOf;
}
function peakSizes(id) {
  const def = OPS[id], seats = Math.max(def.seats ?? 1, 2), s = createOp(def, { seats, seed: 9, gifts: ['quiet', 'look'] });
  const bots = s.seats.map((_, i) => createBot(i, 0.4));
  let snap = 0, key = 0;
  for (let i = 0; i < 7200 && s.phase !== 'won' && s.phase !== 'lost'; i++) {
    step(s, bots.map((b) => botInput(s, b))); drainEvents(s);
    if (i % 60 === 0) { snap = Math.max(snap, JSON.stringify(encodeSnap(s, i)).length); key = Math.max(key, encodeKey(s).length); }
  }
  return { snap, key };
}
