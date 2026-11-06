// Bots skip the input layer. This plays every activity with real keys, a real stick and a real mouse,
// reading only what a player can see, so a control that doesn't work can't hide.
import { assert, boot, done, eq, test, App } from '../lib.mjs';
import { Eyes, installPad, makeHands, PLAYS, stubPad } from './_people.mjs';
import { ACTIVITIES, ACTIVITY_IDS } from '../../src/data/activities.js';
import { BOARDS } from '../../src/data/boards.js';

installPad();
const h = await boot({ scene: 'title' });
const DEVICES = ['pad', 'keyboard', 'mouse'];

async function play(id, device, args = {}, eyesOpts = undefined) {
  await h.go('activity', { id, mode: 'dropin', noPractice: true, ...args });
  const hands = makeHands(h.engine, device);
  hands.announce();
  const s = App.scene;
  // The card asks for Confirm: use this device's.
  hands.press('confirm'); h.step(1); hands.endFrame(); h.step(1);
  eq(s.phase === 'intro', false, `${device} confirm leaves the card`);
  const eyes = new Eyes(eyesOpts);
  const st = {};
  const fn = PLAYS[ACTIVITIES[id].scene];
  for (let n = 0; !s.resultsShown && n < 60 * 200; n++) {
    if (s.phase === 'play') fn(s, hands, eyes, st);
    h.step(1);
    hands.endFrame();
  }
  hands.letGo();
  h.step(2);
  assert(s.lastResult, `${id} ${device} never finished: ${s.phase}`);
  eq(App.device.last, device, `${id} kept device`);
  return s.lastResult;
}

for (const id of ACTIVITY_IDS) {
  for (const device of DEVICES) {
    await test(`played by hand: ${id} on ${device}`, async () => {
      const r = await play(id, device, id === 'tray' ? { board: 0 } : {});
      assert(r.stars >= 2, `only ${r.stars} stars, score ${r.score}`);
    });
  }
}
for (let board = 1; board < BOARDS.length; board++) {
  for (const device of DEVICES) {
    await test(`played by hand: tray board ${board} on ${device}`, async () => {
      const r = await play('tray', device, { board });
      assert(r.stars >= 1, `only ${r.stars} stars, score ${r.score}/${r.max}`);
    });
  }
}

// Doing nothing with the hands must get nothing, on every device, or the score is measuring the wrong thing.
for (const id of ['tree', 'squats', 'hoop', 'step', 'header', 'slackline', 'tray', 'pier', 'jog']) {
  await test(`hands off: ${id} gives no stars`, async () => {
    const hands = makeHands(h.engine, 'keyboard');
    await h.go('activity', { id, mode: 'dropin', noPractice: true, board: 0 });
    hands.announce();
    hands.press('confirm'); h.step(1); hands.endFrame();
    const s = App.scene;
    for (let n = 0; !s.resultsShown && n < 60 * 200; n++) h.step(1);
    eq(s.lastResult.stars, 0, `score ${s.lastResult.score}`);
  });
}

await test('Shift is half lean; the stick goes through the deadzone and the remap', async () => {
  await h.go('activity', { id: 'tree', mode: 'dropin', noPractice: true });
  const s = App.scene;
  h.press('Enter');
  h.step(60 * 3 + 5);
  const lane = s.playerLane;
  App.device.last = 'keyboard';
  h.engine.input.setKey('KeyD', true);
  h.step(30);
  const full = lane.inp.x;
  h.engine.input.setKey('ShiftLeft', true);
  h.step(30);
  const half = lane.inp.x;
  h.engine.input.setKey('KeyD', false); h.engine.input.setKey('ShiftLeft', false);
  assert(full > 0.95, `full ${full}`);
  assert(half > 0.42 && half < 0.58, `half ${half}`);
  h.step(30);
  stubPad.axes[0] = 0.08;
  h.step(3);
  eq(h.engine.input.padAxis.x, 0, 'inside the deadzone');
  stubPad.axes[0] = 0.8; stubPad.axes[1] = -0.6;
  h.step(3);
  assert(h.engine.input.padAxis.x > 0.7 && h.engine.input.padAxis.y > 0.5, 'y is flipped to forward');
  stubPad.axes[0] = 0; stubPad.axes[1] = 0;
  h.step(2);
});
await test('every pad button reaches its name through the boot-time remap', async () => {
  const names = { 0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle', 4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2', 8: 'PadCreate', 9: 'PadOptions', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight' };
  for (const [i, code] of Object.entries(names)) {
    stubPad.buttons[i].pressed = true;
    h.step(2);
    assert(h.engine.input.isDown(code), `${code}`);
    stubPad.buttons[i].pressed = false;
    h.step(2);
    App.stack.clear();
    h.engine.timeScale = 1;
  }
});
await test('the mouse can do everything a click is asked for: jump, breathe, left foot', async () => {
  const r = await play('pier', 'mouse');
  assert(r.score > 30, `jump distance ${r.score}: the click must reach the lip`);
});
eq(h.errors().length, 0, h.errors().join(' | '));
done();
