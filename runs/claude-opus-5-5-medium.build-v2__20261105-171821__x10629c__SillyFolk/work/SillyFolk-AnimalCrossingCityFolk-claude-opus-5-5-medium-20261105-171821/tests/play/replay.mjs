// A session played by real input from the title, then replayed in a fresh game: fingerprints must match.
import { Engine } from '../../src/engine.js';
import { createGame } from '../../src/game.js';
import { assets } from '../headless.mjs';
import { G } from '../../src/state.js';
import { UI } from '../../src/ui/kit.js';
import { storage, KEYS } from '../../src/core/storage.js';
const e = await Engine.headless(createGame(), { assets }); const i = e.input;
const tap = (c) => { i.setKey(c, true); e.step(3); i.setKey(c, false); e.step(8); };
e.step(10); tap('Enter'); e.step(4); tap('Enter'); e.step(80);
let guard = 0; while (guard++ < 700) { const t = UI.top; if (!t && !G.opening && G.world.day1.started) break; if (t?.id === 'keyboard') { i.send({ t: 'key', key: 'B' }); e.step(3); i.send({ t: 'key', key: 'Enter' }); e.step(8); continue; } if (t) tap('Enter'); else e.step(6); }
e.step(30); for (const [k, n] of [['KeyD', 40], ['KeyS', 30], ['KeyA', 50]]) { i.setKey(k, true); e.step(n); i.setKey(k, false); e.step(5); } tap('Tab'); tap('Tab'); e.step(60);
const end = e.fingerprint(); const rec = e.recording(); const stat = G.game.status({});
await e.replay(rec, () => { storage.del(KEYS.save); storage.del(KEYS.session); return e.loadGame(createGame()); }); const again = e.fingerprint();
if (end !== again) { console.log('replay FAIL', stat, '|', G.game.status({})); process.exitCode = 1; } else console.log('replay: ok');
