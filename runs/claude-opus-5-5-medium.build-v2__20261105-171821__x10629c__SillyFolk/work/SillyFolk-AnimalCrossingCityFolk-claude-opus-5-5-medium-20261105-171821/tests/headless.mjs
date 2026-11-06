// Shared helper: boots the game in Node.
import { readFile } from 'node:fs/promises';
import { Engine } from '../src/engine.js';
import { createGame } from '../src/game.js';
const kit = new URL('../kit/', import.meta.url);
export const assets = async (path) => new Uint8Array(await readFile(new URL(path, kit))).buffer;
export async function boot() { const game = createGame(); const engine = await Engine.headless(game, { assets }); return { engine, game }; }
