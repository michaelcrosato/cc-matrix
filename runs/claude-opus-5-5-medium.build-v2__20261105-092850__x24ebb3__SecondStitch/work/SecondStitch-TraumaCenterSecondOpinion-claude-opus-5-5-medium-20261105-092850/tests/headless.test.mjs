// The real stages in Node with Engine.headless: walk the menus into an op, and replay each level from its recording.
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { Engine } from '../pixel-engine.js';
import { createGame } from '../game.js';
import { app } from '../src/core/app.js';
import { OperationStage } from '../src/stages/operation.js';

const read = async (p) => new Uint8Array(await readFile(new URL(`../${p}`, import.meta.url))).buffer;
const settle = () => new Promise((r) => { setTimeout(r, 30); });

export async function run(ok) {
  const e = await Engine.headless(createGame(), { assets: read });
  const hold = (code, n = 4) => { e.input.setKey(code, true); e.step(n); e.input.setKey(code, false); e.step(2); };
  const replayCheck = async (label) => {
    const end = e.fingerprint(), rec = JSON.parse(JSON.stringify(e.recording()));
    await e.replay(rec, () => e.loadGame(createGame()));
    ok(`replay: ${label}`, e.fingerprint() === end, `${end} vs ${e.fingerprint()}`);
  };
  const until = async (name, press = 'Enter') => { for (let i = 0; i < 400 && e.game.name !== name; i++) { hold(press); await settle(); } return e.game.name === name; };
  e.step(20); await replayCheck('title, idle');
  hold('KeyZ'); await settle();
  ok('walk: a key leads to the main menu', e.game.name === 'main', e.game.name);
  hold('ArrowDown'); hold('ArrowDown'); hold('ArrowUp'); await replayCheck('main menu, moving focus');
  e.game.menu.focus = 0;
  hold('Enter'); hold('Enter');
  await settle();
  ok('walk: new shift opens the first scene', await until('story', 'KeyZ') , e.game.name);
  hold('Enter'); e.step(30); hold('Enter'); await replayCheck('story scene, advancing');
  ok('walk: scene runs into the briefing', await until('briefing'), e.game.name);
  e.step(40); await replayCheck('briefing');
  ok('walk: briefing runs into the op', await until('operation'), e.game.name);
  e.step(90);
  // Really operate: keys move, J uses, 4 picks the drain.
  hold('Digit1'); hold('KeyD', 30); hold('KeyS', 20); e.input.setKey('KeyJ', true); e.step(60); e.input.setKey('KeyJ', false); hold('KeyA', 30);
  const before = e.game.sim.seats[0].x;
  ok('op in Node: keys moved the tip', before !== 1.5, String(before));
  await replayCheck('an operation, played with keys');
  ok('op in Node: no errors', e.errors.length === 0, e.errors.slice(0, 2).join(' | '));
  // One press is one action at any frame rate: 15 fps runs four sim steps a frame, 240 fps runs none on most.
  await e.loadGame(new OperationStage({ op: 'op3' }));
  e.game.intro = 0;
  e.step(2);
  const table = () => e.game.sim.seats[0].table, tool = () => e.game.sim.seats[0].tool;
  const pressAt = (code, dt) => { e.input.setKey(code, true); e.step(1, dt); e.input.setKey(code, false); e.step(1, dt); e.step(1, 1 / 15); };
  pressAt('Tab', 1 / 15); ok('one Tab at 15 fps moves one table', table() === 1, String(table()));
  pressAt('Tab', 1 / 240); ok('one Tab at 240 fps moves one table', table() === 2, String(table()));
  pressAt('Digit1', 1 / 240); ok('a tool key is not lost at 240 fps', tool() === 'scalpel', tool());
  pressAt('Digit2', 1 / 15); pressAt('KeyQ', 1 / 15); ok('last tool swaps once at 15 fps', tool() === 'scalpel', tool());
  e.dispose?.();
  app.booted = true;
  // The kit's own check, with keys that really press.
  for (const keys of ['Enter*10', 'KeyD*60,Space*4,KeyD*40', 'Enter*6,KeyZ*2,ArrowDown*6,KeyZ*2,Enter*6,KeyZ*30']) {
    let code = 0;
    try { execFileSync('node', ['check.mjs', '--headless', 'game.js', '--keys', keys], { stdio: 'pipe', timeout: 120000 }); } catch (err) { code = err.status ?? 1; }
    ok(`check.mjs --headless --keys ${keys}`, code === 0, `exit ${code}`);
  }
}
