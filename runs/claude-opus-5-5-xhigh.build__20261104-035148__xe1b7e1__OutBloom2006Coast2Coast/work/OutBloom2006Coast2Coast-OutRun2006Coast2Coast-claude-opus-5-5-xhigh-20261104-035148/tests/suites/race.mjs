// traffic and run rules: spacing, free lanes, lane changes, the horn, overtakes and near misses; the clock, checkpoint
// bonuses, difficulty, time up, the goal, score maths, the Bloom chain's levels, decay and crash halving, the route
import { boot, raceIn, run } from '../lib/boot.mjs';
export default async function (t) {
  const SEG = 200;
  { const { race, OB } = raceIn({ players: [{ car: 'orchidea' }] }); const L = race.traffic.list('S1'); race.traffic.ensure('S1', 120000); const vs = L.vehicles.slice().sort((a, b) => a.z - b.z);
    t('traffic spawns per stage', vs.length > 6, vs.length);
    t('traffic types come from the stage mix', vs.every(v => OB.STAGES.S1.traffic[v.type] !== undefined));
    const sameLane = []; for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length && vs[j].z - vs[i].z < 900; j++) if (vs[i].lane === vs[j].lane) sameLane.push([vs[i].z, vs[j].z]);
    t('at least 900 apart in a lane', sameLane.length === 0, JSON.stringify(sameLane.slice(0, 3)));
    let walled = 0; for (const v of vs) { const near = vs.filter(o => Math.abs(o.z - v.z) < 1500), lanes = new Set(near.map(o => o.lane)); if (3 - lanes.size < 1) walled++; }
    t('the road is never walled off', walled === 0, walled);
    // lane changes avoid overlaps; the horn moves the car ahead
    for (const q of L.vehicles) q.gone = true; L.vehicles.length = 0; race.cfg.traffic = false;
    const v0 = race.traffic.spawn(L, race.p1.car.z + 2000, { lane: 1, v: 90 }); race.traffic.spawn(L, race.p1.car.z + 3000, { lane: 1, v: 60 });
    run(race, 4); t('a blocked car changes lane', v0 && (v0.lane !== 1 || v0.changeT > 0 || v0.blink > 0), v0 && v0.lane);
    const h = race.traffic.spawn(L, race.p1.car.z + 1500, { lane: 1, v: 100 }); race.p1.car.x = 0; race.traffic.hornCool = {}; const moved = race.traffic.horn(race.p1);
    t('the horn makes the car ahead move over', moved === h && h.toLane !== 1, moved && moved.toLane); }
  // overtakes and near misses with exact geometry
  { const { race, OB } = raceIn({ traffic: false, players: [{ car: 'orchidea' }] }); const d = race.p1, L = race.traffic.list('S1'); d.car.v = 250; d.car.x = 0; d.input = null;
    const near = race.traffic.spawn(L, d.car.z + 1200, { lane: 2, v: 100 }); near.x = OB.PLAYER_HW + near.hw + .06; near.lane = 2; near.fixedLane = true;
    const ev = []; OB.bus.on('*', (e, n) => { if (n === 'nearmiss' || n === 'overtake') ev.push(n); });
    for (let i = 0; i < 120; i++) { d.car.v = 250; near.x = OB.PLAYER_HW + near.hw + .06; race.step(1 / 120); }
    t('a close pass is a near miss', ev.includes('nearmiss'), ev.join());
    t('a close pass is an overtake', ev.includes('overtake'), ev.join()); }
  // the clock, the checkpoint, difficulty
  { const { race, OB } = raceIn({ players: [{ car: 'orchidea' }] }); const c0 = race.clock; run(race, 2); t('the clock counts down', race.clock < c0 - 1.9 && race.clock > c0 - 2.1, race.clock);
    const d = race.p1; race.place(d, 'S1', d.road.length - 3 * SEG, .5); d.car.v = 250; const before = race.clock; let cp = null; OB.bus.on('checkpoint', e => { cp = e; });
    run(race, 3, () => cp); t('a checkpoint extends the clock by its row bonus', cp && cp.bonus === Math.round(OB.tune('checkpointBonus2')) && race.clock > before + cp.bonus - 2, JSON.stringify(cp)); }
  { const { race } = raceIn({ difficulty: 'Easy', players: [{ car: 'orchidea' }] }), { race: r2 } = raceIn({ difficulty: 'Hard', players: [{ car: 'orchidea' }] }); t('difficulty scales the clock', race.clock > r2.clock); }
  { const { race, OB } = raceIn({ startTime: 1, players: [{ car: 'orchidea' }] }); let up = false; OB.bus.on('time:up', () => { up = true; }); run(race, 6); t('time up ends the run', up && race.phase === 'done' && race.endReason === 'timeup'); }
  // the goal and score maths
  { const { race, OB } = raceIn({ players: [{ car: 'orchidea', bot: {} }] }); const d = race.p1; race.place(d, 'S11', d.road && OB.World.stage('S11').goalZ - 4 * SEG, 0); d.routeIdx = 4; d.routeStr = 'LLLL'; d.car.v = 200;
    const left = race.clock; let goal = null; OB.bus.on('goal', e => { goal = e; }); run(race, 6);
    t('the goal arch ends the run at goal A', goal && goal.id === 'A' && race.phase === 'done' && race.endReason === 'goal', JSON.stringify(goal));
    t('the goal adds the seconds left and the route bonus', d.score >= Math.round(race.clock) * 1000 + 4 * 5000, d.score); }
  // the Bloom chain
  { const { race, OB } = raceIn({ players: [{ car: 'orchidea' }] }); const d = race.p1; for (let i = 0; i < 9; i++) OB.bus.emit('nearmiss', { car: d.id, id: 99 }); t('style events raise the Bloom level', d.bloom.level >= 2, d.bloom.points);
    for (let i = 0; i < 25; i++) OB.bus.emit('nearmiss', { car: d.id, id: 99 }); t('Full Bloom at 10,000 points', d.bloom.level === 5, d.bloom.points);
    const s0 = d.score; OB.bus.emit('nearmiss', { car: d.id, id: 99 }); t('events score times the level', d.score - s0 === 500 * 5, d.score - s0);
    OB.bus.emit('car:crash', { car: d.id }); t('a crash halves the chain and drops a level', d.bloom.level <= 4, d.bloom.level);
    const p0 = d.bloom.points; race.t += 10; run(race, 1); t('the chain decays with no style', d.bloom.points < p0, p0 + ' -> ' + d.bloom.points); }
  // the route string is recorded
  { const { race } = raceIn({ players: [{ car: 'orchidea', bot: { route: 'RLRL' } }] }); const d = race.p1; race.place(d, 'S1', d.road.junctionAt - 20 * SEG, .6); d.car.v = 250; run(race, 12, () => d.stage !== 'S1'); t('the route string records the fork', d.routeStr === 'R', d.routeStr); }
}
