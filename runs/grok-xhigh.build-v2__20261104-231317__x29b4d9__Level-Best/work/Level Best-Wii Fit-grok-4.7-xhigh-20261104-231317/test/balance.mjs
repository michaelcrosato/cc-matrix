import { initRapier, makeWorld, addGround, createDollBody, freeWorld, dollGroups, RAPIER } from '../src/physics/world.js';
import {
  freshBalance, balanceStep, checkFall, resetCore, pressFlail, tickTimers, tuneFrom, readLean, DEG,
} from '../src/physics/balancer.js';
import { getTune, resetTuning } from '../src/core/tuning.js';
import { spawnRagdoll, removeRagdoll } from '../src/physics/ragdoll.js';
import { bodyCount } from '../src/physics/world.js';
import { assert, playBot, fresh, DT } from './lib.mjs';
import { eventIds } from '../src/events/index.js';

function liveTune() {
  resetTuning();
  return tuneFrom({
    maxLean: getTune('maxLean'),
    margin: getTune('margin'),
    zeta: getTune('zeta'),
    ankleMax: getTune('ankleMax'),
    reflex: getTune('reflex'),
    flailBoost: getTune('flailBoost'),
    fallAngle: getTune('fallAngle'),
    recoverTime: getTune('recoverTime'),
    swayScale: getTune('swayScale'),
  });
}

function rig(mass = 0, massY = 1.3) {
  const world = makeWorld(8);
  addGround(world);
  const doll = createDollBody(world, 0, 0, 0);
  if (mass > 0) {
    world.createCollider(
      RAPIER.ColliderDesc.ball(0.06).setMass(mass).setTranslation(0, massY, 0).setCollisionGroups(dollGroups(0)),
      doll.body,
    );
  }
  return { world, doll, state: freshBalance(), tune: liveTune() };
}

async function runCore(opts) {
  await initRapier();
  const { world, doll, state, tune } = rig(opts.mass || 0, opts.massY ?? 1.3);
  let peak = 0;
  let fired = false;
  const seconds = opts.seconds ?? 6;
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    const t = i * DT;
    tickTimers(state, DT);
    state.wishX = opts.wishX || 0;
    state.wishZ = opts.wishZ || 0;
    const lean = readLean(doll.body);
    const deg = lean.tilt / DEG;
    if (opts.flailAt != null && !fired && opts.flailAt(t, deg)) {
      fired = pressFlail(state, getTune('flailCooldown'));
    }
    const nx = opts.gust && t >= opts.gust[0] && t < opts.gust[1] ? opts.gust[2] : 0;
    balanceStep(doll.body, state, DT, tune, nx, 0);
    world.step();
    checkFall(doll.body, state, tune, false);
    peak = Math.max(peak, readLean(doll.body).tilt);
    if (opts.stopOnFall && state.fallen) break;
  }
  const end = readLean(doll.body);
  const out = {
    falls: state.falls,
    peak: peak / DEG,
    end: end.tilt / DEG,
    leanX: end.leanX / DEG,
    fired,
    finite: Number.isFinite(end.leanX) && Number.isFinite(end.tilt),
  };
  freeWorld(world);
  return out;
}

async function recovery() {
  await initRapier();
  const { world, doll, state, tune } = rig();
  const before = bodyCount(world);
  const n = Math.round(2 / DT);
  for (let i = 0; i < n && !state.fallen; i++) {
    const t = i * DT;
    tickTimers(state, DT);
    balanceStep(doll.body, state, DT, tune, t < 0.6 ? 6 : 0, 0);
    world.step();
    checkFall(doll.body, state, tune, false);
  }
  assert(state.fallen && state.falls === 1, `expected one fall, got ${state.falls}`);
  const rag = spawnRagdoll(world, doll);
  doll.body.setEnabled(false);
  const recoverSteps = Math.ceil(tune.recoverTime / DT);
  for (let i = 0; i < recoverSteps; i++) {
    tickTimers(state, DT);
    world.step();
  }
  removeRagdoll(world, rag);
  resetCore(doll, state);
  for (let i = 0; i < Math.round(2 / DT); i++) {
    tickTimers(state, DT);
    balanceStep(doll.body, state, DT, tune, 0, 0);
    world.step();
    checkFall(doll.body, state, tune, false);
  }
  assert(state.falls === 1, `recovery fell again (${state.falls})`);
  const lean = readLean(doll.body);
  assert(Number.isFinite(lean.tilt) && lean.tilt / DEG < 5, `lean ${lean.tilt / DEG}`);
  assert(bodyCount(world) === before, `bodies ${bodyCount(world)} vs ${before}`);
  freeWorld(world);
}

export async function balanceTests() {
  const tests = [];
  const add = (name, fn) => tests.push([name, fn]);

  add('full stick settles near max lean', async () => {
    const r = await runCore({ wishX: 1, seconds: 8 });
    assert(r.falls === 0, `full stick fell (${r.peak.toFixed(1)}°)`);
    assert(r.peak > 20 && r.peak < 28, `overshoot ${r.peak.toFixed(2)}°`);
    assert(Math.abs(r.end - 18) < 2, `settled at ${r.end.toFixed(2)}°`);
    assert(r.finite, 'lean not finite');
  });

  add('early flail loses to a 3.5 N·m gust', async () => {
    const r = await runCore({
      seconds: 4,
      gust: [0.3, 0.8, 3.5],
      flailAt: (t) => t >= 0.05 && t < 0.2,
      stopOnFall: true,
    });
    assert(r.fired, 'flail did not fire');
    assert(r.falls >= 1, 'early flail should fall');
  });

  add('flail as the lean crosses the low thirties saves the gust', async () => {
    const r = await runCore({
      seconds: 5,
      gust: [0.3, 0.8, 3.5],
      flailAt: (t, deg) => t > 0.8 && deg >= 32,
    });
    assert(r.fired, 'timed flail did not fire');
    assert(r.falls === 0, `timed flail fell at peak ${r.peak.toFixed(1)}°`);
    assert(r.peak < 45, `peak ${r.peak.toFixed(1)}°`);
  });

  add('a second flail during cooldown is refused', async () => {
    const state = freshBalance();
    assert(pressFlail(state, 2) === true, 'first flail');
    assert(pressFlail(state, 2) === false, 'cooldown flail');
  });

  add('extra mass tips more easily', async () => {
    const light = await runCore({ seconds: 3, gust: [0.2, 0.7, 2] });
    const hat = await runCore({ seconds: 3, gust: [0.2, 0.7, 2], mass: 0.05, massY: 1.3 });
    const heavy = await runCore({ seconds: 3, gust: [0.2, 0.7, 2], mass: 0.2, massY: 1.15, stopOnFall: true });
    assert(light.falls === 0, 'unloaded gust fell');
    assert(hat.falls === 0, 'small hat fell');
    assert(hat.peak > light.peak + 0.4, `hat peak ${hat.peak.toFixed(2)} vs ${light.peak.toFixed(2)}`);
    assert(heavy.falls >= 1, 'heavy hat should fall');
  });

  add('positive disturbance leans toward +x', async () => {
    const r = await runCore({ seconds: 1.2, gust: [0.1, 0.6, 2] });
    assert(r.leanX > 1, `leanX ${r.leanX.toFixed(2)}`);
  });

  add('ragdoll recovers once', recovery);

  add('a parked stick stays under Exemplary in Poses', async () => {
    const { state } = await playBot('poses', { opt: { parked: true } });
    assert(state.screen === 'results', state.screen);
    const form = state.profile.best.poses[1];
    assert(form < 85, `parked form ${form}`);
    assert(form > 40, `parked form ${form} should still attend`);
  });

  add('Fruit Hat banks at seven and spills if it never banks', async () => {
    const banked = await playBot('fruitHat', { opt: { bankAt: 7 } });
    const result = banked.game.profile;
    assert(banked.state.screen === 'results', banked.state.screen);
    const form = result.best.fruitHat[1];
    assert(form >= 65, `banked form ${form}`);
    const never = await playBot('fruitHat', { opt: { bankAt: Infinity } });
    assert(never.state.screen === 'results', never.state.screen);
    assert(never.state.last.banked === 0, `banked ${never.state.last.banked}`);
    assert(never.state.last.falls >= 1, `spills ${never.state.last.falls}`);
  });

  add('Plate Spinners separate sharp and clumsy on stick and keys', async () => {
    const runs = {};
    for (const keys of [false, true]) {
      for (const skill of ['sharp', 'clumsy']) {
        const { state } = await playBot('plates', { skill, opt: { keys } });
        runs[`${skill}-${keys}`] = state.last.share;
      }
    }
    for (const keys of [false, true]) {
      const gap = runs[`sharp-${keys}`] - runs[`clumsy-${keys}`];
      assert(gap >= 0.15, `plate share gap ${keys ? 'keys' : 'stick'} ${gap.toFixed(3)} (${runs[`sharp-${keys}`].toFixed(3)} vs ${runs[`clumsy-${keys}`].toFixed(3)})`);
    }
  });

  add('breath-synced cairn holds more stones than an unsynced one', async () => {
    const synced = await playBot('cairn', { tier: 2, opt: {} });
    const quiet = await playBot('cairn', { tier: 2, opt: { breath: false } });
    const a = synced.state.last.stones;
    const b = quiet.state.last.stones;
    assert(a > b, `synced stones ${a} vs quiet ${b}`);
  });

  add('Log Reps rewards the sharp bot and not the clumsy one', async () => {
    const sharp = await playBot('logReps', { skill: 'sharp' });
    const clumsy = await playBot('logReps', { skill: 'clumsy' });
    assert(sharp.state.profile.best.logReps[1] >= 85, `sharp log ${sharp.state.profile.best.logReps[1]}`);
    assert(clumsy.state.profile.best.logReps[1] < 70, `clumsy log ${clumsy.state.profile.best.logReps[1]}`);
  });

  add('Room Service delivers five glasses when it braces', async () => {
    const braced = await playBot('roomService', { opt: { brace: true } });
    const loose = await playBot('roomService', { opt: { brace: false } });
    assert(braced.state.last.glasses === 5, `braced ${braced.state.last.stats}`);
    assert(loose.state.last.glasses < 5, `loose ${loose.state.last.stats}`);
  });

  add('Tippy Raft rounds end and name a winner', async () => {
    const { state } = await playBot('raft');
    assert(state.screen === 'results', state.screen);
    assert(state.last.roundTimes.length >= 1, 'no rounds');
    assert(state.last.roundTimes.every((t) => t < 90), `rounds ${state.last.roundTimes.join(',')}`);
    assert(Number.isFinite(state.winner), `winner ${state.winner}`);
  });

  add('sharp, average and clumsy Tier 1 across three seeds', async () => {
    const skills = ['sharp', 'average', 'clumsy'];
    const totals = {};
    for (const id of eventIds()) totals[id] = { sharp: [], average: [], clumsy: [] };
    for (const seed of [1, 2, 3]) {
      for (const skill of skills) {
        for (const id of eventIds()) {
          const { state } = await playBot(id, { skill, seed });
          const form = state.profile.best[id][1];
          assert(Number.isFinite(form), `${id} ${skill} seed ${seed} form`);
          totals[id][skill].push(form);
        }
      }
    }
    const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;
    for (const id of eventIds()) {
      const sharp = mean(totals[id].sharp);
      const average = mean(totals[id].average);
      const clumsy = mean(totals[id].clumsy);
      assert(sharp >= 85, `${id} sharp average ${sharp.toFixed(1)}`);
      assert(average >= 40, `${id} average ${average.toFixed(1)}`);
      assert(clumsy >= 40, `${id} clumsy ${clumsy.toFixed(1)}`);
    }
  });

  return tests;
}

void initRapier;
void fresh;
