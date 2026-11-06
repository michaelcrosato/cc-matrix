import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { ACTIVITIES, activityForDay } from '../src/data/activities.js';
import { Dot, DEFAULT_TUNABLES } from '../src/core/dot.js';
import { ActivitySession, makeProfile, wobbleAge } from '../src/core/session.js';
import { MEDLEY_SECONDS, medleyWindow, pickMedley } from '../src/data/medley.js';

let passed = 0;
const failures = [];
function test(name, check) {
  try { check(); passed++; } catch (error) { failures.push(`${name}: ${error.stack || error}`); }
}

test('activity catalog and unlocks', () => {
  assert.equal(ACTIVITIES.length, 16);
  assert.equal(new Set(ACTIVITIES.map(activity => activity.id)).size, 16);
  assert.equal(activityForDay(1).length, 4);
  assert.equal(activityForDay(5).length, 16);
  assert.equal(activityForDay(7).length, 16);
});

test('dot stays finite and bounded', () => {
  const first = new Dot(() => .25), second = new Dot(() => .25);
  for (let index = 0; index < 5000; index++) {
    first.step(.05, Math.sin(index), Math.cos(index), DEFAULT_TUNABLES);
    second.step(.05, Math.sin(index), Math.cos(index), DEFAULT_TUNABLES);
    assert.ok(Number.isFinite(first.x) && Number.isFinite(first.y));
    assert.ok(Math.hypot(first.x, first.y) <= 1.20000001);
  }
  assert.deepEqual(first, second);
});

test('wobble age reveal corrects seven years', () => {
  const profile = makeProfile('MABEL');
  profile.history = [.6, .7, .8];
  profile.stars = 8;
  const before = wobbleAge(profile);
  profile.revealed = true;
  assert.equal(before - wobbleAge(profile), 7);
});

for (const activity of ACTIVITIES) {
  test(`${activity.id} completes with valid score`, () => {
    const session = new ActivitySession(activity, { random: () => .25 });
    for (let frame = 0; !session.finished && frame < 2000; frame++) {
      const angle = frame * .4;
      session.update(.05, { x: Math.cos(angle), y: Math.sin(angle), breath: frame % 40 < 20, left: frame % 14 === 0, right: frame % 14 === 7 });
    }
    assert.equal(session.finished, true);
    assert.ok(session.result().score >= 0 && session.result().score <= 100);
    assert.ok(session.result().stars >= 0 && session.result().stars <= 3);
    const elapsed = session.elapsed;
    session.update(.05, {});
    assert.equal(session.elapsed, elapsed);
  });
}

test('live time tuning changes simulation speed', () => {
  const normal = new ActivitySession(ACTIVITIES[0], { random: () => 0 });
  const fast = new ActivitySession(ACTIVITIES[0], { random: () => 0, tuning: { timeScale: 2 } });
  normal.update(.02); fast.update(.02);
  assert.equal(fast.elapsed, normal.elapsed * 2);
});

test('online medley choices and shared-clock windows', () => {
  assert.deepEqual(pickMedley(() => 0), ['tree', 'squats', 'header']);
  assert.deepEqual(pickMedley(() => .999), ['warrior', 'step', 'header']);
  assert.deepEqual(medleyWindow(-3000), { phase: 'countdown', index: 0, remaining: 3 });
  assert.deepEqual(medleyWindow(0), { phase: 'event', index: 0, remaining: 55 });
  assert.deepEqual(medleyWindow(55000), { phase: 'break', index: 0, remaining: 10 });
  assert.deepEqual(medleyWindow(65000), { phase: 'event', index: 1, remaining: 55 });
  assert.deepEqual(medleyWindow(120000), { phase: 'break', index: 1, remaining: 10 });
  assert.deepEqual(medleyWindow(130000), { phase: 'event', index: 2, remaining: 55 });
  assert.equal(MEDLEY_SECONDS, 185);
  assert.equal(medleyWindow(185000).phase, 'finished');
});

const browser = spawnSync('python3', ['tests/browser.py'], { encoding: 'utf8', env: process.env, timeout: 180000 });
if (browser.error || browser.status !== 0) {
  failures.push(`browser runner: ${browser.error?.message || browser.stderr || browser.stdout || `exit ${browser.status}`}`);
} else {
  try {
    const report = JSON.parse(browser.stdout);
    passed += report.passed;
    failures.push(...report.failures);
  } catch (error) { failures.push(`browser report: ${error.message}\n${browser.stdout}\n${browser.stderr}`); }
}
for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
