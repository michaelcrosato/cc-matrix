import { ARENA, CAR } from './constants.js';
import { createPads, kickoffSpawns, teamNames } from './arena.js';
import { createBall, detectScorer, resolveBallArena, stepBall } from './ball.js';
import { aiActions } from './ai.js';
import { createMatch, isFrozen, onGoal, stepMatch } from './match.js';
import { applyBoostPad, createCar, resolveCarBall, resolveCarContact, stepCar } from './vehicle.js';

export function createWorld({ mode = '1v1', duration = 150, humans = 1, attract = false, roster = null } = {}) {
  const teamSize = mode === '2v2' ? 2 : 1;
  const spawns = kickoffSpawns(teamSize);
  const cars = spawns.map((spawn, i) => {
    const fromRoster = roster ? roster[i] : null;
    const teamIndex = spawns.slice(0, i).filter((s) => s.team === spawn.team).length;
    const human = fromRoster ? fromRoster.kind !== 'ai' && fromRoster.human !== false : i < humans;
    return createCar({
      id: fromRoster?.id ?? `car${i}`,
      team: spawn.team,
      name: fromRoster?.name ?? (human ? `PLAYER ${i + 1}` : teamNames(spawn.team, teamIndex)),
      human,
      pos: { x: spawn.x, y: spawn.y, z: spawn.z },
      yaw: spawn.yaw,
    });
  });
  return {
    mode,
    teamSize,
    attract: !!attract,
    time: 0,
    cars,
    ball: createBall(),
    pads: createPads(),
    match: createMatch(duration),
    events: [],
    goalLatch: false,
    cheatPulse: 0,
  };
}

export function resetPositions(world) {
  const spawns = kickoffSpawns(world.teamSize);
  world.cars.forEach((car, i) => {
    const spawn = spawns[i];
    car.pos.x = spawn.x;
    car.pos.y = spawn.y;
    car.pos.z = spawn.z;
    car.spawn.x = spawn.x;
    car.spawn.y = spawn.y;
    car.spawn.z = spawn.z;
    car.spawnYaw = spawn.yaw;
    car.yaw = spawn.yaw;
    car.pitch = 0;
    car.roll = 0;
    car.vel.x = 0;
    car.vel.y = 0;
    car.vel.z = 0;
    car.demolished = false;
    car.respawnTimer = 0;
    car.canDodge = false;
    car.dodgeTimer = 0;
    car.jumpLatch = false;
    car.driveState = 'ground';
    car.driving = true;
    car.supersonic = false;
  });
  world.ball.pos.x = 0;
  world.ball.pos.y = 1.2;
  world.ball.pos.z = 0;
  world.ball.vel.x = 0;
  world.ball.vel.y = 0;
  world.ball.vel.z = 0;
  world.goalLatch = false;
}

function stepPads(world, dt) {
  for (const pad of world.pads) {
    if (!pad.ready) {
      pad.timer -= dt;
      if (pad.timer <= 0) pad.ready = true;
      continue;
    }
    for (const car of world.cars) {
      if (car.demolished) continue;
      const dx = car.pos.x - pad.x;
      const dz = car.pos.z - pad.z;
      if (dx * dx + dz * dz > pad.r * pad.r) continue;
      if (Math.abs(car.pos.y - CAR.half.y) > 3) continue;
      const before = car.boost;
      applyBoostPad(car, pad.kind);
      pad.ready = false;
      pad.timer = pad.kind === 'big' ? 10 : 4;
      if (car.boost > before) world.events.push({ type: 'pad', kind: pad.kind, id: car.id });
    }
  }
}

function attractCheat(world, dt) {
  if (!world.attract) return;
  world.cheatPulse -= dt;
  if (world.cheatPulse > 0) return;
  world.cheatPulse = 3.5;
  const blueScores = Math.floor(world.time / 3.5) % 2 === 0;
  world.ball.vel.x = Math.sin(world.time * 1.7) * 6;
  world.ball.vel.y = 9;
  world.ball.vel.z = blueScores ? 30 : -30;
  world.events.push({ type: 'hit' });
}

export function stepWorld(world, inputsById = {}, dt = 1 / 60, surfacesById = null) {
  world.events = [];
  const slices = Math.max(1, Math.min(4, Math.round(dt / (1 / 60)) || 1));
  const h = dt / slices;
  // One sample covers the frame. A jump leaves that surface on the first slice.
  const surfaces = surfacesById ? { ...surfacesById } : null;
  const jumped = new Set();
  const dodged = new Set();
  const boosted = new Set();
  for (let i = 0; i < slices; i += 1) {
    stepWorldOnce(world, inputsById, h, surfaces);
    for (const car of world.cars) {
      if (car.didJump) jumped.add(car);
      if (car.didDodge) dodged.add(car);
      if (car.didBoost) boosted.add(car);
      if (
        surfaces &&
        (car.driveState === 'air' || car.didJump) &&
        Object.prototype.hasOwnProperty.call(surfaces, car.id)
      ) {
        surfaces[car.id] = null;
      }
    }
  }
  for (const car of jumped) car.didJump = true;
  for (const car of dodged) car.didDodge = true;
  for (const car of boosted) car.didBoost = true;
  return world;
}

function stepWorldOnce(world, inputsById, dt, surfacesById) {
  const prev = world.match.phase;
  world.time += dt;
  const frozen = isFrozen(world.match);

  if (!frozen) {
    stepPads(world, dt);
    attractCheat(world, dt);
    for (const car of world.cars) {
      let input = inputsById[car.id];
      if (!input) input = car.human && !world.attract ? {} : aiActions(car, world, world.attract);
      const contacts = surfacesById && Object.prototype.hasOwnProperty.call(surfacesById, car.id)
        ? { surfaceNormal: surfacesById[car.id] }
        : undefined;
      stepCar(car, input, dt, contacts);
      if (car.didJump) world.events.push({ type: 'jump', id: car.id });
      if (car.didDodge) world.events.push({ type: 'dodge', id: car.id });
      if (car.didBoost) world.events.push({ type: 'boost', id: car.id });
    }
    for (let i = 0; i < world.cars.length; i += 1) {
      for (let j = i + 1; j < world.cars.length; j += 1) {
        const victims = resolveCarContact(world.cars[i], world.cars[j]);
        if (victims) {
          for (const v of victims) world.events.push({ type: 'demo', id: v.id });
        }
      }
    }
    stepBall(world.ball, dt, ARENA);
    for (const car of world.cars) {
      if (resolveCarBall(car, world.ball)) world.events.push({ type: 'hit', id: car.id });
    }
    resolveBallArena(world.ball, ARENA);
    if (!world.goalLatch) {
      const scorer = detectScorer(world.ball, ARENA);
      if (scorer) {
        onGoal(world.match, scorer);
        world.goalLatch = true;
        world.events.push({ type: 'goal', team: scorer });
      }
    }
  } else {
    for (const car of world.cars) {
      if (car.demolished) stepCar(car, {}, dt, { surfaceNormal: { x: 0, y: 1, z: 0 } });
    }
  }

  stepMatch(world.match, dt);
  if (world.match.phase === 'kickoff') world.goalLatch = false;
  if (world.match.phase === 'kickoff' && prev === 'goal') {
    resetPositions(world);
    world.events.push({ type: 'kickoff' });
  }
  if (world.match.phase === 'overtime' && prev !== 'overtime') {
    resetPositions(world);
    world.events.push({ type: 'overtime' });
  }
  if (world.match.phase === 'ended' && prev !== 'ended') {
    world.events.push({ type: 'end', winner: world.match.winner });
  }
  return world;
}
