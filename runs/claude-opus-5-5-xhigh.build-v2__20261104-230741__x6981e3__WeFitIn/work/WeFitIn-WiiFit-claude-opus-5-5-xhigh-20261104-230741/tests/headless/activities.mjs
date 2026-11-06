// 4 Every activity: idle 0 stars, expert 2+, sloppy under expert, result written, Drips correct. 10 Determinism.
import { assert, boot, done, eq, makeScene, test, App } from '../lib.mjs';
import { ACTIVITIES, ACTIVITY_IDS } from '../../src/data/activities.js';
import { dripsFor } from '../../src/core/week.js';
import { BOARDS } from '../../src/data/boards.js';

const h = await boot({ scene: 'title' });
const EASY = new Set(['tree', 'heron', 'squats', 'lunges', 'hoop', 'step', 'header']);

async function play(id, skill, extra = {}) {
  await h.go('activity', { id, mode: 'dropin', noPractice: true, ...extra });
  App.dev.autopilot = skill;
  await h.until(() => App.scene.resultsShown, { what: `${id} ${skill}`, max: 60 * 200, every: 60 });
  App.dev.autopilot = null;
  return App.scene.lastResult;
}

for (const id of ACTIVITY_IDS) {
  const scores = {};
  const sameBoard = id === 'tray' ? { board: 0 } : {}; // the board changes with each play: compare like with like
  await test(`${id}: idle bot finishes with 0 stars and no error`, async () => {
    const r = await play(id, 'idle');
    eq(r.stars, 0, `stars (score ${r.score})`);
    eq(h.errors().length, 0, h.errors().join(';'));
  });
  await test(`${id}: expert bot gets ${EASY.has(id) ? '3' : '2+'} stars`, async () => {
    const r = await play(id, 'expert', sameBoard);
    scores.expert = r.score;
    assert(r.stars >= (EASY.has(id) ? 3 : 2), `stars ${r.stars} score ${r.score}`);
  });
  await test(`${id}: sloppy bot scores under expert`, async () => {
    const r = await play(id, 'sloppy', sameBoard);
    assert(r.score < scores.expert, `sloppy ${r.score} expert ${scores.expert}`);
    assert(r.stars <= 2, `sloppy stars ${r.stars}`);
  });
}
for (let board = 0; board < BOARDS.length; board++) {
  await test(`tray board ${board}: expert 2+ stars, idle none`, async () => {
    const r = await play('tray', 'expert', { board });
    assert(r.stars >= 2, `stars ${r.stars} score ${r.score}/${r.max}`);
    eq((await play('tray', 'idle', { board })).stars, 0);
  });
}

await test('result written in Drop-In: records only, no Drips', async () => {
  const before = JSON.stringify(App.store.data.dropin?.tree ?? null);
  const r = await play('tree', 'expert');
  assert(JSON.stringify(App.store.data.dropin.tree) !== before);
  eq(r.drips, 0);
  eq(App.slot, null, 'no guest needed');
});
await test('week mode: result written and Drips are 2 + 3 stars + time, plus the goal', async () => {
  App.store.create(0, 'Test', { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink' });
  const slot = App.slot;
  slot.phase = 'day';
  await h.go('activity', { id: 'squats', mode: 'week', noPractice: true });
  App.dev.autopilot = 'expert';
  await h.until(() => App.scene.resultsShown, { max: 60 * 100 });
  App.dev.autopilot = null;
  const r = App.scene.lastResult;
  eq(slot.records.squats.plays, 1);
  eq(slot.records.squats.stars, r.stars);
  eq(slot.drips, dripsFor(r.stars, r.seconds) + (r.bonus ?? 0));
  assert(slot.drips >= 2 + 3 * r.stars);
});
await test('hard versions make it harder', async () => {
  const a = await play('heron', 'average');
  const b = await play('heron', 'average', { hard: true });
  assert(b.score <= a.score + 6, `${b.score} vs ${a.score}`);
});
await test('a first time gets 8 s of practice, unscored, then a count', async () => {
  App.practised = {};
  delete App.store.data.dropin.heron;
  await h.go('activity', { id: 'heron', mode: 'dropin' });
  const s = App.scene;
  eq(s.phase, 'intro');
  h.press('Enter');
  eq(s.phase, 'practice');
  h.step(60 * 8 + 2);
  eq(s.phase, 'countdown');
  h.step(60 * 3 + 2);
  eq(s.phase, 'play');
  eq(s.event.scoreOf(s.playerLane) < 5, true, 'score starts clean');
});

// 10 Determinism: record, replay, fingerprints equal.
for (const id of ['tree', 'hoop', 'step', 'header', 'tray', 'slackline', 'pier']) {
  await test(`determinism: ${id} replays to the same fingerprint`, async () => {
    await h.go('activity', { id, mode: 'dropin', noPractice: true });
    const engine = h.engine;
    h.press('Enter');
    App.dev.autopilot = null;
    const keys = ['KeyD', 'KeyA', 'KeyW', 'KeyS', 'KeyF', 'KeyJ', 'Space'];
    for (let i = 0; i < 40; i++) {
      const k = keys[i % keys.length];
      engine.input.setKey(k, true); engine.step(6); engine.input.setKey(k, false); engine.step(4);
    }
    const rec = engine.recording();
    const end = engine.fingerprint();
    await engine.replay(rec, () => engine.loadGame(makeScene('activity', { id, mode: 'dropin', noPractice: true })));
    eq(engine.fingerprint(), end, `${id}`);
    engine.manual = true;
  });
}
done();
