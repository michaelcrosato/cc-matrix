import { eventById, eventIds } from '../src/events/index.js';
import { initRapier } from '../src/physics/world.js';
import { resetTuning, getTune } from '../src/core/tuning.js';
import { readLean } from '../src/physics/balancer.js';
import { assert, playBot, DT } from './lib.mjs';

async function disposeTwice(id) {
  await initRapier();
  const Ctor = eventById(id);
  const first = new Ctor({ tier: 1, seed: 1 });
  first.build();
  const before = first.world.bodies.len();
  first.states[0].fallen = true;
  first.states[0].falls = 1;
  first.states[0].recoverLeft = getTune('recoverTime');
  first.beginFall(0);
  const spiked = first.world.bodies.len();
  assert(spiked > before, `${id} ragdoll did not spawn (${before} to ${spiked})`);
  let steps = 0;
  while (first.states[0].fallen && steps < 120 * 6) {
    first.fixed(DT, [{ wishX: 0, wishZ: 0, feetL: 0, feetR: 0 }]);
    steps += 1;
  }
  assert(!first.states[0].fallen, `${id} did not recover`);
  assert(first.states[0].falls === 1, `${id} refell during recovery`);
  assert(first.rags[0] === null, `${id} ragdoll left behind`);
  const lean = readLean(first.dolls[0].body);
  assert(Number.isFinite(lean.tilt), `${id} NaN after recovery`);
  assert(first.world.bodies.len() < spiked, `${id} bodies ${first.world.bodies.len()} vs spiked ${spiked}`);
  first.dispose();
  assert(first.world === null, `${id} world leaked`);
  const second = new Ctor({ tier: 1, seed: 2 });
  second.build();
  second.fixed(DT, [{ wishX: 0.2, wishZ: -0.1 }]);
  const again = readLean(second.dolls[0].body);
  assert(Number.isFinite(again.tilt), `${id} second world NaN`);
  second.dispose();
  assert(second.world === null, `${id} second world leaked`);
}

export async function eventTests() {
  const tests = [];
  for (const id of eventIds()) {
    for (const tier of [1, 2, 3]) {
      tests.push([`${id} tier ${tier} sharp`, async () => {
        resetTuning();
        const { state } = await playBot(id, { tier, skill: 'sharp', seed: 1 });
        assert(state.screen === 'results', `${id} ended on ${state.screen}`);
        assert(Number.isFinite(state.last.form), `${id} form`);
        assert(state.last.form >= 0 && state.last.form <= 100, `${id} form ${state.last.form}`);
        assert(state.errors.length === 0, state.errors.join(';'));
      }]);
    }
    tests.push([`${id} ragdoll recovers and dispose is clean`, () => disposeTwice(id)]);
  }
  return tests;
}
