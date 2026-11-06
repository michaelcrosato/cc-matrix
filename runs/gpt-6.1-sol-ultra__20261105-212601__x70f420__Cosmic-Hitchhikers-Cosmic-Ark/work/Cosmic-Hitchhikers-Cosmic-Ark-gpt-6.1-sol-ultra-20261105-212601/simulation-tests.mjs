import RAPIER from '@dimforge/rapier3d-compat';
import { DEFAULTS, GameSimulation, PLANETS } from './simulation.js';

const DT = 1 / 60;
const assert = (value, message) => { if (!value) throw new Error(message); };
const near = (a, b, epsilon = 0.025) => Math.abs(a - b) <= epsilon;
const seeded = (seed = 1982) => () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
const advance = (sim, seconds, input = {}) => {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) sim.step(DT, typeof input === 'function' ? input(sim) : input);
};

/** Returns results without printing. Pass an initialized Rapier namespace to reuse it. */
export async function runSimulationTests(rapier = null) {
  const R = rapier || RAPIER;
  if (!rapier) {
    // Rapier 0.19.3's compat wrapper emits this warning from its own wasm loader.
    const warn = console.warn;
    console.warn = (...args) => { if (!String(args[0]).includes('using deprecated parameters for the initialization function')) warn(...args); };
    try { await R.init(); } finally { console.warn = warn; }
  }
  const results = [];
  const test = (name, fn) => {
    const sim = new GameSimulation(R, { rng: seeded() });
    try {
      const details = fn(sim);
      results.push({ name, passed: true, ...(details ? { details } : {}) });
    } catch (error) {
      results.push({ name, passed: false, error: String(error.message || error) });
    } finally { sim.dispose(); }
  };

  test('initial mission state and native physics world', sim => {
    assert(sim.world instanceof R.World, 'Simulation must own a Rapier world');
    assert(near(sim.world.timestep, DT, 0.000001), 'Physics timestep must be 1/60');
    assert(sim.state.phase === 'defense' && sim.state.planet === 0, 'Mission must start in first defense');
    assert(sim.state.fuel === 100 && sim.state.creatures.length === 2, 'Initial fuel/pair incorrect');
    assert(PLANETS.length === 3, 'Vertical slice must have three planets');
  });

  test('Rapier projectile collision destroys meteor and scores', sim => {
    sim.spawnTimer = 999;
    const meteor = sim.moving('meteor', { x: 0, y: 7, r: 0.55, hp: 1, age: 0, vx: 0, vy: 0 }, 0, 0, 2, 1 | 4);
    sim.state.meteors.push(meteor);
    sim.fire({ x: 0, y: 1 });
    advance(sim, 0.3);
    assert(meteor.dead && !sim.state.meteors.length, 'Rapier sensor collision did not destroy meteor');
    assert(sim.state.hits === 1 && sim.state.score === 30, 'Projectile kill must award score/hit');
    assert(sim.state.shots === 1, 'Shot count incorrect');
  });

  test('Rapier meteor collision damages ark', sim => {
    sim.spawnTimer = 999;
    const meteor = sim.moving('meteor', { x: 4, y: 0, r: 0.55, hp: 1, age: 0, vx: -5, vy: 0 }, -5, 0, 2, 1 | 4);
    sim.state.meteors.push(meteor);
    advance(sim, 0.5);
    assert(meteor.dead, 'Meteor contact did not remove native body');
    assert(sim.state.damageTaken === 15 && sim.state.fuel < 86, 'Ark contact must cost 15 fuel');
    assert(sim.state.invulnerable > 0, 'Damage must grant a brief invulnerability window');
  });

  test('armored meteors require two real projectile collisions', sim => {
    sim.spawnTimer = 999;
    const meteor = sim.moving('meteor', { x: 0, y: 7, r: 0.77, hp: 2, armored: true, age: 0, vx: 0, vy: 0 }, 0, 0, 2, 1 | 4);
    sim.state.meteors.push(meteor);
    sim.fire({ x: 0, y: 1 });
    advance(sim, 0.25);
    assert(meteor.hp === 1 && !meteor.dead, 'First shot must crack armor without killing');
    sim.fire({ x: 0, y: 1 });
    advance(sim, 0.25);
    assert(meteor.dead && sim.state.score === 90, 'Second shot must destroy armor and score 90');
  });

  test('wavering meteors use changing native velocity', sim => {
    sim.state.planet = 1;
    sim.rng = () => 0.1;
    sim.spawnTimer = 999;
    const meteor = sim.spawnMeteor(0);
    assert(meteor.waver, 'Second planet must permit wavering meteors');
    const initial = meteor._body.linvel();
    advance(sim, 0.4);
    const velocity = meteor._body.linvel();
    assert(Math.abs(velocity.y - initial.y) > 0.2, 'Waver must change perpendicular native velocity');
    assert(!near(meteor.x, -19), 'Native physics must move meteors');
    assert(sim.state.score === 0, 'Moving an unhit meteor must not award score');
  });

  test('pulse consumes fuel, clears threats and obeys live cooldown', sim => {
    sim.spawnTimer = 999;
    sim.params.pulseCooldown = 2;
    const meteor = sim.moving('meteor', { x: 5, y: 0, r: 0.55, hp: 1, age: 0, vx: 0, vy: 0 }, 0, 0, 2, 5);
    sim.state.meteors.push(meteor);
    assert(sim.pulse() && meteor.dead, 'Pulse must clear nearby meteor');
    assert(near(sim.state.fuel, 97) && sim.state.shield > 1, 'Pulse must consume fuel and provide shield');
    assert(!sim.pulse(), 'Pulse must not repeat during cooldown');
    assert(!sim.damage(15), 'Shield must prevent damage');
    advance(sim, 2.1);
    assert(sim.pulse(), 'Pulse must become available after live cooldown');
  });

  test('tractor beam requires alignment, time and a held beam', sim => {
    sim.setPhase('rescue');
    sim.hazardTimer = 999;
    const c = sim.state.creatures[0];
    sim.state.ship.x = c.x;
    sim.state.ship.y = -3.8;
    sim.step(DT, { beam: true });
    assert(c.progress > 0 && !c.captured, 'Beam must build capture progress');
    sim.step(DT, {});
    assert(c.progress === 0, 'Released beam must decay incomplete progress');
    advance(sim, 2.2, { beam: true });
    assert(c.captured && sim.state.cargo === 1, 'Aligned held beam must capture one creature');
    assert(sim.state.saved === 0, 'Cargo is not safe before docking');
  });

  test('docking banks pair and advances to transit', sim => {
    sim.setPhase('rescue');
    sim.hazardTimer = 999;
    sim.capture(sim.state.creatures[0]);
    sim.capture(sim.state.creatures[1]);
    sim.state.ship.x = 0;
    sim.state.ship.y = 4.5;
    sim.step(DT, {});
    assert(sim.state.saved === 2 && sim.state.cargo === 0, 'Dock must bank both creatures');
    assert(sim.state.phase === 'transit' && sim.state.docked[0] === 2, 'Complete pair must begin transit');
    advance(sim, 3.3);
    assert(sim.state.planet === 1 && sim.state.phase === 'defense', 'Transit must advance planet and defense');
    assert(sim.state.creatures.every(c => !c.saved && !c.captured), 'New planet must receive a fresh pair');
  });

  test('Rapier sentry collision drops one carried creature', sim => {
    sim.setPhase('rescue');
    sim.hazardTimer = 999;
    sim.state.ship.x = 0;
    sim.state.ship.y = -3.8;
    sim.capture(sim.state.creatures[0]);
    const hazard = sim.moving('hazard', { x: -4, y: -3.8, r: 0.32, age: 0 }, 12, 0, 16, 8);
    sim.state.hazards.push(hazard);
    advance(sim, 0.5);
    assert(hazard.dead, 'Sentry bolt must collide with shuttle');
    assert(sim.state.damageTaken === 12 && sim.state.cargo === 0, 'Shuttle contact must damage and drop cargo');
    assert(!sim.state.creatures[0].captured && !sim.state.creatures[0].saved, 'Dropped cargo must return to rescue pool');
  });

  test('timeout preserves banked cargo and drops undelivered cargo', sim => {
    sim.setPhase('rescue');
    sim.hazardTimer = 999;
    sim.capture(sim.state.creatures[0]);
    sim.state.ship.x = 0;
    sim.state.ship.y = 4.5;
    sim.step(DT, {});
    assert(sim.state.saved === 1 && sim.state.phase === 'rescue', 'Partial dock must bank one creature');
    sim.capture(sim.state.creatures[1]);
    sim.state.ship.x = 9;
    sim.state.ship.y = -4;
    sim.state.phaseTime = sim.params.rescueTime;
    sim.step(DT, {});
    assert(sim.state.phase === 'defense' && sim.recall, 'Timeout away from ark must recall into defense');
    assert(sim.state.saved === 1 && sim.state.creatures[0].saved, 'Timeout must retain already banked creature');
    assert(sim.state.cargo === 0 && !sim.state.creatures[1].captured, 'Timeout must drop undelivered cargo');
  });

  test('sentry warning cleanup is safe during phase changes', sim => {
    sim.setPhase('rescue');
    sim.spawnHazard();
    assert(sim.state.hazards[0].kind === 'warning', 'Sentry must telegraph before firing');
    sim.setPhase('defense');
    assert(sim.state.hazards.length === 0, 'Phase change must remove warning safely');
    assert(sim.lookup.size === 2, 'Warning cleanup must retain only ark/shuttle colliders');
  });

  test('pulse can safely remove a pending sentry warning', sim => {
    sim.setPhase('rescue');
    sim.state.ship.x = -12;
    sim.state.ship.y = -3;
    sim.rng = () => 0;
    sim.spawnHazard();
    assert(sim.pulse(), 'Pulse must work next to a pending sentry warning');
    assert(sim.state.hazards.length === 0, 'Pulse must clear nearby pending warning safely');
  });

  test('sentries telegraph then launch real moving physics bolts', sim => {
    sim.setPhase('rescue');
    sim.hazardTimer = 999;
    sim.state.ship.y = -4;
    sim.spawnHazard();
    advance(sim, 1);
    assert(sim.state.hazards.length === 1 && sim.state.hazards[0].kind === 'warning', 'Warning must remain visible before its delay');
    advance(sim, 0.4);
    const bolt = sim.state.hazards[0];
    assert(bolt.kind === 'hazard' && !!bolt._body, 'Warning must become a native hazard after delay');
    assert(Math.abs(bolt.x) < 15.7, 'Native hazard must move inward after firing');
  });

  test('live meteor speed and spawn-rate sliders affect the next spawn', sim => {
    sim.rng = () => 0.5;
    sim.params.meteorSpeed = 2;
    const meteor = sim.spawnMeteor(0);
    assert(near(Math.hypot(meteor.vx, meteor.vy), 5.2), 'Meteor speed multiplier must affect native initial velocity');
    sim.clearEntities();
    sim.params.spawnRate = 4;
    sim.spawnTimer = 0;
    sim.step(DT, {});
    assert(near(sim.spawnTimer, 0.4), 'Spawn-rate slider must affect next wave interval');
    advance(sim, 0.45);
    assert(sim.state.meteors.length === 2, 'Faster spawn rate must produce another meteor');
  });

  test('live rescue timer warns and recalls without resetting prior saves', sim => {
    const events = [];
    sim.onEvent = e => events.push(e.type);
    sim.setPhase('rescue');
    sim.hazardTimer = 999;
    sim.params.rescueTime = 0.2;
    sim.step(DT);
    assert(sim.state.warning && events.includes('warning'), 'Shortened live timer must trigger recall warning');
    advance(sim, 0.25);
    assert(sim.state.phase === 'defense' && events.includes('recall'), 'Live rescue timer must trigger actual recall');
    assert(sim.state.saved === 0 && sim.state.cargo === 0, 'Empty recall must not invent saved cargo');
  });

  test('live balancing parameters change motion capture damage and fuel', sim => {
    sim.setPhase('rescue');
    sim.hazardTimer = 999;
    sim.params.shipSpeed = 4;
    advance(sim, 0.6, { x: 1 });
    const slowVelocity = sim.state.ship.vx;
    sim.params.shipSpeed = 12;
    advance(sim, 0.6, { x: 1 });
    assert(sim.state.ship.vx > slowVelocity * 2.5, 'Live ship-speed slider must affect velocity');
    sim.params.damage = 2;
    sim.damage(5);
    assert(sim.state.damageTaken === 10, 'Live damage multiplier must apply');
    sim.state.invulnerable = 0;
    sim.params.fuelDrain = 4;
    const fuel = sim.state.fuel;
    advance(sim, 1);
    assert(near(fuel - sim.state.fuel, 0.48), 'Live fuel drain must apply');
    Object.assign(sim.params, DEFAULTS);
    assert(Object.keys(DEFAULTS).every(k => sim.params[k] === DEFAULTS[k]), 'Restoring defaults must restore every balancing value');
    sim.params.beamRate = 3;
    const c = sim.state.creatures[0];
    sim.state.ship.x = c.x;
    sim.state.ship.y = -3.8;
    sim.state.ship.vx = sim.state.ship.vy = 0;
    advance(sim, 0.7, { beam: true });
    assert(c.captured, 'Live beam rate must accelerate capture');
  });

  test('defeat freezes gameplay and reset creates a clean mission', sim => {
    sim.state.fuel = 0.001;
    sim.step(DT, { fire: true, aimX: 1 });
    assert(sim.state.phase === 'lose' && sim.state.ending, 'Zero fuel must end mission');
    const time = sim.state.time;
    sim.step(DT, {});
    assert(sim.state.time === time, 'Ended mission must stop advancing');
    sim.reset();
    assert(sim.state.phase === 'defense' && !sim.state.ending && sim.state.fuel === 100, 'Reset must restore mission');
    assert(sim.state.saved === 0 && sim.state.score === 0 && sim.lookup.size === 2, 'Reset must clear mission progress and old physics');
  });

  test('snapshots are serializable independent public state', sim => {
    sim.spawnMeteor(0);
    const snapshot = sim.snapshot();
    assert(!JSON.stringify(snapshot).includes('_body'), 'Snapshot must omit Rapier objects');
    assert(snapshot.meteors.length === 1 && Number.isFinite(snapshot.meteors[0].x), 'Snapshot must retain visible entities');
    snapshot.fuel = 1;
    assert(sim.state.fuel === 100, 'Remote snapshot must not mutate host state');
  });

  test('complete attract autopilot rescues three pairs and wins escape', sim => {
    sim.auto = true;
    sim.god = true;
    const phases = new Set();
    for (let i = 0; i < 60 * 400 && !sim.state.ending; i++) {
      phases.add(`${sim.state.planet}:${sim.state.phase}`);
      sim.step(DT);
    }
    assert(sim.state.phase === 'win', `Autopilot did not finish: ${sim.state.phase}, saved ${sim.state.saved}, time ${sim.state.time.toFixed(1)}`);
    assert(sim.state.saved === 6 && sim.state.docked.every(n => n === 2), 'Complete campaign must bank all three pairs');
    assert([0, 1, 2].every(n => phases.has(`${n}:defense`) && phases.has(`${n}:rescue`) && phases.has(`${n}:transit`)), 'Campaign must visit every defense rescue and transit');
    assert(phases.has('2:escape') && sim.state.hits > 0 && sim.state.shots > 0, 'Campaign must play final escape and meteor combat');
    return { duration: sim.state.time, saved: sim.state.saved, score: sim.state.score, hits: sim.state.hits };
  });

  test('uncheated autopilot can complete default campaign', sim => {
    sim.auto = true;
    for (let i = 0; i < 60 * 400 && !sim.state.ending; i++) sim.step(DT);
    assert(sim.state.phase === 'win', `Default balance autopilot ended ${sim.state.phase}, fuel ${sim.state.fuel.toFixed(1)}, saved ${sim.state.saved}, damage ${sim.state.damageTaken}`);
    return { duration: sim.state.time, fuel: sim.state.fuel, damage: sim.state.damageTaken, score: sim.state.score };
  });

  return results;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  const results = await runSimulationTests();
  for (const result of results) if (!result.passed) console.error(`FAIL ${result.name}: ${result.error}`);
  const failures = results.filter(result => !result.passed).length;
  console.log(`${results.length - failures}/${results.length} simulation checks passed`);
  if (failures) process.exitCode = 1;
}
