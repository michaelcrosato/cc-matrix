// The browser entry: the 2D engine is already on the page (a classic script); this makes the 3D side and the game.
import '../engine/my-3d2dge-3d.js';
import { createGame } from './game.js';

const E = globalThis.My3D2dge;
const { game, api } = createGame(E, { headless: false });
globalThis.__crackmania = { game, api };
