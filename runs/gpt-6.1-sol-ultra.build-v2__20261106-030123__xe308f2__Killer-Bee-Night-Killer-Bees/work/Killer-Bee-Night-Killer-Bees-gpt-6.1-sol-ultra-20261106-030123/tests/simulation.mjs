import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function runSimulationTests() {
  const scope = vm.createContext({ console });
  for (const file of ['content/stages.js', 'src/sim.js']) vm.runInContext(fs.readFileSync(path.join(base, file), 'utf8'), scope, { filename: file });
  const S = scope.NightSim, C = scope.NightContent, failures = [], campaign = [], checks = [];
  function check(name, condition) { checks.push(name); if (!condition) failures.push(name); }
  function run(w, seconds, actions = () => []) { for (let i = 0; i < Math.round(seconds * 120); i++) S.step(w, actions(w)); }
  function fixture(players = 1) { const w = S.create({ players }); w.obstacles = []; w.husks = []; w.schedule = []; w.totalTargets = 99; w.nextRival = 1e9; w.targets = []; w.rivals = []; for (const [i, p] of w.players.entries()) Object.assign(p, { x: 180 + i * 30, y: 120, hitUntil: 0 }); return w; }
  function target(w, extra = {}) { const t = S.spawnTarget(w, { type: 'left', x: 180, y: 120, dir: 0 }); Object.assign(t, { warning: 0, ...extra }); return t; }
  function rival(w, extra = {}) { const e = S.spawnRival(w, 0); Object.assign(e, { x: 180, y: 120, warning: 0, ...extra }); return e; }
  check('six authored encounters', C.stages.length === 6);
  check('content validates', S.validateContent().length === 0);
  check('three original garden palettes', new Set(C.stages.map((s) => s.environment)).size === 3);
  check('both deterministic turning families present', C.stages.every((s) => s.targets.some((t) => t.type === 'left') && s.targets.some((t) => t.type === 'right')));
  check('only finale contains concluding bellkeeper', C.stages.slice(0, 5).every((s) => s.targets.every((t) => t.type !== 'bell')) && C.stages[5].targets.some((t) => t.type === 'bell'));
  let bad = JSON.parse(JSON.stringify(C.stages)); bad[0].targets[0].type = 'dragon'; check('validator rejects unknown archetype', S.validateContent(bad).some((e) => e.includes('unsupported target')));
  bad = JSON.parse(JSON.stringify(C.stages)); bad[0].obstacles.push({ x: 0, y: 0, w: 384, h: 240 }); check('validator rejects impossible geometry', S.validateContent(bad).some((e) => e.includes('obstacle')));
  bad = JSON.parse(JSON.stringify(C.stages)); bad[0].targets = []; check('validator rejects unreachable completion schedule', S.validateContent(bad).some((e) => e.includes('completion')));
  bad = JSON.parse(JSON.stringify(C.stages)); bad[0].targets[0].at = 500; check('validator rejects nonmonotonic schedule', S.validateContent(bad).some((e) => e.includes('schedule')));
  bad = JSON.parse(JSON.stringify(C.stages)); bad[0].entrances[0] = { x: 96, y: 110 }; check('validator rejects blocked entrances', S.validateContent(bad).some((e) => e.includes('blocked entrance')));
  {
    const a = S.create({ seed: 42 }), b = S.create({ seed: 42 });
    for (let i = 0; i < 2400; i++) { const act = [{ x: Math.sin(i / 80), y: Math.cos(i / 80), focus: i % 170 < 30, ray: Math.floor(i / 700) }]; S.step(a, act); S.step(b, act); }
    check('seeded actions reproduce exact authoritative state', JSON.stringify(S.snapshot(a)) === JSON.stringify(S.snapshot(b)));
    const restored = S.restore(S.snapshot(a));
    for (let i = 0; i < 500; i++) { const act = [{ x: .6, y: .3, focus: i % 60 < 20, ray: 5 }]; S.step(a, act); S.step(restored, act); }
    check('snapshot restore continues exactly', JSON.stringify(S.snapshot(a)) === JSON.stringify(S.snapshot(restored)));
    check('restore suppresses stale audiovisual events', S.restore(S.snapshot(a)).events.length === 0);
    let threw = false; try { S.restore({ tick: 0 }); } catch { threw = true; } check('invalid snapshot rejected', threw);
  }
  {
    const w = fixture(), p = w.players[0]; run(w, 1, () => [{ x: 1, y: 0 }]); check('normal speed uses world units per second', Math.abs(p.x - 268) < .01);
    const d = fixture(), dp = d.players[0]; run(d, 1, () => [{ x: 1, y: 1 }]); check('diagonal normalized', Math.abs(Math.hypot(dp.x - 180, dp.y - 120) - 88) < .01);
    const f = fixture(), fp = f.players[0]; run(f, 1, () => [{ x: 1, y: 0, focus: true }]); check('Focus movement factor real', Math.abs(fp.x - 246) < .01); check('Focus footprint visibly smaller', fp.r < p.r);
    run(w, 10, () => [{ x: 1, y: -1 }]); check('arena bounds enforce exact collision radius', p.x <= 384 - 4 - p.r && p.y >= 4 + p.r);
    const n = fixture(), np = n.players[0]; S.step(n, [{ x: Infinity, y: NaN, ray: Infinity }]); check('invalid action numbers neutralized', np.x === 180 && np.y === 120 && np.charge);
    const c = fixture(2); c.players[1].x = c.players[0].x; c.players[1].y = c.players[0].y; run(c, .5); check('friends never damage or block one another', c.players.every((p) => p.bees === 12));
  }
  {
    const w = fixture(), p = w.players[0], t = target(w); S.step(w); const damaged = t.health;
    check('overlap stings target', damaged < t.maxHealth && p.contact && t.contact);
    p.x = 300; p.y = 200; run(w, .6); check('recovery has explicit grace', t.health === damaged);
    run(w, .4); check('broken contact visibly recovers target', t.health > damaged);
    run(w, 2); check('full recovery clears contribution ledger', t.health === t.maxHealth && t.contributions.every((x) => x === 0));
    const a = fixture(), ta = target(a), b = fixture(), tb = target(b); S.step(a, [{ focus: false }]); S.step(b, [{ focus: true }]); check('Focus concentrates damage', tb.maxHealth - tb.health > ta.maxHealth - ta.health);
    const q = fixture(), qp = q.players[0], qt = target(q); qp.bees = 3; S.step(q); check('small swarms sting less effectively', qt.maxHealth - qt.health < ta.maxHealth - ta.health);
  }
  {
    const w = fixture(), p = w.players[0], t = target(w, { x: 300 }); w.husks.push({ id: -1, x: 250, y: 120, r: 9 }); const e = rival(w, { x: 340, y: 120 }), off = rival(w, { x: 340, y: 180 });
    const health = t.health; S.step(w, [{ ray: 1 }]); check('ray kills full horizontal row through scenery', !w.rivals.includes(e) && w.rivals.includes(off)); check('ray cannot damage gardener', t.health === health); check('ray cannot damage friendly bees', p.bees === 12); check('ray leaves husks intact', w.husks.some((h) => h.id === -1)); check('ray consumes one charge', !p.charge);
    const score = w.score; S.step(w, [{ ray: 1 }]); check('replayed ray counter cannot fire twice', w.events.every((e) => e.type !== 'ray' && e.type !== 'dry') && w.score === score);
    S.step(w, [{ ray: 2, x: 1 }]); check('empty ray gives dry cue without movement interruption', w.events.some((e) => e.type === 'dry') && p.x > 180);
    const k = fixture(), kp = k.players[0], kt = target(k, { health: .1 }); rival(k, { x: 300, y: 120 }); S.step(k, [{ ray: 1 }]); check('same-tick ray spend resolves before target refill', kp.charge && k.events.some((e) => e.type === 'ray') && k.events.some((e) => e.type === 'charge'));
    check('single target death awards score once', k.kills === 1 && k.score === 225); const prior = k.score; S.step(k); check('death cannot duplicate points', k.score === prior && k.kills === 1);
    check('fallen gardener creates static solid husk', k.husks.length === 1 && !S.free(k, k.husks[0].x, k.husks[0].y, 1)); check('husk preserves full-swarm Focus topology', S.topologyOK(k)); check('husk escape leaves living swarm outside solid', S.free(k, kp.x, kp.y, kp.r));
    const pos = { ...k.husks[0] }; run(k, 1); check('husk collision never drifts with cosmetic settling', k.husks[0].x === pos.x && k.husks[0].y === pos.y);
  }
  {
    const w = fixture(2), p = w.players; p[1].x = p[0].x; p.forEach((v) => v.charge = false); const t = target(w, { health: .1, contributions: [40, 60] }); S.step(w); check('co-op greatest contributor gets single refill', !p[0].charge && p[1].charge && w.events.filter((e) => e.type === 'charge').length === 1);
    const tie = fixture(2); tie.players[1].x = tie.players[0].x; tie.players.forEach((p) => p.charge = false); target(tie, { health: .1, contributions: [50, 50] }); S.step(tie); check('equal contribution ties use stable player ID', tie.players[0].charge && !tie.players[1].charge);
    const old = fixture(2); old.players[1].charge = false; old.players[1].emptySince = -5; target(old, { health: .1 }); S.step(old); check('empty noncontributor fallback receives otherwise wasted charge', old.players[1].charge);
    const all = fixture(2); target(all, { health: .1 }); S.step(all); check('full-charge team does not bank extra refills', all.events.every((e) => e.type !== 'charge') && all.players.every((p) => p.charge));
    const both = fixture(); both.players[0].charge = false; target(both, { health: .1 }); target(both, { health: .1 }); S.step(both); check('simultaneous target deaths cannot duplicate charge', both.kills === 2 && both.events.filter((e) => e.type === 'charge').length === 1);
  }
  {
    const w = fixture(), p = w.players[0]; for (let i = 0; i < 4; i++) rival(w); S.step(w); check('overlapping rival crowd costs at most one bee per tick', p.bees === 11); run(w, .5); check('damage grace prevents rapid loss', p.bees === 11); run(w, .12); check('danger cadence permits next visible bee loss', p.bees === 10);
    const warn = fixture(), e = rival(warn, { warning: 1 }); run(warn, 2); check('warning never releases onto player', e.warning > 0 && warn.players[0].bees === 12); warn.players[0].x = 300; run(warn, 1.2); check('clear entrance safely releases rival', e.warning === 0);
    const m = fixture(), me = rival(m, { x: 64, y: 64, age: 9 }); S.step(m); check('scout matures into protective guard', me.stage === 'guard' && m.events.some((e) => e.type === 'mature')); me.age = 21; S.step(m); check('guard matures into pursuing hunter', me.stage === 'hunter');
    const co = fixture(2); co.players[0].bees = 0; S.step(co); check('fallen teammate observes while partner lives', co.phase === 'playing' && co.players[0].bees === 0); co.players[1].bees = 0; S.step(co); check('co-op double wipe fails', co.phase === 'failed');
    const fail = fixture(); fail.players[0].bees = 0; S.step(fail); check('solo final bee fails', fail.phase === 'failed');
  }
  {
    const w = S.create({ seed: 3 }); w.score = 123; w.streak = 2; S.loadStage(w, 2, false); const cp = { ...w.checkpoint }; w.score = 999; w.players[0].bees = 0; w.phase = 'failed'; S.retry(w); check('retry restores checkpoint score and encounter', w.stage === 2 && w.score === cp.score && w.players[0].bees === 12 && w.players[0].charge); check('retry permanently marks run assisted', w.assisted); S.resetTuning(w); check('reset tuning cannot erase assistance history', w.assisted);
    S.setTuning(w, 'speed', 10000); check('live tuning clamps valid range', w.tuning.speed === 150); check('starting at a later encounter marks assisted', S.create({ stage: 2 }).assisted); check('nondefault initial tuning marks assisted', S.create({ tuning: { speed: 120 } }).assisted); check('invalid tuning rejected', !S.setTuning(w, 'speed', NaN) && !S.setTuning(w, 'banana', 5));
    S.restart(w); check('restart creates clean fresh campaign', w.stage === 0 && w.score === 0 && !w.assisted && w.players[0].bees === 12);
    const joined = S.create(); check('couch join accepted at safe opening', S.addPlayer(joined) && joined.players.length === 2); check('couch join cannot add third player', !S.addPlayer(joined)); run(joined, 1); const late = S.create(); run(late, 1); check('mid-encounter join waits for safe boundary', !S.addPlayer(late));
    S.leave(joined, 1); check('guest departure clears held motion and observer body', joined.players[1].bees === 0 && joined.players[1].vx === 0 && !joined.players[1].connected);
  }
  {
    const w = fixture(), bell = target(w, { type: 'bell', r: 13, bossPhase: 'move', bossTimer: 0, bossNext: 1, health: 400, maxHealth: 430 }); S.step(w); check('closed bellkeeper core clearly protected', bell.health === 400); bell.bossPhase = 'expose'; bell.bossTimer = 0; S.step(w); check('exposed bellkeeper uses ordinary sting damage', bell.health < 400);
    bell.bossPhase = 'pulse'; bell.bossTimer = 1.19; w.players[0].x = bell.x - 20; w.players[0].y = bell.y; const oldx = w.players[0].x, bees = w.players[0].bees; run(w, .03); check('telegraphed bell pulse pushes without damage', w.players[0].x < oldx && w.players[0].bees === bees && bell.bossPhase === 'move');
  }
  // Principal campaign proof: only command inputs and normal encounter continuation.
  // No position/health/charge changes, invulnerability, loadStage, or clear triggers.
  for (const [seed, players] of [[42, 1], [7, 2]]) {
    const w = S.create({ seed, players }), seen = new Set(), phases = [], eventIds = new Set(), counts = { focus: 0, roam: 0, husks: 0, liveBees: 0, geometryErrors: 0, duplicateEvents: 0, lostHusks: 0 }; let oldHusks = [];
    for (let tick = 0; tick < 120 * 900; tick++) {
      const actions = w.players.map((p) => S.bot(w, p.id)); for (const a of actions) counts[a.focus ? 'focus' : 'roam']++;
      S.step(w, actions); for (const e of w.events) { if (eventIds.has(e.id)) counts.duplicateEvents++; eventIds.add(e.id); } if (w.tick % 120 === 0 && w.players.some((p) => p.bees > 0 && !S.free(w, p.x, p.y, p.r))) counts.geometryErrors++; if (oldHusks.some((id) => !w.husks.some((h) => h.id === id))) counts.lostHusks++; oldHusks = w.husks.map((h) => h.id); seen.add(w.stage); counts.husks = Math.max(counts.husks, w.husks.length); counts.liveBees = Math.max(counts.liveBees, ...w.players.map((p) => p.bees));
      if (w.phase === 'result') { phases.push({ stage: w.stage, time: w.stageTime, bees: w.players.map((p) => p.bees) }); S.next(w); oldHusks = []; }
      if (w.phase === 'won' || w.phase === 'failed') break;
    }
    const label = `normal campaign seed ${seed}, ${players}P`;
    check(`${label}: six encounters genuinely completed`, w.phase === 'won' && seen.size === 6 && w.stats.clear === 6);
    check(`${label}: campaign ends below Hub 15-minute cap`, w.phase === 'won' && w.time < 900);
    check(`${label}: campaign duration near ten minutes before result screens`, w.time >= 540 && w.time < 800);
    check(`${label}: ray, loss, refill and three rival stages exercised`, w.stats.ray > 0 && w.stats.loss > 0 && w.stats.charge > 0 && w.stats.mature > 0);
    check(`${label}: both formations and route-changing husks exercised`, counts.focus > 0 && counts.roam > 0 && counts.husks > 0);
    check(`${label}: concluding routine includes exposure and pulse`, w.stats.expose > 0 && w.stats.pulse > 0);
    check(`${label}: run remained unassisted`, !w.assisted && !w.invulnerable && JSON.stringify(w.tuning) === JSON.stringify(S.defaults));
    check(`${label}: finite authoritative coordinates`, [...w.players, ...w.targets, ...w.rivals, ...w.husks].every((e) => Number.isFinite(e.x) && Number.isFinite(e.y)));
    check(`${label}: bees remain within contract`, w.players.every((p) => p.bees >= 0 && p.bees <= 12));
    check(`${label}: final topology reachable`, S.topologyOK(w));
    check(`${label}: players remain outside every solid`, counts.geometryErrors === 0);
    check(`${label}: every shell persists until its encounter ends`, counts.lostHusks === 0);
    check(`${label}: event identifiers stay globally unique`, counts.duplicateEvents === 0);
    campaign.push({ seed, players, phase: w.phase, time: w.time, score: w.score, bees: w.players.map((p) => p.bees), stats: w.stats, geometry: counts, phases });
  }
  return { passed: checks.length - failures.length, failed: failures.length, checks: checks.length, failures, campaign, issues: [] };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = runSimulationTests();
  for (const failure of result.failures) console.error(`FAIL: ${failure}`);
  console.log(`${result.checks} simulation checks: ${result.passed} passed, ${result.failed} failed`);
  fs.writeFileSync(path.join(base, 'evidence/simulation.json'), JSON.stringify(result, null, 2));
  process.exitCode = result.failed ? 1 : 0;
}
