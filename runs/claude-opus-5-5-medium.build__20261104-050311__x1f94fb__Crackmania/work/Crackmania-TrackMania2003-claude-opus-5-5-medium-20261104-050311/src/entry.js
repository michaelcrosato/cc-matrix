// Browser entry: the 3D engine (which imports three.js and Rapier), then the game.
import '../engine/my-3d2dge-3d.js';
import { createGame } from './main.js';
createGame({}).then(g => { window.__crack = { game: g.game, app: g.app, snapshot: () => g.game.debug.snapshot() }; }).catch(e => { console.error(e); if (globalThis.My3D2dge && My3D2dge.showError) My3D2dge.showError('CRACKMANIA could not start', e); });
