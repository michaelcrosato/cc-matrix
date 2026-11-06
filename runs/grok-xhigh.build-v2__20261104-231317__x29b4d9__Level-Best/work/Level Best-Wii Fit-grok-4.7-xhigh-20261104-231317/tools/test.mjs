import { unitTests } from '../test/unit.mjs';
import { balanceTests } from '../test/balance.mjs';
import { eventTests } from '../test/events.mjs';
import { flowTests } from '../test/flow.mjs';
import { inputTests } from '../test/input.mjs';

const groups = {
  unit: unitTests,
  balance: balanceTests,
  events: eventTests,
  flow: flowTests,
  input: inputTests,
};

const asked = process.argv.slice(2);
const names = asked.length === 0 || asked.includes('full')
  ? ['unit', 'balance', 'events', 'flow', 'input', 'audio', 'hub', 'ui']
  : asked;

let passed = 0;
let failed = 0;

for (const name of names) {
  if (name === 'audio' || name === 'hub' || name === 'ui') {
    const mod = await import('../test/browser.mjs');
    const tests = await mod[`${name}Tests`]();
    for (const [title, fn] of tests) {
      try {
        await fn();
        passed += 1;
      } catch (err) {
        failed += 1;
        console.log(`${name}: ${title}: ${err && err.stack ? err.stack : err}`);
      }
    }
    continue;
  }
  const load = groups[name];
  if (!load) {
    failed += 1;
    console.log(`unknown group ${name}`);
    continue;
  }
  const tests = await load();
  for (const [title, fn] of tests) {
    try {
      await fn();
      passed += 1;
    } catch (err) {
      failed += 1;
      console.log(`${name}: ${title}: ${err && err.stack ? err.stack : err}`);
    }
  }
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
