import assert from 'node:assert/strict';
import test from 'node:test';
import { createAttract, stepAttract } from '../src/attract.js';
import { ACTION_KEYS, mapGamepad, mapKeyboard } from '../src/input.js';
import { layoutViewports } from '../src/layout.js';
import { addPeer, assignTeams, createSession, joinHuman } from '../src/session.js';

function pad(partial = {}) {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  return {
    axes: [0, 0, 0, 0],
    buttons,
    ...partial,
    axes: partial.axes ?? [0, 0, 0, 0],
    buttons: partial.buttons ?? buttons,
  };
}

function interiorOverlap(a, b) {
  return (
    a.x < b.x + b.w - 1e-6 &&
    a.x + a.w > b.x + 1e-6 &&
    a.y < b.y + b.h - 1e-6 &&
    a.y + a.h > b.y + 1e-6
  );
}

test('gamepad and keyboard expose the same action set and the same commands', () => {
  const neutral = mapGamepad(pad(), { invertH: false, invertV: false });
  const idleKeys = mapKeyboard(new Set(), 0);
  assert.deepEqual(Object.keys(neutral).sort(), Object.keys(idleKeys).sort());
  assert.deepEqual(Object.keys(neutral).sort(), [...ACTION_KEYS].sort());

  const stick = mapGamepad(pad({ axes: [0, -1, 0, 0] }), {});
  const wasd = mapKeyboard(new Set(['KeyW']), 0);
  assert.ok(stick.throttle > 0.9);
  assert.ok(wasd.throttle > 0.9);

  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  buttons[0] = { pressed: true, value: 1 };
  const cross = mapGamepad(pad({ buttons }), {});
  const space = mapKeyboard(new Set(['Space']), 0);
  assert.equal(cross.jump, true);
  assert.equal(space.jump, true);
  assert.equal(cross.boost, false);
  assert.equal(space.boost, false);
});

test('invert horizontal and invert vertical each flip only that axis', () => {
  const sample = pad({ axes: [0.4, 0.6, 0.25, -0.5] });
  const base = mapGamepad(sample, { invertH: false, invertV: false });
  const horizontal = mapGamepad(sample, { invertH: true, invertV: false });
  const vertical = mapGamepad(sample, { invertH: false, invertV: true });

  assert.equal(horizontal.steer, -base.steer);
  assert.equal(horizontal.yaw, -base.yaw);
  assert.equal(horizontal.throttle, base.throttle);
  assert.equal(horizontal.pitch, base.pitch);

  assert.equal(vertical.throttle, -base.throttle);
  assert.equal(vertical.pitch, -base.pitch);
  assert.equal(vertical.steer, base.steer);
  assert.equal(vertical.yaw, base.yaw);
  assert.ok(Math.abs(base.steer) > 0.2);
  assert.ok(Math.abs(base.throttle) > 0.2);
  assert.ok(Math.abs(base.pitch) > 0.2);
});

test('attract mode starts only after 10 seconds without input and any input clears it', () => {
  const quiet = createAttract();
  stepAttract(quiet, 9.9, false, true);
  assert.equal(quiet.active, false);
  stepAttract(quiet, 0.1, false, true);
  assert.equal(quiet.active, true);
  stepAttract(quiet, 1, true, true);
  assert.equal(quiet.active, false);
  assert.equal(quiet.idle, 0);

  const reset = createAttract();
  stepAttract(reset, 9, false, true);
  stepAttract(reset, 0.2, true, true);
  stepAttract(reset, 9.9, false, true);
  assert.equal(reset.active, false);

  const away = createAttract();
  stepAttract(away, 12, false, false);
  assert.equal(away.active, false);
});

test('split screen for 2, 3, and 4 players covers the surface without overlap', () => {
  for (const count of [2, 3, 4]) {
    for (const [width, height] of [
      [1920, 1080],
      [1919, 1081],
      [1280, 720],
    ]) {
      const rects = layoutViewports(count, width, height);
      assert.equal(rects.length, count);
      let area = 0;
      for (const rect of rects) {
        assert.ok(rect.w > 0 && rect.h > 0);
        assert.ok(rect.x >= -1e-6 && rect.y >= -1e-6);
        assert.ok(rect.x + rect.w <= width + 1e-6);
        assert.ok(rect.y + rect.h <= height + 1e-6);
        area += rect.w * rect.h;
      }
      assert.ok(Math.abs(area - width * height) < 1e-4, `coverage ${count} ${width}x${height}`);
      for (let i = 0; i < rects.length; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          assert.equal(interiorOverlap(rects[i], rects[j]), false);
        }
      }
    }
  }
});

test('a session accepts 4 peers, rejects a 5th, and assigns 1v1 and 2v2 teams', () => {
  let duel = createSession('2v2');
  for (let i = 0; i < 4; i += 1) {
    const added = addPeer(duel, { id: `p${i}`, name: `P${i}` });
    assert.equal(added.ok, true);
    duel = added.session;
  }
  const fifth = addPeer(duel, { id: 'p4' });
  assert.equal(fifth.ok, false);
  assert.equal(fifth.reason, 'full');
  const fours = assignTeams(duel);
  assert.equal(fours.length, 4);
  assert.equal(fours.filter((p) => p.team === 'blue').length, 2);
  assert.equal(fours.filter((p) => p.team === 'orange').length, 2);
  assert.equal(fours[0].team, 'blue');
  assert.equal(fours[2].team, 'orange');

  let ones = createSession('1v1');
  ones = addPeer(ones, { id: 'blue-player' }).session;
  ones = addPeer(ones, { id: 'orange-player' }).session;
  const pair = assignTeams(ones);
  assert.equal(pair.length, 2);
  assert.equal(pair[0].team, 'blue');
  assert.equal(pair[1].team, 'orange');

  let lobby = createSession('1v1');
  lobby = joinHuman(lobby, { id: 'h1' }).session;
  lobby = joinHuman(lobby, { id: 'h2' }).session;
  const refused = joinHuman(lobby, { id: 'h3' });
  assert.equal(refused.ok, false);
});
