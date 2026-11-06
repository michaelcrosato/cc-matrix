// Replays: a run driven only by real input, recorded, played back, fingerprint compared.
import { bootGame } from './boot.mjs';
import { createGame } from '../../src/game.js';
import { store } from '../../src/core/storage.js';
import { SAVE_KEY, SESSION_KEY } from '../../src/core/save.js';

export async function replayRun() {
  const fails = [];
  const reset = () => { store.remove(SAVE_KEY); store.remove(SESSION_KEY); store.remove('honk:settings'); };
  reset();
  const { game, engine } = await bootGame({ seed: 99, realNow: 1790000000000 });
  const key = (code, frames = 3) => { engine.input.setKey(code, true); engine.step(frames); engine.input.setKey(code, false); engine.step(3); };
  engine.step(30);
  key('Enter'); engine.step(5); // New Arrival
  key('Enter'); engine.step(150); // Village Time: the bus
  for (let i = 0; i < 400; i++) {
    const t = game.ui.top;
    if (t?.id === 'keyboard') { engine.input.send({ t: 'key', key: 'A' }); engine.step(2); engine.input.send({ t: 'key', key: 'Enter' }); engine.step(3); continue; }
    if (t?.id === 'lookEditor') { key('KeyE'); continue; }
    if (game.place === game.town && !game.scripts.holding) break;
    key('KeyE');
    engine.step(5);
  }
  if (game.place !== game.town) fails.push(`replay run never reached the town: ${game.status()}`);
  // Walk about, pick up, open a menu: all real input.
  engine.input.setKey('KeyW', true); engine.step(90); engine.input.setKey('KeyW', false);
  engine.input.setKey('KeyD', true); engine.step(40); engine.input.setKey('KeyD', false);
  key('Tab'); engine.step(5); key('Escape'); engine.step(5);
  key('KeyQ'); engine.step(30);
  engine.step(60);
  const end = engine.fingerprint();
  const gameEnd = game.fingerprint();
  const rec = engine.recording();
  reset();
  await engine.replay(rec, () => engine.loadGame(createGame({ seed: 99, realNow: 1790000000000 })));
  const rg = engine.game;
  if (rg.fingerprint() !== gameEnd) fails.push(`replay game fingerprint differs: ${gameEnd} vs ${rg.fingerprint()} (${game.status()} vs ${rg.status()})`);
  if (engine.fingerprint() !== end) fails.push(`replay engine fingerprint differs: ${end} vs ${engine.fingerprint()}`);
  return { n: 1, fails };
}
