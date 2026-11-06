import { makeStub, run, resetTuning } from './headless.mjs';
import { REGISTRY } from '../src/data/events.js';
const NOBAL = ['springboard', 'raft'];
export default async function (t) {
  const game = await makeStub();
  for (const E of REGISTRY) for (const tier of [0, 1, 2]) {
    resetTuning(); const lanes = E.id === 'raft' ? [0, 1, 2, 3].map((i) => ({ kind: 'bot', skill: 'sharp', name: 'B' + i })) : [{ kind: 'bot', skill: 'sharp' }];
    const ev = new E(game, { tier, seed: 3, lanes }); run(ev, 400);
    t.ok(ev.phase === 'done', `${E.id} T${tier + 1} completes`); const r = ev.laneResult(0); t.ok(Number.isFinite(r.form) && r.form >= 0 && r.form <= 100, `${E.id} T${tier + 1} result valid (${r.form})`);
    for (const l of ev.lanes) if (l.bal) { const b = l.bal.body.translation(); t.ok(Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(l.bal.leanX), `${E.id} T${tier + 1} no NaN`); }
    ev.dispose(); t.ok(ev.disposed, `${E.id} T${tier + 1} disposes`);
  }
  // session events must tolerate ghost lanes (hud, frame, finish)
  for (const E of REGISTRY.filter((e) => e.session)) { try { const ev = new E(game, { tier: 0, seed: 5, session: true, duration: 50, lanes: [{ kind: 'bot', skill: 'sharp' }, { kind: 'ghost', name: 'G1' }, { kind: 'ghost', name: 'G2' }] }); ev.begin(); for (let i = 0; i < 120 * 60 && ev.phase !== 'done'; i++) { ev.fixed(1 / 120); if (i % 12 === 0) { ev.frame(0.1); for (const l of ev.lanes) ev.hudInfo && ev.hudInfo(l); } } ev.finish(); t.ok(ev.phase === 'done', E.id + ' runs with ghost lanes'); ev.dispose(); } catch (e) { t.ok(false, E.id + ' ghost lanes: ' + String(e.stack).slice(0, 160)); } }
  // forced fall ragdolls and recovers
  for (const E of REGISTRY.filter((e) => !NOBAL.includes(e.id) && e.id !== 'roomService')) {
    const ev = new E(game, { tier: 0, seed: 4, lanes: [{ kind: 'bot', skill: 'sharp' }] }); ev.begin(); for (let i = 0; i < 120 * 5; i++) ev.fixed(1 / 120); const l = ev.lanes[0];
    if (l.bal && !l.bal.fallen) { ev.fallLane(l); t.ok(l.bal.fallen && l.rag.active, `${E.id} fall ragdolls`); for (let i = 0; i < 120 * 5; i++) ev.fixed(1 / 120); if (ev.phase !== 'done') t.ok(!l.bal.fallen && !l.rag.active && Number.isFinite(l.bal.leanX) && l.bal.leanDeg < 40, `${E.id} recovers upright`); }
    ev.dispose();
  }
  // soak the removal paths with the doll swaying
  const { FruitHat } = await import('../src/events/fruitHat.js'); const { Cairn } = await import('../src/events/cairn.js');
  for (let k = 0; k < 6; k++) { const ev = new FruitHat(game, { tier: 1, seed: 10 + k, lanes: [{ kind: 'bot', skill: 'average', bankAt: 3 }] }); run(ev, 40); t.ok(Number.isFinite(ev.lanes[0].score), 'soak fruit banks ' + k); ev.dispose(); }
  for (let k = 0; k < 4; k++) { const ev = new Cairn(game, { tier: 1, seed: 20 + k, lanes: [{ kind: 'bot', skill: 'clumsy' }] }); run(ev, 60); const l = ev.lanes[0]; ev.fallLane && !l.bal.fallen && ev.fallLane(l); for (let i = 0; i < 600; i++) ev.fixed(1 / 120); t.ok(true, 'soak cairn ' + k); ev.dispose(); }
}
