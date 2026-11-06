import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const env = { console }; vm.createContext(env);
for (const f of ['content', 'sim', 'bot']) vm.runInContext(fs.readFileSync(new URL('../src/' + f + '.js', import.meta.url), 'utf8'), env, { filename: f });
const A = env.ABJ, Sim = A.Sim;
const failures = [], details = [], issues = [];
let count = 0;
function test(name, fn) { count++; try { fn(); } catch (e) { failures.push({ name, error: e.stack }); } }
const run = (sim, seconds, fn = () => ({})) => { for (let i = 0; i < seconds * 120; i++) sim.step(fn(sim.s)); };
const fresh = options => { const sim = new Sim(options); sim.s.phase = 'active'; return sim; };
test('Content has six valid eight-column formations and four presets', () => { assert(A.validateContent()); assert.equal(A.WAVES.length, 6); assert.equal(A.DIFFICULTIES.length, 4); });
test('Seed and identical input reproduce every serializable field', () => { const a = fresh(), b = fresh(); for (let i = 0; i < 2400; i++) { const c = { 0: { move: i % 400 < 200 ? 1 : -1, fire: true, repair: i % 180 === 0 } }; a.step(c); b.step(c); } assert.equal(JSON.stringify(a.s), JSON.stringify(b.s)); });
test('Last survivor uses its living column bounds, accelerates and descends', () => { const q = fresh(), slow = q.marchInterval(); q.s.enemies = [q.s.enemies.find(e => e.col === 7 && e.row === 0)]; assert(q.marchInterval() < slow / 3); q.s.formation.x = 458 - 8 - 7 * 38; q.s.formation.dir = 1; run(q, .2); assert(q.s.formation.reversals > 0); assert(q.s.formation.y > 58); });
test('A living attacker reaching breach ends the defense', () => { const q = fresh(); q.s.formation.y = 218; run(q, 1); assert.equal(q.s.reason, 'BREACH'); });
test('Swept segment detects thin cells even over a long distance', () => { assert.equal(A.segmentBox(20, 200, 20, 50, 20, 100, 1.5, 1.5) !== null, true); });
test('Friendly first hit erodes cover and cannot damage an enemy behind it', () => { const q = fresh(), s = q.s, b = s.bunkers[0]; const x = b.x + 8 * 3 + 1.5; s.enemies = [{ id: 999, col: 0, row: 0, type: 'o', hp: 1, hit: 0, attack: 0 }]; s.formation.x = x; s.formation.y = 170; s.shots = [{ id: 1000, x, y: 225, vx: 0, vy: -12000, team: 0, owner: 0, kind: 'missile', life: 100 }]; const before = JSON.stringify(b.rows); q.resolveShots(); assert.notEqual(JSON.stringify(b.rows), before); assert.equal(s.enemies.length, 1); assert.equal(s.shots.length, 0); });
test('A cannon on a cell boundary cuts a complete lane without repeatedly striking an uneroded neighbor', () => {
  const q = fresh(), p = q.s.ships[0]; p.x = 306;
  run(q, 4, () => ({ 0: { fire: true } }));
  const b = q.s.bunkers[2]; assert(b.rows.every(row => (row & (1 << 11)) === 0 && (row & (1 << 12)) === 0));
  assert(q.s.shots.some(shot => shot.team === 0 && shot.y < b.y));
});
test('Bombs crater from above; broad bombs remove more cells', () => { const a = fresh(), b = fresh(); a.bunkerHit(a.s.bunkers[0], 80, 203, false, false); b.bunkerHit(b.s.bunkers[0], 80, 203, false, true); const cells = q => q.s.bunkers[0].rows.reduce((n, r) => n + r.toString(2).replace(/0/g, '').length, 0); assert(cells(b) < cells(a)); });
test('Intact cover refuses repair without spending; a destroyed footprint can rebuild around both barrels', () => { const q = fresh({ players: [0, 1] }), [p, p2] = q.s.ships, b = q.s.bunkers[0]; p.x = 78; p2.x = 89; const old = p.charges; assert.equal(q.repair(p), false); assert.equal(p.charges, old); b.rows.fill(0); assert.equal(q.repair(p), true); assert.equal(p.charges, old - 1); assert(b.rows.some(n => n)); for (let row = 0; row < 8; row++) for (let col = 0; col < 16; col++) { const x = b.x + col * 3 + 1.5; if (Math.abs(p.x - x) < 2.3 || Math.abs(p2.x - x) < 2.3) assert.equal(b.rows[row] & (1 << col), 0); } });
test('Repair target tie breaks stably and exposes a usable preview', () => { const q = fresh(), p = q.s.ships[0]; p.x = 133; q.s.bunkers[0].rows.fill(0); assert.equal(q.repairTarget(p).bunker, 0); assert(q.repairTarget(p).usable); });
test('Every fourth kill drops salvage; catches cap at three; expiry is finite', () => { const q = fresh(), p = q.s.ships[0]; for (let i = 0; i < 4; i++) q.hitEnemy(q.s.enemies.find(e => e.row === 3), 0); assert.equal(q.s.stats.drops, 1); p.charges = 2; q.s.pickups = [{ id: 888, x: p.x, y: p.y, life: 100 }]; q.pickups(); assert.equal(p.charges, 3); q.s.pickups = [{ id: 889, x: p.x, y: p.y, life: 1 }]; q.pickups(); assert.equal(p.charges, 3); assert.equal(q.s.pickups.length, 0); });
test('Solo deployment reserve is consumed once per protected respawn and extra only once', () => { const q = fresh(), p = q.s.ships[0]; p.shield = 0; q.killShip(p); q.killShip(p); assert.equal(q.s.reserve, 1); run(q, 1.01); assert(p.active && p.shield > 0); assert.equal(q.s.reserve, 1); assert.equal(q.s.phase, 'active'); q.addScore(p, 1000); assert.equal(q.s.reserve, 2); q.addScore(p, 2000); assert.equal(q.s.reserve, 2); });
test('Simultaneous co-op deaths remain pending; score extra can restore an exhausted spectator', () => { const q = fresh({ players: [3, 7] }); q.s.reserve = 1; for (const p of q.s.ships) { p.shield = 0; q.killShip(p); } q.step(); assert.notEqual(q.s.phase, 'defeat'); assert.equal(q.s.ships.filter(p => p.wait).length, 1); q.addScore(q.s.ships[0], 1000); assert.equal(q.s.ships.filter(p => p.wait).length, 2); assert.equal(q.s.reserve, 0); });
test('Empty reserves with no ship or pending deployment cause depletion defeat', () => { const q = fresh(); q.s.reserve = 0; q.s.ships[0].shield = 0; q.killShip(q.s.ships[0]); q.step(); assert.equal(q.s.reason, 'DEPLOYMENTS DEPLETED'); });
test('Each cannon holds at most two missiles', () => { const q = fresh(); run(q, 2, () => ({ 0: { fire: true } })); assert(q.s.shots.filter(b => b.team === 0).length <= 2); });
test('Armoured enemy breaks shell first and then awards its row value', () => { const q = fresh(); q.startEncounter(2); const e = q.s.enemies.find(e => e.type === 'A'); q.hitEnemy(e, 0); assert(q.s.enemies.includes(e)); assert.equal(e.hp, 1); assert.equal(q.s.score, 0); q.hitEnemy(e, 0); assert(!q.s.enemies.includes(e)); assert.equal(q.s.score, (4 - e.row) * 10); });
test('An exposed bombardier telegraphs then releases its broad crater bomb', () => {
  const q = fresh(); q.startEncounter(3); q.s.phase = 'active'; q.s.fireClock = 1; q.s.enemies = [q.s.enemies.find(e => e.type === 'B')]; run(q, 1.1);
  assert(q.s.events.some(e => e.type === 'warning' && e.broad)); assert(q.s.shots.some(b => b.kind === 'crater'));
});
test('Saucer is harmless and predictable; bonus family and salvage are awarded', () => { const q = fresh(); q.s.nextSaucer = 1; q.step(); assert(q.s.saucer); assert.equal(q.s.shots.length, 0); const u = q.s.saucer; q.s.shots = [{ id: q.id(), x: u.x, y: 45, vx: 0, vy: -1000, team: 0, owner: 0, kind: 'missile', life: 100 }]; q.resolveShots(); assert.equal(q.s.score, 100); assert.equal(q.s.stats.drops, 2); });
test('Flagship armour windows, both emitters, core phase and victory', () => { const q = fresh(); q.startEncounter(6); q.s.boss.cycle = 450; q.hitBoss('left', 0); assert.equal(q.s.boss.left, 7); q.s.boss.cycle = 0; for (let i = 0; i < 7; i++) q.hitBoss('left', 0); for (let i = 0; i < 7; i++) q.hitBoss('right', 0); assert.equal(q.s.boss.phase, 2); for (let i = 0; i < q.s.boss.maxCore; i++) q.hitBoss('core', 0); assert.equal(q.s.phase, 'victory'); });
test('Location pair preserves damage; relocation visibly restores a baseline and removes spent threats', () => { const q = fresh(); q.s.encounter = 0; q.s.bunkers[0].rows.fill(0); q.s.enemies = []; q.step(); run(q, 2.5); assert.equal(q.s.encounter, 1); assert(q.s.bunkers[0].rows.every(x => x === 0)); q.s.phase = 'active'; q.s.enemies = []; q.step(); run(q, 4); assert.equal(q.s.encounter, 2); assert(q.s.bunkers[0].rows.some(x => x)); assert.equal(q.s.shots.length, 0); });
test('Departing seat consumes no resources and cannot fire or respawn', () => { const q = fresh({ players: [0, 1] }); const reserve = q.s.reserve; q.leave(1); run(q, 1, () => ({ 1: { fire: true } })); assert.equal(q.s.reserve, reserve); assert.equal(q.s.shots.filter(b => b.owner === 1).length, 0); assert(q.s.ships[1].gone); });
for (const players of [[0], [0, 1]]) test('Ordinary standard campaign completes with ' + players.length + ' seat(s)', () => {
  const q = new Sim({ seed: 2037, difficulty: 1, players });
  let ticks = 0;
  while (ticks++ < 120 * 1100 && !['victory', 'defeat'].includes(q.s.phase)) {
    const before = JSON.stringify(q.s);
    const commands = Object.fromEntries(players.map(id => [id, A.pilot(q.s, id)]));
    if (ticks === 1) assert.equal(JSON.stringify(q.s), before);
    q.step(commands);
  }
  const evidence = { seats: players.length, seconds: q.s.tick / 120, phase: q.s.phase, reason: q.s.reason, encounter: q.s.encounter, score: q.s.score, reserve: q.s.reserve, stats: q.s.stats, ships: q.s.ships, assisted: q.s.assisted, invulnerable: q.s.dev.invulnerable, seed: q.s.seed };
  details.push(evidence);
  assert.equal(q.s.phase, 'victory', JSON.stringify(evidence)); assert.equal(q.s.stats.cleared.length, 6); assert(q.s.stats.bossPhases.includes(1) && q.s.stats.bossPhases.includes(2)); assert.equal(q.s.assisted, false); assert.equal(q.s.dev.invulnerable, false); assert.equal(q.s.tuning.fireInterval, A.defaults(1).fireInterval); assert(q.s.stats.armor > 0);
});
fs.mkdirSync(new URL('../evidence/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../evidence/sim-tests.json', import.meta.url), JSON.stringify({ count, failures, campaigns: details }, null, 2));
for (const f of failures) console.error('FAIL ' + f.name + ': ' + f.error);
console.log(JSON.stringify({ suite: 'simulation', count, failed: failures.length }));
process.exitCode = failures.length ? 1 : 0;
