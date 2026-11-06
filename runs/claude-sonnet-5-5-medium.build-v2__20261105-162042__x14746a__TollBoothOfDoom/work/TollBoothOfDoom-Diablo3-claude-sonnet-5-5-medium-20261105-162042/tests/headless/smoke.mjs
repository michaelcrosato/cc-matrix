// Tier 2 smoke: boots the game in Engine.headless, plays keys, checks no errors and a matching replay.
import { readFile } from 'node:fs/promises';
import { Engine } from '../../pixel-engine.js';
import { createGame } from '../../game.js';
export const name = 'headless smoke';
const assets = async (path) => new Uint8Array(await readFile(new URL('../../' + path, import.meta.url))).buffer;
export async function run(t) {
  const mk = () => createGame({ fast: true, noSave: true, quick: { cls: 'bellwarden', zone: 'ossuary1', level: 5, seed: 3 } });
  const engine = await Engine.headless(mk(), { assets });
  engine.input.setKey('KeyD', true); engine.step(120); engine.input.setKey('KeyD', false);
  engine.input.setKey('KeyW', true); engine.input.setKey('MouseLeft', true); engine.step(240); engine.input.setKey('MouseLeft', false); engine.input.setKey('KeyW', false);
  t.ok(engine.errors.length === 0, 'engine errors: ' + engine.errors.join(' | '));
  const end = engine.fingerprint();
  await engine.replay(engine.recording(), () => engine.loadGame(mk()));
  t.ok(engine.fingerprint() === end, 'replay fingerprint differs');
}
