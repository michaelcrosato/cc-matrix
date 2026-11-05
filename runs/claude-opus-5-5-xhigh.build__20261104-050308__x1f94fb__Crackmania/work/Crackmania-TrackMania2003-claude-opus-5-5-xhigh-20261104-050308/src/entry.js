// the browser's entry: the 3D engine (it sets E.World3D), then the game
import '../engine/my-3d2dge-3d.js';
import { createGame } from './main.js';
createGame().catch(e => { console.error(e); });
